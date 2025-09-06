"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { HiPencilAlt, HiCursorClick, HiDocumentText, HiViewBoards, HiXCircle, HiArrowRight, HiPencil, HiCloud, HiChatAlt, HiBookmark, HiChartBar, HiLightBulb } from 'react-icons/hi';
import PDFViewer, { Annotation, Comment, MarkupTool } from '../../../components/PDFViewer';
import SharePointFileBrowser from '../../../components/SharePointFileBrowser';
import { useAuth } from '../../../lib/hooks/useAuth';
import { SharePointItem } from '../../../lib/sharepoint';

export default function MarkupsPage() {
  const { user } = useAuth();
  const [currentFile, setCurrentFile] = useState<SharePointItem | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [lastActiveTool, setLastActiveTool] = useState<string>('select'); // Track the last non-select tool
  const [toolProperties, setToolProperties] = useState({
    color: '#000000',
    strokeWidth: 2.0, // Default stroke width
    opacity: 1.0,
    fontSize: 14, // Default text size
    fontWeight: 300, // Default text weight (lighter)
    scallopSize: 8, // Default scallop size for cloud tool
    cloudLineThickness: 1, // Default line thickness for cloud tool
    textAlign: 'left' as 'left' | 'center' | 'right', // Default text alignment
    fontStyle: 'normal' as 'normal' | 'italic', // Default font style (default off)
    textDecoration: 'none' as 'none' | 'underline', // Default text decoration (off)
    // New: whether color picker affects border, text or both
    colorTarget: 'border' as 'border' | 'text' | 'both',
    textBorder: true,
    textBoxLineThickness: 1.5
  });
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [revisionClouds, setRevisionClouds] = useState<Array<{
    id: string;
    x: number;
    y: number;
    comment: string;
    color: string;
    strokeWidth: number;
    opacity: number;
  }>>([]);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [currentComment, setCurrentComment] = useState('');
  const [pendingRevisionCloud, setPendingRevisionCloud] = useState<{x: number, y: number} | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const currentBlobUrlRef = useRef<string | null>(null);
  const [pdfControls, setPdfControls] = useState<{
    currentPage: number;
    totalPages: number;
    scale: number;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    undo: () => void;
    redo: () => void;
  } | null>(null);





  // Handle clicking outside the properties panel
  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.properties-panel') && !target.closest('.tool-property')) {
      setShowPropertiesPanel(false);
    }
  }, []);

  // Tool definitions with proper icons
  const basicTools = [
    { id: 'select', name: 'Select', icon: HiCursorClick, description: 'Select and move annotations' },
    { id: 'text', name: 'Text', icon: HiDocumentText, description: 'Add text annotations' },
    { id: 'rectangle', name: 'Rectangle', icon: HiViewBoards, description: 'Draw rectangles' },
    { id: 'circle', name: 'Circle', icon: HiXCircle, description: 'Draw circles and ellipses' },
    { id: 'arrow', name: 'Arrow', icon: HiArrowRight, description: 'Draw arrows and lines' },
    { id: 'freehand', name: 'Draw', icon: HiPencil, description: 'Freehand drawing' }
  ];

  const bluebeamTools = [
    { id: 'cloud', name: 'Cloud Tool', icon: HiCloud, description: 'Revision cloud with comment box' },
    { id: 'callout', name: 'Callout', icon: HiChatAlt, description: 'Add callout boxes' },
    { id: 'stamp', name: 'Stamp', icon: HiBookmark, description: 'Add approval stamps' },
    { id: 'measurement', name: 'Measure', icon: HiChartBar, description: 'Measurement tools' },
    { id: 'highlight', name: 'Highlight', icon: HiLightBulb, description: 'Highlight text' }
  ];

  const handleFileSelect = useCallback(async (file: SharePointItem, driveId: string) => {
    console.log('File selected:', file);
    console.log('Drive ID:', driveId);
    console.log('Download URL:', file['@microsoft.graph.downloadUrl']);
    
    if (!driveId) {
      console.error('No drive ID provided');
      alert('Unable to open file: No drive ID available. Please try refreshing the file browser.');
      return;
    }
    
    setIsLoadingFile(true);
    
    // Use the existing downloadFile action to avoid CORS issues
    try {
      console.log('Downloading file through backend:', file.id, 'in drive:', driveId);
      
      // Create a blob URL from the backend download
      const response = await fetch(`/api/sharepoint/documents?action=downloadFile&fileId=${file.id}&driveId=${driveId}&fileName=${encodeURIComponent(file.name)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      
      // Get the file content as a blob
      const blob = await response.blob();
      console.log('File downloaded successfully, size:', blob.size, 'bytes');
      
      // Create a blob URL that the PDF viewer can use
      const blobUrl = URL.createObjectURL(blob);
      console.log('Created blob URL:', blobUrl);
      
      // Clean up previous blob URL if it exists
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        console.log('Cleaned up previous blob URL');
      }
      
      // Store the new blob URL
      currentBlobUrlRef.current = blobUrl;
      
      // Set the file URL to our blob URL
      setCurrentFile(file);
      setCurrentFileUrl(blobUrl);
      setShowFileBrowser(false);
      setAnnotations([]);
      console.log('File set successfully, PDFViewer should now load');
      
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Unable to open file: Failed to download file. Please try refreshing the file browser.');
    } finally {
      setIsLoadingFile(false);
    }
  }, []);

  // Add a function to show helpful troubleshooting information
  const showTroubleshootingInfo = () => {
    alert(`Troubleshooting Steps:
    
1. Click the refresh button (🔄) in the file browser to get fresh download links
2. Make sure you're signed into SharePoint
3. Check if the file exists and you have permission to access it
4. Try navigating to a different folder and back
5. If the issue persists, contact your administrator

Common Issues:
• SharePoint download URLs expire after a short time
• Network connectivity problems
• File permissions or access restrictions
• SharePoint service temporary unavailability`);
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        console.log('Cleaned up blob URL on unmount');
      }
    };
  }, []);

  // Close properties panel when switching to the pointer (select) tool
  useEffect(() => {
    if (activeTool === 'select') {
      setShowPropertiesPanel(false);
    }
  }, [activeTool]);

  // No text-border; single color for text

  const handleRevisionCloudClick = useCallback((e: React.MouseEvent) => {
    // Only show revision cloud modal if we're using the old revision cloud system
    // and not when the ToolManager is handling the cloud tool
    if (activeTool === 'revisionCloud') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setPendingRevisionCloud({ x, y });
      setShowCommentBox(true);
      setCurrentComment('');
    }
  }, [activeTool]);

  const handleCommentSubmit = useCallback(() => {
    if (pendingRevisionCloud && currentComment.trim()) {
      const newRevisionCloud = {
        id: `revision-${Date.now()}`,
        x: pendingRevisionCloud.x,
        y: pendingRevisionCloud.y,
        comment: currentComment.trim(),
        color: toolProperties.color,
        strokeWidth: toolProperties.strokeWidth,
        opacity: toolProperties.opacity
      };
      
      setRevisionClouds(prev => [...prev, newRevisionCloud]);
      setShowCommentBox(false);
      setPendingRevisionCloud(null);
      setCurrentComment('');
    }
  }, [pendingRevisionCloud, currentComment, toolProperties]);

  return (
    <div className="h-full w-full bg-blue-900 overflow-hidden">
      {/* Main Content Area */}
      <div 
        className="flex h-full w-full bg-white overflow-hidden" 
        style={{ paddingRight: '64px' }}
        onClick={handleClickOutside}
      >
        {/* Left Panel - File Browser */}
        {showFileBrowser && (
          <div className="w-80 bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
            <SharePointFileBrowser
              onFileSelect={handleFileSelect}
            />
          </div>
        )}

        {/* Center PDF Viewer */}
        <div className="flex-1 bg-gray-50 min-w-0 relative" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          {currentFileUrl ? (
            <div className="w-full h-auto markups-page-pdf-container" onClick={activeTool === 'revisionCloud' ? handleRevisionCloudClick : undefined}>
              <PDFViewer
                fileUrl={currentFileUrl}
                annotations={annotations}
                onAnnotationAdd={(annotation) => setAnnotations(prev => [...prev, annotation])}
                onAnnotationUpdate={(annotation) => setAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a))}
                onAnnotationDelete={(id) => setAnnotations(prev => prev.filter(a => a.id !== id))}
                onPDFControlsChange={(controls) => {
                  setPdfControls(controls);
                  // Handle tool change requests from PDFViewer
                  if (controls.activeTool && controls.activeTool !== activeTool) {
                    console.log('📝 Parent: Tool change requested:', controls.activeTool);
                    setActiveTool(controls.activeTool);
                    // Track the last non-select tool for property panel display
                    if (controls.activeTool !== 'select') {
                      setLastActiveTool(controls.activeTool);
                    }
                  }
                }}
                onToolPropertiesUpdate={(properties) => {
                  console.log('🎛️ Parent: Updating tool properties from cloud selection:', properties);
                  const alignAny = (properties as any).textAlign as 'left' | 'center' | 'right' | 'justify' | undefined;
                  const coercedAlign: 'left' | 'center' | 'right' = alignAny === 'justify' ? 'left' : (alignAny || 'left');
                  setToolProperties(prev => ({
                    ...prev,
                    color: properties.color ?? prev.color,
                    strokeWidth: properties.strokeWidth ?? prev.strokeWidth,
                    opacity: properties.opacity ?? prev.opacity,
                    fontSize: properties.fontSize ?? prev.fontSize,
                    fontWeight: properties.fontWeight ?? prev.fontWeight,
                    scallopSize: properties.scallopSize ?? prev.scallopSize,
                    cloudLineThickness: properties.cloudLineThickness ?? prev.cloudLineThickness,
                    textAlign: coercedAlign,
                    fontStyle: properties.fontStyle ?? prev.fontStyle,
                    textDecoration: (properties as any).underline !== undefined ? ((properties as any).underline ? 'underline' : 'none') : prev.textDecoration,
                    colorTarget: 'both',
                    textBorder: (properties as any).textBorder !== undefined ? (properties as any).textBorder : prev.textBorder,
                    textBoxLineThickness: (properties as any).textBoxLineThickness !== undefined ? (properties as any).textBoxLineThickness : prev.textBoxLineThickness
                  }));
                }}
                activeTool={activeTool as any}
                toolProperties={toolProperties}
                className="w-full"
              />

              
              {/* Revision Cloud Comment Box Overlay */}
              {showCommentBox && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Revision Comment</h3>
                    <textarea
                      value={currentComment}
                      onChange={(e) => setCurrentComment(e.target.value)}
                      placeholder="Enter revision details, changes, or clarifications..."
                      className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={handleCommentSubmit}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Revision Cloud
                      </button>
                      <button
                        onClick={() => {
                          setShowCommentBox(false);
                          setPendingRevisionCloud(null);
                          setCurrentComment('');
                        }}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Display Revision Clouds */}
              {revisionClouds.map((cloud) => (
                <div
                  key={cloud.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: cloud.x - 20,
                    top: cloud.y - 20,
                    zIndex: 10
                  }}
                >
                  {/* Cloud Bubble */}
                  <div
                    className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center"
                    style={{
                      borderColor: cloud.color,
                      opacity: cloud.opacity
                    }}
                  >
                    <HiCloud className="w-5 h-5" style={{ color: cloud.color }} />
                  </div>
                  {/* Comment Box */}
                  <div
                    className="absolute left-12 top-0 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs"
                    style={{ opacity: cloud.opacity }}
                  >
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{cloud.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mb-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <HiDocumentText className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4">No PDF Selected</h2>
                <p className="text-gray-600 mb-6">Select a PDF file from SharePoint to start editing</p>
                <button
                  onClick={() => setShowFileBrowser(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={isLoadingFile}
                >
                  {isLoadingFile ? 'Loading File...' : 'Select PDF File'}
                </button>
                {isLoadingFile && (
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-600">Processing file...</span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2 max-w-md">
                  If you encounter issues opening files, try refreshing the file browser to get fresh download links.
                </p>
                <button
                  onClick={showTroubleshootingInfo}
                  className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Need Help? View Troubleshooting Steps
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Markup Toolbar (Styled EXACTLY like main menu) */}
        <div 
          className="w-16 bg-white border-l border-gray-200 shadow-lg flex-shrink-0 relative"
          style={{
            position: 'fixed',
            right: 0,
            top: '4rem', // Below main header
            bottom: 0,
            zIndex: 10000,
            minWidth: '64px',
            maxWidth: '64px'
          }}
        >
          {/* Expandable Properties Panel */}
          {showPropertiesPanel && (
            <div className="properties-panel absolute right-full bottom-0 w-64 bg-white border border-gray-200 shadow-lg rounded-lg z-50" style={{ bottom: '-20px' }}>
              <div className="p-4 pb-6">
                <div className="space-y-3">
                  {/* Color Property - Always show */}
                  <div>
                    <div className="grid grid-cols-4 gap-2 justify-items-center">
                      {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'].map((color) => (
                        <div
                          key={color}
                          className={`w-8 h-8 rounded-lg border-2 cursor-pointer hover:scale-105 transition-transform ${
                            (toolProperties.color === color ? 'border-blue-500' : 'border-gray-300')
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setToolProperties(prev => ({ ...prev, color, colorTarget: 'both' }))}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Color target toggle for Callout */}
                    {((activeTool === 'callout') || (activeTool === 'select' && lastActiveTool === 'callout')) && (
                      <div className="mt-3 flex justify-center">
                        <div className="inline-flex rounded-md shadow-sm border border-gray-300 overflow-hidden text-[10px]">
                          {(['border','text','both'] as const).map((target, idx) => (
                            <button
                              key={target}
                              onClick={() => setToolProperties(prev => ({ ...prev, colorTarget: target }))}
                              className={`px-4 py-1.5 ${toolProperties.colorTarget === target ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} ${idx === 0 ? '' : 'border-l border-gray-300'}`}
                              title={`Apply color to ${target}`}
                            >
                              {target === 'border' ? 'Border' : target === 'text' ? 'Text' : 'Both'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Removed text/border/both buttons for single-color mode */}
                  
                  {/* Cloud-first ordering: Scallop Size, Border Size, Opacity */}
                  {(activeTool === 'cloud' || (activeTool === 'select' && lastActiveTool === 'cloud')) && (
                    <>
                      {/* Scallop Size */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Scallop Size</label>
                          <span className="text-xs text-gray-500">{toolProperties.scallopSize}px</span>
                        </div>
                        <input type="range" min="4" max="20" step="1" value={toolProperties.scallopSize || 8} onChange={(e) => setToolProperties(prev => ({ ...prev, scallopSize: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      {/* Border Size (cloud line thickness) */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Border Size</label>
                          <span className="text-xs text-gray-500">{toolProperties.cloudLineThickness}px</span>
                        </div>
                        <input type="range" min="1" max="10" step="1" value={toolProperties.cloudLineThickness || 1} onChange={(e) => setToolProperties(prev => ({ ...prev, cloudLineThickness: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      {/* Opacity */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Opacity</label>
                          <span className="text-xs text-gray-500">{Math.round(toolProperties.opacity * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1" value={toolProperties.opacity} onChange={(e) => setToolProperties(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                    </>
                  )}

                  {/* Callout-only: Line Thickness & Opacity */}
                  {(activeTool === 'callout' || (activeTool === 'select' && lastActiveTool === 'callout')) && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Line Thickness</label>
                          <span className="text-xs text-gray-500">{toolProperties.strokeWidth.toFixed(2)}px</span>
                        </div>
                        <input type="range" min="0.5" max="4" step="0.5" value={toolProperties.strokeWidth} onChange={(e) => setToolProperties(prev => ({ ...prev, strokeWidth: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1"><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Opacity</label><span className="text-xs text-gray-500">{Math.round(toolProperties.opacity * 100)}%</span></div>
                        <input type="range" min="0" max="1" step="0.1" value={toolProperties.opacity} onChange={(e) => setToolProperties(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                    </>
                  )}

                  {/* Text-only: Text Size, Style/Align */}
                  {(activeTool === 'text' || (activeTool === 'select' && lastActiveTool === 'text')) && (
                    <>
                      {/* Text size (first) */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1"><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Text Size</label><span className="text-xs text-gray-500">{toolProperties.fontSize}px</span></div>
                        <input type="range" min="8" max="48" step="1" value={toolProperties.fontSize || 14} onChange={(e) => setToolProperties(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      {/* Style & Alignment under size */}
                      <div className="mt-3 flex items-center space-x-2">
                        <button onClick={() => setToolProperties(prev => ({ ...prev, fontWeight: prev.fontWeight === 700 ? 300 : 700 }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.fontWeight === 700 ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Bold"><div className="text-sm font-black text-gray-700">B</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.fontStyle === 'italic' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Italic"><div className="text-xs font-semibold text-gray-700" style={{ fontStyle: 'italic' }}>I</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textDecoration: prev.textDecoration === 'underline' ? 'none' : 'underline' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textDecoration === 'underline' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Underline"><div className="text-xs font-semibold text-gray-700" style={{ textDecoration: 'underline' }}>U</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'left' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'left' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Left Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h16" /></svg></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'center' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'center' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Center Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'right' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'right' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Right Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h16M12 12h16M8 18h16" /></svg></button>
                      </div>
                      {/* Text Border toggle and thickness */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Text Border</label>
                          <button
                            role="switch"
                            aria-checked={toolProperties.textBorder}
                            onClick={() => setToolProperties(prev => ({ ...prev, textBorder: !prev.textBorder }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toolProperties.textBorder ? 'bg-blue-600' : 'bg-gray-300'}`}
                            title="Toggle text border"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toolProperties.textBorder ? 'translate-x-6' : 'translate-x-1'}`}></span>
                          </button>
                        </div>
                        {toolProperties.textBorder && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Border Thickness</label>
                              <span className="text-xs text-gray-500">{(toolProperties.textBoxLineThickness || 1).toFixed(1)}px</span>
                            </div>
                            <input type="range" min="0.5" max="4" step="0.5" value={toolProperties.textBoxLineThickness || 1.5} onChange={(e) => setToolProperties(prev => ({ ...prev, textBoxLineThickness: Math.min(parseFloat(e.target.value), 4) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                          </div>
                        )}
                      </div>
                      {/* No Text Border controls (simplified) */}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Toolbar Content - EXACTLY like main menu */}
          <nav className="flex-1 space-y-0.5 p-4">
            {/* Basic Tools */}
            <div className="space-y-0.5">
              {basicTools.map((tool) => (
                <div key={tool.id} className="relative group">
                  <button
                    onClick={() => {
                      setActiveTool(tool.id as string);
                      // Track the last non-select tool for property panel display
                      if (tool.id !== 'select') {
                        setLastActiveTool(tool.id as string);
                      }
                    }}
                    className={`flex items-center justify-center rounded-lg text-gray-700 transition-colors duration-200 py-1.5 px-4 w-full ${
                      activeTool === tool.id ? "font-semibold text-blue-700" : ""
                    }`}
                  >
                    <div className={`${activeTool === tool.id ? "bg-blue-200" : "group-hover:bg-blue-200"} rounded-lg px-1 py-1 flex items-center justify-center flex-shrink-0 transition-colors duration-200`}>
                      <tool.icon className={`${activeTool === tool.id ? "text-blue-700" : "text-blue-500"} w-5 h-5`} />
                    </div>
                  </button>
                   {/* Custom Tooltip */}
                   <div className="absolute right-full mr-6 top-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                     {tool.name}
                     <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-l-gray-900"></div>
                   </div>
                </div>
              ))}
            </div>
            
            {/* Advanced Tools */}
            <div className="mt-6 space-y-0.5">
              {bluebeamTools.map((tool) => (
                <div key={tool.id} className="relative group">
                  <button
                    onClick={() => {
                      setActiveTool(tool.id as string);
                      // Track the last non-select tool for property panel display
                      if (tool.id !== 'select') {
                        setLastActiveTool(tool.id as string);
                      }
                    }}
                    className={`flex items-center justify-center rounded-lg text-gray-700 transition-colors duration-200 py-1.5 px-4 w-full ${
                      activeTool === tool.id ? "font-semibold text-blue-700" : ""
                    }`}
                  >
                    <div className={`${activeTool === tool.id ? "bg-blue-200" : "group-hover:bg-blue-200"} rounded-lg px-1 py-1 flex items-center justify-center flex-shrink-0 transition-colors duration-200`}>
                      <tool.icon className={`${activeTool === tool.id ? "text-blue-700" : "text-blue-500"} w-5 h-5`} />
                    </div>
                  </button>
                  {/* Custom Tooltip */}
                  <div className="absolute right-full mr-6 top-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                    {tool.name}
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-l-gray-900"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Tool Properties - Integrated below tools (hidden in select mode) */}
            {activeTool !== 'select' && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              { (activeTool === 'text' || activeTool === 'callout' || (activeTool === 'select' && (lastActiveTool === 'text' || lastActiveTool === 'callout'))) ? (
                <div className="flex flex-col items-center space-y-2">
                  {/* Color swatch */}
                  <button
                    onClick={() => setShowPropertiesPanel(true)}
                    className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-105 transition-transform"
                    title="Color"
                    style={{ backgroundColor: toolProperties.color }}
                  />
                  {/* Font size */}
                  <button
                    onClick={() => setShowPropertiesPanel(true)}
                    className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    title="Text Size"
                  >
                    <span className="text-xs font-bold text-gray-700">{toolProperties.fontSize}</span>
                  </button>
                  {/* Style indicator (styled 'A') */}
                  <button
                    onClick={() => setShowPropertiesPanel(true)}
                    className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    title="Text Style"
                  >
                    <span
                      className="text-sm text-gray-700"
                      style={{
                        fontWeight: (toolProperties.fontWeight || 300) as any,
                        fontStyle: toolProperties.fontStyle === 'italic' ? 'italic' : 'normal',
                        textDecoration: toolProperties.textDecoration === 'underline' ? 'underline' : 'none'
                      }}
                    >
                      A
                    </span>
                  </button>
                  {/* Alignment indicator */}
                  <button
                    onClick={() => setShowPropertiesPanel(true)}
                    className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    title={`Align: ${toolProperties.textAlign}`}
                  >
                    {toolProperties.textAlign === 'center' ? (
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    ) : toolProperties.textAlign === 'right' ? (
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h16M12 12h16M8 18h16" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h16" /></svg>
                    )}
                  </button>
                  {/* Text Border Toggle (removed from summary per request) */}
                </div>
              ) : activeTool === 'cloud' || (activeTool === 'select' && lastActiveTool === 'cloud') ? (
                <div className="flex flex-col items-center space-y-2">
                  {/* Color swatch */}
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-105 transition-transform" title="Color" style={{ backgroundColor: toolProperties.color }} />
                  {/* Scallop summary */}
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200" title="Scallop Size"><span className="text-xs font-bold text-gray-700">{toolProperties.scallopSize}</span></button>
                  {/* Border size summary */}
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200" title="Border Size"><span className="text-xs font-bold text-gray-700">{toolProperties.cloudLineThickness}</span></button>
                  {/* Opacity summary */}
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200" title="Opacity"><span className="text-xs font-bold text-gray-700">{Math.round(toolProperties.opacity * 100)}%</span></button>
                </div>
              ) : (
                <>
                  {/* Color Property - Always show */}
                  <div className="relative group">
                    <div className="flex items-center justify-center">
                      <div 
                        className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: toolProperties.color }}
                        onClick={() => setShowPropertiesPanel(true)}
                      ></div>
                    </div>
                    <div className="absolute right-full mr-6 top-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">Color<div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-l-gray-900"></div></div>
                  </div>
                  {/* Line Width Property - Only for shape tools and freehand */}
                  {((activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arrow' || activeTool === 'freehand') || (activeTool === 'select' && (lastActiveTool === 'rectangle' || lastActiveTool === 'circle' || lastActiveTool === 'arrow' || lastActiveTool === 'freehand'))) && (
                    <div className="relative group">
                      <div className="flex items-center justify-center">
                        <div className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setShowPropertiesPanel(true)}>
                          <div className="text-xs font-bold text-gray-600">{toolProperties.strokeWidth.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="absolute right-full mr-6 top-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">Line: {toolProperties.strokeWidth.toFixed(2)}px<div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-l-gray-900"></div></div>
                    </div>
                  )}
                </>
              )}
            </div>
            )}
          </nav>
        </div>
      </div>
      
      {/* PDF Toolbar - Fixed at bottom, independent of PDF component */}
      {currentFileUrl && pdfControls && (
        <div 
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 opacity-100"
          style={{ 
            position: 'fixed' as const, 
            zIndex: 999999,
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto' as const
          }}
        >
          <div className="bg-black/90 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-3 flex items-center space-x-4">
            {/* Undo/Redo */}
            <div className="flex items-center space-x-2">
              <button
                onClick={pdfControls?.undo || (() => {})}
                className="p-2 text-white/90 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              
              <button
                onClick={pdfControls?.redo || (() => {})}
                className="p-2 text-white/90 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-white/20"></div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={pdfControls?.goToPreviousPage || (() => {})}
                disabled={(pdfControls?.currentPage || 1) <= 1}
                className="p-2 text-white/90 hover:text-white disabled:text-white/40 rounded-lg hover:bg-white/15 transition-all duration-200 disabled:hover:bg-transparent"
                title="Previous page"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="text-sm text-white/95 px-3 py-1.5 font-medium bg-white/15 rounded-lg border border-white/30 min-w-16 text-center">
                {pdfControls?.currentPage || 1}/{pdfControls?.totalPages || 1}
              </span>
              <button
                onClick={pdfControls?.goToNextPage || (() => {})}
                disabled={(pdfControls?.currentPage || 1) >= (pdfControls?.totalPages || 1)}
                className="p-2 text-white/90 hover:text-white disabled:text-white/40 rounded-lg hover:bg-white/15 transition-all duration-200 disabled:hover:bg-transparent"
                title="Next page"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="w-px h-8 bg-white/30"></div>

            {/* Zoom controls */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={pdfControls?.zoomOut || (() => {})} 
                className="p-2 text-white/90 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200"
                title="Zoom out"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="text-sm text-white/95 px-3 py-1.5 font-medium bg-white/15 rounded-lg border border-white/30 min-w-16 text-center">
                {Math.round((pdfControls?.scale || 1) * 100)}%
              </span>
              <button 
                onClick={pdfControls?.zoomIn || (() => {})} 
                className="p-2 text-white/90 hover:text-white rounded-lg hover:bg-white/15 transition-all duration-200"
                title="Zoom in"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={pdfControls?.resetZoom || (() => {})} 
                className="px-3 py-1.5 text-white/90 hover:text-white text-sm rounded-lg hover:bg-white/15 transition-all duration-200 font-medium"
                title="Reset zoom"
              >
                Fit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}