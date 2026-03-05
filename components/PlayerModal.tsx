'use client';

import { useState } from 'react';
import type { Player, RoleDefinition, Game } from '@/lib/types';
import { getRoleIconPath, getRoleTeamColor } from '@/lib/roles';
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
  const { updatePlayer, addReminderToken, removeReminderToken, removePlayer } = useStore();
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderSearch, setReminderSearch] = useState('');
  const [reminderSourceRole, setReminderSourceRole] = useState<RoleDefinition | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customReminderText, setCustomReminderText] = useState('');
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

  function handleAddOwnReminder(label: string) {
    if (!role) return;
    addReminderToken(game.id, player.id, { sourceRoleId: role.id, label });
  }

  function handleAddCrossReminder(label: string) {
    if (!reminderSourceRole) return;
    addReminderToken(game.id, player.id, { sourceRoleId: reminderSourceRole.id, label });
    setReminderSourceRole(null);
    setShowAddReminder(false);
  }

  function handleAddCustomReminder() {
    const text = customReminderText.trim();
    if (!text) return;
    addReminderToken(game.id, player.id, { sourceRoleId: '', label: text });
    setCustomReminderText('');
    setShowCustomInput(false);
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
          <input
            type="text"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
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
      <div className="mb-4">
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-dim)' }}>
          Reminder Tokens
        </p>

        {player.reminderTokens.length > 0 && (
          <div className="space-y-2 mb-4">
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
        )}

        {/* Own role reminders */}
        {role && role.reminders.length > 0 && (
          <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-dim)' }}>
              From {role.name}:
            </p>
            <div className="flex flex-wrap gap-2">
              {role.reminders.map((label, i) => (
                <button
                  key={i}
                  onClick={() => handleAddOwnReminder(label)}
                  className="rounded-lg transition-all active:scale-95"
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    background: 'var(--color-bg)',
                    border: `1px solid ${teamColor}66`,
                    color: teamColor,
                  }}
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cross-role reminders + custom */}
        {!showAddReminder && !showCustomInput ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setShowAddReminder(true); setReminderSearch(''); }}
              className="w-full rounded-lg transition-all active:opacity-60"
              style={{
                padding: '10px 14px',
                fontSize: 13,
                background: 'transparent',
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-dim)',
              }}
            >
              + Add reminder from another role
            </button>
            <button
              onClick={() => { setShowCustomInput(true); setCustomReminderText(''); }}
              className="w-full rounded-lg transition-all active:opacity-60"
              style={{
                padding: '10px 14px',
                fontSize: 13,
                background: 'transparent',
                border: '1px dashed rgba(168,85,247,0.4)',
                color: 'rgba(168,85,247,0.8)',
              }}
            >
              + Custom reminder
            </button>
          </div>
        ) : showCustomInput ? (
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-dim)' }}>Custom reminder text:</p>
            <textarea
              value={customReminderText}
              onChange={e => setCustomReminderText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCustomReminder(); } }}
              placeholder="e.g. Checked for poisoned…"
              rows={3}
              className="w-full rounded-lg outline-none resize-none mb-2"
              style={{
                padding: '8px 12px',
                fontSize: 13,
                background: 'var(--color-bg)',
                border: '1px solid rgba(168,85,247,0.4)',
                color: 'var(--color-text)',
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomInput(false)}
                className="rounded-lg px-3 py-2 text-sm active:opacity-60"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomReminder}
                disabled={!customReminderText.trim()}
                className="flex-1 rounded-lg py-2 text-sm font-semibold active:scale-95 disabled:opacity-40"
                style={{
                  background: 'rgba(168,85,247,0.15)',
                  border: '1px solid rgba(168,85,247,0.5)',
                  color: 'rgba(216,180,254,0.9)',
                }}
              >
                Add
              </button>
            </div>
          </div>
        ) : reminderSourceRole ? (
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-dim)' }}>
              From {reminderSourceRole.name}:
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {reminderSourceRole.reminders.map((label, i) => (
                <button
                  key={i}
                  onClick={() => handleAddCrossReminder(label)}
                  className="rounded-lg transition-all active:scale-95"
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  + {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setReminderSourceRole(null); setShowAddReminder(false); }}
              className="text-sm"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-dim)' }}>
              Pick source role:
            </p>
            <input
              type="text"
              value={reminderSearch}
              onChange={e => setReminderSearch(e.target.value)}
              placeholder="Search roles…"
              className="w-full rounded-lg outline-none mb-2"
              style={{
                padding: '8px 12px',
                fontSize: 13,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              autoFocus
            />
            <div
              className="overflow-y-auto space-y-1.5"
              style={{ maxHeight: 240 }}
            >
              {(() => {
                const assignedIds = new Set(
                  game.players.map(p => p.roleId).filter(Boolean)
                );
                const storyToolIds = [...(game.loricIds ?? []), ...(game.fabledIds ?? [])];
                const allIds = [...game.scriptRoleIds, ...storyToolIds];
                return allIds
                  .map(id => rolesDb[id])
                  .filter((r): r is RoleDefinition =>
                    !!r &&
                    r.reminders.length > 0 &&
                    (!reminderSearch || r.name.toLowerCase().includes(reminderSearch.toLowerCase()))
                  )
                  .sort((a, b) => {
                    const aIsStory = a.team === 'loric' || a.team === 'fabled';
                    const bIsStory = b.team === 'loric' || b.team === 'fabled';
                    if (aIsStory !== bIsStory) return aIsStory ? 1 : -1;
                    const aIn = assignedIds.has(a.id) ? 0 : 1;
                    const bIn = assignedIds.has(b.id) ? 0 : 1;
                    return aIn - bIn;
                  });
              })().map(r => {
                const isStoryTool = r.team === 'loric' || r.team === 'fabled';
                const isAssigned = !isStoryTool && game.players.some(p => p.roleId === r.id);
                const storyColor = isStoryTool ? getRoleTeamColor(r.team) : null;
                return (
                  <button
                    key={r.id}
                    onClick={() => setReminderSourceRole(r)}
                    className="w-full text-left flex items-center gap-3 rounded-lg transition-colors active:opacity-60"
                    style={{
                      padding: '10px 12px',
                      background: storyColor
                        ? `${storyColor}14`
                        : isAssigned ? 'rgba(201,168,76,0.08)' : 'var(--color-bg)',
                      border: `1px solid ${storyColor
                        ? `${storyColor}59`
                        : isAssigned ? 'rgba(201,168,76,0.35)' : 'var(--color-border)'}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getRoleIconPath(r)}
                      alt={r.name}
                      className="rounded-full object-contain flex-shrink-0"
                      style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.3)' }}
                    />
                    <span className="text-sm" style={{ color: storyColor ?? 'var(--color-text)' }}>
                      {r.name}
                    </span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--color-text-dim)' }}>
                      {r.reminders.length} token{r.reminders.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowAddReminder(false)}
              className="text-sm mt-2"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

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
