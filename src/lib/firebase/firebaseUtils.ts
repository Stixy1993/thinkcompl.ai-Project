import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
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

export const signInWithMicrosoft = async () => {
  if (!auth) throw new Error("Firebase auth not initialized");
  const provider = new OAuthProvider("microsoft.com");
  provider.addScope("openid");
  provider.addScope("email");
  provider.addScope("profile");
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Microsoft", error);
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
  photoURL?: string;
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
  if (!auth) throw new Error("Firebase auth not initialized");
  if (!db) throw new Error("Firebase db not initialized");
  
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Convert Date objects to Firestore Timestamps
  const { serverTimestamp } = await import('firebase/firestore');
  
  const profileWithMetadata = {
    ...profileData,
    uid: user.uid,
    updatedAt: serverTimestamp(),
  };

  try {
    // Use setDoc with merge to create or update the profile
    await setDoc(doc(db, 'userProfiles', user.uid), profileWithMetadata, { merge: true });
    
    // Update cache with new data (use current timestamp for cache)
    profileCache.set(user.uid, {
      data: { ...profileWithMetadata, updatedAt: new Date() },
      timestamp: Date.now()
    });
    
    return { success: true, message: 'Profile saved successfully' };
  } catch (error) {
    console.error('Error saving profile:', error);
    throw new Error('Failed to save profile');
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  if (!auth) throw new Error("Firebase auth not initialized");
  if (!db) throw new Error("Firebase db not initialized");
  
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
  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profileWithMetadata = {
    ...profileData,
    uid: user.uid,
    updatedAt: new Date(),
  };

  if (!db) {
    throw new Error('Firebase database not initialized');
  }
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
  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  if (!db) {
    throw new Error('Firebase database not initialized');
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
  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  if (!db) {
    throw new Error('Firebase database not initialized');
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
  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  if (!db) {
    throw new Error('Firebase database not initialized');
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
  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  if (!db) {
    throw new Error('Firebase database not initialized');
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
  if (!storage) {
    throw new Error('Firebase storage not initialized');
  }
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Chat message storage functions
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: {
    type: 'compliance' | 'technical' | 'general';
    projectId?: string;
    userId?: string;
    currentPage?: string;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  context?: {
    type: 'compliance' | 'technical' | 'general';
    projectId?: string;
    currentPage?: string;
  };
}

// Save chat messages to Firebase
export const saveChatMessages = async (userId: string, messages: ChatMessage[], sessionId?: string): Promise<string> => {
  if (!db) {
    console.warn('Firebase database not initialized - skipping chat save');
    return sessionId || 'temp-session';
  }

  if (!auth) {
    console.warn('Firebase authentication not initialized - skipping chat save');
    return sessionId || 'temp-session';
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('User not authenticated - skipping chat save');
    return sessionId || 'temp-session';
  }

  try {
    // Generate AI summary for the chat
    const summary = await generateChatSummary(messages);
    
    const chatData: Omit<ChatSession, 'id'> = {
      userId: currentUser.uid,
      title: summary,
      messages: messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      context: messages.length > 0 ? messages[0].context : undefined
    };

    if (sessionId) {
      // Update existing session
      const sessionRef = doc(db, 'chatSessions', sessionId);
      await updateDoc(sessionRef, {
        messages: chatData.messages,
        updatedAt: new Date(),
        title: summary
      });
      return sessionId;
    } else {
      // Create new session
      const sessionRef = await addDoc(collection(db, 'chatSessions'), chatData);
      return sessionRef.id;
    }
  } catch (error) {
    console.error('Error saving chat messages:', error);
    // Return a temporary session ID instead of throwing
    return sessionId || 'temp-session';
  }
};

// Load chat messages from Firebase
export const loadChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  if (!db) {
    console.warn('Firebase database not initialized - cannot load chat messages');
    return [];
  }

  if (!auth) {
    console.warn('Firebase authentication not initialized - cannot load chat messages');
    return [];
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('User not authenticated - cannot load chat messages');
    return [];
  }

  try {
    console.log('Loading chat messages for session:', sessionId);
    const sessionRef = doc(db, 'chatSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      console.warn('Chat session not found:', sessionId);
      return [];
    }

    const sessionData = sessionDoc.data() as ChatSession;
    console.log('Session data loaded:', sessionData.messages.length, 'messages');
    
    // Check if the session belongs to the current user
    if (sessionData.userId !== currentUser.uid) {
      console.warn('Access denied to chat session:', sessionId);
      return [];
    }

    const messages = sessionData.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
    }));
    
    console.log('Returning', messages.length, 'messages for session:', sessionId);
    return messages;
  } catch (error) {
    console.error('Error loading chat messages:', error);
    return [];
  }
};

// Get all chat sessions for the current user
export const getChatSessions = async (): Promise<ChatSession[]> => {
  if (!db) {
    console.warn('Firebase database not initialized - cannot load chat sessions');
    return [];
  }

  if (!auth) {
    console.warn('Firebase authentication not initialized - cannot load chat sessions');
    return [];
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('User not authenticated - cannot load chat sessions');
    return [];
  }

  try {
    console.log('Loading chat sessions for user:', currentUser.uid);
    const sessionsQuery = query(
      collection(db, 'chatSessions'),
      where('userId', '==', currentUser.uid),
      // orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(sessionsQuery);
    const sessions: ChatSession[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Handle Firestore Timestamps and convert to Date objects
      const convertTimestamp = (timestamp: any): Date => {
        if (timestamp instanceof Date) {
          return timestamp;
        }
        if (timestamp && typeof timestamp.toDate === 'function') {
          // Firestore Timestamp
          return timestamp.toDate();
        }
        if (timestamp && typeof timestamp === 'string') {
          return new Date(timestamp);
        }
        if (timestamp && typeof timestamp === 'number') {
          return new Date(timestamp);
        }
        // Fallback to current date
        return new Date();
      };

      sessions.push({
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        messages: data.messages.map((msg: any) => ({
          ...msg,
          timestamp: convertTimestamp(msg.timestamp)
        }))
      } as ChatSession);
    });

    // Sort by updatedAt descending
    sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    console.log('Found', sessions.length, 'chat sessions for user:', currentUser.uid);
    return sessions;
  } catch (error) {
    console.error('Error loading chat sessions:', error);
    return [];
  }
};

// Delete a chat session
export const deleteChatSession = async (sessionId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const sessionRef = doc(db, 'chatSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      throw new Error('Chat session not found');
    }

    const sessionData = sessionDoc.data() as ChatSession;
    
    // Check if the session belongs to the current user
    if (sessionData.userId !== currentUser.uid) {
      throw new Error('Access denied to chat session');
    }

    await deleteDoc(sessionRef);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw new Error('Failed to delete chat session');
  }
};

// Generate AI summary for chat session
export const generateChatSummary = async (messages: ChatMessage[]): Promise<string> => {
  try {
    // Filter out system messages and get user messages for context
    const userMessages = messages.filter(msg => msg.role === 'user').slice(0, 3); // Take first 3 user messages
    const assistantMessages = messages.filter(msg => msg.role === 'assistant').slice(0, 2); // Take first 2 assistant messages
    
    if (userMessages.length === 0) {
      return 'New Chat';
    }

    // Create a more sophisticated summary
    let summary = '';
    
    if (userMessages.length === 1) {
      // Single message - use it directly
      summary = userMessages[0].content;
    } else if (userMessages.length === 2) {
      // Two messages - combine them
      summary = `${userMessages[0].content} | ${userMessages[1].content}`;
    } else {
      // Multiple messages - create a topic-based summary
      const topics = userMessages.map(msg => {
        const content = msg.content.toLowerCase();
        if (content.includes('compliance') || content.includes('regulation')) return 'Compliance';
        if (content.includes('technical') || content.includes('code') || content.includes('programming')) return 'Technical';
        if (content.includes('project') || content.includes('management')) return 'Project Management';
        if (content.includes('help') || content.includes('assist')) return 'General Help';
        return 'General Discussion';
      });
      
      const uniqueTopics = Array.from(new Set(topics));
      summary = uniqueTopics.join(' & ');
    }
    
    // Truncate if too long
    if (summary.length > 50) {
      summary = summary.slice(0, 47) + '...';
    }
    
    return summary || 'New Chat';
  } catch (error) {
    console.error('Error generating chat summary:', error);
    return 'New Chat';
  }
};

// Update chat session with AI-generated summary
export const updateChatSessionSummary = async (sessionId: string, messages: ChatMessage[]): Promise<void> => {
  if (!db) {
    console.warn('Firebase database not initialized - cannot update session summary');
    return;
  }

  if (!auth) {
    console.warn('Firebase authentication not initialized - cannot update session summary');
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('User not authenticated - cannot update session summary');
    return;
  }

  try {
    const summary = await generateChatSummary(messages);
    const sessionRef = doc(db, 'chatSessions', sessionId);
    await updateDoc(sessionRef, {
      title: summary,
      updatedAt: new Date()
    });
    console.log('Session summary updated:', summary);
  } catch (error) {
    console.error('Error updating session summary:', error);
  }
};

// Team Member interfaces and functions
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
  status: 'pending' | 'active' | 'declined';
  company?: string;
  phone?: string;
  department?: string;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Get all team members
export const getTeamMembers = async (): Promise<TeamMember[]> => {
  if (!db) throw new Error("Firebase db not initialized");
  if (!auth?.currentUser) throw new Error("User not authenticated");

  try {
    const teamMembersRef = collection(db, 'teamMembers');
    const q = query(teamMembersRef, where('invitedBy', '==', auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      invitedAt: doc.data().invitedAt?.toDate(),
      joinedAt: doc.data().joinedAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TeamMember[];
  } catch (error) {
    console.error('Error getting team members:', error);
    throw new Error('Failed to get team members');
  }
};

// Invite a team member
export const inviteTeamMember = async (email: string, role: 'admin' | 'manager' | 'member', invitedBy: string): Promise<void> => {
  if (!db) throw new Error("Firebase db not initialized");

  try {
    const teamMemberData: Omit<TeamMember, 'id'> = {
      email,
      name: email.split('@')[0], // Use email prefix as name initially
      role,
      status: 'pending',
      invitedBy,
      invitedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await addDoc(collection(db, 'teamMembers'), teamMemberData);
  } catch (error) {
    console.error('Error inviting team member:', error);
    throw new Error('Failed to invite team member');
  }
};

// Accept a team member invitation
export const acceptTeamMember = async (memberId: string): Promise<void> => {
  if (!db) throw new Error("Firebase db not initialized");

  try {
    const memberRef = doc(db, 'teamMembers', memberId);
    await updateDoc(memberRef, {
      status: 'active',
      joinedAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error accepting team member:', error);
    throw new Error('Failed to accept team member');
  }
};

// Decline a team member invitation
export const declineTeamMember = async (memberId: string): Promise<void> => {
  if (!db) throw new Error("Firebase db not initialized");

  try {
    const memberRef = doc(db, 'teamMembers', memberId);
    await updateDoc(memberRef, {
      status: 'declined',
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error declining team member:', error);
    throw new Error('Failed to decline team member');
  }
};

// Delete a team member
export const deleteTeamMember = async (memberId: string): Promise<void> => {
  if (!db) throw new Error("Firebase db not initialized");

  try {
    const memberRef = doc(db, 'teamMembers', memberId);
    await deleteDoc(memberRef);
  } catch (error) {
    console.error('Error deleting team member:', error);
    throw new Error('Failed to delete team member');
  }
};
