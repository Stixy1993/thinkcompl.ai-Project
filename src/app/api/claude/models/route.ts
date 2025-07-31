import { NextRequest, NextResponse } from 'next/server';

const models = [
  { id: 'claude-2', name: 'Claude 2' },
  { id: 'claude-instant', name: 'Claude Instant' },
];

export async function GET(req: NextRequest) {
  return NextResponse.json({ models });
} 