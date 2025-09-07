import { fabric } from 'fabric';

export type ToolType = 'select' | 'freehand' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'stamp' | 'callout' | 'measurement';

export interface ToolProperties {
  color: string;
  textColor?: string;
  borderColor?: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify'; // Text alignment property
  scallopSize?: number; // New property for cloud scallop size
  cloudLineThickness?: number; // New property for cloud line thickness
  // New optional styling controls
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  // Where color should apply for composite annotations like callout
  colorTarget?: 'border' | 'text' | 'both';
  // Text-specific: whether to render a border rectangle similar to callout (without arrow)
  textBorder?: boolean;
  // Text-specific: independent border thickness for text boxes (does not affect callout)
  textBoxLineThickness?: number;
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
  private onPropertiesUpdate?: (properties: ToolProperties) => void;
  private onToolChange?: (tool: ToolType) => void; // Callback to update UI

  constructor(toolProperties: ToolProperties, onPropertiesUpdate?: (properties: ToolProperties) => void, onToolChange?: (tool: ToolType) => void) {
    this.toolProperties = toolProperties;
    this.onPropertiesUpdate = onPropertiesUpdate;
    this.onToolChange = onToolChange;
  }

  setCanvas(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  setActiveTool(tool: ToolType) {
    console.log('🛠️ Tool Manager: Switching to tool:', tool);
    this.activeTool = tool;
    this.updateCanvasMode();
    
    // Notify the UI about the tool change
    if (this.onToolChange) {
      console.log('🛠️ Notifying UI of tool change:', tool);
      console.log('🛠️ onToolChange callback exists:', !!this.onToolChange);
      this.onToolChange(tool);
      console.log('🛠️ onToolChange callback called');
    } else {
      console.log('❌ No onToolChange callback available');
    }
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
      
      // Map object type to controlling tool
      const typeToTool: Record<string, ToolType> = {
        'text': 'text',
        'text-border': 'text',
        'rectangle': 'rectangle',
        'circle': 'circle',
        'arrow-group': 'arrow',
        'arrow': 'arrow',
        'cloud': 'cloud',
        'callout-group': 'callout'
      };
      const controllingTool = typeToTool[activeObject.data?.type || ''] as ToolType | undefined;

      // If current active tool doesn't match the object's controlling tool, skip applying updates
      // Special-case: when the inner textbox of a callout is selected, allow callout updates
      const isCalloutInnerText = (activeObject.data?.type === 'text') && ((activeObject as any).group?.data?.type === 'callout-group');
      if (controllingTool && this.activeTool !== controllingTool && !isCalloutInnerText) {
        console.log('⏭️ Skipping updates: active tool', this.activeTool, 'does not control', activeObject.data?.type);
        return;
      }
      
             if ((activeObject.data?.type === 'cloud') && !activeObject.data?.isPreview) {
         // For cloud shapes, update properties
         console.log('☁️ Updating selected cloud shape (including all properties)');
         this.updateCloudShape(activeObject);
       } else if ((activeObject.data?.type === 'text' || activeObject.data?.type === 'text-border') && ((activeObject as any).group?.data?.type !== 'callout-group')) {
        // Support both: when the active object is the text (inside group) or the group itself
        const groupRef: any = (activeObject as any).type === 'group' ? (activeObject as any) : (activeObject as any).group;
        const textRef: any = (activeObject as any).type === 'group'
          ? (activeObject as any).getObjects().find((o: any) => o.type === 'textbox' || o.type === 'i-text')
          : (activeObject as any);
        const rectRef: any = groupRef ? groupRef.getObjects().find((o: any) => o.type === 'rect') : null;

        // Update text styling
        if (textRef) {
          const currentFill = textRef.fill;
          const isPlaceholder = textRef.data?.isPlaceholder;
          let newFill = currentFill;
          if (!isPlaceholder && (currentFill === '#999999' || currentFill === 'rgba(153, 153, 153, 1)')) {
            newFill = '#000000';
          } else if (isPlaceholder) {
            newFill = '#999999';
          }
          const chosenTextColor = (this.toolProperties.color || newFill);
          textRef.set({
            // Always use single color for text
            fill: chosenTextColor,
            fontSize: this.toolProperties.fontSize || 12,
            fontWeight: this.toolProperties.fontWeight || 300,
            fontStyle: this.toolProperties.fontStyle || 'normal',
            underline: !!this.toolProperties.underline,
            opacity: this.toolProperties.opacity,
            textAlign: this.toolProperties.textAlign || 'left',
            stroke: '',
            strokeWidth: 0
          });
        }

        // Update border rect strictly based on toggle; keep visible when ON regardless of color target
        if (groupRef && rectRef && textRef) {
          const showBorder = !!this.toolProperties.textBorder;
          const thickness = this.toolProperties.textBoxLineThickness ?? 1;
          const padding = 8;
          // Resize rect to wrap text box with padding
          const desiredWidth = Math.max((textRef.width || 0) + padding * 2, 40);
          const desiredHeight = Math.max((textRef.height || 0) + padding * 2, 24);

          const strokeCandidate = (this.toolProperties.color || rectRef.stroke || '#000000');
          const strokeForOn = strokeCandidate;

          rectRef.set({
            width: desiredWidth,
            height: desiredHeight,
            stroke: showBorder ? strokeForOn : (rectRef.stroke || strokeCandidate),
            strokeWidth: showBorder ? thickness : 0
          });

          if (typeof groupRef.addWithUpdate === 'function') groupRef.addWithUpdate();
          groupRef.dirty = true;
        }

        if (this.canvas) {
          this.canvas.renderAll();
        }
      } else if (activeObject.data?.type === 'callout-group' || (activeObject.data?.type === 'text' && (activeObject as any).group?.data?.type === 'callout-group')) {
        // For callout groups, update the text object inside
        console.log('💬 Updating selected callout group');
        // Support both selecting the group or the inner textbox while editing
        const calloutGroup: any = activeObject.data?.type === 'callout-group' ? activeObject : (activeObject as any).group;
        const textObj = calloutGroup.getObjects().find((obj: any) => obj.data?.type === 'text');
        const textBox = calloutGroup.getObjects().find((obj: any) => obj.data?.type === 'callout-box');
        if (textObj) {
          const currentFill = textObj.fill || '#000000';
          const isPlaceholder = textObj.data?.isPlaceholder || textObj.text === 'Type text here';
          
          // Initialize newFill with current color
          let newFill = currentFill;
          
          // Apply updates based on colorTarget: default to border for callouts
          const applyToText = this.toolProperties.colorTarget === 'text' || this.toolProperties.colorTarget === 'both';
          const applyToBorder = this.toolProperties.colorTarget !== 'text'; // 'border' or 'both'

          // Update text styling - apply same logic as text box tool
          // Use the existing variables from above, but update the logic to match text box behavior
          if (this.toolProperties.color && !isPlaceholder) {
            newFill = this.toolProperties.color;
          } else if (isPlaceholder) {
            newFill = '#999999';
          }
          
          // Update text ONLY if text-related properties actually changed
          const shouldUpdateText = (
            (this.toolProperties.fontSize ?? 12) !== (textObj.fontSize ?? 12) ||
            (this.toolProperties.fontWeight ?? 300) !== (textObj.fontWeight ?? 300) ||
            (this.toolProperties.fontStyle ?? 'normal') !== (textObj.fontStyle ?? 'normal') ||
            (this.toolProperties.textAlign ?? 'left') !== (textObj.textAlign ?? 'left') ||
            (this.toolProperties.underline ? 1 : 0) !== (textObj.underline ? 1 : 0) ||
            this.toolProperties.colorTarget === 'text'
          );

          if (shouldUpdateText) {
            // Ensure thickness never affects text
            textObj.set({
              fill: newFill,
              fontSize: this.toolProperties.fontSize || 12,
              fontWeight: this.toolProperties.fontWeight || 300,
              fontStyle: this.toolProperties.fontStyle || 'normal',
              underline: !!this.toolProperties.underline,
              textAlign: this.toolProperties.textAlign || 'left',
              opacity: 1.0,
              stroke: '',
              strokeWidth: 0
            });
            textObj.set({ stroke: '', strokeWidth: 0 });
          }

          if (textBox) {
            // Always apply stroke width to border (do not affect text)
            textBox.set({ strokeWidth: this.toolProperties.strokeWidth });
            // Apply border color only if color target includes border
            if (applyToBorder) {
              textBox.set({
                stroke: this.toolProperties.color,
                opacity: this.toolProperties.opacity
              });
            }

            // If user is editing the inner text, hard-guard text from thickness side-effects
            try {
              if ((textObj as any).isEditing) {
                textObj.set({ stroke: '', strokeWidth: 0, opacity: 1.0 });
              }
            } catch {}

            // Also update linked arrow(s)
            try {
              const groupId = calloutGroup.data?.id;
              if (groupId && this.canvas) {
                const all = this.canvas.getObjects();
                const linkedArrow = all.find((o: any) => o.data?.type === 'callout-arrow' && o.data?.calloutGroupId === groupId);
                const linkedHeads = all.filter((o: any) => o.data?.type === 'arrowhead' && o.data?.calloutGroupId === groupId);
                if (linkedArrow) {
                  linkedArrow.set({
                    strokeWidth: this.toolProperties.strokeWidth,
                    opacity: this.toolProperties.opacity,
                    ...(applyToBorder ? { stroke: this.toolProperties.color } : {})
                  });
                }
                if (linkedHeads && linkedHeads.length) {
                  linkedHeads.forEach((h: any) => h.set({
                    strokeWidth: this.toolProperties.strokeWidth,
                    opacity: this.toolProperties.opacity,
                    ...(applyToBorder ? { stroke: this.toolProperties.color } : {})
                  }));
                }
              }
            } catch {}
          }

          // Recompute text dimensions and resize the callout box to contain it
          try {
            // force dimension recompute on the textbox
            textObj._forceClearCache && textObj._forceClearCache();
            textObj.initDimensions && textObj.initDimensions();
            if (textBox) {
              this.resizeCalloutByTextboxHeight(textBox, textObj, 8);
            }
          } catch {}
        }
             } else if (activeObject.data?.type === 'arrow-group') {
        // For arrow groups, update the line and arrowheads
        console.log('➡️ Updating arrow group properties');
        this.updateArrowShape(activeObject);
      } else if (activeObject.data?.type !== 'cloud') {
         // For other shapes (rectangles, circles), just update stroke properties
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
         if (index !== -1 && this.canvas) {
           this.canvas.remove(cloudObj);
           this.canvas.insertAt(newCloud, index, false);
           this.canvas.setActiveObject(newCloud);
           console.log('☁️ Cloud regenerated with new scallop size');
         }
       } else {
         // Just update the properties directly (for color/opacity changes)
         cloudObj.set({
           stroke: this.toolProperties.color,
           strokeWidth: this.toolProperties.cloudLineThickness || this.toolProperties.strokeWidth,
           opacity: this.toolProperties.opacity,
           fill: 'transparent' // Ensure fill stays transparent
         });
         
         // Update the stored data properties
         cloudObj.data.scallopSize = this.toolProperties.scallopSize;
         cloudObj.data.cloudLineThickness = this.toolProperties.cloudLineThickness;
         
         // Re-select the cloud to maintain selection
         if (this.canvas) {
           this.canvas.setActiveObject(cloudObj);
         }
         console.log('☁️ Cloud properties updated directly');
       }
       
       // Force a render to ensure changes are visible
       this.canvas.renderAll();
     } catch (error) {
       console.error('☁️ Error updating cloud shape:', error);
     }
   }

