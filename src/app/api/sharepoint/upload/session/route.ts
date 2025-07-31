import { NextRequest, NextResponse } from 'next/server';

// SharePoint API Configuration
const SHAREPOINT_CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const SHAREPOINT_CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;
const SHAREPOINT_TENANT_ID = process.env.SHAREPOINT_TENANT_ID;

// Token cache
let cachedToken: { token: string; expires: number } | null = null;

// Get access token for SharePoint API with caching
async function getSharePointToken() {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  try {
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
      throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    
    cachedToken = {
      token: tokenData.access_token,
      expires: Date.now() + (50 * 60 * 1000)
    };

    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting SharePoint token:', error);
    throw error;
  }
}

// SharePoint API helper function
async function makeSharePointRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getSharePointToken();
  
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SharePoint API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const { driveId, folderPath, fileName } = await request.json();

    if (!driveId || !fileName) {
      return NextResponse.json({ 
        error: 'Drive ID and file name are required' 
      }, { status: 400 });
    }

    // Create upload session for large files
    const sessionEndpoint = folderPath 
      ? `/drives/${driveId}/root:/${folderPath}/${fileName}:/createUploadSession`
      : `/drives/${driveId}/root:/${fileName}:/createUploadSession`;

    const sessionResponse = await makeSharePointRequest(sessionEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        item: {
          '@microsoft.graph.conflictBehavior': 'rename',
        },
      }),
    });

    return NextResponse.json({
      uploadUrl: sessionResponse.uploadUrl,
      expirationDateTime: sessionResponse.expirationDateTime,
      nextExpectedRanges: sessionResponse.nextExpectedRanges || ['0-'],
    });

  } catch (error) {
    console.error('SharePoint upload session error:', error);
    return NextResponse.json({ 
      error: 'SharePoint upload session error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 