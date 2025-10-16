import { NextResponse } from 'next/server';
import store from '@/lib/store';
import { GameError, playCard } from '@/lib/game/uno';
import { UnoColor } from '@/lib/game/types';

interface Params {
  params: { roomId: string };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { roomId } = params;
    const { playerId, cardId, chosenColor } = await request.json();

    if (typeof playerId !== 'string' || typeof cardId !== 'string') {
      return NextResponse.json({ error: 'playerId and cardId are required' }, { status: 400 });
    }

    const room = store.getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    playCard(room, playerId, cardId, chosenColor as UnoColor | undefined);
    store.saveRoom(room);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to play card' }, { status: 500 });
  }
}
