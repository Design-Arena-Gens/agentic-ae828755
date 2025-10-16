import { NextResponse } from 'next/server';
import store from '@/lib/store';
import { GameError, drawCard } from '@/lib/game/uno';

interface Params {
  params: { roomId: string };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { roomId } = params;
    const { playerId } = await request.json();
    if (typeof playerId !== 'string') {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
    }

    const room = store.getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    drawCard(room, playerId);
    store.saveRoom(room);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to draw card' }, { status: 500 });
  }
}
