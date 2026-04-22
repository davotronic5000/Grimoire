'use client';

import { useMemo, useState } from 'react';
import type { Game, Player, RoleDefinition } from '@/lib/types';
import { getGenericIconPath, getRoleIconPath, getRoleTeamColor } from '@/lib/roles';
import { useStore } from '@/lib/store';
import { useIsWide } from '@/lib/hooks';
import ClearableInput from './ClearableInput';

interface Props {
  player: Player;
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  onClose: () => void;
}

const TEAM_ORDER: Record<string, number> = {
  townsfolk: 0, outsider: 1, minion: 2, demon: 3, traveler: 4, loric: 5, fabled: 6,
};

export default function RolePickerModal({ player, game, rolesDb, onClose }: Props) {
  const { updatePlayer } = useStore();
  const isWide = useIsWide();
  const [search, setSearch] = useState('');

  // Map roleId → player names that have it assigned
  const assignedRoleMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of game.players) {
      if (p.roleId) {
        const names = map.get(p.roleId) ?? [];
        names.push(p.name);
        map.set(p.roleId, names);
      }
    }
    return map;
  }, [game.players]);

  const scriptRoles = useMemo(() =>
    game.scriptRoleIds.map(id => rolesDb[id]).filter(Boolean) as RoleDefinition[],
    [game.scriptRoleIds, rolesDb]
  );

  const filteredRoles = useMemo(() => {
    const roles = search
      ? scriptRoles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
      : scriptRoles;
    return [...roles].sort((a, b) => (TEAM_ORDER[a.team] ?? 99) - (TEAM_ORDER[b.team] ?? 99));
  }, [scriptRoles, search]);

  function handleSelect(roleId: string) {
    updatePlayer(game.id, player.id, { roleId });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onClose}
          className="text-sm font-semibold active:opacity-60"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Cancel
        </button>
        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
          Assign Role · {player.name}
        </p>
        <div style={{ width: 56 }} />
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <ClearableInput
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Filter by role name…"
          className="w-full rounded-xl outline-none"
          style={{
            padding: '10px 14px',
            fontSize: 15,
            background: 'rgba(20,12,40,0.8)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filteredRoles.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-dim)' }}>
            {search ? 'No roles match your search' : 'No roles available'}
          </p>
        ) : (
          <div className={`grid gap-3 pt-3 ${isWide ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {filteredRoles.map(role => {
              const teamColor = getRoleTeamColor(role.team);
              const assignedTo = assignedRoleMap.get(role.id) ?? [];
              const isCurrent = role.id === player.roleId;
              const isTaken = assignedTo.length > 0 && !isCurrent;
              return (
                <button
                  key={role.id}
                  onClick={() => handleSelect(role.id)}
                  className="flex flex-col items-center rounded-2xl transition-all active:scale-95"
                  style={{
                    padding: '14px 8px 12px',
                    background: isCurrent ? `${teamColor}30` : `${teamColor}14`,
                    border: `1px solid ${isCurrent ? teamColor : `${teamColor}44`}`,
                    gap: 8,
                    opacity: isTaken && !isCurrent ? 0.5 : 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getRoleIconPath(role)}
                    alt={role.name}
                    className="rounded-full object-contain flex-shrink-0"
                    style={{
                      width: isWide ? 52 : 44,
                      height: isWide ? 52 : 44,
                      background: 'rgba(0,0,0,0.35)',
                      padding: 4,
                    }}
                    onError={e => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                    }}
                  />
                  <p
                    className="text-center font-medium leading-tight"
                    style={{ fontSize: isWide ? 13 : 12, color: 'var(--color-text)', wordBreak: 'break-word' }}
                  >
                    {role.name}
                  </p>
                  {assignedTo.length > 0 && (
                    <p
                      className="text-center leading-none"
                      style={{ fontSize: isWide ? 10 : 9, color: teamColor, opacity: 0.85 }}
                    >
                      {assignedTo.join(', ')}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
