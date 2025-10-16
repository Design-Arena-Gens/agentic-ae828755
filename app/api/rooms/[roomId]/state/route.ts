import { NextResponse } from 'next/server';
import store from '@/lib/store';
import { GameError, sanitizeState } from '@/lib/game/uno';

interface Params {
  params: { roomId: string };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
    }

    const room = store.getRoom(params.roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const state = sanitizeState(room, playerId);
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}
