import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      SHAREPOINT_TENANT_ID: process.env.SHAREPOINT_TENANT_ID,
      SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID,
      SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET ? '***SET***' : 'NOT SET',
      SHAREPOINT_SITE_URL: process.env.SHAREPOINT_SITE_URL,
      SHAREPOINT_DEFAULT_SITE_ID: process.env.SHAREPOINT_DEFAULT_SITE_ID,
      SHAREPOINT_DEFAULT_DRIVE_ID: process.env.SHAREPOINT_DEFAULT_DRIVE_ID,
    };

    // Test authentication
    let authTest = { success: false, error: null };
    
    if (envVars.SHAREPOINT_CLIENT_ID && envVars.SHAREPOINT_CLIENT_SECRET === '***SET***') {
      try {
        const tokenUrl = `https://login.microsoftonline.com/${envVars.SHAREPOINT_TENANT_ID || 'common'}/oauth2/v2.0/token`;
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: envVars.SHAREPOINT_CLIENT_ID,
            client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }),
        });

        if (response.ok) {
          const tokenData = await response.json();
          if (tokenData.access_token) {
            authTest = { success: true, error: null };
          } else {
            authTest = { success: false, error: 'No access token received' };
          }
        } else {
          const errorText = await response.text();
          authTest = { success: false, error: `Authentication failed: ${response.status} - ${errorText}` };
        }
      } catch (error) {
        authTest = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      success: true,
      environmentVariables: envVars,
      authTest,
      recommendations: [
        authTest.success ? '✅ SharePoint authentication is working!' : '❌ SharePoint authentication failed',
        envVars.SHAREPOINT_TENANT_ID ? '✅ Tenant ID is set' : '❌ Tenant ID is missing',
        envVars.SHAREPOINT_CLIENT_ID ? '✅ Client ID is set' : '❌ Client ID is missing',
        envVars.SHAREPOINT_CLIENT_SECRET === '***SET***' ? '✅ Client Secret is set' : '❌ Client Secret is missing',
        envVars.SHAREPOINT_SITE_URL ? '✅ Site URL is set' : '❌ Site URL is missing',
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 