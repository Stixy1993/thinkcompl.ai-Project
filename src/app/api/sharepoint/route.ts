import { NextRequest, NextResponse } from 'next/server';

// SharePoint API Configuration
const SHAREPOINT_SITE_URL = process.env.SHAREPOINT_SITE_URL;
const SHAREPOINT_CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const SHAREPOINT_CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;
const SHAREPOINT_TENANT_ID = process.env.SHAREPOINT_TENANT_ID;

// Token cache with better management
let cachedToken: { token: string; expires: number } | null = null;

// Get access token for SharePoint API with improved caching
async function getSharePointToken() {
  // Check if we have a valid cached token (with 5 minute buffer)
  if (cachedToken && Date.now() < (cachedToken.expires - 5 * 60 * 1000)) {
    return cachedToken.token;
  }

  try {
    // Try to get user delegation token first (if available)
    const userToken = process.env.SHAREPOINT_USER_TOKEN;
    if (userToken) {
      console.log('Using user delegation token');
      return userToken;
    }

    // Fall back to app-only token
    console.log('Using app-only token');
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
      throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Cache token for 45 minutes (tokens typically last 1 hour, but we refresh earlier)
    cachedToken = {
      token: tokenData.access_token,
      expires: Date.now() + (45 * 60 * 1000)
    };

    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting SharePoint token:', error);
    // Clear cache on error
    cachedToken = null;
    throw error;
  }
}

