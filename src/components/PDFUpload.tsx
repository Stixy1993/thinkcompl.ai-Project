"use client";

import React, { useRef, useState } from 'react';
import { useAuth } from '../lib/hooks/useAuth';

interface PDFUploadProps {
  onFileSelect: (file: File, url: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeBytes?: number;
  className?: string;
}

export default function PDFUpload({
  onFileSelect,
  onError,
  accept = '.pdf,.dwg,.png,.jpg,.jpeg',
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  className = ""
}: PDFUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeBytes) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the maximum allowed size of ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeTypeAllowed = allowedTypes.some(type => 
      type === fileExtension || 
      (type.includes('/') && file.type === type)
    );

    if (!mimeTypeAllowed) {
      return `File type "${fileExtension}" is not supported. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelection = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError?.(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create object URL for immediate viewing
      const url = URL.createObjectURL(file);
      
      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Here you could upload to your storage service (Firebase, SharePoint, etc.)
      // For now, we'll just use the local object URL
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload time

      clearInterval(progressInterval);
      setUploadProgress(100);

      onFileSelect(file, url);
    } catch (error) {
      console.error('Error handling file:', error);
      onError?.('Failed to process the file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`pdf-upload-container flex justify-center items-center ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        className={`
          upload-area relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer w-full max-w-2xl mx-auto
          ${className?.includes('dark-theme') 
            ? isDragOver 
              ? 'border-blue-500 bg-blue-900/20' 
              : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
            : isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="text-4xl">⏳</div>
            <div className={`text-lg font-medium ${className?.includes('dark-theme') ? 'text-gray-200' : 'text-gray-700'}`}>Uploading...</div>
            <div className={`w-full rounded-full h-2 ${className?.includes('dark-theme') ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className={`text-sm ${className?.includes('dark-theme') ? 'text-gray-400' : 'text-gray-500'}`}>{uploadProgress}% complete</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`text-6xl ${className?.includes('dark-theme') ? 'text-gray-500' : 'text-gray-400'}`}>📄</div>
            <div className={`text-xl font-medium ${className?.includes('dark-theme') ? 'text-gray-200' : 'text-gray-700'}`}>
              Drop your document here or click to browse
            </div>
            <div className={`text-sm ${className?.includes('dark-theme') ? 'text-gray-400' : 'text-gray-500'}`}>
              Supports PDF, DWG, PNG, JPG files up to {(maxSizeBytes / 1024 / 1024).toFixed(0)}MB
            </div>
            
            {/* Quick Actions */}
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openFileDialog();
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  className?.includes('dark-theme')
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                📁 Browse Files
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Open from SharePoint');
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  className?.includes('dark-theme')
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                📂 SharePoint
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Files */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Documents</h3>
        <div className="space-y-2">
          {/* These could come from your document storage service */}
          {[
            { name: 'Project_Plans_Rev_A.pdf', date: '2 hours ago', size: '2.4 MB' },
            { name: 'Electrical_Drawings.dwg', date: '1 day ago', size: '8.7 MB' },
            { name: 'Site_Survey.pdf', date: '3 days ago', size: '1.2 MB' }
          ].map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                // Load recent document
                console.log('Load recent:', doc.name);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {doc.name.endsWith('.pdf') ? '📄' : 
                   doc.name.endsWith('.dwg') ? '📐' : '📊'}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{doc.name}</div>
                  <div className="text-sm text-gray-500">{doc.date} • {doc.size}</div>
                </div>
              </div>
              <button className="text-blue-500 hover:text-blue-700">
                Open
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* File Type Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Supported File Types</h4>
        <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
          <div>📄 PDF Documents</div>
          <div>📐 AutoCAD DWG Files</div>
          <div>🖼️ Images (PNG, JPG)</div>
          <div>📊 Technical Drawings</div>
        </div>
      </div>
    </div>
  );
}