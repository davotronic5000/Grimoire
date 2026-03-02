'use client';

import type { Player, RoleDefinition } from '@/lib/types';
import { getIconPath, getRoleTeamColor } from '@/lib/roles';

interface Props {
  player: Player;
  role: RoleDefinition | null;
  /** Token diameter in pixels — calculated dynamically by GrimoireBoard */
  sizePx: number;
  /** Angle (radians) pointing from this token toward the board center */
  inwardAngle: number;
  onClick: () => void;
  onRemoveReminder: (tokenId: string) => void;
}

export default function PlayerToken({ player, role, sizePx: px, inwardAngle, onClick, onRemoveReminder }: Props) {
  const isDead = !player.isAlive;
  const teamColor = getRoleTeamColor(role?.team);

  // Reminder chips sit in a row below the name
  const chipSize = Math.max(42, Math.round(px * 0.54));
  const maxVisible = 5;
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
  const chipGap = 6;
  const chipStep = chipSize + chipGap;
  // Start distance: chip edge must clear the token circle rim AND the player name label.
  // nameH approximates the label height (font size + top margin).
  // When the inward direction has a downward component (sinA > 0), add extra offset so
  // chips don't overlap the name label that sits below the token in the flex column.
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
        }}
        aria-label={`${player.name}${role ? ` — ${role.name}` : ' — unassigned'}`}
      >
        {/* Role icon — extra bottom padding leaves room for the curved name */}
        {role ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getIconPath(role.id)}
            alt={role.name}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              padding: `${Math.max(4, px * 0.07)}px ${Math.max(4, px * 0.07)}px ${Math.max(10, px * 0.17)}px`,
              opacity: isDead ? 0.4 : 1,
            }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
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

        {/* Ghost vote badge */}
        {isDead && player.hasGhostVote && (
          <div
            className="absolute top-1 right-1 rounded-full flex items-center justify-center font-bold"
            style={{
              width: Math.max(16, px * 0.22),
              height: Math.max(16, px * 0.22),
              fontSize: Math.max(9, px * 0.13),
              background: 'rgba(168,85,247,0.75)',
              color: '#fff',
            }}
          >
            V
          </div>
        )}
      </button>

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
        const dist = startDist + i * chipStep;
        const chipLeft = px / 2 + dist * cosA - chipSize / 2;
        const chipTop  = px / 2 + dist * sinA - chipSize / 2;

        // Arc geometry for curved label inside chip
        const cxC  = chipSize / 2;
        const cyC  = chipSize / 2;
        const arcRC = chipSize / 2 * 0.83;
        const arcDC = [
          `M ${(cxC + arcRC * Math.cos(a1)).toFixed(1)} ${(cyC + arcRC * Math.sin(a1)).toFixed(1)}`,
          `A ${arcRC.toFixed(1)} ${arcRC.toFixed(1)} 0 0 0`,
          `${(cxC + arcRC * Math.cos(a2)).toFixed(1)} ${(cyC + arcRC * Math.sin(a2)).toFixed(1)}`,
        ].join(' ');
        const chipArcId   = `arc-chip-${t.id}`;
        const chipTextSize = Math.max(7, Math.round(chipSize * 0.22));

        return (
          <button
            key={t.id}
            title={`${t.label} — tap to remove`}
            onClick={e => { e.stopPropagation(); onRemoveReminder(t.id); }}
            className="active:scale-90 transition-transform"
            style={{
              position: 'absolute',
              left: chipLeft,
              top: chipTop,
              width: chipSize,
              height: chipSize,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(20,12,40,0.95)',
              border: '1.5px solid rgba(201,168,76,0.45)',
              boxSizing: 'border-box',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getIconPath(t.sourceRoleId)}
              alt={t.label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: `${Math.max(2, chipSize * 0.07)}px ${Math.max(2, chipSize * 0.07)}px ${Math.max(5, chipSize * 0.20)}px`,
              }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <svg
              className="absolute inset-0 pointer-events-none"
              width={chipSize}
              height={chipSize}
              viewBox={`0 0 ${chipSize} ${chipSize}`}
            >
              <defs>
                <path id={chipArcId} d={arcDC} />
              </defs>
              <text
                fontSize={chipTextSize}
                fontWeight="700"
                fill="rgba(201,168,76,0.95)"
                textAnchor="middle"
                stroke="rgba(0,0,0,0.75)"
                strokeWidth={Math.max(0.4, chipTextSize * 0.2)}
                paintOrder="stroke fill"
                style={{ fontFamily: 'inherit', letterSpacing: '0.02em' }}
              >
                <textPath href={`#${chipArcId}`} startOffset="50%">
                  {t.label}
                </textPath>
              </text>
            </svg>
          </button>
        );
      })}
      {extraCount > 0 && (() => {
        const i    = visibleReminders.length;
        const dist = startDist + i * chipStep;
        return (
          <div
            className="rounded-full flex items-center justify-center font-bold"
            style={{
              position: 'absolute',
              left: px / 2 + dist * cosA - chipSize / 2,
              top:  px / 2 + dist * sinA - chipSize / 2,
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
