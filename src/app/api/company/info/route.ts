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

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching company info from Firestore...');
    
    // Get the most recent company profile for display purposes
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, orderBy('updatedAt', 'desc'), limit(1));
    
    // Add timeout to prevent hanging
    const querySnapshot = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore query timeout')), 8000)
      )
    ]) as any;
    
    if (!querySnapshot.empty) {
      const companyData = querySnapshot.docs[0].data();
      
      // Return relevant company info for team display
      return NextResponse.json({
        success: true,
        company: {
          name: companyData.name,
          logoUrl: companyData.logoUrl,
          industry: companyData.industry,
          size: companyData.size,
          address: companyData.address,
          foundedYear: companyData.foundedYear,
          website: companyData.website
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No company profile found'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error getting company info:', error);
    
    // Return fallback company data to prevent UI breaking
    return NextResponse.json({
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
      error: 'Using fallback data due to Firestore connection issue'
    });
  }
}