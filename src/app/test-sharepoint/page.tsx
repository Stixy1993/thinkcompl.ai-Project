'use client';

import React, { useState, useEffect } from 'react';
import { useSharePoint } from '../../lib/contexts/SharePointContext';

export default function TestSharePointPage() {
  const { 
    sites, 
    drives, 
    items, 
    currentPath,
    loading, 
    error,
    loadSites, 
    loadDrives, 
    loadItems,
    moveItem,
    createFolder,
    deleteItem,
    clearError
  } = useSharePoint();

  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedDrive, setSelectedDrive] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [targetFolder, setTargetFolder] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testSharePointConnection = async () => {
    setTestResults([]);
    addTestResult('Starting SharePoint connection test...');

    try {
      // Test 1: Load sites
      addTestResult('Testing site loading...');
      await loadSites();
      addTestResult(`✅ Sites loaded: ${sites.length} sites found`);

      if (sites.length > 0) {
        const firstSite = sites[0];
        setSelectedSite(firstSite.id);
        addTestResult(`Selected site: ${firstSite.displayName}`);

        // Test 2: Load drives
        addTestResult('Testing drive loading...');
        await loadDrives(firstSite.id);
        addTestResult(`✅ Drives loaded: ${drives.length} drives found`);

        if (drives.length > 0) {
          const firstDrive = drives[0];
          setSelectedDrive(firstDrive.id);
          addTestResult(`Selected drive: ${firstDrive.name}`);

          // Test 3: Load items
          addTestResult('Testing item loading...');
          await loadItems(firstDrive.id);
          addTestResult(`✅ Items loaded: ${items.length} items found`);

          if (items.length > 0) {
            const firstItem = items[0];
            setSelectedItem(firstItem.id);
            addTestResult(`Selected item: ${firstItem.name}`);
          }
        }
      }

      addTestResult('✅ All tests completed successfully!');
    } catch (err) {
      addTestResult(`❌ Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testMoveOperation = async () => {
    if (!selectedItem || !targetFolder) {
      addTestResult('❌ Please select an item and enter a target folder');
      return;
    }

    try {
      addTestResult(`Testing move operation: ${selectedItem} to ${targetFolder}`);
      await moveItem(selectedItem, targetFolder);
      addTestResult('✅ Move operation completed successfully!');
      
      // Refresh items to see the change
      await loadItems(selectedDrive, currentPath.join('/'));
      addTestResult('✅ Items refreshed after move');
    } catch (err) {
      addTestResult(`❌ Move operation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testCreateFolder = async () => {
    if (!newFolderName) {
      addTestResult('❌ Please enter a folder name');
      return;
    }

    try {
      addTestResult(`Testing folder creation: ${newFolderName}`);
      await createFolder(newFolderName, currentPath.join('/'));
      addTestResult('✅ Folder created successfully!');
      setNewFolderName('');
    } catch (err) {
      addTestResult(`❌ Folder creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testDeleteItem = async () => {
    if (!selectedItem) {
      addTestResult('❌ Please select an item to delete');
      return;
    }

    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      addTestResult(`Testing item deletion: ${selectedItem}`);
      await deleteItem(selectedItem);
      addTestResult('✅ Item deleted successfully!');
      setSelectedItem('');
    } catch (err) {
      addTestResult(`❌ Item deletion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">SharePoint API Test Page</h1>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex justify-between items-center">
              <span>Error: {error}</span>
              <button 
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Connection Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
          <button
            onClick={testSharePointConnection}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test SharePoint Connection'}
          </button>
        </div>

        {/* Current State */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Sites ({sites.length})</h3>
            <select 
              value={selectedSite} 
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Select a site</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Drives ({drives.length})</h3>
            <select 
              value={selectedDrive} 
              onChange={(e) => setSelectedDrive(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Select a drive</option>
              {drives.map(drive => (
                <option key={drive.id} value={drive.id}>
                  {drive.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Items ({items.length})</h3>
            <select 
              value={selectedItem} 
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Select an item</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Path */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold mb-2">Current Path</h3>
          <p className="text-gray-600">
            {currentPath.length === 0 ? 'Root' : currentPath.join(' / ')}
          </p>
        </div>

        {/* Operations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Move Operation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Folder Path:</label>
                <input
                  type="text"
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  placeholder="e.g., Documents/Subfolder"
                  className="w-full border rounded p-2"
                />
              </div>
              <button
                onClick={testMoveOperation}
                disabled={!selectedItem || !targetFolder}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Test Move
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Create Folder</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Folder Name:</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New Folder"
                  className="w-full border rounded p-2"
                />
              </div>
              <button
                onClick={testCreateFolder}
                disabled={!newFolderName}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>

        {/* Delete Operation */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold mb-4">Delete Operation</h3>
          <button
            onClick={testDeleteItem}
            disabled={!selectedItem}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Delete Selected Item
          </button>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Test Results</h3>
          <div className="bg-gray-100 rounded p-4 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet. Run a test to see results here.</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 