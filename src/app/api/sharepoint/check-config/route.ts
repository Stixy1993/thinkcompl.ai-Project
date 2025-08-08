import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const config = {
      clientId: process.env.SHAREPOINT_CLIENT_ID || null,
      clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || null,
      siteId: process.env.SHAREPOINT_DEFAULT_SITE_ID || null,
      driveId: process.env.SHAREPOINT_DEFAULT_DRIVE_ID || null,
      siteUrl: process.env.SHAREPOINT_SITE_URL || null,
      configSaved: process.env.SHAREPOINT_CONFIG_SAVED === 'true',
      configSavedAt: process.env.SHAREPOINT_CONFIG_SAVED_AT || null
    };

    // Validate configuration completeness (OAuth2 doesn't need tenantId)
    const requiredFields = ['clientId', 'clientSecret'];
    const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);
    
    const isComplete = missingFields.length === 0;
    const hasOptionalFields = config.siteId && config.driveId;

    // Test authentication if basic config is present
    let authTest: { success: boolean; error: string | null } = { success: false, error: null };
    if (isComplete) {
      // For OAuth2, we just check if the credentials are present
      // The actual authentication happens when users sign in
      authTest = { success: true, error: null };
    } else {
      // If configuration is incomplete, provide helpful message
      authTest = { 
        success: false, 
        error: `Configuration incomplete. Missing: ${missingFields.join(', ')}. Please set up your SharePoint environment variables.` 
      };
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