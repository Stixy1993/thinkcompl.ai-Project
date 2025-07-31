'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Button from '@/components/Button';
import { HiCheck, HiX, HiExclamationCircle, HiCog, HiKey, HiGlobe, HiCloud, HiShieldCheck } from 'react-icons/hi';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  icon: React.ComponentType<any>;
}

export default function SharePointSetupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    siteUrl: '',
    siteId: '',
    driveId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [discoverySuccess, setDiscoverySuccess] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const steps: SetupStep[] = [
    {
      id: 'azure-app',
      title: 'Create Azure App Registration',
      description: 'Set up an Azure app to access SharePoint',
      completed: false,
      required: true,
      icon: HiCog
    },
    {
      id: 'permissions',
      title: 'Configure Permissions',
      description: 'Grant necessary permissions to your app',
      completed: false,
      required: true,
      icon: HiShieldCheck
    },
    {
      id: 'credentials',
      title: 'Get Credentials',
      description: 'Copy your client ID and secret',
      completed: false,
      required: true,
      icon: HiKey
    },
    {
      id: 'site-info',
      title: 'Find SharePoint Site',
      description: 'Locate your SharePoint site and drive',
      completed: false,
      required: true,
      icon: HiGlobe
    },
    {
      id: 'test-connection',
      title: 'Test Connection',
      description: 'Verify everything is working',
      completed: false,
      required: true,
      icon: HiCloud
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStepCompletion = (stepId: string, completed: boolean) => {
    setCompletedSteps(prev => ({ ...prev, [stepId]: completed }));
  };

  const loadCurrentConfiguration = async () => {
    setLoadingConfig(true);
    try {
      const response = await fetch('/api/sharepoint/save-config');
      const data = await response.json();
      
      if (data.success && data.config) {
        setCurrentConfig(data.config);
        
        // Pre-fill form with existing configuration
        if (data.config.tenantId) setFormData(prev => ({ ...prev, tenantId: data.config.tenantId }));
        if (data.config.clientId) setFormData(prev => ({ ...prev, clientId: data.config.clientId }));
        if (data.config.siteId) setFormData(prev => ({ ...prev, siteId: data.config.siteId }));
        if (data.config.driveId) setFormData(prev => ({ ...prev, driveId: data.config.driveId }));
        if (data.config.siteUrl) setFormData(prev => ({ ...prev, siteUrl: data.config.siteUrl }));
        
        // Mark as saved if configuration exists
        if (data.config.configSaved) {
          setConfigSaved(true);
        }
      }
    } catch (error) {
      console.error('Failed to load current configuration:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Load current configuration on component mount
  React.useEffect(() => {
    loadCurrentConfiguration();
  }, []);

  const handleTestConnection = async () => {
    setIsLoading(true);
    const results: Record<string, boolean> = {};

    try {
      // Test authentication
      const authResponse = await fetch('/api/sharepoint/auth/token');
      results['Security Access Granted'] = authResponse.ok;

      // Test site access
      if (formData.siteId) {
        const siteResponse = await fetch(`/api/sharepoint?action=getSites`);
        results['Site Access Confirmed'] = siteResponse.ok;
      }

      // Test drive access
      if (formData.driveId) {
        const driveResponse = await fetch(`/api/sharepoint?action=getDrives&siteId=${formData.siteId}`);
        results['File Access Ready'] = driveResponse.ok;
      }

      setTestResults(results);
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sharepoint/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConfigSaved(true);
        setSaveSuccess(true);
        
        // Don't show popup, just update the UI state
        console.log('Configuration saved successfully:', data.configSummary);
      } else {
        const errorMessage = data.error || 'Failed to save configuration';
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        const errorType = data.errorType || 'unknown';
        
        let fullMessage = `❌ ${errorMessage}${details}`;
        
        if (errorType === 'validation') {
          fullMessage += '\n\nPlease check your input and try again.';
        } else if (errorType === 'system') {
          fullMessage += '\n\nPlease try again or contact support if the issue persists.';
        }
        
        alert(fullMessage);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('❌ Failed to save configuration. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = (step: SetupStep) => {
    // Show intro slide when currentStep is 0
    if (currentStep === 0) {
      return (
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-lg p-4 space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 text-center">What is Azure and why do we need it?</h4>
              <p className="text-blue-800 text-sm leading-relaxed text-center">
                <strong>Azure</strong> is Microsoft's cloud platform that provides the security infrastructure needed to access SharePoint files. 
                Think of it as a secure "passport" that gives thinkcompl.ai permission to read and write your documents 
                without exposing your personal login credentials. This keeps your data safe while enabling powerful 
                AI-powered document management features.
              </p>
            </div>


          </div>
        </div>
      );
    }

    // For actual steps, use currentStep - 1 to get the correct step
    const actualStep = steps[currentStep - 1];
    switch (actualStep.id) {
      case 'azure-app':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Create Azure App Registration</h2>
              <p className="text-blue-100 text-lg">Set up an Azure app to access SharePoint</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="text-gray-700">Visit <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">portal.azure.com</a> and sign in</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <p className="text-gray-700">Search for <span className="font-bold">"App registrations"</span> in the search bar</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <p className="text-gray-700">Click <span className="font-bold">"New registration"</span> in the top right</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                  <p className="text-gray-700">Name: Copy and paste <span className="font-bold">thinkcompl.ai Integration</span> or write something similar</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                  <p className="text-gray-700">Account types: Select <span className="font-bold">"Accounts in this organizational directory only"</span> (should be selected by default)</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">6</div>
                  <p className="text-gray-700">Redirect URI: Select <span className="font-bold">Web</span> and paste <span className="font-bold">https://thinkcompl.ai</span></p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">7</div>
                  <p className="text-gray-700">Click <span className="font-bold">"Register"</span></p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="azure-app-complete"
                  checked={completedSteps['azure-app'] || false}
                  onChange={(e) => handleStepCompletion('azure-app', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="azure-app-complete" className="text-sm font-medium text-gray-900">
                  I've completed the Azure app registration
                </label>
              </div>
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Configure Permissions</h2>
              <p className="text-blue-100 text-lg">Grant necessary permissions to your app</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">


              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium text-gray-900">Navigate back into <span className="font-bold">"App registrations"</span></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium text-gray-900">Click <span className="font-bold">"All applications"</span> and select the app you just created</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium text-gray-900">In the left menu, click <span className="font-bold">"Manage"</span> then <span className="font-bold">"API permissions"</span></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <p className="font-medium text-gray-900">Click <span className="font-bold">"Microsoft Graph"</span> (this opens a side panel)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                  <div>
                    <p className="font-medium text-gray-900">Select <span className="font-bold">"Application permissions"</span></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</div>
                  <div>
                    <p className="font-medium text-gray-900">Add these permissions:</p>
                    <ul className="mt-1 space-y-1 text-sm text-gray-600">
                      <li>• <span className="font-bold">Sites.Read.All</span></li>
                      <li>• <span className="font-bold">Sites.ReadWrite.All</span></li>
                      <li>• <span className="font-bold">Files.Read.All</span></li>
                      <li>• <span className="font-bold">Files.ReadWrite.All</span></li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">7</div>
                  <div>
                    <p className="font-medium text-gray-900">Click <span className="font-bold">"Update permissions"</span></p>
                  </div>
                </div>
              </div>
                
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-700">
                  <p className="mb-2">After adding the permissions above, you must grant admin consent:</p>
                  <ul className="space-y-1">
                    <li>• Click <strong>"✓ Grant admin consent for thinkcompl.ai"</strong></li>
                    <li>• Confirm the consent dialog that appears</li>
                    <li>• You should see green checkmarks next to all permissions <span className="inline-flex items-center ml-1"><div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div></span></li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="permissions-complete"
                  checked={completedSteps['permissions'] || false}
                  onChange={(e) => handleStepCompletion('permissions', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="permissions-complete" className="text-sm font-medium text-gray-900">
                  I've configured all permissions and granted admin consent
                </label>
              </div>
            </div>
          </div>
        );

      case 'credentials':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Get Credentials</h2>
              <p className="text-blue-100 text-lg">Copy your client ID and secret</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Application (client) ID</label>
                  <input
                    type="text"
                    value={formData.clientId}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
                    placeholder="Enter your Application (client) ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Object ID</label>
                  <input
                    type="text"
                    value={formData.tenantId}
                    onChange={(e) => handleInputChange('tenantId', e.target.value)}
                    placeholder="Enter your Object ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Client Secret Value</label>
                  <div className="relative">
                    <input
                      type={showClientSecret ? "text" : "password"}
                      value={formData.clientSecret}
                      onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                      placeholder="Enter your Client Secret Value"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      {showClientSecret ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1">Where to find these values:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Application (client) ID:</strong> Found in your app registration → Overview → Copy the "Application (client) ID"</li>
                  <li>• <strong>Object ID:</strong> Found in your app registration → Overview → Copy the "Object ID"</li>
                  <li>• <strong>Client Secret Value:</strong> Found in your app registration → Manage → Certificates & secrets → Copy the "Value" (not Secret ID)</li>
                </ul>
                

                
                <h4 className="font-semibold text-blue-900 mb-2 mt-4">To create your Client Secret:</h4>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <p className="text-blue-800">Click <span className="font-bold">"New client secret"</span></p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <p className="text-blue-800">Add a description (e.g., "thinkcompl.ai integration") and choose expiration (12-24 months)</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                    <p className="text-blue-800">Click <span className="font-bold">"Add"</span> and <span className="font-bold">copy the secret value immediately</span> (you won't see it again)</p>
                  </div>
                </div>
              </div>


            </div>
          </div>
        );

      case 'site-info':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Find SharePoint Site</h2>
              <p className="text-blue-100 text-lg">Locate your SharePoint site and drive</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">SharePoint Site URL</label>
                  <input
                    type="url"
                    value={formData.siteUrl}
                    onChange={(e) => handleInputChange('siteUrl', e.target.value)}
                    placeholder="https://yourcompany.sharepoint.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={async () => {
                      if (formData.siteUrl) {
                        try {
                          const response = await fetch('/api/sharepoint/discover-site', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ siteUrl: formData.siteUrl })
                          });
                          const data = await response.json();
                          if (data.success) {
                            handleInputChange('siteId', data.siteId);
                            handleInputChange('driveId', data.driveId);
                            setDiscoverySuccess(true);
                          } else {
                            console.error('Site discovery failed:', data.error);
                            setDiscoverySuccess(false);
                            let errorMessage = data.error;
                            
                            if (data.examples) {
                              errorMessage += `\n\nValid URL examples:\n${data.examples.map((ex: string) => `• ${ex}`).join('\n')}`;
                            }
                            
                            if (data.missingVariables) {
                              errorMessage += `\n\nMissing environment variables: ${data.missingVariables.join(', ')}\n\nPlease check the AZURE_SETUP_GUIDE.md file for setup instructions.`;
                            }
                            
                            alert(`Site discovery failed: ${errorMessage}`);
                          }
                        } catch (error) {
                          console.error('Site discovery failed:', error);
                          alert('Site discovery failed. Please check your site URL and ensure your Azure app registration is properly configured. See AZURE_SETUP_GUIDE.md for details.');
                        }
                      }
                    }}
                    className="w-fit"
                    disabled={!formData.siteUrl}
                  >
                    Discover Site & Drive
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      Site ID (Auto-discovered)
                      {discoverySuccess && formData.siteId && (
                        <HiCheck className="w-4 h-4 text-green-500" />
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.siteId}
                      onChange={(e) => handleInputChange('siteId', e.target.value)}
                      placeholder="Will be auto-filled"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-black"
                      readOnly
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      Drive ID (Auto-discovered)
                      {discoverySuccess && formData.driveId && (
                        <HiCheck className="w-4 h-4 text-green-500" />
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.driveId}
                      onChange={(e) => handleInputChange('driveId', e.target.value)}
                      placeholder="Will be auto-filled"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-black"
                      readOnly
                    />
                  </div>
                </div>


              </div>
            </div>
          </div>
        );

      case 'test-connection':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Test Connection</h2>
              <p className="text-blue-100 text-lg">Verify everything is working</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
              <div className="flex justify-center">
                <Button
                  onClick={handleTestConnection}
                  disabled={isLoading || saveSuccess}
                  className="px-8 py-2 text-sm"
                >
                  {isLoading ? 'Testing...' : saveSuccess ? 'Configuration Saved' : 'Test Connection'}
                </Button>
              </div>

              {Object.keys(testResults).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Test Results:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {Object.entries(testResults).map(([test, passed]) => (
                      <div key={test} className={`flex items-center space-x-3 p-2 rounded-lg ${passed ? 'bg-green-50' : 'bg-gray-50'}`}>
                        {passed ? (
                          <HiCheck className="w-5 h-5 text-green-500" />
                        ) : (
                          <HiX className="w-5 h-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium text-black capitalize">{test}: {passed ? 'Passed' : 'Failed'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(testResults).length > 0 && Object.values(testResults).every(Boolean) && !saveSuccess && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <HiCheck className="w-6 h-6 text-green-500" />
                    <div>
                      <h4 className="font-semibold text-green-900">✅ All tests passed!</h4>
                      <p className="text-green-700 mt-1">
                        Your SharePoint connection is working correctly. You can now save the configuration.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {Object.keys(testResults).length > 0 && Object.values(testResults).every(Boolean) && !saveSuccess && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleSaveConfiguration}
                    className="px-8 py-2 text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              )}

              {saveSuccess && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <HiCheck className="w-6 h-6 text-green-500" />
                    <div>
                      <h4 className="font-semibold text-green-900">Configuration Saved!</h4>
                      <p className="text-green-700 mt-1">
                        Your SharePoint configuration has been saved successfully. You can now finish the setup.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-blue-400">
      {/* Header */}
      <header className="bg-blue-600 text-white fixed w-full z-50 shadow">
        <nav className="flex items-center px-8 py-2 relative">
          <div className="flex items-center gap-2">
            <Image src="/Compl.ai Logo sign in.svg" alt="Compl.ai Logo" width={32} height={32} />
            <span className="font-bold text-lg md:text-3xl leading-tight">thinkcompl.<span className="text-blue-200">ai</span></span>
          </div>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pt-24">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-3">
            SharePoint Setup Wizard
          </h1>
          <p className="text-xl text-blue-100">
            Configure your SharePoint integration in a few simple steps with Azure
          </p>
        </div>

        {/* Progress Steps - Only show when not on intro slide */}
        {currentStep > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    index <= currentStep - 1 
                      ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                      : 'bg-blue-300 border-blue-300 text-white'
                  }`}>
                                      {index < currentStep - 1 ? (
                    <HiCheck className="w-6 h-6" />
                  ) : index === currentStep - 1 && step.id === 'test-connection' && saveSuccess ? (
                    <HiCheck className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-32 h-1 mx-3 rounded-full transition-all duration-300 ${
                      index < currentStep - 1 ? 'bg-white' : 'bg-blue-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center" style={{ width: index === 0 || index === steps.length - 1 ? '3rem' : '3.25rem' }}>
                  <span className={`text-xs font-semibold text-center transition-all duration-300 ${
                    index <= currentStep - 1 ? 'text-white' : 'text-blue-200'
                  }`}>
                    {step.title}
                  </span>
                  <span className={`text-xs text-center mt-1 transition-all duration-300 ${
                    index <= currentStep - 1 ? 'text-blue-100' : 'text-blue-300'
                  }`}>
                    Step {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6">
          {renderStepContent(steps[currentStep])}
        </div>

        {/* Navigation */}
        {currentStep === 0 ? (
          <div className="flex justify-center">
            <Button
              onClick={() => setCurrentStep(1)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              Start Now
            </Button>
          </div>
        ) : (
          <div className="flex justify-between">
            <Button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              variant="secondary"
              className="px-8 py-2"
            >
              Previous
            </Button>
            <Button
              onClick={() => {
                if (currentStep === steps.length) {
                  // Navigate to dashboard when finishing
                  window.location.href = '/dashboard';
                } else {
                  setCurrentStep(Math.min(steps.length, currentStep + 1));
                }
              }}
              disabled={
                (currentStep === 3 && (!formData.tenantId || !formData.clientId || !formData.clientSecret)) || 
                (currentStep === 4 && (!formData.siteUrl || !formData.driveId)) || 
                (currentStep === 5 && !saveSuccess) ||
                (currentStep !== 3 && currentStep !== 4 && currentStep !== 5 && currentStep !== 0 && !completedSteps[steps[currentStep - 1].id])
              }
              className="px-8 py-2"
            >
              {currentStep === steps.length ? 'Finish' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 