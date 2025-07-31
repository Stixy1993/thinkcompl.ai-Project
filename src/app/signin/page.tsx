"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import SignInWithGoogle from "../../components/SignInWithGoogle";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase/firebase";

export default function SignIn() {
  // Animation timing
  const leftPanelDuration = 0.7;
  const leftPanelDelay = 0.2;
  const titleDelay = leftPanelDelay + leftPanelDuration + 0.1;
  const taglineDelay = titleDelay + 0.2;
  const logoDelay = taglineDelay + 0.2; // Logo appears after the tagline with same timing as title
  const signInDelay = logoDelay + 0.3; // Reduced delay since logo animation is removed

  // Modal state for create account
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterSuccess("");
    setRegisterLoading(true);
    try {
      if (!auth) {
        throw new Error("Firebase auth not initialized");
      }
      await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      setRegisterSuccess("Account created! You can now sign in.");
      setRegisterEmail("");
      setRegisterPassword("");
    } catch (err: any) {
      setRegisterError(err.message);
    }
    setRegisterLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Blue Panel Animation */}
      <motion.div
        className="hidden md:block fixed top-0 left-0 h-full bg-blue-500 text-white z-10"
        initial={{ width: 0 }}
        animate={{ width: "50vw" }}
        transition={{ duration: leftPanelDuration, delay: leftPanelDelay, ease: "easeInOut" }}
      >
        <div className="flex flex-col items-center justify-center h-full px-8">
          <motion.h1
            className="text-7xl font-bold mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleDelay, duration: 0.5 }}
          >
            thinkcompl<span className="text-blue-200">.ai</span>
          </motion.h1>
          <motion.p
            className="text-4xl font-semibold text-blue-100 text-center mb-16 whitespace-nowrap drop-shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: taglineDelay, duration: 0.5 }}
          >
            Built to think. Designed to comply
          </motion.p>
          <motion.div
            className="mt-16 flex justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: logoDelay, duration: 0.5 }}
          >
            {/* Static Logo */}
            <Image 
              src="/Compl.ai Logo sign in.svg" 
              alt="Compl.ai Logo" 
              width={180} 
              height={180} 
            />
          </motion.div>
        </div>
      </motion.div>
      {/* Main Content (Right Panel) */}
      <motion.div
        className="flex min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: signInDelay, duration: 0.6 }}
      >
        {/* Spacer for left panel on desktop */}
        <div className="hidden md:block w-1/2" />
        {/* Right Panel */}
        <section className="flex flex-1 flex-col justify-center items-center bg-gray-50">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">Sign In</h2>
            <p className="text-center text-gray-700 mb-6">Enter your details to access your account</p>
            <form className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  autoComplete="current-password"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-gray-900">
                  <input type="checkbox" className="mr-2 rounded" /> Remember me
                </label>
                <Link href="#" className="text-blue-600 hover:underline text-sm">Forgot password?</Link>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md transition-colors"
              >
                Sign In
              </button>
            </form>
            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-200" />
              <span className="mx-2 text-gray-400 text-sm">or</span>
              <div className="flex-grow h-px bg-gray-200" />
            </div>
            <div className="flex justify-center mb-2">
              <SignInWithGoogle />
            </div>
            <div className="text-center mt-4 text-sm text-gray-900">
              Don&apos;t have an account?{' '}
              <button
                className="text-blue-600 hover:underline focus:outline-none"
                onClick={() => setShowCreateAccount(true)}
                type="button"
              >
                Create Account
              </button>
            </div>
          </div>
          {/* Create Account Modal (with registration form) */}
          {showCreateAccount && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* Blur background */}
              <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative z-10 border border-blue-100"
              >
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setShowCreateAccount(false)}
                  aria-label="Close"
                >
                  ×
                </button>
                {/* Modal Title */}
                <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">thinkcompl<span className="text-blue-300">.ai</span></h1>
                <p className="text-center text-gray-600 mb-2">Create your account below using your email and a secure password.</p>
                <h3 className="text-2xl font-bold mb-4 text-center">Create Account</h3>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-gray-900">Email</label>
                    <input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={e => setRegisterEmail(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="register-password" className="block text-sm font-medium text-gray-900">Password</label>
                    <input
                      id="register-password"
                      type="password"
                      value={registerPassword}
                      onChange={e => setRegisterPassword(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {registerError && <div className="text-red-500 text-sm">{registerError}</div>}
                  {registerSuccess && <div className="text-green-600 text-sm">{registerSuccess}</div>}
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md transition-colors"
                    disabled={registerLoading}
                  >
                    {registerLoading ? "Creating..." : "Create Account"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
          <footer className="mt-8 text-xs text-gray-400 text-center space-y-1">
            <div>© 2025 compl.ai. All rights reserved.</div>
            <div>
              <Link href="#" className="hover:underline">Terms of Service</Link> |{' '}
              <Link href="#" className="hover:underline">Privacy Policy</Link> |{' '}
              <Link href="#" className="hover:underline">Support</Link>
            </div>
          </footer>
        </section>
      </motion.div>
    </div>
  );
} 