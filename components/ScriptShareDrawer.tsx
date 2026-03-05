'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Game } from '@/lib/types';
import { useIsWide } from '@/lib/hooks';

const BUILTIN_SCRIPT_IDS = ['tb', 'snv', 'bmr'];

interface Props {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
}

export default function ScriptShareDrawer({ game, isOpen, onClose }: Props) {
  const isWide = useIsWide();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // Create a share link on first open; cache for subsequent opens
  useEffect(() => {
    if (!isOpen || shareUrl || loading) return;
    setLoading(true);
    setError(false);
    fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptName: game.scriptName,
        scriptAuthor: game.scriptAuthor ?? null,
        scriptId: BUILTIN_SCRIPT_IDS.includes(game.scriptId) ? game.scriptId : null,
        roleIds: game.scriptRoleIds,
        homebrewRoles: game.homebrewRoles && Object.keys(game.homebrewRoles).length > 0
          ? game.homebrewRoles
          : null,
      }),
    })
      .then(r => r.json())
      .then(({ slug: s, url: u }) => {
        setSlug(s);
        setShareUrl(u);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isOpen, shareUrl, loading, game]);

  // Reset share state when the script changes
  const scriptKey = game.scriptId + ':' + game.scriptRoleIds.join(',');
  useEffect(() => {
    setShareUrl(null);
    setSlug(null);
    setError(false);
    setCopied(false);
  }, [scriptKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset fullscreen when drawer is closed
  useEffect(() => {
    if (!isOpen) setFullScreen(false);
  }, [isOpen]);

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!isOpen) return null;

  // ── Full-screen QR overlay ─────────────────────────────────────────────────
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6"
        style={{ background: '#06040f' }}
        onClick={() => setFullScreen(false)}
      >
        <p
          className="text-lg font-semibold gothic-heading text-center px-8"
          style={{ color: 'var(--color-gold)' }}
        >
          {game.scriptName}
        </p>

        <div className="rounded-3xl p-5" style={{ background: '#fff' }}>
          <QRCodeSVG
            value={shareUrl!}
            size={Math.min(window.innerWidth, window.innerHeight) * 0.6}
            level="M"
            bgColor="#ffffff"
            fgColor="#06040f"
          />
        </div>

        {slug && (
          <p
            className="font-mono text-sm text-center"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {slug}
          </p>
        )}

        <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Tap anywhere to close
        </p>
      </div>
    );
  }

  // ── Side drawer ────────────────────────────────────────────────────────────
  const panelWidth = isWide ? 420 : 'min(320px, 85vw)';

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
          width: panelWidth,
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
            <h2 className="text-base font-semibold gothic-heading">Share Script</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              {game.scriptName}
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

        {/* Body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl animate-pulse" style={{ color: 'var(--color-gold)' }}>
                🔗
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                Generating link…
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-center" style={{ color: '#f87171' }}>
              Failed to generate link. Check your connection and try again.
            </p>
          )}

          {shareUrl && !loading && (
            <>
              {/* URL display */}
              <p
                className="text-xs text-center font-mono break-all"
                style={{ color: 'var(--color-text-dim)', letterSpacing: '0.02em' }}
              >
                {shareUrl}
              </p>

              {/* QR Code — tap to go full screen */}
              <button
                onClick={() => setFullScreen(true)}
                className="rounded-2xl p-4 active:opacity-70 transition-opacity"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                title="Full screen"
              >
                <QRCodeSVG
                  value={shareUrl}
                  size={isWide ? 220 : 180}
                  level="M"
                  bgColor="transparent"
                  fgColor="#c9a84c"
                />
              </button>

              <p className="text-xs text-center" style={{ color: 'var(--color-text-dim)' }}>
                Tap QR code to full screen
              </p>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all active:opacity-60"
                style={{
                  background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(201,168,76,0.15)',
                  border: `1px solid ${copied ? '#22c55e' : 'var(--color-gold-dim)'}`,
                  color: copied ? '#22c55e' : 'var(--color-gold)',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
