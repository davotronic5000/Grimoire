'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import type { Game } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { games, loadRolesDb, deleteGame } = useStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadRolesDb().catch(console.error);
  }, [loadRolesDb]);

  const sortedGames: Game[] = Object.values(games).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function handleDelete(id: string) {
    if (confirmDelete === id) {
      deleteGame(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  }

  return (
    /* Full-screen with centred content column */
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ padding: '48px 24px 40px' }}
    >
      {/* Constrained column — comfortable on iPad */}
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Header */}
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/imp.png"
            alt="Imp"
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 16px',
              filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.55))',
            }}
          />
          <h1
            className="gothic-heading"
            style={{ fontSize: 40, marginBottom: 6 }}
          >
            Grimoire
          </h1>
          <p style={{ fontSize: 15, color: 'var(--color-text-dim)' }}>
            Blood on the Clocktower — Storyteller Tool
          </p>
        </div>

        {/* New Game button */}
        <button
          onClick={() => router.push('/setup')}
          className="w-full transition-all active:scale-95"
          style={{
            padding: '18px 24px',
            marginBottom: 28,
            borderRadius: 16,
            fontSize: 18,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #4a1942 0%, #7b1a1a 100%)',
            border: '1px solid var(--color-gold-dim)',
            color: 'var(--color-gold)',
            boxShadow: '0 4px 24px rgba(123,26,26,0.35)',
          }}
        >
          + New Game
        </button>

        {/* Games list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedGames.length === 0 ? (
            <div
              className="text-center"
              style={{
                padding: '48px 24px',
                borderRadius: 16,
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-dim)',
              }}
            >
              <p style={{ fontSize: 17, marginBottom: 6 }}>No games yet</p>
              <p style={{ fontSize: 14 }}>Start a new game above</p>
            </div>
          ) : (
            sortedGames.map(game => (
              <div
                key={game.id}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <button
                  className="w-full text-left active:opacity-70 transition-opacity"
                  style={{ padding: '16px 20px' }}
                  onClick={() => router.push(`/game?id=${game.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 600 }}>{game.name}</p>
                      <p style={{ fontSize: 14, color: 'var(--color-text-dim)', marginTop: 3 }}>
                        {game.scriptName} · {game.players.length} players
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 3 }}>
                        {formatDate(game.createdAt)} ·{' '}
                        {game.phase === 'night'
                          ? `Night ${game.nightNumber}`
                          : `Day ${game.dayNumber}`}
                      </p>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background:
                          game.phase === 'night'
                            ? 'rgba(99,102,241,0.2)'
                            : 'rgba(245,158,11,0.2)',
                        color: game.phase === 'night' ? '#818cf8' : '#fbbf24',
                      }}
                    >
                      {game.phase === 'night' ? '🌙' : '☀️'} {game.phase}
                    </span>
                  </div>
                </button>
                <div
                  className="flex justify-end"
                  style={{
                    padding: '8px 16px',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <button
                    onClick={() => handleDelete(game.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      color:
                        confirmDelete === game.id
                          ? '#ef4444'
                          : 'var(--color-text-dim)',
                      background:
                        confirmDelete === game.id
                          ? 'rgba(239,68,68,0.1)'
                          : 'transparent',
                    }}
                  >
                    {confirmDelete === game.id ? 'Tap again to delete' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
