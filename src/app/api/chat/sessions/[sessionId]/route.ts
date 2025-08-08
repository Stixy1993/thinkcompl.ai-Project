import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/firebase';
import { loadChatMessages } from '@/lib/firebase/firebaseUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    if (!auth) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { sessionId } = params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const messages = await loadChatMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error loading chat session:', error);
    return NextResponse.json({ error: 'Failed to load chat session' }, { status: 500 });
  }
}
