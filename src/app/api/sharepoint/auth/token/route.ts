import { NextResponse } from 'next/server';

// SharePoint API Configuration
const SHAREPOINT_CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const SHAREPOINT_CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;
const SHAREPOINT_TENANT_ID = process.env.SHAREPOINT_TENANT_ID;

export async function GET() {
  try {
    // Enhanced debugging and validation
    const missingVars = [];
    if (!SHAREPOINT_CLIENT_ID) missingVars.push('SHAREPOINT_CLIENT_ID');
    if (!SHAREPOINT_CLIENT_SECRET) missingVars.push('SHAREPOINT_CLIENT_SECRET');
    if (!SHAREPOINT_TENANT_ID) missingVars.push('SHAREPOINT_TENANT_ID');
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return NextResponse.json({ 
        error: 'SharePoint configuration missing',
        missingVariables: missingVars,
        message: 'Please configure the following environment variables in your .env.local file: ' + missingVars.join(', ')
      }, { status: 500 });
    }

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SHAREPOINT_CLIENT_ID!,
        client_secret: SHAREPOINT_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', tokenResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to get access token',
        details: errorText
      }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type
    });

  } catch (error) {
    console.error('Error getting SharePoint token:', error);
    return NextResponse.json({ 
      error: 'SharePoint authentication error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 