"use client";

import React, { useState } from 'react';

// Import the type directly to avoid circular dependencies
export type MarkupTool = 'select' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'cloud' | 'highlight' | 'measurement' | 'stamp' | 'freehand' | 'callout';

interface MarkupToolbarProps {
  activeTool: MarkupTool;
  onToolChange: (tool: MarkupTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  color: string;
  strokeWidth: number;
  opacity: number;
  disabled?: boolean;
}

function MarkupToolbarComponent({
  activeTool,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  color,
  strokeWidth,
  opacity,
  disabled = false
}: MarkupToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showBluebeamTools, setShowBluebeamTools] = useState(false);

  const basicTools = [
    { id: 'select', name: 'Select', icon: '↖️', description: 'Select and move annotations', category: 'basic' },
    { id: 'text', name: 'Text', icon: 'T', description: 'Add text annotations', category: 'basic' },
    { id: 'rectangle', name: 'Rectangle', icon: '⬜', description: 'Draw rectangles', category: 'basic' },
    { id: 'circle', name: 'Circle', icon: '⭕', description: 'Draw circles and ellipses', category: 'basic' },
    { id: 'arrow', name: 'Arrow', icon: '→', description: 'Draw arrows and lines', category: 'basic' },
    { id: 'freehand', name: 'Draw', icon: '✏️', description: 'Freehand drawing', category: 'basic' }
  ];

  const bluebeamTools = [
    { id: 'cloud', name: 'Cloud', icon: '☁️', description: 'Cloud markup for revisions', category: 'bluebeam' },
    { id: 'callout', name: 'Callout', icon: '💭', description: 'Add callout boxes', category: 'bluebeam' },
    { id: 'stamp', name: 'Stamp', icon: '🔖', description: 'Add approval stamps', category: 'bluebeam' },
    { id: 'measurement', name: 'Measure', icon: '📏', description: 'Measurement tools', category: 'bluebeam' },
    { id: 'highlight', name: 'Highlight', icon: '🖍️', description: 'Highlight text', category: 'bluebeam' }
  ];

  const allTools = [...basicTools, ...bluebeamTools];

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#000000', '#808080', '#ffffff', '#ffa500', '#800080', '#008000'
  ];

  const stampTypes = [
    'APPROVED', 'REJECTED', 'REVIEWED', 'CONFIDENTIAL', 'DRAFT', 'FINAL',
    'FOR REVIEW', 'VOID', 'COPY', 'URGENT', 'COMPLETED', 'PENDING'
  ];

  return (
    <div className="markup-toolbar bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      {/* Toolbar Header */}
      <div className="border-b border-gray-200 pb-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          Markup Tools
        </h3>
      </div>

      {/* Basic Tools */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Basic Tools</h4>
        <div className="grid grid-cols-2 gap-2">
          {basicTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id as MarkupTool)}
              disabled={disabled}
              className={`
                p-2 rounded-lg border-2 text-center transition-all duration-200 group
                ${activeTool === tool.id 
                  ? 'border-blue-500 bg-blue-500 text-white' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={tool.description}
            >
              <div className="text-sm mb-1">{tool.icon}</div>
              <div className="text-xs font-medium">{tool.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Bluebeam Tools */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Bluebeam Tools</h4>
          <button
            onClick={() => setShowBluebeamTools(!showBluebeamTools)}
            className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            {showBluebeamTools ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showBluebeamTools && (
          <div className="grid grid-cols-2 gap-2">
            {bluebeamTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id as MarkupTool)}
                disabled={disabled}
                className={`
                  p-2 rounded-lg border-2 text-center transition-all duration-200 group
                  ${activeTool === tool.id 
                    ? 'border-green-500 bg-green-500 text-white' 
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={tool.description}
              >
                <div className="text-sm mb-1">{tool.icon}</div>
                <div className="text-xs font-medium">{tool.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Properties Panel */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Properties</h3>
          <button
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            {showPropertiesPanel ? 'Hide' : 'Show'}
          </button>
        </div>

        {showPropertiesPanel && (
          <div className="space-y-4">
            {/* Color Picker */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Color
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded border-2 border-gray-300"
                  style={{ backgroundColor: color }}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300"
                />
              </div>
              
              {showColorPicker && (
                <div className="mt-2 grid grid-cols-6 gap-1">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        onColorChange(c);
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Stroke Width */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Line Width: {strokeWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => onStrokeWidthChange(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Opacity */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Opacity: {Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Stamp Options */}
            {activeTool === 'stamp' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Stamp Type
                </label>
                <select className="w-full text-xs p-2 border border-gray-300 rounded-md">
                  {stampTypes.map((stamp) => (
                    <option key={stamp} value={stamp}>
                      {stamp}
                    </option>
                  ))}
                </select>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {stampTypes.slice(0, 6).map((stamp) => (
                    <button
                      key={stamp}
                      className="p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border text-center"
                      onClick={() => {
                        // TODO: Set stamp type
                        console.log('Selected stamp:', stamp);
                      }}
                    >
                      {stamp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cloud Options */}
            {activeTool === 'cloud' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cloud Style
                </label>
                <select className="w-full text-xs p-2 border border-gray-300 rounded-md">
                  <option value="standard">Standard Cloud</option>
                  <option value="dense">Dense Cloud</option>
                  <option value="sparse">Sparse Cloud</option>
                </select>
              </div>
            )}

            {/* Callout Options */}
            {activeTool === 'callout' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Callout Style
                </label>
                <select className="w-full text-xs p-2 border border-gray-300 rounded-md">
                  <option value="rectangle">Rectangle</option>
                  <option value="rounded">Rounded Rectangle</option>
                  <option value="bubble">Speech Bubble</option>
                </select>
              </div>
            )}

            {/* Text Options */}
            {activeTool === 'text' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Font Size
                  </label>
                  <select className="w-full text-xs p-1 border border-gray-300 rounded">
                    <option value="12">12px</option>
                    <option value="14">14px</option>
                    <option value="16">16px</option>
                    <option value="18">18px</option>
                    <option value="20">20px</option>
                    <option value="24">24px</option>
                    <option value="28">28px</option>
                    <option value="32">32px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Font Family
                  </label>
                  <select className="w-full text-xs p-1 border border-gray-300 rounded">
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>
              </div>
            )}

            {/* Measurement Options */}
            {activeTool === 'measurement' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Measurement Type
                </label>
                <select className="w-full text-xs p-1 border border-gray-300 rounded">
                  <option value="length">Length</option>
                  <option value="area">Area</option>
                  <option value="perimeter">Perimeter</option>
                  <option value="angle">Angle</option>
                  <option value="radius">Radius</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              Undo
            </button>
            <button className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              Redo
            </button>
          </div>
          <div className="flex space-x-2">
            <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
              Delete
            </button>
            <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Use standard export - dynamic loading was causing issues
export default MarkupToolbarComponent;