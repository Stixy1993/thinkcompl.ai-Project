import { NextRequest, NextResponse } from 'next/server';

// In-memory store for configuration (in production, use a database)
let configStore: any = null;

export async function GET(request: NextRequest) {
  try {
    // Return current configuration
    return NextResponse.json({
      success: true,
      config: configStore
    });
  } catch (error) {
    console.error('Failed to load configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Save configuration
    configStore = {
      clientId: body.clientId,
      tenantId: body.tenantId || null,
      siteUrl: body.siteUrl || null,
      siteId: body.siteId || null,
      driveId: body.driveId || null,
      configSaved: true,
      configSavedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: configStore
    });

  } catch (error) {
    console.error('Failed to save configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
} 