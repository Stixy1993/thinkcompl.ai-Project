import { fabric } from 'fabric';

export type ToolType = 'select' | 'freehand' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'stamp' | 'callout' | 'measurement';

export interface ToolProperties {
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify'; // Text alignment property
  scallopSize?: number; // New property for cloud scallop size
  cloudLineThickness?: number; // New property for cloud line thickness
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
  private lastCreatedCloudId: string | null = null; // Track the most recently created cloud
  private onPropertiesUpdate?: (properties: ToolProperties) => void; // Callback to update UI

  constructor(toolProperties: ToolProperties, onPropertiesUpdate?: (properties: ToolProperties) => void) {
    this.toolProperties = toolProperties;
    this.onPropertiesUpdate = onPropertiesUpdate;
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

    // Get the currently selected object
    const activeObject = this.canvas.getActiveObject();
    console.log('🔄 Active object:', activeObject?.data?.type, activeObject?.data?.id);
    
    // Update existing shapes to ensure they maintain transparent fill
    const objects = this.canvas.getObjects();
    console.log('📊 Found', objects.length, 'objects on canvas');
    
         // Check if we have a selected cloud object
     const selectedCloud = activeObject && activeObject.data?.isAnnotation && 
                          activeObject.data?.type === 'cloud' && 
                          !activeObject.data?.isPreview;
    
    console.log('🎯 Selected cloud:', selectedCloud ? 'YES' : 'NO', 'Active object:', activeObject?.data?.type);
    console.log('🎯 Active object details:', {
      hasActiveObject: !!activeObject,
      isAnnotation: activeObject?.data?.isAnnotation,
      type: activeObject?.data?.type,
      isPreview: activeObject?.data?.isPreview,
      selectedCloud: selectedCloud,
      activeObjectId: activeObject?.data?.id
    });
    
    // ONLY update the selected object, not all objects
    if (activeObject && activeObject.data?.isAnnotation) {
      console.log('🎯 Updating selected object:', activeObject.data.type, activeObject.data.id);
      
             if ((activeObject.data?.type === 'cloud') && !activeObject.data?.isPreview) {
         // For cloud shapes, update properties
         console.log('☁️ Updating selected cloud shape (including all properties)');
         this.updateCloudShape(activeObject);
       } else if (activeObject.data?.type === 'text') {
        // For text objects, update color, fontSize, fontWeight, opacity, and textAlign
        console.log('📝 Updating selected text object');
        const currentFill = activeObject.fill;
        const isPlaceholder = activeObject.data?.isPlaceholder;
        
        // Only change color if it's not a placeholder and the current color is visible
        let newFill = currentFill;
        if (!isPlaceholder && (currentFill === '#999999' || currentFill === 'rgba(153, 153, 153, 1)')) {
          // If it's placeholder color, change to black
          newFill = '#000000';
        } else if (isPlaceholder) {
          // Keep placeholder color
          newFill = '#999999';
        } else {
          // Keep current color if it's already visible
          newFill = currentFill;
        }
        
        activeObject.set({
          fill: newFill,
          fontSize: this.toolProperties.fontSize || 12,
          fontWeight: this.toolProperties.fontWeight || 400,
          opacity: this.toolProperties.opacity,
          textAlign: this.toolProperties.textAlign || 'left'
        });
      } else if (activeObject.data?.type === 'callout-group') {
        // For callout groups, update the text object inside
        console.log('💬 Updating selected callout group');
        const textObj = activeObject.getObjects().find((obj: any) => obj.data?.type === 'text');
        if (textObj) {
          const currentFill = textObj.fill;
          const isPlaceholder = textObj.data?.isPlaceholder;
          
          // Only change color if it's not a placeholder and the current color is visible
          let newFill = currentFill;
          if (!isPlaceholder && (currentFill === '#999999' || currentFill === 'rgba(153, 153, 153, 1)')) {
            // If it's placeholder color, change to black
            newFill = '#000000';
          } else if (isPlaceholder) {
            // Keep placeholder color
            newFill = '#999999';
          } else {
            // Keep current color if it's already visible
            newFill = currentFill;
          }
          
          textObj.set({
            fill: newFill,
            fontSize: this.toolProperties.fontSize || 12,
            fontWeight: this.toolProperties.fontWeight || 400,
            opacity: this.toolProperties.opacity,
            textAlign: this.toolProperties.textAlign || 'left'
          });
        }
             } else if (activeObject.data?.type !== 'cloud') {
         // For other shapes (rectangles, circles, arrows), just update stroke properties
         console.log('🎨 Updating stroke properties for', activeObject.data.type);
        activeObject.set({
          stroke: this.toolProperties.color,
          strokeWidth: this.toolProperties.strokeWidth,
          opacity: this.toolProperties.opacity,
          fill: 'transparent' // Ensure fill stays transparent
        });
      }
    }
    
    // REMOVED: The fallback logic that was updating the last drawn cloud
    // Now we ONLY update the selected object, never fall back to last drawn
    
    this.canvas.renderAll();
    console.log('✅ Finished updating existing shapes');
  }

