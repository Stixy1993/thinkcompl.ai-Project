import { NextRequest, NextResponse } from 'next/server';
import { SharePointAuth } from '@/lib/sharepoint-auth';

export async function POST(request: NextRequest) {
  try {
    // Clear all SharePoint authentication tokens
    await SharePointAuth.logout();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully logged out'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to logout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 