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