// Improved SharePoint API helper functions with better retry logic
async function makeSharePointRequest(endpoint: string, options: RequestInit = {}, retries = 3): Promise<any> {
  const token = await getSharePointToken();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expired, clear cache and retry
        console.log('Token expired, refreshing...');
        cachedToken = null;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SharePoint API error (attempt ${attempt}):`, response.status, response.statusText, errorText);
        throw new Error(`SharePoint API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`SharePoint request failed (attempt ${attempt}):`, error);
      if (attempt === retries) {
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Enhanced rate limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(operation: string, ip?: string): boolean {
  const now = Date.now();
  const key = `${operation}:${ip || 'unknown'}`;
  const limit = rateLimiter.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimiter.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT) {
    return false;
  }

  limit.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Security: Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    if (!checkRateLimit('GET', clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Security: Input validation
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action parameter is required' },
        { status: 400 }
      );
    }

    // Security: Validate action
    const allowedActions = ['getSites', 'getDrives', 'getItems', 'search'];
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action specified' },
        { status: 400 }
      );
    }

    const siteId = searchParams.get('siteId');
    const driveId = searchParams.get('driveId');
    const folderPath = searchParams.get('folderPath');

    switch (action) {
      case 'getSites':
        // Get all sites accessible to the app
        const sitesResponse = await makeSharePointRequest('/sites');
        return NextResponse.json(sitesResponse);

      case 'getDrives':
        // Get all document libraries in the site
        if (!siteId) {
          return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
        }
        const drivesResponse = await makeSharePointRequest(`/sites/${siteId}/drives`);
        return NextResponse.json(drivesResponse);

      case 'getItems':
        // Get files and folders in a specific folder
        if (!driveId) {
          return NextResponse.json({ error: 'Drive ID is required' }, { status: 400 });
        }
        const itemsEndpoint = folderPath 
          ? `/drives/${driveId}/root:/${folderPath}:/children?$select=id,name,size,file,folder,webUrl,@microsoft.graph.downloadUrl,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,fileSystemInfo`
          : `/drives/${driveId}/root/children?$select=id,name,size,file,folder,webUrl,@microsoft.graph.downloadUrl,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,fileSystemInfo`;
        
        console.log('DEBUG: Fetching items from endpoint:', itemsEndpoint);
        console.log('DEBUG: Drive ID:', driveId);
        console.log('DEBUG: Folder path:', folderPath);
        
        const itemsResponse = await makeSharePointRequest(itemsEndpoint);
        console.log('DEBUG: SharePoint response:', JSON.stringify(itemsResponse, null, 2));
        
        return NextResponse.json(itemsResponse);

      case 'search':
        // Search for items
        const query = searchParams.get('q');
        if (!query || !driveId) {
          return NextResponse.json({ error: 'Query and Drive ID are required' }, { status: 400 });
        }
        const searchResponse = await makeSharePointRequest(
          `/drives/${driveId}/root/search(q='${encodeURIComponent(query)}')`
        );
        return NextResponse.json(searchResponse);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('SharePoint API error:', error);
    return NextResponse.json({ 
      error: 'SharePoint API error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, siteId, driveId, folderPath, fileName, fileContent, itemId } = body;

    // Rate limiting
    if (!checkRateLimit(action || 'default')) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    switch (action) {
      case 'uploadFile':
        // Upload a file to SharePoint
        if (!driveId || !fileName || !fileContent) {
          return NextResponse.json({ error: 'Drive ID, file name, and content are required' }, { status: 400 });
        }
        
        const uploadEndpoint = folderPath 
          ? `/drives/${driveId}/root:/${folderPath}/${fileName}:/content`
          : `/drives/${driveId}/root:/${fileName}:/content`;
        
        const uploadResponse = await makeSharePointRequest(uploadEndpoint, {
          method: 'PUT',
          body: Buffer.from(fileContent),
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });

        return NextResponse.json(uploadResponse);

      case 'createFolder':
        // Create a new folder
        if (!driveId || !fileName) {
          return NextResponse.json({ error: 'Drive ID and folder name are required' }, { status: 400 });
        }
        
        const folderEndpoint = folderPath 
          ? `/drives/${driveId}/root:/${folderPath}:/children`
          : `/drives/${driveId}/root/children`;
        
        const folderResponse = await makeSharePointRequest(folderEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            name: fileName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          }),
        });
        
        return NextResponse.json(folderResponse);

      case 'moveItem':
        // Simplified and improved move operation
        if (!driveId || !itemId) {
          return NextResponse.json({ error: 'Drive ID and Item ID are required' }, { status: 400 });
        }
        
        console.log('Moving item:', itemId, 'to folder:', folderPath);
        
        // Use the simplified move endpoint
        const moveEndpoint = `/drives/${driveId}/items/${itemId}/move`;
        
        // Construct the parent reference path
        let parentPath;
        if (!folderPath || folderPath === '') {
          // Moving to root
          parentPath = `/drives/${driveId}/root`;
        } else {
          // Moving to a specific folder - URL encode the folder path
          const encodedFolderPath = encodeURIComponent(folderPath);
          parentPath = `/drives/${driveId}/root:/${encodedFolderPath}`;
        }
        
        const moveBody = {
          parentReference: {
            path: parentPath,
          },
        };
        
        console.log('Move endpoint:', moveEndpoint);
        console.log('Parent path:', parentPath);
        console.log('Move body:', JSON.stringify(moveBody, null, 2));
        
        try {
          const moveResponse = await makeSharePointRequest(moveEndpoint, {
            method: 'POST',
            body: JSON.stringify(moveBody),
          });
          
          console.log('✅ Move successful:', moveResponse);
          return NextResponse.json(moveResponse);
        } catch (moveError: any) {
          console.error('❌ Move failed:', moveError.message);
          
          // Fallback: Try copy + delete method
          console.log('Trying copy + delete fallback...');
          try {
            // Step 1: Copy the item to the target location
            const copyEndpoint = `/drives/${driveId}/items/${itemId}/copy`;
            const copyBody = {
              parentReference: {
                path: parentPath,
              },
              name: fileName || 'copied-item',
            };
            
            console.log('Copy endpoint:', copyEndpoint);
            console.log('Copy body:', JSON.stringify(copyBody, null, 2));
            
            const copyResponse = await makeSharePointRequest(copyEndpoint, {
              method: 'POST',
              body: JSON.stringify(copyBody)
            });
            
            console.log('✅ Copy successful:', copyResponse);
            
            // Step 2: Delete the original item
            const deleteEndpoint = `/drives/${driveId}/items/${itemId}`;
            console.log('Deleting original item:', deleteEndpoint);
            
            await makeSharePointRequest(deleteEndpoint, {
              method: 'DELETE'
            });
            
            console.log('✅ Delete successful');
            
            return NextResponse.json({ 
              success: true, 
              message: 'Item moved successfully using copy + delete method',
              copiedItem: copyResponse
            });
            
          } catch (fallbackError: any) {
            console.error('❌ Copy + Delete fallback failed:', fallbackError.message);
            return NextResponse.json({ 
              error: 'Move failed', 
              details: `Both move and copy+delete methods failed. Move error: ${moveError.message}. Fallback error: ${fallbackError.message}` 
            }, { status: 500 });
          }
        }

      case 'copyItem':
        // Copy a file or folder using item ID
        if (!driveId || !itemId) {
          return NextResponse.json({ error: 'Drive ID and Item ID are required' }, { status: 400 });
        }
        
        console.log('Copying item by ID:', itemId, 'to folder:', folderPath);
        
        const copyByIdEndpoint = `/drives/${driveId}/items/${itemId}/copy`;
        
        // Construct the parent reference path correctly
        let copyParentPath;
        if (!folderPath || folderPath === '') {
          // Copying to root
          copyParentPath = `/drives/${driveId}/root`;
        } else {
          // Copying to a specific folder - URL encode the folder path
          const encodedFolderPath = encodeURIComponent(folderPath);
          copyParentPath = `/drives/${driveId}/root:/${encodedFolderPath}`;
        }
        
        const copyByIdBody = {
          parentReference: {
            path: copyParentPath,
          },
        };
        
        console.log('Copy endpoint:', copyByIdEndpoint);
        console.log('Parent path:', copyParentPath);
        console.log('Copy body:', JSON.stringify(copyByIdBody, null, 2));
        
        const copyByIdResponse = await makeSharePointRequest(copyByIdEndpoint, {
          method: 'POST',
          body: JSON.stringify(copyByIdBody),
        });
        return NextResponse.json(copyByIdResponse);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('SharePoint API error:', error);
    return NextResponse.json({ 
      error: 'SharePoint API error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get('driveId');
    const itemId = searchParams.get('itemId');

    if (!driveId || !itemId) {
      return NextResponse.json({ error: 'Drive ID and Item ID are required' }, { status: 400 });
    }

    // Rate limiting
    if (!checkRateLimit('delete')) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await makeSharePointRequest(
      `/drives/${driveId}/items/${itemId}`,
      { method: 'DELETE' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SharePoint API error:', error);
    return NextResponse.json({ 
      error: 'SharePoint API error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 