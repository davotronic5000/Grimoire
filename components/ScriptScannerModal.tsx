'use client';

import { useRef, useState } from 'react';
import type { RoleDefinition } from '@/lib/types';
import { matchRolesFromText } from '@/lib/scriptMatcher';
import { getGenericIconPath, getRoleIconPath, getRoleTeamColor } from '@/lib/roles';

interface Props {
  rolesDb: Record<string, RoleDefinition>;
  onConfirm: (roleIds: string[]) => void;
  onClose: () => void;
}

type ScanState = 'idle' | 'processing' | 'results' | 'error';

export default function ScriptScannerModal({ rolesDb, onConfirm, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [progress, setProgress] = useState(0);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setPreviewUrl(URL.createObjectURL(file));
    setScanState('processing');
    setProgress(0);

    try {
      // Dynamic import keeps Tesseract out of the initial bundle
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const ids = matchRolesFromText(text, rolesDb);
      setMatchedIds(ids);
      setSelectedIds(new Set(ids));
      setScanState('results');
    } catch (err) {
      console.error(err);
      setErrorMsg('OCR failed — please try again with a clearer photo.');
      setScanState('error');
    }
  }

  function toggleRole(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selectedIds));
  }

  return (
    <>
      <div className="fixed inset-0 z-[90]" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={scanState === 'idle' ? onClose : undefined} />
      <div
        className="fixed inset-x-0 bottom-0 z-[91] flex flex-col rounded-t-2xl overflow-hidden"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
          maxHeight: '88dvh',
        }}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0 flex flex-col items-center pt-3 px-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="w-9 h-1 rounded-full mb-4" style={{ background: 'var(--color-border)' }} />
          <div className="flex items-center justify-between w-full">
            <button onClick={onClose} className="text-sm active:opacity-60" style={{ color: 'var(--color-text-dim)' }}>
              Cancel
            </button>
            <p className="font-semibold" style={{ fontSize: 16, color: 'var(--color-text)' }}>
              Scan Script
            </p>
            {scanState === 'results' ? (
              <button
                onClick={handleConfirm}
                className="text-sm font-semibold active:opacity-80"
                style={{ color: '#a5b4fc' }}
              >
                Use ({selectedIds.size})
              </button>
            ) : (
              <div style={{ width: 60 }} />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* Idle: prompt to take photo */}
          {scanState === 'idle' && (
            <div className="flex flex-col items-center py-10 gap-5">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Script preview" className="rounded-xl object-contain w-full" style={{ maxHeight: 260 }} />
              )}
              <p className="text-center text-sm" style={{ color: 'var(--color-text-dim)', maxWidth: 300 }}>
                Take a photo of your printed script or choose an image from your library. Character names will be detected automatically.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl font-semibold transition-all active:scale-95"
                style={{
                  padding: '16px 40px',
                  fontSize: 17,
                  background: 'linear-gradient(135deg, #2d1f5e, #3d2878)',
                  border: '1px solid #6366f1',
                  color: '#a5b4fc',
                }}
              >
                📷  Choose Photo
              </button>
            </div>
          )}

          {/* Processing */}
          {scanState === 'processing' && (
            <div className="flex flex-col items-center py-10 gap-6">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Script preview" className="rounded-xl object-contain w-full opacity-60" style={{ maxHeight: 220 }} />
              )}
              <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--color-surface)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #a5b4fc)' }}
                />
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                Reading script… {progress}%
              </p>
            </div>
          )}

          {/* Error */}
          {scanState === 'error' && (
            <div className="flex flex-col items-center py-10 gap-5">
              <p className="text-sm text-center px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>
                {errorMsg}
              </p>
              <button
                onClick={() => { setScanState('idle'); setPreviewUrl(null); }}
                className="rounded-xl px-6 py-3 font-semibold active:scale-95"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', fontSize: 15 }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {scanState === 'results' && (
            <div className="py-4">
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-dim)' }}>
                {matchedIds.length} role{matchedIds.length !== 1 ? 's' : ''} detected — tap to deselect any that are wrong, or tap undetected roles to add them.
              </p>
              <div className="space-y-2">
                {matchedIds.map(id => {
                  const role = rolesDb[id];
                  if (!role) return null;
                  const isSelected = selectedIds.has(id);
                  const teamColor = getRoleTeamColor(role.team);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleRole(id)}
                      className="w-full text-left flex items-center gap-3 rounded-xl transition-all active:scale-[0.98]"
                      style={{
                        padding: '12px 14px',
                        background: isSelected ? `${teamColor}22` : 'rgba(20,12,40,0.4)',
                        border: `1px solid ${isSelected ? teamColor : 'var(--color-border)'}`,
                        opacity: isSelected ? 1 : 0.4,
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
                        src={getRoleIconPath(role)}
                        alt={role.name}
                        className="rounded-full object-contain flex-shrink-0"
                        style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.4)', padding: 3 }}
                        onError={e => {
                          const img = e.target as HTMLImageElement;
                          if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = getGenericIconPath(role.team); }
                        }}
                      />
                      <div>
                        <p className="font-semibold text-sm" style={{ color: isSelected ? teamColor : 'var(--color-text)' }}>
                          {role.name}
                        </p>
                        <p className="text-xs capitalize" style={{ color: 'var(--color-text-dim)' }}>{role.team}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { setScanState('idle'); setPreviewUrl(null); }}
                className="w-full mt-4 rounded-xl py-3 text-sm active:opacity-60"
                style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-dim)' }}
              >
                Scan Again
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </>
  );
}
