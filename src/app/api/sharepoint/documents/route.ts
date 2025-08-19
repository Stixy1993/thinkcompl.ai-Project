import { NextRequest, NextResponse } from 'next/server';

// Function to refresh expired access tokens
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.SHAREPOINT_CLIENT_ID!,
      client_secret: process.env.SHAREPOINT_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Function to update the access token cookie
function updateAccessTokenCookie(response: NextResponse, newToken: string, expiresIn: number = 3600) {
  response.cookies.set('sharepoint_access_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn
  });
}

// SharePoint API using OAuth2 user delegation tokens with automatic refresh
async function makeSharePointRequest(endpoint: string, options: RequestInit = {}, userToken?: string, request?: NextRequest): Promise<{ data: any; response?: NextResponse }> {
  if (!userToken) {
    throw new Error('User access token is required');
  }

  let currentToken = userToken;
  let updatedResponse: NextResponse | undefined;

  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // If we get a 401, try to refresh the token
  if (response.status === 401 && request) {
    const refreshToken = request.cookies.get('sharepoint_refresh_token')?.value;
    if (refreshToken) {
      try {
        console.log('DEBUG: Access token expired, attempting to refresh...');
        const newAccessToken = await refreshAccessToken(refreshToken);
        
        // Create a response object to update the cookie
        updatedResponse = new NextResponse();
        updateAccessTokenCookie(updatedResponse, newAccessToken);
        
        // Retry the request with the new token
        const retryResponse = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          console.error(`SharePoint API error:`, retryResponse.status, retryResponse.statusText, errorText);
          throw new Error(`SharePoint API error: ${retryResponse.status} ${retryResponse.statusText} - ${errorText}`);
        }

        return { data: await retryResponse.json(), response: updatedResponse };
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // If refresh fails, throw the original 401 error
        const errorText = await response.text();
        console.error(`SharePoint API error:`, response.status, response.statusText, errorText);
        throw new Error(`SharePoint API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`SharePoint API error:`, response.status, response.statusText, errorText);
    throw new Error(`SharePoint API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return { data: await response.json() };
}

export async function GET(request: NextRequest) {
  try {
    // Get user's access token from cookies
    const userToken = request.cookies.get('sharepoint_access_token')?.value;
    
    if (!userToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect to SharePoint first.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action parameter is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'getDefaultSite':
        // Get the user's primary SharePoint site automatically
        const siteResult = await makeSharePointRequest('/sites/root?$select=id,name,displayName,webUrl', {}, userToken, request);
        const response = NextResponse.json(siteResult.data);
        
        // If we have an updated response with new token, merge the cookies
        if (siteResult.response) {
          siteResult.response.cookies.getAll().forEach(cookie => {
            response.cookies.set(cookie.name, cookie.value, cookie);
          });
        }
        
        return response;

      case 'getDrives':
        // Get all document libraries from the user's site
        const siteId = searchParams.get('siteId');
        if (!siteId) {
          return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
        }
        
        // Universal approach: Try multiple methods to find the best drive
        let drivesResponse;
        let updatedResponse: NextResponse | undefined;
        
        try {
          // Method 1: Get SharePoint drives
          const drivesResult = await makeSharePointRequest(`/sites/${siteId}/drives?$select=id,name,webUrl`, {}, userToken, request);
          drivesResponse = drivesResult.data;
          updatedResponse = drivesResult.response;
          console.log('DEBUG: SharePoint drives:', JSON.stringify(drivesResponse, null, 2));
          
          // Method 2: Also get document libraries for fallback
          try {
            const librariesResult = await makeSharePointRequest(`/sites/${siteId}/lists?$select=id,name,webUrl,displayName`, {}, userToken, request);
            const librariesResponse = librariesResult.data;
            if (librariesResult.response) {
              updatedResponse = librariesResult.response;
            }
            console.log('DEBUG: Document libraries:', JSON.stringify(librariesResponse, null, 2));
            
            // If no SharePoint drives found, create a virtual drive from the first document library
            if (!drivesResponse.value || drivesResponse.value.length === 0) {
              const documentLibraries = librariesResponse.value?.filter((lib: any) => 
                lib.name !== 'SharePointHomeOrgLinks' && lib.name !== 'Events'
              ) || [];
              
              if (documentLibraries.length > 0) {
                const firstLibrary = documentLibraries[0];
                drivesResponse = {
                  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#drives(id,name,webUrl)",
                  "value": [{
                    id: `virtual-${firstLibrary.id}`,
                    name: firstLibrary.displayName || firstLibrary.name,
                    webUrl: firstLibrary.webUrl,
                    isVirtual: true,
                    libraryId: firstLibrary.id
                  }]
                };
                console.log('DEBUG: Created virtual drive from library:', drivesResponse);
              }
            }
          } catch (error) {
            console.log('DEBUG: Could not get document libraries:', error);
          }
          
          // Method 3: If still no drives, return empty (no OneDrive fallback)
          if (!drivesResponse.value || drivesResponse.value.length === 0) {
            console.log('DEBUG: No SharePoint drives found - returning empty');
            drivesResponse = { value: [] };
          }
          
        } catch (error) {
          console.log('DEBUG: Error getting SharePoint drives:', error);
          drivesResponse = { value: [] };
        }
        
        const driveResponse = NextResponse.json(drivesResponse);
        
        // If we have an updated response with new token, merge the cookies
        if (updatedResponse) {
          updatedResponse.cookies.getAll().forEach(cookie => {
            driveResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
        }
        
        return driveResponse;



      case 'getItems':
        // Get files and folders from the default SharePoint drive
        const driveId = searchParams.get('driveId');
        const folderPath = searchParams.get('folderPath');
        
        if (!driveId) {
          return NextResponse.json({ error: 'Drive ID is required' }, { status: 400 });
        }
        
        // Universal approach: Try multiple methods to get files
        let itemsResponse;
        let itemsUpdatedResponse: NextResponse | undefined;
        
        try {
          // Method 1: Try the drive API approach first (most reliable)
          let itemsEndpoint;
          
          // Handle different drive types
          const siteId = searchParams.get('siteId');
                     if (driveId.startsWith('virtual-')) {
             // Virtual drive (from document library)
             const libraryId = driveId.replace('virtual-', '');
             console.log('DEBUG: Virtual drive detected, library ID:', libraryId);
             console.log('DEBUG: Folder path requested:', folderPath);
            
            if (folderPath) {
              // For document libraries with folder paths, we need to use the folder structure
              // First, try to get the folder by path
              const folderName = folderPath.split('/').pop();
              console.log('DEBUG: Looking for folder with name:', folderName);
              
              const folderEndpoint = `/sites/${siteId}/lists/${libraryId}/items?$expand=fields&$select=id,fields&$filter=fields/FSObjType eq 1 and fields/FileLeafRef eq '${folderName}'`;
              console.log('DEBUG: Method 1 - Virtual drive (library) folder lookup:', folderEndpoint);
              
              try {
                const folderResult = await makeSharePointRequest(folderEndpoint, {}, userToken, request);
                const folderData = folderResult.data;
                if (folderData.response) {
                  itemsUpdatedResponse = folderData.response;
                }
                
                console.log('DEBUG: Folder lookup result:', JSON.stringify(folderData, null, 2));
                
                if (folderData.value && folderData.value.length > 0) {
                  // Found the folder, now get its children
                  const folderId = folderData.value[0].id;
                  console.log('DEBUG: Found folder with ID:', folderId);
                  itemsEndpoint = `/sites/${siteId}/lists/${libraryId}/items/${folderId}/children?$expand=fields&$select=id,fields`;
                  console.log('DEBUG: Method 1 - Virtual drive (library) folder children:', itemsEndpoint);
                } else {
                  // If folder not found, return empty instead of falling back to all items
                  console.log('DEBUG: Folder not found, returning empty');
                  itemsResponse = { value: [] };
                  break;
                }
              } catch (error) {
                console.log('DEBUG: Error getting folder, returning empty:', error);
                itemsResponse = { value: [] };
                break;
              }
            } else {
              // Root level - get all items
              itemsEndpoint = `/sites/${siteId}/lists/${libraryId}/items?$expand=fields&$select=id,fields`;
              console.log('DEBUG: Method 1 - Virtual drive (library) root level:', itemsEndpoint);
            }
          } else if (driveId.includes('onedrive')) {
            // OneDrive
            itemsEndpoint = folderPath 
              ? `/me/drive/root:/${folderPath}:/children?$select=id,name,size,file,folder,webUrl,@microsoft.graph.downloadUrl,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,fileSystemInfo`
              : `/me/drive/root/children?$select=id,name,size,file,folder,webUrl,@microsoft.graph.downloadUrl,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,fileSystemInfo`;
            console.log('DEBUG: Method 1 - OneDrive endpoint:', itemsEndpoint);
          } else {
            // Regular SharePoint drive
            console.log('DEBUG: Regular SharePoint drive detected');
            console.log('DEBUG: Drive ID:', driveId);
            console.log('DEBUG: Folder path:', folderPath);
            
            if (folderPath) {
              // For regular SharePoint drives, use a simpler approach
              console.log('DEBUG: Looking for folder in SharePoint drive:', folderPath);
              
              // Try to get the folder directly by path
              const encodedFolderPath = encodeURIComponent(folderPath);
              console.log('DEBUG: Encoded folder path:', encodedFolderPath);
              
              // Use the path-based endpoint with proper encoding
              itemsEndpoint = `/drives/${driveId}/root:/${encodedFolderPath}:/children?$select=id,name,size,file,folder,webUrl,@microsoft.graph.downloadUrl,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,fileSystemInfo`;
              console.log('DEBUG: Using path-based endpoint:', itemsEndpoint);
              
              try {
                const pathResult = await makeSharePointRequest(itemsEndpoint, {}, userToken, request);
                const pathData = pathResult.data;
                console.log('DEBUG: Path-based response:', JSON.stringify(pathData, null, 2));
                
                // If path-based approach returns items, use it
                if (pathData.value !== undefined) {
                  itemsResponse = pathData;
                  itemsUpdatedResponse = pathResult.response;
                  console.log('DEBUG: Path-based approach successful');
                } else {
                  throw new Error('Path-based approach failed');
                }
              } catch (pathError) {
                console.log('DEBUG: Path-based approach failed:', pathError);
                // If path-based approach fails, return empty
                itemsResponse = { value: [] };
              }
            } else {
              itemsEndpoint = `/drives/${driveId}/root/children?$select=id,name,size,file,folder,webUrl,@microsoft.graph.downloadUrl,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,fileSystemInfo`;
            }
            console.log('DEBUG: Method 1 - SharePoint drive endpoint:', itemsEndpoint);
          }
          
          console.log('DEBUG: Drive ID:', driveId);
          console.log('DEBUG: Folder path:', folderPath);
          
          // Only make the main API call if we don't already have a response
          if (!itemsResponse) {
            const itemsResult = await makeSharePointRequest(itemsEndpoint, {}, userToken, request);
            itemsResponse = itemsResult.data;
            itemsUpdatedResponse = itemsResult.response;
            console.log('DEBUG: Drive API response:', JSON.stringify(itemsResponse, null, 2));
          }
          
                     // Convert library items to drive format if needed
           if (driveId.startsWith('virtual-') && itemsResponse.value && itemsResponse.value.length > 0) {
            itemsResponse = {
              "@odata.context": itemsResponse["@odata.context"],
              "value": itemsResponse.value.map((item: any) => ({
                id: item.id,
                name: item.fields?.FileLeafRef || item.fields?.Title || 'Unknown',
                size: item.fields?.FileSizeDisplay || 0,
                file: item.fields?.FSObjType === 0 ? {} : undefined,
                folder: item.fields?.FSObjType === 1 ? {} : undefined,
                webUrl: item.fields?.FileRef || '',
                lastModifiedDateTime: item.fields?.Modified,
                lastModifiedBy: item.fields?.Editor?.LookupValue || '',
                createdDateTime: item.fields?.Created,
                createdBy: item.fields?.Author?.LookupValue || ''
              }))
            };
            console.log('DEBUG: Converted library items to drive format:', JSON.stringify(itemsResponse, null, 2));
          }
          
          // If drive API returns empty, return empty (no fallback to other locations)
          if (!itemsResponse.value || itemsResponse.value.length === 0) {
            console.log('DEBUG: Drive API returned empty, returning empty response');
            itemsResponse = { value: [] };
          }
          
          // If still no items found, return empty array
          if (!itemsResponse || !itemsResponse.value || itemsResponse.value.length === 0) {
            console.log('DEBUG: No items found in any location');
            itemsResponse = { value: [] };
          }
          
        } catch (error) {
          console.log('DEBUG: Error with SharePoint API:', error);
          itemsResponse = { value: [] };
        }
        
        const itemsApiResponse = NextResponse.json(itemsResponse);
        
        // If we have an updated response with new token, merge the cookies
        if (itemsUpdatedResponse) {
          itemsUpdatedResponse.cookies.getAll().forEach(cookie => {
            itemsApiResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
        }
        
        return itemsApiResponse;

      case 'search':
        // Search for items in user's OneDrive
        const query = searchParams.get('q');
        if (!query) {
          return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        const searchResult = await makeSharePointRequest(
          `/me/drive/root/search(q='${encodeURIComponent(query)}')`,
          {},
          userToken,
          request
        );
        const searchResponse = NextResponse.json(searchResult.data);
        
        // If we have an updated response with new token, merge the cookies
        if (searchResult.response) {
          searchResult.response.cookies.getAll().forEach(cookie => {
            searchResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
        }
        
        return searchResponse;

      case 'getDownloadUrl':
        // Get download URL for a file
        const fileId = searchParams.get('fileId');
        const downloadDriveId = searchParams.get('driveId');
        if (!fileId || !downloadDriveId) {
          return NextResponse.json({ error: 'Missing fileId or driveId' }, { status: 400 });
        }
        try {
          // Get the file details including download URL
          const fileEndpoint = `/drives/${downloadDriveId}/items/${fileId}?$select=id,name,size,file,folder,webUrl,@microsoft.graph.downloadUrl,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,fileSystemInfo`;
          const fileResult = await makeSharePointRequest(fileEndpoint, {}, userToken, request);
          const fileData = fileResult.data;
          const downloadUrl = fileData['@microsoft.graph.downloadUrl'] || fileData.webUrl;
          
          const downloadResponse = NextResponse.json({ downloadUrl });
          if (fileResult.response) {
            // Merge cookies from the response
            fileResult.response.cookies.getAll().forEach(cookie => {
              downloadResponse.cookies.set(cookie.name, cookie.value, cookie);
            });
          }
          return downloadResponse;
        } catch (error) {
          console.error('Error getting download URL:', error);
          return NextResponse.json({ error: 'Failed to get download URL' }, { status: 500 });
        }

      case 'downloadFile':
        // Download file content through backend to avoid CORS issues
        const downloadFileId = searchParams.get('fileId');
        const downloadFileDriveId = searchParams.get('driveId');
        const fileName = searchParams.get('fileName');
        
        if (!downloadFileId || !downloadFileDriveId || !fileName) {
          return NextResponse.json({ error: 'Missing fileId, driveId, or fileName' }, { status: 400 });
        }
        
        try {
          console.log('DEBUG: Starting file download:', { downloadFileId, downloadFileDriveId, fileName });
          
          // Get the file content directly using Microsoft Graph API
          const fileContentEndpoint = `/drives/${downloadFileDriveId}/items/${downloadFileId}/content`;
          
          // Make a direct request to get the file content
          const directResponse = await fetch(`https://graph.microsoft.com/v1.0${fileContentEndpoint}`, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Accept': '*/*',
            },
          });
          
          console.log('DEBUG: Direct response status:', directResponse.status);
          
          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            console.error('DEBUG: Failed to fetch file content:', errorText);
            throw new Error(`Failed to fetch file content: ${directResponse.status} ${directResponse.statusText} - ${errorText}`);
          }
          
          // Get the file content as an array buffer
          const arrayBuffer = await directResponse.arrayBuffer();
          console.log('DEBUG: File array buffer size:', arrayBuffer.byteLength);
          
          // Determine the correct content type
          const extension = fileName.split('.').pop()?.toLowerCase();
          const mimeTypes: { [key: string]: string } = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
          };
          const contentType = mimeTypes[extension || ''] || 'application/octet-stream';
          
          // Create response with the file content
          const response = new NextResponse(arrayBuffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
              'Content-Length': arrayBuffer.byteLength.toString(),
              'Cache-Control': 'no-cache',
            },
          });
          
          console.log('DEBUG: File download completed successfully');
          
          return response;
        } catch (error) {
          console.error('Error downloading file:', error);
          return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
        }

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
    // Get user's access token from cookies
    const userToken = request.cookies.get('sharepoint_access_token')?.value;
    
    if (!userToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect to SharePoint first.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, fileName, fileContent, itemId, folderPath, currentPath } = body;

    switch (action) {
      case 'uploadFile':
        // Upload a file to user's OneDrive
        if (!fileName || !fileContent) {
          return NextResponse.json({ error: 'File name and content are required' }, { status: 400 });
        }
        
        const uploadEndpoint = folderPath 
          ? `/me/drive/root:/${folderPath}/${fileName}:/content`
          : `/me/drive/root:/${fileName}:/content`;
        
        const uploadResponse = await makeSharePointRequest(uploadEndpoint, {
          method: 'PUT',
          body: Buffer.from(fileContent),
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        }, userToken, request);

        return NextResponse.json(uploadResponse);

      case 'createFolder':
        // Create a new folder in a SharePoint drive
        if (!fileName) {
          return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }
        
        const folderDriveId = body.driveId;
        if (!folderDriveId) {
          return NextResponse.json({ error: 'Drive ID is required' }, { status: 400 });
        }
        
        const folderEndpoint = folderPath 
          ? `/drives/${folderDriveId}/root:/${folderPath}:/children`
          : `/drives/${folderDriveId}/root/children`;
        
        const folderResponse = await makeSharePointRequest(folderEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            name: fileName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          }),
        }, userToken, request);
        
        return NextResponse.json(folderResponse);

      case 'moveItem':
        // Move an item in a SharePoint drive using copy-and-delete approach
        if (!itemId) {
          return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }
        
        const moveDriveId = body.driveId;
        if (!moveDriveId) {
          return NextResponse.json({ error: 'Drive ID is required' }, { status: 400 });
        }
        
        console.log('DEBUG: Move operation started (using copy-and-delete):', {
          itemId,
          itemName: body.itemName || 'Unknown',
          targetPath: folderPath,
          driveId: moveDriveId,
          siteId: body.siteId
        });
        
        try {
          if (moveDriveId.startsWith('virtual-')) {
            // Virtual drive (document library) - use manual copy and delete approach
            const libraryId = moveDriveId.replace('virtual-', '');
            const siteId = body.siteId;
            if (!siteId) {
              return NextResponse.json({ error: 'Site ID is required for virtual drives' }, { status: 400 });
            }
            
            console.log('DEBUG: Moving item in document library using copy-and-delete:', {
              libraryId,
              siteId,
              itemId,
              targetPath: folderPath
            });
            
            // First, get the item details to understand its current location
            const itemDetailsEndpoint = `/sites/${siteId}/lists/${libraryId}/items/${itemId}?$expand=fields`;
            console.log('DEBUG: Getting item details from:', itemDetailsEndpoint);
            
            const itemDetails = await makeSharePointRequest(itemDetailsEndpoint, {}, userToken, request);
            
            if (!itemDetails.data) {
              console.error('DEBUG: Item not found in document library');
              return NextResponse.json({ error: 'Item not found' }, { status: 404 });
            }
            
            const item = itemDetails.data;
            const itemName = item.fields?.FileLeafRef || item.fields?.Title || 'Unknown';
            const currentPath = item.fields?.FileDirRef || '/';
            
            console.log('DEBUG: Item details:', {
              itemName,
              currentPath,
              targetPath: folderPath,
              itemFields: item.fields
            });
            
            // Check if we're trying to move to the same location
            if (currentPath === `/${folderPath || ''}`) {
              console.log('DEBUG: Item is already in target location');
              return NextResponse.json({ 
                success: true, 
                message: 'Item is already in target location',
                item: item 
              });
            }
            
            // For document libraries, we need to use a different approach
            // We'll use the SharePoint REST API to move the item
            const moveEndpoint = `/sites/${siteId}/lists/${libraryId}/items/${itemId}`;
            const moveBody = {
              fields: {
                // Update the folder path if moving to a subfolder
                ...(folderPath && { FileDirRef: `/${folderPath}` })
              }
            };
            
            console.log('DEBUG: Moving item using PATCH:', {
              moveEndpoint,
              moveBody
            });
            
            const moveResponse = await makeSharePointRequest(moveEndpoint, {
              method: 'PATCH',
              body: JSON.stringify(moveBody),
            }, userToken, request);
            
            if (moveResponse.data) {
              console.log('DEBUG: Item moved successfully in document library');
              return NextResponse.json({ 
                success: true, 
                message: 'Item moved successfully',
                item: moveResponse.data 
              });
            } else {
              console.error('DEBUG: Failed to move item in document library');
              return NextResponse.json({ error: 'Failed to move item in document library' }, { status: 500 });
            }
            
          } else {
            // Regular SharePoint drive - use copy-and-delete approach
            console.log('DEBUG: Moving item in regular SharePoint drive using copy-and-delete');
            
            // Step 1: Copy the item to the target location
            const copyEndpoint = `/drives/${moveDriveId}/items/${itemId}/copy`;
            
            // Construct the parent reference path correctly
            let parentPath;
            if (!folderPath || folderPath === '') {
              // Copying to root
              parentPath = `/drives/${moveDriveId}/root`;
            } else {
              // Copying to a specific folder - URL encode the folder path
              const encodedFolderPath = encodeURIComponent(folderPath);
              parentPath = `/drives/${moveDriveId}/root:/${encodedFolderPath}`;
            }
            
            const copyBody = {
              parentReference: {
                path: parentPath,
              },
            };
            
            console.log('DEBUG: Copying item to new location:', {
              itemId,
              targetPath: folderPath,
              parentPath,
              copyEndpoint,
              copyBody
            });
            
            try {
              const copyResponse = await makeSharePointRequest(copyEndpoint, {
                method: 'POST',
                body: JSON.stringify(copyBody),
              }, userToken, request);
              
              console.log('DEBUG: Copy response:', copyResponse.data);
              
              if (copyResponse.data) {
                console.log('DEBUG: Item copied successfully');
                
                // Step 2: Delete the original item
                const deleteEndpoint = `/drives/${moveDriveId}/items/${itemId}`;
                console.log('DEBUG: Deleting original item:', deleteEndpoint);
                
                try {
                  await makeSharePointRequest(deleteEndpoint, {
                    method: 'DELETE',
                  }, userToken, request);
                  
                  console.log('DEBUG: Original item deleted successfully');
                  
                  return NextResponse.json({ 
                    success: true, 
                    message: 'Item moved successfully using copy-and-delete method',
                    item: copyResponse.data 
                  });
                } catch (deleteError) {
                  console.error('DEBUG: Failed to delete original item:', deleteError);
                  // If delete fails, we still have the copy, so return success but warn
                  return NextResponse.json({ 
                    success: true, 
                    message: 'Item copied successfully, but failed to delete original. You may need to manually delete the original item.',
                    item: copyResponse.data,
                    warning: 'Original item not deleted'
                  });
                }
              } else {
                console.error('DEBUG: Failed to copy item - no response data');
                return NextResponse.json({ error: 'Failed to copy item - no response data' }, { status: 500 });
              }
            } catch (copyError) {
              console.error('DEBUG: Copy operation failed:', copyError);
              
              // Check if it's a 404 error (item not found)
              if (copyError instanceof Error && copyError.message.includes('404')) {
                return NextResponse.json({ 
                  error: 'Item not found', 
                  details: 'The item you are trying to move could not be found. It may have been deleted or moved by another user.'
                }, { status: 404 });
              }
              
              // Check if it's a 400 error (bad request)
              if (copyError instanceof Error && copyError.message.includes('400')) {
                return NextResponse.json({ 
                  error: 'Invalid copy request', 
                  details: 'The copy operation could not be completed. Please check the target location and try again.'
                }, { status: 400 });
              }
              
              // Generic error
              return NextResponse.json({ 
                error: 'Failed to copy item', 
                details: copyError instanceof Error ? copyError.message : 'Unknown error occurred during copy operation'
              }, { status: 500 });
            }
          }
        } catch (error) {
          console.error('DEBUG: Error in moveItem:', error);
          return NextResponse.json({ 
            error: 'Failed to move item', 
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      case 'copyItem':
        // Copy an item in a SharePoint drive
        if (!itemId) {
          return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }
        
        const copyDriveId = body.driveId;
        if (!copyDriveId) {
          return NextResponse.json({ error: 'Drive ID is required' }, { status: 400 });
        }
        
        const copyEndpoint = `/drives/${copyDriveId}/items/${itemId}/copy`;
        const copyBody = {
          parentReference: {
            path: folderPath 
              ? `/drives/${copyDriveId}/root:/${folderPath}`
              : `/drives/${copyDriveId}/root`,
          },
        };
        
        const copyResponse = await makeSharePointRequest(copyEndpoint, {
          method: 'POST',
          body: JSON.stringify(copyBody),
        }, userToken, request);
        
        return NextResponse.json(copyResponse);

      case 'renameItem':
        // Rename an item in a SharePoint drive
        if (!itemId) {
          return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }
        
        const renameDriveId = body.driveId;
        if (!renameDriveId) {
          return NextResponse.json({ error: 'Drive ID is required' }, { status: 400 });
        }
        
        const newName = body.newName;
        if (!newName) {
          return NextResponse.json({ error: 'New name is required' }, { status: 400 });
        }
        
        // Handle different drive types for rename
        let renameEndpoint: string;
        let renameBody: any;
        
                 if (renameDriveId.startsWith('virtual-')) {
           // Virtual drive (document library) - use PATCH to update fields
           const libraryId = renameDriveId.replace('virtual-', '');
           const siteId = body.siteId;
           if (!siteId) {
             return NextResponse.json({ error: 'Site ID is required for virtual drives' }, { status: 400 });
           }
          
          renameEndpoint = `/sites/${siteId}/lists/${libraryId}/items/${itemId}`;
          renameBody = {
            fields: {
              FileLeafRef: newName,
              Title: newName
            }
          };
        } else {
          // Regular SharePoint drive - use PATCH to update name
          renameEndpoint = `/drives/${renameDriveId}/items/${itemId}`;
          renameBody = {
            name: newName
          };
        }
        
        const renameResponse = await makeSharePointRequest(renameEndpoint, {
          method: 'PATCH',
          body: JSON.stringify(renameBody),
        }, userToken, request);
        
        return NextResponse.json(renameResponse);

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
    // Get user's access token from cookies
    const userToken = request.cookies.get('sharepoint_access_token')?.value;
    
    if (!userToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect to SharePoint first.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const driveId = searchParams.get('driveId');
    const siteId = searchParams.get('siteId');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    if (!driveId) {
      return NextResponse.json({ error: 'Drive ID is required' }, { status: 400 });
    }

    let deleteEndpoint: string;

         // Handle different drive types
     if (driveId.startsWith('virtual-')) {
       // Virtual drive (document library) - use list items endpoint
       const libraryId = driveId.replace('virtual-', '');
       deleteEndpoint = `/sites/${siteId}/lists/${libraryId}/items/${itemId}`;
       console.log('DEBUG: Deleting from document library:', deleteEndpoint);
    } else {
      // Regular SharePoint drive
      deleteEndpoint = `/drives/${driveId}/items/${itemId}`;
      console.log('DEBUG: Deleting from SharePoint drive:', deleteEndpoint);
    }
    
    const deleteResult = await makeSharePointRequest(deleteEndpoint, {
      method: 'DELETE',
    }, userToken, request);

    const response = NextResponse.json({ success: true });
    
    // If we have an updated response with new token, merge the cookies
    if (deleteResult.response) {
      deleteResult.response.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie);
      });
    }

    return response;
  } catch (error) {
    console.error('SharePoint API error:', error);
    return NextResponse.json({ 
      error: 'SharePoint API error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 