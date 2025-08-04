import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration - handle both environment variables and JavaScript object format
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD5QNpXW7xt0M_-z4i9gZ-u8GWPCj4l004",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "thinkcomplai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "thinkcomplai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "thinkcomplai.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "459091731458",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:459091731458:web:29ee7bcc661bbf5795b31b"
};

// Initialize Firebase only on client side
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined') {
  try {
    // Check if we have a real API key (not placeholder)
    if (firebaseConfig.apiKey && 
        firebaseConfig.apiKey !== "placeholder" && 
        firebaseConfig.authDomain && 
        firebaseConfig.authDomain !== "placeholder") {
      
      // Initialize Firebase
      app = initializeApp(firebaseConfig);

      // Initialize Firebase services
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      
      // Set Firestore settings for better debugging
      if (process.env.NODE_ENV === 'development') {
        console.log("Firebase initialized in development mode");
      }

      console.log("Firebase initialized successfully");

      // Temporarily disable offline persistence to debug 400 errors
      // import('./firebaseUtils').then(({ enableFirebasePersistence }) => {
      //   enableFirebasePersistence();
      // });
    } else {
      console.log("Firebase not initialized - missing proper configuration");
    }
  } catch (error) {
    console.log("Firebase initialization failed:", error);
  }
}

export { auth, db, storage };
export default app;
