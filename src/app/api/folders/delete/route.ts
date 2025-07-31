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
    const { folderName, path } = await request.json();

    // Initialize Firebase on server side
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get the current user (you might need to add authentication)
    const userId = 'default-user';

    // Find all files that are in the folder to be deleted
    const filesQuery = query(
      collection(db, 'files'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(filesQuery);
    let deletedCount = 0;
    
    // Delete all files that are in the specified folder
    for (const doc of querySnapshot.docs) {
      const fileData = doc.data();
      const filePath = fileData.path || fileData.name;
      
      // Check if the file is in the folder to be deleted
      if (filePath.startsWith(folderName + '/')) {
        await deleteDoc(doc.ref);
        deletedCount++;
        console.log(`Deleted file: ${fileData.name} from folder: ${folderName}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Folder ${folderName} and ${deletedCount} files deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
} 