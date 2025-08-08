"use client";

import { useAuth } from '../lib/hooks/useAuth';

export default function SignInWithOutlook() {
  const { signInWithOutlook } = useAuth();

  return (
    <button
      onClick={signInWithOutlook}
      className="flex items-center justify-center bg-white text-gray-700 font-medium py-2 px-3 rounded-full border border-gray-300 hover:bg-gray-100 transition duration-300 ease-in-out text-sm whitespace-nowrap"
    >
      <svg 
        className="w-4 h-4 mr-2" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="3" y="3" width="8" height="8" fill="#F25022"/>
        <rect x="13" y="3" width="8" height="8" fill="#7FBA00"/>
        <rect x="3" y="13" width="8" height="8" fill="#00A4EF"/>
        <rect x="13" y="13" width="8" height="8" fill="#FFB900"/>
      </svg>
      Sign in with Outlook
    </button>
  );
}
