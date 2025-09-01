import { fabric } from 'fabric';

export type ToolType = 'select' | 'freehand' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'stamp' | 'callout' | 'measurement';

export interface ToolProperties {
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontWeight?: number;
  scallopSize?: number; // New property for cloud scallop size
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
    this.updateExistingShapes();
  }

  private updateExistingShapes() {
    if (!this.canvas) return;

    console.log('🔄 Updating existing shapes with properties:', this.toolProperties);

    // Update existing shapes to ensure they maintain transparent fill
    const objects = this.canvas.getObjects();
    console.log('📊 Found', objects.length, 'objects on canvas');
    
    objects.forEach((obj: any) => {
      if (obj.data?.isAnnotation) {
        console.log('🎯 Processing annotation:', obj.data.type, obj.data.isPreview ? '(preview)' : '(final)');
        
        if (obj.data?.type === 'cloud' && !obj.data?.isPreview) {
          // For cloud shapes, we need to recreate them with new scallop size
          // Only update final clouds, not preview clouds
          console.log('☁️ Updating cloud shape');
          this.updateCloudShape(obj);
        } else if (obj.data?.type !== 'cloud') {
          // For other shapes, just update stroke properties
          console.log('🎨 Updating stroke properties for', obj.data.type);
          obj.set({
            stroke: this.toolProperties.color,
            strokeWidth: this.toolProperties.strokeWidth,
            opacity: this.toolProperties.opacity,
            fill: 'transparent' // Ensure fill stays transparent
          });
        }
      }
    });
    
    this.canvas.renderAll();
    console.log('✅ Finished updating existing shapes');
  }

  private updateCloudShape(cloudObj: any) {
    try {
      // Use the original size stored in data, not the current bounds
      // This prevents the shape from changing size when scallop size changes
      const originalSize = cloudObj.data?.originalSize || 20;
      
      console.log('☁️ Updating cloud shape:', { originalSize, scallopSize: this.toolProperties.scallopSize });
      
      // Create new cloud with updated properties but same original dimensions
      const newCloud = this.createCloudShape(originalSize, this.toolProperties);
      
      // Copy the original cloud's properties (except the path data)
      newCloud.set({
        left: cloudObj.left,
        top: cloudObj.top,
        scaleX: cloudObj.scaleX || 1, // Preserve any scaling
        scaleY: cloudObj.scaleY || 1, // Preserve any scaling
        selectable: cloudObj.selectable,
        evented: cloudObj.evented,
        hasControls: cloudObj.hasControls,
        hasBorders: cloudObj.hasBorders,
        lockScalingX: cloudObj.lockScalingX,
        lockScalingY: cloudObj.lockScalingY,
        lockRotation: cloudObj.lockRotation,
        moveCursor: cloudObj.moveCursor,
        hoverCursor: cloudObj.hoverCursor,
        data: {
          ...cloudObj.data,
          originalSize: originalSize // Keep the original size unchanged
        }
      });
      
      // Replace the old cloud with the new one
      const index = this.canvas.getObjects().indexOf(cloudObj);
      if (index !== -1) {
        this.canvas.remove(cloudObj);
        this.canvas.insertAt(newCloud, index);
        console.log('☁️ Cloud updated successfully');
      } else {
        console.error('☁️ Could not find cloud object in canvas');
      }
    } catch (error) {
      console.error('☁️ Error updating cloud shape:', error);
    }
  }

  private setupEventListeners() {
    if (!this.canvas) return;

    // Remove any existing listeners
    this.canvas.off('mouse:down');
    this.canvas.off('mouse:move');
    this.canvas.off('mouse:up');
    this.canvas.off('object:modified');

    // Set up new listeners
    this.canvas.on('mouse:down', this.handleMouseDown.bind(this));
    this.canvas.on('mouse:move', this.handleMouseMove.bind(this));
    this.canvas.on('mouse:up', this.handleMouseUp.bind(this));
    this.canvas.on('object:modified', this.handleObjectModified.bind(this));
  }

  private handleObjectModified(e: any) {
    // Update the originalSize when a cloud is resized
    const obj = e.target;
    if (obj && obj.data?.isAnnotation && obj.data?.type === 'cloud') {
      const bounds = obj.getBoundingRect();
      const currentSize = Math.max(bounds.width, bounds.height);
      obj.data.originalSize = currentSize;
      console.log('☁️ Cloud resized, updated originalSize to:', currentSize);
    }
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
        onMouseDown: this.handleCloudMouseDown.bind(this),
        onMouseMove: this.handleCloudMouseMove.bind(this),
        onMouseUp: this.handleCloudMouseUp.bind(this),
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
      fill: 'transparent', // No fill - only stroke should be visible
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
        fill: 'transparent', // No fill - only stroke should be visible
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
      fill: 'transparent', // No fill - only stroke should be visible
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
        fill: 'transparent', // No fill - only stroke should be visible
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

  // Cloud Tool Handlers
    private handleCloudMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('☁️ Cloud mouse down');
    const pointer = canvas.getPointer(e.e);
    this.startX = pointer.x;
    this.startY = pointer.y;
    
    // Create a temporary cloud object for preview
    const cloud = this.createCloudShape(20, toolProperties);
    cloud.set({
      left: this.startX, // Position at click point (center origin)
      top: this.startY,
      selectable: false,
      evented: false,
      data: {
        isAnnotation: true,
        type: 'cloud',
        isPreview: true
      }
    });
    
    canvas.add(cloud);
    canvas.renderAll();
  }

  private handleCloudMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    if (!this.isDrawing) return;
    
    const pointer = canvas.getPointer(e.e);
    const objects = canvas.getObjects();
    const previewCloud = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'cloud');
    
    if (previewCloud) {
      // Calculate size for square aspect ratio
      const size = Math.max(
        Math.abs(pointer.x - this.startX),
        Math.abs(pointer.y - this.startY)
      );
      const minSize = 20; // Minimum size of 20
      
      // Remove the old cloud
      canvas.remove(previewCloud);
      
      // Create new cloud with square aspect ratio
      const newCloud = this.createCloudShape(size, toolProperties);
      newCloud.set({
        left: this.startX, // Position at start point (center origin)
        top: this.startY,
        selectable: false,
        evented: false,
        data: {
          isAnnotation: true,
          type: 'cloud',
          isPreview: true
        }
      });
      
      canvas.add(newCloud);
      canvas.renderAll();
    }
  }

  private handleCloudMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('☁️ Cloud mouse up');
    if (!this.isDrawing) return;
    
    const pointer = canvas.getPointer(e.e);
    const objects = canvas.getObjects();
    const previewCloud = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'cloud');
    
    if (previewCloud) {
      // Calculate size for square aspect ratio
      const size = Math.max(
        Math.abs(pointer.x - this.startX),
        Math.abs(pointer.y - this.startY)
      );
      const minSize = 20; // Minimum size of 20
      
      // Remove the preview cloud
      canvas.remove(previewCloud);
      
             // Create final cloud with square aspect ratio
       const finalCloud = this.createCloudShape(size, toolProperties);
       finalCloud.set({
         left: this.startX, // Position at start point (center origin)
         top: this.startY,
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
           type: 'cloud',
           id: Date.now().toString(),
           originalSize: size // Store the original size
         }
       });
      
      canvas.add(finalCloud);
      
      // Ensure the cloud is immediately selectable
      this.canvas.setActiveObject(finalCloud);
      canvas.renderAll();
      
      // Optionally prompt for text after cloud creation
      setTimeout(() => {
        const addText = confirm('Would you like to add text to this cloud?');
        if (addText) {
          this.addTextToCloud(finalCloud, canvas);
        }
      }, 100);
    }
  }

  private addTextToCloud(cloud: any, canvas: fabric.Canvas) {
    // Get cloud bounds
    const cloudBounds = cloud.getBoundingRect();
    const centerX = cloudBounds.left + cloudBounds.width / 2;
    const centerY = cloudBounds.top + cloudBounds.height / 2;
    
    // Create text object
    const textObj = new (fabric as any).IText('Revision text', {
      left: centerX,
      top: centerY,
      fontSize: 12,
      fill: '#000000',
      fontWeight: 400,
      opacity: 1.0,
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
      originX: 'center',
      originY: 'center',
      data: {
        isAnnotation: true,
        type: 'text',
        id: Date.now().toString(),
        cloudId: cloud.data.id
      }
    });
    
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
  }

  private createCloudShape(size: number, toolProperties: ToolProperties) {
    // Create a square cloud shape with consistent scallops
    const baseSize = Math.max(size, 20); // Minimum size of 20
    
    // Use the passed toolProperties or fall back to the instance's toolProperties
    const properties = toolProperties || this.toolProperties;
    const scallopRadius = properties.scallopSize || 8; // Use configurable scallop size with default
    
    // Calculate square corners (centered around 0,0)
    const halfSize = baseSize / 2;
    const left = -halfSize;
    const right = halfSize;
    const top = -halfSize;
    const bottom = halfSize;
    
    // Calculate spacing for consistent scallops
    // Each scallop should be evenly spaced along the perimeter
    const perimeter = baseSize * 4; // Square perimeter
    const scallopSpacing = scallopRadius * 2; // Distance between scallop centers
    const totalScallops = Math.floor(perimeter / scallopSpacing);
    const scallopsPerSide = Math.max(2, Math.floor(totalScallops / 4));
    
    // Generate path data for scalloped rectangle
    let pathData = '';
    
    // Top edge
    for (let i = 0; i < scallopsPerSide; i++) {
      const x = left + (i * scallopSpacing);
      const centerX = x + scallopRadius;
      const centerY = top;
      const startAngle = Math.PI;
      const endAngle = 0;
      pathData += this.createArcSegment(centerX, centerY, scallopRadius, startAngle, endAngle, i === 0);
    }
    
    // Right edge
    for (let i = 0; i < scallopsPerSide; i++) {
      const y = top + (i * scallopSpacing);
      const centerX = right;
      const centerY = y + scallopRadius;
      const startAngle = -Math.PI / 2;
      const endAngle = Math.PI / 2;
      pathData += this.createArcSegment(centerX, centerY, scallopRadius, startAngle, endAngle, false);
    }
    
    // Bottom edge
    for (let i = 0; i < scallopsPerSide; i++) {
      const x = right - (i * scallopSpacing);
      const centerX = x - scallopRadius;
      const centerY = bottom;
      const startAngle = 0;
      const endAngle = Math.PI;
      pathData += this.createArcSegment(centerX, centerY, scallopRadius, startAngle, endAngle, false);
    }
    
    // Left edge
    for (let i = 0; i < scallopsPerSide; i++) {
      const y = bottom - (i * scallopSpacing);
      const centerX = left;
      const centerY = y - scallopRadius;
      const startAngle = Math.PI / 2;
      const endAngle = -Math.PI / 2;
      pathData += this.createArcSegment(centerX, centerY, scallopRadius, startAngle, endAngle, false);
    }
    
    // Close the path
    pathData += 'Z';
    
    // Create the cloud shape using SVG path
    const cloudPath = new (fabric as any).Path(pathData, {
      fill: 'transparent',
      stroke: properties.color,
      strokeWidth: properties.strokeWidth,
      opacity: properties.opacity,
      selectable: false,
      evented: false,
                 originX: 'center',
           originY: 'center'
         });
    
    return cloudPath;
  }
  
  private createArcSegment(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, isFirstSegment: boolean = false): string {
    // Create an arc segment using SVG arc commands
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);
    
    // Determine if we need a large arc (sweep flag)
    const angleDiff = endAngle - startAngle;
    const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
    
    // For the first segment, use 'M' to move to the start point
    // For subsequent segments, just use the arc command to connect smoothly
    if (isFirstSegment) {
      return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} `;
    } else {
      return `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} `;
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
