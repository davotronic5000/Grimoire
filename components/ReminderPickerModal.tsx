'use client';

import { useState, useMemo } from 'react';
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

type Tab = 'inplay' | 'script';

interface ReminderItem {
  role: RoleDefinition;
  label: string;
}

export default function ReminderPickerModal({ player, game, rolesDb, onClose }: Props) {
  const { addReminderToken } = useStore();
  const isWide = useIsWide();
  const [tab, setTab] = useState<Tab>('inplay');
  const [search, setSearch] = useState('');

  // Global reminders: from all script roles, always shown in both tabs
  const globalItems = useMemo(() => {
    const items: ReminderItem[] = [];
    for (const id of game.scriptRoleIds) {
      const role = rolesDb[id];
      if (role) {
        for (const label of (role.remindersGlobal ?? [])) items.push({ role, label });
      }
    }
    return items;
  }, [game.scriptRoleIds, rolesDb]);

  const inPlayItems = useMemo(() => {
    const seen = new Set<string>();
    const items: ReminderItem[] = [];
    for (const p of game.players) {
      if (p.roleId && !seen.has(p.roleId)) {
        const role = rolesDb[p.roleId];
        if (role && role.reminders.length > 0) {
          seen.add(p.roleId);
          for (const label of role.reminders) items.push({ role, label });
        }
      }
    }
    return [...items, ...globalItems];
  }, [game.players, rolesDb, globalItems]);

  const scriptItems = useMemo(() => {
    const items: ReminderItem[] = [];
    for (const id of game.scriptRoleIds) {
      const role = rolesDb[id];
      if (role && role.reminders.length > 0) {
        for (const label of role.reminders) items.push({ role, label });
      }
    }
    return [...items, ...globalItems];
  }, [game.scriptRoleIds, rolesDb, globalItems]);

  const allItems = tab === 'inplay' ? inPlayItems : scriptItems;

  const TEAM_ORDER: Record<string, number> = { townsfolk: 0, outsider: 1, minion: 2, demon: 3, traveler: 4, loric: 5, fabled: 6 };

  const filteredItems = useMemo(() => {
    const items = search
      ? allItems.filter(item => item.role.name.toLowerCase().includes(search.toLowerCase()))
      : allItems;
    return [...items].sort((a, b) => (TEAM_ORDER[a.role.team] ?? 99) - (TEAM_ORDER[b.role.team] ?? 99));
  }, [allItems, search]);

  function handleSelect(item: ReminderItem) {
    addReminderToken(game.id, player.id, { sourceRoleId: item.role.id, label: item.label });
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
          Add Reminder · {player.name}
        </p>
        <div style={{ width: 56 }} />
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-2 flex-shrink-0">
        {(['inplay', 'script'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            className="flex-1 rounded-xl py-2.5 font-semibold text-sm transition-all"
            style={{
              background: tab === t ? 'rgba(201,168,76,0.15)' : 'rgba(20,12,40,0.6)',
              border: `1.5px solid ${tab === t ? 'var(--color-gold)' : 'var(--color-border)'}`,
              color: tab === t ? 'var(--color-gold)' : 'var(--color-text-dim)',
            }}
          >
            {t === 'inplay' ? 'In Play' : 'Full Script'}
          </button>
        ))}
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
        {filteredItems.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-dim)' }}>
            {search ? 'No roles match your search' : 'No reminders available'}
          </p>
        ) : (
          <div className={`grid gap-3 pt-3 ${isWide ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {filteredItems.map((item, i) => {
              const teamColor = getRoleTeamColor(item.role.team);
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(item)}
                  className="flex flex-col items-center rounded-2xl transition-all active:scale-95"
                  style={{
                    padding: '14px 8px 12px',
                    background: `${teamColor}14`,
                    border: `1px solid ${teamColor}44`,
                    gap: 8,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getRoleIconPath(item.role)}
                    alt={item.role.name}
                    className="rounded-full object-contain flex-shrink-0"
                    style={{
                      width: isWide ? 52 : 44,
                      height: isWide ? 52 : 44,
                      background: 'rgba(0,0,0,0.35)',
                      padding: 4,
                    }}
                    onError={e => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(item.role.team); }
                    }}
                  />
                  <p
                    className="text-center font-medium leading-tight"
                    style={{
                      fontSize: isWide ? 13 : 12,
                      color: 'var(--color-text)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-center leading-none"
                    style={{
                      fontSize: isWide ? 11 : 10,
                      color: teamColor,
                      opacity: 0.8,
                    }}
                  >
                    {item.role.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
