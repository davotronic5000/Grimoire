'use client';

import type { ReminderToken, RoleDefinition } from '@/lib/types';
import { getIconPath } from '@/lib/roles';

interface Props {
  token: ReminderToken;
  sourceRole: RoleDefinition | null;
  onRemove: () => void;
  size?: 'sm' | 'md';
}

export default function ReminderChip({
  token,
  sourceRole,
  onRemove,
  size = 'md',
}: Props) {
  const isSm = size === 'sm';

  if (isSm) {
    // Compact chip for displaying around a player token on the board
    return (
      <div
        className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
        style={{
          background: 'rgba(30,20,50,0.9)',
          border: '1px solid rgba(201,168,76,0.4)',
          maxWidth: '64px',
        }}
        title={token.label}
      >
        {sourceRole && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getIconPath(token.sourceRoleId)}
            alt=""
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ opacity: 0.8 }}
          />
        )}
        <span
          className="text-[10px] truncate leading-none"
          style={{ color: 'var(--color-gold)', maxWidth: '44px' }}
        >
          {token.label}
        </span>
      </div>
    );
  }

  // Full chip for modal list view
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2"
      style={{
        background: 'rgba(30,20,50,0.6)',
        border: '1px solid var(--color-border)',
      }}
    >
      {sourceRole && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getIconPath(token.sourceRoleId)}
          alt={sourceRole.name}
          className="w-6 h-6 rounded-full flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
          {token.label}
        </p>
        {sourceRole && (
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            {sourceRole.name}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="ml-2 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-sm transition-colors active:opacity-60"
        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}
        aria-label="Remove reminder"
      >
        ×
      </button>
    </div>
  );
}
