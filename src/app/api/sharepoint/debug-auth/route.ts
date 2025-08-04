import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      SHAREPOINT_TENANT_ID: process.env.SHAREPOINT_TENANT_ID,
      SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID,
      SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET ? '***SET***' : 'NOT SET',
      SHAREPOINT_SITE_URL: process.env.SHAREPOINT_SITE_URL,
    };

    // Test different tenant endpoints
    const testResults = [];
    
    // Test 1: Try with configured tenant ID
    if (process.env.SHAREPOINT_TENANT_ID) {
      try {
        const response = await fetch(`https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.SHAREPOINT_CLIENT_ID!,
            client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
            scope: 'https://graph.microsoft.com/.default',
          }),
        });
        
        testResults.push({
          tenant: process.env.SHAREPOINT_TENANT_ID,
          status: response.status,
          success: response.ok,
          error: response.ok ? null : await response.text()
        });
      } catch (error) {
        testResults.push({
          tenant: process.env.SHAREPOINT_TENANT_ID,
          status: 'ERROR',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 2: Try with 'common' endpoint
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.SHAREPOINT_CLIENT_ID!,
          client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
        }),
      });
      
      testResults.push({
        tenant: 'common',
        status: response.status,
        success: response.ok,
        error: response.ok ? null : await response.text()
      });
    } catch (error) {
      testResults.push({
        tenant: 'common',
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      environmentVariables: envVars,
      testResults,
      recommendations: [
        '1. Verify your tenant ID is correct in Azure Portal',
        '2. Ensure your Azure subscription is active',
        '3. Check if you\'re using the right cloud (commercial vs government)',
        '4. Verify your app registration has the correct permissions'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 