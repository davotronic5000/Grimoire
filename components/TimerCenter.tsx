'use client';

import { useState, useEffect, useRef } from 'react';

// ── Audio synthesis helpers ──────────────────────────────────────────────────

function getCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ref.current || ref.current.state === 'closed') {
      ref.current = new AudioContext();
    }
    if (ref.current.state === 'suspended') ref.current.resume().catch(() => {});
    return ref.current;
  } catch { return null; }
}

function scheduleOsc(
  ctx: AudioContext,
  freq: number,
  vol: number,
  dur: number,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function playChime(ctx: AudioContext) {
  // Bright bell: C6 + octaves
  [[1047, 0.28, 1.6], [2093, 0.14, 1.2], [4186, 0.07, 0.8]].forEach(([f, v, d]) =>
    scheduleOsc(ctx, f, v, d),
  );
}

function playGong(ctx: AudioContext) {
  // Same synthesis as the Soundboard gong
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);

  const partials = [
    { freq: 110,  amp: 1.00, decay: 9.0 },
    { freq: 175,  amp: 0.65, decay: 7.0 },
    { freq: 281,  amp: 0.45, decay: 5.5 },
    { freq: 452,  amp: 0.25, decay: 4.0 },
    { freq: 730,  amp: 0.12, decay: 2.5 },
    { freq: 220,  amp: 0.30, decay: 6.0 },
  ];
  partials.forEach(({ freq, amp, decay }) => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
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
  const strikeDur  = 0.06;
  const strikeBuf  = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * strikeDur), ctx.sampleRate);
  const strikeData = strikeBuf.getChannelData(0);
  for (let i = 0; i < strikeData.length; i++) strikeData[i] = Math.random() * 2 - 1;
  const strike     = ctx.createBufferSource();
  strike.buffer    = strikeBuf;
  const strikeGain = ctx.createGain();
  strikeGain.gain.setValueAtTime(0.5, now);
  strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + strikeDur);
  strike.connect(strikeGain);
  strikeGain.connect(master);
  strike.start(now);
}

