"use client";

import React, { createContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithOutlook: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithOutlook: async () => {},
  signOut: async () => {},
  error: null,
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
        setUser(user);
        setLoading(false);
        setError(null);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
      setError("Firebase authentication is not configured.");
    }
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    
    if (!auth) {
      setError("Firebase authentication is not configured.");
      return;
    }

    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  const signInWithOutlook = async () => {
    setError(null);
    console.log("Starting Microsoft sign-in process...");
    console.log("Auth object status:", !!auth);
    
    if (!auth) {
      console.error("No auth object available!");
      setError("Firebase authentication is not configured.");
      return;
    }

    try {
      console.log("Importing auth providers...");
      const { signInWithPopup, OAuthProvider } = await import("firebase/auth");
      console.log("Creating Microsoft provider...");
      const provider = new OAuthProvider("microsoft.com");
      provider.addScope("openid");
      provider.addScope("email");
      provider.addScope("profile");
      
      console.log("Provider configured with scopes:", provider);
      console.log("Attempting Microsoft sign-in popup...");
      
      const result = await signInWithPopup(auth, provider);
      console.log("Sign-in successful!", result);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Detailed Microsoft sign-in error:", {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      // More specific error messages
      if (error.code === 'auth/operation-not-allowed') {
        console.error("Provider not enabled in Firebase Console or configuration issue");
        setError("Microsoft sign-in is not enabled. Please enable it in Firebase Console.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError("Sign-in was cancelled. Please try again.");
      } else if (error.code === 'auth/popup-blocked') {
        setError("Pop-up was blocked by browser. Please allow pop-ups and try again.");
      } else {
        setError(`Failed to sign in with Microsoft: ${error.message}`);
      }
    }
  };

  const signOutUser = async () => {
    setError(null);
    
    if (!auth) {
      setUser(null);
      router.push("/");
      return;
    }

    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithOutlook, signOut: signOutUser, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
