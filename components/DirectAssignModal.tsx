'use client';

import type { Player, RoleDefinition, RoleTeam } from '@/lib/types';
import { getGenericIconPath, getRoleIconPath, getRoleTeamColor, TEAM_COLORS, TEAM_LABELS } from '@/lib/roles';

interface Props {
  player: Player;
  rolesDb: Record<string, RoleDefinition>;
  /** Pool minus all currently-assigned roles (excluding this player's own assignment) */
  remaining: Map<string, number>;
  onAssign: (playerId: string, roleId: string) => void;
  onClear: (playerId: string) => void;
  onClose: () => void;
}

const TEAM_ORDER: RoleTeam[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler'];

export default function DirectAssignModal({ player, rolesDb, remaining, onAssign, onClear, onClose }: Props) {
  const currentRole = player.roleId ? rolesDb[player.roleId] : null;

  // Group remaining by team
  const rolesByTeam = new Map<RoleTeam, { role: RoleDefinition; count: number }[]>();
  remaining.forEach((count, roleId) => {
    const role = rolesDb[roleId];
    if (!role || !role.team) return;
    const team = role.team as RoleTeam;
    if (!rolesByTeam.has(team)) rolesByTeam.set(team, []);
    rolesByTeam.get(team)!.push({ role, count });
  });

  const isEmpty = remaining.size === 0;
  const currentColor = currentRole ? getRoleTeamColor(currentRole.team) : '#888';

  return (
    <>
      <div
        className="fixed inset-0 z-[90]"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[91] flex flex-col rounded-t-2xl overflow-hidden"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
          maxHeight: '85dvh',
        }}
      >
        {/* Handle + header */}
        <div
          className="flex-shrink-0 flex flex-col items-center pt-3 px-5 pb-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="w-9 h-1 rounded-full mb-4" style={{ background: 'var(--color-border)' }} />
          <div className="flex items-center justify-between w-full">
            <button onClick={onClose} className="text-sm active:opacity-60" style={{ color: 'var(--color-text-dim)' }}>
              Cancel
            </button>
            <p className="font-semibold" style={{ fontSize: 16, color: 'var(--color-text)' }}>
              {player.name || 'Player'}
            </p>
            <div style={{ width: 56 }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {/* Current assignment */}
          {currentRole && (
            <div className="mt-4 mb-4">
              <p style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Currently assigned
              </p>
              <div
                className="flex items-center gap-3 rounded-xl"
                style={{
                  padding: '12px 14px',
                  background: `${currentColor}18`,
                  border: `1px solid ${currentColor}55`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getRoleIconPath(currentRole)}
                  alt={currentRole.name}
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'contain', background: 'rgba(0,0,0,0.4)', padding: 3, flexShrink: 0 }}
                  onError={e => {
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(currentRole.team); }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 600, color: currentColor }}>{currentRole.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-dim)', textTransform: 'capitalize' }}>{currentRole.team}</p>
                </div>
                <button
                  onClick={() => onClear(player.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#ef4444', fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Remaining roles or all-done state */}
          {isEmpty ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <p style={{ fontSize: 32 }}>✓</p>
              <p style={{ fontSize: 15, color: 'var(--color-text-dim)', textAlign: 'center' }}>
                All roles have been assigned.
              </p>
            </div>
          ) : (
            <>
              <p style={{
                fontSize: 11, color: 'var(--color-text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginTop: currentRole ? 0 : 16, marginBottom: 10,
              }}>
                {currentRole ? 'Or pick a different role' : 'Choose a role'}
              </p>
              {TEAM_ORDER.map(team => {
                const items = rolesByTeam.get(team);
                if (!items || items.length === 0) return null;
                const color = TEAM_COLORS[team];
                return (
                  <div key={team} className="mb-3">
                    <p style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      {TEAM_LABELS[team]}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {items.map(({ role, count }) => (
                        <button
                          key={role.id}
                          onClick={() => onAssign(player.id, role.id)}
                          className="flex items-center gap-3 rounded-xl text-left active:scale-[0.98] transition-transform"
                          style={{
                            padding: '11px 14px',
                            background: `${color}0f`,
                            border: `1px solid ${color}44`,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getRoleIconPath(role)}
                            alt={role.name}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'contain', background: 'rgba(0,0,0,0.4)', padding: 3, flexShrink: 0 }}
                            onError={e => {
                              const img = e.target as HTMLImageElement;
                              if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: 14, fontWeight: 600, color }}>{role.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {role.ability}
                            </p>
                          </div>
                          {count > 1 && (
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              padding: '2px 7px', borderRadius: 6,
                              background: `${color}22`, border: `1px solid ${color}55`,
                              color, flexShrink: 0,
                            }}>
                              ×{count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
