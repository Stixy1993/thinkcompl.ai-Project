"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  HiClipboardCheck, 
  HiPlus, 
  HiTemplate, 
  HiDocumentText, 
  HiEye, 
  HiPencil, 
  HiTrash, 
  HiDownload, 
  HiUpload,
  HiFolder,
  HiSearch,
  HiFilter,
  HiX,
  HiCheck,
  HiClock,
  HiUser,
  HiTag
} from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import ITRTemplateModal from '@/app/components/ITRTemplateModal';
import ITRSectionModal from '@/app/components/ITRSectionModal';
import { ITRTemplate, ITRSection, ITRInstance } from '@/types/itr';

export default function InspectionTestReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'templates' | 'reports' | 'library'>('templates');
  const [templates, setTemplates] = useState<ITRTemplate[]>([]);
  const [reports, setReports] = useState<ITRInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ITRTemplate | null>(null);
  const [selectedReport, setSelectedReport] = useState<ITRInstance | null>(null);
  const [selectedSection, setSelectedSection] = useState<ITRSection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load templates and reports from your data source
      // For now, using mock data
      const mockTemplates: ITRTemplate[] = [
        {
          id: '1',
          name: 'Electrical Cable Testing',
          description: 'Standard ITR template for electrical cable testing including insulation resistance, continuity, and phasing tests.',
          category: 'electrical',
          discipline: 'Electrical',
          version: '1.0',
          createdBy: 'Chris Hart',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          isActive: true,
          sections: [
            {
              id: '1',
              title: 'Test Information',
              type: 'header',
              required: true,
              order: 1,
              fields: [
                {
                  id: 'cable_number',
                  label: 'Cable Number',
                  type: 'text',
                  required: true
                },
                {
                  id: 'cable_type',
                  label: 'Cable Type',
                  type: 'select',
                  required: true,
                  options: ['Power', 'Control', 'Instrumentation', 'Communication']
                },
                {
                  id: 'location',
                  label: 'Location',
                  type: 'text',
                  required: true
                }
              ]
            },
            {
              id: '2',
              title: 'Insulation Resistance Test',
              type: 'test',
              required: true,
              order: 2,
              fields: [
                {
                  id: 'ir_voltage',
                  label: 'Test Voltage (V)',
                  type: 'number',
                  required: true,
                  validation: { min: 100, max: 5000 }
                },
                {
                  id: 'ir_result',
                  label: 'Insulation Resistance (MΩ)',
                  type: 'number',
                  required: true,
                  validation: { min: 0 }
                },
                {
                  id: 'ir_pass',
                  label: 'Test Passed',
                  type: 'boolean',
                  required: true
                }
              ]
            },
            {
              id: '3',
              title: 'Continuity Test',
              type: 'test',
              required: true,
              order: 3,
              fields: [
                {
                  id: 'continuity_result',
                  label: 'Continuity Resistance (Ω)',
                  type: 'number',
                  required: true,
                  validation: { min: 0, max: 1 }
                },
                {
                  id: 'continuity_pass',
                  label: 'Test Passed',
                  type: 'boolean',
                  required: true
                }
              ]
            },
            {
              id: '4',
              title: 'Test Results',
              type: 'signature',
              required: true,
              order: 4
            }
          ],
          metadata: {
            standards: ['AS/NZS 3000', 'AS/NZS 2067'],
            equipmentTypes: ['Power Cables', 'Control Cables'],
            testTypes: ['Insulation Resistance', 'Continuity', 'Phasing']
          }
        },
        {
          id: '2',
          name: 'Mechanical Equipment Inspection',
          description: 'Comprehensive mechanical equipment inspection template covering visual inspection, measurements, and functional tests.',
          category: 'mechanical',
          discipline: 'Mechanical',
          version: '1.0',
          createdBy: 'Chris Hart',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
          isActive: true,
          sections: [
            {
              id: '1',
              title: 'Equipment Information',
              type: 'header',
              required: true,
              order: 1,
              fields: [
                {
                  id: 'equipment_tag',
                  label: 'Equipment Tag',
                  type: 'text',
                  required: true
                },
                {
                  id: 'equipment_type',
                  label: 'Equipment Type',
                  type: 'select',
                  required: true,
                  options: ['Pump', 'Motor', 'Valve', 'Compressor', 'Fan']
                }
              ]
            },
            {
              id: '2',
              title: 'Visual Inspection',
              type: 'checklist',
              required: true,
              order: 2,
              options: [
                'Equipment properly installed',
                'No visible damage',
                'All connections secure',
                'Safety guards in place',
                'Identification tags attached'
              ]
            },
            {
              id: '3',
              title: 'Measurements',
              type: 'measurement',
              required: true,
              order: 3,
              fields: [
                {
                  id: 'vibration',
                  label: 'Vibration Level (mm/s)',
                  type: 'number',
                  required: false,
                  validation: { min: 0, max: 50 }
                },
                {
                  id: 'temperature',
                  label: 'Operating Temperature (°C)',
                  type: 'number',
                  required: false,
                  validation: { min: -20, max: 200 }
                }
              ]
            }
          ]
        }
      ];

      const mockReports: ITRInstance[] = [
        {
          id: '1',
          templateId: '1',
          name: 'Cable Test - MCC-01 to Pump-01',
          status: 'completed',
          createdBy: 'Chris Hart',
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-20'),
          assignedTo: 'Mike Chen',
          location: 'MCC Room',
          equipment: 'Power Cable MCC-01-PUMP-01',
          data: {
            cable_number: 'MCC-01-PUMP-01',
            cable_type: 'Power',
            location: 'MCC Room to Pump Room',
            ir_voltage: 1000,
            ir_result: 500,
            ir_pass: true,
            continuity_result: 0.1,
            continuity_pass: true
          }
        }
      ];

      setTemplates(mockTemplates);
      setReports(mockReports);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = (template: ITRTemplate) => {
    if (selectedTemplate) {
      // Update existing template
      setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    } else {
      // Add new template
      setTemplates(prev => [...prev, template]);
    }
    setSelectedTemplate(null);
  };

  const handleSaveSection = (section: ITRSection) => {
    if (selectedTemplate) {
      const updatedTemplate = {
        ...selectedTemplate,
        sections: selectedTemplate.sections.map(s => s.id === section.id ? section : s)
      };
      setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
      setSelectedTemplate(updatedTemplate);
    }
    setSelectedSection(null);
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous messages
    setImportError(null);
    setImportSuccess(null);

    // Check file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError('Please select a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const templateData = JSON.parse(content);

        // Validate template structure
        if (!templateData.name || !templateData.category || !templateData.sections) {
          setImportError('Invalid template format. Template must include name, category, and sections.');
          return;
        }

        // Generate new ID and set creation details
        const newTemplate: ITRTemplate = {
          ...templateData,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user?.displayName || user?.email || 'Unknown User',
          isActive: true
        };

        // Check if template with same name already exists
        const existingTemplate = templates.find(t => t.name.toLowerCase() === newTemplate.name.toLowerCase());
        if (existingTemplate) {
          setImportError(`A template with the name "${newTemplate.name}" already exists.`);
          return;
        }

        // Add template to state
        setTemplates(prev => [...prev, newTemplate]);
        setImportSuccess(`Template "${newTemplate.name}" imported successfully!`);
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setImportSuccess(null);
        }, 3000);

      } catch (error) {
        console.error('Error parsing template file:', error);
        setImportError('Error parsing the JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setImportError('Error reading the file. Please try again.');
    };

    reader.readAsText(file);
  };

  const handleExportLibrary = () => {
    try {
      const libraryData = {
        templates: templates,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(libraryData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `itr-template-library-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error('Error exporting library:', error);
      setImportError('Error exporting the template library.');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'signed-off': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'electrical': return 'bg-blue-100 text-blue-800';
      case 'mechanical': return 'bg-green-100 text-green-800';
      case 'civil': return 'bg-yellow-100 text-yellow-800';
      case 'instrumentation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-blue-400">
      <div className="px-6 pt-1 pb-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <HiClipboardCheck className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Inspection Test Reports</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setShowTemplateModal(true);
              }}
              className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
            >
              <HiPlus className="w-4 h-4" />
              New Template
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
            >
              <HiPlus className="w-4 h-4" />
              New Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'templates'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <HiTemplate className="w-4 h-4" />
                <span>Templates</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <HiDocumentText className="w-4 h-4" />
                <span>Reports</span>
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'library'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <HiFolder className="w-4 h-4" />
                <span>Template Library</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={activeTab === 'templates' ? filterCategory : filterStatus}
                onChange={(e) => activeTab === 'templates' ? setFilterCategory(e.target.value) : setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {activeTab === 'templates' ? (
                  <>
                    <option value="all">All Categories</option>
                    <option value="electrical">Electrical</option>
                    <option value="mechanical">Mechanical</option>
                    <option value="civil">Civil</option>
                    <option value="instrumentation">Instrumentation</option>
                    <option value="general">General</option>
                  </>
                ) : (
                  <>
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="signed-off">Signed Off</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Import/Export Messages */}
          {(importError || importSuccess) && (
            <div className={`mb-4 p-4 rounded-md ${
              importError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center">
                {importError ? (
                  <HiX className="w-5 h-5 text-red-400 mr-2" />
                ) : (
                  <HiCheck className="w-5 h-5 text-green-400 mr-2" />
                )}
                <span className={importError ? 'text-red-800' : 'text-green-800'}>
                  {importError || importSuccess}
                </span>
                <button
                  onClick={() => {
                    setImportError(null);
                    setImportSuccess(null);
                  }}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <HiTemplate className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                            {template.category}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <span>Version {template.version}</span>
                          <span>{template.discipline}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <HiUser className="w-4 h-4" />
                            <span>{template.createdBy}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowTemplateModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <HiEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowReportModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            >
                              <HiPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              {report.status.replace('-', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
                            <span>Created: {report.createdAt.toLocaleDateString()}</span>
                            <span>Assigned: {report.assignedTo || 'Unassigned'}</span>
                            <span>Location: {report.location || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowReportModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <HiEye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                            <HiDownload className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'library' && (
                <div className="text-center py-12">
                  <HiFolder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Template Library</h3>
                  <p className="text-gray-600 mb-6">
                    Access and manage your ITR template library. Import, export, and organize templates for different disciplines and project types.
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportTemplate}
                      className="hidden"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <HiUpload className="w-4 h-4" />
                      <span>Import Template</span>
                    </button>
                    <button 
                      onClick={handleExportLibrary}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <HiDownload className="w-4 h-4" />
                      <span>Export Library</span>
                    </button>
                  </div>
                  <div className="mt-8 text-left max-w-2xl mx-auto">
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Template Import Format</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Templates should be in JSON format with the following structure:
                    </p>
                    <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto">
{`{
  "name": "Template Name",
  "description": "Template description",
  "category": "electrical|mechanical|civil|instrumentation|general",
  "discipline": "Discipline name",
  "version": "1.0",
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "type": "header|test|measurement|checklist|signature|photo|notes",
      "required": true,
      "order": 1,
      "fields": [
        {
          "id": "field_id",
          "label": "Field Label",
          "type": "text|number|date|time|select|multiselect|boolean|file|signature",
          "required": true,
          "options": ["option1", "option2"]
        }
      ]
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ITRTemplateModal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSave={handleSaveTemplate}
      />

      <ITRSectionModal
        isOpen={showSectionModal}
        onClose={() => {
          setShowSectionModal(false);
          setSelectedSection(null);
        }}
        section={selectedSection}
        onSave={handleSaveSection}
      />
    </div>
  );
} 