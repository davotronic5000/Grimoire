'use client';

import { useState, useRef } from 'react';

interface Props {
  onClose: () => void;
}

interface SoundDef {
  id: string;
  label: string;
  emoji: string;
  durationMs: number;
  play: (ctx: AudioContext) => void;
}

// ── Synthesis helpers ────────────────────────────────────────────────

function playGong(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);

  // Inharmonic partials characteristic of a large suspended gong
  const partials = [
    { freq: 110, amp: 1.0,  decay: 9.0 },
    { freq: 175, amp: 0.65, decay: 7.0 },
    { freq: 281, amp: 0.45, decay: 5.5 },
    { freq: 452, amp: 0.25, decay: 4.0 },
    { freq: 730, amp: 0.12, decay: 2.5 },
    { freq: 220, amp: 0.30, decay: 6.0 }, // octave shimmer
  ];
  partials.forEach(({ freq, amp, decay }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(amp * 0.18, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + decay + 0.1);
  });

  // Strike transient — short filtered noise burst
  const strikeDur = 0.06;
  const strikeBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * strikeDur), ctx.sampleRate);
  const strikeData = strikeBuf.getChannelData(0);
  for (let i = 0; i < strikeData.length; i++) strikeData[i] = Math.random() * 2 - 1;
  const strike = ctx.createBufferSource();
  strike.buffer = strikeBuf;
  const strikeGain = ctx.createGain();
  strikeGain.gain.setValueAtTime(0.5, now);
  strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + strikeDur);
  strike.connect(strikeGain);
  strikeGain.connect(master);
  strike.start(now);
}

function playThunder(ctx: AudioContext) {
  const now = ctx.currentTime;
  const duration = 4.5;

  const bufSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Two cascaded low-pass filters → deep rumble
  const lpf1 = ctx.createBiquadFilter();
  lpf1.type = 'lowpass';
  lpf1.frequency.setValueAtTime(400, now);
  lpf1.frequency.exponentialRampToValueAtTime(60, now + duration);

  const lpf2 = ctx.createBiquadFilter();
  lpf2.type = 'lowpass';
  lpf2.frequency.value = 200;

  // Amplitude: lightning crack → big boom → long roll → fade
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.exponentialRampToValueAtTime(1.2, now + 0.04);   // crack
  gainNode.gain.exponentialRampToValueAtTime(0.7, now + 0.25);   // boom peak
  gainNode.gain.exponentialRampToValueAtTime(0.35, now + 1.0);   // sustain roll
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(lpf1);
  lpf1.connect(lpf2);
  lpf2.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(now);
}

function playBanshee(_ctx: AudioContext) {
  const audio = new Audio('/sounds/banshee.mp3');
  audio.play();
}

function playWilhelm(_ctx: AudioContext) {
  const audio = new Audio('/sounds/wilhelm.mp3');
  audio.play();
}

// ── Component ────────────────────────────────────────────────────────

export default function SoundboardPanel({ onClose }: Props) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function triggerSound(sound: SoundDef) {
    const ctx = getCtx();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPlaying(sound.id);
    sound.play(ctx);
    timeoutRef.current = setTimeout(() => setPlaying(null), sound.durationMs);
  }

  const sounds: SoundDef[] = [
    { id: 'gong',     label: 'Gong',           emoji: '🔔', durationMs: 9000,  play: playGong },
    { id: 'thunder',  label: 'Thunder',         emoji: '⛈️', durationMs: 5000,  play: playThunder },
    { id: 'banshee',  label: 'Banshee Scream',  emoji: '👻', durationMs: 4000,  play: playBanshee },
    { id: 'wilhelm',  label: 'Wilhelm Scream',  emoji: '😱', durationMs: 2000,  play: playWilhelm },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed z-50 rounded-2xl flex flex-col"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 320,
          maxWidth: '92vw',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
          padding: '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold" style={{ fontSize: 17, color: 'var(--color-text)' }}>
            🔊 Soundboard
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60"
            style={{ color: 'var(--color-text-dim)', background: 'rgba(255,255,255,0.06)', fontSize: 18 }}
          >
            ×
          </button>
        </div>

        {/* Sound grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {sounds.map(sound => {
            const isPlaying = playing === sound.id;
            return (
              <button
                key={sound.id}
                onClick={() => triggerSound(sound)}
                className="flex flex-col items-center justify-center rounded-2xl active:scale-95 transition-transform"
                style={{
                  padding: '18px 12px',
                  gap: 8,
                  background: isPlaying
                    ? 'rgba(99,102,241,0.2)'
                    : 'rgba(30,20,50,0.6)',
                  border: `1.5px solid ${isPlaying ? '#6366f1' : 'var(--color-border)'}`,
                  boxShadow: isPlaying ? '0 0 16px rgba(99,102,241,0.4)' : undefined,
                  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <span style={{ fontSize: 36, lineHeight: 1 }}>{sound.emoji}</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isPlaying ? '#a5b4fc' : 'var(--color-text)',
                  textAlign: 'center',
                }}>
                  {sound.label}
                </span>
                {isPlaying && (
                  <span style={{ fontSize: 10, color: '#a5b4fc', letterSpacing: '0.05em' }}>
                    ▶ playing…
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
