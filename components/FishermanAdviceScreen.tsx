'use client';

import { useState } from 'react';
import type { Game, Player, RoleDefinition } from '@/lib/types';
import { useStore } from '@/lib/store';

interface Props {
  player: Player;
  game: Game;
  rolesDb: Record<string, RoleDefinition>;
  onClose: () => void;
}

type Phase = 'used' | 'setup' | 'reveal';

function effectiveAlignment(p: Player, role: RoleDefinition | null): 'good' | 'evil' {
  if (p.alignment) return p.alignment;
  if (role?.team === 'minion' || role?.team === 'demon') return 'evil';
  return 'good';
}

function powerTier(dayNumber: number): string {
  if (dayNumber <= 1) {
    return (
      'TIER 1 (guidance). Keep this to a broad strategic principle or rule of thumb, not tied ' +
      "to any specific player (e.g. \"trust the ones who ask hard questions, not the ones who " +
      'avoid them\"). It\'s very early — there isn\'t yet enough to be sharper than that.'
    );
  }
  if (dayNumber <= 3) {
    return (
      'TIER 2 (steer). You may narrow attention toward a small cluster of suspects or a general ' +
      'pattern (e.g. "the answer sits among the three who spoke least today") without naming a ' +
      'single player outright.'
    );
  }
  return (
    'TIER 3 (decisive). You may name a specific player directly and give a forceful, concrete ' +
    'recommendation about them — who to nominate, who to protect, whose claims to distrust — ' +
    "but never state their exact role or flatly declare them evil or the demon (see the " +
    'never-identify-the-demon rule below). This is the Fisherman\'s one shot for the whole ' +
    "game: point the team at the right action, don't hand them the solved puzzle."
  );
}

function buildPrompt(game: Game, player: Player, rolesDb: Record<string, RoleDefinition>): string {
  const roster = game.players
    .map(p => {
      const role = p.roleId ? (rolesDb[p.roleId] ?? game.homebrewRoles?.[p.roleId] ?? null) : null;
      const roleName = role?.name ?? 'unknown role';
      const alignment = p.roleId ? effectiveAlignment(p, role) : 'alignment unset';
      return `- ${p.name}: ${roleName} (${alignment}), ${p.isAlive ? 'alive' : 'dead'}`;
    })
    .join('\n');

  return `You are assisting a Storyteller running a game of Blood on the Clocktower, a social deduction game.

The Fisherman is a Townsfolk character whose ability reads: "Once per game, during the day, visit the Storyteller for some advice to help your team win." I need that single piece of advice, to give to the player named ${player.name}. This is a once-per-game moment for them — they've chosen to cash it in now.

Rules:
- This is advice, not information — a recommendation on what to do or who to focus on, never a flat reveal of a player's role or alignment as stated fact. The Fisherman gets pointed in the right direction; they don't get handed a reading.
- Never identify the demon: no naming a player as "the demon," no stating their exact demon role (e.g. "the Imp," "the Vortox"), and no other phrasing that amounts to confirming a specific player is the demon. You may point suspicion firmly their way, or recommend an action about them, without confirming why.
- The advice must still be genuinely sound and true to the ground-truth game state below — it should hold up if the town acts on it. Never misleading — unlike the Savant, there is no false half here.
- Calibrate how concrete and direct you can be to how late in the game the Fisherman chose to wait: ${powerTier(game.dayNumber)}
- One or two sentences. This is advice, not a speech.

STYLE — write like a Storyteller handing over real help, not a fortune cookie:
- Speak with a little weight and theater — this is a once-per-game moment, treat it like one — but don't bury the useful part under so much flavor that it stops being actionable.
- Match the concreteness to the tier above: vague and thematic early, sharp and direct late.
- For a sense of register (write your own, don't reuse this): "Watch how quickly Otis deflects when questioned tonight — that instinct is worth building your nomination around" (names a player, gives a concrete recommendation, never states a role) — never "Otis is the Poisoner."

Script: ${game.scriptName}
Day ${game.dayNumber}, night ${game.nightNumber} so far.

GROUND TRUTH ROSTER (my private knowledge as Storyteller — do not reveal this list verbatim, only draw the advice from it):
${roster}

Respond with exactly one line, nothing else:
ADVICE: <advice>`;
}

function parseReply(text: string): string | null {
  const match = text.match(/advice\s*:\s*([\s\S]+)/i);
  return match ? match[1].trim() : null;
}

