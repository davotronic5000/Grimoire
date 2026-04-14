'use client';

import { useState, useMemo } from 'react';
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
}

interface Tile {
  roleId: string;
  assignedPlayerId: string | null;
}

const TEAM_ORDER: RoleTeam[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler'];

export default function RoleAssignmentScreen({ game, rolesDb, onClose }: Props) {
  const { updatePlayer } = useStore();
  const [phase, setPhase] = useState<'select' | 'assign'>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Pre-select roles that are already assigned to players
    const ids = new Set<string>();
    game.players.forEach(p => {
      if (p.roleId && rolesDb[p.roleId]) ids.add(p.roleId);
    });
    return ids;
  });
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [activeTileIdx, setActiveTileIdx] = useState<number | null>(null);

  const playerCount = game.players.length;
  const dist = getRoleDistribution(playerCount);

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

  // Selection counts by team
  const selectionCounts = useMemo(() => {
    const counts: Partial<Record<RoleTeam, number>> = {};
    selectedIds.forEach(id => {
      const role = rolesDb[id];
      if (!role?.team) return;
      const team = role.team as RoleTeam;
      counts[team] = (counts[team] ?? 0) + 1;
    });
    return counts;
  }, [selectedIds, rolesDb]);

  const selectedTotal = selectedIds.size;
  const canShuffle = selectedTotal === playerCount;

  function toggleRole(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleShuffle() {
    // Fisher-Yates shuffle
    const arr: Tile[] = Array.from(selectedIds).map(roleId => ({
      roleId,
      assignedPlayerId: null,
    }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setTiles(arr);
    setActiveTileIdx(null);
    setPhase('assign');
  }

  function handleAssign(playerId: string) {
    if (activeTileIdx === null) return;
    const tile = tiles[activeTileIdx];

    // If this player was already assigned to a different tile, clear that tile
    setTiles(prev =>
      prev.map((t, i) => {
        if (i === activeTileIdx) return { ...t, assignedPlayerId: playerId };
        if (t.assignedPlayerId === playerId) return { ...t, assignedPlayerId: null };
        return t;
      })
    );
    updatePlayer(game.id, playerId, { roleId: tile.roleId });
    setActiveTileIdx(null);
  }

  function handleUnassign(tileIdx: number) {
    const tile = tiles[tileIdx];
    if (!tile.assignedPlayerId) return;
    // Clear roleId on player
    updatePlayer(game.id, tile.assignedPlayerId, { roleId: null });
    setTiles(prev =>
      prev.map((t, i) => (i === tileIdx ? { ...t, assignedPlayerId: null } : t))
    );
  }

  const assignedCount = tiles.filter(t => t.assignedPlayerId !== null).length;

  // ── Render ──────────────────────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{ zIndex: 80, background: 'var(--color-bg)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{
            height: 56,
            background: 'rgba(8,6,18,0.95)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-xl active:opacity-60"
            style={{
              padding: '8px 14px',
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
              fontSize: 15,
            }}
          >
            ✕ Cancel
          </button>
          <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
            Select Roles
          </p>
          <button
            onClick={handleShuffle}
            disabled={!canShuffle}
            className="flex items-center gap-2 rounded-xl font-semibold active:scale-95"
            style={{
              padding: '8px 16px',
              minHeight: 40,
              background: canShuffle
                ? 'linear-gradient(135deg, #2d1f5e, #3d2878)'
                : 'rgba(30,20,50,0.4)',
              border: `1px solid ${canShuffle ? '#6366f1' : 'var(--color-border)'}`,
              color: canShuffle ? '#a5b4fc' : 'var(--color-text-dim)',
              fontSize: 15,
              cursor: canShuffle ? 'pointer' : 'default',
              opacity: canShuffle ? 1 : 0.5,
            }}
          >
            Shuffle & Deal →
          </button>
        </div>

        {/* Distribution guide */}
        <div
          className="flex items-center gap-3 px-4 flex-shrink-0 flex-wrap"
          style={{
            padding: '10px 16px',
            background: 'rgba(8,6,18,0.8)',
            borderBottom: '1px solid var(--color-border)',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
            {selectedTotal}/{playerCount} selected
          </span>
          {(['townsfolk', 'outsider', 'minion', 'demon'] as RoleTeam[]).map(team => {
            const target = dist[team as keyof typeof dist] ?? 0;
            const actual = selectionCounts[team] ?? 0;
            const ok = actual === target;
            return (
              <span
                key={team}
                style={{
                  fontSize: 12,
                  color: ok ? TEAM_COLORS[team] : '#ef4444',
                  fontWeight: ok ? 600 : 700,
                }}
              >
                {TEAM_LABELS[team]}: {actual}/{target}
              </span>
            );
          })}
        </div>

        {/* Role list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px 32px' }}>
          {TEAM_ORDER.map(team => {
            const roles = rolesByTeam[team];
            if (!roles || roles.length === 0) return null;
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
                    const selected = selectedIds.has(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        className="flex items-center gap-3 rounded-xl active:scale-98 text-left"
                        style={{
                          padding: '10px 14px',
                          background: selected
                            ? `rgba(${hexToRgb(TEAM_COLORS[team])}, 0.12)`
                            : 'rgba(30,20,50,0.4)',
                          border: `1px solid ${selected ? TEAM_COLORS[team] : 'var(--color-border)'}`,
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
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
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 15, color: selected ? 'var(--color-text)' : 'var(--color-text-dim)', fontWeight: selected ? 600 : 400 }}>
                            {role.name}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {role.ability}
                          </p>
                        </div>
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
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Assign phase ────────────────────────────────────────────────────

  const activeTile = activeTileIdx !== null ? tiles[activeTileIdx] : null;
  const activeRole = activeTile ? rolesDb[activeTile.roleId] : null;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ zIndex: 80, background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: 56,
          background: 'rgba(8,6,18,0.95)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => setPhase('select')}
          className="flex items-center gap-1 rounded-xl active:opacity-60"
          style={{
            padding: '8px 14px',
            background: 'rgba(30,20,50,0.6)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)',
            fontSize: 15,
          }}
        >
          ← Back
        </button>
        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
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
            border: `1px solid ${assignedCount === tiles.length ? '#22c55e' : 'var(--color-border)'}`,
            color: assignedCount === tiles.length ? '#86efac' : 'var(--color-text-dim)',
            fontSize: 15,
          }}
        >
          Done ✓
        </button>
      </div>

      {/* Tile grid */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '16px' }}
        onClick={() => setActiveTileIdx(null)}
      >
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
            const isActive = activeTileIdx === idx;

            return (
              <button
                key={idx}
                onClick={e => {
                  e.stopPropagation();
                  setActiveTileIdx(isActive ? null : idx);
                }}
                className="flex flex-col items-center justify-center rounded-2xl active:scale-95"
                style={{
                  padding: '12px 8px 10px',
                  background: isActive
                    ? 'rgba(99,102,241,0.18)'
                    : isClaimed
                    ? 'rgba(30,20,50,0.7)'
                    : 'rgba(20,12,38,0.8)',
                  border: `2px solid ${isActive ? '#6366f1' : isClaimed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  aspectRatio: '3/4',
                  position: 'relative',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                aria-label={`Tile ${idx + 1}`}
              >
                {/* Tile number */}
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.3)',
                  }}
                >
                  {idx + 1}
                </span>

                {/* Face-down token graphic — same for all tiles */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: isClaimed
                      ? 'rgba(99,102,241,0.2)'
                      : 'rgba(255,255,255,0.05)',
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

                {/* Player name shown after claim, but no role info */}
                <span style={{
                  fontSize: isClaimed ? 11 : 13,
                  fontWeight: 600,
                  color: isClaimed ? 'var(--color-text)' : 'rgba(255,255,255,0.2)',
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

      {/* Active tile overlay */}
      {activeTile && activeRole && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 81, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setActiveTileIdx(null)}
          />
          <div
            className="fixed rounded-3xl flex flex-col overflow-hidden"
            style={{
              zIndex: 82,
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '75vh',
              background: 'var(--color-surface)',
              border: `1px solid ${getRoleTeamColor(activeRole.team)}66`,
              borderBottom: 'none',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              boxShadow: '0 -16px 60px rgba(0,0,0,0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Role header */}
            <div
              className="flex items-center gap-4 flex-shrink-0"
              style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid var(--color-border)',
                background: `linear-gradient(to bottom, rgba(${hexToRgb(getRoleTeamColor(activeRole.team))}, 0.12), transparent)`,
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${getRoleTeamColor(activeRole.team)}66` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getRoleIconPath(activeRole)}
                  alt={activeRole.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                  onError={e => {
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(activeRole.team); }
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 18, fontWeight: 700, color: getRoleTeamColor(activeRole.team) }}>
                  {activeRole.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>
                  Tile {activeTileIdx! + 1}
                  {activeTile.assignedPlayerId && (
                    <> · assigned to {game.players.find(p => p.id === activeTile.assignedPlayerId)?.name}</>
                  )}
                </p>
              </div>
              {activeTile.assignedPlayerId && (
                <button
                  onClick={() => handleUnassign(activeTileIdx!)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  Unassign
                </button>
              )}
            </div>

            {/* Ability text */}
            <div style={{ padding: '12px 20px', flexShrink: 0 }}>
              <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6, fontStyle: 'italic' }}>
                "{activeRole.ability}"
              </p>
            </div>

            {/* Player list */}
            <div className="overflow-y-auto flex-1" style={{ padding: '0 16px 24px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, padding: '0 4px' }}>
                Assign to player
              </p>
              <div className="flex flex-col gap-2">
                {[...game.players].sort((a, b) => {
                  const aTaken = a.id !== activeTile.assignedPlayerId && tiles.some((t, i) => i !== activeTileIdx && t.assignedPlayerId === a.id);
                  const bTaken = b.id !== activeTile.assignedPlayerId && tiles.some((t, i) => i !== activeTileIdx && t.assignedPlayerId === b.id);
                  return Number(aTaken) - Number(bTaken);
                }).map(player => {
                  const isCurrent = activeTile.assignedPlayerId === player.id;
                  const takenTileIdx = isCurrent ? -1 : tiles.findIndex((t, i) => i !== activeTileIdx && t.assignedPlayerId === player.id);
                  const isTaken = takenTileIdx !== -1;

                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => handleAssign(player.id)}
                        className="flex items-center gap-3 rounded-xl text-left active:scale-98 flex-1"
                        style={{
                          padding: '10px 14px',
                          background: isCurrent
                            ? 'rgba(99,102,241,0.18)'
                            : 'rgba(30,20,50,0.5)',
                          border: `1px solid ${isCurrent ? '#6366f1' : 'var(--color-border)'}`,
                          opacity: isTaken ? 0.4 : 1,
                        }}
                      >
                        <span style={{ fontSize: 16, color: isCurrent ? '#a5b4fc' : 'var(--color-text)', fontWeight: isCurrent ? 700 : 400, flex: 1 }}>
                          {player.name}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>✓ assigned</span>
                        )}
                        {isTaken && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>taken</span>
                        )}
                      </button>
                      {(isCurrent || isTaken) && (
                        <button
                          onClick={() => handleUnassign(isCurrent ? activeTileIdx! : takenTileIdx)}
                          className="flex items-center justify-center rounded-xl active:scale-90 flex-shrink-0"
                          style={{
                            width: 36,
                            height: 36,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.4)',
                            color: '#ef4444',
                            fontSize: 16,
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
        </>
      )}
    </div>
  );
}

/** Convert a hex color like '#3b82f6' to 'R,G,B' for use in rgba() */
function hexToRgb(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '255,255,255';
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}
