'use client';

import { useState } from 'react';
import type { Player, RoleDefinition, Game } from '@/lib/types';
import { getRoleIconPath, getRoleTeamColor } from '@/lib/roles';
import ClearableInput from './ClearableInput';
import { useIsWide } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import RoleSelector from './RoleSelector';
import ReminderChip from './ReminderChip';

interface Props {
  player: Player;
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  onClose: () => void;
}

export default function PlayerModal({ player, game, rolesDb, onClose }: Props) {
  const { updatePlayer, removeReminderToken, removePlayer } = useStore();
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(player.name);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isWide = useIsWide(); // true on iPad Pro in all orientations

  const role = player.roleId ? rolesDb[player.roleId] : null;
  const teamColor = getRoleTeamColor(role?.team);

  function handleRoleSelect(roleId: string) {
    updatePlayer(game.id, player.id, { roleId });
  }

  function handleToggleAlive() {
    const dying = player.isAlive;
    updatePlayer(game.id, player.id, { isAlive: !player.isAlive, hasGhostVote: dying });
  }

  function handleNameSave() {
    if (nameValue.trim()) {
      updatePlayer(game.id, player.id, { name: nameValue.trim() });
    } else {
      setNameValue(player.name);
    }
    setEditingName(false);
  }

  if (showRoleSelector) {
    return (
      <RoleSelector
        scriptRoleIds={game.scriptRoleIds}
        rolesDb={rolesDb}
        currentRoleId={player.roleId}
        onSelect={handleRoleSelect}
        onClose={() => setShowRoleSelector(false)}
      />
    );
  }

  // ── Modal content (shared between both layout modes) ─────────────
  const content = (
    <div className="overflow-y-auto flex-1 px-5 pb-8">
      {/* Player name */}
      <div
        className="flex items-center gap-3 py-4 border-b mb-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {editingName ? (
          <ClearableInput
            type="text"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onClear={() => setNameValue('')}
            onBlur={handleNameSave}
            onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); }}
            className="flex-1 font-semibold px-3 py-2 rounded-lg outline-none"
            style={{
              fontSize: 20,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-gold-dim)',
              color: 'var(--color-text)',
            }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left font-semibold active:opacity-60 flex items-center gap-2"
            style={{ fontSize: 20, color: 'var(--color-text)' }}
          >
            {player.name}
            <span style={{ fontSize: 14, color: 'var(--color-text-dim)' }}>✏️</span>
          </button>
        )}
        {isWide && (
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-xl active:opacity-60"
            style={{ color: 'var(--color-text-dim)', background: 'rgba(255,255,255,0.06)' }}
          >
            ×
          </button>
        )}
      </div>

      {/* Role */}
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-dim)' }}>
          Role
        </p>
        <div className="flex items-stretch gap-2">
        <button
          onClick={() => setShowRoleSelector(true)}
          className="flex-1 flex items-center gap-4 rounded-xl active:opacity-70 transition-opacity"
          style={{
            padding: '14px 16px',
            background: role ? `${teamColor}22` : 'var(--color-bg)',
            border: `1px solid ${role ? teamColor : 'var(--color-border)'}`,
          }}
        >
          {role ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getRoleIconPath(role)}
                alt={role.name}
                className="rounded-full object-contain flex-shrink-0"
                style={{ width: 56, height: 56, background: 'rgba(0,0,0,0.3)', padding: 3 }}
              />
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-base" style={{ color: teamColor }}>
                  {role.name}
                </p>
                <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                  {role.ability}
                </p>
              </div>
            </>
          ) : (
            <p className="text-base" style={{ color: 'var(--color-text-dim)' }}>
              Tap to assign role →
            </p>
          )}
        </button>
        {role && (
          <button
            onClick={() => updatePlayer(game.id, player.id, { roleId: null })}
            className="flex items-center justify-center rounded-xl active:scale-90 flex-shrink-0"
            style={{
              width: 44,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#ef4444',
              fontSize: 20,
            }}
            aria-label="Remove role"
          >
            ×
          </button>
        )}
        </div>
      </div>

      {/* Status */}
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-dim)' }}>
          Status
        </p>
        {/* Alignment */}
        <div className="flex gap-2 mb-3">
          {(['good', 'evil'] as const).map(a => {
            const isSet = player.alignment === a;
            const color = a === 'good' ? '#60a5fa' : '#f87171';
            const bg = a === 'good' ? 'rgba(96,165,250,0.15)' : 'rgba(248,113,113,0.15)';
            const label = a === 'good' ? '☀ Good' : '☽ Evil';
            return (
              <button
                key={a}
                onClick={() => updatePlayer(game.id, player.id, { alignment: isSet ? null : a })}
                className="flex-1 rounded-xl font-semibold transition-all active:scale-95"
                style={{
                  padding: '10px 14px',
                  fontSize: 14,
                  background: isSet ? bg : 'transparent',
                  border: `1px solid ${isSet ? color : 'var(--color-border)'}`,
                  color: isSet ? color : 'var(--color-text-dim)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleToggleAlive}
            className="flex-1 rounded-xl font-semibold transition-all active:scale-95"
            style={{
              padding: '14px 16px',
              fontSize: 15,
              background: player.isAlive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${player.isAlive ? '#22c55e' : '#ef4444'}`,
              color: player.isAlive ? '#22c55e' : '#ef4444',
            }}
          >
            {player.isAlive ? '❤️ Alive' : '✝️ Dead'}
          </button>

          {!player.isAlive && (
            <button
              onClick={() => updatePlayer(game.id, player.id, { hasGhostVote: !player.hasGhostVote })}
              className="flex-1 rounded-xl font-semibold transition-all active:scale-95"
              style={{
                padding: '14px 16px',
                fontSize: 15,
                background: player.hasGhostVote ? 'rgba(168,85,247,0.2)' : 'var(--color-bg)',
                border: `1px solid ${player.hasGhostVote ? '#a855f7' : 'var(--color-border)'}`,
                color: player.hasGhostVote ? '#a855f7' : 'var(--color-text-dim)',
              }}
            >
              👻 Ghost Vote
            </button>
          )}
        </div>
      </div>

      {/* Reminder tokens */}
      {player.reminderTokens.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-dim)' }}>
            Reminder Tokens
          </p>
          <div className="space-y-2">
            {player.reminderTokens.map(t => (
              <ReminderChip
                key={t.id}
                token={t}
                sourceRole={rolesDb[t.sourceRoleId] ?? null}
                onRemove={() => removeReminderToken(game.id, player.id, t.id)}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {/* Remove player */}
      <div
        className="px-5 pb-6 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}
      >
        {confirmRemove ? (
          <div className="flex items-center gap-3">
            <span className="text-sm flex-1" style={{ color: 'var(--color-text-dim)' }}>
              Remove {player.name}?
            </span>
            <button
              onClick={() => setConfirmRemove(false)}
              className="rounded-lg px-4 py-2 text-sm active:opacity-60"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { removePlayer(game.id, player.id); onClose(); }}
              className="rounded-lg px-4 py-2 text-sm font-semibold active:scale-95"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444' }}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRemove(true)}
            className="w-full rounded-xl py-3 text-sm transition-all active:opacity-60"
            style={{
              background: 'transparent',
              border: '1px dashed rgba(239,68,68,0.4)',
              color: 'rgba(239,68,68,0.7)',
            }}
          >
            Remove player
          </button>
        )}
      </div>
    </div>
  );

  // ── iPad / wide-screen: centered dialog ───────────────────────────
  if (isWide) {
    return (
      <>
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={onClose}
        />
        <div
          className="fixed z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 560,
            maxWidth: '90vw',
            maxHeight: '82vh',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {content}
        </div>
      </>
    );
  }

  // ── Mobile: bottom sheet ───────────────────────────────────────────
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl overflow-hidden sheet-enter"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
          maxHeight: '85dvh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>
        {content}
      </div>
    </>
  );
}
