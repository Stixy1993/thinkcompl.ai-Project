"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../lib/hooks/useAuth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase/firebase";

export default function TestSimplePage() {
  const { user } = useAuth();
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<string>("Checking...");
  
  // Check DB status on client side only
  useEffect(() => {
    setDbStatus(db ? 'Initialized' : 'Not initialized');
  }, [db]);

  const testWrite = async () => {
    setLoading(true);
    setResult("Testing...");
    
    try {
      if (!user) {
        throw new Error("No user");
      }
      
      if (!db) {
        throw new Error("No database");
      }
      
      console.log("Attempting write...");
      await setDoc(doc(db, 'simple-test', user.uid), {
        test: true,
        timestamp: new Date(),
        user: user.email
      });
      
      setResult("SUCCESS! Document written.");
    } catch (error) {
      console.error("Write error:", error);
      setResult(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Firebase Test</h1>
      
      <button 
        onClick={testWrite}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Write"}
      </button>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold">Result:</h3>
        <pre className="mt-2 text-sm">{result}</pre>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-100 rounded">
        <h3 className="font-bold">Debug:</h3>
        <p>User: {user ? user.email : 'None'}</p>
        <p>DB: {dbStatus}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
} 