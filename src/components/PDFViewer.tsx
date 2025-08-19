"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

// Dynamically import PDF.js and Fabric.js only on client-side
const pdfjs = typeof window !== 'undefined' ? require('pdfjs-dist') : null;
const fabric = typeof window !== 'undefined' ? require('fabric').fabric : null;

// PDF.js worker setup
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
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
}

function PDFViewerComponent({
  fileUrl,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  annotations = [],
  readOnly = false,
  className = ""
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState<MarkupTool>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [pageCache, setPageCache] = useState<Map<number, ImageData>>(new Map());

  // Keyboard shortcuts
  useHotkeys('ctrl+z', () => undo(), { enableOnTags: ['INPUT', 'TEXTAREA'] });
  useHotkeys('ctrl+y', () => redo(), { enableOnTags: ['INPUT', 'TEXTAREA'] });
  useHotkeys('delete', () => deleteSelected());
  useHotkeys('escape', () => setActiveTool('select'));

  const loadPDF = useCallback(async (url: string) => {
    if (!url || !pdfjs) return;
    
    setIsLoading(true);
    try {
      const pdf = await pdfjs.getDocument(url).promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      await renderPage(1, pdf);
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderPage = async (pageNum: number, pdf?: any) => {
    const pdfDoc = pdf || pdfDocRef.current;
    if (!pdfDoc || !canvasRef.current || !fabric) return;

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
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Optimize canvas for better performance
      const dpr = window.devicePixelRatio || 1;
      if (dpr > 1) {
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        context.scale(dpr, dpr);
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        intent: 'display',
        renderInteractiveForms: false, // Disable for better performance
        transform: dpr > 1 ? [dpr, 0, 0, dpr, 0, 0] : null
      };

      // Start render task with progress tracking
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      // Simulate progress for large files
      const progressInterval = setInterval(() => {
        setRenderProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await renderTask.promise;
      clearInterval(progressInterval);
      setRenderProgress(100);

      // Initialize or update Fabric.js canvas
      if (!fabricCanvasRef.current) {
        const fabricCanvas = new fabric.Canvas(canvas, {
          isDrawingMode: false,
          selection: activeTool === 'select',
          preserveObjectStacking: true,
          renderOnAddRemove: false, // Optimize for bulk operations
          skipTargetFind: false,
          perPixelTargetFind: true
        });
        
        fabricCanvasRef.current = fabricCanvas;
        setupFabricEventListeners(fabricCanvas);
      } else {
        // Temporarily disable rendering during updates
        fabricCanvasRef.current.renderOnAddRemove = false;
        fabricCanvasRef.current.setDimensions({
          width: viewport.width,
          height: viewport.height
        });
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.renderOnAddRemove = true;
      }

      // Load annotations for current page
      loadAnnotationsForPage(pageNum);
      
      // Cache the rendered page for smaller files
      if (totalPages < 50 && scale === 1.0) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        setPageCache(prev => new Map(prev).set(pageNum, imageData));
      }

    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
    } finally {
      setIsRendering(false);
      setRenderProgress(0);
      renderTaskRef.current = null;
    }
  };

  const setupFabricEventListeners = (fabricCanvas: fabric.Canvas) => {
    fabricCanvas.on('object:added', (e) => {
      if (e.target && !readOnly) {
        const obj = e.target;
        if (obj.data?.isAnnotation) {
          const annotation = createAnnotationFromObject(obj);
          onAnnotationAdd?.(annotation);
        }
      }
    });

    fabricCanvas.on('object:modified', (e) => {
      if (e.target && !readOnly) {
        const obj = e.target;
        if (obj.data?.isAnnotation) {
          const annotation = createAnnotationFromObject(obj);
          onAnnotationUpdate?.(annotation);
        }
      }
    });

    fabricCanvas.on('selection:created', (e) => {
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
    const rect = new fabric.Rect({
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
    const circle = new fabric.Circle({
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
    const line = new fabric.Line([x, y, x, y], {
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
    const text = new fabric.IText('Click to edit', {
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
    
    const cloud = new fabric.Path(cloudPath, {
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
    const stamp = new fabric.Group([
      new fabric.Rect({
        width: 100,
        height: 40,
        fill: 'transparent',
        stroke: '#ff0000',
        strokeWidth: 3,
        rx: 5,
        ry: 5
      }),
      new fabric.Text(stampText, {
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
    const callout = new fabric.Group([
      new fabric.Rect({
        width: 120,
        height: 60,
        fill: '#ffffcc',
        stroke: '#333333',
        strokeWidth: 1,
        rx: 3,
        ry: 3
      }),
      new fabric.Triangle({
        width: 10,
        height: 10,
        fill: '#ffffcc',
        stroke: '#333333',
        strokeWidth: 1,
        left: -5,
        top: 25,
        angle: -90
      }),
      new fabric.IText('Add comment...', {
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
    const line = new fabric.Line([x, y, x, y], {
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
        const rect = activeObject as fabric.Rect;
        rect.set({
          width: Math.abs(currentX - startX),
          height: Math.abs(currentY - startY),
          left: Math.min(startX, currentX),
          top: Math.min(startY, currentY)
        });
        break;
      case 'circle':
        const circle = activeObject as fabric.Circle;
        const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)) / 2;
        circle.set({
          radius: radius,
          left: startX - radius,
          top: startY - radius
        });
        break;
      case 'arrow':
        const line = activeObject as fabric.Line;
        line.set({
          x2: currentX,
          y2: currentY
        });
        break;
      case 'measurement':
        const measureLine = activeObject as fabric.Line;
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
          (existingText as fabric.Text).set({
            text: measurementText,
            left: (startX + currentX) / 2,
            top: (startY + currentY) / 2 - 10
          });
        } else {
          const text = new fabric.Text(measurementText, {
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

  const createAnnotationFromObject = (obj: fabric.Object): Annotation => {
    return {
      id: obj.data?.id || uuidv4(),
      type: obj.data?.type || 'rectangle',
      pageNumber: currentPage,
      x: obj.left || 0,
      y: obj.top || 0,
      width: (obj as any).width || 0,
      height: (obj as any).height || 0,
      color: (obj as any).fill || 'transparent',
      strokeColor: (obj as any).stroke || '#ff0000',
      strokeWidth: (obj as any).strokeWidth || 2,
      text: (obj as any).text || '',
      fontSize: (obj as any).fontSize || 16,
      fontFamily: (obj as any).fontFamily || 'Arial',
      opacity: obj.opacity || 1,
      author: 'Current User', // This should come from auth context
      createdAt: new Date(),
      modifiedAt: new Date(),
      comments: []
    };
  };

  const loadAnnotationsForPage = (pageNum: number) => {
    const pageAnnotations = annotations.filter(ann => ann.pageNumber === pageNum);
    
    pageAnnotations.forEach(annotation => {
      let fabricObject: fabric.Object;

      switch (annotation.type) {
        case 'rectangle':
          fabricObject = new fabric.Rect({
            left: annotation.x,
            top: annotation.y,
            width: annotation.width,
            height: annotation.height,
            fill: annotation.color,
            stroke: annotation.strokeColor,
            strokeWidth: annotation.strokeWidth,
            opacity: annotation.opacity,
            selectable: !readOnly,
            data: {
              isAnnotation: true,
              type: annotation.type,
              id: annotation.id
            }
          });
          break;
        case 'circle':
          fabricObject = new fabric.Circle({
            left: annotation.x,
            top: annotation.y,
            radius: annotation.width / 2,
            fill: annotation.color,
            stroke: annotation.strokeColor,
            strokeWidth: annotation.strokeWidth,
            opacity: annotation.opacity,
            selectable: !readOnly,
            data: {
              isAnnotation: true,
              type: annotation.type,
              id: annotation.id
            }
          });
          break;
        case 'text':
          fabricObject = new fabric.IText(annotation.text || 'Text', {
            left: annotation.x,
            top: annotation.y,
            fontSize: annotation.fontSize || 16,
            fontFamily: annotation.fontFamily || 'Arial',
            fill: annotation.strokeColor,
            opacity: annotation.opacity,
            selectable: !readOnly,
            editable: !readOnly,
            data: {
              isAnnotation: true,
              type: annotation.type,
              id: annotation.id
            }
          });
          break;
        default:
          return;
      }

      fabricCanvasRef.current?.add(fabricObject);
    });

    fabricCanvasRef.current?.renderAll();
  };

  const undo = () => {
    // Implement undo functionality
    console.log('Undo');
  };

  const redo = () => {
    // Implement redo functionality
    console.log('Redo');
  };

  const deleteSelected = () => {
    const activeObject = fabricCanvasRef.current?.getActiveObject();
    if (activeObject && activeObject.data?.isAnnotation) {
      fabricCanvasRef.current?.remove(activeObject);
      onAnnotationDelete?.(activeObject.data.id);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  };

  const zoomIn = () => {
    const newScale = Math.min(scale * 1.25, 3.0);
    setScale(newScale);
    renderPage(currentPage);
  };

  const zoomOut = () => {
    const newScale = Math.max(scale * 0.8, 0.25);
    setScale(newScale);
    renderPage(currentPage);
  };

  const resetZoom = () => {
    setScale(1.0);
    renderPage(currentPage);
  };

  useEffect(() => {
    if (fileUrl) {
      loadPDF(fileUrl);
    }
  }, [fileUrl, loadPDF]);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.selection = activeTool === 'select';
      fabricCanvasRef.current.isDrawingMode = activeTool === 'freehand';
    }
  }, [activeTool]);

  useEffect(() => {
    return () => {
      fabricCanvasRef.current?.dispose();
    };
  }, []);

  return (
    <div className={`pdf-viewer-container ${className}`} ref={containerRef}>
      {/* Toolbar */}
      <div className="pdf-toolbar bg-white border-b border-gray-300 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Navigation */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="p-2 text-gray-700 rounded disabled:text-gray-400 hover:bg-gray-200 transition-colors disabled:hover:bg-transparent"
              title="Previous page"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 px-2 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="p-2 text-gray-700 rounded disabled:text-gray-400 hover:bg-gray-200 transition-colors disabled:hover:bg-transparent"
              title="Next page"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="border-l border-gray-300 h-6"></div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button 
              onClick={zoomOut} 
              className="p-2 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 px-2 font-mono min-w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={zoomIn} 
              className="p-2 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={resetZoom} 
              className="px-3 py-2 text-gray-600 text-xs rounded hover:bg-gray-200 hover:text-gray-800 transition-colors"
              title="Reset zoom"
            >
              Fit
            </button>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center space-x-2">
            {/* Markup tools */}
            <button
              onClick={() => setActiveTool('select')}
              className={`px-3 py-1 rounded ${activeTool === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Select
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`px-3 py-1 rounded ${activeTool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveTool('rectangle')}
              className={`px-3 py-1 rounded ${activeTool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Rectangle
            </button>
            <button
              onClick={() => setActiveTool('circle')}
              className={`px-3 py-1 rounded ${activeTool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Circle
            </button>
            <button
              onClick={() => setActiveTool('arrow')}
              className={`px-3 py-1 rounded ${activeTool === 'arrow' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Arrow
            </button>
            <button
              onClick={() => setActiveTool('freehand')}
              className={`px-3 py-1 rounded ${activeTool === 'freehand' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Draw
            </button>
          </div>
        )}
      </div>

      {/* PDF Display Area */}
      <div className="pdf-display-area flex-1 overflow-auto bg-gray-100 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-lg text-gray-600">Loading PDF...</div>
              <div className="text-sm text-gray-500">
                This may take a moment for large files
              </div>
            </div>
          </div>
        ) : isRendering ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-lg text-gray-600">Rendering Page {currentPage}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500">
                {renderProgress}% complete
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 shadow-lg bg-white rounded max-w-full h-auto"
              />
              {/* Performance indicator for large files */}
              {totalPages > 100 && (
                <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                  Large PDF ({totalPages} pages)
                </div>
              )}
            </div>
          </div>
        )}
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