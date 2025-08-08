'use client';

import React, { useState, useEffect } from 'react';

export default function TestDocumentsSimple() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sharepoint/documents?action=getItems');
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setDocuments(data.value || []);
      }
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Simple Documents Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Load Your Documents</h2>
          <p className="text-gray-600 mb-4">
            This will load documents from your OneDrive using OAuth2 authentication.
          </p>
          
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded mb-4"
          >
            {loading ? 'Loading...' : 'Load Documents'}
          </button>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>
        
        {documents.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
            <div className="grid gap-4">
              {documents.map((doc: any) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.name}</h3>
                      <p className="text-sm text-gray-500">
                        {doc.folder ? 'Folder' : `File (${doc.size || 'Unknown size'} bytes)`}
                      </p>
                      {doc.lastModifiedDateTime && (
                        <p className="text-xs text-gray-400">
                          Modified: {new Date(doc.lastModifiedDateTime).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {doc.webUrl && (
                      <a
                        href={doc.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Open →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 