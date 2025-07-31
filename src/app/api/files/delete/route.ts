import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

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