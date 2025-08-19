"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { HiFolder, HiDocument, HiDownload, HiEye, HiSearch, HiRefresh, HiArrowLeft } from 'react-icons/hi';
import { sharePointClient } from '@/lib/sharepoint';
import { SharePointItem } from '@/lib/sharepoint';

interface SharePointFileBrowserProps {
  onFileSelect: (file: SharePointItem, driveId: string) => void;
  selectedFile?: SharePointItem | null;
  fileTypes?: string[]; // e.g., ['.pdf', '.dwg', '.doc']
}

interface NavigationPath {
  name: string;
  path: string;
  driveId: string;
}

export default function SharePointFileBrowser({ 
  onFileSelect, 
  selectedFile,
  fileTypes = ['.pdf']
}: SharePointFileBrowserProps) {
  const [drives, setDrives] = useState<any[]>([]);
  const [currentDrive, setCurrentDrive] = useState<any>(null);
  const [items, setItems] = useState<SharePointItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [navigationPath, setNavigationPath] = useState<NavigationPath[]>([]);
  const [currentFolderPath, setCurrentFolderPath] = useState('');

  // Load available drives on mount
  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get the default site
      const siteResponse = await fetch('/api/sharepoint/documents?action=getDefaultSite');
      if (!siteResponse.ok) {
        throw new Error('Failed to get SharePoint site');
      }
      const siteData = await siteResponse.json();
      
      // Then get drives for that site
      const drivesResponse = await fetch(`/api/sharepoint/documents?action=getDrives&siteId=${siteData.id}`);
      if (!drivesResponse.ok) {
        throw new Error('Failed to load document libraries');
      }
      const drivesData = await drivesResponse.json();
      
      setDrives(drivesData.value || []);
      
      // Auto-select first drive and load its contents
      if (drivesData.value && drivesData.value.length > 0) {
        const firstDrive = drivesData.value[0];
        setCurrentDrive(firstDrive);
        await loadItems(firstDrive.id, '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drives');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (driveId: string, folderPath: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/sharepoint/documents?action=getItems&driveId=${driveId}&folderPath=${encodeURIComponent(folderPath)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      
      const data = await response.json();
      setItems(data.value || []);
      setCurrentFolderPath(folderPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDriveChange = (drive: any) => {
    setCurrentDrive(drive);
    setNavigationPath([]);
    setCurrentFolderPath('');
    loadItems(drive.id, '');
  };

  const handleFolderOpen = (folder: SharePointItem) => {
    if (!currentDrive) return;
    
    const newPath = currentFolderPath ? `${currentFolderPath}/${folder.name}` : folder.name;
    const newNavPath = [
      ...navigationPath,
      { name: folder.name, path: newPath, driveId: currentDrive.id }
    ];
    
    setNavigationPath(newNavPath);
    loadItems(currentDrive.id, newPath);
  };

  const handleNavigateBack = () => {
    if (!currentDrive) return;
    
    if (navigationPath.length === 0) {
      return; // Already at root
    }
    
    const newNavPath = navigationPath.slice(0, -1);
    const newPath = newNavPath.length > 0 ? newNavPath[newNavPath.length - 1].path : '';
    
    setNavigationPath(newNavPath);
    loadItems(currentDrive.id, newPath);
  };

  const handleNavigateToPath = (index: number) => {
    if (!currentDrive) return;
    
    if (index === -1) {
      // Navigate to root
      setNavigationPath([]);
      loadItems(currentDrive.id, '');
    } else {
      const newNavPath = navigationPath.slice(0, index + 1);
      const newPath = newNavPath[newNavPath.length - 1].path;
      
      setNavigationPath(newNavPath);
      loadItems(currentDrive.id, newPath);
    }
  };

  const isFileSupported = (item: SharePointItem) => {
    if (!item.file) return false;
    const extension = '.' + item.name.split('.').pop()?.toLowerCase();
    return fileTypes.some(type => type.toLowerCase() === extension);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isFolder = !!item.folder;
    const isSupportedFile = isFileSupported(item);
    
    return matchesSearch && (isFolder || isSupportedFile);
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-white border border-gray-300 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <HiFolder className="w-5 h-5 mr-2 text-blue-500" />
            SharePoint Documents
          </h3>
          <button
            onClick={loadDrives}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <HiRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Drive Selector */}
        {drives.length > 1 && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Library:
            </label>
            <select
              value={currentDrive?.id || ''}
              onChange={(e) => {
                const drive = drives.find(d => d.id === e.target.value);
                if (drive) handleDriveChange(drive);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {drives.map(drive => (
                <option key={drive.id} value={drive.id}>
                  {drive.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadDrives}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Refresh files and get fresh download URLs"
          >
            <HiRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Breadcrumb */}
      {(navigationPath.length > 0 || currentDrive) && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => handleNavigateToPath(-1)}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {currentDrive?.name}
            </button>
            {navigationPath.map((path, index) => (
              <React.Fragment key={index}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => handleNavigateToPath(index)}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {path.name}
                </button>
              </React.Fragment>
            ))}
            {navigationPath.length > 0 && (
              <button
                onClick={handleNavigateBack}
                className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded"
                title="Go back"
              >
                <HiArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading files...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={loadDrives}
              className="mt-2 px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No files match your search' : 'No supported files found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedFile?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => {
                  if (item.folder) {
                    handleFolderOpen(item);
                  } else if (isFileSupported(item)) {
                    onFileSelect(item, currentDrive?.id || '');
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {item.folder ? (
                      <HiFolder className="w-8 h-8 text-blue-500" />
                    ) : (
                      <HiDocument className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {item.size && (
                        <span>{formatFileSize(item.size)}</span>
                      )}
                      <span>{formatDate(item.lastModifiedDateTime)}</span>
                      {item.folder && item.folder.childCount !== undefined && (
                        <span>{item.folder.childCount} items</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {!item.folder && isFileSupported(item) && (
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileSelect(item, currentDrive?.id || '');
                          }}
                          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                          title="Open for editing"
                        >
                          <HiEye className="w-4 h-4" />
                        </button>
                        {item['@microsoft.graph.downloadUrl'] && (
                          <a
                            href={item['@microsoft.graph.downloadUrl']}
                            download={item.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Download"
                          >
                            <HiDownload className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          Showing {filteredItems.filter(item => !item.folder).length} files
          {fileTypes.length > 0 && (
            <span> • Supported: {fileTypes.join(', ')}</span>
          )}
        </p>
      </div>
    </div>
  );
}