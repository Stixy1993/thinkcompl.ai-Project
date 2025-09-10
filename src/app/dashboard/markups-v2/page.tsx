"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { HiPencilAlt, HiCursorClick, HiDocumentText, HiViewBoards, HiXCircle, HiArrowRight, HiPencil, HiCloud, HiChatAlt, HiBookmark, HiChartBar, HiLightBulb } from 'react-icons/hi';
import PDFViewerV2 from '../../../components/PDFViewerV2';
import type { Annotation } from '../../../components/PDFViewer';
import SharePointFileBrowser from '../../../components/SharePointFileBrowser';
import { useAuth } from '../../../lib/hooks/useAuth';
import { SharePointItem } from '../../../lib/sharepoint';

export default function MarkupsV2Page() {
  // Default to quiet logs in v2 unless explicitly disabled
  const QUIET_LOGS = process.env.NEXT_PUBLIC_DISABLE_V2_LOGS !== 'false';

  // Console shim to mute noisy logs during v2 testing only
  const consoleRef = useRef<{ log: any; error: any } | null>(null);
  useEffect(() => {
    if (!QUIET_LOGS) return;
    if (!consoleRef.current) {
      consoleRef.current = { log: console.log, error: console.error };
      // Minimal filter to suppress frequent noise
      console.log = (...args: any[]) => {
        const first = args[0];
        if (typeof first === 'string' && (first.startsWith('DEBUG:') || first.includes('Parent:') || first.includes('🛠️ Parent') || first.includes('📝 Parent'))) {
          return;
        }
        consoleRef.current?.log(...args);
      };
      console.error = (...args: any[]) => {
        const first = args[0];
        if (typeof first === 'string' && first.startsWith('DEBUG:')) {
          return;
        }
        consoleRef.current?.error(...args);
      };
    }
    return () => {
      if (consoleRef.current) {
        console.log = consoleRef.current.log;
        console.error = consoleRef.current.error;
        consoleRef.current = null;
      }
    };
  }, [QUIET_LOGS]);
  const { user } = useAuth();
  const [currentFile, setCurrentFile] = useState<SharePointItem | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [lastActiveTool, setLastActiveTool] = useState<string>('select');
  const [toolProperties, setToolProperties] = useState({
    color: '#000000',
    strokeWidth: 2.0,
    opacity: 1.0,
    fontSize: 14,
    fontWeight: 300,
    scallopSize: 8,
    cloudLineThickness: 1,
    textAlign: 'left' as 'left' | 'center' | 'right',
    fontStyle: 'normal' as 'normal' | 'italic',
    textDecoration: 'none' as 'none' | 'underline',
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
  const [showStampModal, setShowStampModal] = useState(false);
  const [stampTemplate, setStampTemplate] = useState<{ title: string; status?: 'APPROVED' | 'AS-BUILT' | 'REJECTED' | 'CUSTOM'; color?: string; opacity?: number; strokeWidth?: number; logoUrl?: string; fontSize?: number } | null>(null);
  const [stampBuilder, setStampBuilder] = useState<{ title: string; status: 'APPROVED' | 'AS-BUILT' | 'REJECTED' | 'CUSTOM'; color: string; opacity: number; strokeWidth: number; fontSize: number; useCompanyLogo?: boolean }>({ title: '', status: 'CUSTOM', color: '#ef4444', opacity: 1, strokeWidth: 2, fontSize: 14, useCompanyLogo: false });
  const [customPresets, setCustomPresets] = useState<Array<{ title: string; status: 'APPROVED' | 'AS-BUILT' | 'REJECTED' | 'CUSTOM'; color: string; opacity: number; strokeWidth: number; fontSize: number; useCompanyLogo?: boolean }>>([]);
  const [presetTab, setPresetTab] = useState<'default' | 'custom'>('default');
  const previewRef = useRef<HTMLDivElement | null>(null);
  // Compute the largest font size up to a desired amount that still fits by wrapping within the preview box
  const fitFontSize = useCallback((desired: number) => {
    const box = previewRef.current;
    const width = Math.max(120, box?.clientWidth || 320);
    const height = Math.max(40, box?.clientHeight || 112);
    const padding = 16; // px
    const availableWidth = Math.max(20, width - padding * 2);
    const availableHeight = Math.max(12, height - padding * 2);
    const text = (stampBuilder.title || 'Custom text');
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return Math.max(8, Math.min(desired, 96));
      // Helper wrap at a given font size
      const wraps = (fontPx: number) => {
        ctx.font = `${fontPx}px Arial`;
        const tokens = text.split(/(\s+)/);
        const lines: string[] = [];
        let line = '';
        for (const tk of tokens) {
          const test = line + tk;
          if (ctx.measureText(test).width <= availableWidth || line.length === 0) {
            line = test;
          } else {
            lines.push(line.trimEnd());
            line = tk.trimStart();
          }
        }
        if (line) lines.push(line.trimEnd());
        return lines;
      };
      // Binary search maximum font size that fits height with wrapping
      let lo = 8, hi = Math.min(96, Math.max(8, desired));
      let best = lo;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const lines = wraps(mid);
        const requiredH = lines.length * mid * 1.2; // 1.2 line-height
        if (requiredH <= availableHeight) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return best;
    } catch {
      return Math.max(8, Math.min(desired, 96));
    }
  }, [stampBuilder.title]);

  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.properties-panel') && !target.closest('.tool-property')) {
      setShowPropertiesPanel(false);
    }
  }, []);

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
    if (!QUIET_LOGS) console.log('File selected:', file);
    if (!QUIET_LOGS) console.log('Drive ID:', driveId);
    if (!QUIET_LOGS) console.log('Download URL:', (file as any)['@microsoft.graph.downloadUrl']);
    
    if (!driveId) {
      console.error('No drive ID provided');
      alert('Unable to open file: No drive ID available. Please try refreshing the file browser.');
      return;
    }
    
    setIsLoadingFile(true);
    
    try {
      if (!QUIET_LOGS) console.log('Downloading file through backend:', file.id, 'in drive:', driveId);
      const response = await fetch(`/api/sharepoint/documents?action=downloadFile&fileId=${file.id}&driveId=${driveId}&fileName=${encodeURIComponent(file.name)}`);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      if (!QUIET_LOGS) console.log('File downloaded successfully, size:', blob.size, 'bytes');
      const blobUrl = URL.createObjectURL(blob);
      if (!QUIET_LOGS) console.log('Created blob URL:', blobUrl);
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        if (!QUIET_LOGS) console.log('Cleaned up previous blob URL');
      }
      currentBlobUrlRef.current = blobUrl;
      setCurrentFile(file);
      setCurrentFileUrl(blobUrl);
      setShowFileBrowser(false);
      setAnnotations([]);
      if (!QUIET_LOGS) console.log('File set successfully, PDFViewer should now load');
    } catch (error) {
      if (!QUIET_LOGS) console.error('Error downloading file:', error);
      alert('Unable to open file: Failed to download file. Please try refreshing the file browser.');
    } finally {
      setIsLoadingFile(false);
    }
  }, []);

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

  useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        if (!QUIET_LOGS) console.log('Cleaned up blob URL on unmount');
      }
    };
  }, []);

  useEffect(() => {
    if (activeTool === 'select') {
      setShowPropertiesPanel(false);
    }
  }, [activeTool]);

  const handleRevisionCloudClick = useCallback((e: React.MouseEvent) => {
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
      <div 
        className="flex h-full w-full bg-white overflow-hidden" 
        style={{ paddingRight: '64px' }}
        onClick={handleClickOutside}
      >
        {showFileBrowser && (
          <div className="w-80 bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
            <SharePointFileBrowser
              onFileSelect={handleFileSelect}
            />
          </div>
        )}

        <div className="flex-1 bg-gray-50 min-w-0 relative" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          {currentFileUrl ? (
            <div className="w-full h-auto markups-page-pdf-container" onClick={activeTool === 'revisionCloud' ? handleRevisionCloudClick : undefined}>
              <PDFViewerV2
                fileUrl={currentFileUrl}
                onPDFControlsChange={(controls) => {
                  setPdfControls(controls);
                  if (controls.activeTool && controls.activeTool !== activeTool) {
                    if (!QUIET_LOGS) console.log('📝 Parent: Tool change requested:', controls.activeTool);
                    setActiveTool(controls.activeTool);
                    if (controls.activeTool !== 'select') {
                      setLastActiveTool(controls.activeTool);
                    }
                  }
                }}
                onSyncToolProperties={(props, tool) => {
                  // When user selects an existing shape, sync the panel to that shape's stored properties.
                  setToolProperties(prev => ({
                    ...prev,
                    ...(tool === 'cloud' ? {
                      color: props.color ?? prev.color,
                      cloudLineThickness: props.cloudLineThickness ?? prev.cloudLineThickness,
                      scallopSize: props.scallopSize ?? prev.scallopSize,
                      opacity: props.opacity ?? prev.opacity
                    } : tool === 'text' || tool === 'callout' ? {
                      color: props.color ?? prev.color,
                      fontSize: props.fontSize ?? prev.fontSize,
                      strokeWidth: (props.strokeWidth ?? prev.strokeWidth) as number,
                      opacity: props.opacity ?? prev.opacity
                    } : {
                      color: props.color ?? prev.color,
                      strokeWidth: (props.strokeWidth ?? prev.strokeWidth) as number,
                      opacity: props.opacity ?? prev.opacity
                    })
                  }));
                  // Keep the properties panel visible when selecting in-tool
                  setShowPropertiesPanel(true);
                }}
                onToolChange={(tool) => {
                  if (!QUIET_LOGS) console.log('🛠️ Parent: Tool changed to:', tool);
                  if (!QUIET_LOGS) console.log('🛠️ Parent: Current activeTool before change:', activeTool);
                  setActiveTool(tool);
                  if (!QUIET_LOGS) console.log('🛠️ Parent: Setting activeTool to:', tool);
                  if (tool !== 'select') {
                    setLastActiveTool(tool);
                    if (!QUIET_LOGS) console.log('🛠️ Parent: Setting lastActiveTool to:', tool);
                  }
                }}
                activeTool={activeTool as any}
                toolProperties={toolProperties}
                stampTemplate={stampTemplate}
                className="w-full"
              />

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
                  <div
                    className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center"
                    style={{
                      borderColor: cloud.color,
                      opacity: cloud.opacity
                    }}
                  >
                    <HiCloud className="w-5 h-5" style={{ color: cloud.color }} />
                  </div>
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

        <div 
          className="w-16 bg-white border-l border-gray-200 shadow-lg flex-shrink-0 relative"
          style={{
            position: 'fixed',
            right: 0,
            top: '4rem',
            bottom: 0,
            zIndex: 10000,
            minWidth: '64px',
            maxWidth: '64px'
          }}
        >
          {showPropertiesPanel && (
            <div className="properties-panel absolute right-full bottom-0 w-64 bg-white border border-gray-200 shadow-lg rounded-lg z-50" style={{ bottom: '-20px' }}>
              <div className="p-4 pb-6">
                <div className="space-y-3">
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
                  {(activeTool === 'cloud' || (activeTool === 'select' && lastActiveTool === 'cloud')) && (
                    <>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Scallop Size</label>
                          <span className="text-xs text-gray-500">{toolProperties.scallopSize}px</span>
                        </div>
                        <input type="range" min="4" max="20" step="1" value={toolProperties.scallopSize || 8} onChange={(e) => setToolProperties(prev => ({ ...prev, scallopSize: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Border Size</label>
                          <span className="text-xs text-gray-500">{toolProperties.cloudLineThickness}px</span>
                        </div>
                        <input type="range" min="1" max="10" step="1" value={toolProperties.cloudLineThickness || 1} onChange={(e) => setToolProperties(prev => ({ ...prev, cloudLineThickness: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Opacity</label>
                          <span className="text-xs text-gray-500">{Math.round(toolProperties.opacity * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1" value={toolProperties.opacity} onChange={(e) => setToolProperties(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                    </>
                  )}
                  {(activeTool === 'rectangle' || (activeTool === 'select' && lastActiveTool === 'rectangle')) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Line Thickness</label>
                        <span className="text-xs text-gray-500">{toolProperties.strokeWidth.toFixed(2)}px</span>
                      </div>
                      <input type="range" min="0.5" max="4" step="0.5" value={toolProperties.strokeWidth} onChange={(e) => setToolProperties(prev => ({ ...prev, strokeWidth: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                    </div>
                  )}
                  {(activeTool === 'circle' || (activeTool === 'select' && lastActiveTool === 'circle')) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Line Thickness</label>
                        <span className="text-xs text-gray-500">{toolProperties.strokeWidth.toFixed(2)}px</span>
                      </div>
                      <input type="range" min="0.5" max="4" step="0.5" value={toolProperties.strokeWidth} onChange={(e) => setToolProperties(prev => ({ ...prev, strokeWidth: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                    </div>
                  )}
                  {(activeTool === 'arrow' || (activeTool === 'select' && lastActiveTool === 'arrow')) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Line Thickness</label>
                        <span className="text-xs text-gray-500">{toolProperties.strokeWidth.toFixed(2)}px</span>
                      </div>
                      <input type="range" min="0.5" max="4" step="0.5" value={toolProperties.strokeWidth} onChange={(e) => setToolProperties(prev => ({ ...prev, strokeWidth: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                    </div>
                  )}
                  {(activeTool === 'freehand' || (activeTool === 'select' && lastActiveTool === 'freehand')) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Line Thickness</label>
                        <span className="text-xs text-gray-500">{toolProperties.strokeWidth.toFixed(2)}px</span>
                      </div>
                      <input type="range" min="0.5" max="4" step="0.5" value={toolProperties.strokeWidth} onChange={(e) => setToolProperties(prev => ({ ...prev, strokeWidth: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                    </div>
                  )}
                  {(activeTool === 'callout' || (activeTool === 'select' && lastActiveTool === 'callout')) && (
                    <>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1"><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Text Size</label><span className="text-xs text-gray-500">{toolProperties.fontSize}px</span></div>
                        <input type="range" min="8" max="48" step="1" value={toolProperties.fontSize || 14} onChange={(e) => setToolProperties(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      <div className="mt-3 flex items-center space-x-2">
                        <button onClick={() => setToolProperties(prev => ({ ...prev, fontWeight: prev.fontWeight === 700 ? 300 : 700 }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.fontWeight === 700 ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Bold"><div className="text-sm font-black text-gray-700">B</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.fontStyle === 'italic' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Italic"><div className="text-xs font-semibold text-gray-700" style={{ fontStyle: 'italic' }}>I</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textDecoration: prev.textDecoration === 'underline' ? 'none' : 'underline' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textDecoration === 'underline' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Underline"><div className="text-xs font-semibold text-gray-700" style={{ textDecoration: 'underline' }}>U</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'left' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'left' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Left Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h16" /></svg></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'center' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'center' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Center Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'right' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'right' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Right Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h16M12 12h16M8 18h16" /></svg></button>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Border Thickness</label>
                          <span className="text-xs text-gray-500">{(toolProperties.strokeWidth || 1).toFixed(1)}px</span>
                        </div>
                        <input type="range" min="0.5" max="4" step="0.5" value={toolProperties.strokeWidth || 1.5} onChange={(e) => setToolProperties(prev => ({ ...prev, strokeWidth: Math.min(parseFloat(e.target.value), 4) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                    </>
                  )}
                  {(activeTool === 'text' || (activeTool === 'select' && lastActiveTool === 'text')) && (
                    <>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1"><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Text Size</label><span className="text-xs text-gray-500">{toolProperties.fontSize}px</span></div>
                        <input type="range" min="8" max="48" step="1" value={toolProperties.fontSize || 14} onChange={(e) => setToolProperties(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
                      </div>
                      <div className="mt-3 flex items-center space-x-2">
                        <button onClick={() => setToolProperties(prev => ({ ...prev, fontWeight: prev.fontWeight === 700 ? 300 : 700 }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.fontWeight === 700 ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Bold"><div className="text-sm font-black text-gray-700">B</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.fontStyle === 'italic' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Italic"><div className="text-xs font-semibold text-gray-700" style={{ fontStyle: 'italic' }}>I</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textDecoration: prev.textDecoration === 'underline' ? 'none' : 'underline' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textDecoration === 'underline' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Underline"><div className="text-xs font-semibold text-gray-700" style={{ textDecoration: 'underline' }}>U</div></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'left' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'left' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Left Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h16" /></svg></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'center' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'center' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Center Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <button onClick={() => setToolProperties(prev => ({ ...prev, textAlign: 'right' }))} className={`w-8 h-8 rounded-lg flex items-center justify-center ${toolProperties.textAlign === 'right' ? 'bg-blue-200' : 'hover:bg-blue-200'}`} title="Right Align"><svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h16M12 12h16M8 18h16" /></svg></button>
                      </div>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <nav className="flex-1 space-y-0.5 p-4">
            <div className="space-y-0.5">
              {basicTools.map((tool) => (
                <div key={tool.id} className="relative group">
                  <button
                    onClick={() => {
                      setActiveTool(tool.id as string);
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
                  <div className="absolute right-full mr-6 top-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                    {tool.name}
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-l-gray-900"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-0.5">
              {bluebeamTools.map((tool) => (
                <div key={tool.id} className="relative group">
                  <button
                    onClick={() => {
                      if (tool.id === 'stamp') { setShowStampModal(true); return; }
                      setActiveTool(tool.id as string);
                      if (tool.id !== 'select') { setLastActiveTool(tool.id as string); }
                    }}
                    className={`flex items-center justify-center rounded-lg text-gray-700 transition-colors duration-200 py-1.5 px-4 w-full ${
                      activeTool === tool.id ? "font-semibold text-blue-700" : ""
                    }`}
                  >
                    <div className={`${activeTool === tool.id ? "bg-blue-200" : "group-hover:bg-blue-200"} rounded-lg px-1 py-1 flex items-center justify-center flex-shrink-0 transition-colors duration-200`}>
                      <tool.icon className={`${activeTool === tool.id ? "text-blue-700" : "text-blue-500"} w-5 h-5`} />
                    </div>
                  </button>
                  <div className="absolute right-full mr-6 top-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                    {tool.name}
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-l-gray-900"></div>
                  </div>
                </div>
              ))}
            </div>
            {activeTool !== 'select' && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              { (activeTool === 'text' || activeTool === 'callout' || (activeTool === 'select' && (lastActiveTool === 'text' || lastActiveTool === 'callout'))) ? (
                <div className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => setShowPropertiesPanel(true)}
                    className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-105 transition-transform"
                    title="Color"
                    style={{ backgroundColor: toolProperties.color }}
                  />
                  <button
                    onClick={() => setShowPropertiesPanel(true)}
                    className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    title="Text Size"
                  >
                    <span className="text-xs font-bold text-gray-700">{toolProperties.fontSize}</span>
                  </button>
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
                </div>
              ) : activeTool === 'cloud' || (activeTool === 'select' && lastActiveTool === 'cloud') ? (
                <div className="flex flex-col items-center space-y-2">
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-105 transition-transform" title="Color" style={{ backgroundColor: toolProperties.color }} />
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200" title="Scallop Size"><span className="text-xs font-bold text-gray-700">{toolProperties.scallopSize}</span></button>
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200" title="Border Size"><span className="text-xs font-bold text-gray-700">{toolProperties.cloudLineThickness}</span></button>
                  <button onClick={() => setShowPropertiesPanel(true)} className="tool-property w-8 h-8 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center hover:bg-gray-200" title="Opacity"><span className="text-xs font-bold text-gray-700">{Math.round(toolProperties.opacity * 100)}%</span></button>
                </div>
              ) : (
                <>
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
            <div className="w-px h-6 bg-white/20"></div>
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

      {/* Stamp Gallery / Builder Modal */}
      {showStampModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden border border-gray-200 max-h-[80vh] flex flex-col">
            <div className="p-3 flex md:flex-row gap-4 min-h-0">
              {/* Presets left + compact switch at the top */}
              <div className="md:w-5/12 w-full flex flex-col pr-1 min-h-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Default</span>
                    <button
                      role="switch"
                      aria-checked={presetTab === 'custom'}
                      onClick={() => setPresetTab(presetTab === 'custom' ? 'default' : 'custom')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${presetTab === 'custom' ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${presetTab === 'custom' ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                    <span className="text-sm text-gray-700">Custom</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
              {(presetTab === 'default' ? [
                { title: 'APPROVED', status: 'APPROVED', color: '#16a34a' },
                { title: 'NOT APPROVED', status: 'REJECTED', color: '#ef4444' },
                { title: 'AS-BUILT', status: 'AS-BUILT', color: '#ef4444' },
                { title: 'DRAFT', status: 'CUSTOM', color: '#1e3a8a' },
                { title: 'FINAL', status: 'CUSTOM', color: '#166534' },
                { title: 'VOID', status: 'CUSTOM', color: '#b91c1c' },
                { title: 'FOR COMMENT', status: 'CUSTOM', color: '#2563eb' },
                { title: 'COMPLETED', status: 'CUSTOM', color: '#22c55e' },
                { title: 'CONFIDENTIAL', status: 'CUSTOM', color: '#64748b' },
                { title: 'ISSUED FOR\nCONSTRUCTION', status: 'CUSTOM', color: '#ef4444' }
              ] : customPresets).map((preset) => (
                <button key={preset.title} onClick={() => {
                  setStampTemplate({ ...preset } as any);
                  // Force a small debounce to ensure child sees updated prop before click
                  // Close modal and switch to stamp tool immediately so next click places it
                  setShowStampModal(false);
                  setActiveTool('stamp');
                  setLastActiveTool('stamp');
                }}
                  className="border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow text-left max-w-[340px] w-full mx-auto">
                  <div className="h-14 rounded-md border-2 flex items-center justify-center text-center px-2" style={{ borderColor: preset.color as string }}>
                    <div className="text-xs font-semibold whitespace-pre-line" style={{ color: preset.color as string }}>{preset.title}</div>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-600">{preset.title.replace('\n',' / ')}</div>
                </button>
              ))}
                  </div>
                </div>
              </div>

              {/* Custom builder right */}
              <div className="md:w-7/12 w-full border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4 border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Custom Builder</h4>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Title</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="Custom text" value={stampBuilder.title} onChange={e => setStampBuilder(prev => ({ ...prev, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Status</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" value={stampBuilder.status} onChange={e => setStampBuilder(prev => ({ ...prev, status: e.target.value as any }))}>
                        <option>APPROVED</option>
                        <option>AS-BUILT</option>
                        <option>REJECTED</option>
                        <option>CUSTOM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Color</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['#000000', '#ef4444', '#166534', '#2563eb'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setStampBuilder(prev => ({ ...prev, color: c }))}
                            className={`w-10 h-10 rounded-lg border-2 ${stampBuilder.color === c ? 'border-blue-500' : 'border-gray-300'} hover:scale-105 transition-transform`}
                            style={{ backgroundColor: c }}
                            aria-label={`Choose ${c}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-gray-600">Border</label>
                      <span className="text-xs text-gray-500">{stampBuilder.strokeWidth}px</span>
                    </div>
                    <input type="range" min="1" max="6" step="1" value={stampBuilder.strokeWidth} onChange={e => setStampBuilder(prev => ({ ...prev, strokeWidth: parseInt(e.target.value || '2') }))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-gray-600">Text Size</label>
                      <span className="text-xs text-gray-500">{stampBuilder.fontSize}px</span>
                    </div>
                    <input type="range" min="8" max={fitFontSize(96)} step="1" value={stampBuilder.fontSize} onChange={e => setStampBuilder(prev => ({ ...prev, fontSize: fitFontSize(parseInt(e.target.value || '14')) }))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Logo</label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input type="checkbox" className="rounded" checked={!!stampBuilder.useCompanyLogo} onChange={(e) => setStampBuilder(prev => ({ ...prev, useCompanyLogo: e.target.checked }))} />
                        Use company logo
                      </label>
                      <span className="text-xs text-gray-500">(we'll wire this later)</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-2">Preview</div>
                    <div ref={previewRef} className="h-28 rounded-lg border-2 flex items-center justify-center max-w-md text-center px-2" style={{ borderColor: stampBuilder.color, borderWidth: stampBuilder.strokeWidth }}>
                      <div className="font-semibold whitespace-pre-line" style={{ color: stampBuilder.color, fontSize: `${stampBuilder.fontSize}px` }}>{stampBuilder.title || 'Custom text'}</div>
                    </div>
                    <div className="flex items-center justify-end mt-3 gap-2">
                      <button onClick={() => setShowStampModal(false)} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Close</button>
                      <button onClick={() => {
                        setCustomPresets(prev => [...prev, { title: stampBuilder.title || 'Custom text', status: stampBuilder.status, color: stampBuilder.color, opacity: 1, strokeWidth: stampBuilder.strokeWidth, fontSize: stampBuilder.fontSize, useCompanyLogo: stampBuilder.useCompanyLogo }]);
                        setPresetTab('custom');
                      }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

 