     private updateCloudShape(cloudObj: any) {
     try {
       console.log('☁️ Updating cloud shape properties directly');
       
       // Handle individual cloud objects
       const scallopChanged = cloudObj.data?.scallopSize !== this.toolProperties.scallopSize;
       const lineThicknessChanged = cloudObj.data?.cloudLineThickness !== this.toolProperties.cloudLineThickness;
       
       if (scallopChanged || lineThicknessChanged) {
         // Regenerate the cloud shape with new scallop size
         const originalSize = cloudObj.data?.originalSize || 20;
         const newCloud = this.createCloudShape(originalSize, this.toolProperties);
         
         // Copy all properties from the old cloud
         newCloud.set({
           left: cloudObj.left,
           top: cloudObj.top,
           scaleX: cloudObj.scaleX || 1,
           scaleY: cloudObj.scaleY || 1,
           selectable: cloudObj.selectable,
           evented: cloudObj.evented,
           hasControls: cloudObj.hasControls,
           hasBorders: cloudObj.hasBorders,
           lockScalingX: false,
           lockScalingY: false,
           lockRotation: cloudObj.lockRotation,
           moveCursor: cloudObj.moveCursor,
           hoverCursor: cloudObj.hoverCursor,
           data: {
             ...cloudObj.data,
             originalSize: originalSize,
             scallopSize: this.toolProperties.scallopSize,
             cloudLineThickness: this.toolProperties.cloudLineThickness
           }
         });
         
         // Replace the old cloud with the new one
         const index = this.canvas.getObjects().indexOf(cloudObj);
         if (index !== -1) {
           this.canvas.remove(cloudObj);
           this.canvas.insertAt(newCloud, index);
           this.canvas.setActiveObject(newCloud);
           console.log('☁️ Cloud regenerated with new scallop size');
         }
       } else {
         // Just update the properties directly (for color/opacity changes)
         cloudObj.set({
           stroke: this.toolProperties.color,
           strokeWidth: this.toolProperties.cloudLineThickness || this.toolProperties.strokeWidth,
           opacity: this.toolProperties.opacity
         });
         
         // Update the stored data properties
         cloudObj.data.scallopSize = this.toolProperties.scallopSize;
         cloudObj.data.cloudLineThickness = this.toolProperties.cloudLineThickness;
         
         // Re-select the cloud to maintain selection
         this.canvas.setActiveObject(cloudObj);
         console.log('☁️ Cloud properties updated directly');
       }
       
       // Force a render to ensure changes are visible
       this.canvas.renderAll();
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
    console.log('🎯 Mouse down - target found:', target?.data?.type, target?.data?.id);
    
    if (target && target.data?.isAnnotation) {
      // If we clicked on an existing annotation, handle selection
      console.log('🎯 Clicked on existing annotation, handling selection');
      
             // Special handling for clouds - ensure we select the cloud directly
       if (target.data?.type === 'cloud') {
         // Direct click on cloud
         this.canvas.setActiveObject(target);
         
         // Switch to cloud tool when clicking on a cloud
         if (this.activeTool !== 'cloud') {
           console.log('🔄 Switching to cloud tool for cloud selection');
           this.setActiveTool('cloud');
         }
         
         // Update control panel with the cloud's properties
         this.updateControlPanelWithCloudProperties(target);
       } else {
         this.canvas.setActiveObject(target);
       }
      
      this.canvas.renderAll();
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
         onMouseDown: this.handleCalloutMouseDown.bind(this),
         onMouseMove: this.handleCalloutMouseMove.bind(this),
         onMouseUp: this.handleCalloutMouseUp.bind(this),
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
      textAlign: toolProperties.textAlign || 'left', // Add text alignment
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
      // Add text wrapping and boundary constraints
      width: 200, // Set a default width for text wrapping
      wordWrap: 'break-word', // Enable word wrapping
      splitByGrapheme: false, // Don't split by individual characters
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

  private createCalloutArrowhead(startX: number, startY: number, endX: number, endY: number, toolProperties: ToolProperties, arrowheadNumber: number) {
    // Calculate arrow direction from start to end
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    
    // Arrowhead size
    const arrowheadLength = toolProperties.strokeWidth * 3;
    const arrowheadAngle = Math.PI / 6; // 30 degrees
    
    // Calculate arrowhead points - positioned at start but pointing towards end
    const x1 = startX + arrowheadLength * Math.cos(angle - arrowheadAngle);
    const y1 = startY + arrowheadLength * Math.sin(angle - arrowheadAngle);
    const x2 = startX + arrowheadLength * Math.cos(angle + arrowheadAngle);
    const y2 = startY + arrowheadLength * Math.sin(angle + arrowheadAngle);
    
    // Create arrowhead line based on which part of the arrowhead
    const points = arrowheadNumber === 1 ? [startX, startY, x1, y1] : [startX, startY, x2, y2];
    
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
        parentId: Date.now().toString(),
        arrowheadNumber: arrowheadNumber
      }
    });
    
    return arrowhead;
  }

