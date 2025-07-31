import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  where,
  enableNetwork,
  disableNetwork,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Enable offline persistence for better performance
let persistenceEnabled = false;
export const enableFirebasePersistence = async () => {
  if (!persistenceEnabled && db) {
    try {
      await enableIndexedDbPersistence(db);
      persistenceEnabled = true;
      console.log('Firebase offline persistence enabled');
    } catch (error) {
      console.warn('Firebase persistence already enabled or failed:', error);
    }
  }
};

// Cache for user profiles
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Auth functions
export const logoutUser = () => {
  if (!auth) throw new Error("Firebase auth not initialized");
  return signOut(auth);
};

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase auth not initialized");
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) => {
  if (!db) throw new Error("Firebase db not initialized");
  return addDoc(collection(db, collectionName), data);
};

export const getDocuments = async (collectionName: string) => {
  if (!db) throw new Error("Firebase db not initialized");
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) => {
  if (!db) throw new Error("Firebase db not initialized");
  return updateDoc(doc(db, collectionName, id), data);
};

export const deleteDocument = (collectionName: string, id: string) => {
  if (!db) throw new Error("Firebase db not initialized");
  return deleteDoc(doc(db, collectionName, id));
};

// Profile-specific functions
export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  employeeId: string;
  address: string;
  company: string;
  department: string;
  position: string;
  startDate: string;
  startDateNotSpecified: boolean;
  emergencyContact: string;
  emergencyPhone: string;
  licenses: License[];
  certifications: License[];
  updatedAt: Date;
}

export interface License {
  id: string;
  name: string;
  number: string;
  class: string;
  issuedDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: 'valid' | 'expired' | 'expiring-soon';
  notes: string;
  issuedDateNotSpecified?: boolean;
  expiryDateNotSpecified?: boolean;
}

export interface Equipment {
  id: string;
  equipmentType: string;
  manufacturer: string;
  serialNumber: string;
  calibrationTestDate: string;
  calibrationReTestDate: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export const saveUserProfile = async (profileData: Omit<UserProfile, 'uid' | 'updatedAt'>) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileWithMetadata = {
    ...profileData,
    uid: user.uid,
    updatedAt: new Date(),
  };

  try {
    // Use setDoc with merge to create or update the profile
    await setDoc(doc(db, 'userProfiles', user.uid), profileWithMetadata, { merge: true });
    
    // Update cache with new data
    profileCache.set(user.uid, {
      data: profileWithMetadata,
      timestamp: Date.now()
    });
    
    return { success: true, message: 'Profile saved successfully' };
  } catch (error) {
    console.error('Error saving profile:', error);
    throw new Error('Failed to save profile');
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  // Check cache first
  const cached = profileCache.get(user.uid);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached profile data');
    return cached.data as UserProfile;
  }

  try {
    const docRef = doc(db, 'userProfiles', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const profileData = docSnap.data() as UserProfile;
      // Cache the result
      profileCache.set(user.uid, {
        data: profileData,
        timestamp: Date.now()
      });
      return profileData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting profile:', error);
    throw new Error('Failed to get profile');
  }
};

export const createOrUpdateProfile = async (profileData: Partial<UserProfile>) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileWithMetadata = {
    ...profileData,
    uid: user.uid,
    updatedAt: new Date(),
  };

  try {
    await setDoc(doc(db, 'userProfiles', user.uid), profileWithMetadata, { merge: true });
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
};

// Equipment functions
export const saveEquipment = async (equipmentData: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const equipmentWithMetadata = {
    ...equipmentData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const docRef = await addDoc(collection(db, 'equipment'), equipmentWithMetadata);
    return { success: true, message: 'Equipment saved successfully', id: docRef.id };
  } catch (error) {
    console.error('Error saving equipment:', error);
    throw new Error('Failed to save equipment');
  }
};

export const getEquipment = async (): Promise<Equipment[]> => {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'equipment'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Equipment[];
  } catch (error) {
    console.error('Error getting equipment:', error);
    throw new Error('Failed to get equipment');
  }
};

export const updateEquipment = async (id: string, equipmentData: Partial<Equipment>) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const equipmentWithMetadata = {
    ...equipmentData,
    updatedAt: new Date(),
  };

  try {
    await updateDoc(doc(db, 'equipment', id), equipmentWithMetadata);
    return { success: true, message: 'Equipment updated successfully' };
  } catch (error) {
    console.error('Error updating equipment:', error);
    throw new Error('Failed to update equipment');
  }
};

export const deleteEquipment = async (id: string) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    await deleteDoc(doc(db, 'equipment', id));
    return { success: true, message: 'Equipment deleted successfully' };
  } catch (error) {
    console.error('Error deleting equipment:', error);
    throw new Error('Failed to delete equipment');
  }
};

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
