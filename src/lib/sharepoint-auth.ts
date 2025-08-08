import { cookies } from 'next/headers';

export interface SharePointTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class SharePointAuth {
  private static async getTokensFromCookies(): Promise<SharePointTokens | null> {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sharepoint_access_token')?.value;
    const refreshToken = cookieStore.get('sharepoint_refresh_token')?.value;
    
    if (!accessToken) return null;
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // Default
      token_type: 'Bearer'
    };
  }

  static async getValidAccessToken(): Promise<string | null> {
    try {
      const tokens = await this.getTokensFromCookies();
      if (!tokens) return null;

      // For now, assume token is valid (in production, check expiration)
      return tokens.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  static async refreshTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokensFromCookies();
      if (!tokens?.refresh_token) return false;

      const tenantId = process.env.SHAREPOINT_TENANT_ID;
      const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.SHAREPOINT_CLIENT_ID!,
          client_secret: process.env.SHAREPOINT_CLIENT_SECRET!,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', await response.text());
        return false;
      }

      const newTokens = await response.json();
      
      // Update cookies with new tokens
      const cookieStore = await cookies();
      cookieStore.set('sharepoint_access_token', newTokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: newTokens.expires_in || 3600
      });

      if (newTokens.refresh_token) {
        cookieStore.set('sharepoint_refresh_token', newTokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });
      }

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  static async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = await this.getValidAccessToken();
    
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        const newAccessToken = await this.getValidAccessToken();
        if (newAccessToken) {
          return fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
            ...options,
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });
        }
      }
    }

    return response;
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    return !!token;
  }

  static async logout(): Promise<void> {
    try {
      const cookieStore = await cookies();
      cookieStore.delete('sharepoint_access_token');
      cookieStore.delete('sharepoint_refresh_token');
      cookieStore.delete('oauth_state');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
} 