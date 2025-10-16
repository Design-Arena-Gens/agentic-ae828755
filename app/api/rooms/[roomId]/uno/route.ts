import { NextResponse } from 'next/server';
import store from '@/lib/store';
import { GameError, declareUno } from '@/lib/game/uno';

interface Params {
  params: { roomId: string };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { playerId } = await request.json();
    if (typeof playerId !== 'string') {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
    }

    const room = store.getRoom(params.roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    declareUno(room, playerId);
    store.saveRoom(room);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to declare UNO' }, { status: 500 });
  }
}
