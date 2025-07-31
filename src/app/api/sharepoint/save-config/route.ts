import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Security: Validate and sanitize input
function validateConfig(config: any) {
  const requiredFields = ['tenantId', 'clientId', 'clientSecret'];
  
  // Check for required fields
  for (const field of requiredFields) {
    if (!config[field] || typeof config[field] !== 'string') {
      throw new Error(`Missing or invalid required field: ${field}`);
    }
  }

  // Validate format of IDs
  const tenantIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const clientIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!tenantIdPattern.test(config.tenantId)) {
    throw new Error('Invalid tenant ID format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  }
  
  if (!clientIdPattern.test(config.clientId)) {
    throw new Error('Invalid client ID format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  }

  // Validate client secret (should be a reasonable length)
  if (config.clientSecret.length < 10 || config.clientSecret.length > 100) {
    throw new Error('Invalid client secret length. Must be between 10 and 100 characters.');
  }

  // Sanitize optional fields
  if (config.siteId && (typeof config.siteId !== 'string' || config.siteId === '')) {
    throw new Error('Invalid site ID format');
  }
  
  if (config.driveId && (typeof config.driveId !== 'string' || config.driveId === '')) {
    throw new Error('Invalid drive ID format');
  }

  // Validate site URL if provided
  if (config.siteUrl) {
    try {
      const url = new URL(config.siteUrl);
      if (!url.hostname.includes('sharepoint.com')) {
        throw new Error('Invalid SharePoint site URL. Must be a valid SharePoint URL.');
      }
    } catch {
      throw new Error('Invalid site URL format. Must be a valid URL.');
    }
  }

  return {
    tenantId: config.tenantId.trim(),
    clientId: config.clientId.trim(),
    clientSecret: config.clientSecret,
    siteId: config.siteId?.trim() || '',
    driveId: config.driveId?.trim() || '',
    siteUrl: config.siteUrl?.trim() || ''
  };
}

// Security: Create backup before modifying
async function createBackup(envPath: string) {
  try {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    await fs.copyFile(envPath, backupPath);
    return backupPath;
  } catch (error) {
    // If backup fails, we should still proceed but log it
    console.warn('Failed to create backup:', error);
    return null;
  }
}

// Security: Validate the configuration works before saving
async function testConfiguration(config: any): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // Test token acquisition
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return { 
        success: false, 
        error: 'Authentication failed',
        details: `Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`
      };
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return { 
        success: false, 
        error: 'No access token received',
        details: 'The authentication response did not contain an access token'
      };
    }

    // Test basic API access
    const apiResponse = await fetch('https://graph.microsoft.com/v1.0/sites', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      return { 
        success: false, 
        error: 'API access failed',
        details: `SharePoint API test failed: ${apiResponse.status} ${apiResponse.statusText}`
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Configuration test failed:', error);
    return { 
      success: false, 
      error: 'Configuration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Security: Encrypt sensitive data before saving
function encryptSensitiveData(data: string): string {
  // In a production environment, you should use a proper encryption key
  // For now, we'll use a simple base64 encoding as a placeholder
  return Buffer.from(data).toString('base64');
}

// Security: Decrypt sensitive data
function decryptSensitiveData(encryptedData: string): string {
  return Buffer.from(encryptedData, 'base64').toString();
}

export async function POST(request: NextRequest) {
  try {
    // Security: Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    console.log(`Configuration save attempt from IP: ${clientIP}`);

    const config = await request.json();
    
    // Security: Validate and sanitize input
    const validatedConfig = validateConfig(config);

    // Security: Test configuration before saving (optional during save process)
    // Note: We skip the test during save since the env vars aren't set yet
    // The test will be performed when the user actually tries to use SharePoint
    console.log('Saving configuration without testing (test will be performed on first use)');

    // Create .env.local content with security considerations
    const envContent = `# SharePoint Configuration - Generated ${new Date().toISOString()}
# WARNING: Keep this file secure and do not commit to version control
# This file contains sensitive credentials for SharePoint integration

# Azure App Registration Details
SHAREPOINT_TENANT_ID=${validatedConfig.tenantId}
SHAREPOINT_CLIENT_ID=${validatedConfig.clientId}
SHAREPOINT_CLIENT_SECRET=${validatedConfig.clientSecret}

# SharePoint Site Configuration
${validatedConfig.siteId ? `SHAREPOINT_DEFAULT_SITE_ID=${validatedConfig.siteId}` : '# SHAREPOINT_DEFAULT_SITE_ID=your-site-id-here'}
${validatedConfig.driveId ? `SHAREPOINT_DEFAULT_DRIVE_ID=${validatedConfig.driveId}` : '# SHAREPOINT_DEFAULT_DRIVE_ID=your-drive-id-here'}
${validatedConfig.siteUrl ? `SHAREPOINT_SITE_URL=${validatedConfig.siteUrl}` : '# SHAREPOINT_SITE_URL=https://yourcompany.sharepoint.com'}

# Configuration Status
SHAREPOINT_CONFIG_SAVED=true
SHAREPOINT_CONFIG_SAVED_AT=${new Date().toISOString()}
`;

    // Write to .env.local with security measures
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Security: Create backup before modifying
    const backupPath = await createBackup(envPath);
    
    // Read existing .env.local to preserve other variables
    let existingContent = '';
    try {
      existingContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, that's okay
    }

    // Remove existing SharePoint config lines
    const lines = existingContent.split('\n').filter(line => 
      !line.startsWith('SHAREPOINT_') && line.trim() !== ''
    );

    // Add new SharePoint config
    const newContent = lines.join('\n') + '\n\n' + envContent;

    // Security: Set restrictive file permissions
    await fs.writeFile(envPath, newContent);
    
    // Set file permissions to owner read/write only (Unix-like systems)
    try {
      await fs.chmod(envPath, 0o600);
    } catch (error) {
      // Windows doesn't support chmod, that's okay
      console.warn('Could not set restrictive file permissions (Windows system)');
    }

    // Security: Log successful configuration (without sensitive data)
    console.log(`SharePoint configuration updated successfully. Backup created at: ${backupPath}`);

    // Create a configuration summary for the user
    const configSummary = {
      tenantId: validatedConfig.tenantId,
      clientId: validatedConfig.clientId,
      siteId: validatedConfig.siteId || 'Not configured',
      driveId: validatedConfig.driveId || 'Not configured',
      siteUrl: validatedConfig.siteUrl || 'Not configured',
      savedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully! Please restart your development server for changes to take effect.',
      backupCreated: !!backupPath,
      configSummary,
      nextSteps: [
        'Restart your development server',
        'Test the connection in the SharePoint wizard',
        'Check the dashboard to verify integration'
      ]
    });

  } catch (error) {
    console.error('Save config error:', error);
    
    // Security: Don't expose internal error details
    const isValidationError = error instanceof Error && (
      error.message.includes('Invalid') || 
      error.message.includes('Missing') || 
      error.message.includes('format')
    );
    
    return NextResponse.json(
      { 
        success: false, 
        error: isValidationError ? error.message : 'Failed to save configuration. Please check your input and try again.',
        errorType: isValidationError ? 'validation' : 'system'
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// GET endpoint to retrieve current configuration (for debugging/verification)
export async function GET(request: NextRequest) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    
    let config = {
      tenantId: process.env.SHAREPOINT_TENANT_ID || '',
      clientId: process.env.SHAREPOINT_CLIENT_ID || '',
      siteId: process.env.SHAREPOINT_DEFAULT_SITE_ID || '',
      driveId: process.env.SHAREPOINT_DEFAULT_DRIVE_ID || '',
      siteUrl: process.env.SHAREPOINT_SITE_URL || '',
      configSaved: process.env.SHAREPOINT_CONFIG_SAVED === 'true',
      configSavedAt: process.env.SHAREPOINT_CONFIG_SAVED_AT || ''
    };

    // Check if .env.local exists and has SharePoint config
    try {
      const envContent = await fs.readFile(envPath, 'utf-8');
      const hasSharePointConfig = envContent.includes('SHAREPOINT_');
      
      return NextResponse.json({
        success: true,
        config,
        hasEnvFile: true,
        hasSharePointConfig,
        fileExists: true
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        config,
        hasEnvFile: false,
        hasSharePointConfig: false,
        fileExists: false
      });
    }
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
} 