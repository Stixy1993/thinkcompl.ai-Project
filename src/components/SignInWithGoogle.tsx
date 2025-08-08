"use client";

import { useAuth } from '../lib/hooks/useAuth';

export default function SignInWithGoogle() {
  const { signInWithGoogle } = useAuth();

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center justify-center bg-white text-gray-700 font-medium py-2 px-3 rounded-full border border-gray-300 hover:bg-gray-100 transition duration-300 ease-in-out text-sm whitespace-nowrap"
    >
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-4 h-4 mr-2" />
      Sign in with Google
    </button>
  );
}
