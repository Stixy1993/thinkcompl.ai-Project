import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration - require environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only on client side
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined') {
  try {
    // Check if we have all required environment variables
    if (firebaseConfig.apiKey && 
        firebaseConfig.authDomain && 
        firebaseConfig.projectId &&
        firebaseConfig.storageBucket &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId) {
      
      console.log("Initializing Firebase with config:", {
        hasApiKey: !!firebaseConfig.apiKey,
        hasAuthDomain: !!firebaseConfig.authDomain,
        hasProjectId: !!firebaseConfig.projectId,
        domain: firebaseConfig.authDomain
      });
      
      // Initialize Firebase
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized");

      // Initialize Firebase services
      auth = getAuth(app);
      console.log("Firebase auth initialized");
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
      console.warn("Firebase not initialized - missing environment variables");
      console.warn("Please create a .env.local file with your Firebase configuration");
      console.warn("Missing variables:", {
        apiKey: !!firebaseConfig.apiKey,
        authDomain: !!firebaseConfig.authDomain,
        projectId: !!firebaseConfig.projectId,
        storageBucket: !!firebaseConfig.storageBucket,
        messagingSenderId: !!firebaseConfig.messagingSenderId,
        appId: !!firebaseConfig.appId
      });
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.log("Firebase initialization skipped - not in browser environment");
}

export { auth, db, storage };
export default app;
