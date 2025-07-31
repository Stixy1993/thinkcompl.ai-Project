'use client';

import React, { useState, useEffect } from 'react';
import { HiCheck, HiX, HiExclamationCircle, HiCog, HiRefresh } from 'react-icons/hi';

interface SharePointConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  siteId?: string;
  driveId?: string;
  siteUrl?: string;
  configSaved?: boolean;
  configSavedAt?: string;
}

interface ConfigStatus {
  status: string;
  statusMessage: string;
  isComplete: boolean;
  hasOptionalFields: boolean;
  missingFields: string[];
  authTest: { success: boolean; error: string | null };
  recommendations: {
    basic: string;
    optional: string;
    auth: string;
  };
}

export default function SharePointStatus() {
  const [config, setConfig] = useState<SharePointConfig | null>(null);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sharepoint/check-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setStatus(data);
      } else {
        setError(data.error || 'Failed to load configuration');
      }
    } catch (err) {
      setError('Failed to check SharePoint configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_configured':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'basic_configured':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'auth_failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'incomplete':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fully_configured':
        return <HiCheck className="w-5 h-5 text-green-500" />;
      case 'basic_configured':
        return <HiCog className="w-5 h-5 text-blue-500" />;
      case 'auth_failed':
        return <HiX className="w-5 h-5 text-red-500" />;
      case 'incomplete':
        return <HiExclamationCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <HiExclamationCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Checking SharePoint configuration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">SharePoint Status</h3>
          <button
            onClick={loadConfiguration}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <HiRefresh className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <HiX className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">SharePoint Status</h3>
        <button
          onClick={loadConfiguration}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          title="Refresh status"
        >
          <HiRefresh className="w-4 h-4" />
        </button>
      </div>

      {status && (
        <div className={`border rounded-lg p-4 ${getStatusColor(status.status)}`}>
          <div className="flex items-center mb-3">
            {getStatusIcon(status.status)}
            <span className="ml-2 font-medium">{status.statusMessage}</span>
          </div>

          {/* Configuration Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
            <div className="flex items-center">
              <span className="font-medium mr-2">Tenant ID:</span>
              {config?.tenantId ? (
                <HiCheck className="w-4 h-4 text-green-500" />
              ) : (
                <HiX className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">Client ID:</span>
              {config?.clientId ? (
                <HiCheck className="w-4 h-4 text-green-500" />
              ) : (
                <HiX className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">Site ID:</span>
              {config?.siteId ? (
                <HiCheck className="w-4 h-4 text-green-500" />
              ) : (
                <HiX className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">Drive ID:</span>
              {config?.driveId ? (
                <HiCheck className="w-4 h-4 text-green-500" />
              ) : (
                <HiX className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Basic Setup:</span> {status.recommendations.basic}
            </div>
            <div className="text-sm">
              <span className="font-medium">Authentication:</span> {status.recommendations.auth}
            </div>
            <div className="text-sm">
              <span className="font-medium">Optional Features:</span> {status.recommendations.optional}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex space-x-2">
            <a
              href="/setup-sharepoint"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              {status.status === 'not_configured' || status.status === 'incomplete' 
                ? 'Setup SharePoint' 
                : 'Configure SharePoint'
              }
            </a>
            {status.status === 'auth_failed' && (
              <button
                onClick={loadConfiguration}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Retry Test
              </button>
            )}
          </div>

          {/* Last Updated */}
          {config?.configSavedAt && (
            <div className="mt-3 text-xs text-gray-500">
              Last updated: {new Date(config.configSavedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 