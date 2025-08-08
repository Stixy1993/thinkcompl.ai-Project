'use client';

import { useState } from 'react';
import Button from '@/components/Button';

interface SharePointAuthButtonProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
  children?: React.ReactNode;
}

export default function SharePointAuthButton({ 
  onAuthSuccess, 
  onAuthError, 
  children = "Connect to SharePoint" 
}: SharePointAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      // Get the authentication URL
      const response = await fetch('/api/sharepoint/auth');
      const data = await response.json();
      
      if (data.success) {
        // Redirect to Microsoft OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Failed to start authentication');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      onAuthError?.(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleAuth} 
      disabled={isLoading}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isLoading ? 'Connecting...' : children}
    </Button>
  );
} 