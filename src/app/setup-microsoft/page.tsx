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
      description: 'Set up a multi-tenant Azure app for OAuth2 authentication',
      completed: false,
      required: true,
      icon: HiCog
    },
    {
      id: 'permissions',
      title: 'Configure Permissions',
      description: 'Grant necessary permissions for multi-tenant access',
      completed: false,
      required: true,
      icon: HiShieldCheck
    },
    {
      id: 'credentials',
      title: 'Get Application Credentials',
      description: 'Copy your client ID and client secret',
      completed: false,
      required: true,
      icon: HiKey
    },
    {
      id: 'site-info',
      title: 'Test Authentication',
      description: 'Verify OAuth2 flow works with your organization',
      completed: false,
      required: true,
      icon: HiGlobe
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
        
        // Don't pre-fill form with existing configuration to avoid using old invalid credentials
        // Only set the config saved state if configuration exists
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
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Microsoft Integration Setup</h2>
              <p className="text-blue-100">Configure your Azure app registration for enterprise integration</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 text-center">What is Azure Active Directory?</h4>
                <p className="text-blue-800 text-sm leading-relaxed text-center">
                  Azure Active Directory (Azure AD) is Microsoft's enterprise identity platform that manages user authentication 
                  and application permissions. By creating an Azure app registration, you're setting up secure access for thinkcompl.ai 
                  to interact with your Microsoft services using industry-standard OAuth2 authentication. This ensures enterprise-grade 
                  security while allowing seamless integration with your existing Microsoft tools.
                </p>
              </div>
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
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Create Multi-Tenant Azure App</h2>
                <p className="text-blue-100">Set up an Azure app that works across all organizations</p>
              </div>
              <div className="p-6 space-y-3">
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="text-gray-700">Visit <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">portal.azure.com</a> and sign in</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <p className="text-gray-700">Search for <span className="font-bold">&quot;App registrations&quot;</span> in the search bar</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <p className="text-gray-700">Click <span className="font-bold">&quot;New registration&quot;</span> in the top right</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                  <p className="text-gray-700">Name: Copy and paste <span className="font-bold">thinkcompl.ai Multi-Tenant</span> or write something similar</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                  <p className="text-gray-700">Account types: Select <span className="font-bold">&quot;Accounts in any organizational directory (Any Azure AD directory - Multitenant)&quot;</span></p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">6</div>
                  <p className="text-gray-700">Redirect URI: Select <span className="font-bold">Web</span> and paste <span className="font-bold">https://thinkcompl.ai/api/sharepoint/auth/callback</span></p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">7</div>
                  <p className="text-gray-700">Click <span className="font-bold">&quot;Register&quot;</span></p>
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
                  I&apos;ve completed the Azure app registration
                </label>
              </div>
            </div>
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Configure Multi-Tenant Permissions</h2>
                <p className="text-blue-100">Set up permissions for cross-organization access</p>
              </div>
              <div className="p-6 space-y-3">


              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium text-gray-900">Navigate back into <span className="font-bold">&quot;App registrations&quot;</span></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium text-gray-900">Click <span className="font-bold">&quot;All applications&quot;</span> and select the app you just created</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium text-gray-900">In the left menu, click <span className="font-bold">&quot;Manage&quot;</span> then <span className="font-bold">&quot;API permissions&quot;</span></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <p className="font-medium text-gray-900">Click <span className="font-bold">&quot;Microsoft Graph&quot;</span> (this opens a side panel)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                  <div>
                    <p className="font-medium text-gray-900">Select <span className="font-bold">&quot;Delegated permissions&quot;</span> (not Application permissions)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</div>
                  <div>
                    <p className="font-medium text-gray-900">Add these permissions:</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>• <span className="font-bold">Sites.Read.All</span></li>
                      <li>• <span className="font-bold">Sites.ReadWrite.All</span></li>
                      <li>• <span className="font-bold">Files.Read.All</span></li>
                      <li>• <span className="font-bold">Files.ReadWrite.All</span></li>
                      <li>• <span className="font-bold">Team.ReadBasic.All</span></li>
                      <li>• <span className="font-bold">Channel.ReadBasic.All</span></li>
                      <li>• <span className="font-bold">ChannelMessage.Send</span></li>
                      <li>• <span className="font-bold">Chat.ReadWrite</span></li>
                      <li>• <span className="font-bold">Calendars.ReadWrite</span></li>
                      <li>• <span className="font-bold">OnlineMeetings.ReadWrite</span></li>
                      <li>• <span className="font-bold">Mail.Send</span></li>
                      <li>• <span className="font-bold">User.Read</span></li>
                      <li>• <span className="font-bold">User.ReadBasic.All</span></li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">7</div>
                  <div>
                    <p className="font-medium text-gray-900">Click <span className="font-bold">&quot;Add permissions&quot;</span></p>
                  </div>
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
                  I&apos;ve configured all permissions
                </label>
              </div>
            </div>
            </div>
          </div>
        );

      case 'credentials':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Get Application Credentials</h2>
                <p className="text-blue-100">Copy your client ID and client secret</p>
              </div>
              <div className="p-6 space-y-3">

              <div className="space-y-3">
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
                  <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                  <div className="relative">
                    <input
                      type={showClientSecret ? "text" : "password"}
                      value={formData.clientSecret}
                      onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                      placeholder="Enter your client secret"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showClientSecret ? (
                        <HiX className="h-5 w-5 text-gray-400" />
                      ) : (
                        <HiKey className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="text-gray-700">Go to your app registration → <span className="font-bold">Overview</span> → Copy the &quot;Application (client) ID&quot;</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="text-gray-700">Go to <span className="font-bold">Certificates & secrets</span> → Click <span className="font-bold">&quot;+ New client secret&quot;</span></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="text-gray-700">Add description: <span className="font-bold">&quot;thinkcompl.ai OAuth2 Token Exchange&quot;</span></p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                  <div>
                    <p className="text-gray-700">Set expiration to <span className="font-bold">12 months</span></p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-700 text-sm font-medium">Copy the secret value immediately - it&apos;s only visible once!</p>
                </div>
              </div>

            </div>
            </div>
          </div>
        );

      case 'site-info':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Test OAuth2 Authentication</h2>
                <p className="text-blue-100">Verify the interactive authentication flow works</p>
              </div>
              <div className="p-6 space-y-3">

              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Click the button below to test that your Azure app registration is working correctly.
                    You'll be redirected to Microsoft's login page to verify the authentication flow.
                  </p>
                  
                  <Button
                    onClick={async () => {
                      console.log('Test OAuth2 Flow clicked');
                      console.log('formData.clientId:', formData.clientId);
                      try {
                        // Test the OAuth2 flow by initiating authentication
                        console.log('Fetching /api/sharepoint/auth?action=login...');
                        const response = await fetch('/api/sharepoint/auth?action=login');
                        console.log('Response received:', response);
                        const data = await response.json();
                        console.log('Response data:', data);
                        
                        if (data.success) {
                          // Redirect to Microsoft's OAuth2 authorization page
                          console.log('Redirecting to:', data.authUrl);
                          window.location.href = data.authUrl;
                        } else {
                          alert(`Authentication setup failed: ${data.error}`);
                        }
                      } catch (error) {
                        console.error('Authentication test failed:', error);
                        alert('Authentication test failed. Please ensure your Azure app registration is properly configured.');
                      }
                    }}
                    className="mx-auto"
                    disabled={!formData.clientId}
                  >
                    Test OAuth2 Flow
                  </Button>
                </div>
              </div>
            </div>
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
            Microsoft Integration Setup
          </h1>
          <p className="text-xl text-blue-100">
            Configure SharePoint, Teams, and Calendar integration with Azure in a few simple steps
          </p>
        </div>

        {/* Progress Steps - Only show when not on intro slide */}
        {currentStep > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-3">
              {/* Step 1 */}
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                0 <= currentStep - 1 
                  ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                  : 'bg-blue-300 border-blue-300 text-white'
              }`}>
                {0 < currentStep - 1 ? (
                  <HiCheck className="w-6 h-6" />
                ) : 0 === currentStep - 1 && steps[0]?.id === 'test-connection' && saveSuccess ? (
                  <HiCheck className="w-6 h-6" />
                ) : (
                  <HiCog className="w-6 h-6" />
                )}
              </div>
              
              {/* Line 1 */}
              <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
                0 < currentStep - 1 ? 'bg-white' : 'bg-blue-300'
              }`} />
              
              {/* Step 2 */}
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                1 <= currentStep - 1 
                  ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                  : 'bg-blue-300 border-blue-300 text-white'
              }`}>
                {1 < currentStep - 1 ? (
                  <HiCheck className="w-6 h-6" />
                ) : 1 === currentStep - 1 && steps[1]?.id === 'test-connection' && saveSuccess ? (
                  <HiCheck className="w-6 h-6" />
                ) : (
                  <HiShieldCheck className="w-6 h-6" />
                )}
              </div>
              
              {/* Line 2 */}
              <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
                1 < currentStep - 1 ? 'bg-white' : 'bg-blue-300'
              }`} />
              
              {/* Step 3 */}
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                2 <= currentStep - 1 
                  ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                  : 'bg-blue-300 border-blue-300 text-white'
              }`}>
                {2 < currentStep - 1 ? (
                  <HiCheck className="w-6 h-6" />
                ) : 2 === currentStep - 1 && steps[2]?.id === 'test-connection' && saveSuccess ? (
                  <HiCheck className="w-6 h-6" />
                ) : (
                  <HiKey className="w-6 h-6" />
                )}
              </div>
              
              {/* Line 3 */}
              <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
                2 < currentStep - 1 ? 'bg-white' : 'bg-blue-300'
              }`} />
              
              {/* Step 4 */}
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                3 <= currentStep - 1 
                  ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                  : 'bg-blue-300 border-blue-300 text-white'
              }`}>
                {3 < currentStep - 1 ? (
                  <HiCheck className="w-6 h-6" />
                ) : 3 === currentStep - 1 && steps[3]?.id === 'test-connection' && saveSuccess ? (
                  <HiCheck className="w-6 h-6" />
                ) : (
                  <HiGlobe className="w-6 h-6" />
                )}
              </div>
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
              onClick={async () => {
                // If we're on step 3 (credentials) and moving to step 4, save both client ID and client secret
                if (currentStep === 3 && formData.clientId && formData.clientSecret) {
                  try {
                    const response = await fetch('/api/sharepoint/update-env', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        clientId: formData.clientId,
                        clientSecret: formData.clientSecret 
                      })
                    });
                    
                    const data = await response.json();
                    if (!data.success) {
                      alert('Failed to save credentials to environment. Please try again.');
                      return;
                    }
                  } catch (error) {
                    console.error('Failed to save credentials:', error);
                    alert('Failed to save credentials to environment. Please try again.');
                    return;
                  }
                }
                
                if (currentStep === steps.length) {
                  // Navigate to dashboard when finishing
                  window.location.href = '/dashboard';
                } else {
                  setCurrentStep(Math.min(steps.length, currentStep + 1));
                }
              }}
              disabled={
                (currentStep === 3 && (!formData.clientId || !formData.clientSecret)) || 
                (currentStep === 4 && !formData.clientId) || 
                (currentStep !== 3 && currentStep !== 4 && currentStep !== 0 && !completedSteps[steps[currentStep - 1].id])
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