import { NextRequest, NextResponse } from 'next/server';

// OAuth2 configuration for SharePoint
const SHAREPOINT_CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const SHAREPOINT_TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://thinkcompl.ai/api/sharepoint/auth/callback'
  : 'http://localhost:3000/api/sharepoint/auth/callback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Only proceed if action is 'login'
    if (action !== 'login') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use action=login' },
        { status: 400 }
      );
    }
    
    // Generate state parameter for security
    const state = Math.random().toString(36).substring(7);
    
    // Build authorization URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', SHAREPOINT_CLIENT_ID!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', 'https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.ReadWrite.All');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');
    
    // Store state in session/cookie for verification
    const response = NextResponse.json({ 
      success: true, 
      authUrl: authUrl.toString(),
      state 
    });
    
    // Set state in cookie for verification
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300 // 5 minutes
    });
    
    return response;
    
  } catch (error) {
    console.error('Auth URL generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
} 