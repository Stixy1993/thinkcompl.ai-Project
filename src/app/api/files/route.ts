import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtLaqgd9TGMnFlxXPpkQih_yAtb5xcul8",
  authDomain: "thinkcompl-ai.firebaseapp.com",
  projectId: "thinkcompl-ai",
  storageBucket: "thinkcompl-ai.firebasestorage.app",
  messagingSenderId: "765745911351",
  appId: "1:765745911351:web:20c0f829f4287977ff51b2",
  measurementId: "G-MK14RH5NHN"
};

export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase on server side
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get the current user (you might need to add authentication)
    const userId = 'default-user';

    // Get all files for the current user
    const filesQuery = query(
      collection(db, 'files'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(filesQuery);
    const files = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ files });

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
} 