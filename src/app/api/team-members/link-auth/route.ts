import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    const { teamMemberId, authUserId, email, authProvider } = await request.json();
    
    console.log('Linking auth user to team member:', {
      teamMemberId,
      authUserId,
      email,
      authProvider
    });

    // Get the existing team member record
    const teamMemberRef = doc(db, 'team-members', teamMemberId);
    const teamMemberDoc = await getDoc(teamMemberRef);

    if (!teamMemberDoc.exists()) {
      return NextResponse.json({ 
        error: 'Team member not found' 
      }, { status: 404 });
    }

    const teamMemberData = teamMemberDoc.data();

    // Update the team member with auth linking information
    const updatedTeamMember = {
      ...teamMemberData,
      authUserId: authUserId,
      authProvider: authProvider,
      authLinkedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(teamMemberRef, updatedTeamMember);

    console.log('Successfully linked auth user to team member');

    return NextResponse.json({
      success: true,
      message: 'Auth user successfully linked to team member',
      teamMemberId,
      authUserId
    });

  } catch (error) {
    console.error('Error linking auth user to team member:', error);
    return NextResponse.json({ 
      error: 'Failed to link auth user to team member',
      details: error.message 
    }, { status: 500 });
  }
}