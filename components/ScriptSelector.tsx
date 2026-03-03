'use client';

import { useRef, useState } from 'react';
import type { RoleDefinition, ParsedScript } from '@/lib/types';
import { loadBuiltinScript, parseUploadedScript } from '@/lib/scriptLoader';

interface BuiltinScript {
  id: 'tb' | 'bmr' | 'snv';
  name: string;
  subtitle: string;
  color: string;
  borderColor: string;
}

const BUILTIN_SCRIPTS: BuiltinScript[] = [
  {
    id: 'tb',
    name: 'Trouble Brewing',
    subtitle: 'Beginner — 13 Townsfolk, 4 Outsiders, 4 Minions, 1 Demon',
    color: 'rgba(30, 58, 138, 0.4)',
    borderColor: '#3b82f6',
  },
  {
    id: 'bmr',
    name: 'Bad Moon Rising',
    subtitle: 'Intermediate — Horror & Chaos',
    color: 'rgba(92, 45, 12, 0.4)',
    borderColor: '#c2410c',
  },
  {
    id: 'snv',
    name: 'Sects & Violets',
    subtitle: 'Advanced — Madness & Confusion',
    color: 'rgba(88, 28, 135, 0.4)',
    borderColor: '#9333ea',
  },
];

interface Props {
  rolesDb: Record<string, RoleDefinition>;
  onSelect: (script: ParsedScript) => void;
}

export default function ScriptSelector({ rolesDb, onSelect }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleBuiltinSelect(id: 'tb' | 'bmr' | 'snv') {
    setLoading(id);
    setError(null);
    try {
      const script = await loadBuiltinScript(id, rolesDb);
      onSelect(script);
    } catch {
      setError(`Failed to load ${id.toUpperCase()} script. Please try again.`);
    } finally {
      setLoading(null);
    }
  }

  function handleWhaleBuffet() {
    const roleIds = Object.values(rolesDb)
      .filter(r => r.team !== '')
      .map(r => r.id);
    onSelect({
      meta: { id: 'custom-wb', name: 'Whale Buffet' },
      roleIds,
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const result = parseUploadedScript(content, rolesDb);
      if ('error' in result) {
        setError(result.error);
      } else {
        onSelect(result);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className="space-y-3">
      {BUILTIN_SCRIPTS.map(s => (
        <button
          key={s.id}
          onClick={() => handleBuiltinSelect(s.id)}
          disabled={loading !== null}
          className="w-full text-left p-4 rounded-xl transition-all active:scale-95 disabled:opacity-60"
          style={{
            background: s.color,
            border: `1px solid ${s.borderColor}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                {s.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                {s.subtitle}
              </p>
            </div>
            {loading === s.id && (
              <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                Loading…
              </span>
            )}
          </div>
        </button>
      ))}

      {/* Whale Buffet */}
      <button
        onClick={handleWhaleBuffet}
        disabled={loading !== null}
        className="w-full text-left p-4 rounded-xl transition-all active:scale-95 disabled:opacity-60"
        style={{
          background: 'rgba(6, 78, 59, 0.4)',
          border: '1px solid #10b981',
        }}
      >
        <p className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
          Whale Buffet
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
          All roles from every edition
        </p>
      </button>

      {/* Custom upload */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading !== null}
        className="w-full text-left p-4 rounded-xl transition-all active:scale-95 disabled:opacity-60"
        style={{
          background: 'transparent',
          border: '1px dashed var(--color-border)',
        }}
      >
        <p className="font-semibold text-base" style={{ color: 'var(--color-text-dim)' }}>
          Upload Custom Script
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
          JSON file from the Script Tool or clocktower.online
        </p>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
