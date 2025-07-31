"use client";

import { useState, useEffect } from "react";
import { HiCheck, HiX } from "react-icons/hi";

export default function UpdateSharePointConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedDrive, setSelectedDrive] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check current configuration
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      setConfig(configData);

      if (!configData.success || configData.status !== 'fully_configured') {
        setError(`SharePoint not configured: ${configData.statusMessage}`);
        return;
      }

      // Get all sites
      const sitesResponse = await fetch('/api/sharepoint?action=getSites');
      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json();
        setSites(sitesData.value || []);
        
        // Pre-select the thinkcompl.ai site
        const thinkComplSite = sitesData.value?.find((site: any) => 
          site.displayName === 'thinkcompl.ai' || 
          site.name === 'thinkcompl.ai' ||
          site.webUrl?.includes('thinkcompl.ai')
        );
        if (thinkComplSite) {
          setSelectedSite(thinkComplSite.id);
          await loadDrivesForSite(thinkComplSite.id);
        }
      } else {
        const errorData = await sitesResponse.json();
        setError(`Failed to load sites: ${errorData.error}`);
      }

    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivesForSite = async (siteId: string) => {
    try {
      const drivesResponse = await fetch(`/api/sharepoint?action=getDrives&siteId=${siteId}`);
      if (drivesResponse.ok) {
        const drivesData = await drivesResponse.json();
        setDrives(drivesData.value || []);
        
        // Pre-select the Documents drive
        const documentsDrive = drivesData.value?.find((drive: any) => 
          drive.name === 'Documents' || 
          drive.name === 'Shared Documents' ||
          drive.driveType === 'documentLibrary'
        );
        if (documentsDrive) {
          setSelectedDrive(documentsDrive.id);
        }
      } else {
        const errorData = await drivesResponse.json();
        console.error('Failed to load drives:', errorData);
      }
    } catch (error) {
      console.error('Error loading drives:', error);
    }
  };

  const handleSiteChange = async (siteId: string) => {
    setSelectedSite(siteId);
    setSelectedDrive("");
    if (siteId) {
      await loadDrivesForSite(siteId);
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedSite || !selectedDrive) {
      setError('Please select both a site and a drive');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const selectedSiteData = sites.find(site => site.id === selectedSite);
      const selectedDriveData = drives.find(drive => drive.id === selectedDrive);

      const newConfig = {
        tenantId: config.config.tenantId,
        clientId: config.config.clientId,
        clientSecret: config.config.clientSecret,
        siteId: selectedSite,
        driveId: selectedDrive,
        siteUrl: selectedSiteData?.webUrl || config.config.siteUrl
      };

      const response = await fetch('/api/sharepoint/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess('Configuration updated successfully! Your SharePoint files should now load.');
        setTimeout(() => {
          window.location.href = '/dashboard/documents';
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(`Failed to update configuration: ${errorData.error}`);
      }
    } catch (err) {
      setError(`Error updating configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SharePoint configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Update SharePoint Configuration</h1>
        
        {/* Current Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          {config ? (
            <div className="space-y-2 text-sm">
              <div>Status: <span className={`px-2 py-1 rounded text-xs ${
                config.status === 'fully_configured' ? 'bg-green-100 text-green-800' :
                config.status === 'basic_configured' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>{config.status}</span></div>
              <div>Current Site ID: {config.config.siteId || 'Not set'}</div>
              <div>Current Drive ID: {config.config.driveId || 'Not set'}</div>
              <div>Site URL: {config.config.siteUrl || 'Not set'}</div>
            </div>
          ) : (
            <p className="text-red-600">Failed to load configuration</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h3 className="text-green-800 font-semibold mb-2">Success</h3>
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Site Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Select SharePoint Site</h2>
          <div className="space-y-2">
            {sites.map((site, index) => (
              <label key={site.id || index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="site"
                  value={site.id}
                  checked={selectedSite === site.id}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{site.displayName || site.name}</div>
                  <div className="text-sm text-gray-500">{site.webUrl}</div>
                </div>
                {selectedSite === site.id && <HiCheck className="w-5 h-5 text-green-500" />}
              </label>
            ))}
          </div>
        </div>

        {/* Drive Selection */}
        {selectedSite && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Select Document Library</h2>
            {drives.length > 0 ? (
              <div className="space-y-2">
                {drives.map((drive, index) => (
                  <label key={drive.id || index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="drive"
                      value={drive.id}
                      checked={selectedDrive === drive.id}
                      onChange={(e) => setSelectedDrive(e.target.value)}
                      className="text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{drive.name}</div>
                      <div className="text-sm text-gray-500">Type: {drive.driveType}</div>
                    </div>
                    {selectedDrive === drive.id && <HiCheck className="w-5 h-5 text-green-500" />}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No document libraries found for this site.</p>
            )}
          </div>
        )}

        {/* Update Button */}
        {selectedSite && selectedDrive && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Update Configuration</h2>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p><strong>Selected Site:</strong> {sites.find(s => s.id === selectedSite)?.displayName}</p>
                <p><strong>Selected Drive:</strong> {drives.find(d => d.id === selectedDrive)?.name}</p>
              </div>
              <button
                onClick={handleUpdateConfig}
                disabled={updating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <HiCheck className="w-4 h-4" />
                    Update Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        {config?.status !== 'fully_configured' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-blue-800 font-semibold mb-2">Setup Required</h3>
            <p className="text-blue-700 mb-4">
              To update SharePoint configuration, you need to configure SharePoint first:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>Go to the dashboard</li>
              <li>Click "Setup SharePoint"</li>
              <li>Enter your Azure App Registration details</li>
              <li>Test the connection</li>
              <li>Save the configuration</li>
            </ol>
            <a 
              href="/dashboard"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 