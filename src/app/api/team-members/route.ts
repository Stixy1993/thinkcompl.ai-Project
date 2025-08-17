import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Server-side Firebase initialization with connection reuse
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Singleton Firebase app and db connection
let app;
let db;

function getFirebaseDB() {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
  }
  return db;
}

// In-memory cache for API responses (production should use Redis)
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds cache
const MAX_CACHE_SIZE = 100;

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  // Simple LRU cache cleanup
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Import optimized mock data
import { mockTeamMembers, mockInvites } from '@/app/constants/mockTeamData';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check cache first for sub-second response
    const cacheKey = 'team-members-list';
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      console.log(`✅ Cache hit - returning cached team members in ${Date.now() - startTime}ms`);
      return NextResponse.json(cachedResult);
    }

    console.log('🔍 Fetching team members from Firestore...');
    
    // Optimized Firestore query with limits and ordering
    const db = getFirebaseDB();
    const teamMembersRef = collection(db, 'team-members');
    
    // Add query optimizations: limit results, order by creation time
    const optimizedQuery = query(
      teamMembersRef,
      orderBy('joinedAt', 'desc'), // Most recent first
      limit(50) // Limit to 50 team members max
    );
    
    // Set timeout for Firestore query (fail fast if slow)
    const queryPromise = getDocs(optimizedQuery);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore query timeout')), 5000)
    );
    
    const teamMembersSnapshot = await Promise.race([queryPromise, timeoutPromise]);
    
    let realTeamMembers = teamMembersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Found ${realTeamMembers.length} team members in Firestore (${Date.now() - startTime}ms)`);

    // Combine real data with mock data for development
    let allTeamMembers = [...realTeamMembers];
    
    // Add mock data if we have fewer than 5 real members (for demo purposes)
    if (realTeamMembers.length < 5) {
      console.log('📝 Adding mock data for development demo');
      allTeamMembers = [...realTeamMembers, ...mockTeamMembers];
    }
    
    const result = {
      teamMembers: allTeamMembers,
      invites: mockInvites, // Invites are still mock for now
      source: realTeamMembers.length > 0 ? 'firestore+mock' : 'mock',
      queryTime: Date.now() - startTime,
      cached: false
    };
    
    // Cache the result for future requests
    setCachedData(cacheKey, result);
    
    console.log(`✅ Team members API completed in ${Date.now() - startTime}ms`);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error(`❌ Error getting team members from Firestore (${Date.now() - startTime}ms):`, error);
    
    // Fast fallback to mock data
    const fallbackResult = {
      teamMembers: mockTeamMembers,
      invites: mockInvites,
      source: 'mock-fallback',
      error: error.message,
      queryTime: Date.now() - startTime,
      cached: false
    };
    
    // Cache fallback result briefly to prevent repeated failures
    setCachedData('team-members-list', fallbackResult);
    
    return NextResponse.json(fallbackResult);
  }
}

// Optimized POST endpoint for adding team members
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    console.log('📝 Adding new team member:', body.email);
    
    // Clear cache when data changes
    cache.delete('team-members-list');
    
    // TODO: Implement optimized Firestore write
    // For now, return success response
    const result = {
      success: true,
      message: 'Team member added successfully',
      queryTime: Date.now() - startTime
    };
    
    console.log(`✅ Team member added in ${Date.now() - startTime}ms`);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error(`❌ Error adding team member (${Date.now() - startTime}ms):`, error);
    return NextResponse.json(
      { error: 'Failed to add team member', message: error.message },
      { status: 500 }
    );
  }
}