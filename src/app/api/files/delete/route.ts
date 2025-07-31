import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

export async function DELETE(request: NextRequest) {
  try {
    const { fileName, path } = await request.json();

    // Initialize Firebase on server side
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get the current user (you might need to add authentication)
    const userId = 'default-user';

    // Find the file document to delete
    const filesQuery = query(
      collection(db, 'files'),
      where('userId', '==', userId),
      where('name', '==', fileName)
    );

    const querySnapshot = await getDocs(filesQuery);
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete the file document
    const fileDoc = querySnapshot.docs[0];
    await deleteDoc(fileDoc.ref);

    return NextResponse.json({ 
      success: true, 
      message: `File ${fileName} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
} 