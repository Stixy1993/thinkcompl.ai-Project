import { fabric } from 'fabric';

export type ToolType = 'select' | 'freehand' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'stamp' | 'callout' | 'measurement';

export interface ToolProperties {
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontWeight?: number;
}

export interface ToolHandler {
  onMouseDown?: (e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) => void;
  onMouseMove?: (e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) => void;
  onMouseUp?: (e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) => void;
  cursor: string;
  requiresDrawingMode?: boolean;
}

export class ToolManager {
  private canvas: fabric.Canvas | null = null;
  private activeTool: ToolType = 'select';
  private toolProperties: ToolProperties;
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private justFinishedEditing = false;
  private editingTimeout: NodeJS.Timeout | null = null;

  constructor(toolProperties: ToolProperties) {
    this.toolProperties = toolProperties;
  }

  setCanvas(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  setActiveTool(tool: ToolType) {
    console.log('🛠️ Tool Manager: Switching to tool:', tool);
    this.activeTool = tool;
    this.updateCanvasMode();
  }

  setToolProperties(properties: ToolProperties) {
    this.toolProperties = properties;
    this.updateBrushProperties();
  }

  private setupEventListeners() {
    if (!this.canvas) return;

    // Remove any existing listeners
    this.canvas.off('mouse:down');
    this.canvas.off('mouse:move');
    this.canvas.off('mouse:up');

    // Set up new listeners
    this.canvas.on('mouse:down', this.handleMouseDown.bind(this));
    this.canvas.on('mouse:move', this.handleMouseMove.bind(this));
    this.canvas.on('mouse:up', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(e: any) {
    if (!this.canvas) return;

    const pointer = this.canvas.getPointer(e.e);
    
    // Check if we clicked on an existing object first
    const target = this.canvas.findTarget(e.e, false);
    if (target && target.data?.isAnnotation) {
      // If we clicked on an existing annotation, let Fabric.js handle selection
      console.log('🎯 Clicked on existing annotation, allowing selection');
      return;
    }

    // Only start drawing if we're in a drawing tool and clicked on empty space
    if (this.activeTool === 'select' || this.activeTool === 'text') {
      // Let Fabric.js handle normal selection for these tools
      return;
    }

    // Start drawing mode
    this.isDrawing = true;
    this.startX = pointer.x;
    this.startY = pointer.y;

    console.log('🖱️ Mouse down:', this.activeTool, 'at', pointer.x, pointer.y);

    const handler = this.getToolHandler(this.activeTool);
    if (handler?.onMouseDown) {
      handler.onMouseDown(e, this.canvas, this.toolProperties);
    }
  }

  private handleMouseMove(e: any) {
    if (!this.canvas || !this.isDrawing) return;

    const handler = this.getToolHandler(this.activeTool);
    if (handler?.onMouseMove) {
      handler.onMouseMove(e, this.canvas, this.toolProperties);
    }
  }

  private handleMouseUp(e: any) {
    if (!this.canvas) return;

    console.log('🖱️ Mouse up:', this.activeTool);

    const handler = this.getToolHandler(this.activeTool);
    if (handler?.onMouseUp) {
      handler.onMouseUp(e, this.canvas, this.toolProperties);
    }

    this.isDrawing = false;
    
    // Ensure canvas is in select mode for moving objects after drawing
    if (this.activeTool !== 'freehand') {
      this.canvas.isDrawingMode = false;
      // Force a render to ensure selection handles appear
      this.canvas.renderAll();
      
      // Temporarily switch to select mode to allow immediate selection
      setTimeout(() => {
        if (this.canvas) {
          this.canvas.selection = true;
          this.canvas.renderAll();
        }
      }, 100);
    }
  }

  private getToolHandler(tool: ToolType): ToolHandler | null {
    const handlers: Record<ToolType, ToolHandler> = {
      select: {
        cursor: 'default'
      },
      freehand: {
        onMouseDown: this.handleFreehandMouseDown.bind(this),
        onMouseMove: this.handleFreehandMouseMove.bind(this),
        onMouseUp: this.handleFreehandMouseUp.bind(this),
        cursor: 'crosshair',
        requiresDrawingMode: true
      },
      text: {
        onMouseDown: this.handleTextMouseDown.bind(this),
        cursor: 'text'
      },
      rectangle: {
        onMouseDown: this.handleRectangleMouseDown.bind(this),
        onMouseMove: this.handleRectangleMouseMove.bind(this),
        onMouseUp: this.handleRectangleMouseUp.bind(this),
        cursor: 'crosshair'
      },
      circle: {
        onMouseDown: this.handleCircleMouseDown.bind(this),
        onMouseMove: this.handleCircleMouseMove.bind(this),
        onMouseUp: this.handleCircleMouseUp.bind(this),
        cursor: 'crosshair'
      },
      arrow: {
        onMouseDown: this.handleArrowMouseDown.bind(this),
        onMouseMove: this.handleArrowMouseMove.bind(this),
        onMouseUp: this.handleArrowMouseUp.bind(this),
        cursor: 'crosshair'
      },
      cloud: {
        onMouseDown: this.handleShapeMouseDown.bind(this),
        onMouseMove: this.handleShapeMouseMove.bind(this),
        onMouseUp: this.handleShapeMouseUp.bind(this),
        cursor: 'crosshair'
      },
      stamp: {
        onMouseDown: this.handleStampMouseDown.bind(this),
        cursor: 'crosshair'
      },
      callout: {
        onMouseDown: this.handleShapeMouseDown.bind(this),
        onMouseMove: this.handleShapeMouseMove.bind(this),
        onMouseUp: this.handleShapeMouseUp.bind(this),
        cursor: 'crosshair'
      },
      measurement: {
        onMouseDown: this.handleShapeMouseDown.bind(this),
        onMouseMove: this.handleShapeMouseMove.bind(this),
        onMouseUp: this.handleShapeMouseUp.bind(this),
        cursor: 'crosshair'
      }
    };

    return handlers[tool] || null;
  }

  private updateCanvasMode() {
    if (!this.canvas) return;

    const handler = this.getToolHandler(this.activeTool);
    if (handler?.requiresDrawingMode) {
      this.canvas.isDrawingMode = true;
      this.updateBrushProperties();
    } else {
      this.canvas.isDrawingMode = false;
    }
  }

  private updateBrushProperties() {
    if (!this.canvas || !this.canvas.freeDrawingBrush) return;

    const { color, strokeWidth, opacity } = this.toolProperties;
    
    // Convert hex color to RGBA with opacity
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const rgbaColor = hexToRgba(color, opacity);
    
    this.canvas.freeDrawingBrush.width = strokeWidth;
    this.canvas.freeDrawingBrush.color = rgbaColor;
    this.canvas.freeDrawingBrush.stroke = rgbaColor;

    console.log('🎨 Brush properties updated:', {
      width: strokeWidth,
      color: rgbaColor
    });
  }

  // Freehand Tool Handlers
  private handleFreehandMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('🎨 Freehand mouse down');
    canvas.isDrawingMode = true;
    
    // Ensure brush exists and set properties
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new (fabric as any).PencilBrush(canvas);
    }
    
    this.updateBrushProperties();
  }

  private handleFreehandMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    // Fabric.js handles the drawing automatically when isDrawingMode is true
  }

