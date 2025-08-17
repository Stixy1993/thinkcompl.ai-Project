import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
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

// Mock data for fallback - when no real team members exist
let mockTeamMembers = [
  {
    id: '1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'admin',
    status: 'active',
    joinedAt: '2024-01-15T10:00:00Z',
    position: 'Project Manager',
    company: 'thinkcompl.ai'
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    role: 'engineer',
    status: 'active',
    joinedAt: '2024-01-20T14:30:00Z',
    position: 'Engineer',
    company: 'thinkcompl.ai'
  },
  {
    id: '3',
    email: 'bob.wilson@example.com',
    name: 'Bob Wilson',
    role: 'technician',
    status: 'active',
    joinedAt: '2024-02-01T09:00:00Z',
    position: 'Electrician',
    company: 'thinkcompl.ai'
  },
  {
    id: '4',
    email: 'sarah.johnson@example.com',
    name: 'Sarah Johnson',
    role: 'engineer',
    status: 'active',
    joinedAt: '2024-02-10T11:00:00Z',
    position: 'Senior Engineer',
    company: 'thinkcompl.ai'
  },
  {
    id: '5',
    email: 'mike.chen@example.com',
    name: 'Mike Chen',
    role: 'technician',
    status: 'active',
    joinedAt: '2024-02-15T08:30:00Z',
    position: 'Plumber',
    company: 'thinkcompl.ai'
  },
  {
    id: '6',
    email: 'lisa.rodriguez@example.com',
    name: 'Lisa Rodriguez',
    role: 'technician',
    status: 'active',
    joinedAt: '2024-02-20T13:45:00Z',
    position: 'HVAC Technician',
    company: 'thinkcompl.ai'
  },
  {
    id: '7',
    email: 'david.thompson@example.com',
    name: 'David Thompson',
    role: 'technician',
    status: 'active',
    joinedAt: '2024-02-25T16:20:00Z',
    position: 'Carpenter',
    company: 'thinkcompl.ai'
  }
];

let mockInvites = [
  {
    id: '4',
    email: 'alice.johnson@example.com',
    name: 'Alice Johnson',
    role: 'viewer',
    status: 'invited',
    invitedAt: '2024-02-05T11:00:00Z',
    company: 'thinkcompl.ai'
  }
];

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching team members from Firestore...');
    
    // Load actual team members from Firestore
    const teamMembersRef = collection(db, 'team-members');
    const teamMembersSnapshot = await getDocs(teamMembersRef);
    
    let realTeamMembers = teamMembersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${realTeamMembers.length} team members in Firestore`);

    // If no real team members, fall back to mock data for demo
    if (realTeamMembers.length === 0) {
      console.log('No real team members found, using mock data for demo');
      realTeamMembers = mockTeamMembers;
    }
    
    // Return team members and invites (for now, invites are still mock)
    return NextResponse.json({
      teamMembers: realTeamMembers,
      invites: mockInvites,
      source: realTeamMembers.length > 0 ? 'firestore' : 'mock'
    });
  } catch (error) {
    console.error('Error getting team members from Firestore:', error);
    
    // Fallback to mock data if Firestore fails
    return NextResponse.json({
      teamMembers: mockTeamMembers,
      invites: mockInvites,
      source: 'mock-fallback',
      error: 'Firestore connection failed'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, message } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!role || !['admin', 'engineer', 'technician', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingMember = mockTeamMembers.find(member => member.email === email);
    const existingInvite = mockInvites.find(invite => invite.email === email);

    if (existingMember || existingInvite) {
      return NextResponse.json(
        { error: 'User already exists or has been invited' },
        { status: 409 }
      );
    }

    // Create new invite
    const newInvite = {
      id: Date.now().toString(),
      email,
      name: email.split('@')[0].split('.').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
      role,
      status: 'invited' as const,
      invitedAt: new Date().toISOString(),
      company: 'thinkcompl.ai'
    };

    mockInvites.push(newInvite);

    // TODO: Send actual email invitation using Microsoft Graph API
    // For now, just log the invitation
    console.log('Sending invitation to:', email, 'with role:', role, 'message:', message);

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invite: newInvite
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
} 