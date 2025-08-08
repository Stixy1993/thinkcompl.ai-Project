"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('technician');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/team-members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role,
          message
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Email Testing</h1>
          
          <form onSubmit={handleTestEmail} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="test@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="technician">Technician</option>
                <option value="engineer">Engineer</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add a personal message to your invitation..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing Email...' : 'Test Email Invitation'}
            </button>
          </form>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-lg ${
                result.error 
                  ? 'bg-red-50 border border-red-200 text-red-800' 
                  : 'bg-green-50 border border-green-200 text-green-800'
              }`}
            >
              <h3 className="font-semibold mb-2">
                {result.error ? 'Error' : 'Success'}
              </h3>
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {result.developmentMode && result.emailDetails && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Development Mode Details:</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>To:</strong> {result.emailDetails.to}</p>
                    <p><strong>Role:</strong> {result.emailDetails.role}</p>
                    <p><strong>Message:</strong> {result.emailDetails.message}</p>
                    <p><strong>Invitation Link:</strong> <a href={result.emailDetails.invitationLink} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{result.emailDetails.invitationLink}</a></p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Development Mode</h3>
            <p className="text-sm text-yellow-700">
              In development mode, emails are logged to the console instead of being sent. 
              Check your browser&apos;s developer console to see the email details.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
