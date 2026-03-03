'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  onClose: () => void;
}

type Tool = 'pen' | 'eraser';

const COLORS = ['#ffffff', '#f87171', '#60a5fa', '#4ade80', '#fbbf24', '#c084fc'];
const SIZES = [3, 8, 18];

export default function WhiteboardScreen({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState(8);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [showing, setShowing] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Size the canvas buffer to match its rendered CSS size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const raf = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#06040f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = canvasRef.current!.getContext('2d')!;
    const r = (tool === 'eraser' ? size * 3 : size) / 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#06040f' : color;
    ctx.fill();
    setHasStrokes(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !lastPos.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#06040f' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 3 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }

  function onPointerUp() {
    isDrawing.current = false;
    lastPos.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#06040f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function showToPlayer() {
    setSnapshot(canvasRef.current!.toDataURL());
    setShowing(true);
  }

  // ── Player-facing reveal ─────────────────────────────────────────────
  if (showing && snapshot) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ background: '#06040f' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={snapshot}
          alt="Whiteboard"
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(100% - 80px)',
            objectFit: 'contain',
          }}
        />
        <div className="absolute bottom-6 flex justify-center w-full px-4">
          <button
            onClick={() => setShowing(false)}
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

  // ── Storyteller draw ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#06040f' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: '1px solid var(--color-border)', background: 'rgba(6,4,15,0.95)' }}
      >
        <button
          onClick={onClose}
          className="text-sm active:opacity-60"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Cancel
        </button>
        <p className="font-semibold" style={{ color: 'var(--color-text)', fontSize: 16 }}>
          Whiteboard
        </p>
        <button
          onClick={showToPlayer}
          disabled={!hasStrokes}
          className="text-sm font-semibold rounded-lg px-3 py-1.5 transition-all active:scale-95"
          style={{
            background: hasStrokes ? 'rgba(99,102,241,0.2)' : 'transparent',
            border: `1px solid ${hasStrokes ? '#6366f1' : 'transparent'}`,
            color: hasStrokes ? '#a5b4fc' : 'transparent',
          }}
        >
          Show
        </button>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 flex-shrink-0 overflow-x-auto"
        style={{ height: 56, borderBottom: '1px solid var(--color-border)', background: 'rgba(10,6,25,0.95)' }}
      >
        {/* Pen / Eraser */}
        {(['pen', 'eraser'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTool(t)}
            className="rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
            style={{
              width: 36, height: 36, fontSize: 18,
              background: tool === t ? 'rgba(99,102,241,0.2)' : 'rgba(30,20,50,0.4)',
              border: `1px solid ${tool === t ? '#6366f1' : 'var(--color-border)'}`,
            }}
          >
            {t === 'pen' ? '✏️' : '🧹'}
          </button>
        ))}

        <div className="flex-shrink-0" style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

        {/* Colours */}
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool('pen'); }}
            className="rounded-full flex-shrink-0 transition-all active:scale-95"
            style={{
              width: 24, height: 24,
              background: c,
              border: `2.5px solid ${color === c && tool === 'pen' ? '#a5b4fc' : 'rgba(255,255,255,0.15)'}`,
              boxShadow: color === c && tool === 'pen' ? '0 0 8px rgba(165,180,252,0.6)' : undefined,
            }}
          />
        ))}

        <div className="flex-shrink-0" style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

        {/* Sizes */}
        {SIZES.map(s => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className="rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
            style={{
              width: 36, height: 36,
              background: size === s ? 'rgba(99,102,241,0.2)' : 'rgba(30,20,50,0.4)',
              border: `1px solid ${size === s ? '#6366f1' : 'var(--color-border)'}`,
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: s + 2,
                height: s + 2,
                background: tool === 'eraser' ? 'rgba(255,255,255,0.3)' : color,
              }}
            />
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Clear */}
        <button
          onClick={clearCanvas}
          className="rounded-lg px-3 text-sm flex-shrink-0 active:opacity-60"
          style={{
            height: 36,
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
          }}
        >
          Clear
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      {/* Bottom bar */}
      <div
        className="flex-shrink-0 px-4 pb-6 pt-3"
        style={{ background: 'rgba(6,4,15,0.95)', borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={showToPlayer}
          disabled={!hasStrokes}
          className="w-full rounded-2xl py-4 font-semibold transition-all active:scale-95"
          style={{
            background: hasStrokes
              ? 'linear-gradient(135deg, #2d1f5e, #3d2878)'
              : 'rgba(30,20,50,0.4)',
            border: `1px solid ${hasStrokes ? '#6366f1' : 'var(--color-border)'}`,
            color: hasStrokes ? '#a5b4fc' : 'var(--color-text-dim)',
            fontSize: 17,
          }}
        >
          Show to Player
        </button>
      </div>
    </div>
  );
}