  private handleFreehandMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('🎨 Freehand mouse up');
    // Keep drawing mode enabled for continuous drawing
    canvas.isDrawingMode = true;
  }

  // Text Tool Handlers
  private handleTextMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('📝 Text mouse down');
    
    // Check if we clicked on an existing text object
    const target = canvas.findTarget(e.e, false);
    if (target && target.data?.isAnnotation) {
      if (target.type === 'i-text' || target.type === 'text') {
        canvas.setActiveObject(target);
        return;
      }
      return;
    }

    // Don't create new text box if we just finished editing one
    if (this.justFinishedEditing) {
      console.log('🚫 Preventing new text box creation - just finished editing');
      return;
    }

    const pointer = canvas.getPointer(e.e);
    
    // Create text annotation
    const textObj = new (fabric as any).IText('Type text here', {
      left: pointer.x,
      top: pointer.y,
      fontSize: toolProperties.fontSize || 12,
      fill: '#999999', // Start with grey placeholder
      fontWeight: toolProperties.fontWeight || 400,
      opacity: toolProperties.opacity || 1.0,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'normal',
      selectable: true,
      editable: true,
      evented: true,
      moveCursor: 'grab',
      hoverCursor: 'grab',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      stroke: '',
      strokeWidth: 0,
      padding: 4,
      hasControls: false,
      hasBorders: true,
      borderColor: '#3B82F6',
      lockScalingX: true,
      lockScalingY: true,
      data: {
        isAnnotation: true,
        type: 'text',
        id: Date.now().toString(),
        isPlaceholder: true
      }
    });

    // Handle text editing
    let isEditingMode = false;
    
    textObj.on('editing:entered', () => {
      console.log('🖊️ Text editing started');
      isEditingMode = true;
      if (textObj.data?.isPlaceholder) {
        textObj.selectAll();
        textObj.removeChars(0, textObj.text.length);
        textObj.fill = '#000000';
        textObj.data.isPlaceholder = false;
        canvas.renderAll();
      }
    });

    textObj.on('editing:exited', () => {
      console.log('🖊️ Text editing ended');
      isEditingMode = false;
      
      // Set flag to prevent immediate new text box creation
      this.justFinishedEditing = true;
      
      if (this.editingTimeout) clearTimeout(this.editingTimeout);
      this.editingTimeout = setTimeout(() => {
        this.justFinishedEditing = false;
        console.log('🔓 Text editing cooldown ended - new text boxes allowed');
      }, 300);
      
      // Only restore placeholder if completely empty
      if (textObj.text.trim() === '') {
        textObj.text = 'Type text here';
        textObj.fill = '#999999';
        textObj.fontWeight = 'normal';
        textObj.data.isPlaceholder = true;
        canvas.renderAll();
      }
    });

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
  }

  // Arrow Tool Handlers
  private handleArrowMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('➡️ Arrow mouse down');
    const pointer = canvas.getPointer(e.e);
    this.startX = pointer.x;
    this.startY = pointer.y;
    
    // Create a temporary arrow object for preview
    const arrow = new (fabric as any).Line([this.startX, this.startY, this.startX, this.startY], {
      stroke: toolProperties.color,
      strokeWidth: toolProperties.strokeWidth,
      opacity: toolProperties.opacity,
      selectable: false,
      evented: false,
      data: {
        isAnnotation: true,
        type: 'arrow',
        isPreview: true
      }
    });
    
    canvas.add(arrow);
    canvas.renderAll();
  }

  private handleArrowMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    if (!this.isDrawing) return;
    
    const pointer = canvas.getPointer(e.e);
    const objects = canvas.getObjects();
    const previewArrow = objects.find(obj => obj.data?.isPreview);
    
    if (previewArrow) {
      previewArrow.set({
        x2: pointer.x,
        y2: pointer.y
      });
      canvas.renderAll();
    }
  }

  private handleArrowMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('➡️ Arrow mouse up');
    if (!this.isDrawing) return;
    
    const pointer = canvas.getPointer(e.e);
    const objects = canvas.getObjects();
    const previewArrow = objects.find(obj => obj.data?.isPreview);
    
    if (previewArrow) {
      // Convert preview to final arrow
      previewArrow.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        moveCursor: 'grab',
        hoverCursor: 'grab',
        strokeWidth: toolProperties.strokeWidth * 2, // Make stroke wider for easier selection
        data: {
          isAnnotation: true,
          type: 'arrow',
          id: Date.now().toString()
        }
      });
      
      // Add arrowhead
      const arrowhead1 = this.createArrowhead(previewArrow, pointer.x, pointer.y, toolProperties, 1);
      const arrowhead2 = this.createArrowhead(previewArrow, pointer.x, pointer.y, toolProperties, 2);
      
      // Create a group containing the arrow and arrowheads
      const arrowGroup = new (fabric as any).Group([previewArrow, arrowhead1, arrowhead2], {
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        moveCursor: 'grab',
        hoverCursor: 'grab',
        data: {
          isAnnotation: true,
          type: 'arrow-group',
          id: previewArrow.data.id
        }
      });
      
      // Remove the individual objects and add the group
      canvas.remove(previewArrow);
      canvas.remove(arrowhead1);
      canvas.remove(arrowhead2);
      canvas.add(arrowGroup);
      
      // Ensure the arrow group is immediately selectable
      this.canvas.setActiveObject(arrowGroup);
      canvas.renderAll();
    }
  }

  private createArrowhead(arrow: any, endX: number, endY: number, toolProperties: ToolProperties, arrowheadNumber: number) {
    // Calculate arrow direction
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const angle = Math.atan2(dy, dx);
    
    // Arrowhead size
    const arrowheadLength = toolProperties.strokeWidth * 3;
    const arrowheadAngle = Math.PI / 6; // 30 degrees
    
    // Calculate arrowhead points
    const x1 = endX - arrowheadLength * Math.cos(angle - arrowheadAngle);
    const y1 = endY - arrowheadLength * Math.sin(angle - arrowheadAngle);
    const x2 = endX - arrowheadLength * Math.cos(angle + arrowheadAngle);
    const y2 = endY - arrowheadLength * Math.sin(angle + arrowheadAngle);
    
    // Create arrowhead line based on which part of the arrowhead
    const points = arrowheadNumber === 1 ? [endX, endY, x1, y1] : [endX, endY, x2, y2];
    
    const arrowhead = new (fabric as any).Line(points, {
      stroke: toolProperties.color,
      strokeWidth: toolProperties.strokeWidth,
      opacity: toolProperties.opacity,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      data: {
        isAnnotation: true,
        type: 'arrowhead',
        parentId: arrow.data.id,
        arrowheadNumber: arrowheadNumber
      }
    });
    
    return arrowhead;
  }

  private addArrowhead(arrow: any, endX: number, endY: number, toolProperties: ToolProperties) {
    // Calculate arrow direction
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const angle = Math.atan2(dy, dx);
    
    // Arrowhead size
    const arrowheadLength = toolProperties.strokeWidth * 3;
    const arrowheadAngle = Math.PI / 6; // 30 degrees
    
    // Calculate arrowhead points
    const x1 = endX - arrowheadLength * Math.cos(angle - arrowheadAngle);
    const y1 = endY - arrowheadLength * Math.sin(angle - arrowheadAngle);
    const x2 = endX - arrowheadLength * Math.cos(angle + arrowheadAngle);
    const y2 = endY - arrowheadLength * Math.sin(angle + arrowheadAngle);
    
    // Create arrowhead lines
    const arrowhead1 = new (fabric as any).Line([endX, endY, x1, y1], {
      stroke: toolProperties.color,
      strokeWidth: toolProperties.strokeWidth,
      opacity: toolProperties.opacity,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      data: {
        isAnnotation: true,
        type: 'arrowhead',
        parentId: arrow.data.id
      }
    });
    
    const arrowhead2 = new (fabric as any).Line([endX, endY, x2, y2], {
      stroke: toolProperties.color,
      strokeWidth: toolProperties.strokeWidth,
      opacity: toolProperties.opacity,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      data: {
        isAnnotation: true,
        type: 'arrowhead',
        parentId: arrow.data.id
      }
    });
    
    this.canvas?.add(arrowhead1);
    this.canvas?.add(arrowhead2);
  }

  // Rectangle Tool Handlers
  private handleRectangleMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('⬜ Rectangle mouse down');
    const pointer = canvas.getPointer(e.e);
    this.startX = pointer.x;
    this.startY = pointer.y;
    
    // Create a temporary rectangle object for preview
    const rect = new (fabric as any).Rect({
      left: this.startX,
      top: this.startY,
      width: 0,
      height: 0,
      fill: 'rgba(0, 0, 0, 0.01)', // Nearly transparent fill for selection
      stroke: toolProperties.color,
      strokeWidth: toolProperties.strokeWidth,
      opacity: toolProperties.opacity,
      selectable: false,
      evented: false,
      data: {
        isAnnotation: true,
        type: 'rectangle',
        isPreview: true
      }
    });
    
    canvas.add(rect);
    canvas.renderAll();
  }

  private handleRectangleMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    if (!this.isDrawing) return;
    
    const pointer = canvas.getPointer(e.e);
    const objects = canvas.getObjects();
    const previewRect = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'rectangle');
    
    if (previewRect) {
      const width = Math.abs(pointer.x - this.startX);
      const height = Math.abs(pointer.y - this.startY);
      const left = Math.min(pointer.x, this.startX);
      const top = Math.min(pointer.y, this.startY);
      
      previewRect.set({
        left: left,
        top: top,
        width: width,
        height: height
      });
      canvas.renderAll();
    }
  }

  private handleRectangleMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('⬜ Rectangle mouse up');
    if (!this.isDrawing) return;
    
    const objects = canvas.getObjects();
    const previewRect = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'rectangle');
    
    if (previewRect) {
      // Convert preview to final rectangle
      previewRect.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        moveCursor: 'grab',
        hoverCursor: 'grab',
        fill: 'rgba(0, 0, 0, 0.01)', // Nearly transparent fill for selection
        data: {
          isAnnotation: true,
          type: 'rectangle',
          id: Date.now().toString()
        }
      });
      
      // Ensure the shape is immediately selectable
      this.canvas.setActiveObject(previewRect);
      canvas.renderAll();
    }
  }

  // Circle Tool Handlers
  private handleCircleMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('⭕ Circle mouse down');
    const pointer = canvas.getPointer(e.e);
    this.startX = pointer.x;
    this.startY = pointer.y;
    
    // Create a temporary circle object for preview
    const circle = new (fabric as any).Circle({
      left: this.startX,
      top: this.startY,
      radius: 0,
      fill: 'rgba(0, 0, 0, 0.01)', // Nearly transparent fill for selection
      stroke: toolProperties.color,
      strokeWidth: toolProperties.strokeWidth,
      opacity: toolProperties.opacity,
      selectable: false,
      evented: false,
      data: {
        isAnnotation: true,
        type: 'circle',
        isPreview: true
      }
    });
    
    canvas.add(circle);
    canvas.renderAll();
  }

  private handleCircleMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    if (!this.isDrawing) return;
    
    const pointer = canvas.getPointer(e.e);
    const objects = canvas.getObjects();
    const previewCircle = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'circle');
    
    if (previewCircle) {
      const radius = Math.sqrt(
        Math.pow(pointer.x - this.startX, 2) + 
        Math.pow(pointer.y - this.startY, 2)
      );
      
      previewCircle.set({
        radius: radius
      });
      canvas.renderAll();
    }
  }

  private handleCircleMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('⭕ Circle mouse up');
    if (!this.isDrawing) return;
    
    const objects = canvas.getObjects();
    const previewCircle = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'circle');
    
    if (previewCircle) {
      // Convert preview to final circle
      previewCircle.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        moveCursor: 'grab',
        hoverCursor: 'grab',
        fill: 'rgba(0, 0, 0, 0.01)', // Nearly transparent fill for selection
        data: {
          isAnnotation: true,
          type: 'circle',
          id: Date.now().toString()
        }
      });
      
      // Ensure the shape is immediately selectable
      this.canvas.setActiveObject(previewCircle);
      canvas.renderAll();
    }
  }

  // Shape Tool Handlers (placeholder for other shapes)
  private handleShapeMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('🔲 Shape mouse down:', this.activeTool);
    // TODO: Implement other shapes (cloud, callout, measurement, etc.)
  }

  private handleShapeMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    // TODO: Implement other shapes
  }

  private handleShapeMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('🔲 Shape mouse up:', this.activeTool);
    // TODO: Implement other shapes
  }

  // Stamp Tool Handler (placeholder for now)
  private handleStampMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('🏷️ Stamp mouse down');
    // TODO: Implement stamp
  }

  // Cleanup
  destroy() {
    if (this.editingTimeout) {
      clearTimeout(this.editingTimeout);
    }
    if (this.canvas) {
      this.canvas.off('mouse:down');
      this.canvas.off('mouse:move');
      this.canvas.off('mouse:up');
    }
  }
}
