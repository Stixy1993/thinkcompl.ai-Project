import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/firebase';
import { getChatSessions, deleteChatSession, loadChatMessages } from '@/lib/firebase/firebaseUtils';

export async function GET(request: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const sessions = await getChatSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    await deleteChatSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
  }
}
