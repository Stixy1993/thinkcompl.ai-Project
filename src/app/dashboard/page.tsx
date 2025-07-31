"use client";
import { useAuth } from "../../lib/hooks/useAuth";
import SharePointSetupCard from "../../components/SharePointSetupCard";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStepCompletion();
  }, []);

  const checkStepCompletion = async () => {
    try {
      // Check if SharePoint is configured (Step 1)
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      const newCompletedSteps: number[] = [];
      
      if (configData.success && (configData.status === 'fully_configured' || configData.status === 'basic_configured')) {
        newCompletedSteps.push(1);
      }
      
      // For now, we'll assume steps 2 and 3 are not completed
      // In a real implementation, you'd check actual completion status
      
      setCompletedSteps(newCompletedSteps);
    } catch (error) {
      console.error('Failed to check step completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepAction = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        window.location.href = '/setup-sharepoint';
        break;
      case 2:
        // Navigate to team setup (you can create this page later)
        alert('Team setup feature coming soon!');
        break;
      case 3:
        // Navigate to AI features
        window.location.href = '/chat';
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
                      stepNumber === 2 ? 'Continue Here' : 'Explore';
    
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
      <div className="px-4 pt-2 pb-2">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>
                        <main className="p-6" style={{ height: 'calc(100vh - 160px)' }}>
                    <div className="max-w-6xl w-full mx-auto">
                      {/* Welcome Section */}
                      <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-black mb-4">
                Welcome{user && user.displayName ? ` ${user.displayName.split(' ')[0]}` : ''}!
              </h2>
                                        <p className="text-lg text-gray-600 mb-8">
                            Get started with thinkcompl.ai in three simple steps
                          </p>
              
              {/* 3-Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  {getStepNumber(1)}
                  <h3 className="font-semibold text-gray-900 mb-2">Connect SharePoint</h3>
                  <p className="text-sm text-gray-600 mb-4">Easily access and manage project documents with enterprise-grade security</p>
                  {getStepButton(1)}
                </div>
                
                <div className="text-center">
                  {getStepNumber(2)}
                  <h3 className="font-semibold text-gray-900 mb-2">Setup Team Members</h3>
                  <p className="text-sm text-gray-600 mb-4">Configure project teams and credentials for seamless collaboration</p>
                  {getStepButton(2)}
                </div>
                
                <div className="text-center">
                  {getStepNumber(3)}
                  <h3 className="font-semibold text-gray-900 mb-2">Use AI Capabilities</h3>
                  <p className="text-sm text-gray-600 mb-4">Leverage ThinkComplAI's unique AI to automate QA and compliance needs</p>
                  {getStepButton(3)}
                </div>
              </div>
            </div>
          </div>


        </div>
      </main>
    </div>
  );
} 