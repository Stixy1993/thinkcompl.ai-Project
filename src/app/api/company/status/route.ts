import { NextRequest, NextResponse } from 'next/server';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Use the same Firebase config as the client
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    // Check if any company profile exists in Firestore
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, limit(1));
    const querySnapshot = await getDocs(q);
    
    return NextResponse.json({
      configured: !querySnapshot.empty,
      step: querySnapshot.empty ? 'company_setup' : 'microsoft_setup'
    });
  } catch (error) {
    console.error('Error checking company status:', error);
    return NextResponse.json(
      { error: 'Failed to check company status' },
      { status: 500 }
    );
  }
}