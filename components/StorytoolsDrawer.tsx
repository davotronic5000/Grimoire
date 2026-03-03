'use client';

import { useState } from 'react';
import type { Game, RoleDefinition } from '@/lib/types';
import { getIconPath, getRoleTeamColor } from '@/lib/roles';
import { useStore } from '@/lib/store';

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
}

interface PickerProps {
  team: 'loric' | 'fabled';
  rolesDb: Record<string, RoleDefinition>;
  activeIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

function RolePicker({ team, rolesDb, activeIds, onToggle, onClose }: PickerProps) {
  const [search, setSearch] = useState('');
  const color = getRoleTeamColor(team);
  const label = team === 'loric' ? 'Loric' : 'Fabled';

  const roles = Object.values(rolesDb)
    .filter(r => r.team === team)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onClose}
          className="text-sm active:opacity-60"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Done
        </button>
        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
          {label} Characters
        </p>
        <div style={{ width: 40 }} />
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${label}…`}
          autoFocus
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

      {/* Role list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {roles.map(role => {
          const active = activeIds.includes(role.id);
          return (
            <button
              key={role.id}
              onClick={() => onToggle(role.id)}
              className="w-full text-left flex items-center gap-3 rounded-xl transition-all active:scale-[0.98]"
              style={{
                padding: '10px 14px',
                background: active ? `${color}22` : 'rgba(20,12,40,0.6)',
                border: `1px solid ${active ? color : 'var(--color-border)'}`,
              }}
            >
              {/* Checkbox */}
              <div
                className="flex-shrink-0 rounded-md flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  background: active ? color : 'transparent',
                  border: `2px solid ${active ? color : 'var(--color-border)'}`,
                  fontSize: 13,
                  color: '#000',
                  fontWeight: 700,
                }}
              >
                {active && '✓'}
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getIconPath(role.id)}
                alt={role.name}
                className="rounded-full object-contain flex-shrink-0"
                style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.4)', padding: 3 }}
              />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: active ? color : 'var(--color-text)' }}>
                  {role.name}
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                  {role.ability}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StorytoolsDrawer({ game, rolesDb }: Props) {
  const { toggleStoryTool } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [picking, setPicking] = useState<'loric' | 'fabled' | null>(null);

  const loricIds = game.loricIds ?? [];
  const fabledIds = game.fabledIds ?? [];
  const totalActive = loricIds.length + fabledIds.length;

  const loricColor = getRoleTeamColor('loric');
  const fabledColor = getRoleTeamColor('fabled');

  if (picking) {
    const field = picking === 'loric' ? 'loricIds' : 'fabledIds';
    const activeIds = picking === 'loric' ? loricIds : fabledIds;
    return (
      <RolePicker
        team={picking}
        rolesDb={rolesDb}
        activeIds={activeIds}
        onToggle={id => toggleStoryTool(game.id, field, id)}
        onClose={() => setPicking(null)}
      />
    );
  }

  function TokenRow({
    ids,
    team,
    label,
    color,
  }: {
    ids: string[];
    team: 'loric' | 'fabled';
    label: string;
    color: string;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
            {label}
          </p>
          <button
            onClick={() => setPicking(team)}
            className="text-xs rounded-lg px-2 py-1 transition-all active:opacity-60"
            style={{
              background: `${color}22`,
              border: `1px solid ${color}55`,
              color,
            }}
          >
            Edit
          </button>
        </div>

        {ids.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-dim)', opacity: 0.6 }}>
            None active
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ids.map(id => {
              const role = rolesDb[id];
              if (!role) return null;
              return (
                <div key={id} className="flex flex-col items-center gap-0.5" style={{ maxWidth: 56 }}>
                  <div
                    className="rounded-full relative"
                    style={{
                      width: 48,
                      height: 48,
                      background: `radial-gradient(circle at 40% 30%, ${color}44, #1a1025 70%)`,
                      border: `2px solid ${color}`,
                      boxShadow: `0 0 10px ${color}44`,
                      padding: '10%',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getIconPath(id)}
                      alt={role.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <span
                    className="text-center leading-tight"
                    style={{
                      fontSize: 9,
                      color,
                      maxWidth: 52,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {role.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
      )}

      {/* Drawer panel — opens downward from top-left */}
      {isOpen && (
        <div
          className="fixed top-16 left-4 z-40 rounded-2xl flex flex-col gap-4 p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
            minWidth: 240,
            maxWidth: 320,
          }}
        >
          <TokenRow ids={fabledIds} team="fabled" label="Fabled" color={fabledColor} />
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 -4px' }} />
          <TokenRow ids={loricIds} team="loric" label="Loric" color={loricColor} />
        </div>
      )}

      {/* Toggle button — fixed top-left */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed top-4 left-4 z-40 flex items-center gap-2 rounded-xl transition-all active:scale-95"
        style={{
          padding: '10px 14px',
          background: isOpen ? 'rgba(245,158,11,0.15)' : 'rgba(8,6,18,0.92)',
          border: `1px solid ${isOpen ? fabledColor : 'var(--color-border)'}`,
          color: isOpen ? fabledColor : 'var(--color-text-dim)',
          fontSize: 14,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
        aria-label="Loric and Fabled"
      >
        <span style={{ fontSize: 16 }}>⭐</span>
        <span>Tools</span>
        {totalActive > 0 && (
          <span
            className="rounded-full flex items-center justify-center font-bold"
            style={{
              width: 18,
              height: 18,
              background: fabledColor,
              color: '#000',
              fontSize: 10,
            }}
          >
            {totalActive}
          </span>
        )}
      </button>
    </>
  );
}
