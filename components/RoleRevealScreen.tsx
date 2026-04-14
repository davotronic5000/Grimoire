'use client';

import { useState } from 'react';
import type { RoleDefinition } from '@/lib/types';
import { getGenericIconPath, getRoleIconPath, getRoleTeamColor } from '@/lib/roles';

interface Props {
  scriptRoleIds: string[];
  rolesDb: Record<string, RoleDefinition>;
  onClose: () => void;
}

const MAX_ROLES = 6;

export default function RoleRevealScreen({ scriptRoleIds, rolesDb, onClose }: Props) {
  const [selected, setSelected] = useState<RoleDefinition[]>([]);
  const [revealing, setRevealing] = useState(false);
  const [search, setSearch] = useState('');

  const scriptRoles = scriptRoleIds
    .map(id => rolesDb[id])
    .filter((r): r is RoleDefinition => !!r && !!r.team);

  const filteredRoles = search
    ? scriptRoles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : scriptRoles;

  function toggle(role: RoleDefinition) {
    setSelected(prev => {
      if (prev.find(r => r.id === role.id)) return prev.filter(r => r.id !== role.id);
      if (prev.length >= MAX_ROLES) return prev;
      return [...prev, role];
    });
  }

  // ── Phase 2: Player reveal view ──────────────────────────────────────
  if (revealing) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: '#06040f' }}
      >
        {/* Role cards — fill all available space */}
        <div
          className="flex-1 p-4"
          style={selected.length <= 3
            ? {
                display: 'flex',
                flexDirection: selected.length === 1 ? 'column' : 'row',
                alignItems: 'stretch',
                gap: 16,
              }
            : {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(2, 1fr)',
                gap: 12,
              }
          }
        >
          {selected.map(role => {
            const teamColor = getRoleTeamColor(role.team);
            const n = selected.length;
            const iconSize = n === 1 ? '45vmin' : n <= 3 ? '26vmin' : '16vmin';
            const nameFontSize = n === 1
              ? 'clamp(22px, 4vmin, 40px)'
              : n <= 3
                ? 'clamp(16px, 2.8vmin, 28px)'
                : 'clamp(11px, 2vmin, 18px)';
            const abilityFontSize = n === 1
              ? 'clamp(14px, 2.2vmin, 22px)'
              : n <= 3
                ? 'clamp(11px, 1.8vmin, 18px)'
                : 'clamp(9px, 1.3vmin, 13px)';
            return (
              <div
                key={role.id}
                className="flex flex-col items-center justify-center rounded-3xl gap-3 p-3"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${teamColor}22 0%, rgba(10,6,20,0.95) 70%)`,
                  border: `2px solid ${teamColor}55`,
                  boxShadow: `0 0 40px ${teamColor}22`,
                  minWidth: 0,
                  minHeight: 0,
                }}
              >
                {/* Icon */}
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: iconSize,
                    height: iconSize,
                    background: `radial-gradient(circle at 40% 30%, ${teamColor}44, #0a0614 70%)`,
                    boxShadow: `0 0 0 3px ${teamColor}, 0 0 24px ${teamColor}66`,
                    padding: '8%',
                    position: 'relative',
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

                {/* Name */}
                <p
                  className="font-bold text-center leading-tight"
                  style={{
                    fontSize: nameFontSize,
                    color: teamColor,
                    textShadow: `0 0 16px ${teamColor}88`,
                  }}
                >
                  {role.name}
                </p>

                {/* Ability */}
                <p
                  className="text-center leading-relaxed"
                  style={{
                    fontSize: abilityFontSize,
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

        {/* Done button */}
        <div className="flex-shrink-0 flex justify-center pb-6 pt-2 px-4">
          <button
            onClick={onClose}
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

  // ── Phase 1: Storyteller selects roles ───────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{
          height: 56,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={onClose}
          className="text-sm active:opacity-60"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Cancel
        </button>
        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
          Show Roles to Player
        </p>
        <button
          onClick={() => setRevealing(true)}
          disabled={selected.length === 0}
          className="text-sm font-semibold rounded-lg px-3 py-1.5 transition-all active:scale-95"
          style={{
            background: selected.length > 0 ? 'rgba(99,102,241,0.2)' : 'transparent',
            border: `1px solid ${selected.length > 0 ? '#6366f1' : 'transparent'}`,
            color: selected.length > 0 ? '#a5b4fc' : 'transparent',
          }}
        >
          Show ({selected.length}/{MAX_ROLES})
        </button>
      </div>

      <p
        className="text-xs text-center px-4 pt-2 flex-shrink-0"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Select 1–6 roles to reveal to the player
      </p>

      {/* Search */}
      <div className="px-4 pb-2 pt-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search roles…"
          className="w-full rounded-xl outline-none"
          style={{
            padding: '10px 14px',
            fontSize: 15,
            background: 'rgba(20,12,40,0.8)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
          autoFocus
        />
      </div>

      {/* Role list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filteredRoles.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-dim)' }}>
            No roles match your search
          </p>
        )}
        {filteredRoles.map(role => {
          const isSelected = !!selected.find(r => r.id === role.id);
          const isDisabled = !isSelected && selected.length >= MAX_ROLES;
          const teamColor = getRoleTeamColor(role.team);
          return (
            <button
              key={role.id}
              onClick={() => toggle(role)}
              disabled={isDisabled}
              className="w-full text-left flex items-center gap-3 rounded-xl transition-all active:scale-[0.98]"
              style={{
                padding: '12px 14px',
                background: isSelected ? `${teamColor}22` : 'rgba(20,12,40,0.6)',
                border: `1px solid ${isSelected ? teamColor : 'var(--color-border)'}`,
                opacity: isDisabled ? 0.35 : 1,
              }}
            >
              {/* Checkbox */}
              <div
                className="flex-shrink-0 rounded-md flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  background: isSelected ? teamColor : 'transparent',
                  border: `2px solid ${isSelected ? teamColor : 'var(--color-border)'}`,
                  fontSize: 13,
                  color: '#000',
                  fontWeight: 700,
                }}
              >
                {isSelected && '✓'}
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getRoleIconPath(role)}
                alt={role.name}
                className="rounded-full object-contain flex-shrink-0"
                style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.4)', padding: 3 }}
                onError={e => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                }}
              />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: isSelected ? teamColor : 'var(--color-text)' }}>
                  {role.name}
                </p>
                <p
                  className="text-xs mt-0.5 leading-relaxed"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {role.ability}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom action bar */}
      {selected.length > 0 && (
        <div
          className="flex-shrink-0 px-4 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setRevealing(true)}
            className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
              border: '1px solid #6366f1',
              color: '#a5b4fc',
              fontSize: 17,
            }}
          >
            Show {selected.length} role{selected.length !== 1 ? 's' : ''} to player
          </button>
        </div>
      )}
    </div>
  );
}
