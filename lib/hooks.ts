'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport is at least `minWidth` pixels wide.
 * Defaults to 768px — always true on iPad Pro in any orientation.
 */
export function useIsWide(minWidth = 768): boolean {
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= minWidth : false
  );

  useEffect(() => {
    const handler = () => setIsWide(window.innerWidth >= minWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [minWidth]);

  return isWide;
}
