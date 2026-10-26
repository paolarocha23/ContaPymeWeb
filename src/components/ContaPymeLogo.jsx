import React from 'react';

export default function ContaPymeLogo({ 
  variant = 'dark', // 'dark' (navy text for white/light bg) | 'light' (white text for dark bg) | 'icon-only'
  size = 'normal', // 'small' | 'normal' | 'large'
  showSubtitle = true,
  className = ''
}) {
  const isLight = variant === 'light';
  
  const iconSizes = {
    small: { w: 28, h: 28 },
    normal: { w: 38, h: 38 },
    large: { w: 56, h: 56 }
  };

  const { w, h } = iconSizes[size] || iconSizes.normal;

  return (
    <div className={`contapyme-brand ${className}`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size === 'small' ? '8px' : size === 'large' ? '14px' : '10px',
      userSelect: 'none'
    }}>
      {/* SVG Icon: Circular growth arrow emblem */}
      <svg
        width={w}
        height={h}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <circle cx="50" cy="50" r="46" stroke="none" fill="transparent" />
        
        {/* Dynamic circular arrow matching ContaPyme symbol */}
        <path
          d="M 28 64 C 20 54 21 38 32 28 C 42 19 58 19 68 28 L 62 34 C 55 27 43 27 36 33 C 28 40 28 52 35 60 Z"
          fill={isLight ? '#38bdf8' : '#1d4ed8'}
        />
        <path
          d="M 72 36 C 80 46 79 62 68 72 C 58 81 42 81 32 72 L 38 66 C 45 73 57 73 64 67 C 72 60 72 48 65 40 Z"
          fill={isLight ? '#60a5fa' : '#1e3a8a'}
        />
        {/* Upward growth arrow through circle */}
        <path
          d="M 32 64 L 68 28 M 68 28 L 50 28 M 68 28 L 68 46"
          stroke={isLight ? '#ffffff' : '#1d4ed8'}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {variant !== 'icon-only' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: size === 'small' ? '1.15rem' : size === 'large' ? '1.85rem' : '1.45rem',
            fontWeight: '800',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontFamily: 'var(--font-display, sans-serif)',
            color: isLight ? '#ffffff' : '#102a6b'
          }}>
            Conta<span style={{ color: isLight ? '#60a5fa' : '#1d4ed8' }}>Pyme</span>
          </div>
          {showSubtitle && (
            <div style={{
              fontSize: size === 'small' ? '0.62rem' : size === 'large' ? '0.78rem' : '0.68rem',
              fontWeight: '500',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              marginTop: '1px',
              color: isLight ? 'rgba(255, 255, 255, 0.75)' : '#64748b'
            }}>
              Administración y Contabilidad para PyMEs
            </div>
          )}
        </div>
      )}
    </div>
  );
}
