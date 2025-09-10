"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

type MarkupTool = 'select' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'highlight' | 'measurement' | 'stamp' | 'freehand' | 'callout';

interface PDFViewerV2Props {
  fileUrl?: string;
  className?: string;
  activeTool?: MarkupTool;
  toolProperties?: {
    color: string;
    strokeWidth: number;
    opacity: number;
    fontSize?: number;
    scallopSize?: number;
    cloudLineThickness?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
    textAlign?: 'left' | 'center' | 'right';
  };
  toolPropsVersion?: number;
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
  onToolChange?: (tool: MarkupTool) => void;
  onSyncToolProperties?: (props: any, tool: MarkupTool) => void;
  stampTemplate?: { title: string; status?: 'APPROVED' | 'AS-BUILT' | 'REJECTED' | 'CUSTOM'; color?: string; opacity?: number; strokeWidth?: number; logoUrl?: string; fontSize?: number } | null;
}

export default function PDFViewerV2({
  fileUrl,
  className = "",
  activeTool,
  toolProperties,
  toolPropsVersion,
  onPDFControlsChange,
  onToolChange,
  onSyncToolProperties,
  stampTemplate
}: PDFViewerV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Simple shape model for v2 with per-shape styling
  type FreehandPoint = { x: number; y: number };
  type FreehandPath = { points: FreehandPoint[]; color: string; strokeWidth: number; opacity: number };
  type Rect = { x: number; y: number; w: number; h: number; color: string; strokeWidth: number; opacity: number };
  type Circle = { x: number; y: number; r: number; color: string; strokeWidth: number; opacity: number };
  type Arrow = { x1: number; y1: number; x2: number; y2: number; color: string; strokeWidth: number; opacity: number };
  type TextBox = { x: number; y: number; w: number; h: number; text: string; color: string; fontSize: number; opacity: number; strokeWidth: number; fontWeight?: number; fontStyle?: 'normal' | 'italic'; textDecoration?: 'none' | 'underline'; textAlign?: 'left' | 'center' | 'right'; borderEnabled?: boolean; borderWidth?: number; baseW?: number; baseH?: number };
  type Callout = { x: number; y: number; w: number; h: number; text: string; color: string; fontSize: number; opacity: number; strokeWidth: number; anchorX: number; anchorY: number; fontWeight?: number; fontStyle?: 'normal' | 'italic'; textDecoration?: 'none' | 'underline'; textAlign?: 'left' | 'center' | 'right'; baseW?: number; baseH?: number };
  type Cloud = { x: number; y: number; w: number; h: number; color: string; strokeWidth: number; opacity: number; scallopSize: number };
  type Stamp = { x: number; y: number; w: number; h: number; title: string; status: 'APPROVED' | 'AS-BUILT' | 'REJECTED' | 'CUSTOM'; company?: string; author?: string; date?: string; color: string; opacity: number; strokeWidth: number; logoUrl?: string; fontSize?: number };
  const [freehands, setFreehands] = useState<FreehandPath[]>([]);
  const [rects, setRects] = useState<Rect[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [texts, setTexts] = useState<TextBox[]>([]);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const stampsRef = useRef<Stamp[]>([]);
  useEffect(() => { stampsRef.current = stamps; }, [stamps]);
  const stampTemplateRef = useRef<typeof stampTemplate>(null);
  useEffect(() => { stampTemplateRef.current = stampTemplate; }, [stampTemplate]);
  const movingStampRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const drawingRef = useRef<FreehandPath | Rect | Circle | Arrow | TextBox | Callout | Cloud | null>(null);
  const renderingRef = useRef<Promise<void> | null>(null);
  const movingCalloutRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  // Generic selection + move/resize refs per tool
  const [selectedRect, setSelectedRect] = useState<number | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<number | null>(null);
  const [selectedCallout, setSelectedCallout] = useState<number | null>(null);
  const [selectedArrow, setSelectedArrow] = useState<number | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<number | null>(null);
  const selectedStampRef = useRef<number | null>(null);
  useEffect(() => { selectedStampRef.current = selectedStamp; }, [selectedStamp]);
  const movingRectRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const resizingRectRef = useRef<{ index: number; anchor: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' } | null>(null);
  const movingCloudRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const resizingCloudRef = useRef<{ index: number; anchor: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' } | null>(null);
  const [selectedCloud, setSelectedCloud] = useState<number | null>(null);
  const movingTextRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const resizingTextRef = useRef<{ index: number; anchor: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' } | null>(null);
  const movingCircleRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const resizingCircleRef = useRef<{ index: number; anchor: 'n' | 'e' | 's' | 'w' } | null>(null);
  const movingCalloutBoxRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const resizingCalloutRef = useRef<{ index: number; anchor: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' } | null>(null);
  const movingArrowRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const resizingArrowRef = useRef<{ index: number; end: 'start' | 'end' } | null>(null);
  const resizingStampRef = useRef<{ index: number; anchor: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' } | null>(null);
  const [activeEditor, setActiveEditor] = useState<{ kind: 'text' | 'callout' | 'stamp'; index: number } | null>(null);
  const [editorValue, setEditorValue] = useState<string>("");
  const skipApplyRef = useRef<{ text: boolean; callout: boolean }>({ text: false, callout: false });

  // History timeline (single array + index)
  type Snapshot = { freehands: FreehandPath[]; rects: Rect[]; circles: Circle[]; arrows: Arrow[]; texts: TextBox[]; callouts: Callout[]; clouds: Cloud[] };
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const interactionChangedRef = useRef<boolean>(false);
  const historyInitializedRef = useRef<boolean>(false);
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  const takeSnapshot = (): Snapshot => ({
    freehands: clone(freehands), rects: clone(rects), circles: clone(circles), arrows: clone(arrows), texts: clone(texts), callouts: clone(callouts), clouds: clone(clouds)
  });
  const ensureHistoryInitialized = () => {
    if (historyInitializedRef.current) return;
    const initial = takeSnapshot();
    historyRef.current = [initial];
    historyIndexRef.current = 0;
    historyInitializedRef.current = true;
  };
  const beginInteraction = () => {
    ensureHistoryInitialized();
    interactionChangedRef.current = false;
  };
  const commitNow = () => {
    ensureHistoryInitialized();
    const after = takeSnapshot();
    const last = historyRef.current[historyIndexRef.current];
    const same = JSON.stringify(after) === JSON.stringify(last);
    if (same) { interactionChangedRef.current = false; return; }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(after);
    historyIndexRef.current = historyRef.current.length - 1;
    interactionChangedRef.current = false;
  };
  const commitInteraction = () => { commitNow(); };
  const applySnapshot = (s: Snapshot) => {
    setFreehands(clone(s.freehands));
    setRects(clone(s.rects));
    setCircles(clone(s.circles));
    setArrows(clone(s.arrows));
    setTexts(clone(s.texts));
    setCallouts(clone(s.callouts));
    setClouds(clone(s.clouds));
    setSelectedRect(null); setSelectedCircle(null); setSelectedText(null); setSelectedCallout(null); setSelectedArrow(null); setSelectedCloud(null);
    setActiveEditor(null);
    drawOverlay();
  };
  const undo = () => {
    ensureHistoryInitialized();
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    applySnapshot(historyRef.current[historyIndexRef.current]);
  };
  const redo = () => {
    ensureHistoryInitialized();
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    applySnapshot(historyRef.current[historyIndexRef.current]);
  };

  // Coerced tool properties with defaults
  const coercedProps = {
    color: toolProperties?.color || '#ff0000',
    strokeWidth: Math.max(1, toolProperties?.strokeWidth || 2),
    opacity: toolProperties?.opacity ?? 1,
    fontSize: Math.max(8, toolProperties?.fontSize || 14),
    fontWeight: toolProperties?.fontWeight || 300,
    fontStyle: toolProperties?.fontStyle || 'normal',
    textDecoration: toolProperties?.textDecoration || 'none',
    textAlign: toolProperties?.textAlign || 'left',
    textBorder: (toolProperties as any)?.textBorder ?? true,
    textBoxLineThickness: (toolProperties as any)?.textBoxLineThickness ?? 1.5
  };
  const cloudStrokeWidth = Math.max(1, (toolProperties?.cloudLineThickness ?? toolProperties?.strokeWidth ?? 2));
  const cloudScallopSize = Math.max(4, toolProperties?.scallopSize ?? 8);

  // Provide controls upwards only when values change (not when parent re-renders)
  useEffect(() => {
    if (!onPDFControlsChange) return;
    onPDFControlsChange({
      currentPage,
      totalPages,
      scale,
      goToPreviousPage: () => setCurrentPage(p => Math.max(1, p - 1)),
      goToNextPage: () => setCurrentPage(p => Math.min(totalPages || p, p + 1)),
      zoomIn: () => setScale(s => Math.min(3, s * 1.25)),
      zoomOut: () => setScale(s => Math.max(0.25, s * 0.8)),
      resetZoom: () => setScale(1),
      undo,
      redo,
      activeTool
    });
    // Intentionally exclude onPDFControlsChange from deps to avoid loops when parent
    // recreates the callback each render. We only care when values above change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages, scale, activeTool]);

  // Load PDF when fileUrl changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!fileUrl) return;
      const pdfjsLib: any = await import("pdfjs-dist");
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      }
      // Prefer passing raw data to avoid any URL/cors/worker fetch edge cases
      let data: Uint8Array | null = null;
      try {
        const resp = await fetch(fileUrl);
        const buf = await resp.arrayBuffer();
        data = new Uint8Array(buf);
      } catch {
        // Fallback to URL mode if fetch fails
      }
      const loadingTask = data ? pdfjsLib.getDocument({ data }) : pdfjsLib.getDocument(fileUrl);
      const doc = await loadingTask.promise;
      if (cancelled) return;
      pdfRef.current = doc;
      setTotalPages(doc.numPages);
      setCurrentPage(1);
    }
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Render current page (also when a new document is loaded)
  useEffect(() => {
    async function render() {
      const canvas = canvasRef.current;
      const pdf = pdfRef.current;
      if (!canvas || !pdf || totalPages === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const page = await pdf.getPage(currentPage);
      const container = containerRef.current;
      // Available width uses container width when known, otherwise window width
      const containerWidth = container ? Math.max(container.clientWidth - 32, 200) : Math.max(window.innerWidth - 120, 200);
      // Available height is based on viewport height minus the container's top offset and a toolbar/header allowance
      const topOffset = container ? container.getBoundingClientRect().top : 80;
      const allowance = 140; // header + bottom toolbar + margins
      const availableHeight = Math.max(window.innerHeight - topOffset - allowance, 200);
      const viewport = page.getViewport({ scale: 1 });
      // Fit to both WIDTH and HEIGHT (contain), never upscale beyond 100%
      const fitScale = Math.min(containerWidth / viewport.width, availableHeight / viewport.height, 1);
      const finalScale = Math.max(0.1, fitScale * scale);
      const finalViewport = page.getViewport({ scale: finalScale });

      canvas.width = finalViewport.width;
      canvas.height = finalViewport.height;
      canvas.style.width = `${finalViewport.width}px`;
      canvas.style.height = `${finalViewport.height}px`;

      const renderContext = {
        canvasContext: ctx,
        viewport: finalViewport
      } as any;

      await page.render(renderContext).promise;

      // Match overlay size
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.width = canvas.width;
        overlay.height = canvas.height;
        overlay.style.width = canvas.style.width;
        overlay.style.height = canvas.style.height;
        drawOverlay();
      }
    }

    // Queue rendering to avoid races
    const running = (renderingRef.current = (async () => {
      try { await render(); } catch {}
    })());
    return () => { renderingRef.current = null; };
  }, [currentPage, scale, totalPages]);

  // Draw overlay shapes
  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const toDevice = (p: FreehandPoint) => ({ x: p.x * scale, y: p.y * scale });

    // Freehands (use per-path styling)
    ctx.lineCap = 'round';
    freehands.forEach(path => {
      if (!path || !Array.isArray(path.points) || path.points.length < 2) return;
      ctx.strokeStyle = path.color;
      ctx.globalAlpha = path.opacity;
      ctx.lineWidth = path.strokeWidth;
      const start = toDevice(path.points[0]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < path.points.length; i++) {
        const pt = toDevice(path.points[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Live freehand stroke (during drag)
    const live = drawingRef.current as any;
    if (live && Array.isArray(live.points) && live.points.length >= 1) {
      ctx.strokeStyle = live.color || '#ff0000';
      ctx.globalAlpha = live.opacity ?? 1;
      ctx.lineWidth = live.strokeWidth || 2;
      const start = toDevice(live.points[0]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < live.points.length; i++) {
        const pt = toDevice(live.points[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      // If only a single point, draw a tiny dot
      if (live.points.length === 1) {
        ctx.lineTo(start.x + 0.01, start.y + 0.01);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Live stamp rectangle while dragging
    if (live && live.kind === 'stamp') {
      const x = (live.w >= 0 ? live.x : live.x + live.w) * scale;
      const y = (live.h >= 0 ? live.y : live.y + live.h) * scale;
      const w = Math.max(40, Math.abs(live.w) * scale);
      const h = Math.max(24, Math.abs(live.h) * scale);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = live.color || '#ef4444';
      ctx.lineWidth = (live.strokeWidth || 2);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    // Rectangles (normalize negative width/height so they don't disappear)
    // Rectangles (per-shape styling)
    rects.forEach(r => {
      ctx.strokeStyle = r.color || '#0070f3';
      ctx.globalAlpha = (r.opacity ?? 1);
      ctx.lineWidth = r.strokeWidth || 2;
      const x = r.w >= 0 ? r.x : r.x + r.w;
      const y = r.h >= 0 ? r.y : r.y + r.h;
      const w = Math.abs(r.w);
      const h = Math.abs(r.h);
      ctx.strokeRect(x * scale, y * scale, w * scale, h * scale);
      ctx.globalAlpha = 1;
    });

    // Stamps (rounded rectangle card with header/title)
    const drawStamp = (s: Stamp) => {
      const x = s.x * scale, y = s.y * scale, w = Math.max(50, s.w) * scale, h = Math.max(30, s.h) * scale;
      const r = 10 * scale;
      ctx.globalAlpha = s.opacity ?? 1;
      ctx.strokeStyle = s.color || '#ef4444';
      ctx.lineWidth = s.strokeWidth || 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.stroke();
      // Title with word wrapping, centered both axes
      const fontPx = ((s.fontSize ?? 14) * scale);
      ctx.font = `${fontPx}px Arial`;
      ctx.fillStyle = s.color || '#ef4444';
      const padding = 12 * scale;
      const maxTextWidth = Math.max(10, w - padding * 2);
      const wrap = (text: string, maxWidth: number): string[] => {
        if (!text) return [];
        const tokens = text.split(/(\s+)/); // keep spaces for nicer wrapping
        const lines: string[] = [];
        let line = '';
        for (const tk of tokens) {
          const test = line + tk;
          if (ctx.measureText(test).width <= maxWidth || line.length === 0) {
            line = test;
          } else {
            lines.push(line.trimEnd());
            line = tk.trimStart();
          }
        }
        if (line) lines.push(line.trimEnd());
        return lines;
      };
      const lines = wrap(s.title || '', maxTextWidth);
      const totalHeight = lines.length * fontPx;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const startY = y + (h - totalHeight) / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + w / 2, startY + i * fontPx);
      }
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;

      // Selection handles when selected
      if (selectedStampRef.current !== null && (stampsRef.current[selectedStampRef.current] === s)) {
        const hw = 6;
        const drawHandleCircle = (cx: number, cy: number, radius = hw) => {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        };
        drawHandleCircle(x, y, hw);
        drawHandleCircle(x + w, y, hw);
        drawHandleCircle(x, y + h, hw);
        drawHandleCircle(x + w, y + h, hw);
        // Edge handles (N, E, S, W)
        drawHandleCircle(x + w / 2, y, hw);
        drawHandleCircle(x + w, y + h / 2, hw);
        drawHandleCircle(x + w / 2, y + h, hw);
        drawHandleCircle(x, y + h / 2, hw);
      }
    };
    (stampsRef.current || []).forEach(drawStamp);

    // Circles
    // Circles (per-shape styling)
    circles.forEach(c => {
      ctx.strokeStyle = c.color || '#0070f3';
      ctx.globalAlpha = (c.opacity ?? 1);
      ctx.lineWidth = c.strokeWidth || 2;
      ctx.beginPath();
      ctx.arc(c.x * scale, c.y * scale, c.r * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Arrows
    const drawArrow = (a: Arrow) => {
      const x1 = a.x1 * scale, y1 = a.y1 * scale, x2 = a.x2 * scale, y2 = a.y2 * scale;
      const headLength = 10; // in device pixels
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = a.color || '#ff0000';
      ctx.globalAlpha = (a.opacity ?? 1);
      ctx.lineWidth = a.strokeWidth || 2;
      ctx.stroke();
      // arrow head
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    arrows.forEach(drawArrow);

    // Text boxes
    // Helper: word wrap preserving explicit newlines
    const wrapLines = (rawText: string, maxWidth: number, font: string): string[] => {
      if (!rawText) return [];
      ctx.font = font;
      const segments = rawText.split(/\r?\n/);
      const out: string[] = [];
      for (const seg of segments) {
        const words = seg.split(/(\s+)/); // keep spaces
        let line = '';
        for (const token of words) {
          const test = line + token;
          if (ctx.measureText(test).width <= maxWidth || line.length === 0) {
            line = test;
          } else {
            out.push(line.trimEnd());
            line = token.trimStart();
          }
        }
        out.push(line.trimEnd());
      }
      return out;
    };

    // Text boxes (rendered via DOM for crispness) — do not draw canvas text
    texts.forEach(() => {});

    // Callouts (filled box + directional pointer triangle + text)
    const drawCallout = (c: Callout, opts?: { showText?: boolean }) => {
      const x = c.x, y = c.y, w = Math.max(40, c.w), h = Math.max(24, c.h);
      const r = 6 * scale;
      // Arrow from anchor to box center (arrowhead faces anchor)
      const cx = (x + w / 2) * scale;
      const cy = (y + h / 2) * scale;
      const ax = c.anchorX * scale;
      const ay = c.anchorY * scale;
      const angle = Math.atan2(cy - ay, cx - ax) + Math.PI;
      const headLength = 10;
      ctx.globalAlpha = c.opacity ?? 1;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = c.strokeWidth || 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLength * Math.cos(angle - Math.PI / 6), ay - headLength * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLength * Math.cos(angle + Math.PI / 6), ay - headLength * Math.sin(angle + Math.PI / 6));
      ctx.stroke();

      // Box on top
      const drawRounded = (fill: boolean) => {
        ctx.beginPath();
        const left = x * scale, top = y * scale, width = w * scale, height = h * scale;
        ctx.moveTo(left + r, top);
        ctx.arcTo(left + width, top, left + width, top + height, r);
        ctx.arcTo(left + width, top + height, left, top + height, r);
        ctx.arcTo(left, top + height, left, top, r);
        ctx.arcTo(left, top, left + width, top, r);
        if (fill) {
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        } else {
          ctx.stroke();
        }
      };
      drawRounded(true);
      ctx.strokeStyle = c.color;
      ctx.lineWidth = c.strokeWidth || 1.5;
      drawRounded(false);

      const padding = 8 * scale;
      ctx.font = `${c.fontSize * scale}px Arial`;
      ctx.fillStyle = '#111827';
      if (opts?.showText !== false) {
        const content = (c.text && c.text !== 'Type text here') ? c.text : '';
        if (content) {
          const maxWidth = (w * scale) - padding * 2;
          const lines = wrapLines(content, maxWidth, `${c.fontSize * scale}px Arial`);
          for (let li = 0; li < lines.length; li++) {
            ctx.fillText(lines[li], (x * scale) + padding, (y * scale) + padding + (li + 1) * (c.fontSize * scale));
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    // Callout boxes drawn on canvas (arrow + box), but text is rendered via DOM
    callouts.forEach((c) => drawCallout(c, { showText: false }));

    // Helper: minimal circular handle
    const drawHandle = (cx: number, cy: number, radius = 5) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Clouds (scalloped rectangle) — even distribution; stroke each arc separately to avoid connecting lines
    const drawCloud = (c: Cloud) => {
      const x = c.w >= 0 ? c.x : c.x + c.w;
      const y = c.h >= 0 ? c.y : c.y + c.h;
      const w = Math.max(10, Math.abs(c.w));
      const h = Math.max(10, Math.abs(c.h));
      const rBase = Math.max(4, c.scallopSize) * scale;
      const W = w * scale, H = h * scale;
      const nTop = Math.max(1, Math.ceil(W / (2 * rBase)));
      const nRight = Math.max(1, Math.ceil(H / (2 * rBase)));
      const stepTop = W / nTop, stepRight = H / nRight;
      const rTop = stepTop / 2, rRight = stepRight / 2, rBottom = rTop, rLeft = rRight;

      ctx.strokeStyle = c.color || '#ff0000';
      ctx.globalAlpha = (c.opacity ?? 1);
      ctx.lineWidth = c.strokeWidth || 2;

      const strokeArc = (cx: number, cy: number, rr: number, a0: number, a1: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, rr, a0, a1, false);
        ctx.stroke();
      };
      // Top
      for (let i = 0; i < nTop; i++) strokeArc(x * scale + (i + 0.5) * stepTop, y * scale, rTop, Math.PI, 0);
      // Right
      for (let i = 0; i < nRight; i++) strokeArc((x + w) * scale, y * scale + (i + 0.5) * stepRight, rRight, -Math.PI / 2, Math.PI / 2);
      // Bottom
      for (let i = 0; i < nTop; i++) strokeArc(x * scale + (i + 0.5) * stepTop, (y + h) * scale, rBottom, 0, Math.PI);
      // Left
      for (let i = 0; i < nRight; i++) strokeArc(x * scale, y * scale + (i + 0.5) * stepRight, rLeft, Math.PI / 2, -Math.PI / 2);
      // No extra corner arcs (edge scallops already meet at corners)
      ctx.globalAlpha = 1;
    };
    clouds.forEach(drawCloud);
    // Draw selection handles for active cloud
    if (selectedCloud !== null && clouds[selectedCloud]) {
      const c = clouds[selectedCloud];
      const x = c.w >= 0 ? c.x : c.x + c.w;
      const y = c.h >= 0 ? c.y : c.y + c.h;
      const w = Math.abs(c.w);
      const h = Math.abs(c.h);
      const left = x * scale, top = y * scale, right = (x + w) * scale, bottom = (y + h) * scale;
      const midX = (left + right) / 2, midY = (top + bottom) / 2;
      const hs = [
        { x: left, y: top }, { x: midX, y: top }, { x: right, y: top },
        { x: right, y: midY }, { x: right, y: bottom }, { x: midX, y: bottom },
        { x: left, y: bottom }, { x: left, y: midY }
      ];
      hs.forEach(hp => drawHandle(hp.x, hp.y, 5));
    }

    // Draw selection handles for rectangles
    if (selectedRect !== null && rects[selectedRect]) {
      const r = rects[selectedRect];
      const x = r.w >= 0 ? r.x : r.x + r.w;
      const y = r.h >= 0 ? r.y : r.y + r.h;
      const w = Math.abs(r.w);
      const h = Math.abs(r.h);
      const left = x * scale, top = y * scale, right = (x + w) * scale, bottom = (y + h) * scale;
      const midX = (left + right) / 2, midY = (top + bottom) / 2;
      [
        { x: left, y: top }, { x: midX, y: top }, { x: right, y: top },
        { x: right, y: midY }, { x: right, y: bottom }, { x: midX, y: bottom },
        { x: left, y: bottom }, { x: left, y: midY }
      ].forEach(hp => drawHandle(hp.x, hp.y, 5));
    }

    // Draw selection handles for circles (N,E,S,W)
    if (selectedCircle !== null && circles[selectedCircle]) {
      const c = circles[selectedCircle];
      const cx = c.x * scale, cy = c.y * scale, rr = Math.max(5, c.r * scale);
      [
        { x: cx, y: cy - rr },
        { x: cx + rr, y: cy },
        { x: cx, y: cy + rr },
        { x: cx - rr, y: cy }
      ].forEach(hp => drawHandle(hp.x, hp.y, 5));
    }

    // Draw selection handles for text boxes
    if (selectedText !== null && texts[selectedText]) {
      const t = texts[selectedText];
      const x = t.w >= 0 ? t.x : t.x + t.w;
      const y = t.h >= 0 ? t.y : t.y + t.h;
      const w = Math.max(20, Math.abs(t.w));
      const h = Math.max(16, Math.abs(t.h));
      const left = x * scale, top = y * scale, right = (x + w) * scale, bottom = (y + h) * scale;
      const midX = (left + right) / 2, midY = (top + bottom) / 2;
      [
        { x: left, y: top }, { x: midX, y: top }, { x: right, y: top },
        { x: right, y: midY }, { x: right, y: bottom }, { x: midX, y: bottom },
        { x: left, y: bottom }, { x: left, y: midY }
      ].forEach(hp => drawHandle(hp.x, hp.y, 5));
    }

    // Draw selection handles for callouts (on the box only)
    if (selectedCallout !== null && callouts[selectedCallout]) {
      const c = callouts[selectedCallout];
      const x = c.w >= 0 ? c.x : c.x + c.w;
      const y = c.h >= 0 ? c.y : c.y + c.h;
      const w = Math.max(40, Math.abs(c.w));
      const h = Math.max(24, Math.abs(c.h));
      const left = x * scale, top = y * scale, right = (x + w) * scale, bottom = (y + h) * scale;
      const midX = (left + right) / 2, midY = (top + bottom) / 2;
      [
        { x: left, y: top }, { x: midX, y: top }, { x: right, y: top },
        { x: right, y: midY }, { x: right, y: bottom }, { x: midX, y: bottom },
        { x: left, y: bottom }, { x: left, y: midY }
      ].forEach(hp => drawHandle(hp.x, hp.y, 5));
    }

    // Draw selection handles for arrows (endpoints)
    if (selectedArrow !== null && arrows[selectedArrow]) {
      const a = arrows[selectedArrow];
      drawHandle(a.x1 * scale, a.y1 * scale, 5);
      drawHandle(a.x2 * scale, a.y2 * scale, 5);
    }

    // Live drawing
    if (drawingRef.current) {
      if ((drawingRef.current as FreehandPath).points) {
        const live = drawingRef.current as FreehandPath;
        if (live.points.length > 1) {
          ctx.strokeStyle = live.color;
          ctx.globalAlpha = live.opacity;
          ctx.lineWidth = live.strokeWidth;
          ctx.beginPath();
          const s = toDevice(live.points[0]);
          ctx.moveTo(s.x, s.y);
          for (let i = 1; i < live.points.length; i++) {
            const pt = toDevice(live.points[i]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else {
        const anyRef = drawingRef.current as any;
        // Prefer explicit kind when present
        if (anyRef.kind === 'callout') {
          drawCallout({ ...(anyRef as Callout) });
        } else if (anyRef.kind === 'calloutLeader') {
          // Render shaft from anchor (arrow head) to current tail
          const a = anyRef as { ax: number; ay: number; tx: number; ty: number; color: string; strokeWidth: number; opacity: number };
          const x1 = a.ax * scale, y1 = a.ay * scale, x2 = a.tx * scale, y2 = a.ty * scale;
          const headLength = 10;
          const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI; // flip 180° so head faces outward
          ctx.strokeStyle = a.color;
          ctx.globalAlpha = a.opacity;
          ctx.lineWidth = a.strokeWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          // Arrow head at anchor (x1,y1)
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - headLength * Math.cos(angle - Math.PI / 6), y1 - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - headLength * Math.cos(angle + Math.PI / 6), y1 - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (anyRef.kind === 'calloutBox') {
          // Live render: draw arrow from anchor to box center, then filled box on top, no pointer
          const box = anyRef as { anchorX: number; anchorY: number; x: number; y: number; w: number; h: number; color: string; strokeWidth: number; opacity: number; fontSize: number; text: string };
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          const x1 = box.anchorX * scale, y1 = box.anchorY * scale, x2 = cx * scale, y2 = cy * scale;
          const headLength = 10;
          const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI; // flip 180°
          ctx.strokeStyle = box.color;
          ctx.globalAlpha = box.opacity;
          ctx.lineWidth = box.strokeWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - headLength * Math.cos(angle - Math.PI / 6), y1 - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - headLength * Math.cos(angle + Math.PI / 6), y1 - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          // Box
          const left = box.x * scale, top = box.y * scale, width = box.w * scale, height = box.h * scale;
          ctx.beginPath();
          const r = 6 * scale;
          ctx.moveTo(left + r, top);
          ctx.arcTo(left + width, top, left + width, top + height, r);
          ctx.arcTo(left + width, top + height, left, top + height, r);
          ctx.arcTo(left, top + height, left, top, r);
          ctx.arcTo(left, top, left + width, top, r);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = box.color;
          ctx.lineWidth = box.strokeWidth;
          ctx.stroke();
          // Preview text with wrapping
          const padding = 8 * scale;
          ctx.font = `${box.fontSize * scale}px Arial`;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillStyle = '#111827';
          if (box.text) {
            const maxW = width - padding * 2;
            const lines = wrapLines(box.text, maxW, `${box.fontSize * scale}px Arial`);
            for (let li = 0; li < lines.length; li++) {
              const tx = Math.round(left + padding);
              const ty = Math.round(top + padding + li * (box.fontSize * scale));
              ctx.fillText(lines[li], tx, ty);
            }
          }
          ctx.globalAlpha = 1;
        } else if (anyRef.kind === 'text') {
          const t = anyRef as TextBox;
          ctx.font = `${coercedProps.fontSize * scale}px Arial`;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillStyle = coercedProps.color;
          const x = t.w >= 0 ? t.x : t.x + t.w;
          const y = t.h >= 0 ? t.y : t.y + t.h;
          const w = Math.max(20, Math.abs(t.w));
          const h = Math.max(16, Math.abs(t.h));
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = coercedProps.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(x * scale, y * scale, w * scale, h * scale);
          ctx.setLineDash([]);
          const padding = 6 * scale;
          if (t.text) {
            const maxW = (w * scale) - padding * 2;
            const lines = wrapLines(t.text, maxW, `${coercedProps.fontSize * scale}px Arial`);
            for (let li = 0; li < lines.length; li++) {
              const tx = Math.round(x * scale + padding);
              const ty = Math.round(y * scale + padding + li * (coercedProps.fontSize * scale));
              ctx.fillText(lines[li], tx, ty);
            }
          }
        } else if ((anyRef as Callout).anchorX !== undefined) {
          drawCallout({ ...(anyRef as Callout) });
        } else if ((anyRef as TextBox).text !== undefined) {
          const t = anyRef as TextBox;
          ctx.font = `${coercedProps.fontSize * scale}px Arial`;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillStyle = coercedProps.color;
          const x = t.w >= 0 ? t.x : t.x + t.w;
          const y = t.h >= 0 ? t.y : t.y + t.h;
          const w = Math.max(20, Math.abs(t.w));
          const h = Math.max(16, Math.abs(t.h));
          // draw solid border box during live drag to match final look
          ctx.strokeStyle = coercedProps.color;
          ctx.lineWidth = (t.borderWidth ?? 1.5) * scale;
          ctx.strokeRect(x * scale, y * scale, w * scale, h * scale);
          const padding = 6 * scale;
          const text = t.text || 'Text';
          const maxW = (w * scale) - padding * 2;
          const lines = wrapLines(text, maxW, `${coercedProps.fontSize * scale}px Arial`);
          for (let li = 0; li < lines.length; li++) {
            const tx = Math.round(x * scale + padding);
            const ty = Math.round(y * scale + padding + li * (coercedProps.fontSize * scale));
            ctx.fillText(lines[li], tx, ty);
          }
        } else if (anyRef.kind === 'calloutLeader') {
          // Live leader line with arrow head; keep visible while dragging
          const a = anyRef as { sx: number; sy: number; ex: number; ey: number; color: string; strokeWidth: number; opacity: number };
          const x1 = a.sx * scale, y1 = a.sy * scale, x2 = a.ex * scale, y2 = a.ey * scale;
          const headLength = 10;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          ctx.strokeStyle = a.color;
          ctx.globalAlpha = a.opacity;
          ctx.lineWidth = a.strokeWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if ((anyRef as Cloud).scallopSize !== undefined) {
          const c = anyRef as Cloud;
          const x = c.w >= 0 ? c.x : c.x + c.w;
          const y = c.h >= 0 ? c.y : c.y + c.h;
          const w = Math.max(10, Math.abs(c.w));
          const h = Math.max(10, Math.abs(c.h));
          const rBase = Math.max(4, c.scallopSize) * scale;
          const W = w * scale, H = h * scale;
          const nTop = Math.max(1, Math.ceil(W / (2 * rBase)));
          const nRight = Math.max(1, Math.ceil(H / (2 * rBase)));
          const stepTop = W / nTop, stepRight = H / nRight;
          const rTop = stepTop / 2, rRight = stepRight / 2, rBottom = rTop, rLeft = rRight;
          ctx.strokeStyle = c.color; ctx.lineWidth = c.strokeWidth; ctx.globalAlpha = c.opacity;
          const strokeArc = (cx: number, cy: number, rr: number, a0: number, a1: number) => { ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1, false); ctx.stroke(); };
          for (let i = 0; i < nTop; i++) strokeArc(x * scale + (i + 0.5) * stepTop, y * scale, rTop, Math.PI, 0);
          for (let i = 0; i < nRight; i++) strokeArc((x + w) * scale, y * scale + (i + 0.5) * stepRight, rRight, -Math.PI/2, Math.PI/2);
          for (let i = 0; i < nTop; i++) strokeArc(x * scale + (i + 0.5) * stepTop, (y + h) * scale, rBottom, 0, Math.PI);
          for (let i = 0; i < nRight; i++) strokeArc(x * scale, y * scale + (i + 0.5) * stepRight, rLeft, Math.PI/2, -Math.PI/2);
          // No extra corner arcs in live preview
          ctx.globalAlpha = 1;
        } else if (typeof (anyRef as Rect).w === 'number' && typeof (anyRef as Rect).h === 'number') {
          const r = anyRef as Rect;
          ctx.strokeStyle = coercedProps.color;
          ctx.lineWidth = coercedProps.strokeWidth;
          const x = r.w >= 0 ? r.x : r.x + r.w;
          const y = r.h >= 0 ? r.y : r.y + r.h;
          const w = Math.abs(r.w);
          const h = Math.abs(r.h);
          ctx.strokeRect(x * scale, y * scale, w * scale, h * scale);
        } else if (typeof (anyRef as Circle).r === 'number') {
          const c = anyRef as Circle;
          ctx.strokeStyle = coercedProps.color;
          ctx.lineWidth = coercedProps.strokeWidth;
          ctx.beginPath();
          ctx.arc(c.x * scale, c.y * scale, c.r * scale, 0, Math.PI * 2);
          ctx.stroke();
        } else if (typeof (anyRef as Arrow).x1 === 'number') {
          const a = anyRef as Arrow;
          const x1 = a.x1 * scale, y1 = a.y1 * scale, x2 = a.x2 * scale, y2 = a.y2 * scale;
          const headLength = 10;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = coercedProps.color;
          ctx.lineWidth = coercedProps.strokeWidth;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }
    }
    // reset alpha
    ctx.globalAlpha = 1;
  }, [freehands, rects, circles, arrows, texts, callouts, clouds, scale, coercedProps.color, coercedProps.strokeWidth, coercedProps.fontSize, coercedProps.opacity, selectedRect, selectedCircle, selectedText, selectedCallout, selectedArrow, selectedCloud]);

  // Always redraw when any shape state changes
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Clear selection handles when tool changes away from its type
  useEffect(() => {
    if (activeTool !== 'rectangle') setSelectedRect(null);
    if (activeTool !== 'circle') setSelectedCircle(null);
    if (activeTool !== 'text') setSelectedText(null);
    if (activeTool !== 'callout') setSelectedCallout(null);
    if (activeTool !== 'arrow') setSelectedArrow(null);
    if (activeTool !== 'cloud') setSelectedCloud(null);
    drawOverlay();
  }, [activeTool]);

  // Apply properties panel changes to selected cloud immediately
  useEffect(() => {
    if (activeTool !== 'cloud') return; // only when cloud tool is active
    const targetIndex = selectedCloud ?? (clouds.length ? clouds.length - 1 : null);
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setClouds(prev => prev.map((c, i) => i === targetIndex ? {
      ...c,
      color: coercedProps.color,
      strokeWidth: cloudStrokeWidth,
      opacity: Math.max(0, Math.min(1, nextOpacity)),
      scallopSize: cloudScallopSize
    } : c));
  }, [coercedProps.color, cloudStrokeWidth, cloudScallopSize, coercedProps.opacity, activeTool]);

  // Apply rectangle properties to selected/last rectangle when rectangle tool is active
  useEffect(() => {
    if (activeTool !== 'rectangle') return;
    if (selectedRect === null) return; // only apply when a rectangle is explicitly selected
    const targetIndex = selectedRect;
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setRects(prev => prev.map((r, i) => i === targetIndex ? {
      ...r,
      color: coercedProps.color,
      strokeWidth: coercedProps.strokeWidth,
      opacity: Math.max(0, Math.min(1, nextOpacity))
    } : r));
  }, [coercedProps.color, coercedProps.strokeWidth, coercedProps.opacity, activeTool]);

  // Apply circle properties
  useEffect(() => {
    if (activeTool !== 'circle') return;
    if (selectedCircle === null) return;
    const targetIndex = selectedCircle;
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setCircles(prev => prev.map((c, i) => i === targetIndex ? {
      ...c,
      color: coercedProps.color,
      strokeWidth: coercedProps.strokeWidth,
      opacity: Math.max(0, Math.min(1, nextOpacity))
    } : c));
  }, [coercedProps.color, coercedProps.strokeWidth, coercedProps.opacity, activeTool]);

  // Apply arrow properties
  useEffect(() => {
    if (activeTool !== 'arrow') return;
    if (selectedArrow === null) return;
    const targetIndex = selectedArrow;
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setArrows(prev => prev.map((a, i) => i === targetIndex ? {
      ...a,
      color: coercedProps.color,
      strokeWidth: coercedProps.strokeWidth,
      opacity: Math.max(0, Math.min(1, nextOpacity))
    } : a));
  }, [coercedProps.color, coercedProps.strokeWidth, coercedProps.opacity, activeTool]);

  // Apply text box properties
  useEffect(() => {
    if (skipApplyRef.current.text) { skipApplyRef.current.text = false; return; }
    if (selectedText === null) return; // apply whenever a text box is selected, regardless of tool
    const targetIndex = selectedText;
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setTexts(prev => prev.map((t, i) => {
      if (i !== targetIndex) return t;
      const updated = {
        ...t,
        color: coercedProps.color,
        fontSize: coercedProps.fontSize,
        fontWeight: coercedProps.fontWeight,
        fontStyle: coercedProps.fontStyle,
        textDecoration: coercedProps.textDecoration,
        textAlign: coercedProps.textAlign,
        borderEnabled: coercedProps.textBorder,
        borderWidth: coercedProps.textBoxLineThickness,
        opacity: Math.max(0, Math.min(1, nextOpacity)),
        strokeWidth: coercedProps.strokeWidth
      } as TextBox;
      // Keep inner width/height stable across border thickness changes and auto-expand when content requires
      const off = document.createElement('canvas').getContext('2d');
      if (off) {
        const prevPadPx = 8 * scale + (t.borderEnabled ? ((t.borderWidth || 1.5) * scale) : 0);
        const padPx = 8 * scale + (updated.borderEnabled ? ((updated.borderWidth || 1.5) * scale) : 0);
        const fontPx = updated.fontSize * scale;
        const lineHeightPx = fontPx + 2;
        // Inner dimensions before change
        const prevOuterWpx = Math.max(20, (t.baseW ?? Math.abs(t.w))) * scale;
        const prevOuterHpx = Math.max(16, Math.abs(t.h)) * scale;
        let widthPx = prevOuterWpx - prevPadPx * 2;
        off.font = `${updated.fontStyle || 'normal'} ${updated.fontWeight || 300} ${fontPx}px Arial`;
        const wrap = (text: string, maxW: number) => {
          const segments = (text || '').split(/\r?\n/);
          const out: string[] = [];
          let maxLineWidth = 0;
          for (const seg of segments) {
            const tokens = seg.split(/(\s+)/);
            let line = '';
            for (const tk of tokens) {
              const test = line + tk;
              const testWidth = off.measureText(test).width;
              if (testWidth <= maxW || line.length === 0) { line = test; maxLineWidth = Math.max(maxLineWidth, testWidth); }
              else { out.push(line.trimEnd()); maxLineWidth = Math.max(maxLineWidth, off.measureText(line).width); line = tk.trimStart(); }
            }
            out.push(line.trimEnd());
            maxLineWidth = Math.max(maxLineWidth, off.measureText(line).width);
          }
          return { lines: out, maxLineWidth } as { lines: string[]; maxLineWidth: number };
        };
        const { lines, maxLineWidth } = wrap(updated.text, widthPx);
        const desiredInnerWidth = Math.ceil(Math.max(widthPx, maxLineWidth)) + 2; // small safety pad
        // Compute target inner width (keep current unless content needs more)
        // Allow shrink down to the stored base inner width
        const baseInnerPx = Math.max(20, (t.baseW ?? Math.abs(t.w))) * scale - prevPadPx * 2;
        const targetInnerWidth = Math.max(baseInnerPx, Math.min(desiredInnerWidth, Math.max(widthPx, desiredInnerWidth)));
        const contentOuterWpx = targetInnerWidth + padPx * 2;
        const baseOuterHpx = Math.max(16, (t.baseH ?? Math.abs(t.h))) * scale;
        const neededHpx = Math.max(baseOuterHpx, Math.max(lineHeightPx, lines.length * lineHeightPx) + padPx * 2 + 2); // clamp to base height
        let newOuterWpx = contentOuterWpx; // allow shrink/grow to keep inner constant with new padding
        let newOuterHpx = Math.max(baseOuterHpx, neededHpx);
        const newH = newOuterHpx / scale;
        const newW = newOuterWpx / scale;
        // Adjust x/y symmetrically based on delta outer size
        const centerX = updated.x + (updated.w >= 0 ? updated.w / 2 : -updated.w / 2);
        const centerY = updated.y + (updated.h >= 0 ? updated.h / 2 : -updated.h / 2);
        const signW = updated.w >= 0 ? 1 : -1;
        const signH = updated.h >= 0 ? 1 : -1;
        const newX = centerX - (newW / 2) * signW;
        const newY = centerY - (newH / 2) * signH;
        return { ...updated, x: newX, y: newY, h: newH, w: signW * newW };
      }
      return updated;
    }));
  }, [coercedProps.color, coercedProps.fontSize, coercedProps.fontWeight, coercedProps.fontStyle, coercedProps.textDecoration, coercedProps.textAlign, coercedProps.textBorder, coercedProps.textBoxLineThickness, coercedProps.strokeWidth, coercedProps.opacity, selectedText]);

  // Apply callout properties
  useEffect(() => {
    if (skipApplyRef.current.callout) { skipApplyRef.current.callout = false; return; }
    if (selectedCallout === null) return;
    const targetIndex = selectedCallout;
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setCallouts(prev => prev.map((c, i) => {
      if (i !== targetIndex) return c;
      const updated = {
        ...c,
        color: coercedProps.color,
        fontSize: coercedProps.fontSize,
        fontWeight: coercedProps.fontWeight,
        fontStyle: coercedProps.fontStyle,
        textDecoration: coercedProps.textDecoration,
        textAlign: coercedProps.textAlign,
        strokeWidth: coercedProps.strokeWidth,
        opacity: Math.max(0, Math.min(1, nextOpacity))
      } as Callout;
      // Auto-expand height based on content for callout
      const off = document.createElement('canvas').getContext('2d');
      if (off) {
        const padPx = 8 * scale;
        const fontPx = updated.fontSize * scale;
        const lineHeightPx = fontPx + 2;
        let widthPx = Math.max(40, (updated.baseW ?? Math.abs(updated.w))) * scale - padPx * 2;
        off.font = `${updated.fontStyle || 'normal'} ${updated.fontWeight || 300} ${fontPx}px Arial`;
        const wrap = (text: string, maxW: number) => {
          const segments = (text || '').split(/\r?\n/);
          const out: string[] = [];
          let maxLineWidth = 0;
          for (const seg of segments) {
            const tokens = seg.split(/(\s+)/);
            let line = '';
            for (const tk of tokens) {
              const test = line + tk;
              const testWidth = off.measureText(test).width;
              if (testWidth <= maxW || line.length === 0) { line = test; maxLineWidth = Math.max(maxLineWidth, testWidth); }
              else { out.push(line.trimEnd()); maxLineWidth = Math.max(maxLineWidth, off.measureText(line).width); line = tk.trimStart(); }
            }
            out.push(line.trimEnd());
            maxLineWidth = Math.max(maxLineWidth, off.measureText(line).width);
          }
          return { lines: out, maxLineWidth } as { lines: string[]; maxLineWidth: number };
        };
        const { lines, maxLineWidth } = wrap(updated.text, widthPx);
        const desiredInnerWidth = Math.ceil(Math.max(widthPx, maxLineWidth)) + 2;
        const newWidthPx = desiredInnerWidth + padPx * 2;
        const baseOuterHpx = Math.max(24, (updated.baseH ?? Math.abs(updated.h))) * scale;
        const neededPx = Math.max(baseOuterHpx, Math.max(lineHeightPx, lines.length * lineHeightPx) + padPx * 2 + 2);
        const newH = neededPx / scale;
        const newW = newWidthPx / scale;
        return { ...updated, h: newH, w: newW, baseW: updated.baseW ?? Math.max(40, Math.abs(updated.w)) };
      }
      return updated;
    }));
  }, [coercedProps.color, coercedProps.fontSize, coercedProps.fontWeight, coercedProps.fontStyle, coercedProps.textDecoration, coercedProps.textAlign, coercedProps.strokeWidth, coercedProps.opacity, selectedCallout]);

  // Mouse handlers for pan/draw
  useEffect(() => {
    const overlay = overlayRef.current;
    const wrapper = overlay?.parentElement as HTMLDivElement | null;
    if (!overlay || !wrapper) return;

    const getLocalPoint = (e: MouseEvent) => {
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Map to pdf-space (scale-normalized)
      return { x: x / scale, y: y / scale };
    };

    const onDown = (e: MouseEvent) => {
      // Always start a fresh interaction for any draw or drag
      beginInteraction();
      if (activeTool === 'freehand') {
        const p = getLocalPoint(e);
        const path: FreehandPath = { points: [p], color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity };
        drawingRef.current = path; interactionChangedRef.current = true;
      } else if (activeTool === 'rectangle') {
        const p = getLocalPoint(e);
        // Hit-test existing rects first (top-most wins)
        for (let i = rects.length - 1; i >= 0; i--) {
          const r = rects[i];
          const x = r.w >= 0 ? r.x : r.x + r.w;
          const y = r.h >= 0 ? r.y : r.y + r.h;
          const w = Math.abs(r.w);
          const h = Math.abs(r.h);
          const handle = 8 / scale;
          const inside = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
          if (!inside) continue;
          setSelectedRect(i);
          onSyncToolProperties?.({ color: r.color, strokeWidth: r.strokeWidth, opacity: r.opacity }, 'rectangle');
          // handles
          if (Math.hypot(p.x - x, p.y - y) <= handle) { resizingRectRef.current = { index: i, anchor: 'nw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - y) <= handle) { resizingRectRef.current = { index: i, anchor: 'ne' }; return; }
          if (Math.hypot(p.x - x, p.y - (y + h)) <= handle) { resizingRectRef.current = { index: i, anchor: 'sw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - (y + h)) <= handle) { resizingRectRef.current = { index: i, anchor: 'se' }; return; }
          if (Math.abs(p.y - y) <= handle) { resizingRectRef.current = { index: i, anchor: 'n' }; return; }
          if (Math.abs(p.x - (x + w)) <= handle) { resizingRectRef.current = { index: i, anchor: 'e' }; return; }
          if (Math.abs(p.y - (y + h)) <= handle) { resizingRectRef.current = { index: i, anchor: 's' }; return; }
          if (Math.abs(p.x - x) <= handle) { resizingRectRef.current = { index: i, anchor: 'w' }; return; }
          movingRectRef.current = { index: i, dx: p.x - x, dy: p.y - y };
          return;
        }
        // Otherwise start a new rect
        drawingRef.current = { x: p.x, y: p.y, w: 0, h: 0, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity } as Rect; interactionChangedRef.current = true;
        setSelectedRect(null);
      } else if (activeTool === 'circle') {
        const p = getLocalPoint(e);
        for (let i = circles.length - 1; i >= 0; i--) {
          const c = circles[i];
          const handle = 8 / scale;
          const dx = p.x - c.x; const dy = p.y - c.y; const dist = Math.hypot(dx, dy);
          const nearPerimeter = Math.abs(dist - c.r) <= handle;
          const inside = dist <= c.r;
          if (!inside && !nearPerimeter) continue;
          setSelectedCircle(i);
          onSyncToolProperties?.({ color: c.color, strokeWidth: c.strokeWidth, opacity: c.opacity }, 'circle');
          // check handles at N/E/S/W (approx by dist to those points)
          const N = { x: c.x, y: c.y - c.r };
          const E = { x: c.x + c.r, y: c.y };
          const S = { x: c.x, y: c.y + c.r };
          const W = { x: c.x - c.r, y: c.y };
          if (Math.hypot(p.x - N.x, p.y - N.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 'n' }; return; }
          if (Math.hypot(p.x - E.x, p.y - E.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 'e' }; return; }
          if (Math.hypot(p.x - S.x, p.y - S.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 's' }; return; }
          if (Math.hypot(p.x - W.x, p.y - W.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 'w' }; return; }
          movingCircleRef.current = { index: i, dx: p.x - c.x, dy: p.y - c.y };
          return;
        }
        drawingRef.current = { x: p.x, y: p.y, r: 0, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity } as Circle; interactionChangedRef.current = true;
        setSelectedCircle(null);
      } else if (activeTool === 'arrow') {
        const p = getLocalPoint(e);
        for (let i = arrows.length - 1; i >= 0; i--) {
          const a = arrows[i];
          const handle = 8 / scale;
          if (Math.hypot(p.x - a.x1, p.y - a.y1) <= handle) { setSelectedArrow(i); onSyncToolProperties?.({ color: a.color, strokeWidth: a.strokeWidth, opacity: a.opacity }, 'arrow'); resizingArrowRef.current = { index: i, end: 'start' }; return; }
          if (Math.hypot(p.x - a.x2, p.y - a.y2) <= handle) { setSelectedArrow(i); onSyncToolProperties?.({ color: a.color, strokeWidth: a.strokeWidth, opacity: a.opacity }, 'arrow'); resizingArrowRef.current = { index: i, end: 'end' }; return; }
          // near line segment
          const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
          const len2 = dx*dx + dy*dy || 1;
          const t = Math.max(0, Math.min(1, ((p.x - a.x1)*dx + (p.y - a.y1)*dy)/len2));
          const proj = { x: a.x1 + t*dx, y: a.y1 + t*dy };
          const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
          if (dist <= handle) { setSelectedArrow(i); onSyncToolProperties?.({ color: a.color, strokeWidth: a.strokeWidth, opacity: a.opacity }, 'arrow'); movingArrowRef.current = { index: i, dx: p.x - a.x1, dy: p.y - a.y1 }; return; }
        }
        drawingRef.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity } as Arrow; interactionChangedRef.current = true;
        setSelectedArrow(null);
      } else if (activeTool === 'text') {
        const p = getLocalPoint(e);
        // Hit-test existing textboxes for move/resize or edit
        for (let i = texts.length - 1; i >= 0; i--) {
          const t = texts[i];
          const x = t.w >= 0 ? t.x : t.x + t.w;
          const y = t.h >= 0 ? t.y : t.y + t.h;
          const w = Math.max(20, Math.abs(t.w));
          const h = Math.max(16, Math.abs(t.h));
          const handle = 8 / scale;
          const inside = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
          if (!inside) continue;
          setSelectedText(i);
          onSyncToolProperties?.({ color: t.color, fontSize: t.fontSize, strokeWidth: t.strokeWidth, opacity: t.opacity, fontWeight: t.fontWeight, fontStyle: t.fontStyle, textDecoration: t.textDecoration, textAlign: t.textAlign, textBorder: t.borderEnabled, textBoxLineThickness: t.borderWidth }, 'text');
          skipApplyRef.current.text = true;
          // If not clicking a handle, enter inline edit mode immediately
          const onHandle = (
            Math.hypot(p.x - x, p.y - y) <= handle ||
            Math.hypot(p.x - (x + w), p.y - y) <= handle ||
            Math.hypot(p.x - x, p.y - (y + h)) <= handle ||
            Math.hypot(p.x - (x + w), p.y - (y + h)) <= handle ||
            Math.abs(p.y - y) <= handle || Math.abs(p.x - (x + w)) <= handle ||
            Math.abs(p.y - (y + h)) <= handle || Math.abs(p.x - x) <= handle
          );
          if (!onHandle) {
            // In text tool, drag to move; double-click opens editor
            movingTextRef.current = { index: i, dx: p.x - x, dy: p.y - y };
            return;
          }
          if (Math.hypot(p.x - x, p.y - y) <= handle) { resizingTextRef.current = { index: i, anchor: 'nw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - y) <= handle) { resizingTextRef.current = { index: i, anchor: 'ne' }; return; }
          if (Math.hypot(p.x - x, p.y - (y + h)) <= handle) { resizingTextRef.current = { index: i, anchor: 'sw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - (y + h)) <= handle) { resizingTextRef.current = { index: i, anchor: 'se' }; return; }
          if (Math.abs(p.y - y) <= handle) { resizingTextRef.current = { index: i, anchor: 'n' }; return; }
          if (Math.abs(p.x - (x + w)) <= handle) { resizingTextRef.current = { index: i, anchor: 'e' }; return; }
          if (Math.abs(p.y - (y + h)) <= handle) { resizingTextRef.current = { index: i, anchor: 's' }; return; }
          if (Math.abs(p.x - x) <= handle) { resizingTextRef.current = { index: i, anchor: 'w' }; return; }
          movingTextRef.current = { index: i, dx: p.x - x, dy: p.y - y };
          return;
        }
        // Start new text box only on drag; begin with zero size. Defaults: 14px font, 1.5px border enabled
        drawingRef.current = { kind: 'text', x: p.x, y: p.y, w: 0, h: 0, text: '', color: coercedProps.color, fontSize: 14, opacity: coercedProps.opacity, strokeWidth: coercedProps.strokeWidth, borderEnabled: true, borderWidth: 1.5, fontWeight: 300, fontStyle: 'normal', textDecoration: 'none', textAlign: 'left' } as any; interactionChangedRef.current = true;
        setSelectedText(null);
      } else if (activeTool === 'callout') {
        const p = getLocalPoint(e);
        // Allow selecting/resizing existing callout box when clicking it
        for (let i = callouts.length - 1; i >= 0; i--) {
          const c = callouts[i];
          const x = c.w >= 0 ? c.x : c.x + c.w;
          const y = c.h >= 0 ? c.y : c.y + c.h;
          const w = Math.max(40, Math.abs(c.w));
          const h = Math.max(24, Math.abs(c.h));
          const handle = 8 / scale;
          const inside = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
          if (!inside) continue;
          setSelectedCallout(i);
          onSyncToolProperties?.({ color: c.color, fontSize: c.fontSize, strokeWidth: c.strokeWidth, opacity: c.opacity, fontWeight: c.fontWeight, fontStyle: c.fontStyle, textDecoration: c.textDecoration, textAlign: c.textAlign }, 'callout');
          skipApplyRef.current.callout = true;
          const onHandle = (
            Math.hypot(p.x - x, p.y - y) <= handle ||
            Math.hypot(p.x - (x + w), p.y - y) <= handle ||
            Math.hypot(p.x - x, p.y - (y + h)) <= handle ||
            Math.hypot(p.x - (x + w), p.y - (y + h)) <= handle ||
            Math.abs(p.y - y) <= handle || Math.abs(p.x - (x + w)) <= handle ||
            Math.abs(p.y - (y + h)) <= handle || Math.abs(p.x - x) <= handle
          );
          if (!onHandle) {
            setActiveEditor({ kind: 'callout', index: i });
            setEditorValue(c.text || '');
            return;
          }
          if (Math.hypot(p.x - x, p.y - y) <= handle) { resizingCalloutRef.current = { index: i, anchor: 'nw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - y) <= handle) { resizingCalloutRef.current = { index: i, anchor: 'ne' }; return; }
          if (Math.hypot(p.x - x, p.y - (y + h)) <= handle) { resizingCalloutRef.current = { index: i, anchor: 'sw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - (y + h)) <= handle) { resizingCalloutRef.current = { index: i, anchor: 'se' }; return; }
          if (Math.abs(p.y - y) <= handle) { resizingCalloutRef.current = { index: i, anchor: 'n' }; return; }
          if (Math.abs(p.x - (x + w)) <= handle) { resizingCalloutRef.current = { index: i, anchor: 'e' }; return; }
          if (Math.abs(p.y - (y + h)) <= handle) { resizingCalloutRef.current = { index: i, anchor: 's' }; return; }
          if (Math.abs(p.x - x) <= handle) { resizingCalloutRef.current = { index: i, anchor: 'w' }; return; }
          movingCalloutBoxRef.current = { index: i, dx: p.x - x, dy: p.y - y };
          return;
        }
        // Otherwise: First click defines the arrow head (anchor). Drag will extend the shaft.
        drawingRef.current = { kind: 'calloutLeader', ax: p.x, ay: p.y, tx: p.x, ty: p.y, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity, fontSize: coercedProps.fontSize } as any; interactionChangedRef.current = true;
        setSelectedCallout(null);
      } else if (activeTool === 'cloud') {
        const p = getLocalPoint(e);
        // First: if clicking an existing cloud handle or body, enable resize/move instead of creating a new one
        for (let i = clouds.length - 1; i >= 0; i--) {
          const c = clouds[i];
          const x = c.w >= 0 ? c.x : c.x + c.w;
          const y = c.h >= 0 ? c.y : c.y + c.h;
          const w = Math.abs(c.w);
          const h = Math.abs(c.h);
          const handle = 8 / scale;
          const inBox = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
          if (!inBox) continue;
          setSelectedCloud(i);
          // Corner handles
          if (Math.hypot(p.x - x, p.y - y) <= handle) { resizingCloudRef.current = { index: i, anchor: 'nw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - y) <= handle) { resizingCloudRef.current = { index: i, anchor: 'ne' }; return; }
          if (Math.hypot(p.x - x, p.y - (y + h)) <= handle) { resizingCloudRef.current = { index: i, anchor: 'sw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - (y + h)) <= handle) { resizingCloudRef.current = { index: i, anchor: 'se' }; return; }
          // Edge handles
          if (Math.abs(p.y - y) <= handle) { resizingCloudRef.current = { index: i, anchor: 'n' }; return; }
          if (Math.abs(p.x - (x + w)) <= handle) { resizingCloudRef.current = { index: i, anchor: 'e' }; return; }
          if (Math.abs(p.y - (y + h)) <= handle) { resizingCloudRef.current = { index: i, anchor: 's' }; return; }
          if (Math.abs(p.x - x) <= handle) { resizingCloudRef.current = { index: i, anchor: 'w' }; return; }
          // Otherwise move whole cloud
          movingCloudRef.current = { index: i, dx: p.x - x, dy: p.y - y };
          return;
        }
        // Otherwise, start creating a new cloud
        drawingRef.current = { x: p.x, y: p.y, w: 0, h: 0, color: coercedProps.color, strokeWidth: cloudStrokeWidth, opacity: coercedProps.opacity, scallopSize: cloudScallopSize } as Cloud; interactionChangedRef.current = true;
        setSelectedCloud(null); // don't show handles during initial drag
      } else if (activeTool === 'stamp') {
        const p = getLocalPoint(e);
        // Hit-test existing stamps for move/resize (use ref to avoid stale state)
        const allStamps = stampsRef.current || [];
        for (let i = allStamps.length - 1; i >= 0; i--) {
          const s = allStamps[i];
          const x = s.w >= 0 ? s.x : s.x + s.w;
          const y = s.h >= 0 ? s.y : s.y + s.h;
          const w = Math.max(50, Math.abs(s.w));
          const h = Math.max(30, Math.abs(s.h));
          const handle = 8 / scale;
          const inside = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
          if (!inside) continue;
          setSelectedStamp(i);
          // Corner handles
          if (Math.hypot(p.x - x, p.y - y) <= handle) { resizingStampRef.current = { index: i, anchor: 'nw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - y) <= handle) { resizingStampRef.current = { index: i, anchor: 'ne' }; return; }
          if (Math.hypot(p.x - x, p.y - (y + h)) <= handle) { resizingStampRef.current = { index: i, anchor: 'sw' }; return; }
          if (Math.hypot(p.x - (x + w), p.y - (y + h)) <= handle) { resizingStampRef.current = { index: i, anchor: 'se' }; return; }
          // Edge handles
          if (Math.abs(p.y - y) <= handle) { resizingStampRef.current = { index: i, anchor: 'n' }; return; }
          if (Math.abs(p.x - (x + w)) <= handle) { resizingStampRef.current = { index: i, anchor: 'e' }; return; }
          if (Math.abs(p.y - (y + h)) <= handle) { resizingStampRef.current = { index: i, anchor: 's' }; return; }
          if (Math.abs(p.x - x) <= handle) { resizingStampRef.current = { index: i, anchor: 'w' }; return; }
          // If clicked inside but not on handles: move the stamp (unless Shift is held to force new placement)
          if (!(e as any).shiftKey) {
            movingStampRef.current = { index: i, dx: p.x - x, dy: p.y - y } as any;
            return;
          }
          // If Shift is held, allow placing a new stamp on top (fall through)
          break;
        }
        // If we didn't click an existing stamp: Place default-sized stamp on click (autosize to fit text)
        const tpl = stampTemplateRef.current || { title: 'AS-BUILT', status: 'AS-BUILT', color: '#ef4444', opacity: 1, strokeWidth: 2, fontSize: 14 };
        // Compute size using the same baseline as default stamps (14px font),
        // so custom-built stamps place with the same dimensions
        const baseFontPx = 14 * scale;
        let contentWidthPx = 0;
        try {
          const off = document.createElement('canvas').getContext('2d');
          if (off) { off.font = `${baseFontPx}px Arial`; contentWidthPx = off.measureText(tpl.title || '').width; }
        } catch {}
        const paddingPx = 24 * scale; // left+right
        const minWidthPx = 140 * scale;
        const maxWidthPx = 240 * scale;
        const minHeightPx = 44 * scale;
        const maxHeightPx = 80 * scale;
        const desiredWidthPx = Math.min(maxWidthPx, Math.max(minWidthPx, contentWidthPx + paddingPx));
        const desiredHeightPx = Math.min(maxHeightPx, Math.max(minHeightPx, baseFontPx * 2.0));
        const defaultW = desiredWidthPx / scale;
        const defaultH = desiredHeightPx / scale;
        setStamps(prev => {
          const idx = prev.length;
          const next = [...prev, { x: p.x, y: p.y, w: defaultW, h: defaultH, title: tpl.title, status: (tpl.status as any) || 'CUSTOM', color: tpl.color || '#ef4444', opacity: tpl.opacity ?? 1, strokeWidth: tpl.strokeWidth ?? 2, logoUrl: tpl.logoUrl } as Stamp];
          stampsRef.current = next;
          setSelectedStamp(idx);
          selectedStampRef.current = idx;
          return next;
        });
        drawingRef.current = null;
        interactionChangedRef.current = true;
        // Defer redraw until after state commit using microtask + rAF
        Promise.resolve().then(() => requestAnimationFrame(() => drawOverlay()));
        // Push to history timeline
        Promise.resolve().then(() => commitInteraction());
      } else if (activeTool === 'select') {
        // Pan only in select mode
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        lastPanRef.current = { ...pan };
        // Also allow dragging existing callout boxes
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        for (let i = callouts.length - 1; i >= 0; i--) {
          const c = callouts[i];
          if (local.x >= c.x && local.x <= c.x + c.w && local.y >= c.y && local.y <= c.y + c.h) {
            movingCalloutRef.current = { index: i, dx: local.x - c.x, dy: local.y - c.y };
            isPanningRef.current = false; // disable canvas pan when moving callout
            break;
          }
        }
        // Cloud hit test (move/resize)
        if (!movingCalloutRef.current) {
          for (let i = clouds.length - 1; i >= 0; i--) {
            const c = clouds[i];
            const x = c.w >= 0 ? c.x : c.x + c.w;
            const y = c.h >= 0 ? c.y : c.y + c.h;
            const w = Math.abs(c.w);
            const h = Math.abs(c.h);
            const handle = 8 / scale;
            const inBox = local.x >= x && local.x <= x + w && local.y >= y && local.y <= y + h;
            if (!inBox) continue;
            setSelectedCloud(i);
            // Check corners first for resize
            if (Math.hypot(local.x - x, local.y - y) <= handle) { resizingCloudRef.current = { index: i, anchor: 'nw' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - (x + w), local.y - y) <= handle) { resizingCloudRef.current = { index: i, anchor: 'ne' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - x, local.y - (y + h)) <= handle) { resizingCloudRef.current = { index: i, anchor: 'sw' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - (x + w), local.y - (y + h)) <= handle) { resizingCloudRef.current = { index: i, anchor: 'se' }; isPanningRef.current = false; break; }
            // edges
            if (Math.abs(local.y - y) <= handle) { resizingCloudRef.current = { index: i, anchor: 'n' }; isPanningRef.current = false; break; }
            if (Math.abs(local.x - (x + w)) <= handle) { resizingCloudRef.current = { index: i, anchor: 'e' }; isPanningRef.current = false; break; }
            if (Math.abs(local.y - (y + h)) <= handle) { resizingCloudRef.current = { index: i, anchor: 's' }; isPanningRef.current = false; break; }
            if (Math.abs(local.x - x) <= handle) { resizingCloudRef.current = { index: i, anchor: 'w' }; isPanningRef.current = false; break; }
            // Otherwise move
            movingCloudRef.current = { index: i, dx: local.x - x, dy: local.y - y };
            isPanningRef.current = false;
            break;
          }
        }
        // Select mode: allow dragging existing text boxes
        if (!movingCalloutRef.current) {
          for (let i = texts.length - 1; i >= 0; i--) {
            const t = texts[i];
            const x = t.w >= 0 ? t.x : t.x + t.w;
            const y = t.h >= 0 ? t.y : t.y + t.h;
            const w = Math.max(20, Math.abs(t.w));
            const h = Math.max(16, Math.abs(t.h));
            if (local.x >= x && local.x <= x + w && local.y >= y && local.y <= y + h) {
              onSyncToolProperties?.({
                color: t.color,
                fontSize: t.fontSize,
                strokeWidth: t.strokeWidth,
                opacity: t.opacity,
                fontWeight: t.fontWeight,
                fontStyle: t.fontStyle,
                textDecoration: t.textDecoration,
                textAlign: t.textAlign,
                textBorder: t.borderEnabled,
                textBoxLineThickness: t.borderWidth
              }, 'text');
              skipApplyRef.current.text = true;
              movingTextRef.current = { index: i, dx: local.x - x, dy: local.y - y };
              isPanningRef.current = false;
              break;
            }
          }
        }
        // Rect hit test in select mode
        if (!movingCalloutRef.current && !movingCloudRef.current && !resizingCloudRef.current) {
          for (let i = rects.length - 1; i >= 0; i--) {
            const r = rects[i];
            const x = r.w >= 0 ? r.x : r.x + r.w;
            const y = r.h >= 0 ? r.y : r.y + r.h;
            const w = Math.abs(r.w);
            const h = Math.abs(r.h);
            const handle = 8 / scale;
            const inside = local.x >= x && local.x <= x + w && local.y >= y && local.y <= y + h;
            if (!inside) continue;
            setSelectedRect(i);
            if (Math.hypot(local.x - x, local.y - y) <= handle) { resizingRectRef.current = { index: i, anchor: 'nw' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - (x + w), local.y - y) <= handle) { resizingRectRef.current = { index: i, anchor: 'ne' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - x, local.y - (y + h)) <= handle) { resizingRectRef.current = { index: i, anchor: 'sw' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - (x + w), local.y - (y + h)) <= handle) { resizingRectRef.current = { index: i, anchor: 'se' }; isPanningRef.current = false; break; }
            if (Math.abs(local.y - y) <= handle) { resizingRectRef.current = { index: i, anchor: 'n' }; isPanningRef.current = false; break; }
            if (Math.abs(local.x - (x + w)) <= handle) { resizingRectRef.current = { index: i, anchor: 'e' }; isPanningRef.current = false; break; }
            if (Math.abs(local.y - (y + h)) <= handle) { resizingRectRef.current = { index: i, anchor: 's' }; isPanningRef.current = false; break; }
            if (Math.abs(local.x - x) <= handle) { resizingRectRef.current = { index: i, anchor: 'w' }; isPanningRef.current = false; break; }
            movingRectRef.current = { index: i, dx: local.x - x, dy: local.y - y };
            isPanningRef.current = false;
            break;
          }
        }
        // Circle hit test in select mode
        if (!movingCalloutRef.current && !movingCloudRef.current && !resizingCloudRef.current && !movingRectRef.current && !resizingRectRef.current) {
          for (let i = circles.length - 1; i >= 0; i--) {
            const c = circles[i];
            const handle = 8 / scale;
            const dx = local.x - c.x; const dy = local.y - c.y; const dist = Math.hypot(dx, dy);
            const inside = dist <= c.r;
            if (!inside) continue;
            setSelectedCircle(i);
            const N = { x: c.x, y: c.y - c.r };
            const E = { x: c.x + c.r, y: c.y };
            const S = { x: c.x, y: c.y + c.r };
            const W = { x: c.x - c.r, y: c.y };
            if (Math.hypot(local.x - N.x, local.y - N.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 'n' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - E.x, local.y - E.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 'e' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - S.x, local.y - S.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 's' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - W.x, local.y - W.y) <= handle) { resizingCircleRef.current = { index: i, anchor: 'w' }; isPanningRef.current = false; break; }
            movingCircleRef.current = { index: i, dx: local.x - c.x, dy: local.y - c.y };
            isPanningRef.current = false;
            break;
          }
        }
        // Arrow hit test in select mode
        if (!movingCalloutRef.current && !movingCloudRef.current && !resizingCloudRef.current && !movingRectRef.current && !resizingRectRef.current && !movingCircleRef.current && !resizingCircleRef.current) {
          for (let i = arrows.length - 1; i >= 0; i--) {
            const a = arrows[i];
            const handle = 8 / scale;
            if (Math.hypot(local.x - a.x1, local.y - a.y1) <= handle) { setSelectedArrow(i); resizingArrowRef.current = { index: i, end: 'start' }; isPanningRef.current = false; break; }
            if (Math.hypot(local.x - a.x2, local.y - a.y2) <= handle) { setSelectedArrow(i); resizingArrowRef.current = { index: i, end: 'end' }; isPanningRef.current = false; break; }
            const dx = a.x2 - a.x1, dy = a.y2 - a.y1; const len2 = dx*dx + dy*dy || 1;
            const t = Math.max(0, Math.min(1, ((local.x - a.x1)*dx + (local.y - a.y1)*dy)/len2));
            const proj = { x: a.x1 + t*dx, y: a.y1 + t*dy };
            const dist = Math.hypot(local.x - proj.x, local.y - proj.y);
            if (dist <= handle) { setSelectedArrow(i); movingArrowRef.current = { index: i, dx: local.x - a.x1, dy: local.y - a.y1 }; isPanningRef.current = false; break; }
          }
        }
      }
      drawOverlay();
    };

    const onDblClick = (e: MouseEvent) => {
      const p = getLocalPoint(e);
      // Prefer editing existing text or callout
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        const x = t.w >= 0 ? t.x : t.x + t.w;
        const y = t.h >= 0 ? t.y : t.y + t.h;
        const w = Math.max(20, Math.abs(t.w));
        const h = Math.max(16, Math.abs(t.h));
        if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) {
          setActiveEditor({ kind: 'text', index: i });
          setEditorValue(t.text || '');
          return;
        }
      }
      for (let i = callouts.length - 1; i >= 0; i--) {
        const c = callouts[i];
        const x = c.w >= 0 ? c.x : c.x + c.w;
        const y = c.h >= 0 ? c.y : c.y + c.h;
        const w = Math.max(40, Math.abs(c.w));
        const h = Math.max(24, Math.abs(c.h));
        if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) {
          setActiveEditor({ kind: 'callout', index: i });
          setEditorValue(c.text || '');
          return;
        }
      }
    };

    const onMove = (e: MouseEvent) => {
      if (drawingRef.current) {
        if ((drawingRef.current as FreehandPath).points) {
          const p = getLocalPoint(e);
          (drawingRef.current as FreehandPath).points.push(p); interactionChangedRef.current = true;
        } else {
          const p = getLocalPoint(e);
          const anyRef = drawingRef.current as any;
          if (typeof (anyRef as Rect).w === 'number' && typeof (anyRef as Rect).h === 'number') {
            const r = anyRef as Rect;
          r.w = p.x - r.x;
          r.h = p.y - r.y; interactionChangedRef.current = true;
          } else if (typeof (anyRef as Circle).r === 'number') {
            const c = anyRef as Circle;
            const dx = p.x - c.x;
            const dy = p.y - c.y;
            c.r = Math.sqrt(dx * dx + dy * dy); interactionChangedRef.current = true;
          } else if (typeof (anyRef as Arrow).x1 === 'number') {
            const a = anyRef as Arrow;
            a.x2 = p.x;
            a.y2 = p.y; interactionChangedRef.current = true;
          } else if ((anyRef as TextBox).text !== undefined) {
            const t = anyRef as TextBox;
            // allow resize while dragging
            t.w = p.x - t.x;
            t.h = p.y - t.y; interactionChangedRef.current = true;
          } else if (anyRef.kind === 'calloutLeader') {
            // Update the tail point (where the box will appear later)
            anyRef.tx = p.x;
            anyRef.ty = p.y; interactionChangedRef.current = true;
          } else if ((anyRef as Cloud).scallopSize !== undefined) {
            const c = anyRef as Cloud;
            c.w = p.x - c.x;
            c.h = p.y - c.y; interactionChangedRef.current = true;
          }
        }
        drawOverlay();
        return;
      }
      if (movingCalloutRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingCalloutRef.current;
        setCallouts(prev => prev.map((c, i) => i === index ? { ...c, x: local.x - dx, y: local.y - dy } : c));
      } else if (movingTextRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingTextRef.current;
        setTexts(prev => prev.map((t, i) => {
          if (i !== index) return t;
          const x = local.x - dx;
          const y = local.y - dy;
          const w = Math.max(20, Math.abs(t.w));
          const h = Math.max(16, Math.abs(t.h));
          return { ...t, x, y, w, h };
        }));
      } else if (resizingTextRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, anchor } = resizingTextRef.current;
        setTexts(prev => prev.map((t, i) => {
          if (i !== index) return t;
          const x0 = t.w >= 0 ? t.x : t.x + t.w;
          const y0 = t.h >= 0 ? t.y : t.y + t.h;
          const w0 = Math.max(20, Math.abs(t.w));
          const h0 = Math.max(16, Math.abs(t.h));
          let x = x0, y = y0, w = w0, h = h0;
          if (anchor === 'nw') { w = (x0 + w0) - local.x; h = (y0 + h0) - local.y; x = local.x; y = local.y; }
          else if (anchor === 'ne') { w = local.x - x0; h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'sw') { w = (x0 + w0) - local.x; h = local.y - y0; x = local.x; }
          else if (anchor === 'se') { w = local.x - x0; h = local.y - y0; }
          else if (anchor === 'n') { h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'e') { w = local.x - x0; }
          else if (anchor === 's') { h = local.y - y0; }
          else if (anchor === 'w') { w = (x0 + w0) - local.x; x = local.x; }

          // Auto-expand height if wrapping increases lines after width change
          try {
            const padPx = 8 * scale + (t.borderEnabled ? ((t.borderWidth || 1.5) * scale) : 0);
            const innerWidthPx = Math.max(20, Math.abs(w)) * scale - padPx * 2;
            const fontPx = (t.fontSize || 14) * scale;
            const lineHeightPx = fontPx + 2;
            const ctx = document.createElement('canvas').getContext('2d');
            if (ctx) {
              ctx.font = `${t.fontStyle || 'normal'} ${t.fontWeight || 300} ${fontPx}px Arial`;
              const segments = (t.text || '').split(/\r?\n/);
              let linesCount = 0;
              for (const seg of segments) {
                const tokens = seg.split(/(\s+)/);
                let line = '';
                for (const tk of tokens) {
                  const test = line + tk;
                  if (ctx.measureText(test).width <= innerWidthPx || line.length === 0) line = test; else { linesCount++; line = tk.trimStart(); }
                }
                linesCount++;
              }
              const neededPx = Math.max(lineHeightPx, linesCount * lineHeightPx) + padPx * 2 + 2;
              const neededH = neededPx / scale;
              if (neededH > h) h = neededH; // ensure height always enough
            }
          } catch {}

          return { ...t, x, y, w, h };
        }));
      } else if (resizingRectRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, anchor } = resizingRectRef.current;
        setRects(prev => prev.map((r, i) => {
          if (i !== index) return r;
          const x0 = r.w >= 0 ? r.x : r.x + r.w;
          const y0 = r.h >= 0 ? r.y : r.y + r.h;
          const w0 = Math.abs(r.w);
          const h0 = Math.abs(r.h);
          let x = x0, y = y0, w = w0, h = h0;
          if (anchor === 'nw') { w = (x0 + w0) - local.x; h = (y0 + h0) - local.y; x = local.x; y = local.y; }
          else if (anchor === 'ne') { w = local.x - x0; h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'sw') { w = (x0 + w0) - local.x; h = local.y - y0; x = local.x; }
          else if (anchor === 'se') { w = local.x - x0; h = local.y - y0; }
          else if (anchor === 'n') { h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'e') { w = local.x - x0; }
          else if (anchor === 's') { h = local.y - y0; }
          else if (anchor === 'w') { w = (x0 + w0) - local.x; x = local.x; }
          return { ...r, x, y, w, h };
        }));
      } else if (movingRectRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingRectRef.current;
        setRects(prev => prev.map((r, i) => i === index ? { ...r, x: local.x - dx, y: local.y - dy } : r));
      } else if (resizingCircleRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, anchor } = resizingCircleRef.current;
        setCircles(prev => prev.map((c, i) => {
          if (i !== index) return c;
          let r = c.r;
          if (anchor === 'n' || anchor === 's') r = Math.abs(local.y - c.y);
          else if (anchor === 'e' || anchor === 'w') r = Math.abs(local.x - c.x);
          return { ...c, r: Math.max(1, r) };
        }));
      } else if (movingCircleRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingCircleRef.current;
        setCircles(prev => prev.map((c, i) => i === index ? { ...c, x: local.x - dx, y: local.y - dy } : c));
      } else if (resizingCalloutRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, anchor } = resizingCalloutRef.current;
        setCallouts(prev => prev.map((c, i) => {
          if (i !== index) return c;
          const x0 = c.w >= 0 ? c.x : c.x + c.w;
          const y0 = c.h >= 0 ? c.y : c.y + c.h;
          const w0 = Math.max(40, Math.abs(c.w));
          const h0 = Math.max(24, Math.abs(c.h));
          let x = x0, y = y0, w = w0, h = h0;
          if (anchor === 'nw') { w = (x0 + w0) - local.x; h = (y0 + h0) - local.y; x = local.x; y = local.y; }
          else if (anchor === 'ne') { w = local.x - x0; h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'sw') { w = (x0 + w0) - local.x; h = local.y - y0; x = local.x; }
          else if (anchor === 'se') { w = local.x - x0; h = local.y - y0; }
          else if (anchor === 'n') { h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'e') { w = local.x - x0; }
          else if (anchor === 's') { h = local.y - y0; }
          else if (anchor === 'w') { w = (x0 + w0) - local.x; x = local.x; }
          return { ...c, x, y, w, h };
        }));
      } else if (movingCalloutBoxRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingCalloutBoxRef.current;
        setCallouts(prev => prev.map((c, i) => i === index ? { ...c, x: local.x - dx, y: local.y - dy } : c));
      } else if (movingStampRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingStampRef.current;
        setStamps(prev => {
          const next = prev.map((s, i) => i === index ? { ...s, x: local.x - dx, y: local.y - dy } : s);
          stampsRef.current = next;
          return next;
        });
        drawOverlay();
      } else if (resizingArrowRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, end } = resizingArrowRef.current;
        setArrows(prev => prev.map((a, i) => {
          if (i !== index) return a;
          return end === 'start' ? { ...a, x1: local.x, y1: local.y } : { ...a, x2: local.x, y2: local.y };
        }));
      } else if (movingArrowRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingArrowRef.current;
        setArrows(prev => prev.map((a, i) => i === index ? { ...a, x1: local.x - dx, y1: local.y - dy, x2: (local.x - dx) + (a.x2 - a.x1), y2: (local.y - dy) + (a.y2 - a.y1) } : a));
      } else if (resizingStampRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, anchor } = resizingStampRef.current;
        setStamps(prev => {
          const next = prev.map((s, i) => {
            if (i !== index) return s;
            const x0 = s.w >= 0 ? s.x : s.x + s.w;
            const y0 = s.h >= 0 ? s.y : s.y + s.h;
            const w0 = Math.max(50, Math.abs(s.w));
            const h0 = Math.max(30, Math.abs(s.h));
            let x = x0, y = y0, w = w0, h = h0;
            if (anchor === 'nw') { w = (x0 + w0) - local.x; h = (y0 + h0) - local.y; x = local.x; y = local.y; }
            else if (anchor === 'ne') { w = local.x - x0; h = (y0 + h0) - local.y; y = local.y; }
            else if (anchor === 'sw') { w = (x0 + w0) - local.x; h = local.y - y0; x = local.x; }
            else if (anchor === 'se') { w = local.x - x0; h = local.y - y0; }
            else if (anchor === 'n') { h = (y0 + h0) - local.y; y = local.y; }
            else if (anchor === 'e') { w = local.x - x0; }
            else if (anchor === 's') { h = local.y - y0; }
            else if (anchor === 'w') { w = (x0 + w0) - local.x; x = local.x; }
            interactionChangedRef.current = true;
            return { ...s, x, y, w, h };
          });
          stampsRef.current = next;
          return next;
        });
        drawOverlay();
      } else if (resizingCloudRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, anchor } = resizingCloudRef.current;
        setClouds(prev => prev.map((c, i) => {
          if (i !== index) return c;
          const x0 = c.w >= 0 ? c.x : c.x + c.w;
          const y0 = c.h >= 0 ? c.y : c.y + c.h;
          const w0 = Math.abs(c.w);
          const h0 = Math.abs(c.h);
          let x = x0, y = y0, w = w0, h = h0;
          if (anchor === 'nw') { w = (x0 + w0) - local.x; h = (y0 + h0) - local.y; x = local.x; y = local.y; }
          else if (anchor === 'ne') { w = local.x - x0; h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'sw') { w = (x0 + w0) - local.x; h = local.y - y0; x = local.x; }
          else if (anchor === 'se') { w = local.x - x0; h = local.y - y0; }
          else if (anchor === 'n') { h = (y0 + h0) - local.y; y = local.y; }
          else if (anchor === 'e') { w = local.x - x0; }
          else if (anchor === 's') { h = local.y - y0; }
          else if (anchor === 'w') { w = (x0 + w0) - local.x; x = local.x; }
          return { ...c, x, y, w, h };
        }));
      } else if (movingCloudRef.current) {
        const overlay = overlayRef.current!;
        const rect = overlay.getBoundingClientRect();
        const local = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
        const { index, dx, dy } = movingCloudRef.current;
        setClouds(prev => prev.map((c, i) => i === index ? { ...c, x: local.x - dx, y: local.y - dy } : c));
      } else if (isPanningRef.current && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({ x: lastPanRef.current.x + dx, y: lastPanRef.current.y + dy });
      }
    };

    const onUp = () => {
      if (drawingRef.current) {
        if ((drawingRef.current as FreehandPath).points) {
          const path = drawingRef.current as FreehandPath;
          setFreehands(prev => [...prev, { points: [...path.points], color: path.color, strokeWidth: path.strokeWidth, opacity: path.opacity }]);
          interactionChangedRef.current = true;
        } else {
          const anyRef = drawingRef.current as any;
          // IMPORTANT: save specific tool types BEFORE generic rectangle
          if ((anyRef as TextBox).text !== undefined) {
            const t = anyRef as TextBox;
            const w = Math.abs(t.w);
            const h = Math.abs(t.h);
            const minW = 8 / scale;
            const minH = 8 / scale;
            // Only create if dragged beyond a small threshold
            if (w >= minW && h >= minH) {
              const normalized: TextBox = {
                x: t.w >= 0 ? t.x : t.x + t.w,
                y: t.h >= 0 ? t.y : t.y + t.h,
                w: Math.max(20, w),
                h: Math.max(16, h),
                text: editorValue || '',
                color: t.color,
                fontSize: t.fontSize,
                opacity: t.opacity,
                strokeWidth: t.strokeWidth,
                fontWeight: t.fontWeight,
                fontStyle: t.fontStyle,
                textDecoration: t.textDecoration,
                textAlign: t.textAlign,
                borderEnabled: t.borderEnabled ?? true,
                borderWidth: t.borderWidth ?? 1.5,
                baseW: Math.max(20, w),
                baseH: Math.max(16, h)
              };
              setTexts(prev => {
                const idx = prev.length;
                const next = [...prev, normalized];
                setActiveEditor({ kind: 'text', index: idx });
                setSelectedText(idx);
                setEditorValue('');
                return next;
              });
            }
          } else if (anyRef.kind === 'calloutLeader') {
            const leader = anyRef as { ax: number; ay: number; tx: number; ty: number; color: string; strokeWidth: number; opacity: number; fontSize: number };
            // Place the box centered at tail position
            const w = 200 / scale;
            const h = 64 / scale;
            const x = leader.tx - w / 2;
            const y = leader.ty - h / 2;
            const normalized: Callout = {
              x, y, w, h,
              text: editorValue || '',
              color: leader.color,
              fontSize: leader.fontSize,
              opacity: leader.opacity,
              strokeWidth: leader.strokeWidth,
              anchorX: leader.ax,
              anchorY: leader.ay,
              baseW: Math.max(40, Math.abs(w)),
              baseH: Math.max(24, Math.abs(h))
            };
            setCallouts(prev => {
              const idx = prev.length;
              const next = [...prev, normalized];
              setActiveEditor({ kind: 'callout', index: idx });
              setSelectedCallout(idx);
              setEditorValue('');
              return next;
            });
          } else if ((anyRef as Cloud).scallopSize !== undefined) {
            const c = anyRef as Cloud;
            const normalized = {
              x: c.w >= 0 ? c.x : c.x + c.w,
              y: c.h >= 0 ? c.y : c.y + c.h,
              w: Math.max(10, Math.abs(c.w)),
              h: Math.max(10, Math.abs(c.h)),
              color: c.color,
              strokeWidth: c.strokeWidth,
              opacity: c.opacity,
              scallopSize: c.scallopSize
            } as Cloud;
            setClouds(prev => {
              const next = [...prev, normalized];
              setSelectedCloud(next.length - 1);
              return next;
            });
          } else if (anyRef.kind === 'stamp') {
            const s = anyRef as Stamp;
            const normalized: Stamp = {
              x: s.w >= 0 ? s.x : s.x + s.w,
              y: s.h >= 0 ? s.y : s.y + s.h,
              w: Math.max(80, Math.abs(s.w)),
              h: Math.max(40, Math.abs(s.h)),
              title: s.title,
              status: s.status,
              company: s.company,
              author: s.author,
              date: s.date,
              color: s.color,
              opacity: s.opacity,
              strokeWidth: s.strokeWidth,
              logoUrl: s.logoUrl
            };
            setStamps(prev => {
              const idx = prev.length;
              const next = [...prev, normalized];
              setSelectedStamp(idx);
              return next;
            });
            drawOverlay();
          } else if (typeof (anyRef as Rect).w === 'number' && typeof (anyRef as Rect).h === 'number') {
            const r = anyRef as Rect;
            const normalized = {
              x: r.w >= 0 ? r.x : r.x + r.w,
              y: r.h >= 0 ? r.y : r.y + r.h,
              w: Math.abs(r.w),
              h: Math.abs(r.h),
              color: r.color,
              strokeWidth: r.strokeWidth,
              opacity: r.opacity
            } as Rect;
            setRects(prev => [...prev, normalized]);
          } else if (typeof (anyRef as Circle).r === 'number') {
            const c = anyRef as Circle;
            setCircles(prev => [...prev, { ...c }]);
          } else if (typeof (anyRef as Arrow).x1 === 'number') {
            const a = anyRef as Arrow;
            setArrows(prev => [...prev, { ...a }]);
          }
        }
      }
      drawingRef.current = null;
      isPanningRef.current = false;
      panStartRef.current = null;
      movingCalloutRef.current = null;
      movingCalloutBoxRef.current = null;
      movingStampRef.current = null;
      resizingCalloutRef.current = null;
      movingRectRef.current = null;
      resizingRectRef.current = null;
      movingCircleRef.current = null;
      resizingCircleRef.current = null;
      resizingArrowRef.current = null;
      movingArrowRef.current = null;
      resizingTextRef.current = null;
      movingTextRef.current = null;
      movingCloudRef.current = null;
      resizingCloudRef.current = null;
      resizingStampRef.current = null;
      drawOverlay();
      commitInteraction();
    };

    overlay.addEventListener('mousedown', onDown);
    overlay.addEventListener('dblclick', onDblClick);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // avoid OS key repeat causing multi-steps in one press
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (meta && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        setActiveEditor(null);
        setSelectedRect(null); setSelectedCircle(null); setSelectedText(null); setSelectedCallout(null); setSelectedArrow(null); setSelectedCloud(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // delete selected shape
        if (selectedText !== null) setTexts(prev => prev.filter((_, i) => i !== selectedText));
        else if (selectedCallout !== null) setCallouts(prev => prev.filter((_, i) => i !== selectedCallout));
        else if (selectedRect !== null) setRects(prev => prev.filter((_, i) => i !== selectedRect));
        else if (selectedCircle !== null) setCircles(prev => prev.filter((_, i) => i !== selectedCircle));
        else if (selectedArrow !== null) setArrows(prev => prev.filter((_, i) => i !== selectedArrow));
        else if (selectedCloud !== null) setClouds(prev => prev.filter((_, i) => i !== selectedCloud));
        interactionChangedRef.current = true; commitInteraction();
      } else if (meta && (e.key === 'c' || e.key === 'C')) {
        // copy selected shape to a ref
        const sel = selectedText ?? selectedCallout ?? selectedRect ?? selectedCircle ?? selectedArrow ?? selectedCloud;
        if (selectedText !== null) (window as any).__clipboard = { kind: 'text', data: texts[selectedText] };
        else if (selectedCallout !== null) (window as any).__clipboard = { kind: 'callout', data: callouts[selectedCallout] };
        else if (selectedRect !== null) (window as any).__clipboard = { kind: 'rect', data: rects[selectedRect] };
        else if (selectedCircle !== null) (window as any).__clipboard = { kind: 'circle', data: circles[selectedCircle] };
        else if (selectedArrow !== null) (window as any).__clipboard = { kind: 'arrow', data: arrows[selectedArrow] };
        else if (selectedCloud !== null) (window as any).__clipboard = { kind: 'cloud', data: clouds[selectedCloud] };
      } else if (meta && (e.key === 'v' || e.key === 'V')) {
        const clip = (window as any).__clipboard;
        if (!clip) return;
        const offset = 10 / scale; // paste with slight offset
        if (clip.kind === 'text') { const t = clone(clip.data as TextBox); t.x += offset; t.y += offset; setTexts(prev => [...prev, t]); setSelectedText(texts.length); }
        else if (clip.kind === 'callout') { const c = clone(clip.data as Callout); c.x += offset; c.y += offset; setCallouts(prev => [...prev, c]); setSelectedCallout(callouts.length); }
        else if (clip.kind === 'rect') { const r = clone(clip.data as Rect); r.x += offset; r.y += offset; setRects(prev => [...prev, r]); setSelectedRect(rects.length); }
        else if (clip.kind === 'circle') { const c = clone(clip.data as Circle); c.x += offset; c.y += offset; setCircles(prev => [...prev, c]); setSelectedCircle(circles.length); }
        else if (clip.kind === 'arrow') { const a = clone(clip.data as Arrow); const dx = offset, dy = offset; a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy; setArrows(prev => [...prev, a]); setSelectedArrow(arrows.length); }
        else if (clip.kind === 'cloud') { const c = clone(clip.data as Cloud); c.x += offset; c.y += offset; setClouds(prev => [...prev, c]); setSelectedCloud(clouds.length); }
        interactionChangedRef.current = true; commitInteraction();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      overlay.removeEventListener('mousedown', onDown);
      overlay.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [activeTool, drawOverlay, pan, scale, activeEditor, editorValue]);

  // Do not echo tool changes back to parent; parent owns the tool state.

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <div className="w-full flex justify-center items-start p-4">
        <div className="relative inline-block bg-white border border-gray-200 rounded-lg shadow overflow-hidden"
             style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
          <canvas ref={canvasRef} className="block" />
          <canvas ref={overlayRef} className="absolute inset-0" style={{ pointerEvents: 'auto' }} />
          {/* Inline editors + static DOM text renderers */}
          {activeEditor && (() => {
            const toRect = () => {
              if (activeEditor.kind === 'text') {
                const t = texts[activeEditor.index];
                if (!t) return null;
                const x = t.w >= 0 ? t.x : t.x + t.w;
                const y = t.h >= 0 ? t.y : t.y + t.h;
                const w = Math.max(20, Math.abs(t.w));
                const h = Math.max(16, Math.abs(t.h));
                return { x, y, w, h, fontSize: t.fontSize };
              } else {
                const c = callouts[activeEditor.index];
                if (!c) return null;
                const x = c.w >= 0 ? c.x : c.x + c.w;
                const y = c.h >= 0 ? c.y : c.y + c.h;
                const w = Math.max(40, Math.abs(c.w));
                const h = Math.max(24, Math.abs(c.h));
                return { x, y, w, h, fontSize: c.fontSize };
              }
            };
            const r = toRect();
            if (!r) return null;
            // Use constant inner padding (8px). Border grows outward so text doesn't pulse during edits.
            const padding = 8 * scale;
            const tShape = activeEditor.kind === 'text' ? texts[activeEditor.index] : undefined;
            const cShape = activeEditor.kind === 'callout' ? callouts[activeEditor.index] : undefined;
            const isUnderline = (activeEditor.kind === 'text' ? (tShape?.textDecoration === 'underline') : (cShape?.textDecoration === 'underline'));
            const style: React.CSSProperties = {
              position: 'absolute',
              left: r.x * scale + padding,
              top: r.y * scale + padding / 2,
              width: r.w * scale - padding * 2,
              minHeight: r.h * scale - padding,
              height: 'auto',
              fontSize: r.fontSize * scale,
              lineHeight: `${r.fontSize * scale + 2}px`,
              color: (activeEditor.kind === 'text' ? (tShape?.color || '#111827') : (cShape?.color || '#111827')),
              fontWeight: ((activeEditor.kind === 'text' ? (tShape?.fontWeight || 300) : (cShape?.fontWeight || 300)) as any),
              fontStyle: ((activeEditor.kind === 'text' ? (tShape?.fontStyle || 'normal') : (cShape?.fontStyle || 'normal')) as any),
              textDecoration: (isUnderline ? 'underline' : 'none') as any,
              textDecorationLine: (isUnderline ? 'underline' : 'none') as any,
              textDecorationColor: (isUnderline ? ((activeEditor.kind === 'text' ? (tShape?.color || '#111827') : (cShape?.color || '#111827'))) : 'transparent') as any,
              textAlign: ((activeEditor.kind === 'text' ? (tShape?.textAlign || 'left') : (cShape?.textAlign || 'left')) as any),
              border: 'none',
              padding: 0,
              margin: 0,
              outline: 'none',
              background: 'transparent',
              resize: 'none',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap'
            };
            const onCommit = () => {
              if (activeEditor.kind === 'text') {
                setTexts(prev => prev.map((t, i) => i === activeEditor.index ? { ...t, text: editorValue } : t));
              } else {
                setCallouts(prev => prev.map((c, i) => i === activeEditor.index ? { ...c, text: editorValue } : c));
              }
              setActiveEditor(null);
            };
            return (
              <>
                {/* Persistent border/fill while editing */}
                {(() => {
                  const t = texts[activeEditor.index];
                  if (!t || !t.borderEnabled) return null;
                  const padPx = padding;
                  return (
                    <div style={{
                      position: 'absolute',
                      left: r.x * scale,
                      top: r.y * scale,
                      width: r.w * scale,
                      height: r.h * scale,
                      pointerEvents: 'none'
                    }}>
                      <div style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: Math.min(1, Math.max(0, t.opacity ?? 1)) }} />
                      <div style={{ position: 'absolute', inset: 0, border: `${(t.borderWidth || 1.5) * scale}px solid ${t.color}` }} />
        </div>
                  );
                })()}
                <textarea
                key={`editor-${activeEditor.kind}-${activeEditor.index}`}
                style={style}
                value={editorValue}
                spellCheck={false}
                autoCorrect="off"
                onChange={e => {
                  setEditorValue(e.target.value);
                  const el = e.currentTarget;
                  // Recalculate height to content
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                  // Measure natural content width to allow shrinking and growing
                  el.style.width = 'auto';
                  const contentWidthPx = el.scrollWidth; // intrinsic content width
                  // Minimum width is the originally dragged inner width
                  const minInnerWidthPx = Math.max(20, ((activeEditor.kind === 'text' ? (texts[activeEditor.index]?.baseW ?? r.w) : (callouts[activeEditor.index]?.baseW ?? r.w)) * scale - padding * 2));
                  const newInnerWidthPx = Math.max(contentWidthPx, minInnerWidthPx);
                  el.style.width = `${newInnerWidthPx}px`;
                  const newOuterWidth = (newInnerWidthPx + padding * 2) / scale;
                  // Allow shrink but not below base height
                  const baseInnerHeightPx = Math.max(16, ((activeEditor.kind === 'text' ? (texts[activeEditor.index]?.baseH ?? Math.abs(texts[activeEditor.index]?.h || r.h)) : (callouts[activeEditor.index]?.baseH ?? Math.abs(callouts[activeEditor.index]?.h || r.h))) * scale - padding))
                  const contentInnerHeightPx = el.scrollHeight;
                  const newInnerHeightPx = Math.max(baseInnerHeightPx, contentInnerHeightPx);
                  const newOuterHeight = (newInnerHeightPx + padding) / scale;
                  // Update underlying shape size to fit text (both grow and shrink)
                  if (activeEditor.kind === 'callout') {
                    setCallouts(prev => prev.map((c, i) => i === activeEditor.index ? { ...c, w: newOuterWidth, h: newOuterHeight, baseW: c.baseW ?? Math.max(40, Math.abs(c.w)), baseH: c.baseH ?? Math.max(24, Math.abs(c.h)) } : c));
                  } else {
                    setTexts(prev => prev.map((t, i) => {
                      if (i !== activeEditor.index) return t;
                      const baseX = t.w >= 0 ? t.x : t.x + t.w;
                      const baseY = t.h >= 0 ? t.y : t.y + t.h;
                      return { ...t, x: baseX, y: baseY, w: newOuterWidth, h: newOuterHeight, baseW: t.baseW ?? Math.max(20, Math.abs(t.w)), baseH: t.baseH ?? Math.max(16, Math.abs(t.h)) };
                    }));
                  }
                }}
                onBlur={() => { interactionChangedRef.current = true; onCommit(); }}
                onKeyDown={e => {
                  // Allow Enter to create new lines; commit with Ctrl+Enter
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    interactionChangedRef.current = true; onCommit();
                  } else if (e.key === 'Escape') {
                    setActiveEditor(null);
                  }
                }}
                autoFocus
                placeholder={activeEditor.kind === 'callout' ? 'Type text here' : 'Type text here'}
              />
              </>
            );
          })()}

          {/* Static text DOM overlay for crisp rendering when not editing */}
          {texts.map((t, i) => {
            if (activeEditor && activeEditor.kind === 'text' && activeEditor.index === i) return null;
            const x = t.w >= 0 ? t.x : t.x + t.w;
            const y = t.h >= 0 ? t.y : t.y + t.h;
            const w = Math.max(20, Math.abs(t.w));
            const h = Math.max(16, Math.abs(t.h));
            const style: React.CSSProperties = {
              position: 'absolute',
              left: x * scale + Math.max(0, (t.borderWidth || 1.5) * scale),
              top: y * scale + Math.max(0, (t.borderWidth || 1.5) * scale),
              width: w * scale - Math.max(0, (t.borderWidth || 1.5) * scale) * 2,
              minHeight: h * scale - Math.max(0, (t.borderWidth || 1.5) * scale) * 2,
              color: t.color,
              fontSize: t.fontSize * scale,
              lineHeight: `${t.fontSize * scale + 2}px`,
              fontWeight: (t.fontWeight || 300) as any,
              fontStyle: (t.fontStyle || 'normal') as any,
              textDecoration: (t.textDecoration || 'none') as any,
              textAlign: (t.textAlign || 'left') as any,
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap'
            };
            return (
              <div key={`text-static-${i}`} style={style}>
                {t.borderEnabled && (
                  <>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: '#ffffff',
                      opacity: Math.min(1, Math.max(0, t.opacity ?? 1)),
                      pointerEvents: 'none'
                    }} />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      border: `${(t.borderWidth || 1.5) * scale}px solid ${t.color}`,
                      pointerEvents: 'none'
                    }} />
                  </>
                )}
                {(() => {
                  const pad = 8 * scale + (t.borderEnabled ? (t.borderWidth || 1.5) * scale : 0);
                  const innerStyle: React.CSSProperties = {
                    position: 'absolute', left: pad, top: pad / 2, right: pad,
                    textDecoration: (t.textDecoration === 'underline' ? 'underline' : 'none') as any
                  };
                  return <div style={innerStyle}>{t.text}</div>;
                })()}
              </div>
            );
          })}

          {callouts.map((c, i) => {
            if (activeEditor && activeEditor.kind === 'callout' && activeEditor.index === i) return null;
            const x = c.w >= 0 ? c.x : c.x + c.w;
            const y = c.h >= 0 ? c.y : c.y + c.h;
            const w = Math.max(40, Math.abs(c.w));
            const h = Math.max(24, Math.abs(c.h));
            const padding = 8 * scale;
            const style: React.CSSProperties = {
              position: 'absolute',
              left: x * scale + padding,
              top: y * scale + padding / 2,
              width: w * scale - padding * 2,
              minHeight: h * scale - padding,
              color: '#111827',
              fontSize: c.fontSize * scale,
              lineHeight: `${c.fontSize * scale + 2}px`,
              fontWeight: (c.fontWeight || 300) as any,
              fontStyle: (c.fontStyle || 'normal') as any,
              textDecoration: (c.textDecoration || 'none') as any,
              textAlign: (c.textAlign || 'left') as any,
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap'
            };
            return (
              <div key={`callout-static-${i}`} style={style}>
                {c.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


