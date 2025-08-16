"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HiX, 
  HiPlus, 
  HiTrash, 
  HiDuplicate, 
  HiCheck,
  HiDocumentText,
  HiCog,
  HiTag
} from 'react-icons/hi';
import { ITRTemplate, ITRSection } from '@/types/itr';

interface ITRTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ITRTemplate | null;
  onSave: (template: ITRTemplate) => void;
}

export default function ITRTemplateModal({ isOpen, onClose, template, onSave }: ITRTemplateModalProps) {
  const [formData, setFormData] = useState<Partial<ITRTemplate>>({
    name: '',
    description: '',
    category: 'electrical',
    discipline: '',
    version: '1.0',
    isActive: true,
    sections: [],
    metadata: {
      standards: [],
      equipmentTypes: [],
      testTypes: []
    }
  });
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<ITRSection | null>(null);

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'electrical',
        discipline: '',
        version: '1.0',
        isActive: true,
        sections: [],
        metadata: {
          standards: [],
          equipmentTypes: [],
          testTypes: []
        }
      });
    }
  }, [template]);

  const handleSave = () => {
    if (!formData.name || !formData.description || !formData.discipline) {
      alert('Please fill in all required fields');
      return;
    }

    const newTemplate: ITRTemplate = {
      id: template?.id || Date.now().toString(),
      name: formData.name!,
      description: formData.description!,
      category: formData.category!,
      discipline: formData.discipline!,
      version: formData.version!,
      createdBy: template?.createdBy || 'Current User',
      createdAt: template?.createdAt || new Date(),
      updatedAt: new Date(),
      isActive: formData.isActive!,
      sections: formData.sections || [],
      metadata: formData.metadata
    };

    onSave(newTemplate);
    onClose();
  };

  const addSection = () => {
    const newSection: ITRSection = {
      id: Date.now().toString(),
      title: 'New Section',
      type: 'header',
      required: true,
      order: (formData.sections?.length || 0) + 1,
      fields: []
    };

    setFormData(prev => ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }));
    setEditingSection(newSection);
    setShowSectionModal(true);
  };

  const updateSection = (sectionId: string, updates: Partial<ITRSection>) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      ) || []
    }));
  };

  const deleteSection = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.filter(section => section.id !== sectionId) || []
    }));
  };

  const getSectionTypeIcon = (type: string) => {
    switch (type) {
      case 'header': return <HiDocumentText className="w-4 h-4" />;
      case 'test': return <HiCheck className="w-4 h-4" />;
      case 'measurement': return <HiCog className="w-4 h-4" />;
      case 'checklist': return <HiTag className="w-4 h-4" />;
      default: return <HiDocumentText className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter template name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category || 'electrical'}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="electrical">Electrical</option>
                <option value="mechanical">Mechanical</option>
                <option value="civil">Civil</option>
                <option value="instrumentation">Instrumentation</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discipline *
              </label>
              <input
                type="text"
                value={formData.discipline || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, discipline: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Electrical, Mechanical"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version
              </label>
              <input
                type="text"
                value={formData.version || '1.0'}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1.0"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the purpose and scope of this template"
            />
          </div>

          {/* Sections */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sections</h3>
              <button
                onClick={addSection}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <HiPlus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.sections?.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getSectionTypeIcon(section.type)}
                      <span className="font-medium">{section.title}</span>
                    </div>
                    <span className="text-sm text-gray-500">({section.type})</span>
                    {section.required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingSection(section);
                        setShowSectionModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <HiDuplicate className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {(!formData.sections || formData.sections.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <HiDocumentText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No sections added yet. Click "Add Section" to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standards
                </label>
                <input
                  type="text"
                  value={formData.metadata?.standards?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      standards: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="AS/NZS 3000, AS/NZS 2067"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Types
                </label>
                <input
                  type="text"
                  value={formData.metadata?.equipmentTypes?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      equipmentTypes: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Power Cables, Control Cables"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Types
                </label>
                <input
                  type="text"
                  value={formData.metadata?.testTypes?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      testTypes: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Insulation Resistance, Continuity"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center space-x-2"
          >
            <HiCheck className="w-4 h-4" />
            <span>Save Template</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
