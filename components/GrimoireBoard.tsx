'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Game, Player, RoleDefinition } from '@/lib/types';
import { useStore } from '@/lib/store';
import { getRoleDistribution } from '@/lib/roles';
import ClearableInput from './ClearableInput';
import PlayerToken from './PlayerToken';
import PlayerModal from './PlayerModal';
import NightOrderPanel from './NightOrderPanel';
import JinxPanel from './JinxPanel';
import RoleRevealScreen from './RoleRevealScreen';
import CustomMessageScreen from './CustomMessageScreen';
import WhiteboardScreen from './WhiteboardScreen';
import BluffDrawer from './BluffDrawer';
import StorytoolsDrawer from './StorytoolsDrawer';
import RoleAssignmentScreen from './RoleAssignmentScreen';
import SoundboardPanel from './SoundboardPanel';
import NightInfoScreen from './NightInfoScreen';
import GameSettingsScreen from './GameSettingsScreen';
import ScriptShareDrawer from './ScriptShareDrawer';
import ReminderPickerModal from './ReminderPickerModal';
import RolePickerModal from './RolePickerModal';
import CustomReminderModal from './CustomReminderModal';
import AddToScriptModal from './AddToScriptModal';
import DirectAssignModal from './DirectAssignModal';
import TimerCenter from './TimerCenter';

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  allRoles: RoleDefinition[];
}

const RADIUS_PCT = 44;

// Arch layout: 120° gap at the bottom, 240° of arc
const ARCH_GAP   = (2 * Math.PI) / 12;
const ARCH_SPAN  = 2 * Math.PI - ARCH_GAP;
const ARCH_START = Math.PI / 2 + ARCH_GAP / 2; // 150° — bottom-left start

function getArchAngle(index: number, total: number): number {
  if (total <= 1) return -Math.PI / 2; // top-centre for a single token
  return ARCH_START + (index / (total - 1)) * ARCH_SPAN;
}

function computeTokenPx(boardPx: number, count: number): number {
  if (boardPx === 0) return 100;
  const fraction =
    count <= 5  ? 0.25 :
    count <= 7  ? 0.21 :
    count <= 10 ? 0.18 :
    count <= 13 ? 0.15 :
    count <= 16 ? 0.13 :
                  0.11;
  return Math.max(64, Math.round(boardPx * fraction));
}