  private updateArrowShape(arrowGroup: any) {
    try {
      console.log('➡️ Updating arrow group properties');
      
      // Get the line and arrowhead objects from the group
      const line = arrowGroup.getObjects().find((obj: any) => obj.type === 'line');
      const arrowhead1 = arrowGroup.getObjects().find((obj: any) => obj.type === 'line' && obj.data?.type === 'arrowhead' && obj.data?.arrowheadNumber === 1);
      const arrowhead2 = arrowGroup.getObjects().find((obj: any) => obj.type === 'line' && obj.data?.type === 'arrowhead' && obj.data?.arrowheadNumber === 2);
      
      if (line) {
        // Update the main line
        line.set({
          stroke: this.toolProperties.color,
          strokeWidth: this.toolProperties.strokeWidth,
          opacity: this.toolProperties.opacity
        });
      }
      
      if (arrowhead1) {
        // Update the first arrowhead
        arrowhead1.set({
          stroke: this.toolProperties.color,
          strokeWidth: this.toolProperties.strokeWidth,
          opacity: this.toolProperties.opacity
        });
      }
      
      if (arrowhead2) {
        // Update the second arrowhead
        arrowhead2.set({
          stroke: this.toolProperties.color,
          strokeWidth: this.toolProperties.strokeWidth,
          opacity: this.toolProperties.opacity
        });
      }
      
             // Force a render to ensure changes are visible
       if (this.canvas) {
         this.canvas.renderAll();
       }
       console.log('➡️ Arrow group properties updated');
    } catch (error) {
      console.error('➡️ Error updating arrow shape:', error);
    }
  }

