import React from 'react';

interface BrandGlyphProps {
  size?: number;
  color?: string;
}

export const BrandGlyph: React.FC<BrandGlyphProps> = ({ size = 32, color }) => (
  <div
    className="brand-glyph"
    style={{
      width: size,
      height: size,
      background: color || 'var(--primary)',
      borderRadius: size * 0.28,
    }}
  >
    <svg viewBox="0 0 32 32" style={{ width: size * 0.56, height: size * 0.56 }}>
      <path d="M6 24 V8 H10 L16 16 L22 8 H26 V24 H22 V14 L17 21 H15 L10 14 V24 Z" fill="white" />
    </svg>
  </div>
);

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'default' | 'inverse';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', color = 'default' }) => {
  const cfg = {
    sm: { glyph: 24, text: 16 },
    md: { glyph: 32, text: 20 },
    lg: { glyph: 48, text: 28 },
    xl: { glyph: 64, text: 36 },
  }[size];
  const markColor = color === 'inverse' ? '#ffffff' : 'var(--text)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <BrandGlyph size={cfg.glyph} />
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          fontSize: cfg.text,
          fontWeight: 700,
          letterSpacing: '-0.03em',
        }}
      >
        <span style={{ color: markColor }}>Mark</span>
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Identity</span>
      </div>
    </div>
  );
};
