import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase configuration should be loaded from environment variables
// This is a placeholder - in production, use environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder"
};

export async function POST(request: NextRequest) {
  try {
    const { fileName, chunkIndex, totalChunks, chunkData, fileData } = await request.json();
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const userId = 'default-user';
    
    // SharePoint approach: Store chunks separately and track progress
    const chunkKey = `${userId}_${fileName}_chunk_${chunkIndex}`;
    const progressKey = `${userId}_${fileName}_progress`;
    
    // Store this chunk
    await setDoc(doc(db, 'fileChunks', chunkKey), {
      userId,
      fileName,
      chunkIndex,
      totalChunks,
      chunkData: chunkData, // In real implementation, this would be stored in Firebase Storage
      timestamp: new Date()
    });
    
    // Update progress
    const progressRef = doc(db, 'uploadProgress', progressKey);
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      const currentProgress = progressDoc.data();
      const newProgress = {
        ...currentProgress,
        completedChunks: [...(currentProgress.completedChunks || []), chunkIndex],
        lastUpdated: new Date()
      };
      await setDoc(progressRef, newProgress);
    } else {
      await setDoc(progressRef, {
        userId,
        fileName,
        totalChunks,
        completedChunks: [chunkIndex],
        fileData,
        startedAt: new Date(),
        lastUpdated: new Date()
      });
    }
    
    // If this is the last chunk, assemble the file
    if (chunkIndex === totalChunks - 1) {
      // In real implementation, you'd fetch all chunks and assemble
      // For now, we'll just mark the file as complete
      await addDoc(collection(db, 'files'), {
        userId,
        name: fileName,
        size: fileData.size,
        type: fileData.type,
        path: fileData.path,
        uploadedAt: new Date(),
        status: 'completed'
      });
      
      // Clean up progress tracking
      await setDoc(doc(db, 'uploadProgress', progressKey), { deleted: true });
    }
    
    return NextResponse.json({ 
      success: true, 
      chunkIndex,
      totalChunks,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`
    });
    
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json({ error: 'Failed to upload chunk' }, { status: 500 });
  }
} 