"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

// Dynamically import PDF.js and Fabric.js only on client-side
let pdfjs: any = null;
let fabric: any = null;

if (typeof window !== 'undefined') {
  try {
    pdfjs = require('pdfjs-dist');
    fabric = require('fabric').fabric;
    console.log('PDF.js and Fabric.js loaded successfully');
  } catch (error) {
    console.error('Failed to load PDF.js or Fabric.js:', error);
  }
}

// PDF.js worker setup
if (typeof window !== 'undefined') {
  // Use a local worker file to avoid configuration errors
  console.log('PDF.js: Setting up local worker configuration');
  try {
    // Use the worker file from node_modules that we know exists
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    console.log('PDF.js: Worker configured successfully');
  } catch (error) {
    console.error('PDF.js: Failed to configure worker:', error);
    // Fallback: try to disable worker completely
    pdfjs.GlobalWorkerOptions.workerSrc = null;
  }
}

export interface Annotation {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'highlight' | 'measurement' | 'stamp' | 'freehand' | 'callout';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  opacity: number;
  author: string;
  createdAt: Date;
  modifiedAt: Date;
  comments?: Comment[];
  // Additional properties for specific annotation types
  stampType?: string;
  measurementUnit?: string;
  measurementValue?: number;
  calloutText?: string;
  cloudIntensity?: number;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
}

export type MarkupTool = 'select' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'highlight' | 'measurement' | 'stamp' | 'freehand' | 'callout';

interface PDFViewerProps {
  fileUrl?: string;
  onAnnotationAdd?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  annotations?: Annotation[];
  readOnly?: boolean;
  className?: string;
  activeTool?: MarkupTool;
  toolProperties?: {
    color: string;
    strokeWidth: number;
    opacity: number;
  };
  onPDFControlsChange?: (controls: {
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
    activeTool?: MarkupTool;
  }) => void;
}

