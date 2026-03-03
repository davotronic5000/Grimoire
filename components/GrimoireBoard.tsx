'use client';

import { useState, useRef, useEffect } from 'react';
import type { Game, Player, RoleDefinition } from '@/lib/types';
import { useStore } from '@/lib/store';
import PlayerToken from './PlayerToken';
import PlayerModal from './PlayerModal';
import NightOrderPanel from './NightOrderPanel';
import RoleRevealScreen from './RoleRevealScreen';
import CustomMessageScreen from './CustomMessageScreen';
import BluffDrawer from './BluffDrawer';
import StorytoolsDrawer from './StorytoolsDrawer';

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  allRoles: RoleDefinition[];
}

/** Token positions use this % of the board half-dimension on each axis.
 *  Using the same value for x and y means the layout is a true circle on a
 *  square board and stretches into an ellipse on rectangular screens. */
const RADIUS_PCT = 44;

/**
 * Compute token diameter in pixels.
 * Sized as a fraction of the board so tokens are large and readable; overlap is
 * acceptable at high player counts (same approach as Townsquare).
 */
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
  const { togglePhase, togglePhaseBack, removeReminderToken, addPlayer } = useStore();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showNightOrder, setShowNightOrder] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);

  const { players } = game;
  // Token size is based on the shorter dimension so they don't get huge on wide screens
  const boardMinDim = Math.min(boardWidth, boardHeight);
  const tokenPx = computeTokenPx(boardMinDim || boardWidth, players.length);

  // Measure the full board area for dynamic token sizing
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

  // Re-sync selected player from store so the modal reflects live updates
  const livePlayer = selectedPlayer
    ? game.players.find(p => p.id === selectedPlayer.id) ?? null
    : null;

  /**
   * Returns the clamped pixel position for a player token so that the entire
   * container (circle + name label + reminder chips) stays within the board.
   * Falls back to percentage strings before the board has been measured.
   */
  function getTokenPos(index: number, player: Player) {
    const angle = (2 * Math.PI * index) / players.length - Math.PI / 2;

    if (!boardWidth || !boardHeight) {
      return {
        left: `${50 + RADIUS_PCT * Math.cos(angle)}%` as string | number,
        top:  `${50 + RADIUS_PCT * Math.sin(angle)}%` as string | number,
      };
    }

    // Container is just the token circle + name label (chips extend radially, not downward)
    const nameH = Math.max(11, Math.min(16, Math.round(tokenPx * 0.17))) + 10;
    const contW = tokenPx + 8;
    const contH = tokenPx + nameH;

    const rawX = boardWidth  * (50 + RADIUS_PCT * Math.cos(angle)) / 100;
    const rawY = boardHeight * (50 + RADIUS_PCT * Math.sin(angle)) / 100;

    return {
      left: Math.max(contW / 2, Math.min(boardWidth  - contW / 2, rawX)),
      top:  Math.max(contH / 2, Math.min(boardHeight - contH / 2, rawY)),
    };
  }

  const isNight = game.phase === 'night';
  const phaseLabel = isNight ? `Night ${game.nightNumber}` : `Day ${game.dayNumber}`;
  const aliveCount = players.filter(p => p.isAlive).length;

  function handleAddPlayer() {
    addPlayer(game.id, newPlayerName);
    setNewPlayerName('');
    setShowAddPlayer(false);
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', background: 'transparent' }}
    >
      {/* ── Top bar ───────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: 56,
          background: 'rgba(8,6,18,0.92)',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Left group: Night Order + Show Roles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNightOrder(true)}
            className="flex items-center gap-2 rounded-xl transition-all active:opacity-60"
            style={{
              padding: '10px 16px',
              minHeight: 44,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: 15,
            }}
          >
            <span>📖</span>
            <span>Night Order</span>
          </button>

          <button
            onClick={() => setShowRoleReveal(true)}
            className="flex items-center gap-2 rounded-xl transition-all active:opacity-60"
            style={{
              padding: '10px 16px',
              minHeight: 44,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: 15,
            }}
          >
            <span>👁</span>
            <span>Show</span>
          </button>

          <button
            onClick={() => setShowCustomMessage(true)}
            className="flex items-center gap-2 rounded-xl transition-all active:opacity-60"
            style={{
              padding: '10px 16px',
              minHeight: 44,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: 15,
            }}
          >
            <span>💬</span>
            <span>Msg</span>
          </button>
        </div>

        {/* Phase controls: back + current phase + forward */}
        <div className="flex items-center gap-1">
          {/* Back one phase */}
          <button
            onClick={() => togglePhaseBack(game.id)}
            disabled={isNight && game.nightNumber === 1}
            className="flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              width: 36,
              height: 36,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: isNight && game.nightNumber === 1
                ? 'var(--color-text-dim)'
                : 'var(--color-text)',
              fontSize: 16,
              opacity: isNight && game.nightNumber === 1 ? 0.35 : 1,
              cursor: isNight && game.nightNumber === 1 ? 'default' : 'pointer',
            }}
            aria-label="Go back one phase"
          >
            ‹
          </button>

          {/* Current phase — tap to advance */}
          <button
            onClick={() => togglePhase(game.id)}
            className="flex items-center gap-2 rounded-full font-semibold transition-all active:scale-95"
            style={{
              padding: '10px 20px',
              minHeight: 44,
              background: isNight
                ? 'linear-gradient(135deg, #0f0a28, #1a0a3e)'
                : 'linear-gradient(135deg, #3a2800, #5a3e00)',
              border: `1px solid ${isNight ? '#6366f1' : '#fbbf24'}`,
              color: isNight ? '#818cf8' : '#fbbf24',
              fontSize: 16,
              boxShadow: `0 0 14px ${isNight ? 'rgba(99,102,241,0.35)' : 'rgba(251,191,36,0.35)'}`,
            }}
          >
            <span>{isNight ? '🌙' : '☀️'}</span>
            <span>{phaseLabel}</span>
          </button>

          {/* Forward one phase (advance) */}
          <button
            onClick={() => togglePhase(game.id)}
            className="flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              width: 36,
              height: 36,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: 16,
            }}
            aria-label="Advance one phase"
          >
            ›
          </button>
        </div>

        {/* Right group: add player + back to home */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAddPlayer(true); setNewPlayerName(''); }}
            className="flex items-center justify-center rounded-xl transition-all active:opacity-60"
            style={{
              width: 44,
              height: 44,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: 22,
            }}
            aria-label="Add player"
          >
            +
          </button>
          <a
            href="/"
            className="flex items-center justify-center rounded-xl transition-all active:opacity-60"
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              background: 'rgba(30,20,50,0.6)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
              fontSize: 20,
              textDecoration: 'none',
            }}
            aria-label="Back to home"
          >
            ⬅
          </a>
        </div>
      </div>

      {/* ── Board area ────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Board fills the entire available area; tokens form an ellipse on non-square screens */}
        <div
          ref={boardRef}
          className="absolute inset-0"
        >
          {/* Dashed ellipse guide */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: `${RADIUS_PCT * 2}%`,
              height: `${RADIUS_PCT * 2}%`,
              left: `${50 - RADIUS_PCT}%`,
              top:  `${50 - RADIUS_PCT}%`,
              borderRadius: '50%',
              border: '1px dashed rgba(201,168,76,0.12)',
            }}
          />

          {/* Center display */}
          <div
            className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <span
              style={{ fontSize: Math.max(36, boardMinDim * 0.06), lineHeight: 1 }}
            >
              {isNight ? '🌙' : '☀️'}
            </span>
            <span
              className="font-semibold mt-1"
              style={{
                fontSize: Math.max(13, boardMinDim * 0.025),
                color: isNight ? '#818cf8' : '#fbbf24',
                textShadow: `0 0 12px ${isNight ? 'rgba(129,140,248,0.5)' : 'rgba(251,191,36,0.5)'}`,
              }}
            >
              {phaseLabel}
            </span>
            <span
              className="mt-1"
              style={{
                fontSize: Math.max(11, boardMinDim * 0.018),
                color: 'var(--color-text-dim)',
              }}
            >
              {aliveCount}/{players.length} alive
            </span>
          </div>

          {/* Player tokens */}
          {players.map((player, index) => {
            const angle = (2 * Math.PI * index) / players.length - Math.PI / 2;
            const pos   = getTokenPos(index, player);
            const role  = player.roleId ? rolesDb[player.roleId] : null;
            return (
              <div
                key={player.id}
                className="absolute"
                style={{
                  left: pos.left,
                  top:  pos.top,
                  transform: 'translate(-50%, -50%)',
                  zIndex: selectedPlayer?.id === player.id ? 20 : 1,
                }}
              >
                <PlayerToken
                  player={player}
                  role={role}
                  sizePx={tokenPx}
                  inwardAngle={angle + Math.PI}
                  onClick={() => setSelectedPlayer(player)}
                  onRemoveReminder={tokenId =>
                    removeReminderToken(game.id, player.id, tokenId)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Modal */}
      {livePlayer && (
        <PlayerModal
          player={livePlayer}
          game={game}
          rolesDb={rolesDb}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* Night Order Panel */}
      <NightOrderPanel
        game={game}
        rolesDb={rolesDb}
        allRoles={allRoles}
        isOpen={showNightOrder}
        onClose={() => setShowNightOrder(false)}
      />

      {/* Role Reveal Screen */}
      {showRoleReveal && (
        <RoleRevealScreen
          scriptRoleIds={game.scriptRoleIds}
          rolesDb={rolesDb}
          onClose={() => setShowRoleReveal(false)}
        />
      )}

      {/* Custom Message Screen */}
      {showCustomMessage && (
        <CustomMessageScreen onClose={() => setShowCustomMessage(false)} />
      )}

      {/* Add Player Modal */}
      {showAddPlayer && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowAddPlayer(false)}
          />
          <div
            className="fixed z-50 rounded-2xl flex flex-col gap-4"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
              maxWidth: '90vw',
              padding: '24px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            }}
          >
            <p className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
              Add Player
            </p>
            <input
              type="text"
              placeholder="Player name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddPlayer(); if (e.key === 'Escape') setShowAddPlayer(false); }}
              className="rounded-lg px-3 py-3 outline-none w-full"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-gold-dim)',
                color: 'var(--color-text)',
                fontSize: 16,
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPlayer(false)}
                className="flex-1 rounded-xl py-3 font-medium transition-all active:opacity-60"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-dim)',
                  fontSize: 15,
                }}
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
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bluff drawer — fixed bottom-left, always mounted */}
      <BluffDrawer game={game} rolesDb={rolesDb} />

      {/* Storytools drawer — fixed top-left, always mounted */}
      <StorytoolsDrawer game={game} rolesDb={rolesDb} />
    </div>
  );
}
