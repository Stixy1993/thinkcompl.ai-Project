import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const config = {
      tenantId: process.env.SHAREPOINT_TENANT_ID,
      clientId: process.env.SHAREPOINT_CLIENT_ID,
      clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
      siteId: process.env.SHAREPOINT_DEFAULT_SITE_ID,
      driveId: process.env.SHAREPOINT_DEFAULT_DRIVE_ID,
      siteUrl: process.env.SHAREPOINT_SITE_URL,
      configSaved: process.env.SHAREPOINT_CONFIG_SAVED === 'true',
      configSavedAt: process.env.SHAREPOINT_CONFIG_SAVED_AT
    };

    // Validate configuration completeness
    const requiredFields = ['tenantId', 'clientId', 'clientSecret'];
    const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);
    
    const isComplete = missingFields.length === 0;
    const hasOptionalFields = config.siteId && config.driveId;

    // Test authentication if basic config is present
    let authTest: { success: boolean; error: string | null } = { success: false, error: null };
    if (isComplete) {
      try {
        // Use the specific tenant endpoint instead of /common
        const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: config.clientId!,
            client_secret: config.clientSecret!,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.access_token) {
            authTest = { success: true, error: null };
          } else {
            authTest = { success: false, error: 'No access token received' };
          }
        } else {
          const errorText = await tokenResponse.text();
          console.error('Authentication failed:', tokenResponse.status, errorText);
          authTest = { success: false, error: `Authentication failed: ${tokenResponse.status} - ${errorText}` };
        }
      } catch (error) {
        authTest = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Determine configuration status
    let status = 'not_configured';
    let statusMessage = 'SharePoint is not configured';
    
    if (!isComplete) {
      status = 'incomplete';
      statusMessage = `Configuration incomplete. Missing: ${missingFields.join(', ')}`;
    } else if (!authTest.success) {
      status = 'auth_failed';
      statusMessage = `Authentication failed: ${authTest.error}`;
    } else if (!hasOptionalFields) {
      status = 'basic_configured';
      statusMessage = 'Basic authentication configured. Site and drive IDs recommended.';
    } else {
      status = 'fully_configured';
      statusMessage = 'SharePoint is fully configured and ready to use.';
    }

    return NextResponse.json({
      success: true,
      config,
      status,
      statusMessage,
      isComplete,
      hasOptionalFields,
      missingFields,
      authTest,
      recommendations: {
        basic: isComplete ? '✅ Basic configuration complete' : `❌ Complete basic setup: ${missingFields.join(', ')}`,
        optional: hasOptionalFields ? '✅ Site and drive configured' : '⚠️ Configure site and drive for full functionality',
        auth: authTest.success ? '✅ Authentication working' : `❌ Authentication failed: ${authTest.error}`
      }
    });

  } catch (error) {
    console.error('Configuration check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 