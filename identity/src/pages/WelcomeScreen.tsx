import React from 'react';
import { BrandLogo, Icon } from '../components/brand';

interface WelcomeScreenProps {
  onNext: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext }) => {
  const features: { icon: React.ReactNode; title: string; desc: string }[] = [
    { icon: <Icon.Shield />, title: 'Protect your property', desc: 'Cryptographic certificates of ownership' },
    { icon: <Icon.Lock />, title: 'Secure your ideas', desc: 'Encrypted vault for creative assets' },
    { icon: <Icon.Sparkle />, title: 'Experience your legacy', desc: 'Build a portfolio that lasts forever' },
  ];

  return (
    <div
      className="screen welcome-screen active"
      style={{
        background: 'var(--bg-page)',
        padding: '60px 28px 32px',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandLogo size="sm" />
        <button
          onClick={onNext}
          style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}
        >
          Skip
        </button>
      </div>

      <div style={{ marginTop: 48 }}>
        <div
          className="mono"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--primary)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Welcome
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: '12px 0 16px',
            letterSpacing: '-0.03em',
          }}
        >
          Your safeguard for{' '}
          <span style={{ color: 'var(--primary)' }}>creative ownership</span>
        </h1>
        <p
          style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}
        >
          Mint, protect and trade your work as NFTs — backed by physical proof and on-chain identity.
        </p>
      </div>

      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {features.map(f => (
          <div
            key={f.title}
            className="card"
            style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--primary-soft)',
                color: 'var(--primary-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {f.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 24, height: 6, borderRadius: 3, background: 'var(--primary)' }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--border-strong)' }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--border-strong)' }} />
        </div>
        <button
          onClick={onNext}
          className="btn btn-primary"
          style={{ padding: '16px 24px', fontSize: 16 }}
        >
          Get started <Icon.ArrowRight />
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
