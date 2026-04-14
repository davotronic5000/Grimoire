'use client';

import { useState, useMemo } from 'react';
import type { RoleDefinition, RoleTeam } from '@/lib/types';
import { getGenericIconPath, getRoleIconPath, getRoleTeamColor, TEAM_LABELS } from '@/lib/roles';
import { useIsWide } from '@/lib/hooks';

const ALL_TEAM_FILTERS = ['all', 'townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'loric'] as const;
type TeamFilter = (typeof ALL_TEAM_FILTERS)[number];

const TEAM_SORT_ORDER: Record<string, number> = {
  townsfolk: 0, outsider: 1, minion: 2, demon: 3, traveler: 4, loric: 5, fabled: 6,
};

interface Props {
  scriptRoleIds: string[];
  rolesDb: Record<string, RoleDefinition>;
  currentRoleId: string | null;
  onSelect: (roleId: string) => void;
  onClose: () => void;
  /** Roles in this set are sorted to the top and highlighted as preferred choices. */
  priorityIds?: Set<string>;
}

export default function RoleSelector({
  scriptRoleIds,
  rolesDb,
  currentRoleId,
  onSelect,
  onClose,
  priorityIds,
}: Props) {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const isWide = useIsWide();

  const scriptRoles = useMemo(() =>
    scriptRoleIds.map(id => rolesDb[id]).filter((r): r is RoleDefinition => !!r),
    [scriptRoleIds, rolesDb]
  );

  // Only show team tabs that have at least one role in this list
  const presentTeamFilters = useMemo(() => {
    const presentTeams = new Set(scriptRoles.map(r => r.team));
    return ALL_TEAM_FILTERS.filter(f => f === 'all' || presentTeams.has(f as RoleTeam));
  }, [scriptRoles]);

  const filtered = useMemo(() => {
    const matching = scriptRoles.filter(role => {
      const matchesTeam = teamFilter === 'all' || role.team === teamFilter;
      const matchesSearch = !search || role.name.toLowerCase().includes(search.toLowerCase());
      return matchesTeam && matchesSearch;
    });
    const sorted = teamFilter === 'all'
      ? [...matching].sort((a, b) => (TEAM_SORT_ORDER[a.team] ?? 99) - (TEAM_SORT_ORDER[b.team] ?? 99))
      : matching;
    if (!priorityIds) return sorted;
    // Sort: priority (unassigned) first, then the rest
    return [
      ...sorted.filter(r => priorityIds.has(r.id)),
      ...sorted.filter(r => !priorityIds.has(r.id)),
    ];
  }, [scriptRoles, teamFilter, search, priorityIds]);

  const panel = (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg)',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 border-b flex-shrink-0"
        style={{ height: 60, borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-xl active:opacity-60"
          style={{ width: 44, height: 44, color: 'var(--color-text-dim)', fontSize: 22 }}
          aria-label="Back"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold gothic-heading flex-1">Assign Role</h2>
      </div>

      {/* Search */}
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search roles…"
          className="w-full rounded-xl outline-none"
          style={{
            padding: '12px 16px',
            fontSize: 15,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
          autoFocus
        />
      </div>

      {/* Team filter tabs */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto flex-shrink-0">
        {presentTeamFilters.map(f => (
          <button
            key={f}
            onClick={() => setTeamFilter(f)}
            className="flex-shrink-0 rounded-full font-medium transition-all"
            style={{
              padding: '8px 16px',
              fontSize: 13,
              background:
                teamFilter === f
                  ? f === 'all' ? 'var(--color-gold)' : getRoleTeamColor(f as RoleTeam)
                  : 'var(--color-surface)',
              color:
                teamFilter === f
                  ? f === 'all' ? '#000' : '#fff'
                  : 'var(--color-text-dim)',
              border: '1px solid',
              borderColor: teamFilter === f ? 'transparent' : 'var(--color-border)',
            }}
          >
            {f === 'all' ? 'All' : TEAM_LABELS[f as RoleTeam]}
          </button>
        ))}
      </div>

      {/* Role grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-dim)' }}>
            No roles match your search
          </p>
        ) : (
          /* 4 columns on iPad, 3 on smaller screens */
          <div className={`grid gap-3 ${isWide ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {filtered.map(role => {
              const isSelected = role.id === currentRoleId;
              const isPriority = !!priorityIds?.has(role.id);
              const color = getRoleTeamColor(role.team);
              const goldColor = 'var(--color-gold)';
              return (
                <button
                  key={role.id}
                  onClick={() => { onSelect(role.id); onClose(); }}
                  className="flex flex-col items-center rounded-xl transition-all active:scale-95"
                  style={{
                    padding: isWide ? '14px 8px' : '10px 6px',
                    background: isSelected
                      ? `${color}33`
                      : isPriority
                        ? 'rgba(201,168,76,0.08)'
                        : 'var(--color-surface)',
                    border: `1px solid ${isSelected ? color : isPriority ? 'rgba(201,168,76,0.45)' : 'var(--color-border)'}`,
                    boxShadow: isSelected
                      ? `0 0 10px ${color}44`
                      : isPriority
                        ? '0 0 8px rgba(201,168,76,0.15)'
                        : 'none',
                    opacity: !isPriority && !isSelected && priorityIds ? 0.5 : 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getRoleIconPath(role)}
                    alt={role.name}
                    style={{ width: isWide ? 64 : 48, height: isWide ? 64 : 48, objectFit: 'contain' }}
                    onError={e => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                    }}
                  />
                  <p
                    className="text-center mt-1.5 leading-tight"
                    style={{
                      fontSize: isWide ? 13 : 11,
                      color: isSelected ? color : isPriority ? goldColor : 'var(--color-text)',
                      fontWeight: isSelected || isPriority ? 600 : 400,
                    }}
                  >
                    {role.name}
                  </p>
                  {isSelected && (
                    <span style={{ fontSize: 11, color, marginTop: 2 }}>✓</span>
                  )}
                  {isPriority && !isSelected && (
                    <span style={{ fontSize: 9, color: goldColor, marginTop: 2, opacity: 0.8 }}>
                      not in play
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // On iPad: centered overlay panel; on phone: full-screen
  if (isWide) {
    return (
      <>
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        />
        <div
          className="fixed z-[60] overflow-hidden rounded-2xl"
          style={{
            width: 680,
            maxWidth: '90vw',
            height: '82vh',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {panel}
        </div>
      </>
    );
  }

  // Full-screen on phones
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {panel}
    </div>
  );
}