export default function GrimoireBoard({ game, rolesDb, allRoles }: Props) {

  const { togglePhase, togglePhaseBack, removeReminderToken, addPlayer, reorderPlayer, swapPlayers, updatePlayer } = useStore();

  // ── UI visibility state ──────────────────────────────────────────
  const [selectedPlayer, setSelectedPlayer]       = useState<Player | null>(null);
  const [tokenMenuPlayer, setTokenMenuPlayer]     = useState<Player | null>(null);
  const [reminderPlayer, setReminderPlayer]       = useState<Player | null>(null);
  const [rolePickerPlayer, setRolePickerPlayer]   = useState<Player | null>(null);
  const [customReminderPlayer, setCustomReminderPlayer] = useState<Player | null>(null);
  const [showNightOrder, setShowNightOrder]       = useState(false);
  const [showJinxes, setShowJinxes]               = useState(false);
  const [showAddPlayer, setShowAddPlayer]         = useState(false);
  const [showRoleReveal, setShowRoleReveal]       = useState(false);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);
  const [showSoundboard, setShowSoundboard]       = useState(false);
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [showWhiteboard, setShowWhiteboard]       = useState(false);
  const [showMore, setShowMore]                   = useState(false);
  const [showNightInfo, setShowNightInfo]         = useState(false);
  const [showGameSettings, setShowGameSettings]   = useState(false);
  const [showShare, setShowShare]                 = useState(false);
  const [showAddToScript, setShowAddToScript]     = useState(false);

  // ── Assign mode state ────────────────────────────────────────────
  const [assignMode, setAssignMode]               = useState(false);
  const [assignRoleCounts, setAssignRoleCounts]   = useState<Map<string, number> | null>(null);
  const [assignModePlayer, setAssignModePlayer]   = useState<Player | null>(null);
  // Controlled drawer state (bottom tab bar)
  const [showBluffs, setShowBluffs]               = useState(false);
  const [showTools, setShowTools]                 = useState(false);

  const [newPlayerName, setNewPlayerName]         = useState('');
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth]   = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);

  // ── Drag state ───────────────────────────────────────────────────
  const [dragPlayerId, setDragPlayerId]   = useState<string | null>(null);
  const [dragPos, setDragPos]             = useState<{ x: number; y: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<
    | { mode: 'swap';   slotIndex: number }
    | { mode: 'insert'; gapIndex: number }
    | null
  >(null);
  const dragOriginRef = useRef<{ x: number; y: number; index: number; playerId: string; pointerId: number } | null>(null);
  const dragActiveRef = useRef(false);
  const dragJustEndedRef = useRef(false);

  const { players } = game;
  const boardMinDim = Math.min(boardWidth, boardHeight);
  const tokenPx = computeTokenPx(boardMinDim || boardWidth, players.length);
  const tokenNameH = Math.max(11, Math.min(16, Math.round(tokenPx * 0.17))) + 10;

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setBoardWidth(entry.contentRect.width);
        setBoardHeight(entry.contentRect.height);
      }
    });
    if (boardRef.current) obs.observe(boardRef.current);
    return () => obs.disconnect();
  }, []);

  const livePlayer = selectedPlayer
    ? game.players.find(p => p.id === selectedPlayer.id) ?? null
    : null;

  const liveTokenMenuPlayer = tokenMenuPlayer
    ? game.players.find(p => p.id === tokenMenuPlayer.id) ?? null
    : null;

  const liveReminderPlayer = reminderPlayer
    ? game.players.find(p => p.id === reminderPlayer.id) ?? null
    : null;

  const liveRolePickerPlayer = rolePickerPlayer
    ? game.players.find(p => p.id === rolePickerPlayer.id) ?? null
    : null;

  const liveCustomReminderPlayer = customReminderPlayer
    ? game.players.find(p => p.id === customReminderPlayer.id) ?? null
    : null;

  function getTokenPos(index: number, player: Player) {
    const angle = getArchAngle(index, players.length);
    if (!boardWidth || !boardHeight) {
      return {
        left: `${50 + RADIUS_PCT * Math.cos(angle)}%` as string | number,
        top:  `${50 + RADIUS_PCT * Math.sin(angle)}%` as string | number,
      };
    }
    const nameH = tokenNameH;
    const contW = tokenPx + 8;
    const contH = tokenPx + nameH;
    const rawX = boardWidth  * (50 + RADIUS_PCT * Math.cos(angle)) / 100;
    const rawY = boardHeight * (50 + RADIUS_PCT * Math.sin(angle)) / 100;
    return {
      left: Math.max(contW / 2, Math.min(boardWidth  - contW / 2, rawX)),
      top:  Math.max(contH / 2, Math.min(boardHeight - contH / 2, rawY)),
    };
  }

  // ── Drag helpers ─────────────────────────────────────────────────
  function slotPos(index: number) {
    const angle = getArchAngle(index, players.length);
    return {
      x: boardWidth  * (50 + RADIUS_PCT * Math.cos(angle)) / 100,
      y: boardHeight * (50 + RADIUS_PCT * Math.sin(angle)) / 100,
    };
  }

  function getDropTarget(clientX: number, clientY: number): { mode: 'swap'; slotIndex: number } | { mode: 'insert'; gapIndex: number } {
    const board = boardRef.current;
    if (!board || players.length <= 1) return { mode: 'swap', slotIndex: 0 };
    const rect = board.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    let nearestSlot = 0;
    let nearestSlotDist = Infinity;
    for (let i = 0; i < players.length; i++) {
      const s = slotPos(i);
      const d = Math.hypot(px - s.x, py - s.y);
      if (d < nearestSlotDist) { nearestSlotDist = d; nearestSlot = i; }
    }

    let nearestGap = 0;
    let nearestGapDist = Infinity;
    for (let i = 0; i < players.length - 1; i++) {
      const a = slotPos(i);
      const b = slotPos(i + 1);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const d = Math.hypot(px - mx, py - my);
      if (d < nearestGapDist) { nearestGapDist = d; nearestGap = i; }
    }

    if (nearestGapDist < nearestSlotDist) {
      return { mode: 'insert', gapIndex: nearestGap };
    }
    return { mode: 'swap', slotIndex: nearestSlot };
  }

  function handleTokenPointerDown(e: React.PointerEvent, playerId: string, index: number) {
    if (e.button !== undefined && e.button > 0) return;
    dragOriginRef.current = { x: e.clientX, y: e.clientY, index, playerId, pointerId: e.pointerId };
    dragActiveRef.current = false;
  }

  function handleBoardPointerMove(e: React.PointerEvent) {
    const origin = dragOriginRef.current;
    if (!origin) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    if (!dragActiveRef.current && Math.sqrt(dx * dx + dy * dy) < 8) return;
    if (!dragActiveRef.current) {
      dragActiveRef.current = true;
      setDragPlayerId(origin.playerId);
      // Capture pointer to board so moves/ups always reach us, even over child elements
      if (origin.pointerId != null) boardRef.current?.setPointerCapture(origin.pointerId);
    }
    setDragPos({ x: e.clientX, y: e.clientY });
    setDropTarget(getDropTarget(e.clientX, e.clientY));
  }

  function handleBoardPointerUp(e: React.PointerEvent) {
    const origin = dragOriginRef.current;
    if (!origin) return;
    const wasDragging = dragActiveRef.current;
    dragOriginRef.current = null;
    dragActiveRef.current = false;
    setDragPlayerId(null);
    setDragPos(null);
    setDropTarget(null);
    if (!wasDragging) return;
    dragJustEndedRef.current = true;
    setTimeout(() => { dragJustEndedRef.current = false; }, 50);
    const target = getDropTarget(e.clientX, e.clientY);
    if (target.mode === 'swap') {
      swapPlayers(game.id, origin.index, target.slotIndex);
    } else {
      const g = target.gapIndex;
      const toIndex = origin.index <= g ? g : g + 1;
      reorderPlayer(game.id, origin.index, toIndex);
    }
  }

  function handleBoardPointerCancel() {
    dragOriginRef.current = null;
    dragActiveRef.current = false;
    setDragPlayerId(null);
    setDragPos(null);
    setDropTarget(null);
  }

  const isNight    = game.phase === 'night';
  const phaseLabel = isNight ? `Night ${game.nightNumber}` : `Day ${game.dayNumber}`;
  const aliveCount = players.filter(p => p.isAlive).length;
  const canGoBack  = !(isNight && game.nightNumber === 1);

  const bluffIds   = game.bluffRoleIds ?? [null, null, null];
  const bluffCount = bluffIds.filter(Boolean).length;
  const toolsCount = (game.loricIds?.length ?? 0) + (game.fabledIds?.length ?? 0);

  const firstNightRanks = useMemo(() => {
    const ranks = new Map<string, number>();
    const entries = players
      .filter(p => p.isAlive && p.roleId && (rolesDb[p.roleId]?.firstNight ?? 0) > 0)
      .map(p => ({ roleId: p.roleId!, order: rolesDb[p.roleId!].firstNight }));
    const seen = new Set<string>();
    const unique = entries.filter(e => { if (seen.has(e.roleId)) return false; seen.add(e.roleId); return true; });
    unique.sort((a, b) => a.order - b.order).forEach((e, i) => ranks.set(e.roleId, i + 1));
    return ranks;
  }, [players, rolesDb]);

  const otherNightRanks = useMemo(() => {
    const ranks = new Map<string, number>();
    const entries = players
      .filter(p => p.isAlive && p.roleId && (rolesDb[p.roleId]?.otherNight ?? 0) > 0)
      .map(p => ({ roleId: p.roleId!, order: rolesDb[p.roleId!].otherNight }));
    const seen = new Set<string>();
    const unique = entries.filter(e => { if (seen.has(e.roleId)) return false; seen.add(e.roleId); return true; });
    unique.sort((a, b) => a.order - b.order).forEach((e, i) => ranks.set(e.roleId, i + 1));
    return ranks;
  }, [players, rolesDb]);

  // Pool remaining = original counts minus what's currently assigned to any player
  const assignRemaining = useMemo(() => {
    if (!assignRoleCounts) return new Map<string, number>();
    const remaining = new Map(assignRoleCounts);
    game.players.forEach(p => {
      if (!p.roleId) return;
      const n = remaining.get(p.roleId);
      if (n !== undefined) {
        if (n <= 1) remaining.delete(p.roleId);
        else remaining.set(p.roleId, n - 1);
      }
    });
    return remaining;
  }, [assignRoleCounts, game.players]);

  const assignRemainingCount = useMemo(() => {
    let n = 0;
    assignRemaining.forEach(c => { n += c; });
    return n;
  }, [assignRemaining]);

  // Remaining shown to the modal includes the current player's own slot returned to the pool
  const liveAssignModePlayer = assignModePlayer
    ? game.players.find(p => p.id === assignModePlayer.id) ?? null
    : null;

  const assignRemainingForModal = useMemo(() => {
    if (!liveAssignModePlayer || !assignRoleCounts) return assignRemaining;
    const remaining = new Map(assignRemaining);
    const roleId = liveAssignModePlayer.roleId;
    if (roleId && assignRoleCounts.has(roleId)) {
      remaining.set(roleId, (remaining.get(roleId) ?? 0) + 1);
    }
    return remaining;
  }, [assignRemaining, liveAssignModePlayer, assignRoleCounts]);

  function handleStartAssign(roleCounts: Map<string, number>) {
    game.players.forEach(p => {
      if (p.roleId) updatePlayer(game.id, p.id, { roleId: null });
    });
    setAssignRoleCounts(roleCounts);
    setAssignMode(true);
    setShowRoleAssignment(false);
  }

  function handleAddPlayer() {
    addPlayer(game.id, newPlayerName);
    setNewPlayerName('');
    setShowAddPlayer(false);
  }

  /** Phase colours for the bottom phase tab */
  const phaseColor = isNight ? 'var(--botc-night)' : 'var(--botc-day)';
  const phaseBg    = isNight ? 'var(--botc-night-bg)' : 'var(--botc-day-bg)';
  const phaseBorder = isNight ? 'rgba(129,140,248,0.45)' : 'rgba(251,191,36,0.45)';

  function handleDownloadScript() {
    setShowMore(false);
    const entries: object[] = [
      { id: '_meta', name: game.scriptName, ...(game.scriptAuthor ? { author: game.scriptAuthor } : {}) },
      ...game.scriptRoleIds.map(id => ({ id })),
    ];
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.scriptName.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── "More" action items ──────────────────────────────────────────
  const moreItems = [
    { emoji: '👁',  label: 'Show Roles',  action: () => { setShowMore(false); setShowRoleReveal(true); } },
    { emoji: '⭐',  label: 'Tools',       action: () => { setShowMore(false); setShowTools(true); } },
    { emoji: '🎴',  label: 'Setup Roles', action: () => { setShowMore(false); setShowRoleAssignment(true); } },
    { emoji: '➕',  label: 'Add Role',    action: () => { setShowMore(false); setShowAddToScript(true); } },
    { emoji: '⚡',  label: 'Jinxes',      action: () => { setShowMore(false); setShowJinxes(true); } },
    { emoji: '💬',  label: 'Message',     action: () => { setShowMore(false); setShowCustomMessage(true); } },
    { emoji: '✏️', label: 'Whiteboard',  action: () => { setShowMore(false); setShowWhiteboard(true); } },
    { emoji: '🔊',  label: 'Sounds',      action: () => { setShowMore(false); setShowSoundboard(true); } },
    { emoji: '🔗',  label: 'Share',       action: () => { setShowMore(false); setShowShare(true); } },
    { emoji: '⬇️', label: 'Download Script', action: handleDownloadScript },
  ] as const;

  // Stable callbacks so React.memo on PlayerToken can skip re-renders
  const handleTokenClick = useCallback((player: Player) => {
    if (!dragActiveRef.current && !dragJustEndedRef.current) {
      if (assignMode) {
        setAssignModePlayer(player);
      } else {
        setTokenMenuPlayer(player);
      }
    }
  }, [assignMode]);
  const handleRemoveReminder = useCallback((playerId: string, tokenId: string) => {
    removeReminderToken(game.id, playerId, tokenId);
  }, [game.id, removeReminderToken]);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', background: 'transparent' }}
    >
      {/* ══════════════════════════════════════════════════════════
          TOP BAR
          ══════════════════════════════════════════════════════════ */}
      <div className="botc-topbar">
        {/* Left: back + game name */}
        <div className="flex items-center gap-2 min-w-0">
          <a
            href="/"
            className="botc-icon-btn botc-icon-btn--muted"
            aria-label="Back to home"
            style={{ fontSize: 17 }}
          >
            ←
          </a>
          <div className="min-w-0">
            <p
              className="font-semibold truncate"
              style={{ fontSize: 15, color: 'var(--botc-text)', lineHeight: 1.2, maxWidth: '35vw' }}
            >
              {game.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--botc-muted)', lineHeight: 1 }}>
              {aliveCount}/{players.length} alive · {game.scriptName}
            </p>
          </div>
        </div>

        {/* Right: add player + settings */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setShowAddPlayer(true); setNewPlayerName(''); }}
            className="botc-icon-btn"
            aria-label="Add player"
            style={{ fontSize: 22, fontWeight: 400 }}
          >
            +
          </button>
          <button
            onClick={() => setShowGameSettings(true)}
            className="botc-icon-btn botc-icon-btn--muted"
            aria-label="Game settings"
            style={{ fontSize: 17 }}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          BOARD AREA
          ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={boardRef}
          className="absolute inset-0"
          style={{ touchAction: 'none' }}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
          onPointerCancel={handleBoardPointerCancel}
        >
          {/* Arch guide arc (SVG) */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {boardWidth > 0 && boardHeight > 0 && (() => {
              const cx = boardWidth / 2;
              const cy = boardHeight / 2;
              const rx = boardWidth  * RADIUS_PCT / 100;
              const ry = boardHeight * RADIUS_PCT / 100;
              const startAngle = ARCH_START;
              const endAngle   = ARCH_START + ARCH_SPAN;
              const x1 = cx + rx * Math.cos(startAngle);
              const y1 = cy + ry * Math.sin(startAngle);
              const x2 = cx + rx * Math.cos(endAngle);
              const y2 = cy + ry * Math.sin(endAngle);
              return (
                <path
                  d={`M ${x1} ${y1} A ${rx} ${ry} 0 1 1 ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(201,168,76,0.10)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
              );
            })()}
          </svg>

          {/* Centre display */}
          {(() => {
            const dist = getRoleDistribution(players.length);
            const scriptLabel = game.scriptAuthor ? `by ${game.scriptAuthor}` : null;
            const distItems = [
              { label: 'TF',  count: dist.townsfolk, color: 'var(--botc-townsfolk)' },
              { label: 'OUT', count: dist.outsider,  color: 'var(--botc-outsider)' },
              { label: 'MIN', count: dist.minion,    color: 'var(--botc-minion)' },
              { label: 'DEM', count: dist.demon,     color: 'var(--botc-demon)' },
            ];
            return (
              <div
                className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: `${RADIUS_PCT * 1.1}%` }}
              >
                <span style={{ fontSize: Math.max(28, boardMinDim * 0.05), lineHeight: 1 }}>
                  {isNight ? '🌙' : '☀️'}
                </span>
                <span
                  className="font-semibold mt-1"
                  style={{
                    fontSize: Math.max(12, boardMinDim * 0.022),
                    color: phaseColor,
                    textShadow: `0 0 12px ${isNight ? 'rgba(129,140,248,0.5)' : 'rgba(251,191,36,0.5)'}`,
                  }}
                >
                  {phaseLabel}
                </span>
                <span style={{ fontSize: Math.max(10, boardMinDim * 0.016), color: 'var(--botc-muted)', marginTop: 2 }}>
                  {aliveCount}/{players.length} alive
                </span>
                <span
                  className="font-semibold"
                  style={{
                    fontSize: Math.max(10, boardMinDim * 0.018),
                    color: 'var(--botc-gold)',
                    marginTop: Math.max(6, boardMinDim * 0.012),
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {game.scriptName}
                </span>
                {scriptLabel && (
                  <span style={{ fontSize: Math.max(9, boardMinDim * 0.014), color: 'var(--botc-muted)', marginTop: 1 }}>
                    {scriptLabel}
                  </span>
                )}
                <div style={{ display: 'flex', gap: Math.max(6, boardMinDim * 0.012), marginTop: Math.max(5, boardMinDim * 0.01) }}>
                  {distItems.map(({ label, count, color }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: Math.max(11, boardMinDim * 0.02), fontWeight: 700, color, lineHeight: 1 }}>
                        {count}
                      </span>
                      <span style={{ fontSize: Math.max(7, boardMinDim * 0.012), color: 'var(--botc-muted)', lineHeight: 1 }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Drop target indicator */}
          {dragPlayerId && dropTarget && (() => {
            if (dropTarget.mode === 'swap') {
              const tPos = getTokenPos(dropTarget.slotIndex, players[dropTarget.slotIndex]);
              const topVal = typeof tPos.top === 'number' ? tPos.top - tokenNameH / 2 : tPos.top;
              return (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: tPos.left,
                    top: topVal,
                    transform: 'translate(-50%, -50%)',
                    width: tokenPx + 12,
                    height: tokenPx + 12,
                    borderRadius: '50%',
                    border: '3px dashed rgba(99,102,241,0.9)',
                    boxShadow: '0 0 16px rgba(99,102,241,0.5)',
                    zIndex: 25,
                  }}
                />
              );
            }
            // Insert mode: glowing dot at the gap midpoint
            const a = slotPos(dropTarget.gapIndex);
            const b = slotPos(dropTarget.gapIndex + 1);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: mx,
                  top: my,
                  transform: 'translate(-50%, -50%)',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,0.9)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.8), 0 0 6px rgba(99,102,241,1)',
                  zIndex: 25,
                }}
              />
            );
          })()}

          {/* Timer widget */}
          <TimerCenter
            boardWidth={boardWidth}
            boardHeight={boardHeight}
            boardMinDim={boardMinDim}
          />

          {/* Player tokens */}
          {players.map((player, index) => {
            const angle   = getArchAngle(index, players.length);
            const pos     = getTokenPos(index, player);
            const role    = player.roleId ? rolesDb[player.roleId] : null;
            const isDragging = dragPlayerId === player.id;
            return (
              <div
                key={player.id}
                className="absolute"
                style={isDragging && dragPos ? {
                  left: dragPos.x,
                  top:  dragPos.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30,
                  opacity: 0.85,
                  pointerEvents: 'none',
                  touchAction: 'none',
                } : {
                  left: pos.left,
                  top:  pos.top,
                  transform: 'translate(-50%, -50%)',
                  zIndex: selectedPlayer?.id === player.id ? 20 : 1,
                  opacity: dragPlayerId && !isDragging ? 0.6 : 1,
                  transition: dragPlayerId ? 'none' : 'opacity 0.15s',
                  touchAction: 'none',
                }}
                onPointerDown={e => handleTokenPointerDown(e, player.id, index)}
              >
                <PlayerToken
                  player={player}
                  role={role}
                  rolesDb={rolesDb}
                  sizePx={tokenPx}
                  inwardAngle={angle + Math.PI}
                  onClick={() => handleTokenClick(player)}
                  onRemoveReminder={tokenId => handleRemoveReminder(player.id, tokenId)}
                  firstNightOrder={player.isAlive && player.roleId ? (firstNightRanks.get(player.roleId) ?? null) : null}
                  otherNightOrder={player.isAlive && player.roleId ? (otherNightRanks.get(player.roleId) ?? null) : null}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ASSIGN MODE BANNER
          ══════════════════════════════════════════════════════════ */}
      {assignMode && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-4"
          style={{
            height: 46,
            background: 'rgba(8,6,18,0.97)',
            borderTop: `1px solid ${assignRemainingCount === 0 ? 'rgba(34,197,94,0.35)' : 'rgba(99,102,241,0.35)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>{assignRemainingCount === 0 ? '✓' : '🎯'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: assignRemainingCount === 0 ? '#86efac' : '#a5b4fc' }}>
              {assignRemainingCount === 0 ? 'All roles assigned' : 'Assigning Roles'}
            </span>
            {assignRemainingCount > 0 && (
              <span style={{ fontSize: 12, color: 'var(--botc-muted)' }}>
                — {assignRemainingCount} remaining
              </span>
            )}
          </div>
          <button
            onClick={() => { setAssignMode(false); setAssignRoleCounts(null); }}
            style={{
              padding: '5px 14px', borderRadius: 8,
              background: assignRemainingCount === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${assignRemainingCount === 0 ? '#22c55e' : 'rgba(239,68,68,0.35)'}`,
              color: assignRemainingCount === 0 ? '#86efac' : '#ef4444',
              fontSize: 12, fontWeight: 600,
            }}
          >
            {assignRemainingCount === 0 ? 'Done ✓' : 'Exit Mode'}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BOTTOM TAB BAR
          ══════════════════════════════════════════════════════════ */}
      <div className="botc-tabbar">

        {/* ── Bluffs ── */}
        <button
          className={`botc-tab${showBluffs ? ' botc-tab--active' : ''}`}
          onClick={() => { setShowBluffs(v => !v); setShowTools(false); setShowMore(false); }}
          aria-label="Demon bluffs"
        >
          <span className="botc-tab-icon">🎴</span>
          <span>Bluffs</span>
          {bluffCount > 0 && <span className="botc-tab-badge">{bluffCount}</span>}
        </button>

        {/* ── Night Order ── */}
        <button
          className="botc-tab"
          onClick={() => setShowNightOrder(true)}
          aria-label="Night order"
        >
          <span className="botc-tab-icon">📖</span>
          <span>Night</span>
        </button>

        {/* ── Phase (back | label | advance) ── */}
        <div className="botc-tab-phase">
          <button
            className="botc-tab-phase__chevron"
            onClick={() => togglePhaseBack(game.id)}
            disabled={!canGoBack}
            aria-label="Go back one phase"
            style={{ opacity: canGoBack ? 1 : 0.2, cursor: canGoBack ? 'pointer' : 'default' }}
          >
            ‹
          </button>

          <div
            className="botc-tab-phase__center"
            onClick={() => togglePhase(game.id)}
            role="button"
            aria-label={`Advance to next phase (currently ${phaseLabel})`}
          >
            <div
              style={{
                padding: '5px 12px',
                borderRadius: 12,
                background: phaseBg,
                border: `1px solid ${phaseBorder}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span className="botc-tab-phase__icon">{isNight ? '🌙' : '☀️'}</span>
              <span
                className="botc-tab-phase__label"
                style={{ color: phaseColor }}
              >
                {phaseLabel}
              </span>
            </div>
          </div>

          <button
            className="botc-tab-phase__chevron"
            onClick={() => togglePhase(game.id)}
            aria-label="Advance one phase"
          >
            ›
          </button>
        </div>

        {/* ── Night Card ── */}
        <button
          className="botc-tab"
          onClick={() => setShowNightInfo(true)}
          aria-label="Night card"
        >
          <span className="botc-tab-icon">🌙</span>
          <span>Night Card</span>
        </button>

        {/* ── More ── */}
        <button
          className={`botc-tab${showMore ? ' botc-tab--active' : ''}`}
          onClick={() => { setShowMore(v => !v); setShowBluffs(false); setShowTools(false); }}
          aria-label="More options"
        >
          <span className="botc-tab-icon" style={{ fontSize: 26, fontWeight: 300, lineHeight: '1' }}>⋯</span>
          <span>More</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          "MORE" PANEL
          ══════════════════════════════════════════════════════════ */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowMore(false)} />
          <div className="botc-more-panel" style={{ zIndex: 55 }}>
            {moreItems.map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className="botc-more-item"
              >
                <span className="botc-more-emoji">{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          CONTROLLED DRAWERS (Bluffs & Tools)
          ══════════════════════════════════════════════════════════ */}
      <BluffDrawer
        game={game}
        rolesDb={rolesDb}
        isOpen={showBluffs}
        onClose={() => setShowBluffs(false)}
      />

      <StorytoolsDrawer
        game={game}
        rolesDb={rolesDb}
        isOpen={showTools}
        onClose={() => setShowTools(false)}
      />

      {/* ══════════════════════════════════════════════════════════
          PANELS & SCREENS
          ══════════════════════════════════════════════════════════ */}
      {/* ── Token action sheet ─────────────────────────────────────── */}
      {liveTokenMenuPlayer && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setTokenMenuPlayer(null)}
          />
          <div
            className="fixed left-0 right-0 bottom-0 z-[71] flex flex-col"
            style={{
              background: 'var(--color-bg)',
              borderTop: '1px solid var(--color-border)',
              borderRadius: '20px 20px 0 0',
              padding: '8px 16px 32px',
              gap: 8,
            }}
          >
            <div
              className="mx-auto mb-2 rounded-full"
              style={{ width: 36, height: 4, background: 'var(--color-border)' }}
            />
            <p
              className="text-center font-semibold pb-1"
              style={{ color: 'var(--color-text)', fontSize: 16 }}
            >
              {liveTokenMenuPlayer.name || 'Player'}
            </p>
            <button
              onClick={() => { setSelectedPlayer(liveTokenMenuPlayer); setTokenMenuPlayer(null); }}
              className="w-full rounded-2xl py-4 font-semibold text-left flex items-center gap-3 px-5 transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(20,12,40,0.8)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: 16,
              }}
            >
              <span style={{ fontSize: 22 }}>⚙️</span> Settings
            </button>
            <button
              onClick={() => { setRolePickerPlayer(liveTokenMenuPlayer); setTokenMenuPlayer(null); }}
              className="w-full rounded-2xl py-4 font-semibold text-left flex items-center gap-3 px-5 transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(20,12,40,0.8)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: 16,
              }}
            >
              <span style={{ fontSize: 22 }}>🎭</span> Assign Role
            </button>
            {liveTokenMenuPlayer?.roleId && (
              <button
                onClick={() => { updatePlayer(game.id, liveTokenMenuPlayer.id, { roleId: null }); setTokenMenuPlayer(null); }}
                className="w-full rounded-2xl py-4 font-semibold text-left flex items-center gap-3 px-5 transition-all active:scale-[0.98]"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#ef4444',
                  fontSize: 16,
                }}
              >
                <span style={{ fontSize: 22 }}>✕</span> Clear Role
              </button>
            )}
            <button
              onClick={() => { setReminderPlayer(liveTokenMenuPlayer); setTokenMenuPlayer(null); }}
              className="w-full rounded-2xl py-4 font-semibold text-left flex items-center gap-3 px-5 transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(20,12,40,0.8)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: 16,
              }}
            >
              <span style={{ fontSize: 22 }}>🔖</span> Add Reminder
            </button>
            <button
              onClick={() => { setCustomReminderPlayer(liveTokenMenuPlayer); setTokenMenuPlayer(null); }}
              className="w-full rounded-2xl py-4 font-semibold text-left flex items-center gap-3 px-5 transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(20,12,40,0.8)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: 16,
              }}
            >
              <span style={{ fontSize: 22 }}>✏️</span> Custom Reminder
            </button>
            <button
              onClick={() => setTokenMenuPlayer(null)}
              className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-[0.98]"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-dim)',
                fontSize: 16,
                marginTop: 4,
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {liveReminderPlayer && (
        <ReminderPickerModal
          player={liveReminderPlayer}
          game={game}
          rolesDb={rolesDb}
          onClose={() => setReminderPlayer(null)}
        />
      )}

      {liveCustomReminderPlayer && (
        <CustomReminderModal
          player={liveCustomReminderPlayer}
          game={game}
          onClose={() => setCustomReminderPlayer(null)}
        />
      )}

      {liveRolePickerPlayer && (
        <RolePickerModal
          player={liveRolePickerPlayer}
          game={game}
          rolesDb={rolesDb}
          onClose={() => setRolePickerPlayer(null)}
        />
      )}

      {showAddToScript && (
        <AddToScriptModal
          game={game}
          rolesDb={rolesDb}
          allRoles={allRoles}
          onClose={() => setShowAddToScript(false)}
        />
      )}

      {livePlayer && (
        <PlayerModal
          player={livePlayer}
          game={game}
          rolesDb={rolesDb}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      <NightOrderPanel
        game={game}
        rolesDb={rolesDb}
        allRoles={allRoles}
        isOpen={showNightOrder}
        onClose={() => setShowNightOrder(false)}
      />

      <JinxPanel
        game={game}
        rolesDb={rolesDb}
        isOpen={showJinxes}
        onClose={() => setShowJinxes(false)}
      />

      <ScriptShareDrawer
        game={game}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />

      {showRoleReveal && (
        <RoleRevealScreen
          scriptRoleIds={game.scriptRoleIds}
          rolesDb={rolesDb}
          onClose={() => setShowRoleReveal(false)}
        />
      )}

      {showCustomMessage && (
        <CustomMessageScreen onClose={() => setShowCustomMessage(false)} />
      )}

      {showWhiteboard && (
        <WhiteboardScreen onClose={() => setShowWhiteboard(false)} />
      )}

      {showNightInfo && (
        <NightInfoScreen
          scriptRoleIds={game.scriptRoleIds}
          rolesDb={rolesDb}
          onClose={() => setShowNightInfo(false)}
        />
      )}

      {showSoundboard && (
        <SoundboardPanel onClose={() => setShowSoundboard(false)} />
      )}

      {showGameSettings && (
        <GameSettingsScreen
          game={game}
          rolesDb={rolesDb}
          onClose={() => setShowGameSettings(false)}
        />
      )}

      {showRoleAssignment && (
        <RoleAssignmentScreen
          game={game}
          rolesDb={rolesDb}
          onClose={() => setShowRoleAssignment(false)}
          onStartAssign={handleStartAssign}
        />
      )}

      {liveAssignModePlayer && (
        <DirectAssignModal
          player={liveAssignModePlayer}
          rolesDb={rolesDb}
          remaining={assignRemainingForModal}
          onAssign={(playerId, roleId) => {
            updatePlayer(game.id, playerId, { roleId });
            setAssignModePlayer(null);
          }}
          onClear={(playerId) => {
            updatePlayer(game.id, playerId, { roleId: null });
            setAssignModePlayer(null);
          }}
          onClose={() => setAssignModePlayer(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          ADD PLAYER MODAL
          ══════════════════════════════════════════════════════════ */}
      {showAddPlayer && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowAddPlayer(false)}
          />
          <div
            className="fixed z-[61] botc-modal-card"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 340,
              maxWidth: '90vw',
            }}
          >
            <p className="font-semibold" style={{ fontSize: 17, color: 'var(--botc-gold)' }}>
              Add Player
            </p>
            <ClearableInput
              type="text"
              placeholder="Player name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onClear={() => setNewPlayerName('')}
              onKeyDown={e => {
                if (e.key === 'Enter' && newPlayerName.trim()) handleAddPlayer();
                if (e.key === 'Escape') setShowAddPlayer(false);
              }}
              className="botc-input"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPlayer(false)}
                className="botc-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                className="flex-1 rounded-xl py-3 font-semibold transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
                  border: '1px solid #6366f1',
                  color: '#a5b4fc',
                  fontSize: 15,
                }}
                disabled={!newPlayerName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