  private createArrowhead(arrow: any, endX: number, endY: number, toolProperties: ToolProperties, arrowheadNumber: number) {
    // Calculate arrow direction
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const angle = Math.atan2(dy, dx);
    
    // Arrowhead size
    const arrowheadLength = toolProperties.strokeWidth * 3;
    const arrowheadAngle = Math.PI / 6; // 30 degrees
    
    // Calculate arrowhead points - pointing TOWARDS the end point
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

  private createCalloutArrowhead(startX: number, startY: number, endX: number, endY: number, toolProperties: ToolProperties, arrowheadNumber: number) {
    // Calculate arrow direction from start to end
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    
    // Arrowhead size
    const arrowheadLength = toolProperties.strokeWidth * 3;
    const arrowheadAngle = Math.PI / 6; // 30 degrees
    
    // Calculate arrowhead points - positioned at start but pointing towards end
    const x1 = startX + arrowheadLength * Math.cos(angle - arrowheadAngle);
    const y1 = startY + arrowheadLength * Math.sin(angle - arrowheadAngle);
    const x2 = startX + arrowheadLength * Math.cos(angle + arrowheadAngle);
    const y2 = startY + arrowheadLength * Math.sin(angle + arrowheadAngle);
    
    // Create arrowhead line based on which part of the arrowhead
    const points = arrowheadNumber === 1 ? [startX, startY, x1, y1] : [startX, startY, x2, y2];
    
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
        parentId: Date.now().toString(),
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
    
         // Check if we clicked on an existing cloud object first
     const target = canvas.findTarget(e.e, false);
     console.log('☁️ Cloud mouse down - target found:', target?.data?.type, target?.data?.id);
     
     if (target && target.data?.isAnnotation && 
         target.data?.type === 'cloud') {
       // If we clicked on an existing cloud, just select it and don't create a new one
       console.log('☁️ Clicked on existing cloud, allowing selection');
       
       // Direct click on cloud
       canvas.setActiveObject(target);
       
       // Switch to cloud tool when clicking on a cloud
       if (this.activeTool !== 'cloud') {
         console.log('🔄 Switching to cloud tool for cloud selection');
         this.setActiveTool('cloud');
       }
       
       // Update control panel with the cloud's properties
       this.updateControlPanelWithCloudProperties(target);
       
       canvas.renderAll();
       return;
     }
    
    // If we clicked on empty space, start drawing mode but don't create cloud yet
    const pointer = canvas.getPointer(e.e);
    this.startX = pointer.x;
    this.startY = pointer.y;
    console.log('☁️ Clicked on empty space, starting drawing mode at', this.startX, this.startY);
  }

  private handleCloudMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    if (!this.isDrawing) return;
    
    const pointer = canvas.getPointer(e.e);
    
    // Check if we've moved enough to start drawing (small threshold to prevent accidental creation)
    const moveDistance = Math.sqrt(
      Math.pow(pointer.x - this.startX, 2) + 
      Math.pow(pointer.y - this.startY, 2)
    );
    
    if (moveDistance < 5) return; // Don't create cloud until we've moved at least 5 pixels
    
    const objects = canvas.getObjects();
    const previewCloud = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'cloud');
    
