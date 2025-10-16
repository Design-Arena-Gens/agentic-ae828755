'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'create' | 'join';

interface ApiErrorResponse {
  error?: string;
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(data.error ?? 'Something went wrong');
  }
  return res.json() as Promise<T>;
}

export default function Landing() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<Mode>('create');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const storedName = localStorage.getItem('uno:name');
    if (storedName) {
      setName(storedName);
    }
  }, []);

  useEffect(() => {
    if (name.trim().length >= 2) {
      localStorage.setItem('uno:name', name.trim());
    }
  }, [name]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('Please enter a display name.');
      return;
    }
    if (mode === 'join' && roomCode.trim().length === 0) {
      setError('Enter a room code to join.');
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const data = await request<{ roomId: string; playerId: string }>('/api/rooms', {
            method: 'POST',
            body: JSON.stringify({ name: trimmedName })
          });
          router.push(`/room/${data.roomId}?playerId=${data.playerId}`);
        } else {
          const data = await request<{ roomId: string; playerId: string }>(`/api/rooms/${roomCode.trim()}/join`, {
            method: 'POST',
            body: JSON.stringify({ name: trimmedName })
          });
          router.push(`/room/${data.roomId}?playerId=${data.playerId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      }
    });
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem'
      }}
    >
      <div className="card" style={{ maxWidth: 960, width: '100%', padding: '3rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3rem', flexWrap: 'wrap' }}>
          <section style={{ flex: '1 1 320px' }}>
            <span className="pill">Agentic Playground</span>
            <h1 style={{ fontSize: '3rem', margin: '1rem 0', letterSpacing: '-0.02em' }}>Multiplayer UNO</h1>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Host a lobby and invite friends or jump into an existing room. Every round is synced through our real-time engine with full action history and UNO rule enforcement.
            </p>
            <div className="grid" style={{ gap: '0.75rem' }}>
              {[
                'Live turn-based engine with stacking draw cards',
                'Smart auto-UNO calls & penalty handling',
                'Room controls for hosts and responsive layouts',
                'Shareable room codes for instant access'
              ].map((feature) => (
                <div key={feature} className="tag">
                  {feature}
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              flex: '1 1 320px',
              background: 'rgba(15, 23, 42, 0.35)',
              borderRadius: '24px',
              padding: '2rem',
              border: '1px solid rgba(148, 163, 184, 0.15)'
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className={`primary${mode === 'create' ? '' : ' muted'}`}
                style={{
                  background: mode === 'create' ? undefined : 'rgba(30, 41, 59, 0.8)',
                  boxShadow: mode === 'create' ? undefined : 'none',
                  flex: 1
                }}
                onClick={() => setMode('create')}
                disabled={isPending}
              >
                Create room
              </button>
              <button
                type="button"
                className={`primary${mode === 'join' ? '' : ' muted'}`}
                style={{
                  background: mode === 'join' ? undefined : 'rgba(30, 41, 59, 0.8)',
                  boxShadow: mode === 'join' ? undefined : 'none',
                  flex: 1
                }}
                onClick={() => setMode('join')}
                disabled={isPending}
              >
                Join room
              </button>
            </div>

            <form className="grid" style={{ gap: '1rem' }} onSubmit={handleSubmit}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 600 }}>
                Display name
                <input
                  type="text"
                  value={name}
                  placeholder="e.g. UNO Champ"
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={32}
                  required
                  disabled={isPending}
                />
              </label>

              {mode === 'join' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 600 }}>
                  Room code
                  <input
                    type="text"
                    value={roomCode}
                    placeholder="Paste a room ID"
                    onChange={(event) => setRoomCode(event.target.value.trim())}
                    required
                    disabled={isPending}
                  />
                </label>
              )}

              {error && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '16px',
                    padding: '0.75rem 1rem',
                    color: 'var(--danger)',
                    fontWeight: 600
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" className="primary" disabled={isPending}>
                {isPending ? 'Hold tight…' : mode === 'create' ? 'Create lobby' : 'Join lobby'}
              </button>
            </form>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
              Share the room code with friends or send them the URL once you are inside. Games auto-clean when inactive for several hours.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
