'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import type { PublicGameState, UnoCard, UnoColor } from '@/lib/game/types';

interface RoomViewProps {
  roomId: string;
  playerId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? 'Failed to load');
  }
  return res.json() as Promise<PublicGameState>;
};

export default function RoomView({ roomId, playerId }: RoomViewProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [showWildPicker, setShowWildPicker] = useState<UnoCard | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data, error, isLoading, mutate } = useSWR<PublicGameState>(
    playerId ? `/api/rooms/${roomId}/state?playerId=${playerId}` : null,
    fetcher,
    {
      refreshInterval: 1500,
      shouldRetryOnError: true
    }
  );

  const currentPlayer = useMemo(
    () => data?.players.find((p) => p.id === data.currentPlayerId),
    [data]
  );

  const isHost = data?.hostId === playerId;
  const isTurn = data?.currentPlayerId === playerId;

  const handleStartGame = useCallback(() => {
    if (!playerId) return;
    startTransition(async () => {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setMessage(payload.error ?? 'Failed to start game');
      } else {
        setMessage(null);
        mutate();
      }
    });
  }, [mutate, playerId, roomId]);

  const playCard = useCallback(
    async (card: UnoCard, chosenColor?: UnoColor) => {
      if (!playerId) return;
      const res = await fetch(`/api/rooms/${roomId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardId: card.id, chosenColor })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setMessage(payload.error ?? 'Play failed');
      } else {
        setMessage(null);
        setShowWildPicker(null);
        mutate();
      }
    },
    [mutate, playerId, roomId]
  );

  const draw = useCallback(async () => {
    if (!playerId) return;
    const res = await fetch(`/api/rooms/${roomId}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setMessage(payload.error ?? 'Draw failed');
    } else {
      setMessage(null);
      mutate();
    }
  }, [mutate, playerId, roomId]);

  const callUno = useCallback(async () => {
    if (!playerId) return;
    const res = await fetch(`/api/rooms/${roomId}/uno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setMessage(payload.error ?? 'Could not call UNO');
    } else {
      setMessage('UNO!');
      mutate();
      setTimeout(() => setMessage(null), 1500);
    }
  }, [mutate, playerId, roomId]);

  const leaveRoom = useCallback(() => {
    router.replace('/');
  }, [router]);

  if (!playerId) {
    return (
      <FallbackShell>
        <h1>Missing player ID</h1>
        <p>Please return to the homepage and enter through a join link.</p>
        <button className="primary" onClick={leaveRoom} type="button">
          Back home
        </button>
      </FallbackShell>
    );
  }

  if (isLoading) {
    return (
      <FallbackShell>
        <div className="uno-card black small" />
        <p>Loading lobby…</p>
      </FallbackShell>
    );
  }

  if (error || !data) {
    return (
      <FallbackShell>
        <h1>Something went wrong</h1>
        <p>{error?.message ?? 'Unable to access this room.'}</p>
        <button className="primary" onClick={() => mutate()} type="button">
          Retry
        </button>
      </FallbackShell>
    );
  }

  const hand = data.hand ?? [];
  const discard = data.discardTop;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        padding: '2rem '
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Room {roomId.slice(0, 8)}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem' }}>Share this code to invite friends.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="pill">Players: {data.players.length}</div>
          <button className="primary" type="button" onClick={leaveRoom}>
            Leave lobby
          </button>
        </div>
      </header>

      <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="card" style={{ padding: '1.75rem' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Players</h2>
            {data.stage === 'lobby' && isHost && (
              <button
                className="primary"
                type="button"
                onClick={handleStartGame}
                disabled={isPending || data.players.length < 2}
              >
                {isPending ? 'Starting…' : 'Start game'}
              </button>
            )}
          </header>
          <div className="divider" />
          <div className="scroll-area">
            {data.players.map((player) => (
              <div
                key={player.id}
                style={{
                  padding: '0.75rem 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.08)'
                }}
              >
                <div>
                  <strong>{player.name}</strong>
                  {player.isSelf && <span className="pill" style={{ marginLeft: '0.5rem' }}>You</span>}
                  {player.id === data.hostId && <span className="tag" style={{ marginLeft: '0.75rem' }}>Host</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {data.stage !== 'lobby' && <span className="pill">{player.cardCount} cards</span>}
                  {player.hasCalledUno && player.cardCount === 1 && <span className="tag">UNO!</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1.75rem', position: 'relative' }}>
          <h2 style={{ marginTop: 0 }}>Game Board</h2>
          <div className="divider" />
          {data.stage === 'lobby' && (
            <div style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <p>Waiting for the host to start the game. Share this room ID with your friends or send the URL directly.</p>
            </div>
          )}

          {data.stage === 'playing' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Current turn</p>
                  <h3 style={{ margin: '0.35rem 0' }}>{currentPlayer?.name ?? '—'}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="pill">Direction: {data.direction === 1 ? 'Clockwise' : 'Counter-clockwise'}</span>
                    {data.pendingDraw > 0 && (
                      <span className="tag">Draw {data.pendingDraw}</span>
                    )}
                    {data.pendingAction && <span className="tag">Pending {data.pendingAction}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {discard ? <UnoCardView card={discard} size="large" /> : <span>No discard yet</span>}
                  <div style={{ display: 'grid', gap: '0.35rem', textAlign: 'right' }}>
                    <span className="pill">Deck: {data.deckCount}</span>
                    <span className="pill">Current color: {data.currentColor ?? '—'}</span>
                  </div>
                </div>
              </div>
              {showWildPicker && (
                <ColorPicker
                  onSelect={(color) => playCard(showWildPicker, color)}
                  onCancel={() => setShowWildPicker(null)}
                />
              )}

              <div>
                <h3 style={{ marginBottom: '0.75rem' }}>Your hand</h3>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  {hand.length === 0 && <span>You are out of cards!</span>}
                  {hand.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      disabled={!isTurn}
                      onClick={() => {
                        if (card.color === 'black') {
                          setShowWildPicker(card);
                        } else {
                          playCard(card);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        padding: 0,
                        border: 'none'
                      }}
                    >
                      <UnoCardView card={card} size="small" playable={isTurn} />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="primary" type="button" onClick={draw} disabled={!isTurn}>
                  Draw card
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={callUno}
                  disabled={hand.length !== 1 || data.players.find((p) => p.id === playerId)?.hasCalledUno}
                >
                  Call UNO
                </button>
              </div>
            </div>
          )}

          {data.stage === 'finished' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <h2 style={{ fontSize: '2rem' }}>🎉 Winner</h2>
              <p style={{ fontSize: '1.25rem' }}>{data.players.find((p) => p.id === data.winnerId)?.name ?? 'Unknown'}</p>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button className="primary" type="button" onClick={() => mutate()}>
                  Review board
                </button>
                {isHost && (
                  <button className="primary" type="button" onClick={handleStartGame}>
                    Play again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ marginTop: 0 }}>Last action</h2>
          <div className="divider" />
          {data.lastAction ? (
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {new Date(data.lastAction.timestamp).toLocaleTimeString()}
              </span>
              <strong>{data.players.find((p) => p.id === data.lastAction?.playerId)?.name ?? 'Player'}</strong>
              <span>{formatAction(data.lastAction.type, data.lastAction.payload)}</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No moves yet.</p>
          )}

          {message && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                background: 'rgba(59, 130, 246, 0.15)'
              }}
            >
              {message}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function formatAction(action: string, payload?: Record<string, unknown>) {
  switch (action) {
    case 'play':
      if (payload && typeof payload === 'object' && payload.card) {
        const card = payload.card as Partial<UnoCard>;
        return `Played ${card.value} ${card.color ?? ''}`.trim();
      }
      return 'Played a card';
    case 'draw':
      return 'Drew a card';
    case 'resolve-draw':
      if (payload?.count) {
        return `Drew ${payload.count} cards`;
      }
      return 'Resolved draw penalty';
    case 'start':
      return 'Game started';
    case 'win':
      return 'Won the game';
    case 'uno':
      return 'Called UNO';
    default:
      return action;
  }
}

function FallbackShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      <div className="card" style={{ padding: '2.5rem', maxWidth: 480, textAlign: 'center' }}>
        {children}
      </div>
    </main>
  );
}

function UnoCardView({ card, size, playable }: { card: UnoCard; size: 'small' | 'large'; playable?: boolean }) {
  const classes = ['uno-card', size === 'small' ? 'small' : '', playable ? 'playable' : '', card.color].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <span>{renderValue(card.value)}</span>
    </div>
  );
}

function renderValue(value: UnoCard['value']) {
  switch (value) {
    case 'draw-two':
      return '+2';
    case 'wild-draw-four':
      return '+4';
    case 'reverse':
      return '⟲';
    case 'skip':
      return '🚫';
    case 'wild':
      return '★';
    default:
      return value;
  }
}

function ColorPicker({ onSelect, onCancel }: { onSelect: (color: UnoColor) => void; onCancel: () => void }) {
  const colors: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.88)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem'
      }}
    >
      <h3>Pick a color</h3>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={`uno-card ${color}`}
            style={{ borderRadius: '16px', width: 80, height: 120 }}
            onClick={() => onSelect(color)}
          >
            {color.toUpperCase()}
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel} style={{ marginTop: '1rem', background: 'transparent', color: 'var(--text-muted)' }}>
        Cancel
      </button>
    </div>
  );
}
