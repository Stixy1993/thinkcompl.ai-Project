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
    console.log('Testing SharePoint connection...');
    
    // Test 1: Get token
    console.log('1. Testing token acquisition...');
    const token = await getSharePointToken();
    console.log('✅ Token acquired successfully');
    
    // Test 2: Get user info (basic test)
    console.log('2. Testing basic API access...');
    try {
      const userResponse = await makeSharePointRequest('/me', token);
      console.log('✅ Basic API access working');
    } catch (error) {
      console.log('❌ Basic API access failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test 3: Get sites (if possible)
    console.log('3. Testing sites access...');
    try {
      const sitesResponse = await makeSharePointRequest('/sites', token);
      console.log(`✅ Sites access working - found ${sitesResponse.value?.length || 0} sites`);
      if (sitesResponse.value?.length > 0) {
        console.log('Available sites:', sitesResponse.value.map((site: any) => ({
          name: site.displayName,
          url: site.webUrl,
          id: site.id
        })));
      }
    } catch (error) {
      console.log('❌ Sites access failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test 4: Try specific site
    console.log('4. Testing specific site access...');
    try {
      const siteResponse = await makeSharePointRequest('/sites/thinkcomplai.sharepoint.com:/sites/thinkcompl.ai', token);
      console.log('✅ Specific site access working:', siteResponse.displayName);
    } catch (error) {
      console.log('❌ Specific site access failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Connection test completed. Check server logs for details.'
    });
    
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 