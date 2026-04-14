'use client';

import { useState } from 'react';
import type { Player, RoleDefinition } from '@/lib/types';
import { getIconPath, getGenericIconPath, getRoleIconPath, getRoleTeamColor } from '@/lib/roles';

interface Props {
  player: Player;
  role: RoleDefinition | null;
  rolesDb: Record<string, RoleDefinition>;
  /** Token diameter in pixels — calculated dynamically by GrimoireBoard */
  sizePx: number;
  /** Angle (radians) pointing from this token toward the board center */
  inwardAngle: number;
  onClick: () => void;
  onRemoveReminder: (tokenId: string) => void;
  /** Relative rank in first-night order among in-play roles (null = doesn't wake) */
  firstNightOrder: number | null;
  /** Relative rank in other-nights order among in-play roles (null = doesn't wake) */
  otherNightOrder: number | null;
}

export default function PlayerToken({ player, role, rolesDb, sizePx: px, inwardAngle, onClick, onRemoveReminder, firstNightOrder, otherNightOrder }: Props) {
  const isDead = !player.isAlive;
  const teamColor = getRoleTeamColor(role?.team);
  const [popupTokenId, setPopupTokenId] = useState<string | null>(null);

  // Reminder chips: 50% bigger, arranged in two columns along the inward ray
  const chipSize = Math.max(63, Math.round(px * 0.81));
  const maxVisible = 6;
  const visibleReminders = player.reminderTokens.slice(0, maxVisible);
  const extraCount = player.reminderTokens.length - maxVisible;

  const ringClass =
    !role ? 'ring-unassigned'
    : role.team === 'townsfolk' ? 'ring-townsfolk'
    : role.team === 'outsider' ? 'ring-outsider'
    : role.team === 'minion' ? 'ring-minion'
    : role.team === 'demon' ? 'ring-demon'
    : role.team === 'traveler' ? 'ring-traveler'
    : 'ring-unassigned';

  // ── SVG arc for the curved role name ────────────────────────────
  // Arc runs along the bottom of the circle from ~165° to ~15° (counterclockwise, sweep=0).
  // Wider span (150° vs 116°) gives ~30% more arc length so long names like
  // "Devils Advocate" fit without clipping.
  const cx = px / 2;
  const cy = px / 2;
  const arcR = px / 2 * 0.83;                          // slightly inside the rim
  const a1 = (165 * Math.PI) / 180;                    // start angle (lower-left)
  const a2 = (15  * Math.PI) / 180;                    // end angle   (lower-right)
  const arcX1 = cx + arcR * Math.cos(a1);
  const arcY1 = cy + arcR * Math.sin(a1);
  const arcX2 = cx + arcR * Math.cos(a2);
  const arcY2 = cy + arcR * Math.sin(a2);
  // "0 0 0" = no x-rotation, short arc, counterclockwise sweep → routes through bottom
  const arcD = `M ${arcX1.toFixed(1)} ${arcY1.toFixed(1)} A ${arcR.toFixed(1)} ${arcR.toFixed(1)} 0 0 0 ${arcX2.toFixed(1)} ${arcY2.toFixed(1)}`;
  const arcId = `arc-${player.id}`;

  const roleNameSize  = Math.max(9,  Math.min(13, Math.round(px * 0.12)));
  const playerNameSize = Math.max(11, Math.min(16, Math.round(px * 0.17)));

  const containerWidth = px;

  // Inward radial vector components
  const cosA = Math.cos(inwardAngle);
  const sinA = Math.sin(inwardAngle);
  // Perpendicular to inward ray (rotate 90°) — used for two-column offset
  const perpCos = -sinA;
  const perpSin = cosA;

  const chipGap = 6;
  const chipStep = chipSize + chipGap;
  // Two columns: each column center is offset ±colOffset from the ray center line
  const colGap = 4;
  const colOffset = (chipSize + colGap) / 2;

  // Start distance: chip edge must clear the token circle rim AND the player name label.
  const nameH = playerNameSize + 10;
  const labelClearance = sinA > 0 ? nameH * sinA : 0;
  const startDist = px / 2 + chipSize / 2 + chipGap + labelClearance;

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{ width: containerWidth, position: 'relative' }}
    >
      {/* ── Token circle ──────────────────────────────────── */}
      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        className={`rounded-full overflow-hidden transition-transform active:scale-90 flex-shrink-0 ${ringClass} ${isDead ? 'token-dead' : ''}`}
        style={{
          width: px,
          height: px,
          position: 'relative',
          background: role
            ? `radial-gradient(circle at 40% 30%, ${teamColor}55, #1a1025 70%)`
            : 'rgba(30,20,50,0.8)',
          minWidth: 44,
          minHeight: 44,
          outline: player.alignment
            ? `3px solid ${player.alignment === 'good' ? '#60a5fa' : '#f87171'}`
            : undefined,
          outlineOffset: 2,
          boxShadow: player.alignment
            ? `0 0 18px 4px ${player.alignment === 'good' ? 'rgba(96,165,250,0.45)' : 'rgba(248,113,113,0.45)'}`
            : undefined,
        }}
        aria-label={`${player.name}${role ? ` — ${role.name}` : ' — unassigned'}`}
      >
        {/* Role icon — extra bottom padding leaves room for the curved name */}
        {role ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getRoleIconPath(role)}
            alt={role.name}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              padding: `${Math.max(4, px * 0.07)}px ${Math.max(4, px * 0.07)}px ${Math.max(10, px * 0.17)}px`,
              opacity: isDead ? 0.4 : 1,
            }}
            onError={e => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
            }}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: 'var(--color-text-dim)', fontSize: px * 0.35 }}
          >
            ?
          </span>
        )}

        {/* Curved role name via SVG textPath */}
        {role && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={px}
            height={px}
            viewBox={`0 0 ${px} ${px}`}
          >
            <defs>
              <path id={arcId} d={arcD} />
            </defs>
            <text
              fontSize={roleNameSize}
              fontWeight="700"
              fill={teamColor}
              textAnchor="middle"
              stroke="rgba(0,0,0,0.7)"
              strokeWidth={Math.max(0.5, roleNameSize * 0.2)}
              paintOrder="stroke fill"
              style={{ fontFamily: 'inherit', letterSpacing: '0.02em' }}
            >
              <textPath href={`#${arcId}`} startOffset="50%">
                {role.name}
              </textPath>
            </text>
          </svg>
        )}

        {/* Dead shroud */}
        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: px * 0.38, opacity: 0.9 }}>✝</span>
          </div>
        )}

        {/* Alignment badge — top-centre pill */}
        {player.alignment && (
          <div
            className="absolute flex items-center justify-center font-bold"
            style={{
              top: Math.max(4, px * 0.06),
              left: '50%',
              transform: 'translateX(-50%)',
              borderRadius: 999,
              paddingLeft: Math.max(5, px * 0.08),
              paddingRight: Math.max(5, px * 0.08),
              height: Math.max(14, px * 0.2),
              background: player.alignment === 'good' ? 'rgba(96,165,250,0.9)' : 'rgba(248,113,113,0.9)',
              color: '#fff',
              fontSize: Math.max(8, px * 0.11),
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {player.alignment === 'good' ? 'GOOD' : 'EVIL'}
          </div>
        )}

        {/* Ghost vote badge */}
        {isDead && player.hasGhostVote && (
          <div
            className="absolute rounded-full flex items-center justify-center font-bold"
            style={{
              width: Math.max(20, px * 0.29),
              height: Math.max(20, px * 0.29),
              top: Math.max(2, px * 0.03),
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: Math.max(11, px * 0.17),
              background: 'rgba(168,85,247,0.92)',
              color: '#fff',
              border: '2px solid rgba(216,180,254,0.8)',
              boxShadow: '0 0 8px rgba(168,85,247,0.7)',
            }}
          >
            👻
          </div>
        )}
      </button>

      {/* ── Night order badges — outside button so they're not clipped ── */}
      {(() => {
        const badgeSize = Math.max(16, Math.round(px * 0.22));
        const badgeFontSize = Math.max(9, Math.round(px * 0.13));
        // Vertically centred on the token circle
        const badgeTop = px / 2 - badgeSize / 2;
        return (
          <>
            {firstNightOrder !== null && (
              <div
                className="absolute flex items-center justify-center font-bold rounded-full"
                style={{
                  width: badgeSize,
                  height: badgeSize,
                  fontSize: badgeFontSize,
                  top: badgeTop,
                  left: -badgeSize / 2,
                  background: 'rgba(30,20,50,0.92)',
                  border: '1.5px solid rgba(129,140,248,0.7)',
                  color: '#a5b4fc',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
                title={`First night order: ${firstNightOrder}`}
              >
                {firstNightOrder}
              </div>
            )}
            {otherNightOrder !== null && (
              <div
                className="absolute flex items-center justify-center font-bold rounded-full"
                style={{
                  width: badgeSize,
                  height: badgeSize,
                  fontSize: badgeFontSize,
                  top: badgeTop,
                  left: px - badgeSize / 2,
                  background: 'rgba(30,20,50,0.92)',
                  border: '1.5px solid rgba(251,191,36,0.7)',
                  color: '#fbbf24',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
                title={`Other nights order: ${otherNightOrder}`}
              >
                {otherNightOrder}
              </div>
            )}
          </>
        );
      })()}

      {/* ── Player name ───────────────────────────────────── */}
      <p
        className="text-center font-medium leading-tight mt-1.5"
        style={{
          fontSize: playerNameSize,
          color: isDead ? 'var(--color-text-dim)' : 'var(--color-text)',
          maxWidth: containerWidth + 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player.name}
      </p>

      {/* ── Reminder tokens — absolutely positioned along inward radial ray ── */}
      {visibleReminders.map((t, i) => {
        // Two-column diagonal layout: col 0 = left, col 1 = right; row advances along ray
        const col = i % 2;
        const row = Math.floor(i / 2);
        const dist = startDist + row * chipStep;
        const side = col === 0 ? -1 : 1;
        const chipCenterX = px / 2 + dist * cosA + side * colOffset * perpCos;
        const chipCenterY = px / 2 + dist * sinA + side * colOffset * perpSin;
        const chipLeft = chipCenterX - chipSize / 2;
        const chipTop  = chipCenterY - chipSize / 2;
        const isCustom = t.sourceRoleId === '';
        const iconSize = Math.round(chipSize * 0.45);
        const labelFontSize = Math.max(7, Math.round(chipSize * (isCustom ? 0.16 : 0.13)));
        const pad = Math.round(chipSize * 0.08);

        return (
          <button
            key={t.id}
            title={isCustom ? t.label : `${t.label} — tap to remove`}
            onClick={e => {
              e.stopPropagation();
              if (isCustom) setPopupTokenId(t.id);
              else onRemoveReminder(t.id);
            }}
            className="active:scale-90 transition-transform"
            style={{
              position: 'absolute',
              left: chipLeft,
              top: chipTop,
              width: chipSize,
              height: chipSize,
              borderRadius: Math.round(chipSize * 0.2),
              background: isCustom ? 'rgba(30,12,50,0.95)' : 'rgba(20,12,40,0.95)',
              border: `1.5px solid ${isCustom ? 'rgba(168,85,247,0.55)' : 'rgba(201,168,76,0.45)'}`,
              boxSizing: 'border-box',
              padding: `${pad}px ${Math.round(chipSize * 0.06)}px`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: isCustom ? 'center' : 'flex-start',
              gap: Math.round(chipSize * 0.04),
            }}
          >
            {!isCustom && (
              <div style={{ width: iconSize, height: iconSize, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rolesDb[t.sourceRoleId]?.image ?? getIconPath(t.sourceRoleId)}
                  alt={t.label}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={e => {
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(rolesDb[t.sourceRoleId]?.team); }
                  }}
                />
              </div>
            )}
            <span style={{
              fontSize: labelFontSize,
              fontWeight: 700,
              color: isCustom ? 'rgba(216,180,254,0.95)' : 'rgba(201,168,76,0.95)',
              textAlign: 'center',
              lineHeight: 1.2,
              width: '100%',
              display: '-webkit-box',
              WebkitLineClamp: isCustom ? 3 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {t.label}
            </span>
          </button>
        );
      })}
      {/* Custom reminder popup */}
      {popupTokenId && (() => {
        const pt = player.reminderTokens.find(t => t.id === popupTokenId);
        if (!pt) return null;
        return (
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 60, background: 'rgba(0,0,0,0.55)' }}
              onClick={e => { e.stopPropagation(); setPopupTokenId(null); }}
            />
            <div
              className="fixed rounded-2xl flex flex-col gap-4"
              style={{
                zIndex: 61,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 280,
                maxWidth: '85vw',
                padding: '20px',
                background: 'var(--color-surface)',
                border: '1px solid rgba(168,85,247,0.5)',
                boxShadow: '0 16px 60px rgba(0,0,0,0.8)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ fontSize: 15, color: 'var(--color-text)', lineHeight: 1.6 }}>
                {pt.label}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={e => { e.stopPropagation(); setPopupTokenId(null); }}
                  className="flex-1 rounded-xl py-2 text-sm active:opacity-60"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
                >
                  Close
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onRemoveReminder(pt.id); setPopupTokenId(null); }}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold active:scale-95"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444' }}
                >
                  Remove
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {extraCount > 0 && (() => {
        const i    = visibleReminders.length;
        const col  = i % 2;
        const row  = Math.floor(i / 2);
        const dist = startDist + row * chipStep;
        const side = col === 0 ? -1 : 1;
        return (
          <div
            className="rounded-full flex items-center justify-center font-bold"
            style={{
              position: 'absolute',
              left: px / 2 + dist * cosA + side * colOffset * perpCos - chipSize / 2,
              top:  px / 2 + dist * sinA + side * colOffset * perpSin - chipSize / 2,
              width: chipSize,
              height: chipSize,
              background: 'var(--color-gold)',
              color: '#000',
              fontSize: Math.max(9, chipSize * 0.35),
            }}
          >
            +{extraCount}
          </div>
        );
      })()}
    </div>
  );
}
