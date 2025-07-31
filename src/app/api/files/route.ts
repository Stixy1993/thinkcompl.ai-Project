import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAEsnbrP7qIoc8ym0KvqI0Z39aJyxP36FE",
  authDomain: "thinkcompl-ai-project.firebaseapp.com",
  projectId: "thinkcompl-ai-project",
  storageBucket: "thinkcompl-ai-project.firebasestorage.app",
  messagingSenderId: "116350304865",
  appId: "1:116350304865:web:f833918de1511ef4cd2020",
  measurementId: "G-549RCCFSQB"
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