import { NextResponse } from 'next/server';
import store from '@/lib/store';
import { GameError, joinRoom } from '@/lib/game/uno';

interface Params {
  params: { roomId: string };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { roomId } = params;
    const { name } = await request.json();
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const room = store.getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const playerId = joinRoom(room, name);
    store.saveRoom(room);

    return NextResponse.json({ roomId: room.id, playerId });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
