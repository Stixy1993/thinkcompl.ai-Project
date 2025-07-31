import { NextRequest, NextResponse } from 'next/server';

// SharePoint API helper functions
async function getSharePointToken(): Promise<string> {
  const tenantId = process.env.SHAREPOINT_TENANT_ID || 'common';
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
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
    const errorText = await response.text();
    throw new Error(`SharePoint API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function GET() {
  try {
    console.log('Listing accessible SharePoint sites...');
    
    const token = await getSharePointToken();
    console.log('✅ Token acquired successfully');
    
    // Get all accessible sites
    const sitesResponse = await makeSharePointRequest('/sites', token);
    console.log(`✅ Found ${sitesResponse.value?.length || 0} accessible sites`);
    
    const sites = sitesResponse.value?.map((site: any) => ({
      id: site.id,
      name: site.displayName,
      url: site.webUrl,
      description: site.description || 'No description'
    })) || [];
    
    return NextResponse.json({
      success: true,
      sites: sites,
      totalCount: sites.length
    });
    
  } catch (error) {
    console.error('Failed to list sites:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sites: []
    }, { status: 500 });
  }
} 