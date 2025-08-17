# Azure App Registration Setup Guide

## Overview
This guide will help you set up Azure App Registration for SharePoint integration using **OAuth2 interactive authentication** - the enterprise-standard approach that works with Conditional Access policies.

## Step 1: Create Azure App Registration

1. **Go to Azure Portal** → Azure Active Directory → App registrations
2. **Click "New registration"**
3. **Fill in the details:**
   - Name: `ThinkComplAI SharePoint Integration`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `Web` → `http://localhost:3000/api/sharepoint/auth/callback` (for development)

## Step 2: Configure Authentication

1. **Go to Authentication** in your app registration
2. **Add platform** → Web
3. **Add redirect URIs:**
   - Development: `http://localhost:3000/api/sharepoint/auth/callback`
   - Production: `https://yourdomain.com/api/sharepoint/auth/callback`
4. **Save**

## Step 3: Configure API Permissions

1. **Go to API permissions**
2. **Add permissions** → Microsoft Graph
3. **Select these permissions:**
   - `Sites.Read.All` (Read all site collections)
   - `Files.ReadWrite.All` (Read and write all files)
   - `User.Read` (Read user profile)
4. **Click "Add permissions"**
5. **Grant admin consent** for your organization

## Step 4: Create Client Secret

1. **Go to Certificates & secrets**
2. **Click "New client secret"**
3. **Add description:** `SharePoint Integration Secret`
4. **Set expiration:** 24 months (recommended)
5. **Copy the secret value** (you won't see it again)

## Step 5: Update Environment Variables

Create a `.env.local` file in your project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_key

# SharePoint Configuration (OAuth2)
SHAREPOINT_CLIENT_ID=your_app_registration_client_id
SHAREPOINT_CLIENT_SECRET=your_client_secret
SHAREPOINT_TENANT_ID=your_tenant_id
```

## Step 6: Test the Integration

1. **Start your development server:** `npm run dev`
2. **Visit:** `http://localhost:3000/setup-microsoft`
3. **Click "Connect to SharePoint"**
4. **Sign in with your Microsoft account**
5. **Grant permissions** when prompted
6. **Test site discovery**

## Enterprise Security Features

### ✅ **What makes this enterprise-ready:**

1. **OAuth2 Interactive Authentication** - Users authenticate with their own credentials
2. **Conditional Access Compatible** - Works with existing security policies
3. **Secure Token Storage** - Tokens stored in httpOnly cookies
4. **Automatic Token Refresh** - Handles token expiration seamlessly
5. **Proper Error Handling** - Clear error messages for troubleshooting
6. **Audit Trail** - All authentication attempts are logged

### 🔒 **Security Benefits:**

- **No service account credentials** stored in your app
- **Users authenticate directly** with Microsoft
- **Respects Conditional Access policies**
- **Tokens automatically refresh**
- **Secure cookie storage**
- **Proper logout functionality**

## Troubleshooting

### Common Issues:

1. **"Access has been blocked by Conditional Access policies"**
   - ✅ **This is expected!** The new OAuth2 flow will work with Conditional Access
   - Users will authenticate interactively instead of using service accounts

2. **"Invalid redirect URI"**
   - Check that your redirect URI matches exactly in Azure App Registration
   - Ensure the URI is added to the allowed redirect URIs

3. **"Insufficient permissions"**
   - Ensure admin consent is granted for the API permissions
   - Check that the app has the required Microsoft Graph permissions

4. **"Token expired"**
   - The system automatically handles token refresh
   - If issues persist, users can re-authenticate

## Production Deployment

### For production, update these URLs:

1. **Azure App Registration:**
   - Add production redirect URI: `https://yourdomain.com/api/sharepoint/auth/callback`

2. **Environment Variables:**
   - Update `NODE_ENV=production`
   - Ensure all production URLs are HTTPS

3. **Security Headers:**
   - Ensure your hosting platform supports secure cookies
   - Configure proper CORS if needed

## Support

This setup provides a **production-ready, enterprise-grade SharePoint integration** that:
- ✅ Works with Conditional Access policies
- ✅ Provides secure user authentication
- ✅ Handles token management automatically
- ✅ Is compliant with enterprise security requirements
- ✅ Scales for large organizations 