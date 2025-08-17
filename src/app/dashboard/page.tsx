"use client";
import { useAuth } from "../../lib/hooks/useAuth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MicrosoftTeamsWidget from "@/components/MicrosoftTeamsWidget";
import OutlookCalendarWidget from "@/components/OutlookCalendarWidget";


export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [sharePointConnected, setSharePointConnected] = useState(false);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    checkStepCompletion();
  }, []);

  const checkStepCompletion = async () => {
    try {
      // Check company setup status
      console.log('Checking company status...');
      const companyResponse = await fetch('/api/company/status');
      console.log('Company response:', companyResponse);
      
      const newCompletedSteps: number[] = [];
      
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        console.log('Company configured:', companyData.configured);
        
        if (companyData.configured) {
          newCompletedSteps.push(1);
          setCompanyInfo(companyData.info);
        }
      } else {
        console.error('Company API response not ok:', companyResponse.status);
      }

      // Check SharePoint connection status
      try {
        const sharePointResponse = await fetch('/api/sharepoint/auth/token');
        if (sharePointResponse.ok) {
          newCompletedSteps.push(2);
          setSharePointConnected(true);
        }
      } catch (error) {
        console.log('SharePoint not connected yet');
      }

      // Check team members (step 3 is considered complete if steps 1 and 2 are done)
      if (newCompletedSteps.includes(1) && newCompletedSteps.includes(2)) {
        newCompletedSteps.push(3);
      }
      
      setCompletedSteps(newCompletedSteps);
    } catch (error) {
      console.error('Failed to check step completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepAction = (stepNumber: number) => {
    // Check if previous steps are completed
    if (stepNumber === 2 && !completedSteps.includes(1)) {
      alert('Please complete the company setup first.');
      return;
    }
    if (stepNumber === 3 && (!completedSteps.includes(1) || !completedSteps.includes(2))) {
      alert('Please complete the previous steps first.');
      return;
    }

    switch (stepNumber) {
      case 1:
        router.push('/setup-company');
        break;
      case 2:
        router.push('/setup-microsoft');
        break;
      case 3:
        router.push('/dashboard/team-members');
        break;
    }
  };

  const getStepButton = (stepNumber: number) => {
    const isCompleted = completedSteps.includes(stepNumber);
    
    if (isCompleted) {
      return (
        <div className="flex justify-center">
          <button
            disabled
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium flex items-center space-x-2 cursor-not-allowed opacity-75"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Complete</span>
          </button>
        </div>
      );
    }

    const buttonText = stepNumber === 1 ? 'Get Started' : 
                      stepNumber === 2 ? 'Connect Here' : 'Manage Team';
    
    return (
      <div className="flex justify-center">
        <button
          onClick={() => handleStepAction(stepNumber)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
        >
          <span>{buttonText}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  const getStepNumber = (stepNumber: number) => {
    const isCompleted = completedSteps.includes(stepNumber);
    
    return (
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
        isCompleted ? 'bg-green-100' : 'bg-blue-100'
      }`}>
        {isCompleted ? (
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="text-2xl font-bold text-blue-600">{stepNumber}</span>
        )}
      </div>
    );
  };
  
  return (
    <div className="h-full">
      <div className="px-4 pt-2 pb-2 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <button
          onClick={() => setTestMode(!testMode)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            testMode 
              ? 'bg-orange-600 text-white hover:bg-orange-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {testMode ? 'Exit Preview' : 'Preview Integration'}
        </button>
      </div>
                        <main className="p-6" style={{ height: 'calc(100vh - 160px)' }}>
                    <div className="max-w-6xl w-full mx-auto">
                      {/* Welcome Section - Hide in test mode */}
                      {!testMode && (
                      <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-black mb-4">
                Welcome{user && user.displayName ? ` ${user.displayName.split(" ")[0]}` : ""}!
              </h2>
                                        <p className="text-lg text-gray-600 mb-8">
                            Get started with thinkcompl.ai in three simple steps
                          </p>
              
              {/* 3-Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  {getStepNumber(1)}
                                     <h3 className="font-semibold text-gray-900 mb-2">Company Profile Setup</h3>
                   <p className="text-sm text-gray-600 mb-4">Set up your company information and basic details</p>
                  {getStepButton(1)}
                </div>
                
                <div className="text-center">
                  {getStepNumber(2)}
                                     <h3 className="font-semibold text-gray-900 mb-2">Connect to Microsoft</h3>
                   <p className="text-sm text-gray-600 mb-4">Set up SharePoint and Teams integration</p>
                  {getStepButton(2)}
                </div>
                
                <div className="text-center">
                  {getStepNumber(3)}
                                     <h3 className="font-semibold text-gray-900 mb-2">Set Up Team Members</h3>
                   <p className="text-sm text-gray-600 mb-4">Invite team members and set their access levels</p>
                  {getStepButton(3)}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Microsoft Integration Widgets - Show when setup is complete OR in test mode */}
          {(completedSteps.includes(1) && completedSteps.includes(2)) || testMode ? (
            <div className={`${testMode ? 'mt-0' : 'mt-8'} space-y-6`}>
              {/* Header for integration section - Hide in test mode */}
              {!testMode && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Microsoft Integration</h2>
                <p className="text-gray-600">Stay connected with your team and manage project schedules</p>
              </div>
              )}

              {/* Microsoft Integration Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MicrosoftTeamsWidget 
                  projectName={companyInfo?.companyName || "thinkcompl.ai Project"}
                  className="h-fit"
                  isPreviewMode={testMode}
                />
                <OutlookCalendarWidget 
                  projectName={companyInfo?.companyName || "thinkcompl.ai Project"}
                  projectId={companyInfo?.id || "default"}
                  className="h-fit"
                  isPreviewMode={testMode}
                />
              </div>

              {/* Quick Actions Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => router.push('/dashboard/documents')}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors border border-gray-200"
                  >
                    <div className="text-2xl mb-2">📁</div>
                    <div className="text-sm font-medium text-gray-700">Documents</div>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/team-members')}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors border border-gray-200"
                  >
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-sm font-medium text-gray-700">Team</div>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/inspection-test-reports')}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors border border-gray-200"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div className="text-sm font-medium text-gray-700">ITRs</div>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/projects')}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors border border-gray-200"
                  >
                    <div className="text-2xl mb-2">🏗️</div>
                    <div className="text-sm font-medium text-gray-700">Projects</div>
                  </button>
                </div>
              </div>


            </div>
          ) : null}

        </div>
      </main>
    </div>
  );
} 