    if (!previewCloud) {
      // Create the preview cloud only when we start dragging
      const cloud = this.createCloudShape(20, toolProperties);
      cloud.set({
        left: this.startX,
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
    }
    
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
    
    // If we don't have a preview cloud, it means we didn't drag enough to create one
    // Just reset the drawing state and don't create anything
    if (!previewCloud) {
      console.log('☁️ No preview cloud found, resetting drawing state');
      this.startX = 0;
      this.startY = 0;
      return;
    }
    
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
     const cloudId = Date.now().toString();
     finalCloud.set({
       left: this.startX, // Position at start point
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
         id: cloudId,
         originalSize: size // Store the original size
       }
     });
     
     // Add the cloud directly to canvas (no group, no text)
     canvas.add(finalCloud);
     
     // Ensure the cloud is immediately selectable
     this.canvas.setActiveObject(finalCloud);
     canvas.renderAll();
    
         // Track this as the most recently created cloud
     this.lastCreatedCloudId = cloudId;
     
     // Reset drawing state
     this.startX = 0;
     this.startY = 0;
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
    const lineThickness = properties.cloudLineThickness || properties.strokeWidth || 1; // Use cloud-specific line thickness or fall back to stroke width
    
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
      strokeWidth: lineThickness, // Use the cloud-specific line thickness
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

         // Callout Tool Handlers
    private handleCalloutMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
      console.log('💬 Callout mouse down');
      const pointer = canvas.getPointer(e.e);
      this.startX = pointer.x;
      this.startY = pointer.y;
      
      // Don't create anything yet - wait for drag to start
      console.log('💬 Callout started at:', this.startX, this.startY);
    }

           private handleCalloutMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
      if (!this.isDrawing) return;
      
      const pointer = canvas.getPointer(e.e);
      
      // Check if we've moved enough to start drawing (small threshold to prevent accidental creation)
      const moveDistance = Math.sqrt(
        Math.pow(pointer.x - this.startX, 2) + 
        Math.pow(pointer.y - this.startY, 2)
      );
      
      if (moveDistance < 5) return; // Don't create callout until we've moved at least 5 pixels
      
