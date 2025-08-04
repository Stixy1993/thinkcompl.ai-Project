"use client";

import { useState } from "react";
import { useAuth } from "../../lib/hooks/useAuth";
import { saveUserProfile, getUserProfile } from "../../lib/firebase/firebaseUtils";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase/firebase";

export default function TestFirebasePage() {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testAuth = () => {
    console.log("Testing auth, user:", user);
    setTestResult(`User: ${user ? user.email : 'Not signed in'}`);
  };

  const testAuthToken = async () => {
    console.log("Testing auth token...");
    setIsLoading(true);
    setTestResult("Testing auth token...");
    
    try {
      if (!user) {
        throw new Error("No user authenticated");
      }
      
             const token = await user.getIdToken();
       console.log("Auth token:", token.substring(0, 50) + "...");
       setTestResult(`Auth token obtained: ${token.substring(0, 50)}...`);
       
       // Try to get a token with specific scopes
       try {
         const tokenWithScopes = await user.getIdToken(true); // Force refresh
         console.log("Token with scopes:", tokenWithScopes.substring(0, 100) + "...");
         setTestResult(`Auth token obtained: ${token.substring(0, 50)}...\n\nToken with scopes: ${tokenWithScopes.substring(0, 100)}...`);
       } catch (scopeError) {
         console.error("Scope error:", scopeError);
         setTestResult(`Auth token obtained: ${token.substring(0, 50)}...\n\nScope error: ${scopeError instanceof Error ? scopeError.message : String(scopeError)}`);
       }
    } catch (error) {
      console.error("Auth token error:", error);
      setTestResult(`Auth token error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

       const testRestAPI = async () => {
    console.log("Testing REST API...");
    setIsLoading(true);
    setTestResult("Testing REST API...");
    
    try {
      if (!user) {
        throw new Error("No user authenticated");
      }
      
      const token = await user.getIdToken();
      
      // First, let's check if the database exists
      console.log("Checking if database exists...");
      const dbCheckResponse = await fetch(`https://firestore.googleapis.com/v1/projects/thinkcompl-ai-project/databases`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (dbCheckResponse.ok) {
        const dbList = await dbCheckResponse.json();
        console.log("Available databases:", dbList);
        setTestResult(`Available databases: ${JSON.stringify(dbList)}`);
        return;
      } else {
        const errorText = await dbCheckResponse.text();
        console.log("Database check error:", errorText);
        setTestResult(`Database check error: ${dbCheckResponse.status} - ${errorText}`);
        return;
      }
    } catch (error) {
      console.error("REST API error:", error);
      setTestResult(`REST API error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAddDoc = async () => {
    console.log("Testing addDoc...");
    setIsLoading(true);
    setTestResult("Testing addDoc...");
    
    try {
      if (!user) {
        throw new Error("No user authenticated");
      }
      
      if (!db) {
        throw new Error("Firebase db not initialized");
      }
      
      console.log("Using addDoc to write document...");
      const docRef = await addDoc(collection(db, 'test'), {
        test: true,
        timestamp: new Date(),
        userEmail: user.email
      });
      
      setTestResult(`addDoc SUCCESS! Document ID: ${docRef.id}`);
    } catch (error) {
      console.error("addDoc error:", error);
      setTestResult(`addDoc error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSimpleWrite = async () => {
    console.log("Testing simple write...");
    setIsLoading(true);
    setTestResult("Testing simple write...");
    
    try {
      if (!user) {
        throw new Error("No user authenticated");
      }
      
      if (!db) {
        throw new Error("Firebase db not initialized");
      }
      
      console.log("Writing simple document...");
      await setDoc(doc(db, 'test', user.uid), {
        test: true,
        timestamp: new Date(),
        userEmail: user.email
      });
      
      setTestResult("Simple write SUCCESS!");
    } catch (error) {
      console.error("Simple write error:", error);
      setTestResult(`Simple write error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFirestore = async () => {
    console.log("Starting Firestore test...");
    setIsLoading(true);
    setTestResult("Starting test...");
    
    try {
      console.log("User before save:", user);
      
      if (!user) {
        throw new Error("No user authenticated");
      }
      
      console.log("Calling saveUserProfile...");
      const result = await saveUserProfile({
        fullName: "Test User",
        email: "test@example.com",
        phone: "123-456-7890",
        employeeId: "TEST001",
        address: "Test Address",
        company: "Test Company",
        department: "Test Dept",
        position: "Test Position",
        startDate: "01/01/2024",
        startDateNotSpecified: false,
        emergencyContact: "Test Contact",
        emergencyPhone: "123-456-7890",
        licenses: [],
        certifications: []
      });
      
      console.log("Save result:", result);
      setTestResult(`Firestore test SUCCESS: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error("Firestore test error:", error);
      setTestResult(`Firestore error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log("Test completed");
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Test Page</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testAuth}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Authentication
        </button>
        
        <button 
          onClick={testAuthToken}
          disabled={isLoading}
          className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Test Auth Token"}
        </button>
        
        <button 
          onClick={testRestAPI}
          disabled={isLoading}
          className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Test REST API"}
        </button>
        
        <button 
          onClick={testAddDoc}
          disabled={isLoading}
          className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Test addDoc"}
        </button>
        
        <button 
          onClick={testSimpleWrite}
          disabled={isLoading}
          className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Test Simple Write"}
        </button>
        
        <button 
          onClick={testFirestore}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Test Firestore"}
        </button>
        
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Test Result:</h3>
          <pre className="mt-2 text-sm">{testResult}</pre>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-100 rounded">
          <h3 className="font-bold">Debug Info:</h3>
          <p>User: {user ? user.email : 'Not signed in'}</p>
          <p>User ID: {user ? user.uid : 'None'}</p>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
} 