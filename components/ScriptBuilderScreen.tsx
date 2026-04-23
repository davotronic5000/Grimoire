'use client';

import { useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import type { ParsedScript, RoleDefinition, RoleTeam } from '@/lib/types';
import { getGenericIconPath, getRoleIconPath, getRoleTeamColor, TEAM_LABELS } from '@/lib/roles';
import { useIsWide } from '@/lib/hooks';
import ClearableInput from './ClearableInput';
import ScriptScannerModal from './ScriptScannerModal';

interface Props {
  rolesDb: Record<string, RoleDefinition>;
  onSelect: (script: ParsedScript) => void;
  onClose: () => void;
}

const TEAM_TABS = ['all', 'townsfolk', 'outsider', 'minion', 'demon', 'traveler'] as const;
type TeamTab = (typeof TEAM_TABS)[number];

const TEAM_SORT: Record<string, number> = {
  townsfolk: 0, outsider: 1, minion: 2, demon: 3, traveler: 4, loric: 5, fabled: 6,
};

export default function ScriptBuilderScreen({ rolesDb, onSelect, onClose }: Props) {
  const isWide = useIsWide();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TeamTab>('all');
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scriptName, setScriptName] = useState('Custom Script');
  const [editingName, setEditingName] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [editingAuthor, setEditingAuthor] = useState(false);

  const allRoles = useMemo(() =>
    Object.values(rolesDb)
      .filter(r => !!r.team && r.team !== 'fabled' && r.team !== 'loric')
      .sort((a, b) => (TEAM_SORT[a.team] ?? 99) - (TEAM_SORT[b.team] ?? 99) || a.name.localeCompare(b.name)),
    [rolesDb]
  );

  const filtered = useMemo(() => {
    return allRoles.filter(r => {
      const matchesTab = tab === 'all' || r.team === tab;
      const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [allRoles, tab, search]);

  // Count selected per team for tab badges
  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of Array.from(selected)) {
      const role = rolesDb[id];
      if (role?.team) counts[role.team] = (counts[role.team] ?? 0) + 1;
    }
    return counts;
  }, [selected, rolesDb]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleScanConfirm(roleIds: string[]) {
    setSelected(new Set(roleIds));
    setShowScanner(false);
  }

  function handleDone() {
    if (selected.size === 0) return;
    onSelect({
      meta: {
        id: `custom-${nanoid(8)}`,
        name: scriptName.trim() || 'Custom Script',
        author: authorName.trim() || undefined,
      },
      roleIds: Array.from(selected),
    });
  }

  const canDone = selected.size > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5"
        style={{ height: 60, borderBottom: '1px solid var(--color-border)' }}
      >
        <button onClick={onClose} className="text-sm active:opacity-60" style={{ color: 'var(--color-text-dim)' }}>
          Cancel
        </button>

        {/* Editable script name */}
        {editingName ? (
          <input
            type="text"
            value={scriptName}
            onChange={e => setScriptName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}
            autoFocus
            className="outline-none text-center font-semibold rounded-lg px-2 py-1"
            style={{
              fontSize: 16,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-gold-dim)',
              color: 'var(--color-text)',
              maxWidth: 200,
            }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 active:opacity-60"
          >
            <p className="font-semibold" style={{ fontSize: 16, color: 'var(--color-text)' }}>
              {scriptName}
            </p>
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>✏️</span>
          </button>
        )}

        <button
          onClick={handleDone}
          disabled={!canDone}
          className="text-sm font-semibold rounded-lg px-3 py-1.5 transition-all active:scale-95"
          style={{
            background: canDone ? 'rgba(99,102,241,0.2)' : 'transparent',
            border: `1px solid ${canDone ? '#6366f1' : 'transparent'}`,
            color: canDone ? '#a5b4fc' : 'transparent',
          }}
        >
          Use ({selected.size})
        </button>
      </div>

      {/* Author row */}
      <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-dim)' }}>by</span>
        {editingAuthor ? (
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            onBlur={() => setEditingAuthor(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingAuthor(false); }}
            autoFocus
            placeholder="Author name…"
            className="flex-1 outline-none rounded-lg px-2 py-1"
            style={{
              fontSize: 14,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-gold-dim)',
              color: 'var(--color-text)',
            }}
          />
        ) : (
          <button
            onClick={() => setEditingAuthor(true)}
            className="flex-1 text-left active:opacity-60 flex items-center gap-1.5"
          >
            <span style={{ fontSize: 14, color: authorName ? 'var(--color-text)' : 'var(--color-text-dim)' }}>
              {authorName || 'Add author…'}
            </span>
            {authorName && <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>✏️</span>}
          </button>
        )}
      </div>

      {/* Scan + Search row */}
      <div className="flex-shrink-0 flex gap-2 px-4 pt-3 pb-2">
        <button
          onClick={() => setShowScanner(true)}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-xl font-semibold transition-all active:scale-95"
          style={{
            padding: '10px 14px',
            fontSize: 14,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.5)',
            color: '#a5b4fc',
          }}
        >
          📷 Scan
        </button>
        <ClearableInput
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search roles…"
          className="flex-1 rounded-xl outline-none"
          style={{
            padding: '10px 14px',
            fontSize: 15,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {/* Team tabs */}
      <div className="flex-shrink-0 flex gap-2 px-4 pb-3 overflow-x-auto">
        {TEAM_TABS.map(t => {
          const count = t === 'all' ? selected.size : (teamCounts[t] ?? 0);
          const isActive = tab === t;
          const color = t === 'all' ? 'var(--color-gold)' : getRoleTeamColor(t as RoleTeam);
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-shrink-0 rounded-full font-medium transition-all"
              style={{
                padding: '7px 14px',
                fontSize: 13,
                background: isActive ? (t === 'all' ? 'rgba(201,168,76,0.2)' : `${getRoleTeamColor(t as RoleTeam)}33`) : 'var(--color-surface)',
                border: `1px solid ${isActive ? color : 'var(--color-border)'}`,
                color: isActive ? color : 'var(--color-text-dim)',
              }}
            >
              {t === 'all' ? 'All' : TEAM_LABELS[t as RoleTeam]}
              {count > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5"
                  style={{
                    fontSize: 11,
                    background: isActive ? color : 'var(--color-border)',
                    color: isActive ? (t === 'all' ? '#000' : '#fff') : 'var(--color-text-dim)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Role grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-dim)' }}>
            No roles match
          </p>
        ) : (
          <div className={`grid gap-3 ${isWide ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {filtered.map(role => {
              const isSelected = selected.has(role.id);
              const color = getRoleTeamColor(role.team);
              return (
                <button
                  key={role.id}
                  onClick={() => toggle(role.id)}
                  className="flex flex-col items-center rounded-xl transition-all active:scale-95"
                  style={{
                    padding: isWide ? '14px 8px' : '10px 6px',
                    background: isSelected ? `${color}33` : 'var(--color-surface)',
                    border: `1px solid ${isSelected ? color : 'var(--color-border)'}`,
                    boxShadow: isSelected ? `0 0 10px ${color}44` : 'none',
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
                      color: isSelected ? color : 'var(--color-text)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {role.name}
                  </p>
                  {isSelected && (
                    <span style={{ fontSize: 11, color, marginTop: 2 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {canDone && (
        <div className="flex-shrink-0 px-4 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleDone}
            className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
              border: '1px solid #6366f1',
              color: '#a5b4fc',
              fontSize: 17,
            }}
          >
            Use Script — {selected.size} roles
          </button>
        </div>
      )}

      {showScanner && (
        <ScriptScannerModal
          rolesDb={rolesDb}
          onConfirm={handleScanConfirm}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
