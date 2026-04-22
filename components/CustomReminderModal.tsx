'use client';

import { useState } from 'react';
import type { Game, Player } from '@/lib/types';
import { useStore } from '@/lib/store';

interface Props {
  player: Player;
  game: Game;
  onClose: () => void;
}

export default function CustomReminderModal({ player, game, onClose }: Props) {
  const { addReminderToken } = useStore();
  const [text, setText] = useState('');

  function handleAdd() {
    const label = text.trim();
    if (!label) return;
    addReminderToken(game.id, player.id, { sourceRoleId: '', label });
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-[81]"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 16px 40px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="mx-auto mb-4 rounded-full"
          style={{ width: 36, height: 4, background: 'var(--color-border)' }}
        />
        <p
          className="font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontSize: 16 }}
        >
          Custom Reminder · {player.name}
        </p>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) handleAdd(); if (e.key === 'Escape') onClose(); }}
          placeholder="Reminder text…"
          autoFocus
          className="w-full rounded-xl outline-none mb-4"
          style={{
            padding: '12px 14px',
            fontSize: 16,
            background: 'rgba(20,12,40,0.8)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3.5 font-semibold transition-all active:scale-95"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
              fontSize: 16,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="flex-1 rounded-2xl py-3.5 font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: 'rgba(168,85,247,0.2)',
              border: '1px solid rgba(168,85,247,0.6)',
              color: 'rgba(216,180,254,0.95)',
              fontSize: 16,
            }}
          >
            Add
          </button>
        </div>
      </div>
    </>
  );
}
