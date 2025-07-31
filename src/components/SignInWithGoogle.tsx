"use client";

import { useAuth } from '../lib/hooks/useAuth';

export default function SignInWithGoogle() {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div className="space-y-3">
      <button
        onClick={signInWithGoogle}
        className="flex items-center justify-center bg-white text-gray-700 font-semibold py-2 px-4 rounded-full border border-gray-300 hover:bg-gray-100 transition duration-300 ease-in-out"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-6 h-6 mr-2" />
        Sign in with Google
      </button>
      
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}
