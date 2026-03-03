'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Game, RoleDefinition } from '@/lib/types';
import { getIconPath } from '@/lib/roles';
import { useIsWide } from '@/lib/hooks';

interface Jinx {
  id1: string;
  id2: string;
  rule: string;
}

interface Props {
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  isOpen: boolean;
  onClose: () => void;
}

export default function JinxPanel({ game, rolesDb, isOpen, onClose }: Props) {
  const isWide = useIsWide();
  const [allJinxes, setAllJinxes] = useState<Jinx[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen || allJinxes !== null) return;
    fetch('/data/jinxes.json')
      .then(r => r.json())
      .then(setAllJinxes)
      .catch(() => setLoadError(true));
  }, [isOpen, allJinxes]);

  const assignedRoleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of game.players) {
      if (p.roleId) ids.add(p.roleId);
    }
    return ids;
  }, [game.players]);

  const relevant = useMemo(() => {
    if (!allJinxes) return [];
    const scriptRoleSet = new Set(game.scriptRoleIds);
    const filtered = allJinxes.filter(j => scriptRoleSet.has(j.id1) && scriptRoleSet.has(j.id2));
    // Jinxes where both roles are assigned to players sort to the top
    return filtered.sort((a, b) => {
      const aActive = assignedRoleIds.has(a.id1) && assignedRoleIds.has(a.id2) ? 0 : 1;
      const bActive = assignedRoleIds.has(b.id1) && assignedRoleIds.has(b.id2) ? 0 : 1;
      return aActive - bActive;
    });
  }, [allJinxes, game.scriptRoleIds, assignedRoleIds]);

  const subtitle = loadError
    ? 'Failed to load'
    : allJinxes === null
    ? 'Loading…'
    : relevant.length === 1
    ? '1 active jinx'
    : `${relevant.length} active jinxes`;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: isWide ? 420 : 'min(320px, 85vw)',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-base font-semibold gothic-heading">Jinxes</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-xl active:opacity-60"
            style={{ color: 'var(--color-text-dim)' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {allJinxes === null && !loadError && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-dim)' }}>
              Loading…
            </p>
          )}

          {loadError && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-dim)' }}>
              Failed to load jinxes.
            </p>
          )}

          {allJinxes !== null && relevant.length === 0 && (
            <p className="text-center py-8 text-sm px-4" style={{ color: 'var(--color-text-dim)' }}>
              No jinxes for the current script.
            </p>
          )}

          {relevant.map((jinx, i) => {
            const role1 = rolesDb[jinx.id1];
            const role2 = rolesDb[jinx.id2];
            const isActive = assignedRoleIds.has(jinx.id1) && assignedRoleIds.has(jinx.id2);
            return (
              <div
                key={i}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  borderLeft: isActive ? '3px solid var(--color-gold)' : '3px solid transparent',
                  padding: isWide ? '16px 20px' : '14px 16px',
                  background: isActive ? 'rgba(201,168,76,0.07)' : 'transparent',
                }}
              >
                {/* Icons row */}
                <div className="flex items-center gap-3 mb-2">
                  {/* Role 1 */}
                  <div className="flex flex-col items-center gap-1" style={{ width: 48 }}>
                    <div
                      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        background: 'rgba(30,20,50,0.8)',
                        border: isActive ? '1px solid var(--color-gold-dim)' : '1px solid var(--color-border)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getIconPath(jinx.id1)}
                        alt={role1?.name ?? jinx.id1}
                        className="w-full h-full object-contain p-0.5"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <span
                      className="text-center truncate w-full"
                      style={{ fontSize: 10, color: 'var(--color-text-dim)' }}
                    >
                      {role1?.name ?? jinx.id1}
                    </span>
                  </div>

                  <span style={{ color: 'var(--color-text-dim)', fontSize: 16 }}>×</span>

                  {/* Role 2 */}
                  <div className="flex flex-col items-center gap-1" style={{ width: 48 }}>
                    <div
                      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        background: 'rgba(30,20,50,0.8)',
                        border: isActive ? '1px solid var(--color-gold-dim)' : '1px solid var(--color-border)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getIconPath(jinx.id2)}
                        alt={role2?.name ?? jinx.id2}
                        className="w-full h-full object-contain p-0.5"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <span
                      className="text-center truncate w-full"
                      style={{ fontSize: 10, color: 'var(--color-text-dim)' }}
                    >
                      {role2?.name ?? jinx.id2}
                    </span>
                  </div>
                </div>

                {/* Rule text */}
                <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5 }}>
                  {jinx.rule}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
