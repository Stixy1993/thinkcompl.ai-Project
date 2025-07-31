# Azure App Registration Setup Guide

## Problem
You're getting a "401 Unauthorized" error when trying to discover SharePoint sites. This is because the Azure app registration is not properly configured or the environment variables are missing.

## Solution

### Step 1: Create Environment Variables File

Create a `.env.local` file in your project root with the following content:

```env
# SharePoint/Azure Configuration
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here
SHAREPOINT_SITE_URL=https://yourcompany.sharepoint.com/sites/yoursite
```

### Step 2: Azure App Registration Setup

#### 2.1 Create the App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "App registrations" in the search bar
3. Click "New registration"
4. Fill in the details:
   - **Name**: `thinkcompl.ai Integration`
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: Web → `https://thinkcompl.ai`
5. Click "Register"

#### 2.2 Configure API Permissions

1. In your app registration, go to "API permissions" in the left menu
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. **For App-Only Access (Current Setup):**
   - Choose "Application permissions"
   - Add these permissions:
     - `Sites.Read.All`
     - `Sites.ReadWrite.All`
     - `Files.Read.All`
     - `Files.ReadWrite.All`
   - Click "Add permissions"
   - **IMPORTANT**: Click "Grant admin consent for [Your Organization]"

5. **For User Delegation (To Show Your Name):**
   - Choose "Delegated permissions"
   - Add these permissions:
     - `Sites.Read.All`
     - `Sites.ReadWrite.All`
     - `Files.Read.All`
     - `Files.ReadWrite.All`
   - Click "Add permissions"
   - **IMPORTANT**: Click "Grant admin consent for [Your Organization]"

#### 2.3 Create Client Secret

1. Go to "Certificates & secrets" in the left menu
2. Click "New client secret"
3. Add description: "thinkcompl.ai integration"
4. Choose expiration (12-24 months recommended)
5. Click "Add"
6. **IMPORTANT**: Copy the secret value immediately (you won't see it again)

#### 2.4 Get Required Values

1. **Application (client) ID**: Found in Overview → "Application (client) ID"
2. **Directory (tenant) ID**: Found in Overview → "Directory (tenant) ID"
3. **Client Secret Value**: The value you copied in step 2.3

### Step 3: Update Environment Variables

Replace the placeholder values in your `.env.local` file:

```env
SHAREPOINT_CLIENT_ID=your_actual_client_id_from_azure
SHAREPOINT_CLIENT_SECRET=your_actual_client_secret_value
SHAREPOINT_TENANT_ID=your_actual_tenant_id_from_azure
```

### Step 4: Restart Your Development Server

```bash
npm run dev
```

### Step 5: Test the Configuration

1. Go to your SharePoint setup page
2. Enter your SharePoint site URL
3. Click "Discover Site & Drive"
4. The system should now successfully discover your site and drive

## Troubleshooting

### Common Issues

#### 1. "401 Unauthorized" Error
- **Cause**: Missing or incorrect environment variables
- **Solution**: Ensure all three environment variables are set correctly

#### 2. "AADSTS53003" Error (Conditional Access)
- **Cause**: Conditional Access policies are blocking the app
- **Solution**: Contact your Azure admin to either:
  - Exclude this app from Conditional Access policies
  - Grant necessary permissions for SharePoint access

#### 3. "Insufficient privileges" Error
- **Cause**: Admin consent not granted
- **Solution**: Ensure you clicked "Grant admin consent" in step 2.2

#### 4. "Site not found" Error
- **Cause**: Incorrect SharePoint site URL
- **Solution**: Verify the site URL format: `https://tenant.sharepoint.com/sites/sitename`

### Debugging

If you're still having issues, check the browser console and server logs for detailed error messages. The improved error handling will now show exactly which environment variables are missing.

## Security Notes

- Never commit your `.env.local` file to version control
- The client secret should be kept secure and rotated regularly
- Consider using Azure Key Vault for production environments

## Next Steps

Once the Azure app registration is working, you can:
1. Test the SharePoint connection
2. Save the configuration
3. Start using SharePoint integration features 