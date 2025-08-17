"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HiUserGroup, HiCheckCircle, HiX, HiMail } from 'react-icons/hi';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);

  const invitationId = searchParams.get('invitationId');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!invitationId || !email) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // TODO: Validate the invitation with the backend
    // For now, we'll simulate the validation
    setTimeout(() => {
      setInvitation({
        id: invitationId,
        email,
        role: 'technician', // This would come from the backend
        status: 'invited'
      });
      setLoading(false);
    }, 1000);
  }, [invitationId, email]);

  const handleAcceptInvitation = async () => {
    try {
      setLoading(true);
      
      // TODO: Call backend to accept the invitation
      const response = await fetch('/api/team-members/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvitation = async () => {
    try {
      setLoading(true);
      
      // TODO: Call backend to decline the invitation
      const response = await fetch('/api/team-members/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to decline invitation');
      }

      setError('Invitation declined');
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (error) {
      console.error('Error declining invitation:', error);
      setError('Failed to decline invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-400 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading invitation...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-blue-400 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <HiX className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
            Invitation Error
          </h1>
          <p className="text-center text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-blue-400 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <HiCheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
            Welcome to thinkcompl.ai!
          </h1>
          <p className="text-center text-gray-600 mb-6">
            You have successfully accepted the invitation and joined the team.
          </p>
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 inline-block"></div>
            <span className="ml-2 text-gray-600">Redirecting to dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-400 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-center mb-6">
          <HiUserGroup className="w-12 h-12 text-blue-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
          Team Invitation
        </h1>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <HiMail className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Invitation Details</span>
          </div>
          <p className="text-gray-600 text-sm">
            <strong>Email:</strong> {email}
          </p>
          <p className="text-gray-600 text-sm">
            <strong>Role:</strong> {invitation?.role ? invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1) : 'Unknown'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAcceptInvitation}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Accepting...
              </>
            ) : (
              <>
                <HiCheckCircle className="w-4 h-4 mr-2" />
                Accept Invitation
              </>
            )}
          </button>
          
          <button
            onClick={handleDeclineInvitation}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <HiX className="w-4 h-4 mr-2" />
            Decline Invitation
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          By accepting this invitation, you agree to join the team and will be granted access to the platform.
        </p>
      </motion.div>
    </div>
  );
} 