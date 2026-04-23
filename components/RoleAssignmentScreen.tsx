'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Game, RoleDefinition } from '@/lib/types';
import { useStore } from '@/lib/store';
import {
  getGenericIconPath,
  getRoleIconPath,
  getRoleTeamColor,
  TEAM_COLORS,
  TEAM_LABELS,
  getRoleDistribution,
} from '@/lib/roles';
import type { RoleTeam } from '@/lib/types';

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  onClose: () => void;
  onStartAssign: (roleCounts: Map<string, number>) => void;
}

interface Tile {
  roleId: string;
  assignedPlayerId: string | null;
}

const TEAM_ORDER: RoleTeam[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler'];

/**
 * Roles that inherently support multiple copies and should always show the
 * stepper regardless of the global "allow duplicates" toggle.
 * Matched by ID (various casing/underscore conventions) and by display name.
 */
/**
 * Roles that need a storyteller warning when included in a deal because they
 * require special out-of-band handling (the player is told a different role).
 */
const WARN_ROLE_IDS = new Set(['drunk', 'marionette']);
function isWarnRole(role: RoleDefinition): boolean {
  const name = role.name.toLowerCase().replace(/\s+/g, '');
  return WARN_ROLE_IDS.has(role.id) || WARN_ROLE_IDS.has(role.id.toLowerCase()) || name === 'drunk' || name === 'marionette';
}

const ALWAYS_MULTI_IDS = new Set([
  'legion',
  'village_idiot',
  'villageidiot',
  'villageIdiot',
]);
function alwaysMulti(role: RoleDefinition): boolean {
  const name = role.name.toLowerCase().replace(/\s+/g, '');
  return (
    ALWAYS_MULTI_IDS.has(role.id) ||
    ALWAYS_MULTI_IDS.has(role.id.toLowerCase()) ||
    name === 'legion' ||
    name === 'villageidiot'
  );
}

export default function RoleAssignmentScreen({ game, rolesDb, onClose, onStartAssign }: Props) {
  const { updatePlayer } = useStore();
  const [phase, setPhase] = useState<'select' | 'assign'>('select');

  // ── Role counts: Map<roleId, count> — supports duplicates ──────────
  const [roleCounts, setRoleCounts] = useState<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    game.players.forEach(p => {
      if (p.roleId && rolesDb[p.roleId]) {
        counts.set(p.roleId, (counts.get(p.roleId) ?? 0) + 1);
      }
    });
    return counts;
  });
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [search, setSearch] = useState('');
  const [showDealWarning, setShowDealWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<'shuffle' | 'assign'>('shuffle');

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [activeTileIdx, setActiveTileIdx] = useState<number | null>(null);
  const lastActiveTileRef = useRef<{ tile: Tile; idx: number } | null>(null);

  const playerCount = game.players.length;
  const dist = getRoleDistribution(playerCount);

  // Derived selection values
  const selectedTotal = useMemo(() => {
    let n = 0;
    roleCounts.forEach(c => { n += c; });
    return n;
  }, [roleCounts]);

  const selectionCounts = useMemo(() => {
    const counts: Partial<Record<RoleTeam, number>> = {};
    roleCounts.forEach((count, id) => {
      const role = rolesDb[id];
      if (!role?.team || count === 0) return;
      const team = role.team as RoleTeam;
      counts[team] = (counts[team] ?? 0) + count;
    });
    return counts;
  }, [roleCounts, rolesDb]);

  const canShuffle = selectedTotal === playerCount;

  // Group script roles by team
  const rolesByTeam = useMemo(() => {
    const groups: Partial<Record<RoleTeam, RoleDefinition[]>> = {};
    for (const id of game.scriptRoleIds) {
      const role = rolesDb[id];
      if (!role || !role.team) continue;
      const team = role.team as RoleTeam;
      if (!groups[team]) groups[team] = [];
      groups[team]!.push(role);
    }
    return groups;
  }, [game.scriptRoleIds, rolesDb]);

  // ── Role count helpers ──────────────────────────────────────────────
  function setCount(id: string, count: number) {
    setRoleCounts(prev => {
      const next = new Map(prev);
      if (count <= 0) next.delete(id);
      else next.set(id, count);
      return next;
    });
  }

  function toggleRole(id: string) {
    const current = roleCounts.get(id) ?? 0;
    setCount(id, current > 0 ? 0 : 1);
  }

  function toggleDuplicates(enabled: boolean) {
    setAllowDuplicates(enabled);
    if (!enabled) {
      // Cap counts at 1 when disabling duplicates, but preserve counts for
      // roles that always allow multiples (Legion, Village Idiot).
      setRoleCounts(prev => {
        const next = new Map<string, number>();
        prev.forEach((count, id) => {
          if (count <= 0) return;
          const role = rolesDb[id];
          next.set(id, role && alwaysMulti(role) ? count : 1);
        });
        return next;
      });
    }
  }

  // ── Random role selection ───────────────────────────────────────────
  function randomiseRoles() {
    const next = new Map<string, number>();
    const teams: Array<keyof typeof dist> = ['townsfolk', 'outsider', 'minion', 'demon'];
    for (const team of teams) {
      const needed = dist[team];
      if (needed <= 0) continue;
      const pool = (rolesByTeam[team as RoleTeam] ?? []).slice();
      // Fisher-Yates shuffle the pool
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const picked = pool.slice(0, needed);
      for (const role of picked) next.set(role.id, 1);
    }
    setRoleCounts(next);
  }

  // ── Shuffle & deal ──────────────────────────────────────────────────
  function doShuffle() {
    const arr: Tile[] = [];
    roleCounts.forEach((count, roleId) => {
      for (let i = 0; i < count; i++) arr.push({ roleId, assignedPlayerId: null });
    });
    // Fisher-Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setTiles(arr);
    setActiveTileIdx(null);
    setShowDealWarning(false);
    setPhase('assign');
  }

  // Detect whether any warn-roles are selected
  const warnRoles = useMemo(() => {
    const found: RoleDefinition[] = [];
    roleCounts.forEach((count, id) => {
      if (count > 0) {
        const role = rolesDb[id];
        if (role && isWarnRole(role)) found.push(role);
      }
    });
    return found;
  }, [roleCounts, rolesDb]);

  function doAssignRoles() {
    setShowDealWarning(false);
    onStartAssign(roleCounts);
  }

  function handleShuffle() {
    if (warnRoles.length > 0) {
      setPendingAction('shuffle');
      setShowDealWarning(true);
    } else {
      doShuffle();
    }
  }

  function handleAssignRoles() {
    if (warnRoles.length > 0) {
      setPendingAction('assign');
      setShowDealWarning(true);
    } else {
      doAssignRoles();
    }
  }

  function handleAssign(playerId: string) {
    if (activeTileIdx === null) return;
    const idx = activeTileIdx;
    setTiles(prev => {
      const tile = prev[idx];
      if (!tile) return prev;
      updatePlayer(game.id, playerId, { roleId: tile.roleId });
      return prev.map((t, i) => {
        if (i === idx) return { ...t, assignedPlayerId: playerId };
        if (t.assignedPlayerId === playerId) return { ...t, assignedPlayerId: null };
        return t;
      });
    });
    setActiveTileIdx(null);
  }

  function handleUnassign(tileIdx: number) {
    const tile = tiles[tileIdx];
    if (!tile.assignedPlayerId) return;
    updatePlayer(game.id, tile.assignedPlayerId, { roleId: null });
    setTiles(prev =>
      prev.map((t, i) => (i === tileIdx ? { ...t, assignedPlayerId: null } : t))
    );
  }

  const assignedCount = tiles.filter(t => t.assignedPlayerId !== null).length;

  // ══════════════════════════════════════════════════════════════
  // SELECT PHASE
  // ══════════════════════════════════════════════════════════════
  if (phase === 'select') {
    return (
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{ zIndex: 80, background: 'var(--botc-bg)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{ height: 56, background: 'rgba(8,6,18,0.95)', borderBottom: '1px solid var(--botc-border)' }}
        >
          <button
            onClick={onClose}
            className="botc-btn-secondary"
            style={{ padding: '8px 14px', fontSize: 15 }}
          >
            ✕ Cancel
          </button>
          <p className="font-semibold" style={{ color: 'var(--botc-text)', fontSize: 16 }}>
            Select Roles
          </p>
          <button
            onClick={randomiseRoles}
            className="flex items-center gap-1 rounded-xl font-semibold active:scale-95"
            style={{
              padding: '8px 14px',
              minHeight: 40,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--botc-border)',
              color: 'var(--botc-muted)',
              fontSize: 15,
            }}
            aria-label="Random selection"
          >
            🎲
          </button>
        </div>

        {/* Distribution guide + duplicate toggle */}
        <div
          className="flex items-center flex-shrink-0 flex-wrap"
          style={{
            padding: '10px 16px',
            gap: '10px',
            background: 'rgba(8,6,18,0.8)',
            borderBottom: '1px solid var(--botc-border)',
          }}
        >
          {/* Count indicator */}
          <span style={{ fontSize: 13, color: 'var(--botc-muted)', marginRight: 2 }}>
            {selectedTotal}/{playerCount}
          </span>

          {/* Team distribution */}
          {(['townsfolk', 'outsider', 'minion', 'demon'] as RoleTeam[]).map(team => {
            const target = dist[team as keyof typeof dist] ?? 0;
            const actual = selectionCounts[team] ?? 0;
            const ok = actual === target;
            return (
              <span
                key={team}
                style={{ fontSize: 12, color: ok ? TEAM_COLORS[team] : '#ef4444', fontWeight: ok ? 600 : 700 }}
              >
                {TEAM_LABELS[team]}: {actual}/{target}
              </span>
            );
          })}

          {/* Duplicate toggle — pushed to the right */}
          <button
            onClick={() => toggleDuplicates(!allowDuplicates)}
            className="flex items-center gap-2 rounded-lg ml-auto flex-shrink-0"
            style={{
              padding: '5px 10px',
              background: allowDuplicates ? 'rgba(201,168,76,0.15)' : 'rgba(30,20,50,0.5)',
              border: `1px solid ${allowDuplicates ? 'var(--botc-gold-dim)' : 'var(--botc-border)'}`,
              fontSize: 12,
              fontWeight: 600,
              color: allowDuplicates ? 'var(--botc-gold)' : 'var(--botc-muted)',
              transition: 'all 0.15s',
            }}
            aria-pressed={allowDuplicates}
          >
            {/* Toggle pill */}
            <span
              style={{
                display: 'inline-flex',
                width: 28,
                height: 16,
                borderRadius: 8,
                background: allowDuplicates ? 'var(--botc-gold)' : 'rgba(255,255,255,0.15)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: allowDuplicates ? 14 : 2,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </span>
            Allow duplicates
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--botc-border)', background: 'rgba(8,6,18,0.6)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--botc-muted)', pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search roles…"
              className="botc-input"
              style={{ paddingLeft: 34, paddingTop: 9, paddingBottom: 9, fontSize: 15 }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--botc-muted)', lineHeight: 1 }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Role list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px 32px' }}>
          {TEAM_ORDER.map(team => {
            const allRoles = rolesByTeam[team];
            if (!allRoles || allRoles.length === 0) return null;
            const q = search.trim().toLowerCase();
            const roles = q
              ? allRoles.filter(r =>
                  r.name.toLowerCase().includes(q) ||
                  r.ability.toLowerCase().includes(q)
                )
              : allRoles;
            if (roles.length === 0) return null;
            return (
              <div key={team} className="mb-4">
                <p
                  className="font-semibold mb-2"
                  style={{ fontSize: 12, color: TEAM_COLORS[team], textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  {TEAM_LABELS[team]}
                </p>
                <div className="flex flex-col gap-1">
                  {roles.map(role => {
                    const count    = roleCounts.get(role.id) ?? 0;
                    const selected = count > 0;
                    const isMulti  = allowDuplicates || alwaysMulti(role);
                    return (
                      <button
                        key={role.id}
                        onClick={() => !isMulti && toggleRole(role.id)}
                        className="flex items-center gap-3 rounded-xl text-left"
                        style={{
                          padding: '10px 14px',
                          background: selected
                            ? `rgba(${hexToRgb(TEAM_COLORS[team])}, 0.12)`
                            : 'rgba(30,20,50,0.4)',
                          border: `1px solid ${selected ? TEAM_COLORS[team] : 'var(--botc-border)'}`,
                          transition: 'background 0.15s, border-color 0.15s',
                          cursor: isMulti ? 'default' : 'pointer',
                        }}
                      >
                        {/* Role icon */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: `radial-gradient(circle at 40% 30%, ${TEAM_COLORS[team]}33, #1a1025 70%)`,
                            border: `1.5px solid ${selected ? TEAM_COLORS[team] : 'rgba(255,255,255,0.12)'}`,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getRoleIconPath(role)}
                            alt={role.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }}
                            onError={e => {
                              const img = e.target as HTMLImageElement;
                              if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                            }}
                          />
                        </div>

                        {/* Name + ability */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p style={{ fontSize: 15, color: selected ? 'var(--botc-text)' : 'var(--botc-muted)', fontWeight: selected ? 600 : 400 }}>
                              {role.name}
                            </p>
                            {alwaysMulti(role) && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: `rgba(${hexToRgb(TEAM_COLORS[team])}, 0.18)`,
                                  border: `1px solid ${TEAM_COLORS[team]}55`,
                                  color: TEAM_COLORS[team],
                                  flexShrink: 0,
                                }}
                              >
                                multi
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--botc-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {role.ability}
                          </p>
                        </div>

                        {/* Right side: stepper for multi roles, checkbox otherwise */}
                        {isMulti ? (
                          <div
                            className="flex items-center flex-shrink-0"
                            style={{ gap: 0 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setCount(role.id, Math.max(0, count - 1))}
                              disabled={count === 0}
                              className="flex items-center justify-center rounded-l-lg"
                              style={{
                                width: 32,
                                height: 32,
                                background: 'rgba(30,20,50,0.7)',
                                border: `1px solid ${count > 0 ? TEAM_COLORS[team] + '88' : 'var(--botc-border)'}`,
                                borderRight: 'none',
                                color: count > 0 ? TEAM_COLORS[team] : 'var(--botc-muted)',
                                fontSize: 18,
                                opacity: count === 0 ? 0.35 : 1,
                                cursor: count === 0 ? 'default' : 'pointer',
                              }}
                              aria-label={`Remove one ${role.name}`}
                            >
                              −
                            </button>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: count > 0
                                  ? `rgba(${hexToRgb(TEAM_COLORS[team])}, 0.18)`
                                  : 'rgba(20,12,36,0.6)',
                                border: `1px solid ${count > 0 ? TEAM_COLORS[team] + '88' : 'var(--botc-border)'}`,
                                borderLeft: 'none',
                                borderRight: 'none',
                                fontWeight: 700,
                                fontSize: 14,
                                color: count > 0 ? TEAM_COLORS[team] : 'var(--botc-muted)',
                              }}
                            >
                              {count}
                            </div>
                            <button
                              onClick={() => setCount(role.id, count + 1)}
                              className="flex items-center justify-center rounded-r-lg"
                              style={{
                                width: 32,
                                height: 32,
                                background: 'rgba(30,20,50,0.7)',
                                border: `1px solid ${count > 0 ? TEAM_COLORS[team] + '88' : 'var(--botc-border)'}`,
                                borderLeft: 'none',
                                color: TEAM_COLORS[team],
                                fontSize: 18,
                                cursor: 'pointer',
                              }}
                              aria-label={`Add one ${role.name}`}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: selected ? TEAM_COLORS[team] : 'transparent',
                              border: `2px solid ${selected ? TEAM_COLORS[team] : 'rgba(255,255,255,0.2)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {selected && <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>✓</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Action footer ────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--botc-border)', background: 'rgba(8,6,18,0.97)' }}
        >
          <button
            onClick={handleAssignRoles}
            disabled={!canShuffle}
            className="flex-1 rounded-xl font-semibold active:scale-95"
            style={{
              padding: '13px 12px',
              fontSize: 15,
              background: canShuffle ? 'rgba(99,102,241,0.18)' : 'rgba(30,20,50,0.4)',
              border: `1px solid ${canShuffle ? 'rgba(99,102,241,0.6)' : 'var(--botc-border)'}`,
              color: canShuffle ? '#a5b4fc' : 'var(--botc-muted)',
              cursor: canShuffle ? 'pointer' : 'default',
              opacity: canShuffle ? 1 : 0.5,
            }}
          >
            🎯 Assign Roles
          </button>
          <button
            onClick={handleShuffle}
            disabled={!canShuffle}
            className="flex-1 rounded-xl font-semibold active:scale-95"
            style={{
              padding: '13px 12px',
              fontSize: 15,
              background: canShuffle ? 'linear-gradient(135deg, #2d1f5e, #3d2878)' : 'rgba(30,20,50,0.4)',
              border: `1px solid ${canShuffle ? '#6366f1' : 'var(--botc-border)'}`,
              color: canShuffle ? '#a5b4fc' : 'var(--botc-muted)',
              cursor: canShuffle ? 'pointer' : 'default',
              opacity: canShuffle ? 1 : 0.5,
            }}
          >
            🔀 Shuffle & Deal
          </button>
        </div>

        {/* ── Warning confirmation modal ───────────────────────── */}
        {showDealWarning && (
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 90, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowDealWarning(false)}
            />
            <div
              className="fixed botc-modal-card"
              style={{
                zIndex: 91,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: 380,
                width: 'calc(100vw - 40px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Icon + heading */}
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 28 }}>⚠️</span>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--botc-gold)' }}>
                  Special role{warnRoles.length > 1 ? 's' : ''} included
                </p>
              </div>

              {/* Explanation per warn role */}
              <div className="flex flex-col gap-3">
                {warnRoles.map(role => (
                  <div
                    key={role.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>
                      {role.name}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--botc-muted)', lineHeight: 1.5 }}>
                      {role.id === 'drunk' || role.name.toLowerCase() === 'drunk'
                        ? 'The Drunk thinks they are a Townsfolk but isn\'t. You\'ll need to tell them a fake role after dealing.'
                        : 'The Marionette thinks they are a good role but is actually a Minion. Co-ordinate with the Demon player before revealing.'}
                    </p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 13, color: 'var(--botc-muted)', lineHeight: 1.5 }}>
                Continue dealing and handle the swap manually during role reveal.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDealWarning(false)}
                  className="botc-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => pendingAction === 'shuffle' ? doShuffle() : doAssignRoles()}
                  className="flex-1 rounded-xl py-3 font-semibold active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
                    border: '1px solid #6366f1',
                    color: '#a5b4fc',
                    fontSize: 15,
                  }}
                >
                  {pendingAction === 'shuffle' ? 'Deal anyway →' : 'Assign anyway →'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ASSIGN PHASE
  // ══════════════════════════════════════════════════════════════
  const activeTile = activeTileIdx !== null ? tiles[activeTileIdx] : null;
  useEffect(() => {
    if (activeTile && activeTileIdx !== null) {
      lastActiveTileRef.current = { tile: activeTile, idx: activeTileIdx };
    }
  }, [activeTile, activeTileIdx]);
  const displayTile = activeTile ?? lastActiveTileRef.current?.tile ?? null;
  const displayTileIdx = activeTile ? activeTileIdx! : (lastActiveTileRef.current?.idx ?? 0);
  const displayRole = displayTile ? rolesDb[displayTile.roleId] : null;
  const roleColor = displayRole ? getRoleTeamColor(displayRole.team) : 'var(--botc-gold)';

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ zIndex: 80, background: 'var(--botc-bg)' }}
    >
      {/* ── Tile grid view ── */}
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 56, background: 'rgba(8,6,18,0.95)', borderBottom: '1px solid var(--botc-border)' }}
      >
        <button
          onClick={() => setPhase('select')}
          className="botc-btn-secondary"
          style={{ padding: '8px 14px', fontSize: 15 }}
        >
          ← Back
        </button>
        <p className="font-semibold" style={{ color: 'var(--botc-text)', fontSize: 16 }}>
          Assign Roles — {assignedCount}/{tiles.length}
        </p>
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-xl active:opacity-60"
          style={{
            padding: '8px 14px',
            background: assignedCount === tiles.length
              ? 'linear-gradient(135deg, #14532d, #166534)'
              : 'rgba(30,20,50,0.6)',
            border: `1px solid ${assignedCount === tiles.length ? '#22c55e' : 'var(--botc-border)'}`,
            color: assignedCount === tiles.length ? '#86efac' : 'var(--botc-muted)',
            fontSize: 15,
          }}
        >
          Done ✓
        </button>
      </div>

      {/* Tile grid */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 12,
          }}
        >
          {tiles.map((tile, idx) => {
            const assignedPlayer = tile.assignedPlayerId
              ? game.players.find(p => p.id === tile.assignedPlayerId)
              : null;
            const isClaimed = !!assignedPlayer;

            return (
              <button
                key={idx}
                onClick={() => setActiveTileIdx(idx)}
                className="flex flex-col items-center justify-center rounded-2xl active:scale-95"
                style={{
                  padding: '12px 8px 10px',
                  background: isClaimed ? 'rgba(30,20,50,0.7)' : 'rgba(20,12,38,0.8)',
                  border: `2px solid ${isClaimed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  aspectRatio: '3/4',
                  position: 'relative',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                aria-label={`Tile ${idx + 1}`}
              >
                <span style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                  {idx + 1}
                </span>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: isClaimed ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px ${isClaimed ? 'solid rgba(99,102,241,0.5)' : 'dashed rgba(255,255,255,0.15)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                    fontSize: 20,
                  }}
                >
                  {isClaimed ? '✓' : '?'}
                </div>
                <span style={{
                  fontSize: isClaimed ? 11 : 13,
                  fontWeight: 600,
                  color: isClaimed ? 'var(--botc-text)' : 'rgba(255,255,255,0.2)',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  padding: '0 4px',
                }}>
                  {isClaimed ? assignedPlayer!.name : String(idx + 1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Role + player picker — slides up over the tile grid ── */}
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{
          zIndex: 84,
          background: 'var(--botc-bg)',
          transform: activeTileIdx !== null ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Sub-header */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{
            height: 56,
            background: 'rgba(8,6,18,0.95)',
            borderBottom: `1px solid ${roleColor}44`,
          }}
        >
          <button
            onClick={() => setActiveTileIdx(null)}
            className="botc-btn-secondary"
            style={{ padding: '8px 14px', fontSize: 15 }}
          >
            ← Back
          </button>
          <p className="font-semibold" style={{ color: 'var(--botc-muted)', fontSize: 14 }}>
            Tile {displayTileIdx + 1}
          </p>
          {displayTile?.assignedPlayerId ? (
            <button
              onClick={() => { handleUnassign(displayTileIdx); setActiveTileIdx(null); }}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: 13,
              }}
            >
              Unassign
            </button>
          ) : (
            <div style={{ width: 80 }} />
          )}
        </div>

        {/* Top half — role display */}
        <div
          className="flex flex-col items-center justify-center flex-shrink-0"
          style={{
            height: '45%',
            padding: '16px 24px 8px',
            background: `radial-gradient(ellipse at 50% 0%, ${roleColor}18 0%, transparent 70%)`,
            borderBottom: `1px solid ${roleColor}22`,
          }}
        >
          {displayRole && (
            <>
              <div
                style={{
                  width: 'min(28vmin, 140px)',
                  height: 'min(28vmin, 140px)',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: `radial-gradient(circle at 40% 30%, ${roleColor}44, #0a0614 70%)`,
                  border: `3px solid ${roleColor}88`,
                  boxShadow: `0 0 32px ${roleColor}44`,
                  marginBottom: 12,
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getRoleIconPath(displayRole)}
                  alt={displayRole.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8%' }}
                  onError={e => {
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(displayRole.team); }
                  }}
                />
              </div>
              <p style={{ fontSize: 'clamp(20px, 4vmin, 28px)', fontWeight: 700, color: roleColor, textAlign: 'center', lineHeight: 1.2, marginBottom: 6 }}>
                {displayRole.name}
              </p>
              <p style={{ fontSize: 'clamp(12px, 2.2vmin, 15px)', color: 'var(--botc-muted)', textAlign: 'center', lineHeight: 1.5, fontStyle: 'italic', maxWidth: 360 }}>
                "{displayRole.ability}"
              </p>
            </>
          )}
        </div>

        {/* Bottom half — player list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px 32px' }}>
          <p style={{ fontSize: 11, color: 'var(--botc-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, padding: '0 4px' }}>
            Choose a player
          </p>
          <div className="flex flex-col gap-2">
            {displayTile && [...game.players].sort((a, b) => {
              const aTaken = a.id !== displayTile.assignedPlayerId && tiles.some((t, i) => i !== displayTileIdx && t.assignedPlayerId === a.id);
              const bTaken = b.id !== displayTile.assignedPlayerId && tiles.some((t, i) => i !== displayTileIdx && t.assignedPlayerId === b.id);
              return Number(aTaken) - Number(bTaken);
            }).map(player => {
              const isCurrent    = displayTile.assignedPlayerId === player.id;
              const takenTileIdx = isCurrent ? -1 : tiles.findIndex((t, i) => i !== displayTileIdx && t.assignedPlayerId === player.id);
              const isTaken      = takenTileIdx !== -1;

              return (
                <div key={player.id} className="flex items-center gap-2">
                  <button
                    onClick={() => { handleAssign(player.id); setActiveTileIdx(null); }}
                    className="flex items-center gap-3 rounded-xl text-left flex-1 active:scale-[0.98]"
                    style={{
                      padding: '14px 18px',
                      background: isCurrent
                        ? `rgba(${hexToRgb(roleColor)}, 0.15)`
                        : 'rgba(30,20,50,0.5)',
                      border: `1px solid ${isCurrent ? roleColor + '88' : 'var(--botc-border)'}`,
                      opacity: isTaken ? 0.38 : 1,
                      transition: 'background 0.1s, opacity 0.1s',
                    }}
                    disabled={isTaken}
                  >
                    <span style={{ fontSize: 17, color: isCurrent ? roleColor : 'var(--botc-text)', fontWeight: isCurrent ? 700 : 500, flex: 1 }}>
                      {player.name}
                    </span>
                    {isCurrent && <span style={{ fontSize: 12, color: roleColor, fontWeight: 600 }}>✓</span>}
                    {isTaken   && <span style={{ fontSize: 12, color: 'var(--botc-muted)' }}>taken</span>}
                  </button>
                  {isCurrent && (
                    <button
                      onClick={() => { handleUnassign(displayTileIdx); setActiveTileIdx(null); }}
                      className="flex items-center justify-center rounded-xl active:scale-90 flex-shrink-0"
                      style={{
                        width: 44,
                        height: 44,
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#ef4444',
                        fontSize: 18,
                      }}
                      aria-label="Remove assignment"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '255,255,255';
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}
