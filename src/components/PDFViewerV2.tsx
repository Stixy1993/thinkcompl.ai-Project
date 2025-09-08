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
}

export default function PDFViewerV2({
  fileUrl,
  className = "",
  activeTool,
  toolProperties,
  toolPropsVersion,
  onPDFControlsChange,
  onToolChange,
  onSyncToolProperties
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
  type TextBox = { x: number; y: number; w: number; h: number; text: string; color: string; fontSize: number; opacity: number; strokeWidth: number };
  type Callout = { x: number; y: number; w: number; h: number; text: string; color: string; fontSize: number; opacity: number; strokeWidth: number; anchorX: number; anchorY: number };
  type Cloud = { x: number; y: number; w: number; h: number; color: string; strokeWidth: number; opacity: number; scallopSize: number };
  const [freehands, setFreehands] = useState<FreehandPath[]>([]);
  const [rects, setRects] = useState<Rect[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [texts, setTexts] = useState<TextBox[]>([]);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const drawingRef = useRef<FreehandPath | Rect | Circle | Arrow | TextBox | Callout | Cloud | null>(null);
  const renderingRef = useRef<Promise<void> | null>(null);
  const movingCalloutRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  // Generic selection + move/resize refs per tool
  const [selectedRect, setSelectedRect] = useState<number | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<number | null>(null);
  const [selectedCallout, setSelectedCallout] = useState<number | null>(null);
  const [selectedArrow, setSelectedArrow] = useState<number | null>(null);
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
  const [activeEditor, setActiveEditor] = useState<{ kind: 'text' | 'callout'; index: number } | null>(null);
  const [editorValue, setEditorValue] = useState<string>("");

  // Coerced tool properties with defaults
  const coercedProps = {
    color: toolProperties?.color || '#ff0000',
    strokeWidth: Math.max(1, toolProperties?.strokeWidth || 2),
    opacity: toolProperties?.opacity ?? 1,
    fontSize: Math.max(8, toolProperties?.fontSize || 14)
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
      undo: () => {},
      redo: () => {},
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

    // Text boxes (per-shape styling)
    texts.forEach((t, i) => {
      ctx.font = `${(t.fontSize || 14) * scale}px Arial`;
      ctx.fillStyle = t.color || '#111827';
      ctx.globalAlpha = (t.opacity ?? 1);
      const x = t.w >= 0 ? t.x : t.x + t.w;
      const y = t.h >= 0 ? t.y : t.y + t.h;
      const w = Math.max(20, Math.abs(t.w));
      const h = Math.max(16, Math.abs(t.h));
      const padding = 6 * scale;
      // If editing this text, skip drawing the canvas text so the textarea isn't doubled
      const isEditing = activeEditor?.kind === 'text' && activeEditor.index === i;
      if (!isEditing) {
        const content = (t.text && t.text !== 'Type text here') ? t.text : '';
        if (content) {
          const maxWidth = (w * scale) - padding * 2;
          const lines = wrapLines(content, maxWidth, `${(t.fontSize || 14) * scale}px Arial`);
          for (let li = 0; li < lines.length; li++) {
            ctx.fillText(lines[li], x * scale + padding, y * scale + padding + (li + 1) * (t.fontSize * scale));
          }
        }
      }
      ctx.globalAlpha = 1;
    });

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
    callouts.forEach((c, i) => drawCallout(c, { showText: !(activeEditor?.kind === 'callout' && activeEditor.index === i) }));

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
          // Preview text
          const padding = 8 * scale;
          ctx.font = `${box.fontSize * scale}px Arial`;
          ctx.fillStyle = '#111827';
          ctx.fillText(box.text, left + padding, top + padding + box.fontSize * scale, width - padding * 2);
          ctx.globalAlpha = 1;
        } else if (anyRef.kind === 'text') {
          const t = anyRef as TextBox;
          ctx.font = `${coercedProps.fontSize * scale}px Arial`;
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
            ctx.fillText(t.text, x * scale + padding, y * scale + coercedProps.fontSize * scale + padding / 2, (w * scale) - padding * 2);
          }
        } else if ((anyRef as Callout).anchorX !== undefined) {
          drawCallout({ ...(anyRef as Callout) });
        } else if ((anyRef as TextBox).text !== undefined) {
          const t = anyRef as TextBox;
          ctx.font = `${coercedProps.fontSize * scale}px Arial`;
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
          ctx.fillText(t.text || 'Text', x * scale + padding, y * scale + coercedProps.fontSize * scale + padding / 2, (w * scale) - padding * 2);
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
    if (activeTool !== 'text') return;
    if (selectedText === null) return;
    const targetIndex = selectedText;
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setTexts(prev => prev.map((t, i) => i === targetIndex ? {
      ...t,
      color: coercedProps.color,
      fontSize: coercedProps.fontSize,
      opacity: Math.max(0, Math.min(1, nextOpacity)),
      strokeWidth: coercedProps.strokeWidth
    } : t));
  }, [coercedProps.color, coercedProps.fontSize, coercedProps.strokeWidth, coercedProps.opacity, activeTool]);

  // Apply callout properties
  useEffect(() => {
    if (activeTool !== 'callout') return;
    if (selectedCallout === null) return;
    const targetIndex = selectedCallout;
    if (targetIndex === null) return;
    const nextOpacity = coercedProps.opacity > 1 ? coercedProps.opacity / 100 : (coercedProps.opacity ?? 1);
    setCallouts(prev => prev.map((c, i) => i === targetIndex ? {
      ...c,
      color: coercedProps.color,
      fontSize: coercedProps.fontSize,
      strokeWidth: coercedProps.strokeWidth,
      opacity: Math.max(0, Math.min(1, nextOpacity))
    } : c));
  }, [coercedProps.color, coercedProps.fontSize, coercedProps.strokeWidth, coercedProps.opacity, activeTool]);

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
      if (activeTool === 'freehand') {
        const p = getLocalPoint(e);
        const path: FreehandPath = { points: [p], color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity };
        drawingRef.current = path;
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
        drawingRef.current = { x: p.x, y: p.y, w: 0, h: 0, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity } as Rect;
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
        drawingRef.current = { x: p.x, y: p.y, r: 0, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity } as Circle;
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
        drawingRef.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity } as Arrow;
        setSelectedArrow(null);
      } else if (activeTool === 'text') {
        const p = getLocalPoint(e);
        // Hit-test existing textboxes for move/resize
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
          onSyncToolProperties?.({ color: t.color, fontSize: t.fontSize, strokeWidth: t.strokeWidth, opacity: t.opacity }, 'text');
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
        drawingRef.current = { kind: 'text', x: p.x, y: p.y, w: 120 / scale, h: 28 / scale, text: '', color: coercedProps.color, fontSize: coercedProps.fontSize, opacity: coercedProps.opacity, strokeWidth: coercedProps.strokeWidth } as any;
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
          onSyncToolProperties?.({ color: c.color, fontSize: c.fontSize, strokeWidth: c.strokeWidth, opacity: c.opacity }, 'callout');
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
        drawingRef.current = { kind: 'calloutLeader', ax: p.x, ay: p.y, tx: p.x, ty: p.y, color: coercedProps.color, strokeWidth: coercedProps.strokeWidth, opacity: coercedProps.opacity, fontSize: coercedProps.fontSize } as any;
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
        drawingRef.current = { x: p.x, y: p.y, w: 0, h: 0, color: coercedProps.color, strokeWidth: cloudStrokeWidth, opacity: coercedProps.opacity, scallopSize: cloudScallopSize } as Cloud;
        setSelectedCloud(null); // don't show handles during initial drag
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
        // Allow dragging existing standalone text boxes too
        if (!movingCalloutRef.current) {
          for (let i = texts.length - 1; i >= 0; i--) {
            const t = texts[i];
            const x = t.w >= 0 ? t.x : t.x + t.w;
            const y = t.h >= 0 ? t.y : t.y + t.h;
            const w = Math.max(20, Math.abs(t.w));
            const h = Math.max(16, Math.abs(t.h));
            if (local.x >= x && local.x <= x + w && local.y >= y && local.y <= y + h) {
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

    const onMove = (e: MouseEvent) => {
      if (drawingRef.current) {
        if ((drawingRef.current as FreehandPath).points) {
          const p = getLocalPoint(e);
          (drawingRef.current as FreehandPath).points.push(p);
        } else {
          const p = getLocalPoint(e);
          const anyRef = drawingRef.current as any;
          if (typeof (anyRef as Rect).w === 'number' && typeof (anyRef as Rect).h === 'number') {
            const r = anyRef as Rect;
          r.w = p.x - r.x;
          r.h = p.y - r.y;
          } else if (typeof (anyRef as Circle).r === 'number') {
            const c = anyRef as Circle;
            const dx = p.x - c.x;
            const dy = p.y - c.y;
            c.r = Math.sqrt(dx * dx + dy * dy);
          } else if (typeof (anyRef as Arrow).x1 === 'number') {
            const a = anyRef as Arrow;
            a.x2 = p.x;
            a.y2 = p.y;
          } else if ((anyRef as TextBox).text !== undefined) {
            const t = anyRef as TextBox;
            // allow resize while dragging
            t.w = p.x - t.x;
            t.h = p.y - t.y;
          } else if (anyRef.kind === 'calloutLeader') {
            // Update the tail point (where the box will appear later)
            anyRef.tx = p.x;
            anyRef.ty = p.y;
          } else if ((anyRef as Cloud).scallopSize !== undefined) {
            const c = anyRef as Cloud;
            c.w = p.x - c.x;
            c.h = p.y - c.y;
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
          setFreehands(prev => [...prev, drawingRef.current as FreehandPath]);
        } else {
          const anyRef = drawingRef.current as any;
          // IMPORTANT: save specific tool types BEFORE generic rectangle
          if ((anyRef as TextBox).text !== undefined) {
            const t = anyRef as TextBox;
            const normalized = {
              x: t.w >= 0 ? t.x : t.x + t.w,
              y: t.h >= 0 ? t.y : t.y + t.h,
              w: Math.max(20, Math.abs(t.w)),
              h: Math.max(16, Math.abs(t.h)),
              text: editorValue || '',
              color: t.color,
              fontSize: t.fontSize,
              opacity: t.opacity,
              strokeWidth: t.strokeWidth
            } as TextBox;
            setTexts(prev => {
              const idx = prev.length;
              const next = [...prev, normalized];
              setActiveEditor({ kind: 'text', index: idx });
              setEditorValue('');
              return next;
            });
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
              anchorY: leader.ay
            };
            setCallouts(prev => {
              const idx = prev.length;
              const next = [...prev, normalized];
              setActiveEditor({ kind: 'callout', index: idx });
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
      drawOverlay();
    };

    overlay.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      overlay.removeEventListener('mousedown', onDown);
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
          {/* Inline editors */}
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
            const padding = 8;
            const style: React.CSSProperties = {
              position: 'absolute',
              left: r.x * scale + padding,
              top: r.y * scale + padding / 2,
              width: r.w * scale - padding * 2,
              minHeight: r.h * scale - padding,
              height: 'auto',
              fontSize: r.fontSize * scale,
              lineHeight: `${r.fontSize * scale + 2}px`,
              color: '#111827',
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
              <textarea
                key={`editor-${activeEditor.kind}-${activeEditor.index}`}
                style={style}
                value={editorValue}
                onChange={e => {
                  setEditorValue(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                  // Expand width if needed
                  el.style.width = 'auto';
                  const newWidthPx = Math.max(el.scrollWidth, (r.w * scale - padding * 2));
                  el.style.width = `${newWidthPx}px`;
                  // Update underlying shape size to fit text
                  if (activeEditor.kind === 'callout') {
                    setCallouts(prev => prev.map((c, i) => i === activeEditor.index ? { ...c, w: (newWidthPx + padding * 2) / scale, h: (el.scrollHeight + padding) / scale } : c));
                  } else {
                    setTexts(prev => prev.map((t, i) => {
                      if (i !== activeEditor.index) return t;
                      const baseX = t.w >= 0 ? t.x : t.x + t.w;
                      const baseY = t.h >= 0 ? t.y : t.y + t.h;
                      return { ...t, x: baseX, y: baseY, w: (newWidthPx + padding * 2) / scale, h: (el.scrollHeight + padding) / scale };
                    }));
                  }
                }}
                onBlur={onCommit}
                onKeyDown={e => {
                  // Allow Enter to create new lines; commit with Ctrl+Enter
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    onCommit();
                  } else if (e.key === 'Escape') {
                    setActiveEditor(null);
                  }
                }}
                autoFocus
                placeholder={activeEditor.kind === 'callout' ? 'Type text here' : 'Type text here'}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}


