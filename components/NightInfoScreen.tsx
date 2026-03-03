'use client';

import { useState } from 'react';
import type { RoleDefinition } from '@/lib/types';
import { getIconPath, getRoleTeamColor } from '@/lib/roles';

interface Props {
  scriptRoleIds: string[];
  rolesDb: Record<string, RoleDefinition>;
  onClose: () => void;
}

type CardType =
  | 'you_are'
  | 'this_player_is'
  | 'selected_you'
  | 'cerenovus'
  | 'your_minions'
  | 'your_demon'
  | 'did_you_vote'
  | 'did_you_nominate';

const CARD_LABELS: Record<CardType, string> = {
  you_are:          'You are',
  this_player_is:   'This player is',
  selected_you:     'This character selected you',
  cerenovus:        'You were targeted by:',
  your_minions:     'These are your minions',
  your_demon:       'This is your demon',
  did_you_vote:     'Did you vote?',
  did_you_nominate: 'Did you nominate?',
};

const ROLE_CARDS: CardType[] = ['you_are', 'this_player_is', 'selected_you', 'cerenovus'];
const SIMPLE_CARDS: CardType[] = ['your_minions', 'your_demon', 'did_you_vote', 'did_you_nominate'];

function needsRole(type: CardType): boolean {
  return ROLE_CARDS.includes(type);
}

// ── Shared role icon block ────────────────────────────────────────────

function RoleBlock({ role, size = 'lg' }: { role: RoleDefinition; size?: 'lg' | 'sm' }) {
  const teamColor = getRoleTeamColor(role.team);
  const iconSize = size === 'lg' ? 'clamp(120px, 38vmin, 260px)' : 'clamp(80px, 22vmin, 160px)';
  const nameFontSize = size === 'lg' ? 'clamp(22px, 4.5vmin, 48px)' : 'clamp(16px, 3vmin, 32px)';

  return (
    <div className="flex flex-col items-center" style={{ gap: '2vmin' }}>
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: iconSize,
          height: iconSize,
          background: `radial-gradient(circle at 40% 30%, ${teamColor}44, #0a0614 70%)`,
          boxShadow: `0 0 0 4px ${teamColor}, 0 0 ${size === 'lg' ? 50 : 30}px ${teamColor}66`,
          padding: '9%',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getIconPath(role.id)}
          alt={role.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
      <p
        className="font-bold text-center"
        style={{
          fontSize: nameFontSize,
          color: teamColor,
          textShadow: `0 0 24px ${teamColor}99`,
        }}
      >
        {role.name}
      </p>
    </div>
  );
}

// ── Player-facing reveal ──────────────────────────────────────────────

function NightInfoReveal({
  cardType,
  role,
  rolesDb,
  onDone,
}: {
  cardType: CardType;
  role: RoleDefinition | null;
  rolesDb: Record<string, RoleDefinition>;
  onDone: () => void;
}) {
  const label = CARD_LABELS[cardType];
  const isCerenovus = cardType === 'cerenovus';
  const cerenovusRole = isCerenovus ? rolesDb['cerenovus'] : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: '#06040f', gap: isCerenovus ? '3vmin' : 0 }}
    >
      {/* Top label */}
      <p
        className="gothic-heading text-center"
        style={{
          fontSize: role ? 'clamp(16px, 3.5vmin, 32px)' : 'clamp(22px, 6vmin, 56px)',
          color: 'var(--color-gold)',
          textShadow: '0 0 30px rgba(201,168,76,0.5)',
          letterSpacing: '0.06em',
          marginBottom: (role && !isCerenovus) ? '5vmin' : 0,
          padding: '0 10%',
          lineHeight: 1.3,
        }}
      >
        {label}
      </p>

      {/* Cerenovus two-role layout */}
      {isCerenovus && cerenovusRole && role && (
        <>
          <RoleBlock role={cerenovusRole} size="sm" />
          <p
            className="gothic-heading text-center"
            style={{
              fontSize: 'clamp(14px, 3vmin, 28px)',
              color: 'var(--color-gold)',
              textShadow: '0 0 20px rgba(201,168,76,0.4)',
              letterSpacing: '0.06em',
              padding: '0 10%',
            }}
          >
            to be mad as
          </p>
          <RoleBlock role={role} size="sm" />
        </>
      )}

      {/* Standard single-role layout */}
      {!isCerenovus && role && (
        <div className="flex flex-col items-center" style={{ gap: '4vmin' }}>
          <RoleBlock role={role} size="lg" />
          {cardType === 'you_are' && (
            <p
              className="text-center leading-relaxed"
              style={{
                fontSize: 'clamp(13px, 2vmin, 20px)',
                color: 'var(--color-text)',
                opacity: 0.85,
                maxWidth: '72%',
              }}
            >
              {role.ability}
            </p>
          )}
        </div>
      )}

      {/* Done */}
      <div className="absolute bottom-6 flex justify-center w-full px-4">
        <button
          onClick={onDone}
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

// ── Reusable card type button ─────────────────────────────────────────