  private setupEventListeners() {
    if (!this.canvas) return;

    // Remove any existing listeners
    this.canvas.off('mouse:down');
    this.canvas.off('mouse:move');
    this.canvas.off('mouse:up');
    this.canvas.off('object:modified');
    this.canvas.off('path:created');

    // Set up new listeners
    this.canvas.on('mouse:down', this.handleMouseDown.bind(this));
    this.canvas.on('mouse:move', this.handleMouseMove.bind(this));
    this.canvas.on('mouse:up', this.handleMouseUp.bind(this));
    this.canvas.on('object:modified', this.handleObjectModified.bind(this));
    this.canvas.on('path:created', this.handlePathCreated.bind(this));
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

  private handlePathCreated(e: any) {
    // When a freehand path is created, disable dragging for it
    const path = e.path;
    if (path && path.type === 'path') {
      console.log('🎨 Freehand path created, disabling dragging');
      // Preserve the existing stroke color and other properties
      const existingStroke = path.stroke;
      const existingStrokeWidth = path.strokeWidth;
      const existingOpacity = path.opacity;
      
      path.set({
        moveable: false,
        selectable: false,
        evented: true,
        hasControls: false,
        hasBorders: false,
        // Preserve the drawing properties
        stroke: existingStroke,
        strokeWidth: existingStrokeWidth,
        opacity: existingOpacity,
        data: {
          isAnnotation: true,
          type: 'freehand',
          id: Date.now().toString()
        }
      });
      console.log('🎨 Preserved freehand properties:', { stroke: existingStroke, strokeWidth: existingStrokeWidth, opacity: existingOpacity });
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
      console.log('🔍 FULL TARGET DEBUG:', {
        'target.data.type': target.data?.type,
        'target.type': target.type,
        'target.data': target.data,
        'target.id': target.data?.id
      });
      
      // Switch active tool based on selected object type
      const typeToTool: Record<string, ToolType> = {
        'text': 'text',
        'rectangle': 'rectangle',
        'circle': 'circle',
        'arrow-group': 'arrow',
        'arrow': 'arrow',
        'cloud': 'cloud',
        'callout-group': 'callout'
      };
      
      // Check if it's a freehand drawing (Fabric.js Path object)
      let controllingTool = typeToTool[target.data?.type || ''];
      if (!controllingTool && target.type === 'path') {
        controllingTool = 'freehand';
        console.log('🎨 Detected freehand drawing (Path object)');
      }

      if (controllingTool && this.activeTool !== controllingTool) {
        console.log('🔄 Switching active tool to match selection:', controllingTool);
        this.setActiveTool(controllingTool);
      }
      
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
      } else if (target.data?.type === 'text' || target.data?.type === 'text-border') {
        // Special handling for text objects
        this.canvas.setActiveObject(target);
        
        // Switch to text tool when clicking on a text object
        if (this.activeTool !== 'text') {
          console.log('🔄 Switching to text tool for text selection');
          this.setActiveTool('text');
        }
        
        // Update control panel with the text's properties
        this.updateControlPanelWithTextProperties(target);
      } else if (target.data?.type === 'rectangle') {
        // Special handling for rectangle objects
        console.log('🔍 DEBUG: Handling rectangle click - target type:', target.data?.type);
        this.canvas.setActiveObject(target);
        
        // Switch to rectangle tool when clicking on a rectangle
        if (this.activeTool !== 'rectangle') {
          console.log('🔄 Switching to rectangle tool for rectangle selection');
          this.setActiveTool('rectangle');
        }
        
        // Update control panel with the rectangle's properties
        this.updateControlPanelWithRectangleProperties(target);
      } else if (target.data?.type === 'circle') {
        // Special handling for circle objects
        this.canvas.setActiveObject(target);
        
        // Switch to circle tool when clicking on a circle
        if (this.activeTool !== 'circle') {
          console.log('🔄 Switching to circle tool for circle selection');
          this.setActiveTool('circle');
        }
        
        // Update control panel with the circle's properties
        this.updateControlPanelWithCircleProperties(target);
      } else if (target.data?.type === 'arrow' || target.data?.type === 'arrow-group') {
        // Special handling for arrow objects
        console.log('🔍 DEBUG: Handling arrow click - target type:', target.data?.type);
        this.canvas.setActiveObject(target);
        
        // Switch to arrow tool when clicking on an arrow
        if (this.activeTool !== 'arrow') {
          console.log('🔄 Switching to arrow tool for arrow selection');
          this.setActiveTool('arrow');
        }
        
        // Update control panel with the arrow's properties
        this.updateControlPanelWithArrowProperties(target);
      } else if (target.data?.type === 'callout-group') {
        // Special handling for callout objects
        this.canvas.setActiveObject(target);
        
        // Switch to callout tool when clicking on a callout
        if (this.activeTool !== 'callout') {
          console.log('🔄 Switching to callout tool for callout selection');
          this.setActiveTool('callout');
        }
        
        // Update control panel with the callout's properties
        this.updateControlPanelWithCalloutProperties(target);
      } else if (target.type === 'path') {
        // Special handling for freehand drawings (Path objects)
        this.canvas.setActiveObject(target);
        
        // Switch to freehand tool when clicking on a freehand drawing
        if (this.activeTool !== 'freehand') {
          console.log('🔄 Switching to freehand tool for freehand selection');
          this.setActiveTool('freehand');
        }
        
        // Update control panel with the freehand's properties
        this.updateControlPanelWithFreehandProperties(target);
      } else {
        this.canvas.setActiveObject(target);
      }
      
      this.canvas.renderAll();
      return;
    }

    // Only start drawing if we're in a drawing tool and clicked on empty space
    if (this.activeTool === 'select') {
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
        onMouseMove: this.handleTextMouseMove.bind(this),
        onMouseUp: this.handleTextMouseUp.bind(this),
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

    // Enable drawing mode for freehand tool, but override cursor behavior
    if (this.activeTool === 'freehand') {
      this.canvas.isDrawingMode = true;
      this.updateBrushProperties();
      // Override the cursor to show hand cursor when hovering over objects
      this.canvas.defaultCursor = 'default';
      this.canvas.hoverCursor = 'move';
    } else {
      this.canvas.isDrawingMode = false;
      this.canvas.defaultCursor = 'default';
      this.canvas.hoverCursor = 'move';
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
    // Drawing mode is already enabled in updateCanvasMode()
    // Just ensure brush exists and properties are set
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
    // Drawing mode stays enabled for continuous drawing
    // Cursor behavior is managed in updateCanvasMode()
  }

  // Text Tool Handlers
  private handleTextMouseDown(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    console.log('📝 Text mouse down');
    
    // Check if we clicked on an existing text object
    const target = canvas.findTarget(e.e, false);
    if (target && target.data?.isAnnotation) {
      if (target.data?.type === 'text' || target.data?.type === 'text-border') {
        // Text object selection is now handled by the general handleMouseDown method
        // This method is only called when creating new text objects
        canvas.setActiveObject(target);
        canvas.renderAll();
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
    // Start a drag to define the text area; actual creation happens on mouseup
    this.isDrawing = true;
    this.startX = pointer.x;
    this.startY = pointer.y;
  }

  private handleTextMouseMove(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    if (!this.isDrawing) return;
    if (this.activeTool !== 'text') return;
    const pointer = canvas.getPointer(e.e);
    const left = Math.min(this.startX, pointer.x);
    const top = Math.min(this.startY, pointer.y);
    const width = Math.max(Math.abs(pointer.x - this.startX), 1);
    const height = Math.max(Math.abs(pointer.y - this.startY), 1);

    // Find existing preview rect
    const preview = canvas.getObjects().find((obj: any) => obj.data?.isPreview && obj.data?.type === 'text-preview');
    if (!preview) {
      const previewRect = new (fabric as any).Rect({
        left,
        top,
        width,
        height,
        fill: 'rgba(59,130,246,0.05)', // light blue tint
        stroke: '#3B82F6',
        strokeWidth: 1,
        strokeDashArray: [4, 2],
        selectable: true,
        evented: true,
        data: { isPreview: true, type: 'text-preview' }
      });
      canvas.add(previewRect);
    } else {
      preview.set({ left, top, width, height });
    }
    canvas.renderAll();
  }

  private handleTextMouseUp(e: any, canvas: fabric.Canvas, toolProperties: ToolProperties) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const end = canvas.getPointer(e.e);
    const dx = Math.abs(end.x - this.startX);
    const dy = Math.abs(end.y - this.startY);
    const threshold = 5;
    if (Math.max(dx, dy) < threshold) {
      console.log('📝 Text drag too small; not creating');
      // Remove preview if it exists
      const prev = canvas.getObjects().find((obj: any) => obj.data?.isPreview && obj.data?.type === 'text-preview');
      if (prev) canvas.remove(prev as any);
      canvas.renderAll();
      return;
    }
    const left = Math.min(this.startX, end.x);
    const top = Math.min(this.startY, end.y);
    const width = Math.max(dx, 120);
    const height = Math.max(dy, 40);

    // Remove preview if it exists
    const preview = canvas.getObjects().find((obj: any) => obj.data?.isPreview && obj.data?.type === 'text-preview');
    if (preview) canvas.remove(preview as any);

    const padding = 8;
    // Use last-used (panel) settings for new text box; simplifies isolation between boxes
    const applyBorder = this.toolProperties.textBorder ?? true;
    const rect = new (fabric as any).Rect({
      left,
      top,
      width,
      height,
      fill: 'transparent',
      stroke: this.toolProperties.color || '#000000',
      // default or last-used border thickness
      strokeWidth: applyBorder ? (this.toolProperties.textBoxLineThickness || 1.5) : 0.1,
      rx: 4,
      ry: 4,
      selectable: true,
      evented: true,
      objectCaching: false
    });

    const textObj = new (fabric as any).Textbox('Type text here', {
      left: left + padding,
      top: top + padding,
      // last-used or defaults
      fontSize: this.toolProperties.fontSize || 14,
      fill: this.toolProperties.color || '#000000',
      fontWeight: this.toolProperties.fontWeight || 300,
      opacity: toolProperties.opacity || 1.0,
      fontFamily: 'Arial, sans-serif',
      fontStyle: this.toolProperties.fontStyle || 'normal',
      // do not carry underline: always off by default
      underline: false,
      textAlign: (this.toolProperties.textAlign as any) || 'left',
      selectable: true,
      editable: true,
      evented: true,
      moveable: true,
      hasControls: true,
      hasBorders: true,
      borderColor: '#3B82F6',
      lockScalingX: true,
      lockScalingY: true,
      width: Math.max(width - padding * 2, 40),
      lineHeight: 1.2,
      splitByGrapheme: false,
      breakWords: true,
      objectCaching: false,
      data: {
        isAnnotation: true,
        type: 'text',
        id: Date.now().toString(),
        isPlaceholder: true
      }
    });

    // Do not clip the text; rely on width wrapping so placeholder is fully visible

    // Editing handlers (placeholder management)
    textObj.on('editing:entered', () => {
      // Only change color when clearing a placeholder; otherwise keep the user's chosen color
      if (textObj.data?.isPlaceholder || textObj.text === 'Type text here') {
        textObj.text = '';
        textObj.data.isPlaceholder = false;
        textObj.fill = this.toolProperties.color || textObj.fill || '#000000';
      }
      // Ensure tall box remains tall even when starting to type
      try {
        const grp = (textObj as any).group;
        const rectObj = grp?.getObjects().find((o: any) => o.type === 'rect');
        if (grp && rectObj) {
          textObj.set({ width: Math.max((rectObj.width || 40) - padding * 2, 20) });
          if (typeof grp.addWithUpdate === 'function') grp.addWithUpdate();
          grp.setCoords();
        }
      } catch {}
      try {
        const grp = (textObj as any).group;
        if (grp) {
          grp.objectCaching = false;
          grp.dirty = true;
          if (typeof grp.addWithUpdate === 'function') grp.addWithUpdate();
          if (typeof grp.setCoords === 'function') grp.setCoords();
        }
      } catch {}
      canvas.renderAll();
    });

    // While typing, strip any accidental placeholder fragments
    textObj.on('changed', () => {
      try {
        if (textObj.data && textObj.data.isPlaceholder === false && typeof textObj.text === 'string' && textObj.text.includes('Type text here')) {
          textObj.text = textObj.text.replace(/Type text here/g, '');
        }
        // Auto-grow the text box height to fit text
        try {
          const grp = (textObj as any).group;
          const rectObj = grp?.getObjects().find((o: any) => o.type === 'rect');
          if (grp && rectObj) {
            // Keep text width bound to rect and expand rect height to fit text
            textObj.set({ width: Math.max((rectObj.width || 40) - padding * 2, 20) });
            this.resizeCalloutByTextboxHeight(rectObj, textObj, padding);
            // Also extend width if a line (or long word) exceeds current width
            try {
              const lines = (textObj as any)._textLines ? (textObj as any)._textLines.length : (((textObj as any).textLines && (textObj as any).textLines.length) || 1);
              let maxLineWidth = 0;
              for (let i = 0; i < lines; i++) {
                const w = (textObj as any).getLineWidth ? (textObj as any).getLineWidth(i) : (textObj.width || 0);
                if (w > maxLineWidth) maxLineWidth = w;
              }
              const innerWidth = Math.max((rectObj.width || 40) - padding * 2, 20);
              if (maxLineWidth > innerWidth) {
                const newRectWidth = Math.max(maxLineWidth + padding * 2, rectObj.width || 0);
                rectObj.set({ width: newRectWidth });
                textObj.set({ width: Math.max(newRectWidth - padding * 2, 20) });
              }
            } catch {}
            if (typeof grp.addWithUpdate === 'function') grp.addWithUpdate();
            grp.setCoords();
          }
        } catch {}
        canvas.requestRenderAll();
      } catch {}
    });
    textObj.on('editing:exited', () => {
      this.justFinishedEditing = true;
      if (this.editingTimeout) clearTimeout(this.editingTimeout);
      this.editingTimeout = setTimeout(() => (this.justFinishedEditing = false), 300);
      if (textObj.text.trim() === '') {
        textObj.text = 'Type text here';
        textObj.fill = '#999999';
        textObj.data.isPlaceholder = true;
      }
      try {
        const grp = (textObj as any).group;
        if (grp) {
          grp.dirty = true;
          if (typeof grp.addWithUpdate === 'function') grp.addWithUpdate();
          if (typeof grp.setCoords === 'function') grp.setCoords();
        }
      } catch {}
      // Ensure final size fits content after editing ends
      try {
        const grp = (textObj as any).group;
        const rectObj = grp?.getObjects().find((o: any) => o.type === 'rect');
        if (grp && rectObj) {
          textObj.set({ width: Math.max((rectObj.width || 40) - padding * 2, 20) });
          this.resizeCalloutByTextboxHeight(rectObj, textObj, padding);
          // Final width extension check (measure natural max width)
          try {
            const prevWidth = textObj.width;
            textObj.set({ width: 10000 });
            textObj._forceClearCache && textObj._forceClearCache();
            textObj.initDimensions && textObj.initDimensions();

            const lines = (textObj as any)._textLines ? (textObj as any)._textLines.length : (((textObj as any).textLines && (textObj as any).textLines.length) || 1);
            let maxNaturalWidth = 0;
            for (let i = 0; i < lines; i++) {
              const w = (textObj as any).getLineWidth ? (textObj as any).getLineWidth(i) : (textObj.width || 0);
              if (w > maxNaturalWidth) maxNaturalWidth = w;
            }

            textObj.set({ width: prevWidth });
            textObj._forceClearCache && textObj._forceClearCache();
            textObj.initDimensions && textObj.initDimensions();

            const innerWidth = Math.max((rectObj.width || 40) - padding * 2, 20);
            if (maxNaturalWidth > innerWidth) {
              const newRectWidth = Math.max(maxNaturalWidth + padding * 2, rectObj.width || 0);
              rectObj.set({ width: newRectWidth });
              textObj.set({ width: Math.max(newRectWidth - padding * 2, 20) });
              this.resizeCalloutByTextboxHeight(rectObj, textObj, padding);
            }
          } catch {}
          if (typeof grp.addWithUpdate === 'function') grp.addWithUpdate();
          grp.setCoords();
        }
      } catch {}
      canvas.renderAll();
    });

    // One-click edit when clicking on the text
    try {
      textObj.on('mousedown', () => {
        try {
          this.canvas?.setActiveObject(textObj);
          this.canvas?.bringToFront(textObj);
          textObj.enterEditing();
          if (textObj.data?.isPlaceholder || textObj.text === 'Type text here') {
            textObj.text = '';
            textObj.fill = '#000000';
            textObj.data.isPlaceholder = false;
          }
          this.canvas?.requestRenderAll();
        } catch {}
      });
    } catch {}

    // Group rect + text so height stays fixed and border can render
    const group = new (fabric as any).Group([rect, textObj], {
      left,
      top,
      selectable: true,
      subTargetCheck: true,
      objectCaching: false,
      data: { isAnnotation: true, type: applyBorder ? 'text-border' : 'text', id: Date.now().toString() }
    });
    // Convert group scaling into rect width/height changes without stretching text
    try {
      const paddingForText = padding;
      group.on('scaling', () => {
        try {
          const rectObj = group.getObjects().find((o: any) => o.type === 'rect');
          const txt = group.getObjects().find((o: any) => o.type === 'textbox' || o.type === 'i-text');
          if (!rectObj || !txt) return;
          const baseW = rectObj.width || 40;
          const baseH = rectObj.height || 24;
          const newW = Math.max(baseW * (group.scaleX || 1), 40);
          const newH = Math.max(baseH * (group.scaleY || 1), 24);
          rectObj.set({ width: newW, height: newH });
          // keep text width within rect, do not scale font
          txt.set({ width: Math.max(newW - paddingForText * 2, 20) });
          // reset scale to avoid visual stretch
          group.set({ scaleX: 1, scaleY: 1 });
          // refresh bounds
          if (typeof group.addWithUpdate === 'function') group.addWithUpdate();
          group.setCoords();
          this.canvas?.requestRenderAll();
        } catch {}
      });
      group.on('modified', () => {
        try {
          const rectObj = group.getObjects().find((o: any) => o.type === 'rect');
          const txt = group.getObjects().find((o: any) => o.type === 'textbox' || o.type === 'i-text');
          if (!rectObj || !txt) return;
          const newW = rectObj.width || 40;
          txt.set({ width: Math.max(newW - paddingForText * 2, 20) });
          if (typeof group.addWithUpdate === 'function') group.addWithUpdate();
          group.setCoords();
          this.canvas?.requestRenderAll();
        } catch {}
      });
    } catch {}
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();

    // Reset underline so it never carries over from a previous box
    try {
      (this.toolProperties as any).underline = false;
    } catch {}

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
      selectable: true,
      evented: true,
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
        moveable: true,
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
        moveable: true,
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
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      moveable: true,
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
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      moveable: true,
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
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      moveable: true,
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
      hasControls: true,
      hasBorders: true,
      moveable: true,
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
      hasControls: true,
      hasBorders: true,
      moveable: true,
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
      selectable: true,
      evented: true,
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
        moveable: true,
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
      left: this.startX, // Will be adjusted in mouse move
      top: this.startY,  // Will be adjusted in mouse move
      radius: 0,
      fill: 'transparent', // No fill - only stroke should be visible
      stroke: toolProperties.color,
      strokeWidth: toolProperties.strokeWidth,
      opacity: toolProperties.opacity,
      selectable: true,
      evented: true,
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
      
      // Calculate the center position to allow drawing in any direction
      const centerX = this.startX;
      const centerY = this.startY;
      
      previewCircle.set({
        left: centerX - radius, // Position circle so it's centered on start point
        top: centerY - radius,  // Position circle so it's centered on start point
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
        moveable: true,
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
        selectable: true,
        evented: true,
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
        selectable: true,
        evented: true,
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
      moveable: true,
      moveCursor: 'grab',
      hoverCursor: 'grab',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      stroke: '',
      strokeWidth: 0,
      padding: 4,
      hasControls: true,
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
      selectable: true,
      evented: true,
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
           selectable: true,
           evented: true,
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
         selectable: true,
         evented: true,
         hasControls: true,
         hasBorders: true,
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
       
                                               // Create text box at the end of the arrow - make it much larger initially
         const textBox = new (fabric as any).Rect({
           left: pointer.x - 100, // Much larger initial size
           top: pointer.y - 35,
           width: 140,
           height: 70,
           fill: 'rgba(255, 255, 255, 1.0)', // 100% opaque white to hide the arrow behind
           stroke: toolProperties.color,
           strokeWidth: toolProperties.strokeWidth,
           strokeUniform: true,
           opacity: toolProperties.opacity,
           rx: 4,
           ry: 4,
           selectable: true,
           evented: true,
           objectCaching: false,
           data: {
             isAnnotation: true,
             type: 'callout-box'
           }
         });
      
                                                             // Create text object for the callout - positioned to fit inside the box
                   const textObj = new (fabric as any).Textbox('Type text here', {
            left: pointer.x - 100 + 8, // Position text inside the box: textBox.left + padding
            top: pointer.y - 35 + 8, // Position text inside the box: textBox.top + padding
            fontSize: toolProperties.fontSize || 14,
            fill: '#999999', // Start with grey placeholder
            fontWeight: toolProperties.fontWeight || 300,
            opacity: 1.0, // Always use full opacity for text, never use border opacity
            fontFamily: 'Arial, sans-serif',
            fontStyle: toolProperties.fontStyle || 'normal',
            textAlign: toolProperties.textAlign || 'left',
            selectable: true,
            editable: true,
            evented: true,
            moveCursor: 'text',
            hoverCursor: 'text',
            backgroundColor: 'transparent',
            stroke: '',
            strokeWidth: 0,
            padding: 2, // Reduced padding for closer text to edge
            hasControls: true,
            hasBorders: true,
            lockScalingX: true, // Prevent manual scaling
            lockScalingY: true, // Prevent manual scaling
            // Set a reasonable width constraint for the larger box
            width: 124, // 140px box - 16px padding (8px on each side)
            lineHeight: 1.2,
            // Enable robust wrapping so very long words do not overflow
            splitByGrapheme: true,
            originX: 'left',
            originY: 'top',
            // Force text to wrap at word boundaries
            breakWords: true,
            data: {
              isAnnotation: true,
              type: 'text',
              id: (Date.now() + 1).toString(),
              isPlaceholder: true
            }
          });
        
        // Set initial placeholder color only if still a placeholder
        setTimeout(() => {
          if (textObj.data?.isPlaceholder) {
            textObj.fill = '#999999';
            canvas.renderAll();
          }
        }, 100);
        
                 // Handle text editing for the callout text
        textObj.on('editing:entered', () => {
          console.log('🖊️ Callout text editing started');
          console.log('🖊️ Current text properties before update:', {
            fontSize: textObj.fontSize,
            fontWeight: textObj.fontWeight,
            fontStyle: textObj.fontStyle,
            opacity: textObj.opacity,
            fill: textObj.fill
          });
          
          // Bring the text to the front when editing starts
          canvas.bringToFront(textObj);
          
          if (textObj.data?.isPlaceholder || textObj.text === 'Type text here') {
            textObj.text = '';
            textObj.data.isPlaceholder = false;
          }
          
          // Apply proper styling when editing starts - use same logic as text box tool
          const currentFill = textObj.fill || '#000000';
          const isPlaceholder = textObj.data?.isPlaceholder || textObj.text === 'Type text here';
          let newFill = currentFill;
          
          if (this.toolProperties.color && !isPlaceholder) {
            newFill = this.toolProperties.color;
          } else if (isPlaceholder) {
            newFill = '#999999';
          }
          
          console.log('🖊️ Applying properties:', {
            fontSize: this.toolProperties.fontSize || 14,
            fontWeight: this.toolProperties.fontWeight || 300,
            fontStyle: this.toolProperties.fontStyle || 'normal',
            textAlign: this.toolProperties.textAlign || 'left',
            opacity: this.toolProperties.opacity || 1.0,
            fill: newFill
          });
          console.log('🖊️ toolProperties.opacity value:', this.toolProperties.opacity);
          console.log('🖊️ toolProperties.strokeWidth value:', this.toolProperties.strokeWidth);
          
          textObj.set({
            fill: newFill,
            fontSize: this.toolProperties.fontSize || 14,
            fontWeight: this.toolProperties.fontWeight || 300,
            fontStyle: this.toolProperties.fontStyle || 'normal',
            underline: !!this.toolProperties.underline,
            textAlign: this.toolProperties.textAlign || 'left',
            opacity: 1.0 // Always use full opacity for text, never use border opacity
          });
          
          console.log('🖊️ Text properties after update:', {
            fontSize: textObj.fontSize,
            fontWeight: textObj.fontWeight,
            fontStyle: textObj.fontStyle,
            opacity: textObj.opacity,
            fill: textObj.fill
          });
          
          canvas.renderAll();
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
          
          // Never restore placeholder - once cleared, it stays cleared
          // Ensure text remains visible after editing and mark as not placeholder
          // Apply proper styling when editing ends - use same logic as text box tool
          const currentFill = textObj.fill || '#000000';
          const isPlaceholder = textObj.data?.isPlaceholder || textObj.text === 'Type text here';
          let newFill = currentFill;
          
          if (this.toolProperties.color && !isPlaceholder) {
            newFill = this.toolProperties.color;
          } else if (isPlaceholder) {
            newFill = '#999999';
          }
          
          textObj.set({
            fill: newFill,
            fontSize: this.toolProperties.fontSize || 14,
            fontWeight: this.toolProperties.fontWeight || 300,
            fontStyle: this.toolProperties.fontStyle || 'normal',
            underline: !!this.toolProperties.underline,
            textAlign: this.toolProperties.textAlign || 'left',
            opacity: 1.0 // Always use full opacity for text, never use border opacity
          });
          textObj.data.isPlaceholder = false;
          canvas.renderAll();
          
          // Resize the text box to fit the text content
          this.resizeCalloutByTextboxHeight(textBox, textObj, 8);
        });
        
                 // Add text change handler to resize box as user types
         textObj.on('changed', () => {
           if (textObj.data && textObj.data.isPlaceholder === false && typeof textObj.text === 'string' && textObj.text.includes('Type text here')) {
             textObj.text = textObj.text.replace(/Type text here/g, '');
           }
           // First, auto-grow height to fit current width
           this.resizeCalloutByTextboxHeight(textBox, textObj, 8);

           // Then, ensure long words extend the box to the right
           try {
             const padding = 8;
             const prevWidth = textObj.width;
             // Measure natural line widths with very large width
             textObj.set({ width: 10000 });
             textObj._forceClearCache && textObj._forceClearCache();
             textObj.initDimensions && textObj.initDimensions();

             const lines = (textObj as any)._textLines ? (textObj as any)._textLines.length : (((textObj as any).textLines && (textObj as any).textLines.length) || 1);
             let maxNaturalWidth = 0;
             for (let i = 0; i < lines; i++) {
               const w = (textObj as any).getLineWidth ? (textObj as any).getLineWidth(i) : (textObj.width || 0);
               if (w > maxNaturalWidth) maxNaturalWidth = w;
             }

             // Restore previous width and re-evaluate
             textObj.set({ width: prevWidth });
             textObj._forceClearCache && textObj._forceClearCache();
             textObj.initDimensions && textObj.initDimensions();

             const innerWidth = Math.max((textBox.width || 40) - padding * 2, 20);
             if (maxNaturalWidth > innerWidth) {
               const newRectWidth = Math.max(maxNaturalWidth + padding * 2, textBox.width || 0);
               textBox.set({ width: newRectWidth });
               textObj.set({ width: Math.max(newRectWidth - padding * 2, 20) });
               this.resizeCalloutByTextboxHeight(textBox, textObj, padding);
             }
           } catch {}

           canvas.requestRenderAll();
         });
        
                 // Add double-click handler for easier text editing (same as text tool)
         textObj.on('mousedblclick', () => {
           console.log('🖊️ Callout text double-clicked, entering edit mode');
           
           // Bring the text to the front when editing starts
           canvas.bringToFront(textObj);
           
           textObj.enterEditing();
           if (textObj.data?.isPlaceholder || textObj.text === 'Type text here') {
             textObj.text = '';
             textObj.fill = '#000000';
             textObj.data.isPlaceholder = false;
           } else {
             // Ensure text is black even if not placeholder
             textObj.fill = '#000000';
           }
           canvas.renderAll();
         });

                 // Single click to edit the callout text
         textObj.on('mousedown', () => {
           try {
             // Route color changes to text when text is clicked
             this.toolProperties.colorTarget = 'text';
             if (this.onPropertiesUpdate) this.onPropertiesUpdate(this.toolProperties);
             canvas.setActiveObject(textObj);
             canvas.bringToFront(textObj);
             textObj.enterEditing();
             if (textObj.data?.isPlaceholder || textObj.text === 'Type text here') {
               textObj.text = '';
               textObj.fill = '#000000';
               textObj.data.isPlaceholder = false;
             } else {
               const len = (textObj.text || '').length;
               if (typeof textObj.setSelectionStart === 'function') {
                 textObj.setSelectionStart(len);
                 textObj.setSelectionEnd(len);
               }
             }
             textObj.fill = '#000000';
             canvas.requestRenderAll();
           } catch {}
         });
       
       // Create a group containing ONLY the text box and text (not the arrow)
       const calloutGroup = new (fabric as any).Group([textBox, textObj], {
         selectable: true,
         evented: true,
         hasControls: true,
         hasBorders: true,
         lockScalingX: false,
         lockScalingY: true,
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
       
       // Link arrow and arrowheads to this callout group so border changes can recolor them
       try {
         finalArrow.set({
           data: {
             ...finalArrow.data,
             calloutGroupId: calloutGroup.data.id
           }
         });
         arrowhead1.set({
           data: {
             ...arrowhead1.data,
             calloutGroupId: calloutGroup.data.id
           }
         });
         arrowhead2.set({
           data: {
             ...arrowhead2.data,
             calloutGroupId: calloutGroup.data.id
           }
         });
       } catch {}
       
       // Clicking the group's border should route color changes to the border
       calloutGroup.on('mousedown', (evt: any) => {
         try {
           this.toolProperties.colorTarget = 'border';
           if (this.onPropertiesUpdate) this.onPropertiesUpdate(this.toolProperties);
         } catch {}
       });
       
       // Add event handlers to update arrow when text box group is moved
       calloutGroup.on('moving', (e: any) => {
         this.updateCalloutArrow(finalArrow, arrowhead1, arrowhead2, calloutGroup, toolProperties);
         // Force re-render to clear any artifacts
         canvas.renderAll();
       });
 
        // Intercept group scaling: convert to rect width/height change (no text stretch)
        calloutGroup.on('scaling', (e: any) => {
          try {
            if (!e || !calloutGroup) return;
            const scaleX = calloutGroup.scaleX || 1;
            const scaleY = calloutGroup.scaleY || 1;
            let updated = false;
            if (scaleX !== 1) {
              const desiredWidth = (textBox.width || 0) * scaleX;
              textBox.set({ width: Math.max(desiredWidth, 40) });
              updated = true;
            }
            if (scaleY !== 1) {
              const desiredHeight = (textBox.height || 0) * scaleY;
              textBox.set({ height: Math.max(desiredHeight, 40) });
              updated = true;
            }
            if (updated) {
              // reset group scale and reflow text inside rect
              calloutGroup.set({ scaleX: 1, scaleY: 1 });
              // mark objects dirty so Fabric repaints during drag
              textBox.dirty = true;
              textObj.dirty = true;
              this.resizeCalloutByTextboxHeight(textBox, textObj, 8);
              const group = textObj.group;
              if (group && typeof group.addWithUpdate === 'function') {
                group.addWithUpdate();
                group.setCoords();
              }
              // render on next frame for smoother visuals
              if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                window.requestAnimationFrame(() => canvas.requestRenderAll());
              } else {
                canvas.requestRenderAll();
              }
            }
          } catch {}
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

  private extractTextProperties(textObj: any): ToolProperties {
    console.log('🔍 Extracting text properties from:', textObj?.type, textObj?.data?.type);
    console.log('🔍 Text object structure:', {
      type: textObj?.type,
      dataType: textObj?.data?.type,
      hasGetObjects: typeof textObj?.getObjects === 'function',
      objectKeys: textObj ? Object.keys(textObj) : []
    });
    
    // Extract the current properties from a text object
    const properties: ToolProperties = {
      color: this.toolProperties.color,
      strokeWidth: this.toolProperties.strokeWidth,
      opacity: this.toolProperties.opacity,
      fontSize: this.toolProperties.fontSize,
      fontWeight: this.toolProperties.fontWeight,
      fontStyle: this.toolProperties.fontStyle,
      textAlign: this.toolProperties.textAlign,
      underline: this.toolProperties.underline,
      textBorder: this.toolProperties.textBorder,
      textBoxLineThickness: this.toolProperties.textBoxLineThickness
    };

    // Handle both individual text objects and text groups
    let textRef: any = textObj;
    let rectRef: any = null;

    // If it's a group, find the text and rect objects inside
    if (textObj.type === 'group' && textObj.data?.type === 'text-border') {
      textRef = textObj.getObjects().find((o: any) => o.type === 'textbox' || o.type === 'i-text');
      rectRef = textObj.getObjects().find((o: any) => o.type === 'rect');
      console.log('🔍 Found text-border group, textRef:', !!textRef, 'rectRef:', !!rectRef);
    } else if (textObj.type === 'group' && textObj.data?.type === 'text') {
      textRef = textObj.getObjects().find((o: any) => o.type === 'textbox' || o.type === 'i-text');
      rectRef = textObj.getObjects().find((o: any) => o.type === 'rect');
      console.log('🔍 Found text group, textRef:', !!textRef, 'rectRef:', !!rectRef);
    }

    // Extract text properties
    if (textRef) {
      properties.color = textRef.fill || properties.color;
      properties.fontSize = textRef.fontSize || properties.fontSize;
      properties.fontWeight = textRef.fontWeight || properties.fontWeight;
      properties.fontStyle = textRef.fontStyle || properties.fontStyle;
      properties.textAlign = textRef.textAlign || properties.textAlign;
      properties.opacity = textRef.opacity ?? properties.opacity;
      properties.underline = !!textRef.underline;
      console.log('🔍 Extracted text properties:', {
        color: properties.color,
        fontSize: properties.fontSize,
        fontWeight: properties.fontWeight,
        fontStyle: properties.fontStyle,
        textAlign: properties.textAlign,
        opacity: properties.opacity,
        underline: properties.underline
      });
    }

    // Extract border properties
    if (rectRef) {
      properties.textBorder = !!(rectRef.strokeWidth && rectRef.strokeWidth > 0);
      properties.textBoxLineThickness = rectRef.strokeWidth || properties.textBoxLineThickness;
      console.log('🔍 Extracted border properties:', {
        textBorder: properties.textBorder,
        textBoxLineThickness: properties.textBoxLineThickness
      });
    }

    console.log('🔍 Final extracted properties:', properties);
    return properties;
  }

     private updateControlPanelWithCloudProperties(cloudObj: any) {
     if (!this.onPropertiesUpdate) return;
     
     const cloudProperties = this.extractCloudProperties(cloudObj);
     console.log('🎛️ Updating control panel with cloud properties:', cloudProperties);
     
     // Create a clean properties object with only cloud-relevant properties
     const cleanProperties: ToolProperties = {
       color: cloudProperties.color,
       strokeWidth: cloudProperties.strokeWidth,
       opacity: cloudProperties.opacity,
       // Set all other properties to their defaults
       fontSize: 14,
       fontWeight: 300,
       textBoxLineThickness: 1.5,
       cloudLineThickness: 2,
       rectangleLineThickness: 2,
       circleLineThickness: 2,
       arrowLineThickness: 2,
       freehandLineThickness: 2,
       colorTarget: 'border'
     };
     
     this.toolProperties = cleanProperties;
     console.log('🎛️ Updated toolProperties (clean):', this.toolProperties);
     
     // Notify the UI to update the control panel
     this.onPropertiesUpdate(this.toolProperties);
   }

  private updateControlPanelWithTextProperties(textObj: any) {
    console.log('🎛️ updateControlPanelWithTextProperties called with:', textObj?.type, textObj?.data?.type);
    if (!this.onPropertiesUpdate) {
      console.log('❌ No onPropertiesUpdate callback available');
      return;
    }
    
    const textProperties = this.extractTextProperties(textObj);
    console.log('🎛️ Updating control panel with text properties:', textProperties);
    
    // Create a clean properties object with only text-relevant properties
    const cleanProperties: ToolProperties = {
      color: textProperties.color,
      // Text boxes should not inherit callout stroke width; keep strokeWidth for text-only use
      strokeWidth: textProperties.strokeWidth,
      opacity: textProperties.opacity,
      fontSize: textProperties.fontSize,
      fontWeight: textProperties.fontWeight,
      fontStyle: textProperties.fontStyle,
      textAlign: textProperties.textAlign,
      underline: textProperties.underline,
      textBoxLineThickness: textProperties.textBoxLineThickness,
      // Reset other tool-specific line thicknesses to defaults to avoid cross-tool bleed
      cloudLineThickness: 2,
      rectangleLineThickness: 2,
      circleLineThickness: 2,
      arrowLineThickness: 2,
      freehandLineThickness: 2,
      // Selecting a text box targets text color/styling only
      colorTarget: 'text'
    };
    
    this.toolProperties = cleanProperties;
    console.log('🎛️ Updated toolProperties (clean):', this.toolProperties);
    
    // Notify the UI to update the control panel
    this.onPropertiesUpdate(this.toolProperties);
    console.log('🎛️ Called onPropertiesUpdate');
  }

  private extractRectangleProperties(rectangleObj: any): ToolProperties {
    console.log('🔍 Extracting rectangle properties from:', rectangleObj?.type, rectangleObj?.data?.type);
    
    // Extract the current properties from a rectangle object
    const properties: ToolProperties = {
      color: this.toolProperties.color,
      strokeWidth: this.toolProperties.strokeWidth,
      opacity: this.toolProperties.opacity
    };

    // For rectangle objects, extract stroke properties
    if (rectangleObj.data?.type === 'rectangle') {
      properties.color = rectangleObj.stroke || properties.color;
      properties.strokeWidth = rectangleObj.strokeWidth || properties.strokeWidth;
      properties.opacity = rectangleObj.opacity ?? properties.opacity;
      
      console.log('🔍 Extracted rectangle properties:', {
        color: properties.color,
        strokeWidth: properties.strokeWidth,
        opacity: properties.opacity
      });
    }

    console.log('🔍 Final extracted rectangle properties:', properties);
    return properties;
  }

  private extractCircleProperties(circleObj: any): ToolProperties {
    console.log('🔍 Extracting circle properties from:', circleObj?.type, circleObj?.data?.type);
    
    // Extract only the relevant properties for circle objects
    const properties: ToolProperties = {
      color: this.toolProperties.color,
      strokeWidth: this.toolProperties.strokeWidth,
      opacity: this.toolProperties.opacity
    };

    // For circle objects, extract stroke properties
    if (circleObj.data?.type === 'circle') {
      properties.color = circleObj.stroke || properties.color;
      properties.strokeWidth = circleObj.strokeWidth || properties.strokeWidth;
      properties.opacity = circleObj.opacity ?? properties.opacity;
      
      console.log('🔍 Extracted circle properties:', {
        color: properties.color,
        strokeWidth: properties.strokeWidth,
        opacity: properties.opacity
      });
    }

    console.log('🔍 Final extracted circle properties:', properties);
    return properties;
  }

  private extractArrowProperties(arrowObj: any): ToolProperties {
    console.log('🔍 Extracting arrow properties from:', arrowObj?.type, arrowObj?.data?.type);
    
    // Extract only the relevant properties for arrow objects
    const properties: ToolProperties = {
      color: this.toolProperties.color,
      strokeWidth: this.toolProperties.strokeWidth,
      opacity: this.toolProperties.opacity
    };

    // For arrow objects, extract stroke properties
    if (arrowObj.data?.type === 'arrow' || arrowObj.data?.type === 'arrow-group') {
      properties.color = arrowObj.stroke || properties.color;
      properties.strokeWidth = arrowObj.strokeWidth || properties.strokeWidth;
      properties.opacity = arrowObj.opacity ?? properties.opacity;
      
      console.log('🔍 Extracted arrow properties:', {
        color: properties.color,
        strokeWidth: properties.strokeWidth,
        opacity: properties.opacity
      });
    }

    console.log('🔍 Final extracted arrow properties:', properties);
    return properties;
  }

  private extractFreehandProperties(freehandObj: any): ToolProperties {
    console.log('🔍 Extracting freehand properties from:', freehandObj?.type, freehandObj?.data?.type);
    
    // Extract only the relevant properties for freehand objects
    const properties: ToolProperties = {
      color: this.toolProperties.color,
      strokeWidth: this.toolProperties.strokeWidth,
      opacity: this.toolProperties.opacity
    };

    // For freehand objects (Path objects), extract stroke properties
    if (freehandObj.type === 'path') {
      properties.color = freehandObj.stroke || properties.color;
      properties.strokeWidth = freehandObj.strokeWidth || properties.strokeWidth;
      properties.opacity = freehandObj.opacity ?? properties.opacity;
      
      console.log('🔍 Extracted freehand properties:', {
        color: properties.color,
        strokeWidth: properties.strokeWidth,
        opacity: properties.opacity
      });
    }

    console.log('🔍 Final extracted freehand properties:', properties);
    return properties;
  }

  private extractCalloutProperties(calloutObj: any): ToolProperties {
    console.log('🔍 Extracting callout properties from:', calloutObj?.type, calloutObj?.data?.type);
    
    // Extract properties from callout group
    const properties: ToolProperties = {
      color: this.toolProperties.color,
      strokeWidth: this.toolProperties.strokeWidth,
      opacity: this.toolProperties.opacity,
      fontSize: this.toolProperties.fontSize,
      fontWeight: this.toolProperties.fontWeight,
      fontStyle: this.toolProperties.fontStyle,
      textAlign: this.toolProperties.textAlign,
      colorTarget: 'border' // Callouts always target border since we removed color target buttons
    };

    // If it's a callout group, extract properties from the text and box objects
    if (calloutObj.type === 'group' && calloutObj.data?.type === 'callout-group') {
      const textObj = calloutObj.getObjects().find((obj: any) => obj.data?.type === 'text');
      const textBox = calloutObj.getObjects().find((obj: any) => obj.data?.type === 'callout-box');
      
      if (textObj) {
        properties.fontSize = textObj.fontSize || properties.fontSize;
        properties.fontWeight = textObj.fontWeight || properties.fontWeight;
        properties.fontStyle = textObj.fontStyle || properties.fontStyle;
        properties.textAlign = textObj.textAlign || properties.textAlign;
        properties.opacity = textObj.opacity || properties.opacity;
      }
      
      if (textBox) {
        properties.strokeWidth = textBox.strokeWidth || properties.strokeWidth;
        properties.color = textBox.stroke || properties.color;
        // Don't extract opacity from textBox - it should come from textObj only
      }
    }

    console.log('🔍 Final extracted callout properties:', properties);
    return properties;
  }

  private updateControlPanelWithCalloutProperties(calloutObj: any) {
    console.log('🎛️ updateControlPanelWithCalloutProperties called with:', calloutObj?.type, calloutObj?.data?.type);
    if (!this.onPropertiesUpdate) {
      console.log('❌ No onPropertiesUpdate callback available');
      return;
    }
    
    const calloutProperties = this.extractCalloutProperties(calloutObj);
    console.log('🎛️ Updating control panel with callout properties:', calloutProperties);
    
    // Create a clean properties object with only callout-relevant properties
    const cleanProperties: ToolProperties = {
      color: calloutProperties.color,
      strokeWidth: calloutProperties.strokeWidth,
      opacity: calloutProperties.opacity,
      fontSize: calloutProperties.fontSize,
      fontWeight: calloutProperties.fontWeight,
      fontStyle: calloutProperties.fontStyle,
      textAlign: calloutProperties.textAlign,
      colorTarget: 'border', // Callouts always target border since we removed color target buttons
      // Set all other properties to their defaults
      textBoxLineThickness: 1.5,
      cloudLineThickness: 2,
      rectangleLineThickness: 2,
      circleLineThickness: 2,
      arrowLineThickness: 2,
      freehandLineThickness: 2
    };
    
    this.toolProperties = cleanProperties;
    console.log('🎛️ Updated toolProperties (clean):', this.toolProperties);
    
    // Notify the UI to update the control panel
    this.onPropertiesUpdate(this.toolProperties);
    console.log('🎛️ Called onPropertiesUpdate');
  }

  private updateControlPanelWithFreehandProperties(freehandObj: any) {
    console.log('🎛️ updateControlPanelWithFreehandProperties called with:', freehandObj?.type, freehandObj?.data?.type);
    if (!this.onPropertiesUpdate) {
      console.log('❌ No onPropertiesUpdate callback available');
      return;
    }
    
    const freehandProperties = this.extractFreehandProperties(freehandObj);
    console.log('🎛️ Updating control panel with freehand properties:', freehandProperties);
    
    // Create a clean properties object with only freehand-relevant properties
    const cleanProperties: ToolProperties = {
      color: freehandProperties.color,
      strokeWidth: freehandProperties.strokeWidth,
      opacity: freehandProperties.opacity,
      // Set all other properties to their defaults
      textBoxLineThickness: 1.5,
      cloudLineThickness: 2,
      rectangleLineThickness: 2,
      circleLineThickness: 2,
      arrowLineThickness: 2,
      freehandLineThickness: 2,
      colorTarget: 'border'
    };
    
    this.toolProperties = cleanProperties;
    console.log('🎛️ Updated toolProperties (clean):', this.toolProperties);
    
    // Notify the UI to update the control panel
    this.onPropertiesUpdate(this.toolProperties);
    console.log('🎛️ Called onPropertiesUpdate');
  }

  private updateControlPanelWithArrowProperties(arrowObj: any) {
    console.log('🎛️ updateControlPanelWithArrowProperties called with:', arrowObj?.type, arrowObj?.data?.type);
    if (!this.onPropertiesUpdate) {
      console.log('❌ No onPropertiesUpdate callback available');
      return;
    }
    
    const arrowProperties = this.extractArrowProperties(arrowObj);
    console.log('🎛️ Updating control panel with arrow properties:', arrowProperties);
    
    // Create a clean properties object with ONLY arrow-relevant properties
    const cleanProperties: ToolProperties = {
      color: arrowProperties.color,
      strokeWidth: arrowProperties.strokeWidth,
      opacity: arrowProperties.opacity,
      arrowLineThickness: arrowProperties.strokeWidth, // Use the same value as strokeWidth
      colorTarget: 'border'
    };
    
    this.toolProperties = cleanProperties;
    console.log('🎛️ Updated toolProperties (clean):', this.toolProperties);
    
    // Notify the UI to update the control panel
    this.onPropertiesUpdate(this.toolProperties);
    console.log('🎛️ Called onPropertiesUpdate');
  }

  private updateControlPanelWithCircleProperties(circleObj: any) {
    console.log('🎛️ updateControlPanelWithCircleProperties called with:', circleObj?.type, circleObj?.data?.type);
    if (!this.onPropertiesUpdate) {
      console.log('❌ No onPropertiesUpdate callback available');
      return;
    }
    
    const circleProperties = this.extractCircleProperties(circleObj);
    console.log('🎛️ Updating control panel with circle properties:', circleProperties);
    
    // Create a clean properties object with only circle-relevant properties
    const cleanProperties: ToolProperties = {
      color: circleProperties.color,
      strokeWidth: circleProperties.strokeWidth,
      opacity: circleProperties.opacity,
      // Set all other properties to their defaults
      fontSize: 14,
      fontWeight: 300,
      textBoxLineThickness: 1.5,
      cloudLineThickness: 2,
      rectangleLineThickness: 2,
      circleLineThickness: 2,
      arrowLineThickness: 2,
      freehandLineThickness: 2,
      colorTarget: 'border'
    };
    
    this.toolProperties = cleanProperties;
    console.log('🎛️ Updated toolProperties (clean):', this.toolProperties);
    
    // Notify the UI to update the control panel
    this.onPropertiesUpdate(this.toolProperties);
    console.log('🎛️ Called onPropertiesUpdate');
  }

  private updateControlPanelWithRectangleProperties(rectangleObj: any) {
    console.log('🎛️ updateControlPanelWithRectangleProperties called with:', rectangleObj?.type, rectangleObj?.data?.type);
    if (!this.onPropertiesUpdate) {
      console.log('❌ No onPropertiesUpdate callback available');
      return;
    }
    
    const rectangleProperties = this.extractRectangleProperties(rectangleObj);
    console.log('🎛️ Updating control panel with rectangle properties:', rectangleProperties);
    
    // Create a clean properties object with only rectangle-relevant properties
    const cleanProperties: ToolProperties = {
      color: rectangleProperties.color,
      strokeWidth: rectangleProperties.strokeWidth,
      opacity: rectangleProperties.opacity,
      // Set all other properties to their defaults
      fontSize: 14,
      fontWeight: 300,
      textBoxLineThickness: 1.5,
      cloudLineThickness: 2,
      rectangleLineThickness: 2,
      circleLineThickness: 2,
      arrowLineThickness: 2,
      freehandLineThickness: 2,
      colorTarget: 'border'
    };
    
    this.toolProperties = cleanProperties;
    console.log('🎛️ Updated toolProperties (clean):', this.toolProperties);
    
    // Notify the UI to update the control panel
    this.onPropertiesUpdate(this.toolProperties);
    console.log('🎛️ Called onPropertiesUpdate');
  }

           private resizeCalloutByTextboxHeight(textBox: any, textObj: any, padding: number = 20) {
      try {
        // Compute desired inner width from the rect and reflow the textbox to that width
        const desiredInnerWidth = Math.max(((textBox.width || 0) - padding * 2), 20);

        if (typeof textObj.set === 'function') {
          if (textObj.width !== desiredInnerWidth) {
            textObj.set({ width: desiredInnerWidth });
          }
          // After width change, recompute dimensions for an accurate height
          textObj._forceClearCache && textObj._forceClearCache();
          textObj.initDimensions && textObj.initDimensions();
        }

        const newHeight = (textObj.height || 0) + padding * 2;

        // Update rect size to fit content
        textBox.set({
          width: Math.max(desiredInnerWidth + padding * 2, 40),
          height: Math.max(newHeight, 40)
        });

        // Keep text aligned with padding inside rect
        textObj.set({
          left: textBox.left + padding,
          top: textBox.top + padding
        });

        // Update group bounds so nothing gets visually clipped
        const group = textObj.group;
        if (group && typeof group.addWithUpdate === 'function') {
          group.addWithUpdate();
          group.setCoords();
        }

        this.canvas?.requestRenderAll();
      } catch (err) {
        console.error('❌ Error resizeCalloutByTextboxHeight:', err);
      }
    }
 }
