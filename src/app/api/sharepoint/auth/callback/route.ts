import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Verify state parameter
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!storedState || state !== storedState) {
      return NextResponse.json(
        { success: false, error: 'Invalid state parameter' },
        { status: 400 }
      );
    }
    
    // Check for OAuth errors
    if (error) {
      return NextResponse.json(
        { success: false, error: `OAuth error: ${error}` },
        { status: 400 }
      );
    }
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'No authorization code received' },
        { status: 400 }
      );
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SHAREPOINT_CLIENT_ID!,
        client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
        code: code,
        redirect_uri: process.env.NODE_ENV === 'production' 
          ? 'https://yourdomain.com/api/sharepoint/auth/callback'
          : 'http://localhost:3000/api/sharepoint/auth/callback',
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to exchange authorization code for tokens' },
        { status: 400 }
      );
    }
    
    const tokenData = await tokenResponse.json();
    
    // Store tokens securely (in production, use a proper session store)
    const response = NextResponse.redirect(
      process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com/dashboard'
        : 'http://localhost:3000/dashboard'
    );
    
    // Set tokens in secure cookies
    response.cookies.set('sharepoint_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600
    });
    
    if (tokenData.refresh_token) {
      response.cookies.set('sharepoint_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication callback failed' },
      { status: 500 }
    );
  }
} 