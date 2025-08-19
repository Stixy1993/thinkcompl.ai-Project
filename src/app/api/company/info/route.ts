import { NextRequest, NextResponse } from 'next/server';
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Use the same Firebase config as the client
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Singleton Firebase connection (reuse across requests)
let app: any;
let db: any;

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

// In-memory cache for company info
const companyCache = new Map();
const CACHE_TTL = 600000; // 10 minutes cache for company info (changes less frequently)

function getCachedCompanyData(key: string) {
  const cached = companyCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedCompanyData(key: string, data: any) {
  companyCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const cacheKey = 'company-info';
  
  try {
    // Check cache first for instant response
    const cachedResult = getCachedCompanyData(cacheKey);
    if (cachedResult) {
      console.log(`✅ Company info cache hit in ${Date.now() - startTime}ms`);
      return NextResponse.json(cachedResult);
    }

    console.log('🔍 Fetching company info from Firestore...');
    
    // Get the most recent company profile for display purposes
    const db = getFirebaseDB();
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, orderBy('updatedAt', 'desc'), limit(1));
    
    // Reduced timeout for faster fail-over
    const querySnapshot = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore query timeout')), 3000)
      )
    ]) as any;
    
    if (!querySnapshot.empty) {
      const companyData = querySnapshot.docs[0].data();
      
      const result = {
        success: true,
        company: {
          name: companyData.name,
          logoUrl: companyData.logoUrl,
          industry: companyData.industry,
          size: companyData.size,
          address: companyData.address,
          foundedYear: companyData.foundedYear,
          website: companyData.website
        },
        queryTime: Date.now() - startTime,
        cached: false
      };
      
      // Cache the successful result
      setCachedCompanyData(cacheKey, result);
      
      console.log(`✅ Company info fetched in ${Date.now() - startTime}ms`);
      return NextResponse.json(result);
    } else {
      const notFoundResult = {
        success: false,
        message: 'No company profile found',
        queryTime: Date.now() - startTime
      };
      
      console.log(`⚠️ No company profile found (${Date.now() - startTime}ms)`);
      return NextResponse.json(notFoundResult, { status: 404 });
    }
  } catch (error) {
    console.error(`❌ Error getting company info (${Date.now() - startTime}ms):`, error);
    
    // Return fallback company data to prevent UI breaking
    const fallbackResult = {
      success: true,
      company: {
        name: 'Bright Spark Construction',
        logoUrl: null,
        industry: 'Construction',
        size: '1-10 employees',
        address: {
          street: '10 Terragon Road',
          city: 'Mount Archer',
          state: 'QLD',
          zipCode: '4514',
          country: 'Australia'
        },
        foundedYear: '2021',
        website: 'www.BSC.com'
      },
      fallback: true,
      error: 'Using fallback data due to Firestore connection issue',
      queryTime: Date.now() - startTime
    };
    
    // Cache fallback data briefly to prevent repeated errors
    setCachedCompanyData(cacheKey, fallbackResult);
    
    return NextResponse.json(fallbackResult);
  }
}