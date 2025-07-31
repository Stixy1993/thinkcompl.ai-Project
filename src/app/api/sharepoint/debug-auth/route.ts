import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== SharePoint Authentication Debug ===');
    
    // Check environment variables
    console.log('Environment variables:');
    console.log('- SHAREPOINT_CLIENT_ID:', process.env.SHAREPOINT_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('- SHAREPOINT_CLIENT_SECRET:', process.env.SHAREPOINT_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('- SHAREPOINT_TENANT_ID:', process.env.SHAREPOINT_TENANT_ID ? 'SET' : 'NOT SET');
    
    // Test token acquisition
    console.log('\n=== Testing Token Acquisition ===');
    const tenantId = process.env.SHAREPOINT_TENANT_ID || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    console.log('Token URL:', tokenUrl);
    
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
    
    console.log('Token response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log('Token error:', errorText);
      return NextResponse.json({
        success: false,
        error: `Token acquisition failed: ${tokenResponse.status} ${errorText}`,
        debug: {
          tokenUrl,
          clientId: process.env.SHAREPOINT_CLIENT_ID ? 'SET' : 'NOT SET',
          clientSecret: process.env.SHAREPOINT_CLIENT_SECRET ? 'SET' : 'NOT SET',
          tenantId: process.env.SHAREPOINT_TENANT_ID || 'common'
        }
      }, { status: 500 });
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Token acquired successfully');
    console.log('Token type:', tokenData.token_type);
    console.log('Token expires in:', tokenData.expires_in, 'seconds');
    
    // Test a simple API call
    console.log('\n=== Testing Simple API Call ===');
    const testResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Organization API status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log('Organization API error:', errorText);
      return NextResponse.json({
        success: false,
        error: `Organization API failed: ${testResponse.status} ${errorText}`,
        tokenAcquired: true,
        tokenType: tokenData.token_type
      }, { status: 500 });
    }
    
    const orgData = await testResponse.json();
    console.log('Organization API successful');
    
    return NextResponse.json({
      success: true,
      message: 'Authentication debug completed',
      tokenAcquired: true,
      organizationAccess: true,
      organization: orgData.value?.[0]?.displayName || 'Unknown'
    });
    
  } catch (error) {
    console.error('Debug failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 