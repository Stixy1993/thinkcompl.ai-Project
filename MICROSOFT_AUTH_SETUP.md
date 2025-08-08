# Microsoft/Outlook Authentication Setup Guide

This guide explains how to configure Microsoft/Outlook authentication in your Firebase project.

## What's Been Implemented

✅ **Microsoft Authentication Components**
- Added `signInWithOutlook` method to AuthContext
- Created `SignInWithOutlook` component with Microsoft branding
- Integrated Outlook sign-in button into the sign-in page
- Added Microsoft provider utilities in firebaseUtils

✅ **Features Added**
- Microsoft OAuth provider configuration with proper scopes
- Outlook/Microsoft branded sign-in button with Microsoft logo
- Error handling for Microsoft authentication
- Consistent UI with existing Google authentication

## Firebase Console Configuration Required

To enable Microsoft authentication, you need to configure it in your Firebase project:

### 1. Enable Microsoft Provider in Firebase Console

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** > **Sign-in method**
4. Click on **Microsoft** in the list of providers
5. Toggle **Enable**

### 2. Configure Microsoft Azure Application (Optional for Basic Setup)

For basic functionality, Firebase can use its default Microsoft configuration. However, for production or custom configuration:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Create a new application registration
4. Note the **Application (client) ID**
5. Configure redirect URIs (Firebase will provide these)
6. Add the client ID to Firebase console

### 3. Configure Authorized Domains

Ensure your domain is listed in:
- Firebase Console > Authentication > Settings > Authorized domains

## How to Use

The Microsoft/Outlook sign-in functionality is now available on your sign-in page at `/signin`. Users will see both Google and Microsoft/Outlook sign-in options.

### Component Usage

```tsx
import SignInWithOutlook from '../components/SignInWithOutlook';

// Use in your component
<SignInWithOutlook />
```

### Context Usage

```tsx
import { useAuth } from '../lib/hooks/useAuth';

function MyComponent() {
  const { signInWithOutlook } = useAuth();
  
  const handleMicrosoftSignIn = () => {
    signInWithOutlook();
  };
}
```

## Scopes Configured

The Microsoft provider is configured with these scopes:
- `openid` - Basic authentication
- `email` - User's email address
- `profile` - User's profile information

## Troubleshooting

### Common Issues

1. **"Provider not enabled"** - Enable Microsoft provider in Firebase Console
2. **"Unauthorized domain"** - Add your domain to authorized domains in Firebase
3. **"Invalid client"** - Check Azure app registration configuration

### Development vs Production

- **Development**: Firebase's default Microsoft configuration should work
- **Production**: Consider setting up your own Azure app registration for better control

## Security Considerations

- Microsoft authentication uses OAuth 2.0 with PKCE for security
- User data is handled according to Firebase's security rules
- Ensure your Firebase security rules are properly configured

## Files Modified/Created

- `src/lib/contexts/AuthContext.tsx` - Added Microsoft auth method
- `src/components/SignInWithOutlook.tsx` - New component for Microsoft sign-in
- `src/app/signin/page.tsx` - Updated to include Microsoft sign-in button
- `src/lib/firebase/firebaseUtils.ts` - Added Microsoft provider utilities

