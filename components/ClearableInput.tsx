'use client';

import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
  /** Extra styles applied to the wrapping div */
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

export default function ClearableInput({
  onClear,
  value,
  style,
  wrapperClassName,
  wrapperStyle,
  ...inputProps
}: Props) {
  const hasValue = !!value;

  return (
    <div className={wrapperClassName} style={{ position: 'relative', ...wrapperStyle }}>
      <input
        value={value}
        style={{ paddingRight: hasValue ? 32 : undefined, ...style }}
        {...inputProps}
      />
      {hasValue && (
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={onClear}
          tabIndex={-1}
          aria-label="Clear"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 18,
            lineHeight: 1,
            color: 'var(--botc-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
