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

type Phase = 'setup' | 'reveal';

function effectiveAlignment(p: Player, role: RoleDefinition | null): 'good' | 'evil' {
  if (p.alignment) return p.alignment;
  if (role?.team === 'minion' || role?.team === 'demon') return 'evil';
  return 'good';
}

function specificityTier(dayNumber: number): string {
  if (dayNumber <= 1) {
    return (
      'TIER 1 (vague). Do not name any specific player or role. Speak only in broad, ' +
      "atmospheric or thematic terms about the town or the game as a whole (e.g. general " +
      "unease, a rough sense of how many evil players are seated close together, a vague " +
      "impression about the night's events)."
    );
  }
  if (dayNumber <= 3) {
    return (
      'TIER 2 (moderate). Still do not name a specific player. You may reference categories ' +
      'and counts — e.g. how many evil players are alive, whether a certain team or ability ' +
      "type is in play, a role's general behavior — without saying who holds it."
    );
  }
  return (
    'TIER 3 (specific). You may name specific players directly by name, including their ' +
    'exact role and/or alignment, or concrete facts about what happened to them — except ' +
    'the demon (see the never-identify-the-demon rule below, which overrides this tier).'
  );
}

function buildPrompt(game: Game, player: Player, rolesDb: Record<string, RoleDefinition>, history: Player['savantInfo']): string {
  const roster = game.players
    .map(p => {
      const role = p.roleId ? (rolesDb[p.roleId] ?? game.homebrewRoles?.[p.roleId] ?? null) : null;
      const roleName = role?.name ?? 'unknown role';
      const alignment = p.roleId ? effectiveAlignment(p, role) : 'alignment unset';
      return `- ${p.name}: ${roleName} (${alignment}), ${p.isAlive ? 'alive' : 'dead'}`;
    })
    .join('\n');

  const past = (history ?? []).length
    ? (history ?? [])
        .map(h => `Day ${h.day} — TRUE: "${h.trueStatement}" / FALSE: "${h.falseStatement}"`)
        .join('\n')
    : '(none yet)';

  return `You are assisting a Storyteller running a game of Blood on the Clocktower, a social deduction game.

The Savant is a Townsfolk character whose ability reads: "Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false." I need that pair of statements, to read aloud to the player named ${player.name}.

Rules for the pair:
- Exactly one statement is true and one is false, judged against the ground-truth game state below.
- Both statements must concern the game state (players, roles, alignments, or events) — never small talk or meta commentary.
- Match the two statements in length, tone, and phrasing so the Savant cannot guess which is true purely from how it's worded.
- Never repeat or trivially reword a statement already given (see PAST STATEMENTS). Don't contradict a fact already confirmed true, and don't mark as true something already given as the false half of an earlier pair.
- The false statement should be plausible given the setup, not absurd or impossible on its face.
- Never let either statement — true or false — outright identify the demon: no naming a player as "the demon," no stating their exact demon role (e.g. "the Imp," "the Vortox"), and no other wording that amounts to confirming a specific player is the demon. You may reference "the demon" as a concept, cast suspicion their way, or describe effects of their presence — just never pin the identity to a name. This holds at every tier, including Tier 3.
- Calibrate WHAT you're allowed to reveal to how far into the game we are: ${specificityTier(game.dayNumber)}

STYLE — write like a mischievous Storyteller, not a database:
- Dress every fact in atmosphere: dreams, omens, whispers, rumors, the feel of the town at night, a gesture someone made, a look exchanged. Avoid flat "Player X is the Investigator" or "Player X is evil" phrasing — that fact should still be true, just never stated that plainly.
- Go heavy on playful misdirection for the false statement — don't just invent a lie, engineer a proper red herring: swap a real fact onto the wrong player, cast suspicion on someone innocent, offer false reassurance about someone dangerous, or shadow the true statement's exact shape and imagery so the two blur together on first listen. Aim for the pair a table is still arguing about after the game.
- A wink of dark humor or cheeky wordplay is welcome, as long as it stays unambiguous once you know the ground truth — a good red herring rewards re-reading, it doesn't require it.
- Vary sentence structure and grammatical subject between the two statements, and across different days, so the pairs don't all read like the same template.
- Flavor and misdirection are never an excuse for ambiguity — a Storyteller reading the statement back must be able to judge it unambiguously true or false against the ground truth.
- For a sense of the target register (write your own, don't reuse these): "A restless soul walked among you last night, though it meant no harm" (a good role's night action) or "Two seats over, someone lies awake turning over a lie they told today" (points at a specific evil player without naming their role outright) — never "Player 4 is the Empath."

Script: ${game.scriptName}
Day ${game.dayNumber}, night ${game.nightNumber} so far.

GROUND TRUTH ROSTER (my private knowledge as Storyteller — do not reveal this list verbatim, only draw statements from it):
${roster}

PAST STATEMENTS ALREADY GIVEN TO THIS SAVANT:
${past}

Respond with exactly two lines, nothing else:
TRUE: <statement>
FALSE: <statement>`;
}

