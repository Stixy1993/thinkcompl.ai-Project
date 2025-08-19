"use client";

import React, { useState } from 'react';
import { Annotation, Comment } from './PDFViewer';

interface AnnotationsPanelProps {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  onAnnotationSelect: (id: string) => void;
  onAnnotationDelete: (id: string) => void;
  onCommentAdd: (annotationId: string, comment: string) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  currentUser: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

function AnnotationsPanelComponent({
  annotations,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationDelete,
  onCommentAdd,
  onAnnotationUpdate,
  currentUser,
  isVisible,
  onToggleVisibility
}: AnnotationsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [filterBy, setFilterBy] = useState<'all' | 'author' | 'type' | 'page'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'author' | 'page'>('date');

  const toggleAnnotationExpansion = (id: string) => {
    const newExpanded = new Set(expandedAnnotations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAnnotations(newExpanded);
  };

  const handleAddComment = (annotationId: string) => {
    if (newComment.trim()) {
      onCommentAdd(annotationId, newComment);
      setNewComment('');
    }
  };

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'rectangle': return '⬜';
      case 'circle': return '⭕';
      case 'arrow': return '➡️';
      case 'cloud': return '☁️';
      case 'highlight': return '🖍️';
      case 'measurement': return '📏';
      case 'stamp': return '🔖';
      case 'freehand': return '✏️';
      default: return '📌';
    }
  };

  const getStatusColor = (annotation: Annotation) => {
    // You can add status logic here
    return 'bg-green-100 text-green-800';
  };

  const filteredAndSortedAnnotations = annotations
    .filter(annotation => {
      switch (filterBy) {
        case 'author':
          return annotation.author === currentUser;
        case 'type':
          return annotation.type === 'text'; // Example filter
        case 'page':
          return annotation.pageNumber === 1; // Example filter
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'author':
          return a.author.localeCompare(b.author);
        case 'page':
          return a.pageNumber - b.pageNumber;
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className={`annotations-panel ${isVisible ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-l border-gray-300`}>
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Annotations</h2>
          <button
            onClick={onToggleVisibility}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filters and Sorting */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="text-xs px-2 py-1 border border-gray-300 rounded"
            >
              <option value="all">All Annotations</option>
              <option value="author">My Annotations</option>
              <option value="type">By Type</option>
              <option value="page">Current Page</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2 py-1 border border-gray-300 rounded"
            >
              <option value="date">By Date</option>
              <option value="author">By Author</option>
              <option value="page">By Page</option>
            </select>
          </div>
          <div className="text-xs text-gray-500">
            {filteredAndSortedAnnotations.length} annotation(s)
          </div>
        </div>
      </div>

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedAnnotations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-sm">No annotations yet</div>
            <div className="text-xs mt-1">Start marking up the document to see annotations here</div>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredAndSortedAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`
                  border rounded-lg p-3 cursor-pointer transition-all duration-200
                  ${selectedAnnotation === annotation.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
                onClick={() => onAnnotationSelect(annotation.id)}
              >
                {/* Annotation Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getAnnotationIcon(annotation.type)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Page {annotation.pageNumber} • {annotation.author}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(annotation)}`}>
                      Active
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnnotationDelete(annotation.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Annotation Content */}
                {annotation.text && (
                  <div className="text-sm text-gray-700 mb-2 p-2 bg-gray-100 rounded">
                    "{annotation.text}"
                  </div>
                )}

                {/* Annotation Details */}
                <div className="text-xs text-gray-500 mb-2">
                  Created: {new Date(annotation.createdAt).toLocaleDateString()} at{' '}
                  {new Date(annotation.createdAt).toLocaleTimeString()}
                  {annotation.modifiedAt > annotation.createdAt && (
                    <div>
                      Modified: {new Date(annotation.modifiedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t border-gray-200 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAnnotationExpansion(annotation.id);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {expandedAnnotations.has(annotation.id) ? '▼' : '▶'} 
                    <span className="ml-1">
                      Comments ({annotation.comments?.length || 0})
                    </span>
                  </button>

                  {expandedAnnotations.has(annotation.id) && (
                    <div className="mt-2 space-y-2">
                      {/* Existing Comments */}
                      {annotation.comments?.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-2 rounded text-xs">
                          <div className="font-medium text-gray-700">{comment.author}</div>
                          <div className="text-gray-600">{comment.text}</div>
                          <div className="text-gray-400 mt-1">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}

                      {/* Add New Comment */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(annotation.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(annotation.id)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>Total: {annotations.length}</div>
          <div className="flex space-x-2">
            <button className="text-blue-600 hover:text-blue-800">Export</button>
            <button className="text-blue-600 hover:text-blue-800">Import</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Use standard export - dynamic loading was causing issues
export default AnnotationsPanelComponent;