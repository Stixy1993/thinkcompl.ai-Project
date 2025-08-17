'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestReset() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<any>(null);
  const router = useRouter();

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all company data? This will:\n\n✅ Delete company profiles\n✅ Delete setup-created team members\n✅ Keep mock team members for demo\n\nThis action cannot be undone!')) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch('/api/company/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      setResetResult(result);

      if (response.ok) {
        alert('Company data reset successfully! You can now test the auth workflow from scratch.');
      } else {
        alert(`Reset failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Reset error:', error);
      alert('Reset failed. Check console for details.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🔧 Company Data Reset
          </h1>
          <p className="text-gray-600 mb-6">
            Reset company data to test the new auth workflow from scratch while keeping demo team members.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isResetting ? 'Resetting...' : '🗑️ Reset Company Data'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              📊 Back to Dashboard
            </button>
          </div>

          {resetResult && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Reset Results:</h3>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(resetResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p className="font-semibold mb-2">What this does:</p>
            <ul className="text-left space-y-1">
              <li>✅ Deletes company profiles from Firestore</li>
              <li>✅ Deletes setup-created admin users</li>
              <li>✅ Keeps mock team members for demo</li>
              <li>✅ Allows testing auth workflow fresh</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}