'use client';

import { useState } from 'react';
import type { Game, RoleDefinition, ParsedScript } from '@/lib/types';
import { useStore } from '@/lib/store';
import ScriptSelector from './ScriptSelector';

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  onClose: () => void;
}

type View = 'menu' | 'confirm-reset' | 'change-script';

export default function GameSettingsScreen({ game, rolesDb, onClose }: Props) {
  const { resetGame, changeScript } = useStore();
  const [view, setView] = useState<View>('menu');

  function handleReset() {
    resetGame(game.id);
    onClose();
  }

  function handleScriptSelected(script: ParsedScript) {
    changeScript(game.id, script.meta.id, script.meta.name, script.roleIds, script.homebrewRoles, script.meta.author);
    onClose();
  }

  // ── Change script view ───────────────────────────────────────────────
  if (view === 'change-script') {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{ height: 56, borderBottom: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setView('menu')}
            className="text-sm active:opacity-60"
            style={{ color: 'var(--color-text-dim)' }}
          >
            ‹ Back
          </button>
          <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
            Change Script
          </p>
          <button
            onClick={onClose}
            className="text-sm active:opacity-60"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ScriptSelector rolesDb={rolesDb} onSelect={handleScriptSelected} onBuild={() => {}} />
        </div>
      </div>
    );
  }

  // ── Confirm reset view ───────────────────────────────────────────────
  if (view === 'confirm-reset') {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="w-full rounded-2xl flex flex-col gap-4 p-6"
          style={{
            maxWidth: 380,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
          }}
        >
          <p className="font-bold text-center" style={{ fontSize: 18, color: 'var(--color-text)' }}>
            Reset game?
          </p>
          <p className="text-center text-sm leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
            All roles, reminder tokens, and alignment markers will be cleared. Players and the script will be kept. The phase will return to Night 1.
          </p>
          <button
            onClick={handleReset}
            className="w-full rounded-xl py-3 font-semibold transition-all active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.5)',
              color: '#f87171',
              fontSize: 16,
            }}
          >
            Reset Game
          </button>
          <button
            onClick={() => setView('menu')}
            className="w-full rounded-xl py-3 font-semibold transition-all active:scale-95"
            style={{
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
              fontSize: 16,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Main menu ────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onClose}
          className="text-sm active:opacity-60"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Cancel
        </button>
        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
          Game Settings
        </p>
        <div style={{ width: 48 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Current script info */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(20,12,40,0.6)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>
            CURRENT SCRIPT
          </p>
          <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 15 }}>
            {game.scriptName}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
            {game.scriptRoleIds.length} roles · {game.players.length} players
          </p>
        </div>

        {/* Change script */}
        <button
          onClick={() => setView('change-script')}
          className="w-full text-left rounded-xl px-4 py-4 flex items-center gap-4 transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(30,20,50,0.6)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: 28 }}>📜</span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 15 }}>
              Change Script
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
              Swap to a different script while keeping the current players
            </p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--color-text-dim)', fontSize: 18 }}>›</span>
        </button>

        {/* Reset game */}
        <button
          onClick={() => setView('confirm-reset')}
          className="w-full text-left rounded-xl px-4 py-4 flex items-center gap-4 transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <span style={{ fontSize: 28 }}>🔄</span>
          <div>
            <p className="font-semibold" style={{ color: '#f87171', fontSize: 15 }}>
              Reset Game
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
              Clear all roles and tokens, keep players and script
            </p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--color-text-dim)', fontSize: 18 }}>›</span>
        </button>
      </div>
    </div>
  );
}
