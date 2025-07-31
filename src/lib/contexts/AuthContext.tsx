"use client";

import React, { createContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  error: null,
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

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: signOutUser, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
