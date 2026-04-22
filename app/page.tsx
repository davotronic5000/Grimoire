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
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ padding: '48px 20px 48px' }}
    >
      {/* Constrained column — comfortable on iPad */}
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center" style={{ marginBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/imp.png"
            alt="Imp"
            style={{
              width: 88,
              height: 88,
              margin: '0 auto 18px',
              filter: 'drop-shadow(0 0 16px rgba(239,68,68,0.5))',
            }}
          />
          <h1
            className="gothic-heading"
            style={{ fontSize: 42, marginBottom: 8, display: 'block' }}
          >
            Grimoire
          </h1>
          <p style={{ fontSize: 14, color: 'var(--botc-muted)' }}>
            Blood on the Clocktower — Storyteller Tool
          </p>
        </div>

        {/* ── Parchment banner ────────────────────────────────── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ccc-parchment.png"
          alt="Blood on the Clocktower"
          style={{
            width: '100%',
            borderRadius: 16,
            marginBottom: 28,
            display: 'block',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        />

        {/* ── New Game button ─────────────────────────────────── */}
        <button
          onClick={() => router.push('/setup')}
          className="botc-btn-primary w-full transition-all active:scale-[0.98]"
          style={{ marginBottom: 28, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <span style={{ fontSize: 20 }}>+</span>
          New Game
        </button>

        {/* ── Game list ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedGames.length === 0 ? (
            <div
              className="text-center"
              style={{
                padding: '52px 24px',
                borderRadius: 18,
                border: '1px dashed var(--botc-border)',
                color: 'var(--botc-muted)',
              }}
            >
              <p style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📖</p>
              <p style={{ fontSize: 16, marginBottom: 5 }}>No games yet</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Start a new game above to begin</p>
            </div>
          ) : (
            sortedGames.map(game => {
              const isNight  = game.phase === 'night';
              const phaseColor = isNight ? 'var(--botc-night)' : 'var(--botc-day)';
              const phaseBg    = isNight ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)';
              const phaseBorder = isNight ? '#6366f1' : '#d97706';

              return (
                <div key={game.id} className="botc-game-card">
                  {/* Main tap area */}
                  <button
                    className="w-full text-left transition-opacity active:opacity-70"
                    style={{ padding: '16px 18px' }}
                    onClick={() => router.push(`/game?id=${game.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-semibold truncate"
                          style={{ fontSize: 17, color: 'var(--botc-text)', marginBottom: 3 }}
                        >
                          {game.name}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--botc-muted)', marginBottom: 3 }}>
                          {game.scriptName} · {game.players.length} players
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--botc-subtle)' }}>
                          {formatDate(game.createdAt)}
                        </p>
                      </div>

                      {/* Phase badge */}
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          borderRadius: 20,
                          background: phaseBg,
                          border: `1px solid ${phaseBorder}`,
                          color: phaseColor,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <span>{isNight ? '🌙' : '☀️'}</span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {isNight ? `Night ${game.nightNumber}` : `Day ${game.dayNumber}`}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Delete row */}
                  <div
                    className="flex justify-end"
                    style={{ padding: '7px 14px', borderTop: '1px solid var(--botc-border)' }}
                  >
                    <button
                      onClick={() => handleDelete(game.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        color: confirmDelete === game.id ? 'var(--botc-demon)' : 'var(--botc-subtle)',
                        background: confirmDelete === game.id ? 'rgba(239,68,68,0.1)' : 'transparent',
                        transition: 'color 0.15s, background 0.15s',
                      }}
                    >
                      {confirmDelete === game.id ? 'Tap again to confirm delete' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
