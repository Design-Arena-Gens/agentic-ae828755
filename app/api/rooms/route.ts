import { NextResponse } from 'next/server';
import store from '@/lib/store';
import { GameError, initialGameRoom } from '@/lib/game/uno';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { room, hostPlayerId } = initialGameRoom(name);
    store.saveRoom(room);

    return NextResponse.json({ roomId: room.id, playerId: hostPlayerId });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
