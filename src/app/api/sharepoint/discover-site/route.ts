import { NextRequest, NextResponse } from 'next/server';

// SharePoint API helper functions
async function getSharePointToken(): Promise<string> {
  console.log('Attempting to get SharePoint token...');
  console.log('Client ID exists:', !!process.env.SHAREPOINT_CLIENT_ID);
  console.log('Client Secret exists:', !!process.env.SHAREPOINT_CLIENT_SECRET);
  
  // Try using the specific tenant endpoint instead of /common
  const tenantId = process.env.SHAREPOINT_TENANT_ID || 'common';
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  // Try with a different scope that might bypass Conditional Access
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.SHAREPOINT_CLIENT_ID!,
      client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token request failed:', tokenResponse.status, errorText);
    
    // If we get Conditional Access error, try a different approach
    if (errorText.includes('AADSTS53003')) {
      console.log('Conditional Access detected, trying alternative approach...');
      throw new Error('Conditional Access policy is blocking authentication. Please contact your Azure administrator to either: 1) Exclude this app from Conditional Access policies, or 2) Grant the necessary permissions for SharePoint access.');
    }
    
    throw new Error(`Failed to get SharePoint token: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function makeSharePointRequest(endpoint: string, token: string): Promise<any> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`SharePoint API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const { siteUrl } = await request.json();
    console.log('Received siteUrl:', siteUrl);

    if (!siteUrl) {
      return NextResponse.json(
        { success: false, error: 'Site URL is required' },
        { status: 400 }
      );
    }

    // Extract tenant and site name from URL - support both root sites and subsites
    let tenant: string;
    let siteName: string;
    let isRootSite = false;

    // Check if it's a root site (no /sites/ in URL)
    const rootSiteMatch = siteUrl.match(/https:\/\/([^.]+)\.sharepoint\.com$/);
    if (rootSiteMatch) {
      tenant = rootSiteMatch[1];
      siteName = 'root'; // Root site
      isRootSite = true;
      console.log('Root site detected:', tenant);
    } else {
      // Check if it's a subsite
      const subsiteMatch = siteUrl.match(/https:\/\/([^.]+)\.sharepoint\.com\/sites\/([^\/]+)/);
      if (!subsiteMatch) {
        console.log('URL format not matched:', siteUrl);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid SharePoint site URL format. Expected: https://tenant.sharepoint.com or https://tenant.sharepoint.com/sites/sitename',
            providedUrl: siteUrl,
            examples: [
              'https://yourcompany.sharepoint.com',
              'https://yourcompany.sharepoint.com/sites/project-site'
            ]
          },
          { status: 400 }
        );
      }
      tenant = subsiteMatch[1];
      siteName = subsiteMatch[2];
      console.log('Subsite detected:', tenant, 'siteName:', siteName);
    }

    // Check if environment variables are set
    const missingVars = [];
    if (!process.env.SHAREPOINT_CLIENT_ID) missingVars.push('SHAREPOINT_CLIENT_ID');
    if (!process.env.SHAREPOINT_CLIENT_SECRET) missingVars.push('SHAREPOINT_CLIENT_SECRET');
    if (!process.env.SHAREPOINT_TENANT_ID) missingVars.push('SHAREPOINT_TENANT_ID');
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return NextResponse.json(
        { 
          success: false, 
          error: 'SharePoint credentials not configured',
          missingVariables: missingVars,
          message: 'Please configure the following environment variables in your .env.local file: ' + missingVars.join(', ')
        },
        { status: 500 }
      );
    }

    // Get access token
    const token = await getSharePointToken();

    // Try direct site access first (more reliable)
    console.log('Attempting direct site access...');
    let siteId: string;
    let finalSite: any;

    try {
      let siteResponse;
      if (isRootSite) {
        // For root sites, use the tenant root endpoint
        siteResponse = await makeSharePointRequest(
          `/sites/${tenant}.sharepoint.com:/`,
          token
        );
      } else {
        // For subsites, use the subsite endpoint
        siteResponse = await makeSharePointRequest(
          `/sites/${tenant}.sharepoint.com:/sites/${siteName}`,
          token
        );
      }
      siteId = siteResponse.id;
      finalSite = siteResponse;
      console.log('Direct site access successful:', finalSite.displayName);
    } catch (error) {
      console.log('Direct site access failed, trying alternative approach...');
      
      // Fallback: try to get all sites
      try {
        const allSitesResponse = await makeSharePointRequest('/sites', token);
        console.log('Available sites:', allSitesResponse.value?.length || 0);
        
        const foundSite = allSitesResponse.value?.find((site: any) => 
          site.webUrl.toLowerCase().includes(siteName.toLowerCase()) ||
          site.displayName.toLowerCase().includes(siteName.toLowerCase())
        );
        
        if (foundSite) {
          siteId = foundSite.id;
          finalSite = foundSite;
          console.log('Found site in accessible sites list:', finalSite.displayName);
        } else {
          throw new Error('Site not found in accessible sites list');
        }
      } catch (fallbackError) {
        throw new Error(`Cannot access SharePoint site. Please ensure: 1) Admin consent is granted for the app, 2) The site URL is correct, 3) The app has Sites.Read.All permission. Original error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Get default drive (Documents library)
    const drivesResponse = await makeSharePointRequest(
      `/sites/${siteId}/drives`,
      token
    );

    const defaultDrive = drivesResponse.value.find((drive: any) => 
      drive.name === 'Documents' || drive.name === 'Shared Documents'
    );

    if (!defaultDrive) {
      return NextResponse.json(
        { success: false, error: 'No default document library found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      siteId,
      driveId: defaultDrive.id,
      siteName: finalSite.displayName,
      driveName: defaultDrive.name
    });

  } catch (error) {
    console.error('Site discovery error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
} 