      const objects = canvas.getObjects();
      const previewCallout = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'callout');
      
             if (!previewCallout) {
         // Create the preview arrow only when we start dragging
         const arrow = new (fabric as any).Line([this.startX, this.startY, pointer.x, pointer.y], {
           stroke: toolProperties.color,
           strokeWidth: toolProperties.strokeWidth,
           opacity: toolProperties.opacity,
           selectable: false,
           evented: false,
           data: {
             isAnnotation: true,
             type: 'callout',
             isPreview: true,
             isArrow: true
           }
         });
         
                   // Add arrowhead to the preview at the START point (where we clicked)
          const arrowhead1 = this.createCalloutArrowhead(this.startX, this.startY, pointer.x, pointer.y, toolProperties, 1);
          const arrowhead2 = this.createCalloutArrowhead(this.startX, this.startY, pointer.x, pointer.y, toolProperties, 2);
        
        // Set preview data on arrowheads
        arrowhead1.set({
          data: {
            isAnnotation: true,
            type: 'callout',
            isPreview: true,
            isArrowhead: true,
            arrowheadNumber: 1
          }
        });
        
        arrowhead2.set({
          data: {
            isAnnotation: true,
            type: 'callout',
            isPreview: true,
            isArrowhead: true,
            arrowheadNumber: 2
          }
        });
        
        // Add individual objects to canvas (not as a group)
        canvas.add(arrow);
        canvas.add(arrowhead1);
        canvas.add(arrowhead2);
      }
      
      if (previewCallout) {
        // Find the preview arrow and arrowheads
        const previewArrow = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'callout' && obj.data?.isArrow);
        const previewArrowhead1 = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'callout' && obj.data?.isArrowhead && obj.data?.arrowheadNumber === 1);
        const previewArrowhead2 = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'callout' && obj.data?.isArrowhead && obj.data?.arrowheadNumber === 2);
        
        if (previewArrow) {
          // Update the arrow position
          previewArrow.set({
            x2: pointer.x,
            y2: pointer.y
          });
          
                                 // Update arrowheads
            if (previewArrowhead1 && previewArrowhead2) {
              // Recalculate arrowhead positions at the START point
              const newArrowhead1 = this.createCalloutArrowhead(this.startX, this.startY, pointer.x, pointer.y, toolProperties, 1);
              const newArrowhead2 = this.createCalloutArrowhead(this.startX, this.startY, pointer.x, pointer.y, toolProperties, 2);
            
            previewArrowhead1.set({
              x1: newArrowhead1.x1,
              y1: newArrowhead1.y1,
              x2: newArrowhead1.x2,
              y2: newArrowhead1.y2
            });
            
            previewArrowhead2.set({
              x1: newArrowhead2.x1,
              y1: newArrowhead2.y1,
              x2: newArrowhead2.x2,
              y2: newArrowhead2.y2
            });
          }
          
          canvas.renderAll();
        }
      }
    }

       private handleCalloutMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
      console.log('💬 Callout mouse up');
      if (!this.isDrawing) return;
      
      const pointer = canvas.getPointer(e.e);
      const objects = canvas.getObjects();
      // Find all preview callout objects
      const previewArrow = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'callout' && obj.data?.isArrow);
      const previewArrowhead1 = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'callout' && obj.data?.isArrowhead && obj.data?.arrowheadNumber === 1);
      const previewArrowhead2 = objects.find(obj => obj.data?.isPreview && obj.data?.type === 'callout' && obj.data?.isArrowhead && obj.data?.arrowheadNumber === 2);
      
      // If we don't have a preview arrow, it means we didn't drag enough to create one
      // Just reset the drawing state and don't create anything
      if (!previewArrow) {
        console.log('💬 No preview callout found, resetting drawing state');
        this.startX = 0;
        this.startY = 0;
        return;
      }
      
      // Remove all preview objects
      if (previewArrow) canvas.remove(previewArrow);
      if (previewArrowhead1) canvas.remove(previewArrowhead1);
      if (previewArrowhead2) canvas.remove(previewArrowhead2);
      
             // Create final arrow (separate from the group)
       const finalArrow = new (fabric as any).Line([this.startX, this.startY, pointer.x, pointer.y], {
         stroke: toolProperties.color,
         strokeWidth: toolProperties.strokeWidth,
         opacity: toolProperties.opacity,
         selectable: false,
         evented: false,
         hasControls: false,
         hasBorders: false,
         data: {
           isAnnotation: true,
           type: 'callout-arrow',
           arrowOriginX: this.startX,
           arrowOriginY: this.startY
         }
       });
       
       // Add arrowhead to the final arrow at the START point
       const arrowhead1 = this.createCalloutArrowhead(this.startX, this.startY, pointer.x, pointer.y, toolProperties, 1);
       const arrowhead2 = this.createCalloutArrowhead(this.startX, this.startY, pointer.x, pointer.y, toolProperties, 2);
       
       // Set arrowhead data
       arrowhead1.set({
         data: {
           isAnnotation: true,
           type: 'arrowhead',
           arrowheadNumber: 1,
           arrowOriginX: this.startX,
           arrowOriginY: this.startY
         }
       });
       
       arrowhead2.set({
         data: {
           isAnnotation: true,
           type: 'arrowhead',
           arrowheadNumber: 2,
           arrowOriginX: this.startX,
           arrowOriginY: this.startY
         }
       });
       
               // Create text box at the end of the arrow
        const textBox = new (fabric as any).Rect({
          left: pointer.x - 50, // Position text box so its center is at the arrow end
          top: pointer.y - 20,
          width: 100,
          height: 40,
          fill: 'rgba(255, 255, 255, 1.0)', // 100% opaque white to hide the arrow behind
          stroke: toolProperties.color,
          strokeWidth: toolProperties.strokeWidth,
          opacity: toolProperties.opacity,
          rx: 4,
          ry: 4,
          selectable: false,
          evented: false,
          data: {
            isAnnotation: true,
            type: 'callout-box'
          }
        });
       
                       // Create text object for the callout
        const textObj = new (fabric as any).IText('Type text here', {
          left: pointer.x - 45, // Position text to align with the centered text box
          top: pointer.y - 15,
          fontSize: toolProperties.fontSize || 12,
          fill: '#999999', // Start with grey placeholder
          fontWeight: toolProperties.fontWeight || 400,
          opacity: toolProperties.opacity || 1.0,
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'normal',
          textAlign: toolProperties.textAlign || 'left', // Add text alignment
          selectable: true,
          editable: true,
          evented: true,
          moveCursor: 'text',
          hoverCursor: 'text',
          backgroundColor: 'transparent',
          stroke: '',
          strokeWidth: 0,
          padding: 4,
          hasControls: false,
          hasBorders: false,
          lockScalingX: true, // Prevent manual scaling
          lockScalingY: true, // Prevent manual scaling
          // Add text wrapping and boundary constraints
          width: 200, // Set a default width for text wrapping
          wordWrap: 'break-word', // Enable word wrapping
          splitByGrapheme: false, // Don't split by individual characters
          originX: 'left',
          originY: 'top',
          data: {
            isAnnotation: true,
            type: 'text',
            id: (Date.now() + 1).toString(),
            isPlaceholder: true
          }
        });
        
        // Force initial text color to be visible
        setTimeout(() => {
          textObj.fill = '#999999';
          canvas.renderAll();
        }, 100);
        
                 // Handle text editing for the callout text
         textObj.on('editing:entered', () => {
           console.log('🖊️ Callout text editing started');
           
           // Bring the text to the front when editing starts
           canvas.bringToFront(textObj);
           
           if (textObj.data?.isPlaceholder) {
             textObj.selectAll();
             textObj.removeChars(0, textObj.text.length);
             textObj.fill = '#000000'; // Set to black when editing starts
             textObj.data.isPlaceholder = false;
             canvas.renderAll();
           } else {
             // Even if not placeholder, ensure text is black when editing
             textObj.fill = '#000000';
             canvas.renderAll();
           }
         });
        
        textObj.on('editing:exited', () => {
          console.log('🖊️ Callout text editing ended');
          
          // Set flag to prevent immediate new text box creation (same as text tool)
          this.justFinishedEditing = true;
          
          if (this.editingTimeout) clearTimeout(this.editingTimeout);
          this.editingTimeout = setTimeout(() => {
            this.justFinishedEditing = false;
            console.log('🔓 Callout text editing cooldown ended - new text boxes allowed');
          }, 300);
          
          // Only restore placeholder if completely empty
          if (textObj.text.trim() === '') {
            textObj.text = 'Type text here';
            textObj.fill = '#999999';
            textObj.fontWeight = 'normal';
            textObj.data.isPlaceholder = true;
            canvas.renderAll();
          } else {
            // Ensure text remains visible after editing
            textObj.fill = '#000000';
            canvas.renderAll();
          }
        });
        
                 // Add double-click handler for easier text editing (same as text tool)
         textObj.on('mousedblclick', () => {
           console.log('🖊️ Callout text double-clicked, entering edit mode');
           
           // Bring the text to the front when editing starts
           canvas.bringToFront(textObj);
           
           textObj.enterEditing();
           if (textObj.data?.isPlaceholder) {
             textObj.selectAll();
             textObj.removeChars(0, textObj.text.length);
             textObj.fill = '#000000';
             textObj.data.isPlaceholder = false;
           } else {
             // Ensure text is black even if not placeholder
             textObj.fill = '#000000';
           }
           canvas.renderAll();
         });
       
       // Create a group containing ONLY the text box and text (not the arrow)
       const calloutGroup = new (fabric as any).Group([textBox, textObj], {
         selectable: true,
         evented: true,
         hasControls: true,
         hasBorders: true,
         lockScalingX: false,
         lockScalingY: false,
         lockRotation: false,
         moveCursor: 'grab',
         hoverCursor: 'grab',
         subTargetCheck: true,
         data: {
           isAnnotation: true,
           type: 'callout-group',
           id: Date.now().toString()
         }
       });
       
               // Add event handlers to update arrow when text box group is moved
        calloutGroup.on('moving', (e: any) => {
          this.updateCalloutArrow(finalArrow, arrowhead1, arrowhead2, calloutGroup, toolProperties);
          // Force re-render to clear any artifacts
          canvas.renderAll();
        });
        
        calloutGroup.on('modified', (e: any) => {
          this.updateCalloutArrow(finalArrow, arrowhead1, arrowhead2, calloutGroup, toolProperties);
          // Force re-render to clear any artifacts
          canvas.renderAll();
        });
       
               // Add all elements to canvas separately
        // Add arrow and arrowheads first (behind)
        canvas.add(finalArrow);
        canvas.add(arrowhead1);
        canvas.add(arrowhead2);
        
        // Add text box group last (in front)
        canvas.add(calloutGroup);
       
       this.canvas.setActiveObject(calloutGroup);
       canvas.renderAll();
      
      // Reset drawing state
      this.startX = 0;
      this.startY = 0;
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

       private updateCalloutArrow(arrow: any, arrowhead1: any, arrowhead2: any, calloutGroup: any, toolProperties: ToolProperties) {
    // Get the stored arrow origin from the arrow's data
    const arrowOriginX = arrow.data.arrowOriginX;
    const arrowOriginY = arrow.data.arrowOriginY;
    
    // Get the text box's current position from the group
    const textBox = calloutGroup.getObjects().find((obj: any) => obj.data?.type === 'callout-box');
    
    if (!textBox) return;
    
    // Get the group's absolute center position on the canvas
    const groupCenter = calloutGroup.getCenterPoint();
    const textBoxCenterX = groupCenter.x;
    const textBoxCenterY = groupCenter.y;
    
    // Update the arrow to point from the fixed origin to the center of the text box
    arrow.set({
      x1: arrowOriginX,
      y1: arrowOriginY,
      x2: textBoxCenterX,
      y2: textBoxCenterY
    });
    
    // Update arrowheads if they exist
    if (arrowhead1 && arrowhead2) {
      // Recalculate arrowhead positions at the START point, pointing towards the center
      const newArrowhead1 = this.createCalloutArrowhead(arrowOriginX, arrowOriginY, textBoxCenterX, textBoxCenterY, toolProperties, 1);
      const newArrowhead2 = this.createCalloutArrowhead(arrowOriginX, arrowOriginY, textBoxCenterX, textBoxCenterY, toolProperties, 2);
      
      arrowhead1.set({
        x1: newArrowhead1.x1,
        y1: newArrowhead1.y1,
        x2: newArrowhead1.x2,
        y2: newArrowhead1.y2
      });
      
      arrowhead2.set({
        x1: newArrowhead2.x1,
        y1: newArrowhead2.y1,
        x2: newArrowhead2.x2,
        y2: newArrowhead2.y2
      });
    }
    
    // Re-render the canvas to show the updated arrow and arrowheads
    if (this.canvas) {
      this.canvas.renderAll();
    }
  }

  private findClosestPointOnRectangle(px: number, py: number, left: number, top: number, right: number, bottom: number) {
    // Find the closest point on the rectangle EDGE to the point (px, py)
    // First, find the closest point on the rectangle bounds
    const closestX = Math.max(left, Math.min(right, px));
    const closestY = Math.max(top, Math.min(bottom, py));
    
    // Now determine which edge is closest and snap to that edge
    const distToLeft = Math.abs(px - left);
    const distToRight = Math.abs(px - right);
    const distToTop = Math.abs(py - top);
    const distToBottom = Math.abs(py - bottom);
    
    // Find the minimum distance to any edge
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    
    let finalX = closestX;
    let finalY = closestY;
    
    // Snap to the closest edge
    if (minDist === distToLeft) {
      finalX = left;
    } else if (minDist === distToRight) {
      finalX = right;
    } else if (minDist === distToTop) {
      finalY = top;
    } else if (minDist === distToBottom) {
      finalY = bottom;
    }
    
    return { x: finalX, y: finalY };
  }

  private extractCloudProperties(cloudObj: any): ToolProperties {
     // Extract the current properties from a cloud object
     const properties: ToolProperties = {
       color: this.toolProperties.color,
       strokeWidth: this.toolProperties.strokeWidth,
       opacity: this.toolProperties.opacity,
       fontSize: this.toolProperties.fontSize,
       fontWeight: this.toolProperties.fontWeight,
       scallopSize: this.toolProperties.scallopSize,
       cloudLineThickness: this.toolProperties.cloudLineThickness
     };

     // For individual clouds
     if (cloudObj.data?.type === 'cloud') {
       properties.color = cloudObj.stroke || properties.color;
       properties.strokeWidth = cloudObj.strokeWidth || properties.strokeWidth;
       properties.opacity = cloudObj.opacity || properties.opacity;
       
       // Extract cloud-specific properties from data
       if (cloudObj.data?.scallopSize !== undefined) {
         properties.scallopSize = cloudObj.data.scallopSize;
       }
       if (cloudObj.data?.cloudLineThickness !== undefined) {
         properties.cloudLineThickness = cloudObj.data.cloudLineThickness;
       }
     }

     return properties;
   }

  private updateControlPanelWithCloudProperties(cloudObj: any) {
    if (!this.onPropertiesUpdate) return;
    
    const cloudProperties = this.extractCloudProperties(cloudObj);
    console.log('🎛️ Updating control panel with cloud properties:', cloudProperties);
    
    // Update the tool properties with the cloud's properties
    this.toolProperties = { ...this.toolProperties, ...cloudProperties };
    
    // Notify the UI to update the control panel
    this.onPropertiesUpdate(this.toolProperties);
  }
}
