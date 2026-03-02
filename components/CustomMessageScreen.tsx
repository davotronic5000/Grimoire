'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
}

function getMessageFontSize(msg: string): string {
  const len = msg.length;
  if (len <= 12)  return 'clamp(52px, 15vmin, 160px)';
  if (len <= 30)  return 'clamp(40px, 11vmin, 120px)';
  if (len <= 60)  return 'clamp(30px, 8vmin,  88px)';
  if (len <= 120) return 'clamp(22px, 6vmin,  64px)';
  return                  'clamp(18px, 4.5vmin, 48px)';
}

export default function CustomMessageScreen({ onClose }: Props) {
  const [message, setMessage] = useState('');
  const [showing, setShowing] = useState(false);

  // ── Player-facing reveal ────────────────────────────────────────────
  if (showing) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ background: '#06040f' }}
      >
        <p
          className="text-center font-bold gothic-heading"
          style={{
            fontSize: getMessageFontSize(message.trim()),
            color: 'var(--color-gold)',
            textShadow: '0 0 40px rgba(201,168,76,0.45)',
            lineHeight: 1.25,
            padding: '0 8%',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.trim()}
        </p>

        <div className="absolute bottom-6 flex justify-center w-full px-4">
          <button
            onClick={onClose}
            className="rounded-full font-semibold transition-all active:scale-95"
            style={{
              padding: '14px 48px',
              background: 'rgba(30,20,50,0.9)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
              fontSize: 16,
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Storyteller compose ─────────────────────────────────────────────
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
          Cancel
        </button>

        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
          Custom Message
        </p>

        <button
          onClick={() => setShowing(true)}
          disabled={!message.trim()}
          className="text-sm font-semibold rounded-lg px-3 py-1.5 transition-all active:scale-95"
          style={{
            background: message.trim() ? 'rgba(99,102,241,0.2)' : 'transparent',
            border: `1px solid ${message.trim() ? '#6366f1' : 'transparent'}`,
            color: message.trim() ? '#a5b4fc' : 'transparent',
          }}
        >
          Show
        </button>
      </div>

      <p
        className="text-xs text-center px-4 pt-2 pb-1 flex-shrink-0"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Type a message to display full-screen to the player
      </p>

      {/* Text input area */}
      <div className="flex-1 flex flex-col px-4 pt-3 pb-4 gap-4">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Enter message…"
          autoFocus
          className="flex-1 rounded-2xl outline-none resize-none"
          style={{
            padding: '16px',
            fontSize: 18,
            lineHeight: 1.5,
            background: 'rgba(20,12,40,0.8)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />

        {/* Preview hint */}
        {message.trim() && (
          <p
            className="text-center text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Font size will be{' '}
            <span style={{ color: 'var(--color-gold)' }}>
              {message.trim().length <= 12 ? 'huge'
                : message.trim().length <= 30 ? 'very large'
                : message.trim().length <= 60 ? 'large'
                : message.trim().length <= 120 ? 'medium'
                : 'smaller'}
            </span>{' '}
            · {message.trim().length} chars
          </p>
        )}

        <button
          onClick={() => setShowing(true)}
          disabled={!message.trim()}
          className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-95"
          style={{
            background: message.trim()
              ? 'linear-gradient(135deg, #2d1f5e, #3d2878)'
              : 'rgba(30,20,50,0.4)',
            border: `1px solid ${message.trim() ? '#6366f1' : 'var(--color-border)'}`,
            color: message.trim() ? '#a5b4fc' : 'var(--color-text-dim)',
            fontSize: 17,
          }}
        >
          Show to Player
        </button>
      </div>
    </div>
  );
}