function CardTypeButton({
  type,
  active,
  label,
  onClick,
}: {
  type: CardType;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl px-4 py-3 font-semibold transition-all active:scale-[0.98]"
      style={{
        background: active ? 'rgba(201,168,76,0.15)' : 'rgba(20,12,40,0.6)',
        border: `1.5px solid ${active ? 'var(--color-gold)' : 'var(--color-border)'}`,
        color: active ? 'var(--color-gold)' : 'var(--color-text-dim)',
        fontSize: 14,
      }}
    >
      {label}
    </button>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

export default function NightInfoScreen({ scriptRoleIds, rolesDb, onClose }: Props) {
  const [cardType, setCardType] = useState<CardType>('you_are');
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
  const [search, setSearch] = useState('');
  const [revealing, setRevealing] = useState(false);

  const hasCerenovus = scriptRoleIds.includes('cerenovus');
  const isSimple = !needsRole(cardType);
  const canShow = isSimple || !!selectedRole;

  const scriptRoles = scriptRoleIds
    .map(id => rolesDb[id])
    .filter((r): r is RoleDefinition => !!r && !!r.team);

  // For cerenovus "mad as" picker, exclude cerenovus itself
  const rolePickerRoles = cardType === 'cerenovus'
    ? scriptRoles.filter(r => r.id !== 'cerenovus')
    : scriptRoles;

  const filteredRoles = search
    ? rolePickerRoles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : rolePickerRoles;

  function selectCardType(type: CardType) {
    setCardType(type);
    if (!needsRole(type)) setSelectedRole(null);
  }

  if (revealing) {
    return (
      <NightInfoReveal
        cardType={cardType}
        role={isSimple ? null : selectedRole}
        rolesDb={rolesDb}
        onDone={onClose}
      />
    );
  }

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
          Night Info Card
        </p>
        <button
          onClick={() => setRevealing(true)}
          disabled={!canShow}
          className="text-sm font-semibold rounded-lg px-3 py-1.5 transition-all active:scale-95"
          style={{
            background: canShow ? 'rgba(99,102,241,0.2)' : 'transparent',
            border: `1px solid ${canShow ? '#6366f1' : 'transparent'}`,
            color: canShow ? '#a5b4fc' : 'transparent',
          }}
        >
          Show
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Card type selector */}
        <div className="px-4 pt-3 pb-1 flex flex-col gap-2">

          <p className="text-xs font-semibold px-1 pt-1" style={{ color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>
            WITH ROLE
          </p>
          {ROLE_CARDS.filter(t => t !== 'cerenovus').map(type => (
            <CardTypeButton
              key={type}
              type={type}
              active={cardType === type}
              label={CARD_LABELS[type]}
              onClick={() => selectCardType(type)}
            />
          ))}
          {hasCerenovus && (
            <CardTypeButton
              type="cerenovus"
              active={cardType === 'cerenovus'}
              label={CARD_LABELS.cerenovus}
              onClick={() => selectCardType('cerenovus')}
            />
          )}

          <p className="text-xs font-semibold px-1 pt-2" style={{ color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>
            TEXT ONLY
          </p>
          {SIMPLE_CARDS.map(type => (
            <CardTypeButton
              key={type}
              type={type}
              active={cardType === type}
              label={CARD_LABELS[type]}
              onClick={() => selectCardType(type)}
            />
          ))}
        </div>

        {/* Role picker — only for role cards */}
        {!isSimple && (
          <>
            <div className="px-4 pt-3 pb-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={cardType === 'cerenovus' ? 'Select role to be mad as…' : 'Search roles…'}
                className="w-full rounded-xl outline-none"
                style={{
                  padding: '10px 14px',
                  fontSize: 15,
                  background: 'rgba(20,12,40,0.8)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <div className="px-4 pb-4 space-y-2">
              {filteredRoles.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-dim)' }}>
                  No roles match your search
                </p>
              )}
              {filteredRoles.map(role => {
                const isSelected = selectedRole?.id === role.id;
                const teamColor = getRoleTeamColor(role.team);
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(isSelected ? null : role)}
                    className="w-full text-left flex items-center gap-3 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                      padding: '12px 14px',
                      background: isSelected ? `${teamColor}22` : 'rgba(20,12,40,0.6)',
                      border: `1px solid ${isSelected ? teamColor : 'var(--color-border)'}`,
                    }}
                  >
                    <div
                      className="flex-shrink-0 rounded-md flex items-center justify-center"
                      style={{
                        width: 22, height: 22,
                        background: isSelected ? teamColor : 'transparent',
                        border: `2px solid ${isSelected ? teamColor : 'var(--color-border)'}`,
                        fontSize: 13, color: '#000', fontWeight: 700,
                      }}
                    >
                      {isSelected && '✓'}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getIconPath(role.id)}
                      alt={role.name}
                      className="rounded-full object-contain flex-shrink-0"
                      style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.4)', padding: 3 }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: isSelected ? teamColor : 'var(--color-text)' }}>
                        {role.name}
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
                        {role.ability}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom show button */}
      {canShow && (
        <div
          className="flex-shrink-0 px-4 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setRevealing(true)}
            className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
              border: '1px solid #6366f1',
              color: '#a5b4fc',
              fontSize: 17,
            }}
          >
            Show to Player
          </button>
        </div>
      )}
    </div>
  );
}
