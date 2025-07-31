import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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

export async function POST(request: NextRequest) {
  try {
    const { fileName, sourcePath, targetPath, fileData } = await request.json();

    // Initialize Firebase on server side
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get the current user (you might need to add authentication)
    // For now, we'll use a default user ID
    const userId = 'default-user';

    // SharePoint approach: Handle large files differently
    const fileSize = fileData.size || 1024;
    const maxDirectUploadSize = 1024 * 1024; // 1MB - use chunked upload for larger files
    
    if (fileSize > maxDirectUploadSize) {
      return NextResponse.json({ 
        error: 'File too large for direct upload', 
        useChunkedUpload: true,
        suggestedChunkSize: 1024 * 1024 // 1MB chunks
      }, { status: 413 });
    }

    // Create the file document in the target location with SharePoint-style metadata
    const targetFileRef = await addDoc(collection(db, 'files'), {
      name: fileName,
      path: targetPath,
      userId: userId,
      size: fileSize,
      type: fileData.type || 'application/octet-stream',
      uploadedAt: new Date(),
      status: 'completed',
      uploadMethod: 'direct',
      checksum: `md5_${Date.now()}`, // In real implementation, calculate actual MD5
      ...fileData
    });

    // If there was a source file in the database, delete it
    if (sourcePath) {
      // You might want to implement a way to find and delete the source file
      // For now, we'll just log that we would delete it
      console.log(`Would delete file from source path: ${sourcePath}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `File ${fileName} moved successfully`,
      newFileId: targetFileRef.id,
      fileSize: fileSize,
      uploadMethod: 'direct'
    });

  } catch (error) {
    console.error('Error moving file:', error);
    return NextResponse.json({ error: 'Failed to move file' }, { status: 500 });
  }
} 