function playTick(ctx: AudioContext, isTick: boolean) {
  // Old clock escapement: band-passed noise burst + short woody body resonance
  const now = ctx.currentTime;
  const dur = 0.048;

  // Noise (escapement click)
  const bufLen = Math.ceil(ctx.sampleRate * dur);
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const d      = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const bpf    = ctx.createBiquadFilter();
  bpf.type     = 'bandpass';
  bpf.frequency.value = isTick ? 2800 : 1600;
  bpf.Q.value  = 1.4;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(isTick ? 0.65 : 0.45, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(bpf);
  bpf.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);

  // Wooden case body resonance (short low sine)
  const body     = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type      = 'sine';
  body.frequency.value = isTick ? 720 : 520;
  bodyGain.gain.setValueAtTime(0.07, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
  body.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  body.start(now);
  body.stop(now + 0.04);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  boardWidth: number;
  boardHeight: number;
  boardMinDim: number;
}

export default function TimerCenter({ boardWidth, boardHeight, boardMinDim }: Props) {
  const [visible, setVisible]       = useState(false);
  const [seconds, setSeconds]       = useState(5 * 60);
  const [running, setRunning]       = useState(false);
  const [muted, setMuted]           = useState(false);
  const [resetTarget, setResetTarget] = useState(5 * 60);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mutedRef    = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Clean up audio context on unmount
  useEffect(() => () => { audioCtxRef.current?.close().catch(() => {}); }, []);

  // Timer tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setRunning(false);
          if (!mutedRef.current) {
            const ctx = getCtx(audioCtxRef);
            if (ctx) playGong(ctx);
          }
          return 0;
        }
        if (!mutedRef.current) {
          const ctx = getCtx(audioCtxRef);
          if (ctx) {
            if (next % 60 === 0) playChime(ctx);
            if (next <= 30) playTick(ctx, next % 2 === 0);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function adjustMinutes(delta: number) {
    const newTarget = Math.max(60, resetTarget + delta * 60);
    setResetTarget(newTarget);
    setSeconds(prev => Math.max(0, prev + delta * 60));
  }

  function reset() {
    setRunning(false);
    setSeconds(resetTarget);
  }

  const expired   = seconds === 0;
  const low       = !expired && seconds <= 60;
  const timeColor = expired ? '#ef4444' : low ? '#f97316' : 'var(--botc-gold)';

  if (!boardWidth || !boardHeight) return null;

  const cx = boardWidth / 2;
  const cy = boardHeight / 2;

  // Toggle button sits just below the centre-info cluster
  const toggleTop = cy + Math.max(44, boardMinDim * 0.11);

  // Responsive sizing
  const timeFontSize = Math.max(34, Math.min(58, boardMinDim * 0.1));
  const btnH         = Math.max(32, Math.min(42, boardMinDim * 0.072));

  return (
    <>
      {/* ── Toggle button (always visible below centre info) ── */}
      <div
        className="absolute"
        style={{
          left: cx,
          top: toggleTop,
          transform: 'translate(-50%, 0)',
          zIndex: 8,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={() => setVisible(v => !v)}
          className="flex items-center gap-3 rounded-full active:scale-90 transition-transform"
          style={{
            padding: '16px 44px',
            height: 96,
            background: running || visible
              ? 'rgba(201,168,76,0.16)'
              : 'rgba(14,9,28,0.7)',
            border: `1px solid ${running ? '#fbbf2466' : visible ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.1)'}`,
            color: running ? '#fbbf24' : 'var(--botc-muted)',
            fontSize: 22,
            fontWeight: 600,
          }}
          aria-label="Toggle timer"
        >
          <span style={{ fontSize: 28 }}>⏱</span>
          {/* Show live countdown on toggle when panel is collapsed */}
          {running && !visible && (
            <span
              style={{
                fontVariantNumeric: 'tabular-nums',
                color: low ? '#f97316' : 'inherit',
              }}
            >
              {fmt(seconds)}
            </span>
          )}
          {!running && !visible && <span>Timer</span>}
        </button>
      </div>

      {/* ── Full timer panel (overlays centre info) ── */}
      {visible && (
        <div
          className="absolute"
          style={{
            left: cx,
            top: cy,
            transform: 'translate(-50%, -50%)',
            zIndex: 16,
            pointerEvents: 'auto',
          }}
        >
          <div
            className="flex flex-col items-center"
            style={{
              padding: '12px 16px 14px',
              borderRadius: 20,
              background: 'rgba(5,3,12,0.95)',
              border: `1px solid ${expired ? '#ef444455' : low ? '#f9731655' : 'rgba(201,168,76,0.3)'}`,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
              gap: 10,
              minWidth: 180,
            }}
          >
            {/* Header row: label + close */}
            <div className="flex items-center justify-between w-full">
              <span style={{ fontSize: 10, color: 'var(--botc-muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Timer
              </span>
              <button
                onClick={() => setVisible(false)}
                style={{ fontSize: 16, color: 'var(--botc-muted)', lineHeight: 1, padding: '0 2px' }}
                className="active:opacity-50"
                aria-label="Close timer"
              >
                ×
              </button>
            </div>

            {/* Time display */}
            <div
              className={expired ? 'animate-pulse' : ''}
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontSize: timeFontSize,
                fontWeight: 700,
                color: timeColor,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textShadow: (low || expired) ? `0 0 24px ${timeColor}55` : 'none',
              }}
            >
              {fmt(seconds)}
            </div>

            {/* − 1m | ▶/⏸ | + 1m */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => adjustMinutes(-1)}
                className="active:scale-90 transition-transform"
                style={{
                  height: btnH, padding: '0 10px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--botc-muted)', fontSize: 12, fontWeight: 700,
                }}
              >
                −1m
              </button>

              <button
                onClick={() => { if (!expired) setRunning(r => !r); }}
                className="active:scale-90 transition-transform"
                style={{
                  width: btnH + 12, height: btnH + 12,
                  borderRadius: '50%',
                  background: running
                    ? 'rgba(251,191,36,0.18)'
                    : expired ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.2)',
                  border: `2px solid ${running ? '#fbbf2488' : expired ? '#ef444488' : 'rgba(99,102,241,0.55)'}`,
                  color: running ? '#fbbf24' : expired ? '#ef4444' : '#a5b4fc',
                  fontSize: 20,
                  cursor: expired ? 'default' : 'pointer',
                }}
                aria-label={running ? 'Pause timer' : 'Start timer'}
              >
                {running ? '⏸' : '▶'}
              </button>

              <button
                onClick={() => adjustMinutes(1)}
                className="active:scale-90 transition-transform"
                style={{
                  height: btnH, padding: '0 10px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--botc-muted)', fontSize: 12, fontWeight: 700,
                }}
              >
                +1m
              </button>
            </div>

            {/* Reset | Mute */}
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <button
                onClick={reset}
                className="active:scale-90 transition-transform flex-1"
                style={{
                  height: btnH - 4, borderRadius: 9, fontSize: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--botc-muted)',
                }}
              >
                ↺ Reset
              </button>
              <button
                onClick={() => setMuted(m => !m)}
                className="active:scale-90 transition-transform flex-1"
                style={{
                  height: btnH - 4, borderRadius: 9, fontSize: 13,
                  background: muted ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${muted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: muted ? '#ef4444' : 'var(--botc-muted)',
                }}
                aria-label={muted ? 'Unmute timer' : 'Mute timer'}
              >
                {muted ? '🔇' : '🔔'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
