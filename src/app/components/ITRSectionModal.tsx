"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HiX, 
  HiPlus, 
  HiTrash, 
  HiCheck,
  HiDocumentText,
  HiCog,
  HiTag,
  HiClipboardList,
  HiPhotograph,
  HiPencil
} from 'react-icons/hi';
import { ITRSection, ITRField } from '@/types/itr';

interface ITRSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  section?: ITRSection | null;
  onSave: (section: ITRSection) => void;
}

export default function ITRSectionModal({ isOpen, onClose, section, onSave }: ITRSectionModalProps) {
  const [formData, setFormData] = useState<Partial<ITRSection>>({
    title: '',
    type: 'header',
    required: true,
    order: 1,
    fields: [],
    options: []
  });

  useEffect(() => {
    if (section) {
      setFormData(section);
    } else {
      setFormData({
        title: '',
        type: 'header',
        required: true,
        order: 1,
        fields: [],
        options: []
      });
    }
  }, [section]);

  const handleSave = () => {
    if (!formData.title) {
      alert('Please enter a section title');
      return;
    }

    const newSection: ITRSection = {
      id: section?.id || Date.now().toString(),
      title: formData.title!,
      type: formData.type!,
      required: formData.required!,
      order: formData.order!,
      fields: formData.fields || [],
      options: formData.options || [],
      validation: formData.validation
    };

    onSave(newSection);
    onClose();
  };

  const addField = () => {
    const newField: ITRField = {
      id: Date.now().toString(),
      label: 'New Field',
      type: 'text',
      required: false
    };

    setFormData(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<ITRField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      ) || []
    }));
  };

  const deleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.filter(field => field.id !== fieldId) || []
    }));
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), 'New Option']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((option, i) => i === index ? value : option) || []
    }));
  };

  const deleteOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const getSectionTypeIcon = (type: string) => {
    switch (type) {
      case 'header': return <HiDocumentText className="w-4 h-4" />;
      case 'test': return <HiCheck className="w-4 h-4" />;
      case 'measurement': return <HiCog className="w-4 h-4" />;
      case 'checklist': return <HiClipboardList className="w-4 h-4" />;
      case 'signature': return <HiPencil className="w-4 h-4" />;
      case 'photo': return <HiPhotograph className="w-4 h-4" />;
      case 'notes': return <HiDocumentText className="w-4 h-4" />;
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
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {section ? 'Edit Section' : 'Add Section'}
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
                Section Title *
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter section title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Type *
              </label>
              <select
                value={formData.type || 'header'}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="header">Header</option>
                <option value="test">Test</option>
                <option value="measurement">Measurement</option>
                <option value="checklist">Checklist</option>
                <option value="signature">Signature</option>
                <option value="photo">Photo</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order
              </label>
              <input
                type="number"
                value={formData.order || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={formData.required || false}
                onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
                Required Section
              </label>
            </div>
          </div>

          {/* Fields (for header, test, measurement types) */}
          {(formData.type === 'header' || formData.type === 'test' || formData.type === 'measurement') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Fields</h3>
                <button
                  onClick={addField}
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                >
                  <HiPlus className="w-3 h-3" />
                  <span>Add Field</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.fields?.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field Label
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="time">Time</option>
                          <option value="select">Select</option>
                          <option value="multiselect">Multi-Select</option>
                          <option value="boolean">Boolean</option>
                          <option value="file">File</option>
                          <option value="signature">Signature</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-1 text-sm text-gray-700">Required</label>
                        </div>
                        <button
                          onClick={() => deleteField(field.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options (for checklist type) */}
          {formData.type === 'checklist' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Checklist Options</h3>
                <button
                  onClick={addOption}
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                >
                  <HiPlus className="w-3 h-3" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="space-y-2">
                {formData.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter option text"
                    />
                    <button
                      onClick={() => deleteOption(index)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <span>Save Section</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
