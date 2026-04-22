'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getRoleDistribution } from '@/lib/roles';
import { useIsWide } from '@/lib/hooks';
import type { ParsedScript } from '@/lib/types';
import ScriptSelector from '@/components/ScriptSelector';
import ScriptBuilderScreen from '@/components/ScriptBuilderScreen';

type Step = 'script' | 'count' | 'names' | 'confirm';

export default function SetupPage() {
  const router = useRouter();
  const { rolesDb, loadRolesDb, createGame } = useStore();
  const isWide = useIsWide();

  const [step, setStep] = useState<Step>('script');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ParsedScript | null>(null);
  const [playerCount, setPlayerCount] = useState(7);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [gameName, setGameName] = useState('');
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Ensure roles DB is loaded
  useEffect(() => {
    if (!rolesDb) loadRolesDb().catch(console.error);
  }, [rolesDb, loadRolesDb]);

  // Build default names when player count changes
  useEffect(() => {
    setPlayerNames(
      Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`)
    );
  }, [playerCount]);

  // Auto-focus first name input when moving to names step
  useEffect(() => {
    if (step === 'names') {
      setTimeout(() => nameRefs.current[0]?.focus(), 50);
    }
  }, [step]);

  function handleScriptSelect(script: ParsedScript) {
    setSelectedScript(script);
    setGameName(`${script.meta.name} — ${new Date().toLocaleDateString()}`);
    setStep('count');
  }

  function handleCreateGame() {
    if (!selectedScript) return;
    const id = createGame({
      name: gameName || `Game — ${new Date().toLocaleDateString()}`,
      scriptId: selectedScript.meta.id,
      scriptName: selectedScript.meta.name,
      scriptAuthor: selectedScript.meta.author,
      scriptRoleIds: selectedScript.roleIds,
      playerNames: playerNames.map(n => n.trim() || 'Player'),
      homebrewRoles: selectedScript.homebrewRoles,
    });
    router.push(`/game?id=${id}`);
  }

  const dist = getRoleDistribution(playerCount);

  return (
    <>
    {/* Outer scroll container — inner column is capped for iPad */}
    <div className="min-h-screen flex flex-col items-center" style={{ padding: '0 24px' }}>
    <div className="flex flex-col w-full flex-1" style={{ maxWidth: 540, paddingTop: 32, paddingBottom: 40 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (step === 'script') router.push('/');
            else if (step === 'count') setStep('script');
            else if (step === 'names') setStep('count');
            else if (step === 'confirm') setStep('names');
          }}
          className="flex items-center justify-center rounded-xl active:opacity-60"
          style={{ width: 44, height: 44, color: 'var(--color-text-dim)', fontSize: 22 }}
        >
          ←
        </button>
        <h1 className="text-xl font-semibold gothic-heading">
          {step === 'script' && 'Choose Script'}
          {step === 'count' && 'Player Count'}
          {step === 'names' && 'Player Names'}
          {step === 'confirm' && 'Confirm'}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {(['script', 'count', 'names', 'confirm'] as Step[]).map((s, i) => (
          <div
            key={s}
            className="h-1 flex-1 rounded-full transition-all"
            style={{
              background:
                step === s
                  ? 'var(--color-gold)'
                  : ['script', 'count', 'names', 'confirm'].indexOf(step) > i
                  ? 'var(--color-gold-dim)'
                  : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* STEP 1: Script Selection */}
      {step === 'script' && rolesDb && (
        <ScriptSelector
          rolesDb={rolesDb}
          onSelect={handleScriptSelect}
          onBuild={() => setShowBuilder(true)}
        />
      )}
      {step === 'script' && !rolesDb && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-dim)' }}>
          Loading role data…
        </div>
      )}

      {/* STEP 2: Player Count */}
      {step === 'count' && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-6xl font-bold gothic-heading mb-2">{playerCount}</p>
            <p style={{ color: 'var(--color-text-dim)' }}>players</p>
          </div>

          <input
            type="range"
            min={5}
            max={20}
            value={playerCount}
            onChange={e => setPlayerCount(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--color-gold)' }}
          />

          <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-dim)' }}>
            <span>5</span>
            <span>20</span>
          </div>

          {/* Role distribution */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-gold)' }}>
              Role Distribution
            </p>
            {[
              { label: 'Townsfolk', count: dist.townsfolk, color: '#3b82f6' },
              { label: 'Outsiders', count: dist.outsider, color: '#06b6d4' },
              { label: 'Minions', count: dist.minion, color: '#f97316' },
              { label: 'Demons', count: dist.demon, color: '#ef4444' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-dim)' }}>{label}</span>
                <span style={{ color }}>{count}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('names')}
            className="w-full py-3 rounded-xl font-semibold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4a1942 0%, #7b1a1a 100%)',
              border: '1px solid var(--color-gold-dim)',
              color: 'var(--color-gold)',
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* STEP 3: Player Names */}
      {step === 'names' && (
        <div className="flex-1 overflow-y-auto pb-4">
          {/* 2-column grid on iPad, 1-column on phones */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isWide ? '1fr 1fr' : '1fr',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  style={{ fontSize: 14, width: 24, textAlign: 'right', flexShrink: 0, color: 'var(--color-text-dim)' }}
                >
                  {i + 1}
                </span>
                <input
                  ref={el => { nameRefs.current[i] = el; }}
                  type="text"
                  value={name}
                  onChange={e => {
                    const next = [...playerNames];
                    next[i] = e.target.value;
                    setPlayerNames(next);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (i < playerNames.length - 1) {
                        nameRefs.current[i + 1]?.focus();
                      } else {
                        setStep('confirm');
                      }
                    }
                  }}
                  className="flex-1 rounded-lg outline-none"
                  style={{
                    padding: '11px 14px',
                    fontSize: 15,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  placeholder={`Player ${i + 1}`}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('confirm')}
            className="w-full rounded-xl font-semibold transition-all active:scale-95"
            style={{
              padding: '16px 24px',
              fontSize: 16,
              background: 'linear-gradient(135deg, #4a1942 0%, #7b1a1a 100%)',
              border: '1px solid var(--color-gold-dim)',
              color: 'var(--color-gold)',
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* STEP 4: Confirm */}
      {step === 'confirm' && selectedScript && (
        <div className="space-y-4">
          {/* Game name */}
          <div>
            <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-text-dim)' }}>
              Game Name
            </label>
            <input
              type="text"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Summary */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-dim)' }}>Script</span>
                <span>{selectedScript.meta.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-dim)' }}>Players</span>
                <span>{playerCount}</span>
              </div>
              <div
                className="border-t pt-2 mt-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-dim)' }}>
                  Players
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {playerNames.map((name, i) => (
                    <span key={i} className="text-xs truncate">
                      {name || `Player ${i + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateGame}
            className="w-full rounded-xl font-semibold transition-all active:scale-95"
            style={{
              padding: '18px 24px',
              fontSize: 18,
              background: 'linear-gradient(135deg, #4a1942 0%, #7b1a1a 100%)',
              border: '1px solid var(--color-gold)',
              color: 'var(--color-gold)',
              boxShadow: '0 4px 24px rgba(201,168,76,0.25)',
            }}
          >
            Start Game
          </button>
        </div>
      )}
    </div>
    </div>

    {showBuilder && rolesDb && (
      <ScriptBuilderScreen
        rolesDb={rolesDb}
        onSelect={script => { setShowBuilder(false); handleScriptSelect(script); }}
        onClose={() => setShowBuilder(false)}
      />
    )}
    </>
  );
}
