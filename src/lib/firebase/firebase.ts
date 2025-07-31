import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

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
