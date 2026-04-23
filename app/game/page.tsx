'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import GrimoireBoard from '@/components/GrimoireBoard';

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { games, rolesDb, allRoles, loadRolesDb } = useStore();

  const gameId = searchParams.get('id');
  const hasHydrated = useStore(s => s._hasHydrated);
  const game = gameId ? games[gameId] : null;

  useEffect(() => {
    if (!rolesDb) {
      loadRolesDb().catch(console.error);
    }
  }, [rolesDb, loadRolesDb]);

  if (!hasHydrated) {
    return (
      <div className="h-screen-safe flex items-center justify-center" style={{ color: 'var(--color-text-dim)' }}>
        <div className="text-4xl animate-pulse">📖</div>
      </div>
    );
  }

  if (!gameId || !game) {
    return (
      <div
        className="h-screen-safe flex flex-col items-center justify-center gap-4 px-4"
        style={{ color: 'var(--color-text-dim)' }}
      >
        <p className="text-lg">Game not found</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!rolesDb || !allRoles) {
    return (
      <div
        className="h-screen-safe flex items-center justify-center"
        style={{ color: 'var(--color-text-dim)' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📖</div>
          <p>Loading Grimoire…</p>
        </div>
      </div>
    );
  }

  // Merge any homebrew role definitions from the script into the rolesDb
  const mergedRolesDb = game.homebrewRoles && Object.keys(game.homebrewRoles).length > 0
    ? { ...rolesDb, ...game.homebrewRoles }
    : rolesDb;

  return <GrimoireBoard game={game} rolesDb={mergedRolesDb} allRoles={allRoles} />;
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div
          className="h-screen-safe flex items-center justify-center"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <div className="text-4xl animate-pulse">📖</div>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
