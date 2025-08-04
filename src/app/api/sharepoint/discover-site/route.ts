import { NextRequest, NextResponse } from 'next/server';
import { SharePointAuth } from '@/lib/sharepoint-auth';

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

    // Check if user is authenticated
    const isAuthenticated = await SharePointAuth.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not authenticated',
          requiresAuth: true,
          authUrl: '/api/sharepoint/auth'
        },
        { status: 401 }
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
          { success: false, error: 'Invalid SharePoint URL format. Please use a valid SharePoint site URL.' },
          { status: 400 }
        );
      }
      tenant = subsiteMatch[1];
      siteName = subsiteMatch[2];
      console.log('Subsite detected:', tenant, siteName);
    }

    // Get site information using Microsoft Graph API
    let siteInfo;
    if (isRootSite) {
      // For root sites, use the tenant root
      const response = await SharePointAuth.makeAuthenticatedRequest('/sites/root');
      if (!response.ok) {
        throw new Error(`Failed to get root site: ${response.status} ${response.statusText}`);
      }
      siteInfo = await response.json();
    } else {
      // For subsites, get the specific site
      const response = await SharePointAuth.makeAuthenticatedRequest(`/sites/${tenant}.sharepoint.com:/sites/${siteName}`);
      if (!response.ok) {
        throw new Error(`Failed to get site: ${response.status} ${response.statusText}`);
      }
      siteInfo = await response.json();
    }

    // Get drives for the site
    const drivesResponse = await SharePointAuth.makeAuthenticatedRequest(`/sites/${siteInfo.id}/drives`);
    if (!drivesResponse.ok) {
      throw new Error(`Failed to get drives: ${drivesResponse.status} ${drivesResponse.statusText}`);
    }
    const drivesData = await drivesResponse.json();

    return NextResponse.json({
      success: true,
      site: {
        id: siteInfo.id,
        name: siteInfo.name,
        webUrl: siteInfo.webUrl,
        displayName: siteInfo.displayName,
        isRootSite
      },
      drives: drivesData.value.map((drive: any) => ({
        id: drive.id,
        name: drive.name,
        type: drive.driveType,
        webUrl: drive.webUrl
      })),
      tenant: tenant
    });

  } catch (error) {
    console.error('Site discovery error:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('No valid access token')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          requiresAuth: true,
          authUrl: '/api/sharepoint/auth'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Site discovery failed'
      },
      { status: 500 }
    );
  }
} 