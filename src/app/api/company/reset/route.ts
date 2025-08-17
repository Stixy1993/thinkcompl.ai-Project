import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Server-side Firebase initialization
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

export async function POST(request: NextRequest) {
  try {
    console.log('Starting company data reset...');

    // Delete all company profiles
    const companiesRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesRef);
    
    const companyDeletePromises = companiesSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    await Promise.all(companyDeletePromises);
    
    console.log(`Deleted ${companiesSnapshot.docs.length} company profiles`);

    // Delete team members created by company setup (keep mock data)
    const teamMembersRef = collection(db, 'team-members');
    const teamMembersSnapshot = await getDocs(teamMembersRef);
    
    const setupTeamMembers = teamMembersSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.setupSource === 'company-wizard' || doc.id.startsWith('admin-');
    });

    const teamDeletePromises = setupTeamMembers.map(doc => 
      deleteDoc(doc.ref)
    );
    await Promise.all(teamDeletePromises);
    
    console.log(`Deleted ${setupTeamMembers.length} setup-created team members`);
    console.log(`Kept ${teamMembersSnapshot.docs.length - setupTeamMembers.length} mock team members`);

    return NextResponse.json({
      success: true,
      message: 'Company data reset successfully',
      deleted: {
        companies: companiesSnapshot.docs.length,
        teamMembers: setupTeamMembers.length
      },
      kept: {
        mockTeamMembers: teamMembersSnapshot.docs.length - setupTeamMembers.length
      }
    });

  } catch (error) {
    console.error('Error resetting company data:', error);
    return NextResponse.json({ 
      error: 'Failed to reset company data',
      details: error.message 
    }, { status: 500 });
  }
}