export default function FishermanAdviceScreen({ player, game, rolesDb, onClose }: Props) {
  const { updatePlayer } = useStore();
  const [phase, setPhase] = useState<Phase>(player.fishermanAdvice ? 'used' : 'setup');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [reply, setReply] = useState('');
  const [advice, setAdvice] = useState('');

  const prompt = buildPrompt(game, player, rolesDb);

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
    }
  }

  function handleReplyChange(value: string) {
    setReply(value);
    const parsed = parseReply(value);
    if (parsed) setAdvice(parsed);
  }

  function handleSaveAndShow() {
    if (!advice.trim()) return;
    updatePlayer(game.id, player.id, {
      fishermanAdvice: { day: game.dayNumber, advice: advice.trim(), createdAt: Date.now() },
    });
    setPhase('reveal');
  }

  function handleClear() {
    setReply('');
    setAdvice('');
  }

  function handleStartOver() {
    updatePlayer(game.id, player.id, { fishermanAdvice: null });
    handleClear();
    setPhase('setup');
  }

  // ── Player-facing reveal ────────────────────────────────────────────
  if (phase === 'reveal') {
    const shown = advice || player.fishermanAdvice?.advice || '';
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ background: '#06040f', gap: '5vmin' }}
      >
        <p
          className="gothic-heading text-center"
          style={{
            fontSize: 'clamp(18px, 4vmin, 36px)',
            color: 'var(--color-gold)',
            textShadow: '0 0 30px rgba(201,168,76,0.5)',
            letterSpacing: '0.06em',
          }}
        >
          {player.name}, the Fisherman
        </p>
        <p
          className="text-center leading-relaxed"
          style={{ fontSize: 'clamp(16px, 3vmin, 26px)', color: 'var(--color-text)', maxWidth: 640 }}
        >
          {shown}
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

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 14,
    background: 'rgba(20,12,40,0.8)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    borderRadius: 12,
    width: '100%',
    resize: 'vertical' as const,
  };

  // ── Already used this game — show what was given ───────────────────
  if (phase === 'used' && player.fishermanAdvice) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{ height: 56, borderBottom: '1px solid var(--color-border)' }}
        >
          <button onClick={onClose} className="text-sm active:opacity-60" style={{ color: 'var(--color-text-dim)' }}>
            Cancel
          </button>
          <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
            Fisherman Advice — {player.name}
          </p>
          <div style={{ width: 48 }} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
            {player.name} already cashed in their once-per-game visit, on Day {player.fishermanAdvice.day}.
          </p>
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(20,12,40,0.6)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {player.fishermanAdvice.advice}
            </p>
          </div>
          <button
            onClick={() => setPhase('reveal')}
            className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
              border: '1px solid #6366f1',
              color: '#a5b4fc',
              fontSize: 16,
            }}
          >
            Show to Player Again
          </button>
          <button
            onClick={handleStartOver}
            className="w-full rounded-xl py-3 text-sm transition-all active:opacity-60"
            style={{
              background: 'transparent',
              border: '1px dashed rgba(239,68,68,0.4)',
              color: 'rgba(239,68,68,0.7)',
            }}
          >
            Clear &amp; start over (mistake / redo)
          </button>
        </div>
      </div>
    );
  }

  // ── Storyteller-facing setup ────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: '1px solid var(--color-border)' }}
      >
        <button onClick={onClose} className="text-sm active:opacity-60" style={{ color: 'var(--color-text-dim)' }}>
          Cancel
        </button>
        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
          Fisherman Advice — {player.name}
        </p>
        <div style={{ width: 48 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
          This is a once-per-game visit — copy the prompt, paste it into Claude (or any AI chat),
          then paste the reply back below to save it and show it to {player.name}.
        </p>

        <button
          onClick={handleCopyPrompt}
          className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
            border: '1px solid #6366f1',
            color: '#a5b4fc',
            fontSize: 16,
          }}
        >
          {copyState === 'copied' ? '✓ Copied!' : '📋 Copy Prompt for Claude'}
        </button>
        {copyState === 'failed' && (
          <p className="text-xs" style={{ color: '#f87171' }}>
            Couldn&apos;t access the clipboard — select the prompt text below and copy it manually.
          </p>
        )}

        <details>
          <summary className="text-xs cursor-pointer select-none" style={{ color: 'var(--color-text-dim)' }}>
            View prompt text
          </summary>
          <textarea
            readOnly
            value={prompt}
            rows={10}
            style={{ ...inputStyle, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
          />
        </details>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold px-1" style={{ color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>
            PASTE CLAUDE&apos;S REPLY
          </p>
          <textarea
            value={reply}
            onChange={e => handleReplyChange(e.target.value)}
            placeholder={'ADVICE: ...'}
            rows={3}
            style={inputStyle}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold px-1" style={{ color: 'var(--color-gold)', letterSpacing: '0.08em' }}>
            ADVICE
          </label>
          <textarea
            value={advice}
            onChange={e => setAdvice(e.target.value)}
            rows={3}
            style={{ ...inputStyle, borderColor: 'rgba(201,168,76,0.4)' }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
          >
            Clear
          </button>
          <button
            onClick={handleSaveAndShow}
            disabled={!advice.trim()}
            className="flex-[2] rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
            style={{
              background: advice.trim() ? 'linear-gradient(135deg, #2d1f5e, #3d2878)' : 'rgba(30,20,50,0.4)',
              border: `1px solid ${advice.trim() ? '#6366f1' : 'var(--color-border)'}`,
              color: advice.trim() ? '#a5b4fc' : 'var(--color-text-dim)',
            }}
          >
            Save &amp; Show to Player
          </button>
        </div>
      </div>
    </div>
  );
}
