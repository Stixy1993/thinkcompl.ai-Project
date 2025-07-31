import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtLaqgd9TGMnFlxXPpkQih_yAtb5xcul8",
  authDomain: "thinkcompl-ai.firebaseapp.com",
  projectId: "thinkcompl-ai",
  storageBucket: "thinkcompl-ai-project.firebasestorage.app",
  messagingSenderId: "765745911351",
  appId: "1:765745911351:web:20c0f829f4287977ff51b2",
  measurementId: "G-MK14RH5NHN"
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

      console.log("Firebase initialized successfully");

      // Enable offline persistence for better performance
      import('./firebaseUtils').then(({ enableFirebasePersistence }) => {
        enableFirebasePersistence();
      });
    } else {
      console.log("Firebase not initialized - missing proper configuration");
    }
  } catch (error) {
    console.log("Firebase initialization failed:", error);
  }
}

export { auth, db, storage };
export default app;
