"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { HiDocument, HiUpload, HiTrash, HiDownload, HiEye, HiPlus, HiX } from "react-icons/hi";
import Button from "@/components/Button";
import { useDropzone } from "react-dropzone";

interface Drawing {
  id: string;
  name: string;
  title: string;
  size: string;
  type: string;
  uploadedAt: Date;
  url?: string;
  version?: string;
  drawingNumber?: string;
}

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    
    // Append new files to existing files
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    
    // Set initial filenames for new files (without extensions)
    const newFileNames = acceptedFiles.map(file => {
      const fileNameWithoutExtension = file.name.split('.').slice(0, -1).join('.') || file.name;
      return fileNameWithoutExtension;
    });
    
    // Append new filenames to existing filenames
    setFileNames(prev => [...prev, ...newFileNames]);
  }, []);

  const handleFileNameChange = (index: number, newName: string) => {
    const newFileNames = [...fileNames];
    newFileNames[index] = newName;
    setFileNames(newFileNames);
  };

  const getFileExtension = (fileName: string) => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/dxf': ['.dxf'],
      'application/dwg': ['.dwg'],
      'image/svg+xml': ['.svg'],
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteDrawing = (id: string) => {
    setDrawings(prev => prev.filter(drawing => drawing.id !== id));
  };

  const handleDownload = (drawing: Drawing) => {
    if (drawing.url) {
      const link = document.createElement('a');
      link.href = drawing.url;
      link.download = drawing.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      setIsUploading(true);
      
      // Simulate file upload
      setTimeout(() => {
        const newDrawings = selectedFiles.map((file, index) => {
          const originalExtension = getFileExtension(file.name);
          const newFileName = fileNames[index] + (originalExtension ? `.${originalExtension}` : '');
          
          return {
            id: Date.now().toString() + index,
            name: newFileName, // Use the edited filename
            title: newFileName, // Use filename as title
            size: formatFileSize(file.size),
            type: file.type || 'Unknown',
            uploadedAt: new Date(),
            url: URL.createObjectURL(file),
            version: '1.0',
            drawingNumber: `DWG-${Date.now().toString().slice(-6)}`
          };
        });
        
        setDrawings(prev => [...prev, ...newDrawings]);
        setIsUploading(false);
        setShowUploadModal(false);
        setSelectedFiles([]);
        setFileNames([]);
      }, 1000);
    }
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
    setFileNames([]);
  };

  return (
    <motion.div
      className="flex-1 flex flex-col h-full bg-blue-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-6 pt-1 pb-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Technical Drawings</h1>
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="upload"
            size="md"
            icon="plus"
          >
            Upload Drawing
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          {/* Uploaded Drawings Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Uploaded Drawings</h3>
            
            {drawings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <HiDocument className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No technical drawings uploaded yet</p>
                <p className="text-sm">Upload your first drawing using the button above</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {drawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <HiDocument className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{drawing.title}</h4>
                          <p className="text-sm text-gray-500">
                            {drawing.size} • {drawing.type} • {drawing.uploadedAt.toLocaleDateString()}
                          </p>
                          {drawing.drawingNumber && (
                            <p className="text-xs text-blue-600 font-medium">
                              Drawing #: {drawing.drawingNumber} • Version: {drawing.version}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(drawing)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Download"
                        >
                          <HiDownload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(drawing.url, '_blank')}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <HiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDrawing(drawing.id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add Drawings</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selected Files</label>
                  <div className="max-h-80 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded border group relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <HiDocument className="w-4 h-4 text-blue-600" />
                            <input
                              type="text"
                              value={fileNames[index] || ''}
                              onChange={(e) => handleFileNameChange(index, e.target.value)}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
                              placeholder="Enter filename..."
                            />
                            <span className="text-xs text-gray-500">
                              .{getFileExtension(file.name)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                            <button
                              onClick={() => {
                                const newFiles = selectedFiles.filter((_, i) => i !== index);
                                const newFileNames = fileNames.filter((_, i) => i !== index);
                                setSelectedFiles(newFiles);
                                setFileNames(newFileNames);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attach Documents */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attach Documents</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <HiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">Drop the files here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Drag and Drop here</p>
                      <p className="text-sm text-gray-500">or</p>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Browse files
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
} 