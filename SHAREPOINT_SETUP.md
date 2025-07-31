# SharePoint API Integration Setup

## Overview
This project now includes real SharePoint API integration, allowing you to work with actual SharePoint document libraries instead of simulating the interface.

## Setup Steps

### 1. Azure App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Name: `ComplAI SharePoint Integration`
5. Supported account types: `Accounts in this organizational directory only`
6. Redirect URI: `Web` > `http://localhost:3000`

### 2. Configure API Permissions
1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions**
5. Add these permissions:
   - `Sites.Read.All`
   - `Sites.ReadWrite.All`
   - `Files.Read.All`
   - `Files.ReadWrite.All`
6. Click **Grant admin consent**

### 3. Create Client Secret
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `SharePoint Integration`
4. Copy the secret value (you won't see it again)

### 4. Get Tenant ID
1. Go to **Azure Active Directory** > **Overview**
2. Copy the **Tenant ID**

### 5. Environment Variables
Create a `.env.local` file in your project root:

```env
# SharePoint API Configuration
SHAREPOINT_SITE_URL=https://your-tenant.sharepoint.com/sites/your-site
SHAREPOINT_CLIENT_ID=your-client-id-here
SHAREPOINT_CLIENT_SECRET=your-client-secret-here
SHAREPOINT_TENANT_ID=your-tenant-id-here

# Optional: Default site and drive IDs
SHAREPOINT_DEFAULT_SITE_ID=your-default-site-id
SHAREPOINT_DEFAULT_DRIVE_ID=your-default-drive-id
```

### 6. Get Site and Drive IDs
1. Use Microsoft Graph Explorer to find your site ID:
   ```
   GET https://graph.microsoft.com/v1.0/sites/your-tenant.sharepoint.com:/sites/your-site
   ```

2. Get drive ID:
   ```
   GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
   ```

## Features

### Real SharePoint Integration
- ✅ **Authentic SharePoint API** - Uses Microsoft Graph API
- ✅ **Real document libraries** - Connect to actual SharePoint sites
- ✅ **File operations** - Upload, download, move, delete
- ✅ **Folder operations** - Create, navigate, manage
- ✅ **Permissions** - Respects SharePoint permissions

### API Endpoints
- `GET /api/sharepoint?action=getDrives` - Get document libraries
- `GET /api/sharepoint?action=getItems` - Get files/folders
- `POST /api/sharepoint` - Upload files, create folders, move items
- `DELETE /api/sharepoint` - Delete items

### Client Library
- `sharePointClient.getSites()` - Get all sites
- `sharePointClient.getDrives(siteId)` - Get document libraries
- `sharePointClient.getItems(driveId, folderPath)` - Get folder contents
- `sharePointClient.uploadFile()` - Upload files
- `sharePointClient.createFolder()` - Create folders
- `sharePointClient.moveItem()` - Move items
- `sharePointClient.deleteItem()` - Delete items

## Benefits

### Real SharePoint Experience
- **Actual SharePoint data** - No more simulation
- **Real permissions** - Respects SharePoint security
- **Real collaboration** - Multiple users can work together
- **Real versioning** - SharePoint's built-in version control
- **Real search** - SharePoint's powerful search capabilities

### Enterprise Features
- **Audit trails** - Track who accessed what
- **Compliance** - Meet regulatory requirements
- **Integration** - Works with existing SharePoint workflows
- **Scalability** - Handles enterprise-scale data

## Migration from Firebase
To switch from Firebase to SharePoint:

1. **Update environment variables** with SharePoint credentials
2. **Replace Firebase calls** with SharePoint API calls
3. **Update UI components** to use SharePoint data structure
4. **Test permissions** and access controls

The SharePoint integration provides a **genuine enterprise file management experience** with all the benefits of Microsoft's platform! 