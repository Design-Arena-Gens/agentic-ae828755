import { initialGameRoom, joinRoom, startGame, playCard, drawCard, sanitizeState } from '@/lib/game/uno';

describe('UNO game logic', () => {
  let mathRandomSpy: jest.SpyInstance<number, []>;

  beforeAll(() => {
    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2);
  });

  afterAll(() => {
    mathRandomSpy.mockRestore();
  });

  test('starting a game deals cards and sets up discard pile', () => {
    const { room, hostPlayerId } = initialGameRoom('Host');
    const guestId = joinRoom(room, 'Guest');

    startGame(room, hostPlayerId);

    expect(room.stage).toBe('playing');
    expect(room.players).toHaveLength(2);
    room.players.forEach((player) => {
      expect(player.hand).toHaveLength(7);
    });
    expect(room.discardPile.length).toBeGreaterThan(0);
    expect(room.discardPile[room.discardPile.length - 1].color).not.toBe('black');
    expect(room.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(room.currentPlayerIndex).toBeLessThan(room.players.length);

    const state = sanitizeState(room, guestId);
    expect(state.players).toHaveLength(2);
    expect(state.discardTop).toBeDefined();
  });

  test('player cannot act out of turn and valid plays update state', () => {
    const { room, hostPlayerId } = initialGameRoom('Host');
    joinRoom(room, 'Guest');
    startGame(room, hostPlayerId);

    const current = room.players[room.currentPlayerIndex];
    const topCard = room.discardPile[room.discardPile.length - 1];
    const candidate = current.hand.find((card) => {
      if (card.color === 'black') return true;
      if (card.color === room.currentColor) return true;
      return card.value === topCard.value;
    });

    expect(candidate).toBeDefined();

    const otherPlayer = room.players[(room.currentPlayerIndex + 1) % room.players.length];
    expect(() => playCard(room, otherPlayer.id, otherPlayer.hand[0].id)).toThrow(/turn/i);

    if (candidate) {
      playCard(room, current.id, candidate.id, candidate.color === 'black' ? 'red' : undefined);
      expect(current.hand.length).toBe(6);
      expect(room.discardPile[room.discardPile.length - 1].id).toBe(candidate.id);
    }
  });

  test('draw penalties are enforced and resolved correctly', () => {
    const { room, hostPlayerId } = initialGameRoom('Host');
    joinRoom(room, 'Guest');
    startGame(room, hostPlayerId);

    const current = room.players[room.currentPlayerIndex];
    const initialHand = current.hand.length;
    room.pendingDraw = 4;
    room.pendingAction = 'wild-draw-four';

    drawCard(room, current.id);

    expect(current.hand.length).toBe(initialHand + 4);
    expect(room.pendingDraw).toBe(0);
    expect(room.pendingAction).toBeUndefined();
  });
});
