import React, { useEffect } from 'react';
import { BrandGlyph } from '../components/brand';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="screen splash-screen active"
      style={{
        background: 'radial-gradient(circle at 30% 20%, #1a4032 0%, #0c1410 70%)',
        color: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          flex: 1,
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: -40,
              background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }}
          />
          <BrandGlyph size={88} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            color: 'white',
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '-0.03em',
          }}
        >
          <span>Mark</span>
          <span style={{ color: '#10b981', fontWeight: 500 }}>Identity</span>
        </div>

        <div
          className="mono"
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: '0.1em' }}
        >
          SECURE · OWN · CREATE
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 64,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 32,
            height: 3,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.15)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '60%',
              height: '100%',
              background: '#10b981',
              animation: 'splashFill 2s ease forwards',
            }}
          />
        </div>
        <div
          className="mono"
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}
        >
          v 2.0.1
        </div>
      </div>
      <style>{`@keyframes splashFill { from { width: 0; } to { width: 100%; } }`}</style>
    </div>
  );
};

export default SplashScreen;
