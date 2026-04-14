'use client';

import { useState } from 'react';
import type { Game, RoleDefinition } from '@/lib/types';
import { getGenericIconPath, getRoleIconPath, getRoleTeamColor } from '@/lib/roles';
import { useStore } from '@/lib/store';
import RoleSelector from './RoleSelector';

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
}

export default function BluffDrawer({ game, rolesDb }: Props) {
  const { setBluff } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [selectingSlot, setSelectingSlot] = useState<0 | 1 | 2 | null>(null);

  const bluffIds: [string | null, string | null, string | null] =
    game.bluffRoleIds ?? [null, null, null];
  const bluffRoles = bluffIds.map(id => (id ? (rolesDb[id] ?? null) : null));
  const hasAnyBluff = bluffIds.some(id => id !== null);

  const assignedIds = new Set(game.players.map(p => p.roleId).filter(Boolean) as string[]);

  // Only townsfolk and outsider are valid bluffs
  const BLUFF_TEAMS = new Set(['townsfolk', 'outsider']);

  function slotRoleIds(slot: 0 | 1 | 2): string[] {
    const otherBluffs = new Set(bluffIds.filter((id, i) => i !== slot && id !== null) as string[]);
    const eligible = game.scriptRoleIds.filter(id => {
      const role = rolesDb[id];
      return role && BLUFF_TEAMS.has(role.team) && !otherBluffs.has(id);
    });
    // Unassigned (safe) bluffs first, assigned ones after
    return [
      ...eligible.filter(id => !assignedIds.has(id)),
      ...eligible.filter(id => assignedIds.has(id)),
    ];
  }

  function priorityIdsForSlot(slot: 0 | 1 | 2): Set<string> {
    const otherBluffs = new Set(bluffIds.filter((id, i) => i !== slot && id !== null) as string[]);
    return new Set(game.scriptRoleIds.filter(id => {
      const role = rolesDb[id];
      return role && BLUFF_TEAMS.has(role.team) && !otherBluffs.has(id) && !assignedIds.has(id);
    }));
  }

  // ── Reveal screen ──────────────────────────────────────────────────
  if (showReveal) {
    const revealRoles = bluffRoles.filter((r): r is RoleDefinition => r !== null);
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: '#06040f' }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 text-center px-6 pt-10 pb-2"
        >
          <p
            className="gothic-heading"
            style={{
              fontSize: 'clamp(15px, 2.8vmin, 24px)',
              color: 'var(--color-gold)',
              textShadow: '0 0 20px rgba(201,168,76,0.4)',
            }}
          >
            These roles are not in play:
          </p>
        </div>

        {/* Role cards */}
        <div
          className="flex-1 flex gap-4 p-4"
          style={{
            flexDirection: revealRoles.length === 1 ? 'column' : 'row',
            alignItems: 'stretch',
          }}
        >
          {revealRoles.map(role => {
            const teamColor = getRoleTeamColor(role.team);
            return (
              <div
                key={role.id}
                className="flex-1 flex flex-col items-center justify-center rounded-3xl gap-4 p-5"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${teamColor}22 0%, rgba(10,6,20,0.95) 70%)`,
                  border: `2px solid ${teamColor}55`,
                  boxShadow: `0 0 40px ${teamColor}22`,
                  minWidth: 0,
                }}
              >
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: revealRoles.length === 1 ? '45vmin' : '26vmin',
                    height: revealRoles.length === 1 ? '45vmin' : '26vmin',
                    background: `radial-gradient(circle at 40% 30%, ${teamColor}44, #0a0614 70%)`,
                    boxShadow: `0 0 0 3px ${teamColor}, 0 0 24px ${teamColor}66`,
                    padding: '8%',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getRoleIconPath(role)}
                    alt={role.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={e => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                    }}
                  />
                </div>

                <p
                  className="font-bold text-center leading-tight"
                  style={{
                    fontSize: revealRoles.length === 1
                      ? 'clamp(22px, 4vmin, 40px)'
                      : 'clamp(16px, 2.8vmin, 28px)',
                    color: teamColor,
                    textShadow: `0 0 16px ${teamColor}88`,
                  }}
                >
                  {role.name}
                </p>

                <p
                  className="text-center leading-relaxed"
                  style={{
                    fontSize: revealRoles.length === 1
                      ? 'clamp(14px, 2.2vmin, 22px)'
                      : 'clamp(11px, 1.8vmin, 18px)',
                    color: 'var(--color-text)',
                    opacity: 0.9,
                    maxWidth: '90%',
                  }}
                >
                  {role.ability}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex-shrink-0 flex justify-center pb-6 pt-2 px-4">
          <button
            onClick={() => setShowReveal(false)}
            className="rounded-full font-semibold transition-all active:scale-95"
            style={{
              padding: '14px 48px',
              background: 'rgba(30,20,50,0.9)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
              fontSize: 16,
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Role selector for a slot ───────────────────────────────────────
  if (selectingSlot !== null) {
    return (
      <RoleSelector
        scriptRoleIds={slotRoleIds(selectingSlot)}
        rolesDb={rolesDb}
        currentRoleId={bluffIds[selectingSlot]}
        priorityIds={priorityIdsForSlot(selectingSlot)}
        onSelect={roleId => setBluff(game.id, selectingSlot, roleId)}
        onClose={() => setSelectingSlot(null)}
      />
    );
  }

  // ── Drawer + toggle button ─────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer panel */}
      {isOpen && (
        <div
          className="fixed bottom-16 left-4 z-40 rounded-2xl flex flex-col gap-3 p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
            minWidth: 220,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-gold)' }}
          >
            Demon Bluffs
          </p>

          {/* 3 bluff slots */}
          <div className="flex gap-3">
            {([0, 1, 2] as const).map(i => {
              const role = bluffRoles[i];
              const teamColor = role ? getRoleTeamColor(role.team) : null;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => setSelectingSlot(i)}
                    className="rounded-full transition-all active:scale-90 flex items-center justify-center relative"
                    style={{
                      width: 64,
                      height: 64,
                      background: role
                        ? `radial-gradient(circle at 40% 30%, ${teamColor}44, #1a1025 70%)`
                        : 'rgba(30,20,50,0.6)',
                      border: role
                        ? `2px solid ${teamColor}`
                        : '2px dashed rgba(201,168,76,0.35)',
                      boxShadow: role ? `0 0 12px ${teamColor}55` : 'none',
                    }}
                    aria-label={role ? `Change bluff ${i + 1}: ${role.name}` : `Set bluff ${i + 1}`}
                  >
                    {role ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getRoleIconPath(role)}
                        alt={role.name}
                        style={{ width: '75%', height: '75%', objectFit: 'contain' }}
                        onError={e => {
                          const img = e.target as HTMLImageElement;
                          if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 24, color: 'rgba(201,168,76,0.4)' }}>+</span>
                    )}
                  </button>

                  {/* Role name + clear */}
                  {role ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className="text-center leading-tight"
                        style={{
                          fontSize: 10,
                          color: teamColor ?? 'var(--color-text)',
                          maxWidth: 64,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {role.name}
                      </span>
                      <button
                        onClick={() => setBluff(game.id, i, null)}
                        className="active:opacity-60"
                        style={{ fontSize: 10, color: 'var(--color-text-dim)' }}
                        aria-label={`Clear bluff ${i + 1}`}
                      >
                        ✕ clear
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 10, color: 'rgba(201,168,76,0.3)' }}>
                      Bluff {i + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show to player */}
          {hasAnyBluff && (
            <button
              onClick={() => { setIsOpen(false); setShowReveal(true); }}
              className="w-full rounded-xl py-2.5 font-semibold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
                border: '1px solid #6366f1',
                color: '#a5b4fc',
                fontSize: 13,
              }}
            >
              👁 Show to Player
            </button>
          )}
        </div>
      )}

      {/* Toggle button — fixed bottom-left */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl transition-all active:scale-95"
        style={{
          padding: '10px 14px',
          background: isOpen
            ? 'rgba(99,102,241,0.2)'
            : 'rgba(8,6,18,0.92)',
          border: `1px solid ${isOpen ? '#6366f1' : 'var(--color-border)'}`,
          color: isOpen ? '#a5b4fc' : 'var(--color-text-dim)',
          fontSize: 14,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
        aria-label="Demon bluffs"
      >
        <span style={{ fontSize: 16 }}>🎴</span>
        <span>Bluffs</span>
        {hasAnyBluff && (
          <span
            className="rounded-full flex items-center justify-center font-bold"
            style={{
              width: 18,
              height: 18,
              background: '#6366f1',
              color: '#fff',
              fontSize: 10,
            }}
          >
            {bluffIds.filter(Boolean).length}
          </span>
        )}
      </button>
    </>
  );
}