function PDFViewerComponent({
  fileUrl,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  annotations = [],
  readOnly = false,
  className = "",
  activeTool: externalActiveTool,
  toolProperties: externalToolProperties,
  onPDFControlsChange
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any | null>(null);
  const pdfDocRef = useRef<any | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const scaleRef = useRef(1.0);
  const [internalActiveTool, setInternalActiveTool] = useState<MarkupTool>('select');
  const activeTool = externalActiveTool || internalActiveTool;
  
  // Use external tool properties if provided, otherwise use defaults
  const toolProperties = externalToolProperties || {
    color: '#000000',
    strokeWidth: 2,
    opacity: 1.0
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [pageCache, setPageCache] = useState<Map<number, ImageData>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  
  // Undo/Redo state management
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isUndoRedoing, setIsUndoRedoing] = useState(false);
  
  // Global editing state to prevent unwanted text box creation
  const [justFinishedEditing, setJustFinishedEditing] = useState(false);
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clipboard state for copy/paste functionality
  const [clipboardObject, setClipboardObject] = useState<any>(null);

  // Keyboard shortcuts
  useHotkeys('ctrl+z', () => undo());
  useHotkeys('ctrl+y', () => redo());
  useHotkeys('ctrl+c', () => copySelected());
  useHotkeys('ctrl+v', () => pasteObject());
  useHotkeys('delete', () => deleteSelected());
  useHotkeys('escape', () => setInternalActiveTool('select'));

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, []);

  const loadPDF = useCallback(async (url: string) => {
    console.log('PDFViewer: loadPDF called with URL:', url);
    console.log('PDFViewer: pdfjs available:', !!pdfjs);
    console.log('PDFViewer: fabric available:', !!fabric);
    
    if (!url) {
      console.error('PDFViewer: No URL provided');
      setError('No PDF URL provided');
      return;
    }
    
    if (!pdfjs) {
      console.error('PDFViewer: PDF.js not available');
      setError('PDF.js library not loaded. Please refresh the page.');
      return;
    }
    
    setIsLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      console.log('PDFViewer: Starting PDF load...');
      console.log('PDFViewer: Using local worker configuration');
      
      const pdf = await pdfjs.getDocument(url).promise;
      console.log('PDFViewer: PDF loaded successfully, pages:', pdf.numPages);
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      
      // Wait for canvas to be fully ready with retry mechanism
      let canvasReady = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!canvasReady && attempts < maxAttempts) {
        attempts++;
        console.log(`PDFViewer: Canvas readiness check attempt ${attempts}/${maxAttempts}`);
        
        // Check if canvas element exists
        if (!canvasRef.current) {
          console.log('PDFViewer: Canvas ref not available, waiting...');
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        
        // Check if canvas element is properly initialized
        const canvas = canvasRef.current;
        if (!canvas.getContext) {
          console.log('PDFViewer: Canvas getContext method not available, waiting...');
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        
        // Test if we can actually get a 2D context
        try {
          const testContext = canvas.getContext('2d');
          if (testContext) {
            console.log('PDFViewer: Canvas context test successful');
            canvasReady = true;
            break;
          } else {
            console.log('PDFViewer: Canvas context test failed, waiting...');
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (contextError) {
          console.log('PDFViewer: Canvas context test error:', contextError);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (canvasReady) {
        console.log('PDFViewer: Canvas is ready, proceeding with rendering');
        await renderPage(1, pdf);
        console.log('PDFViewer: First page rendered successfully');
      } else {
        console.error('PDFViewer: Canvas failed to become ready after all attempts');
        setError('Canvas initialization failed. Please refresh the page and try again.');
      }
    } catch (error: any) {
      console.error('PDFViewer: Error loading PDF:', error);
      console.error('PDFViewer: Error details:', {
        message: error.message,
        stack: error.stack,
        url: url
      });
      
      // Set user-friendly error message
      let errorMessage = 'Failed to load PDF. Please try again.';
      if (error.message && error.message.includes('worker')) {
        errorMessage = 'PDF loading failed. The system is using the main thread for processing.';
        console.error('PDFViewer: PDF loading error detected. This may be due to file access or format issues.');
      } else if (error.message && error.message.includes('CORS')) {
        errorMessage = 'PDF loading failed due to CORS restrictions. Please check the file URL.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderPage = async (pageNum: number, pdf?: any) => {
    const pdfDoc = pdf || pdfDocRef.current;
    
    // Add comprehensive canvas availability checks
    if (!pdfDoc) {
      console.log('PDFViewer: No PDF document available for rendering');
      return;
    }
    
    if (!canvasRef.current) {
      console.log('PDFViewer: Canvas ref not available yet, skipping render');
      return;
    }
    
    if (!fabric) {
      console.log('PDFViewer: Fabric.js not available yet, skipping render');
      return;
    }

    // Additional safety check for canvas element
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) {
      console.log('PDFViewer: Canvas element not properly initialized, skipping render');
      return;
    }

    // Final canvas context test before rendering
    let context;
    try {
      context = canvas.getContext('2d');
      if (!context) {
        console.error('PDFViewer: Failed to get canvas context during render');
        setError('Canvas rendering context unavailable. Please refresh the page.');
        return;
      }
    } catch (contextError) {
      console.error('PDFViewer: Canvas context error during render:', contextError);
      setError('Canvas rendering failed. Please refresh the page.');
      return;
    }

    // Cancel any ongoing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    setIsRendering(true);
    setRenderProgress(0);

    try {
      // Check if page is cached
      const cacheKey = `${pageNum}_${scale}`;
      
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 }); // Get original viewport
      
      console.log('PDFViewer: Original page dimensions:', viewport.width, 'x', viewport.height);
      
      // Calculate the scale to fit the page within the container
      const container = containerRef.current;
      if (!container) {
        console.error('PDFViewer: Container ref not available');
        return;
      }
      
      // Get the available space for the PDF (accounting for padding and borders)
      const containerRect = container.getBoundingClientRect();
      const availableWidth = Math.max(containerRect.width - 64, 100); // 32px padding on each side, minimum 100px
      // Don't use container height for calculation - let the PDF determine the height
      const availableHeight = Math.max(window.innerHeight * 0.8, 100); // Use viewport height instead
      
      console.log('PDFViewer: Available space:', availableWidth, 'x', availableHeight);
      
      // Calculate scale to fit the page within the available space
      const scaleX = availableWidth / viewport.width;
      const scaleY = availableHeight / viewport.height;
      const fitScale = Math.min(scaleX, scaleY, 1.0); // Don't scale up beyond 100%
      
      // Apply user's zoom preference on top of the fit scale
      const finalScale = Math.max(fitScale * scaleRef.current, 0.1); // Ensure minimum scale of 0.1
      
      console.log('PDFViewer: Calculated scales - fit:', fitScale, 'user zoom:', scaleRef.current, 'final:', finalScale);
      
      // Limit canvas size to prevent memory issues
      const maxDimension = 4096; // Maximum canvas dimension
      let renderScale = finalScale;
      if (viewport.width * finalScale > maxDimension || viewport.height * finalScale > maxDimension) {
        renderScale = Math.min(finalScale, maxDimension / Math.max(viewport.width, viewport.height));
        console.log('PDFViewer: Scaling down to prevent memory issues:', renderScale);
      }
      
      const finalViewport = page.getViewport({ scale: renderScale });
      
      // Set canvas dimensions to the scaled size
      canvas.width = finalViewport.width;
      canvas.height = finalViewport.height;
      
      // Set CSS dimensions to maintain aspect ratio and fit container
      // Use explicit height to prevent layout issues
      canvas.style.width = `${finalViewport.width}px`;
      canvas.style.height = `${finalViewport.height}px`;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = 'none';
      
      console.log('PDFViewer: Canvas dimensions set to:', canvas.width, 'x', canvas.height);
      console.log('PDFViewer: Canvas CSS dimensions set to:', canvas.style.width, 'x', canvas.style.height);

      // Optimize canvas for better performance
      const dpr = window.devicePixelRatio || 1;
      if (dpr > 1) {
        // For high DPI displays, we'll keep the canvas at the display size
        // but render at higher resolution internally
        context.scale(1, 1); // No additional scaling needed
      }

      const renderContext = {
        canvasContext: context,
        viewport: finalViewport,
        intent: 'display',
        renderInteractiveForms: false, // Disable for better performance
        transform: null // No additional transform needed
      };

      // Start render task with progress tracking and timeout protection
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      // Add timeout protection for rendering
      const renderTimeout = setTimeout(() => {
        if (renderTaskRef.current === renderTask) {
          console.error('PDFViewer: Rendering timeout - cancelling task');
          renderTask.cancel();
          setError('PDF rendering timed out. The file might be too large or complex.');
        }
      }, 30000); // 30 second timeout

      // Simulate progress for large files
      const progressInterval = setInterval(() => {
        setRenderProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      try {
        await renderTask.promise;
        clearTimeout(renderTimeout);
        clearInterval(progressInterval);
        setRenderProgress(100);
        console.log('PDFViewer: Page rendered successfully');
      } catch (renderError) {
        clearTimeout(renderTimeout);
        clearInterval(progressInterval);
        if (renderError.name !== 'RenderingCancelledException') {
          throw renderError;
        }
        console.log('PDFViewer: Rendering was cancelled');
        return;
      }

      // Initialize or update Fabric.js canvas AFTER PDF is rendered
      try {
        if (!fabricCanvasRef.current) {
          console.log('PDFViewer: Initializing Fabric.js canvas on separate annotations canvas');
          
          // Get the annotations canvas element
          const annotationsCanvas = document.getElementById('annotations-canvas') as HTMLCanvasElement;
          if (!annotationsCanvas) {
            console.error('PDFViewer: Annotations canvas not found');
            return;
          }
          
          // Set the annotations canvas dimensions to match the PDF canvas exactly
          const pdfRect = canvas.getBoundingClientRect();
          annotationsCanvas.width = canvas.width;
          annotationsCanvas.height = canvas.height;
          annotationsCanvas.style.width = canvas.style.width;
          annotationsCanvas.style.height = canvas.style.height;
          
          console.log('PDFViewer: Canvas dimensions - PDF:', canvas.width, 'x', canvas.height, 'Fabric:', annotationsCanvas.width, 'x', annotationsCanvas.height);
          
          const fabricCanvas = new (fabric as any).Canvas(annotationsCanvas, {
            isDrawingMode: false,
            selection: activeTool === 'select',
            preserveObjectStacking: true,
            renderOnAddRemove: false, // Optimize for bulk operations
            skipTargetFind: false,
            perPixelTargetFind: true
          });
          
          fabricCanvasRef.current = fabricCanvas;
          
          // Set Fabric canvas dimensions to match PDF exactly
          fabricCanvas.setDimensions({
            width: canvas.width,
            height: canvas.height
          });
          
          // Set PDF as background image on Fabric canvas
          try {
            const pdfDataUrl = canvas.toDataURL();
            console.log('PDFViewer: PDF canvas data URL length:', pdfDataUrl.length);
            
            fabricCanvas.setBackgroundImage(pdfDataUrl, fabricCanvas.renderAll.bind(fabricCanvas), {
              scaleX: 1,
              scaleY: 1,
              originX: 'left',
              originY: 'top'
            });
            
            console.log('PDFViewer: Successfully set PDF as background on Fabric canvas');
          } catch (error) {
            console.error('PDFViewer: Error setting PDF background:', error);
          }
          
          setupFabricEventListeners(fabricCanvas);
          console.log('PDFViewer: Fabric.js canvas initialized successfully on separate canvas');
          
          // Save initial canvas state for undo/redo
          setTimeout(() => {
            saveCanvasState();
            console.log('PDFViewer: Initial canvas state saved for undo/redo');
          }, 200);
          
          // Force container resize AFTER Fabric.js is initialized
          if (containerRef.current) {
            const container = containerRef.current;
            // Calculate the actual height needed based on the rendered PDF
            const pdfHeight = finalViewport.height;
            const padding = 40; // Just padding for the container, toolbar is in normal flow
            const actualHeight = pdfHeight + padding;
            
            console.log(`PDFViewer: Setting container height AFTER Fabric.js to ${actualHeight}px (PDF: ${pdfHeight}px + padding: ${padding}px)`);
            
            // Let the container size itself naturally
            console.log(`PDFViewer: Container will size naturally based on content`);
            
            // Clear any previous explicit sizing
            container.style.height = '';
            container.style.minHeight = '';
            container.style.maxHeight = '';
            
            // Force a reflow to ensure proper sizing
            container.offsetHeight;
            
            // Container will size naturally based on content
          }
        } else {
          // Update existing Fabric.js canvas dimensions
          console.log('PDFViewer: Updating existing Fabric.js canvas dimensions');
          const annotationsCanvas = document.getElementById('annotations-canvas') as HTMLCanvasElement;
          if (annotationsCanvas) {
            annotationsCanvas.width = canvas.width;
            annotationsCanvas.height = canvas.height;
            annotationsCanvas.style.width = canvas.style.width;
            annotationsCanvas.style.height = canvas.style.height;
          }
          
          // Force container resize AFTER updating existing Fabric.js canvas
          if (containerRef.current) {
            const container = containerRef.current;
            // Calculate the actual height needed based on the rendered PDF
            const pdfHeight = finalViewport.height;
            const padding = 40; // Just padding for the container, toolbar is in normal flow
            const actualHeight = pdfHeight + padding;
            
            console.log(`PDFViewer: Setting container height AFTER updating Fabric.js to ${actualHeight}px (PDF: ${pdfHeight}px + padding: ${padding}px)`);
            
            // Let the container size itself naturally
            console.log(`PDFViewer: Container will size naturally based on content`);
            
            // Clear any previous explicit sizing
            container.style.height = '';
            container.style.minHeight = '';
            container.style.maxHeight = '';
            
            // Force a reflow to ensure proper sizing
            container.offsetHeight;
            
            // Container will size naturally based on content
          }
          
          fabricCanvasRef.current.renderOnAddRemove = false;
          
          // Update Fabric canvas dimensions to match PDF exactly
          fabricCanvasRef.current.setDimensions({
            width: canvas.width,
            height: canvas.height
          });
          
          // Update the PDF background image with new scale
          try {
            const pdfDataUrl = canvas.toDataURL();
            fabricCanvasRef.current.setBackgroundImage(pdfDataUrl, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current), {
              scaleX: 1,
              scaleY: 1,
              originX: 'left',
              originY: 'top'
            });
            console.log('PDFViewer: Updated PDF background image with new scale');
          } catch (error) {
            console.error('PDFViewer: Error updating PDF background:', error);
          }
          
          fabricCanvasRef.current.renderOnAddRemove = true;
          fabricCanvasRef.current.renderAll();
          console.log('PDFViewer: Existing Fabric.js canvas updated');
        }

        // Load annotations for current page
        loadAnnotationsForPage(pageNum);
        
        // Cache the rendered page for smaller files
        if (totalPages < 50 && renderScale === fitScale) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          setPageCache(prev => new Map(prev).set(pageNum, imageData));
        }
      } catch (fabricError) {
        console.error('PDFViewer: Fabric.js initialization error:', fabricError);
        console.log('PDFViewer: Continuing without annotation features - PDF is still rendered');
        // Continue without Fabric.js - PDF is still rendered
        // The canvas will show the PDF but won't support annotations
      }

      console.log('PDFViewer: Page rendering completed successfully');

    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
        setError(`Rendering failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsRendering(false);
      setRenderProgress(0);
      renderTaskRef.current = null;
    }
  };

  const setupFabricEventListeners = (fabricCanvas: any) => {
    // Prevent Fabric.js from clearing the canvas content
    const originalClear = fabricCanvas.clear;
    fabricCanvas.clear = function() {
      console.log('PDFViewer: Preventing Fabric.js from clearing canvas content');
      // Don't clear - preserve PDF content
      return this;
    };

    fabricCanvas.on('object:added', (e: any) => {
      if (e.target && !readOnly) {
        const obj = e.target;
        if (obj.data?.isAnnotation) {
          const annotation = createAnnotationFromObject(obj);
          onAnnotationAdd?.(annotation);
          // Save state after adding object
          setTimeout(() => saveCanvasState(), 100);
        }
      }
    });

    fabricCanvas.on('object:modified', (e: any) => {
      if (e.target && !readOnly) {
        const obj = e.target;
        if (obj.data?.isAnnotation) {
          // Check if PDF.js is properly loaded
          if (!pdfjs || !pdfDocRef.current) {
            console.warn('PDF.js not loaded or PDF document not available, skipping coordinate update');
            return;
          }
          
          // Update original coordinates based on current position and scale
          const pdfCanvas = canvasRef.current;
          if (pdfCanvas && obj.data.originalX !== undefined) {
            const renderedWidth = pdfCanvas.width;
            const renderedHeight = pdfCanvas.height;
            
            // Safely get the original PDF page dimensions with error handling
            let originalWidth = 800;
            let originalHeight = 600;
            
            try {
              if (pdfDocRef.current) {
                const page = pdfDocRef.current.getPage(currentPage);
                if (page && typeof page.getViewport === 'function') {
                  const viewport = page.getViewport({ scale: 1 });
                  originalWidth = viewport.width;
                  originalHeight = viewport.height;
                } else {
                  console.warn('PDF page or getViewport method not available, using default dimensions');
                }
              } else {
                console.warn('PDF document not loaded, using default dimensions');
              }
            } catch (error) {
              console.error('Error getting PDF page dimensions:', error);
              console.warn('Using default dimensions for scaling');
            }
            
            const scaleFactor = Math.min(renderedWidth / originalWidth, renderedHeight / originalHeight);
            
            // Convert current position back to original coordinates
            obj.data.originalX = obj.left / scaleFactor;
            obj.data.originalY = obj.top / scaleFactor;
            obj.data.originalWidth = (obj as any).width / scaleFactor;
            obj.data.originalHeight = (obj as any).height / scaleFactor;
            
            if (obj.type === 'i-text' || obj.type === 'text') {
              obj.data.originalFontSize = (obj as any).fontSize / scaleFactor;
            }
          }
          
          const annotation = createAnnotationFromObject(obj);
          onAnnotationUpdate?.(annotation);
          // Save state after modifying object
          setTimeout(() => saveCanvasState(), 100);
        }
      }
    });

    fabricCanvas.on('object:removed', (e: any) => {
      if (e.target && !readOnly) {
        const obj = e.target;
        if (obj.data?.isAnnotation) {
          // Save state after removing object
          setTimeout(() => saveCanvasState(), 100);
        }
      }
    });

    fabricCanvas.on('selection:created', (e: any) => {
      if (e.selected && e.selected.length > 0) {
        const obj = e.selected[0];
        if (obj.data?.isAnnotation) {
          setSelectedAnnotation(obj.data.id);
        }
      }
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedAnnotation(null);
    });

    // Mouse event handlers for drawing
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    fabricCanvas.on('mouse:down', (e) => {
      if (readOnly || activeTool === 'select') return;

      const pointer = fabricCanvas.getPointer(e.e);
      isDrawing = true;
      startX = pointer.x;
      startY = pointer.y;

      switch (activeTool) {
        case 'rectangle':
          startRectangleDrawing(pointer.x, pointer.y);
          break;
        case 'circle':
          startCircleDrawing(pointer.x, pointer.y);
          break;
        case 'text':
          addTextAnnotation(pointer.x, pointer.y);
          break;
        case 'arrow':
          startArrowDrawing(pointer.x, pointer.y);
          break;
        case 'cloud':
          startCloudDrawing(pointer.x, pointer.y);
          break;
        case 'stamp':
          addStampAnnotation(pointer.x, pointer.y);
          break;
        case 'callout':
          startCalloutDrawing(pointer.x, pointer.y);
          break;
        case 'measurement':
          startMeasurementDrawing(pointer.x, pointer.y);
          break;
        case 'freehand':
          fabricCanvas.isDrawingMode = true;
          fabricCanvas.freeDrawingBrush.width = 3;
          fabricCanvas.freeDrawingBrush.color = '#ff0000';
          break;
      }
    });

    fabricCanvas.on('mouse:move', (e) => {
      if (!isDrawing || readOnly || activeTool === 'select' || activeTool === 'freehand' || 
          activeTool === 'stamp' || activeTool === 'text' || activeTool === 'cloud' || activeTool === 'callout') return;

      const pointer = fabricCanvas.getPointer(e.e);
      updateDrawingObject(startX, startY, pointer.x, pointer.y);
    });

    fabricCanvas.on('mouse:up', () => {
      if (activeTool === 'freehand') {
        fabricCanvas.isDrawingMode = false;
      }
      isDrawing = false;
      finalizeDrawingObject();
    });
  };

  const startRectangleDrawing = (x: number, y: number) => {
    const rect = new (fabric as any).Rect({
      left: x,
      top: y,
      width: 0,
      height: 0,
      fill: 'transparent',
      stroke: '#ff0000',
      strokeWidth: 2,
      selectable: true,
      data: {
        isAnnotation: true,
        type: 'rectangle',
        id: uuidv4()
      }
    });
    
    fabricCanvasRef.current?.add(rect);
    fabricCanvasRef.current?.setActiveObject(rect);
  };

  const startCircleDrawing = (x: number, y: number) => {
    const circle = new (fabric as any).Circle({
      left: x,
      top: y,
      radius: 0,
      fill: 'transparent',
      stroke: '#ff0000',
      strokeWidth: 2,
      selectable: true,
      data: {
        isAnnotation: true,
        type: 'circle',
        id: uuidv4()
      }
    });
    
    fabricCanvasRef.current?.add(circle);
    fabricCanvasRef.current?.setActiveObject(circle);
  };

  const startArrowDrawing = (x: number, y: number) => {
    const line = new (fabric as any).Line([x, y, x, y], {
      stroke: '#ff0000',
      strokeWidth: 2,
      selectable: true,
      data: {
        isAnnotation: true,
        type: 'arrow',
        id: uuidv4()
      }
    });
    
    fabricCanvasRef.current?.add(line);
    fabricCanvasRef.current?.setActiveObject(line);
  };

  const addTextAnnotation = (x: number, y: number) => {
    const text = new (fabric as any).IText('Click to edit', {
      left: x,
      top: y,
      fontSize: 16,
      fill: '#000000',
      selectable: true,
      editable: true,
      data: {
        isAnnotation: true,
        type: 'text',
        id: uuidv4()
      }
    });
    
    fabricCanvasRef.current?.add(text);
    fabricCanvasRef.current?.setActiveObject(text);
    text.enterEditing();
  };

  const startCloudDrawing = (x: number, y: number) => {
    // Create a cloud shape using a path with curved bumps
    const cloudPath = `M ${x} ${y} 
                       C ${x + 15} ${y - 10}, ${x + 35} ${y - 10}, ${x + 50} ${y}
                       C ${x + 65} ${y - 15}, ${x + 85} ${y - 15}, ${x + 100} ${y}
                       C ${x + 115} ${y - 10}, ${x + 135} ${y - 10}, ${x + 150} ${y}
                       L ${x + 150} ${y + 50}
                       C ${x + 135} ${y + 60}, ${x + 115} ${y + 60}, ${x + 100} ${y + 50}
                       C ${x + 85} ${y + 65}, ${x + 65} ${y + 65}, ${x + 50} ${y + 50}
                       C ${x + 35} ${y + 60}, ${x + 15} ${y + 60}, ${x} ${y + 50}
                       Z`;
    
         const cloud = new (fabric as any).Path(cloudPath, {
      fill: 'transparent',
      stroke: '#ff0000',
      strokeWidth: 2,
      selectable: true,
      data: {
        isAnnotation: true,
        type: 'cloud',
        id: uuidv4()
      }
    });
    
    fabricCanvasRef.current?.add(cloud);
    fabricCanvasRef.current?.setActiveObject(cloud);
  };

  const addStampAnnotation = (x: number, y: number) => {
    const stampText = 'APPROVED'; // This could be configurable
         const stamp = new (fabric as any).Group([
       new (fabric as any).Rect({
        width: 100,
        height: 40,
        fill: 'transparent',
        stroke: '#ff0000',
        strokeWidth: 3,
        rx: 5,
        ry: 5
      }),
             new (fabric as any).Text(stampText, {
        fontSize: 14,
        fill: '#ff0000',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
        left: 50,
        top: 20
      })
    ], {
      left: x,
      top: y,
      selectable: true,
      data: {
        isAnnotation: true,
        type: 'stamp',
        id: uuidv4(),
        stampType: stampText
      }
    });
    
    fabricCanvasRef.current?.add(stamp);
    fabricCanvasRef.current?.setActiveObject(stamp);
  };

  const startCalloutDrawing = (x: number, y: number) => {
    // Create a callout with a text box and leader line
         const callout = new (fabric as any).Group([
       new (fabric as any).Rect({
        width: 120,
        height: 60,
        fill: '#ffffcc',
        stroke: '#333333',
        strokeWidth: 1,
        rx: 3,
        ry: 3
      }),
             new (fabric as any).Triangle({
        width: 10,
        height: 10,
        fill: '#ffffcc',
        stroke: '#333333',
        strokeWidth: 1,
        left: -5,
        top: 25,
        angle: -90
      }),
             new (fabric as any).IText('Add comment...', {
        fontSize: 12,
        fill: '#333333',
        left: 10,
        top: 10,
        width: 100,
        editable: true
      })
    ], {
      left: x,
      top: y,
      selectable: true,
      data: {
        isAnnotation: true,
        type: 'callout',
        id: uuidv4()
      }
    });
    
    fabricCanvasRef.current?.add(callout);
    fabricCanvasRef.current?.setActiveObject(callout);
  };

  const startMeasurementDrawing = (x: number, y: number) => {
         const line = new (fabric as any).Line([x, y, x, y], {
      stroke: '#0066cc',
      strokeWidth: 2,
      selectable: true,
      data: {
        isAnnotation: true,
        type: 'measurement',
        id: uuidv4()
      }
    });
    
    fabricCanvasRef.current?.add(line);
    fabricCanvasRef.current?.setActiveObject(line);
  };

  const updateDrawingObject = (startX: number, startY: number, currentX: number, currentY: number) => {
    const activeObject = fabricCanvasRef.current?.getActiveObject();
    if (!activeObject) return;

    switch (activeTool) {
      case 'rectangle':
        const rect = activeObject as any;
        rect.set({
          width: Math.abs(currentX - startX),
          height: Math.abs(currentY - startY),
          left: Math.min(startX, currentX),
          top: Math.min(startY, currentY)
        });
        break;
      case 'circle':
        const circle = activeObject as any;
        const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)) / 2;
        circle.set({
          radius: radius,
          left: startX - radius,
          top: startY - radius
        });
        break;
      case 'arrow':
        const line = activeObject as any;
        line.set({
          x2: currentX,
          y2: currentY
        });
        break;
      case 'measurement':
        const measureLine = activeObject as any;
        measureLine.set({
          x2: currentX,
          y2: currentY
        });
        
        // Calculate distance and add measurement text
        const distance = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
        const measurementText = `${(distance * 0.75).toFixed(1)}mm`; // Rough conversion
        
        // Add or update measurement text
        const textId = `measurement_text_${measureLine.data?.id}`;
        const existingText = fabricCanvasRef.current?.getObjects().find(obj => obj.data?.textId === textId);
        
        if (existingText) {
          (existingText as any).set({
            text: measurementText,
            left: (startX + currentX) / 2,
            top: (startY + currentY) / 2 - 10
          });
        } else {
          const text = new (fabric as any).Text(measurementText, {
            left: (startX + currentX) / 2,
            top: (startY + currentY) / 2 - 10,
            fontSize: 12,
            fill: '#0066cc',
            selectable: false,
            data: {
              textId: textId,
              isAnnotation: false
            }
          });
          fabricCanvasRef.current?.add(text);
        }
        break;
    }
    
    fabricCanvasRef.current?.renderAll();
  };

  const finalizeDrawingObject = () => {
    // Add any final processing for the drawn object
    fabricCanvasRef.current?.renderAll();
  };

  const createAnnotationFromObject = (obj: any): Annotation => {
    return {
      id: obj.data?.id || uuidv4(),
      type: obj.data?.type || 'rectangle',
      pageNumber: currentPage,
      x: obj.data?.originalX || obj.left || 0,
      y: obj.data?.originalY || obj.top || 0,
      width: obj.data?.originalWidth || (obj as any).width || 0,
      height: obj.data?.originalHeight || (obj as any).height || 0,
      color: (obj as any).fill || 'transparent',
      strokeColor: (obj as any).stroke || '#ff0000',
      strokeWidth: (obj as any).strokeWidth || 2,
      text: (obj as any).text || '',
      fontSize: obj.data?.originalFontSize || (obj as any).fontSize || 16,
      fontFamily: (obj as any).fontFamily || 'Arial',
      opacity: obj.opacity || 1,
      author: 'Current User', // This should come from auth context
      createdAt: new Date(),
      modifiedAt: new Date(),
      comments: []
    };
  };

  const loadAnnotationsForPage = (pageNum: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Check if PDF.js is properly loaded
    if (!pdfjs || !pdfDocRef.current) {
      console.warn('PDF.js not loaded or PDF document not available, skipping annotation loading');
      return;
    }
    
    // Don't clear existing annotations if we're just scaling - preserve them
    // Only clear if we're actually changing pages
    if (pageNum !== currentPage) {
      const objectsToRemove = canvas.getObjects().filter((obj: any) => obj.data?.isAnnotation);
      objectsToRemove.forEach((obj: any) => canvas.remove(obj));
    }
    
    const pageAnnotations = annotations.filter(ann => ann.pageNumber === pageNum);
    
    // Get the actual rendered PDF dimensions from the canvas
    const pdfCanvas = canvasRef.current;
    if (!pdfCanvas) return;
    
    // Get the actual rendered dimensions (what the user sees)
    const renderedWidth = pdfCanvas.width;
    const renderedHeight = pdfCanvas.height;
    
    // Safely get the original PDF page dimensions with error handling
    let originalWidth = 800;
    let originalHeight = 600;
    
    try {
      if (pdfDocRef.current) {
        const page = pdfDocRef.current.getPage(currentPage);
        if (page && typeof page.getViewport === 'function') {
          const viewport = page.getViewport({ scale: 1 });
          originalWidth = viewport.width;
          originalHeight = viewport.height;
        } else {
          console.warn('PDF page or getViewport method not available, using default dimensions');
        }
      } else {
        console.warn('PDF document not loaded, using default dimensions');
      }
    } catch (error) {
      console.error('Error getting PDF page dimensions:', error);
      console.warn('Using default dimensions for scaling');
    }
    
    // Calculate the actual scaling factor based on what's rendered vs original
    const scaleFactor = Math.min(renderedWidth / originalWidth, renderedHeight / originalHeight);
    
    console.log('Scaling annotations:', {
      original: `${originalWidth} x ${originalHeight}`,
      rendered: `${renderedWidth} x ${renderedHeight}`,
      scaleFactor: scaleFactor,
      userZoom: scaleRef.current,
      currentPage: currentPage,
      pageNum: pageNum
    });
    
    // If we're on the same page and just scaling, update existing objects instead of recreating
    if (pageNum === currentPage) {
      console.log('Updating existing annotations for scaling...');
      const existingObjects = canvas.getObjects().filter((obj: any) => obj.data?.isAnnotation);
      
      existingObjects.forEach((obj: any) => {
        if (obj.data?.originalX !== undefined && obj.data?.originalY !== undefined) {
          // Use stored original coordinates and apply current scale
          obj.set({
            left: obj.data.originalX * scaleFactor,
            top: obj.data.originalY * scaleFactor,
            width: obj.data.originalWidth * scaleFactor,
            height: obj.data.originalHeight * scaleFactor,
            fontSize: obj.data.originalFontSize ? obj.data.originalFontSize * scaleFactor : obj.fontSize
          });
          
          if (obj.type === 'circle') {
            obj.set('radius', (obj.data.originalWidth || obj.width) * scaleFactor / 2);
          }
        }
      });
      
      canvas.renderAll();
      console.log('Updated existing annotations with new scale. Total objects:', existingObjects.length);
      return;
    }
    
    console.log('Loading new annotations with scale factor:', scaleFactor, 'Original:', originalWidth, 'x', originalHeight);
    
    // Debug: Log the first annotation to see what we're working with
    if (pageAnnotations.length > 0) {
      const firstAnn = pageAnnotations[0];
      console.log('First annotation:', {
        type: firstAnn.type,
        x: firstAnn.x,
        y: firstAnn.y,
        width: firstAnn.width,
        height: firstAnn.height,
        scaledX: firstAnn.x * scaleFactor,
        scaledY: firstAnn.y * scaleFactor,
        scaledWidth: firstAnn.width * scaleFactor,
        scaledHeight: firstAnn.height * scaleFactor
      });
    }
    
    pageAnnotations.forEach(annotation => {
      let fabricObject: any;

      switch (annotation.type) {
        case 'rectangle':
          fabricObject = new (fabric as any).Rect({
            left: annotation.x * scaleFactor,
            top: annotation.y * scaleFactor,
            width: annotation.width * scaleFactor,
            height: annotation.height * scaleFactor,
            fill: annotation.color,
            stroke: annotation.strokeColor,
            strokeWidth: annotation.strokeWidth,
            opacity: annotation.opacity,
            selectable: !readOnly,
            data: {
              isAnnotation: true,
              type: annotation.type,
              id: annotation.id,
              // Store original coordinates for scaling
              originalX: annotation.x,
              originalY: annotation.y,
              originalWidth: annotation.width,
              originalHeight: annotation.height
            }
          });
          break;
        case 'circle':
          fabricObject = new (fabric as any).Circle({
            left: annotation.x * scaleFactor,
            top: annotation.y * scaleFactor,
            radius: (annotation.width * scaleFactor) / 2,
            fill: annotation.color,
            stroke: annotation.strokeColor,
            strokeWidth: annotation.strokeWidth,
            opacity: annotation.opacity,
            selectable: !readOnly,
            data: {
              isAnnotation: true,
              type: annotation.type,
              id: annotation.id,
              // Store original coordinates for scaling
              originalX: annotation.x,
              originalY: annotation.y,
              originalWidth: annotation.width,
              originalHeight: annotation.height
            }
          });
          break;
        case 'text':
          fabricObject = new (fabric as any).IText(annotation.text || 'Text', {
            left: annotation.x * scaleFactor,
            top: annotation.y * scaleFactor,
            fontSize: (annotation.fontSize || 16) * scaleFactor,
            fontFamily: annotation.fontFamily || 'Arial',
            fill: annotation.strokeColor,
            opacity: annotation.opacity,
            selectable: !readOnly,
            editable: !readOnly,
            data: {
              isAnnotation: true,
              type: annotation.type,
              id: annotation.id,
              // Store original coordinates for scaling
              originalX: annotation.x,
              originalY: annotation.y,
              originalWidth: annotation.width,
              originalHeight: annotation.height,
              originalFontSize: annotation.fontSize || 16
            }
          });
          break;
        default:
          return;
      }

      fabricCanvasRef.current?.add(fabricObject);
      
      // Debug: Log the created Fabric object
      console.log('Created Fabric object:', {
        type: fabricObject.type,
        left: fabricObject.left,
        top: fabricObject.top,
        width: fabricObject.width,
        height: fabricObject.height,
        scaleX: fabricObject.scaleX,
        scaleY: fabricObject.scaleY
      });
    });

    fabricCanvasRef.current?.renderAll();
    console.log('Annotations loaded and rendered. Total objects on canvas:', fabricCanvasRef.current?.getObjects().length);
  };

  // Save current canvas state to undo stack
  const saveCanvasState = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isUndoRedoing) return;
    
    const canvasState = JSON.stringify(canvas.toJSON(['data']));
    setUndoStack(prev => {
      const newStack = [...prev, canvasState];
      // Limit undo stack to 50 states to prevent memory issues
      return newStack.length > 50 ? newStack.slice(1) : newStack;
    });
    // Clear redo stack when new action is performed
    setRedoStack([]);
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStack.length === 0) return;
    
    console.log('🔄 Performing undo');
    setIsUndoRedoing(true);
    
    // Save current state to redo stack
    const currentState = JSON.stringify(canvas.toJSON(['data']));
    setRedoStack(prev => [...prev, currentState]);
    
    // Get previous state from undo stack
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    // Restore previous state
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
      setIsUndoRedoing(false);
    });
  };

  const redo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStack.length === 0) return;
    
    console.log('🔄 Performing redo');
    setIsUndoRedoing(true);
    
    // Save current state to undo stack
    const currentState = JSON.stringify(canvas.toJSON(['data']));
    setUndoStack(prev => [...prev, currentState]);
    
    // Get next state from redo stack
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    
    // Restore next state
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      setIsUndoRedoing(false);
    });
  };

  const copySelected = () => {
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas?.getActiveObject();
    if (activeObject && activeObject.data?.isAnnotation) {
      console.log('📋 Copying selected annotation');
      // Clone the object for clipboard
      activeObject.clone((cloned: any) => {
        setClipboardObject(cloned);
        console.log('📋 Annotation copied to clipboard');
      });
    }
  };

  const pasteObject = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !clipboardObject) {
      console.log('📋 No object in clipboard to paste');
      return;
    }

    console.log('📋 Pasting annotation from clipboard');
    // Save state before pasting for undo
    saveCanvasState();

    // Clone the clipboard object to create a new instance
    clipboardObject.clone((cloned: any) => {
      // Generate new ID for the pasted object
      cloned.data = {
        ...cloned.data,
        id: Date.now().toString()
      };

      // Smart positioning: offset by 20px or center in view if original is off-screen
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      let newLeft = cloned.left + 20;
      let newTop = cloned.top + 20;

      // If the offset position would be off-screen, center it in the canvas
      if (newLeft > canvasWidth - 100 || newTop > canvasHeight - 100) {
        newLeft = canvasWidth / 2 - (cloned.width || 50) / 2;
        newTop = canvasHeight / 2 - (cloned.height || 30) / 2;
      }

      cloned.set({
        left: newLeft,
        top: newTop
      });

      // Ensure the pasted object maintains all necessary properties
      if (cloned.data?.isAnnotation) {
        cloned.set({
          selectable: true,
          evented: true,
          moveCursor: 'grab',
          hoverCursor: 'grab'
        });
      }

      // Add to canvas
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();

      // Create annotation for the parent component
      if (cloned.data?.isAnnotation) {
        const annotation = createAnnotationFromObject(cloned);
        onAnnotationAdd?.(annotation);
      }

      console.log('📋 Annotation pasted successfully at:', { left: newLeft, top: newTop });
    });
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas?.getActiveObject();
    if (activeObject && activeObject.data?.isAnnotation) {
      // Save state before deletion for undo
      saveCanvasState();
      canvas?.remove(activeObject);
      onAnnotationDelete?.(activeObject.data.id);
    }
  };

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  }, [currentPage, renderPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  }, [currentPage, totalPages, renderPage]);

  // Reset pan position
  const resetPan = useCallback(() => {
    setPanPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    const newScale = Math.min(scaleRef.current * 1.25, 3.0);
    scaleRef.current = newScale;
    setScale(newScale);
    resetPan();
    console.log('PDFViewer: Zooming in to:', newScale);
    
    // Re-render the page with new scale to update canvas dimensions
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [resetPan, currentPage, renderPage]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(scaleRef.current * 0.8, 0.25);
    scaleRef.current = newScale;
    setScale(newScale);
    resetPan();
    console.log('PDFViewer: Zooming out to:', newScale);
    
    // Re-render the page with new scale to update canvas dimensions
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [resetPan, currentPage, renderPage]);

  const resetZoom = useCallback(() => {
    scaleRef.current = 1.0;
    setScale(1.0);
    resetPan();
    console.log('PDFViewer: Resetting zoom to fit screen');
    
    // Re-render the page with new scale to update canvas dimensions
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [resetPan, currentPage, renderPage]);

  useEffect(() => {
    console.log('PDFViewer: useEffect triggered with fileUrl:', fileUrl);
    if (fileUrl) {
      console.log('PDFViewer: Calling loadPDF with:', fileUrl);
      loadPDF(fileUrl);
    } else {
      console.log('PDFViewer: No fileUrl provided');
    }
  }, [fileUrl, loadPDF]);

  useEffect(() => {
    // Clear error when fileUrl changes
    if (fileUrl) {
      setError(null);
    }
  }, [fileUrl]);

  // Ensure canvas is properly initialized
  useEffect(() => {
    if (canvasRef.current && !canvasRef.current.getContext) {
      console.log('PDFViewer: Canvas element found but not properly initialized');
      // Force a re-render to ensure canvas is ready
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.width; // Trigger canvas refresh
      }
    }
  }, [canvasRef.current]);



    useEffect(() => {
    if (fabricCanvasRef.current) {
      // Always allow individual object selection regardless of tool
      // Only disable area selection for non-select tools
      fabricCanvasRef.current.selection = activeTool === 'select';      
      fabricCanvasRef.current.isDrawingMode = activeTool === 'freehand';
      
      // Make sure all objects remain selectable and movable regardless of tool
      fabricCanvasRef.current.forEachObject((obj: any) => {
        if (obj.data?.isAnnotation) {
          obj.selectable = true;
          obj.evented = true;
          obj.moveCursor = 'grab';
          obj.hoverCursor = 'grab';
          // Always allow this object to be found and selected
          obj.perPixelTargetFind = true;
        }
      });
      
      // Always allow clicking on objects to select them
      fabricCanvasRef.current.skipTargetFind = false;
      
      // Override the default mouse behavior to always allow annotation interaction
      fabricCanvasRef.current.preserveObjectStacking = true;
      
      // Set cursor based on active tool
      const canvas = fabricCanvasRef.current.upperCanvasEl;
      if (canvas) {
        switch (activeTool) {
          case 'select':
            canvas.style.cursor = 'default';
            break;
          case 'text':
            canvas.style.cursor = 'text';
            break;
          case 'rectangle':
          case 'circle':
            canvas.style.cursor = 'crosshair';
            break;
          case 'freehand':
            canvas.style.cursor = 'crosshair';
            break;
          default:
            canvas.style.cursor = 'crosshair';
        }
      }
      
      // Debug log (reduced)
      if (activeTool !== 'select') {
        console.log('Active tool changed to:', activeTool);
      }
    }
  }, [activeTool]);

  // Set up event handlers when fabric canvas is ready
  useEffect(() => {
    console.log('🔧 Setting up event handlers, fabricCanvas exists:', !!fabricCanvasRef.current, 'activeTool:', activeTool);
    
    if (!fabricCanvasRef.current) {
      console.log('❌ No fabric canvas found');
      return;
    }
    
    const canvas = fabricCanvasRef.current;
    console.log('📐 Canvas dimensions:', canvas.getWidth(), 'x', canvas.getHeight());
    
    // Ensure canvas has proper pointer events
    const canvasElement = canvas.upperCanvasEl;
    if (canvasElement) {
      canvasElement.style.pointerEvents = 'auto';
    }
    
    // Remove existing handlers
    canvas.off('mouse:down');
    
    // Only add handlers for annotation tools (not select or freehand)
    if (activeTool && activeTool !== 'select' && activeTool !== 'freehand') {
      console.log('🎯 Adding mouse handler for tool:', activeTool);
      

      
      const handleMouseDown = (e: any) => {
        if (!canvas || readOnly) return;
        
        // Check if we clicked on an existing object
        const target = canvas.findTarget(e.e, false);
        if (target && target.data?.isAnnotation) {
          // Just select the object and let Fabric.js handle dragging
          return; // Don't interfere with existing objects
        }
        
        // Don't create new text box if we just finished editing one
        if (justFinishedEditing && activeTool === 'text') {
          console.log('🚫 Preventing new text box creation - just finished editing');
          return;
        }
        
        const pointer = canvas.getPointer(e.e);
        
        // Create annotation based on active tool
        if (activeTool === 'text') {
          // Save state before creating new text box
          saveCanvasState();
          
          // Create text box with placeholder text that gets properly replaced
          const textObj = new (fabric as any).IText('Type text here', {
            left: pointer.x,
            top: pointer.y,
            fontSize: 16,
            fill: '#999999', // Start with grey placeholder
            fontWeight: 'normal',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'normal',
            selectable: true,
            editable: true,
            evented: true,
            moveCursor: 'grab',
            hoverCursor: 'grab',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            stroke: '', // No stroke on text itself
            strokeWidth: 0,
            padding: 4,
            hasControls: false, // Remove corner resize handles
            hasBorders: true, // Keep border for selection
            borderColor: '#3B82F6',
            lockScalingX: true, // Prevent manual scaling
            lockScalingY: true, // Prevent manual scaling
            data: {
              isAnnotation: true,
              type: 'text',
              id: Date.now().toString(),
              isPlaceholder: true, // Track if this is placeholder text
              // Store original coordinates for scaling - convert from current scale to original scale
              originalX: pointer.x / scaleRef.current,
              originalY: pointer.y / scaleRef.current,
              originalWidth: 100 / scaleRef.current, // Approximate text width
              originalHeight: 20 / scaleRef.current, // Approximate text height
              originalFontSize: 16 / scaleRef.current
            }
          });
          
          // Handle text editing with robust placeholder management
          let isEditingMode = false;
          
          textObj.on('editing:entered', function() {
            console.log('🖊️ Text editing started');
            isEditingMode = true;
            // Clear placeholder text immediately when editing starts
            if (textObj.data?.isPlaceholder) {
              // Use selectAll() and then delete to properly clear
              textObj.selectAll();
              textObj.removeChars(0, textObj.text.length);
              textObj.fill = '#000000';
              textObj.data.isPlaceholder = false;
              canvas.renderAll();
            }
          });
          
          // Handle text changes during editing - prevent any placeholder interference
          textObj.on('text:changed', function() {
            if (isEditingMode && textObj.data?.isPlaceholder === false) {
              // Ensure coordinates are updated and no placeholder text sneaks in
              textObj.setCoords();
              // Make sure we're not in placeholder state while typing
              if (textObj.text === 'Type text here') {
                textObj.text = '';
              }
            }
          });
          
          textObj.on('editing:exited', function() {
            console.log('🖊️ Text editing ended');
            isEditingMode = false;
            
            // Set global flag to prevent immediate new text box creation
            setJustFinishedEditing(true);
            
            // Clear the flag after a short delay
            if (editingTimeoutRef.current) clearTimeout(editingTimeoutRef.current);
            editingTimeoutRef.current = setTimeout(() => {
              setJustFinishedEditing(false);
              console.log('🔓 Text editing cooldown ended - new text boxes allowed');
            }, 300); // Increased to 300ms for better reliability
            
            // Only restore placeholder if completely empty
            if (textObj.text.trim() === '') {
              textObj.text = 'Type text here';
              textObj.fill = '#999999';
              textObj.fontWeight = 'normal';
              textObj.data.isPlaceholder = true;
              canvas.renderAll();
            }
          });
          

          
          // Add to canvas
          canvas.add(textObj);
          canvas.setActiveObject(textObj);
          
          // Don't start editing immediately - let user see the placeholder first
          // textObj.enterEditing();
          
          canvas.renderAll();
          
          // Auto-switch to select tool after creating text box
          console.log('🎯 Auto-switching to select tool after text box creation');
          
          // If using external tool control, notify parent to change tool
          if (externalActiveTool) {
            // For external tool control, we need to notify the parent component
            console.log('🎯 Notifying parent to switch external tool to select');
            onPDFControlsChange?.({
              currentPage,
              totalPages,
              scale,
              goToPreviousPage,
              goToNextPage,
              zoomIn,
              zoomOut,
              resetZoom,
              undo,
              redo,
              activeTool: 'select'  // Request parent to change tool
            });
          } else {
            // For internal tool control, change internal state
            setInternalActiveTool('select');
          }
        } else if (activeTool === 'rectangle') {
          console.log('🔲 Creating rectangle annotation');
          const rectObj = new (fabric as any).Rect({
            left: pointer.x,
            top: pointer.y,
            width: 100,
            height: 60,
            fill: 'transparent',
            stroke: toolProperties.color,
            strokeWidth: toolProperties.strokeWidth,
            selectable: true,
            data: {
              isAnnotation: true,
              type: 'rectangle',
              id: Date.now().toString(),
              // Store original coordinates for scaling - convert from current scale to original scale
              originalX: pointer.x / scaleRef.current,
              originalY: pointer.y / scaleRef.current,
              originalWidth: 100 / scaleRef.current,
              originalHeight: 60 / scaleRef.current
            }
          });
          canvas.add(rectObj);
          canvas.renderAll();
        } else if (activeTool === 'circle') {
          console.log('⭕ Creating circle annotation');
          const circleObj = new (fabric as any).Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 30,
            fill: 'transparent',
            stroke: toolProperties.color,
            strokeWidth: toolProperties.strokeWidth,
            selectable: true,
            data: {
              isAnnotation: true,
              type: 'circle',
              id: Date.now().toString(),
              // Store original coordinates for scaling - convert from current scale to original scale
              originalX: pointer.x / scaleRef.current,
              originalY: pointer.y / scaleRef.current,
              originalWidth: 60 / scaleRef.current, // diameter
              originalHeight: 60 / scaleRef.current  // diameter
            }
          });
          canvas.add(circleObj);
          canvas.renderAll();
        }
      };
      
      canvas.on('mouse:down', handleMouseDown);
    }
  }, [activeTool, toolProperties, readOnly]);

  // Handle tool properties changes to update selected text objects
  useEffect(() => {
    if (fabricCanvasRef.current && toolProperties) {
      const canvas = fabricCanvasRef.current;
      const activeObject = canvas.getActiveObject();
      
      console.log('🎨 Tool properties changed:', toolProperties);
      console.log('🎯 Active object:', activeObject);
      
      if (activeObject && activeObject.data?.isAnnotation) {
        console.log('📝 Updating object type:', activeObject.type, 'isPlaceholder:', activeObject.data?.isPlaceholder);
        
        // Update the active object with new properties
        if (activeObject.type === 'i-text' || activeObject.type === 'text') {
          // For text objects, always update color (even for placeholder)
          console.log('✏️ Setting text color to:', toolProperties.color);
          activeObject.set('fill', toolProperties.color);
          canvas.renderAll();
        } else {
          // For shapes, update color and other properties
          console.log('🔲 Setting shape color to:', toolProperties.color);
          activeObject.set({
            fill: toolProperties.color,
            stroke: toolProperties.color,
            strokeWidth: toolProperties.strokeWidth,
            opacity: toolProperties.opacity
          });
          canvas.renderAll();
        }
      } else {
        console.log('❌ No active annotation object to update');
      }
    }
  }, [toolProperties]);

  // Handle scale changes and re-render when scale updates
  // Note: This is now handled directly by zoom functions to avoid conflicts
  // useEffect(() => {
  //   if (pdfDocRef.current && currentPage > 0) {
  //     // Use a small delay to ensure state is fully updated
  //     const timeoutId = setTimeout(() => {
  //       renderPage(currentPage);
  //     }, 50);
  //     
  //     return () => clearTimeout(timeoutId);
  //   }
  // }, [scale, currentPage]);

  useEffect(() => {
    setIsClient(true);
    return () => {
      fabricCanvasRef.current?.dispose();
    };
  }, []);

  // Notify parent of control changes (only when values change, not functions)
  useEffect(() => {
    if (onPDFControlsChange && totalPages > 0) {
      onPDFControlsChange({
        currentPage,
        totalPages,
        scale,
        goToPreviousPage,
        goToNextPage,
        zoomIn,
        zoomOut,
        resetZoom,
        undo,
        redo
      });
    }
  }, [currentPage, totalPages, scale]); // Only depend on values, not functions

  // Drag and pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'select') {
      // Check if we're clicking on an annotation - if so, don't start panning
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const pointer = canvas.getPointer(e.nativeEvent);
        const target = canvas.findTarget(e.nativeEvent, false);
        
        // Only start panning if we're NOT over an annotation
        if (!target || !target.data?.isAnnotation) {
          setIsDragging(true);
          setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
          e.preventDefault();
        }
      }
    }
  }, [activeTool, panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && activeTool === 'select') {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, activeTool]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);







    return (
    <div className="w-full h-full flex flex-col">
      {/* PDF Viewer Container */}
      <div className={`pdf-viewer-container group ${className}`} ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        
        {/* PDF Display Area */}
        <div className="pdf-display-area overflow-hidden relative" 
             style={{ 
               width: '100%', 
               height: 'calc(100vh - 120px)', 
               zIndex: 1, 
               cursor: activeTool === 'select' ? (isDragging ? 'grabbing' : 'grab') : 'default' 
             }}
             onMouseDown={activeTool === 'select' ? handleMouseDown : undefined}
             onMouseMove={activeTool === 'select' ? handleMouseMove : undefined}
             onMouseUp={activeTool === 'select' ? handleMouseUp : undefined}
             onMouseLeave={activeTool === 'select' ? handleMouseLeave : undefined}>
          
          {/* Canvas Container */}
          <div className="flex justify-center items-start min-h-full">
            <div className="relative p-4" style={{ 
              transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}>
              
              {/* Canvas Container - PDF as background, Fabric as foreground */}
              <div 
                className="relative inline-block border border-gray-300 shadow-lg bg-white rounded-lg overflow-hidden"
                style={{ isolation: 'isolate' }}
              >
                
                {/* PDF Canvas - Hidden but needs to be rendered for data extraction */}
                <canvas
                  ref={canvasRef}
                  style={{ 
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    visibility: 'hidden'
                  }}
                />
                
                {/* Annotations Canvas - Main interactive layer with PDF as background */}
                <canvas
                  id="annotations-canvas"
                  className="block max-w-full h-auto"
                  style={{ 
                    pointerEvents: 'auto',
                    backgroundImage: 'none', // Will be set programmatically
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    display: 'block'
                  }}
                />
              </div>
              
              {/* Performance indicator for large files */}
              {totalPages > 100 && (
                <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                  Large PDF ({totalPages} pages)
                </div>
              )}
            </div>
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 backdrop-blur-sm">
              <div className="text-center space-y-6 p-8 bg-white rounded-xl shadow-2xl border border-gray-200">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-xl font-semibold text-gray-700">Loading PDF...</div>
                <div className="text-sm text-gray-500 max-w-xs">
                  This may take a moment for large files
                </div>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 backdrop-blur-sm">
              <div className="text-center space-y-6 p-8 bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md mx-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="text-xl font-semibold text-red-600">PDF Loading Failed</div>
                <div className="text-sm text-gray-600">{error}</div>
                <button
                  onClick={() => loadPDF(fileUrl!)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Rendering overlay */}
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 backdrop-blur-sm">
              <div className="text-center space-y-6 p-8 bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md mx-4">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-lg font-semibold text-gray-700">Rendering Page {currentPage}</div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${renderProgress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {renderProgress}% complete
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export with dynamic import to prevent SSR issues
const PDFViewer = dynamic(() => Promise.resolve(PDFViewerComponent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-lg">Loading PDF Viewer...</div>
    </div>
  )
});

export default PDFViewer;