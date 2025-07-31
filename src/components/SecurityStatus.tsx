'use client';

import React, { useState, useEffect } from 'react';

interface SecurityStatusProps {
  className?: string;
}

interface SecurityCheck {
  name: string;
  status: 'secure' | 'warning' | 'error';
  description: string;
  recommendation?: string;
}

export default function SecurityStatus({ className = '' }: SecurityStatusProps) {
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    performSecurityChecks();
  }, []);

  const performSecurityChecks = async () => {
    const checks: SecurityCheck[] = [];

    try {
      // Check if SharePoint is configured
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (configData.configured) {
        checks.push({
          name: 'SharePoint Configuration',
          status: 'secure',
          description: 'SharePoint is properly configured with required credentials'
        });

        // Check connection security
        const connectionResponse = await fetch('/api/sharepoint/test-connection');
        const connectionData = await connectionResponse.json();
        
        if (connectionData.connected) {
          checks.push({
            name: 'Connection Security',
            status: 'secure',
            description: 'SharePoint connection is using HTTPS and secure authentication'
          });
        } else {
          checks.push({
            name: 'Connection Security',
            status: 'error',
            description: 'SharePoint connection failed - check credentials and permissions',
            recommendation: 'Verify your Azure app registration and permissions'
          });
        }

        // Check for environment variables
        if (configData.hasOptionalVars?.siteId && configData.hasOptionalVars?.driveId) {
          checks.push({
            name: 'Site Configuration',
            status: 'secure',
            description: 'SharePoint site and drive are properly configured'
          });
        } else {
          checks.push({
            name: 'Site Configuration',
            status: 'warning',
            description: 'SharePoint site and drive IDs are not configured',
            recommendation: 'Configure default site and drive IDs for better performance'
          });
        }

      } else {
        checks.push({
          name: 'SharePoint Configuration',
          status: 'error',
          description: 'SharePoint is not configured',
          recommendation: 'Set up SharePoint integration using the setup wizard'
        });
      }

      // Check for HTTPS
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        checks.push({
          name: 'HTTPS Connection',
          status: 'secure',
          description: 'Application is running over secure HTTPS connection'
        });
      } else {
        checks.push({
          name: 'HTTPS Connection',
          status: 'warning',
          description: 'Application is not running over HTTPS',
          recommendation: 'Use HTTPS in production for secure data transmission'
        });
      }

    } catch (error) {
      checks.push({
        name: 'Security Check',
        status: 'error',
        description: 'Unable to perform security checks',
        recommendation: 'Check your network connection and try again'
      });
    }

    setSecurityChecks(checks);
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure':
        return (
          <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-gray-800';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'secure':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Checking security status...</span>
        </div>
      </div>
    );
  }

  const secureCount = securityChecks.filter(check => check.status === 'secure').length;
  const warningCount = securityChecks.filter(check => check.status === 'warning').length;
  const errorCount = securityChecks.filter(check => check.status === 'error').length;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Security Status</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Security Score:</span>
          <div className="flex items-center space-x-1">
            <span className="text-green-600 font-semibold">{secureCount}</span>
            <span className="text-yellow-600 font-semibold">{warningCount}</span>
            <span className="text-red-600 font-semibold">{errorCount}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {securityChecks.map((check, index) => (
          <div key={index} className={`border rounded-lg p-3 ${getStatusBgColor(check.status)}`}>
            <div className="flex items-start space-x-3">
              {getStatusIcon(check.status)}
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${getStatusColor(check.status)}`}>
                  {check.name}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {check.description}
                </p>
                {check.recommendation && (
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>Recommendation:</strong> {check.recommendation}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {errorCount === 0 && warningCount === 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800">
              All security checks passed! Your SharePoint integration is secure.
            </span>
          </div>
        </div>
      )}

      {errorCount > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-800">
              {errorCount} security issue{errorCount > 1 ? 's' : ''} detected. Please address them.
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 