function parseReply(text: string): { trueStatement: string; falseStatement: string } | null {
  const trueMatch = text.match(/true\s*:\s*(.+)/i);
  const falseMatch = text.match(/false\s*:\s*(.+)/i);
  if (!trueMatch || !falseMatch) return null;
  return {
    trueStatement: trueMatch[1].trim(),
    falseStatement: falseMatch[1].trim(),
  };
}

export default function SavantInfoScreen({ player, game, rolesDb, onClose }: Props) {
  const { addSavantInfo, removeSavantInfo } = useStore();
  const [phase, setPhase] = useState<Phase>('setup');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [reply, setReply] = useState('');
  const [trueStatement, setTrueStatement] = useState('');
  const [falseStatement, setFalseStatement] = useState('');

  const history = [...(player.savantInfo ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  const prompt = buildPrompt(game, player, rolesDb, player.savantInfo);

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
    if (parsed) {
      setTrueStatement(parsed.trueStatement);
      setFalseStatement(parsed.falseStatement);
    }
  }

  function handleSaveAndShow() {
    if (!trueStatement.trim() || !falseStatement.trim()) return;
    addSavantInfo(game.id, player.id, {
      day: game.dayNumber,
      trueStatement: trueStatement.trim(),
      falseStatement: falseStatement.trim(),
      createdAt: Date.now(),
    });
    setPhase('reveal');
  }

  function handleClear() {
    setReply('');
    setTrueStatement('');
    setFalseStatement('');
  }

  // ── Player-facing reveal (both statements, no true/false marking) ─────
  if (phase === 'reveal') {
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
          {player.name}, the Savant
        </p>
        <div className="flex flex-col gap-6 w-full" style={{ maxWidth: 640 }}>
          {[trueStatement, falseStatement].map((text, i) => (
            <p
              key={i}
              className="text-center leading-relaxed"
              style={{ fontSize: 'clamp(16px, 3vmin, 26px)', color: 'var(--color-text)' }}
            >
              {text}
            </p>
          ))}
        </div>
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

  // ── Storyteller-facing setup ───────────────────────────────────────────
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
          Savant Info — {player.name}
        </p>
        <div style={{ width: 48 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
          Copy a ready-made prompt with the full game state, paste it into Claude (or any AI
          chat), then paste the reply back below to save it and show it to {player.name}.
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
            placeholder={'TRUE: ...\nFALSE: ...'}
            rows={3}
            style={inputStyle}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold px-1" style={{ color: '#22c55e', letterSpacing: '0.08em' }}>
            ✓ TRUE STATEMENT
          </label>
          <textarea
            value={trueStatement}
            onChange={e => setTrueStatement(e.target.value)}
            rows={2}
            style={{ ...inputStyle, borderColor: 'rgba(34,197,94,0.4)' }}
          />
          <label className="text-xs font-semibold px-1" style={{ color: '#f87171', letterSpacing: '0.08em' }}>
            ✕ FALSE STATEMENT
          </label>
          <textarea
            value={falseStatement}
            onChange={e => setFalseStatement(e.target.value)}
            rows={2}
            style={{ ...inputStyle, borderColor: 'rgba(239,68,68,0.4)' }}
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
            disabled={!trueStatement.trim() || !falseStatement.trim()}
            className="flex-[2] rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
            style={{
              background: trueStatement.trim() && falseStatement.trim() ? 'linear-gradient(135deg, #2d1f5e, #3d2878)' : 'rgba(30,20,50,0.4)',
              border: `1px solid ${trueStatement.trim() && falseStatement.trim() ? '#6366f1' : 'var(--color-border)'}`,
              color: trueStatement.trim() && falseStatement.trim() ? '#a5b4fc' : 'var(--color-text-dim)',
            }}
          >
            Save &amp; Show to Player
          </button>
        </div>

        {history.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs font-semibold px-1" style={{ color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>
              PAST INFO GIVEN
            </p>
            {history.map(entry => (
              <div
                key={entry.id}
                className="rounded-xl px-4 py-3 flex flex-col gap-1"
                style={{ background: 'rgba(20,12,40,0.6)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>Day {entry.day}</p>
                  <button
                    onClick={() => removeSavantInfo(game.id, player.id, entry.id)}
                    className="text-xs active:opacity-60"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs" style={{ color: '#22c55e' }}>✓ {entry.trueStatement}</p>
                <p className="text-xs" style={{ color: '#f87171' }}>✕ {entry.falseStatement}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
