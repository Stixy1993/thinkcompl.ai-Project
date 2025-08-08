import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret } = await request.json();

    if (!clientId && !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Client ID or Client Secret is required' },
        { status: 400 }
      );
    }

    // Path to .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Read existing .env.local file
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      // File doesn't exist, start with empty content
      envContent = '';
    }

    // Update or add environment variables
    const lines = envContent.split('\n');
    let clientIdUpdated = false;
    let clientSecretUpdated = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (clientId && lines[i].startsWith('SHAREPOINT_CLIENT_ID=')) {
        lines[i] = `SHAREPOINT_CLIENT_ID=${clientId}`;
        clientIdUpdated = true;
      }
      if (clientSecret && lines[i].startsWith('SHAREPOINT_CLIENT_SECRET=')) {
        lines[i] = `SHAREPOINT_CLIENT_SECRET=${clientSecret}`;
        clientSecretUpdated = true;
      }
    }
    
    // If not found, add them
    if (clientId && !clientIdUpdated) {
      lines.push(`SHAREPOINT_CLIENT_ID=${clientId}`);
    }
    if (clientSecret && !clientSecretUpdated) {
      lines.push(`SHAREPOINT_CLIENT_SECRET=${clientSecret}`);
    }

    // Write back to file
    fs.writeFileSync(envPath, lines.join('\n'));

    return NextResponse.json({
      success: true,
      message: 'Environment variables updated successfully'
    });

  } catch (error) {
    console.error('Failed to update environment variables:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update environment variables' },
      { status: 500 }
    );
  }
} 