'use client';

import { useState, useMemo } from 'react';
import type { Game, RoleDefinition } from '@/lib/types';
import { getNightOrder, getIconPath } from '@/lib/roles';
import { useIsWide } from '@/lib/hooks';

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  allRoles: RoleDefinition[];
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'in-play' | 'script';

export default function NightOrderPanel({
  game,
  rolesDb,
  allRoles,
  isOpen,
  onClose,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tab, setTab] = useState<Tab>('in-play');
  const isWide = useIsWide();

  const phase = game.nightNumber === 1 ? 'first' : 'other';

  // Too many roles makes a full-script tab impractical (e.g. Whale Buffet)
  const isWhaleBuffet =
    game.scriptName.toLowerCase().includes('whale') ||
    game.scriptRoleIds.length > 40;

  // Set of role IDs that have at least one alive assigned player
  const assignedRoleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of game.players) {
      if (p.roleId && p.isAlive) ids.add(p.roleId);
    }
    return ids;
  }, [game.players]);

  // All script roles treated as "assigned" for the full-script tab
  const allScriptRoleSet = useMemo(
    () => new Set(game.scriptRoleIds),
    [game.scriptRoleIds]
  );

  const inPlayEntries = useMemo(() =>
    getNightOrder(game.scriptRoleIds, rolesDb, allRoles, phase, assignedRoleIds),
    [game.scriptRoleIds, rolesDb, allRoles, phase, assignedRoleIds]
  );

  const scriptEntries = useMemo(() =>
    getNightOrder(game.scriptRoleIds, rolesDb, allRoles, phase, allScriptRoleSet),
    [game.scriptRoleIds, rolesDb, allRoles, phase, allScriptRoleSet]
  );

  const entries = tab === 'in-play' ? inPlayEntries : scriptEntries;

  function switchTab(next: Tab) {
    setTab(next);
    setCurrentStep(0);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: isWide ? 420 : 'min(320px, 85vw)',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-base font-semibold gothic-heading">
              Night Order
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              {phase === 'first' ? 'First Night' : `Night ${game.nightNumber}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-xl active:opacity-60"
            style={{ color: 'var(--color-text-dim)' }}
          >
            ×
          </button>
        </div>

        {/* Tab switcher */}
        {!isWhaleBuffet && (
          <div
            className="flex gap-2 px-4 py-2 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            {(['in-play', 'script'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors"
                style={{
                  background: tab === t ? 'rgba(201,168,76,0.15)' : 'transparent',
                  border: `1px solid ${tab === t ? 'var(--color-gold-dim)' : 'var(--color-border)'}`,
                  color: tab === t ? 'var(--color-gold)' : 'var(--color-text-dim)',
                }}
              >
                {t === 'in-play' ? 'In Play' : 'Full Script'}
              </button>
            ))}
          </div>
        )}

        {/* Order list */}
        <div className="flex-1 overflow-y-auto py-2">
          {entries.length === 0 ? (
            <p
              className="text-center py-8 text-sm px-4"
              style={{ color: 'var(--color-text-dim)' }}
            >
              No roles wake {phase === 'first' ? 'first' : 'other'} night
            </p>
          ) : (
            entries.map((entry, i) => {
              const isActive = i === currentStep;
              return (
                <button
                  key={`${entry.roleId}-${i}`}
                  onClick={() => setCurrentStep(i)}
                  className="w-full text-left flex items-start gap-3 transition-colors"
                  style={{
                    padding: isWide ? '14px 20px' : '12px 16px',
                    background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
                    borderLeft: isActive
                      ? '3px solid var(--color-gold)'
                      : '3px solid transparent',
                  }}
                >
                  {/* Icon or special indicator */}
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden mt-0.5"
                    style={{
                      background: entry.isSpecial
                        ? 'rgba(201,168,76,0.15)'
                        : 'rgba(30,20,50,0.8)',
                      border: `1px solid ${entry.isSpecial ? 'var(--color-gold-dim)' : 'var(--color-border)'}`,
                    }}
                  >
                    {entry.isSpecial ? (
                      <span className="text-xs" style={{ color: 'var(--color-gold)' }}>
                        {entry.roleId === 'Dusk' ? '🌙'
                          : entry.roleId === 'Dawn' ? '🌅'
                          : entry.roleId.includes('Minion') ? 'M'
                          : 'D'}
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getIconPath(entry.roleId)}
                        alt={entry.name}
                        className="w-full h-full object-contain p-0.5"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: isActive
                          ? 'var(--color-gold)'
                          : 'var(--color-text)',
                      }}
                    >
                      {entry.name}
                    </p>
                    {isActive && entry.reminder && (
                      <p
                        className="text-xs mt-1 leading-relaxed"
                        style={{ color: 'var(--color-text-dim)' }}
                      >
                        {entry.reminder}
                      </p>
                    )}
                  </div>

                  {/* Step number */}
                  <span
                    className="text-xs flex-shrink-0 mt-1"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    {i + 1}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Navigation */}
        {entries.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-lg text-sm disabled:opacity-30 transition-opacity active:opacity-60"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              ← Prev
            </button>
            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              {currentStep + 1} / {entries.length}
            </span>
            <button
              onClick={() => setCurrentStep(s => Math.min(entries.length - 1, s + 1))}
              disabled={currentStep === entries.length - 1}
              className="px-4 py-2 rounded-lg text-sm disabled:opacity-30 transition-opacity active:opacity-60"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
