# SharePoint Setup Guide for ThinkComplAI

This guide will walk you through connecting ThinkComplAI to your SharePoint in just a few simple steps.

## 🚀 Quick Start (5 minutes)

### Option 1: Guided Setup Wizard (Recommended)
1. **Go to Setup**: Visit `/setup-microsoft` in your ThinkComplAI app
2. **Follow the Wizard**: Complete the 5-step guided setup
3. **Test Connection**: Verify everything works
4. **Start Using**: Your documents are now stored in SharePoint!

### Option 2: Manual Setup
If you prefer to set up manually, follow the steps below.

## 📋 Prerequisites

- A Microsoft 365 account with SharePoint access
- Admin access to your organization's Azure Active Directory (or ability to request app registration)

## 🔧 Step-by-Step Setup

### Step 1: Create Azure App Registration

1. **Go to Azure Portal**: Visit [portal.azure.com](https://portal.azure.com)
2. **Navigate to**: Azure Active Directory → App registrations
3. **Create New App**:
   - Click "New registration"
   - Name: `ThinkComplAI SharePoint Integration`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `Web` → `http://localhost:3000`
   - Click "Register"

### Step 2: Configure Permissions

1. **In your app registration**, go to "API permissions"
2. **Add permissions**:
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Choose "Application permissions"
   - Add these permissions:
     - `Sites.Read.All`
     - `Sites.ReadWrite.All`
     - `Files.Read.All`
     - `Files.ReadWrite.All`
3. **Grant admin consent**: Click "Grant admin consent"

### Step 3: Get Your Credentials

1. **Get Client ID**:
   - Go to "Overview" in your app registration
   - Copy the "Application (client) ID"

2. **Get Client Secret**:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Add description: `ThinkComplAI Integration`
   - Copy the secret value (you won't see it again)

3. **Get Tenant ID**:
   - Go to Azure Active Directory → Overview
   - Copy the "Tenant ID"

### Step 4: Find Your SharePoint Site

#### Option A: Auto-Discovery (Easiest)
1. **Get your SharePoint site URL**: It looks like `https://your-company.sharepoint.com/sites/your-site`
2. **Use the setup wizard**: Enter the URL and let ThinkComplAI find the IDs automatically

#### Option B: Manual Discovery
1. **Go to Microsoft Graph Explorer**: [developer.microsoft.com/en-us/graph/graph-explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. **Get site ID**:
   ```
   GET https://graph.microsoft.com/v1.0/sites/your-company.sharepoint.com:/sites/your-site
   ```
3. **Get drive ID**:
   ```
   GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
   ```

### Step 5: Configure ThinkComplAI

1. **Add environment variables** to your `.env.local` file:
   ```env
   SHAREPOINT_TENANT_ID=your-tenant-id
   SHAREPOINT_CLIENT_ID=your-client-id
   SHAREPOINT_CLIENT_SECRET=your-client-secret
   SHAREPOINT_DEFAULT_SITE_ID=your-site-id
   SHAREPOINT_DEFAULT_DRIVE_ID=your-drive-id
   ```

2. **Restart your development server**

3. **Test the connection**: Visit `/setup-microsoft` and click "Test Connection"

## ✅ Verification

### Check Connection Status
- Look for the SharePoint status indicator in your dashboard
- Green = Connected ✅
- Yellow = Not configured ⚠️
- Red = Connection failed ❌

### Test File Operations
1. **Upload a file** to your documents
2. **Check SharePoint**: Verify the file appears in your SharePoint site
3. **Download the file**: Ensure it works correctly

## 🔧 Troubleshooting

### Common Issues

#### "Authentication failed"
- ✅ Check your client ID and secret are correct
- ✅ Verify admin consent was granted
- ✅ Ensure your app registration is active

#### "Site not found"
- ✅ Verify the site URL format is correct
- ✅ Check you have access to the SharePoint site
- ✅ Try using the site ID instead of URL

#### "Permission denied"
- ✅ Ensure all required permissions are added
- ✅ Check admin consent was granted
- ✅ Verify your account has access to the site

#### "Connection timeout"
- ✅ Check your internet connection
- ✅ Verify SharePoint is accessible
- ✅ Try again in a few minutes

### Getting Help

1. **Check the logs**: Look at your browser's developer console for error messages
2. **Verify configuration**: Use the setup wizard to test your settings
3. **Contact support**: If issues persist, contact your system administrator

## 🔄 Migration from Firebase

If you're currently using Firebase for file storage:

1. **Backup your data**: Export important files from Firebase
2. **Set up SharePoint**: Follow the setup guide above
3. **Migrate files**: Use the migration tool in `/setup-microsoft`
4. **Update components**: Switch from Firebase to SharePoint APIs
5. **Test thoroughly**: Ensure all functionality works with SharePoint

## 🚀 Advanced Configuration

### Custom Site Configuration
```env
# Multiple SharePoint sites
SHAREPOINT_SITE_1_ID=site-id-1
SHAREPOINT_SITE_1_DRIVE_ID=drive-id-1
SHAREPOINT_SITE_2_ID=site-id-2
SHAREPOINT_SITE_2_DRIVE_ID=drive-id-2
```

### Performance Optimization
- Enable caching for better performance
- Use chunked uploads for large files
- Implement retry logic for reliability

### Security Best Practices
- Rotate client secrets regularly
- Use least-privilege permissions
- Monitor access logs
- Enable audit logging

## 📞 Support

### Need Help?
- **Setup Issues**: Use the guided wizard at `/setup-microsoft`
- **Technical Problems**: Check the troubleshooting section above
- **Enterprise Support**: Contact your IT administrator

### Resources
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [SharePoint REST API](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
- [Azure App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

---

**🎉 Congratulations!** You've successfully connected ThinkComplAI to SharePoint. Your documents are now stored securely with enterprise-grade features like version control, real-time collaboration, and advanced security. 