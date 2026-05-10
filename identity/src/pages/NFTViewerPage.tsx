import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../components/brand';

interface NFT {
  id: string;
  title: string;
  description: string;
  image: string;
  ownerId: string;
  ownerName: string;
  price?: number;
  currency?: string;
  blockchain?: string;
  royalty?: number;
  tags?: string[];
  category?: string;
  forSale?: boolean;
  createdAt?: string;
}

interface NFTViewerPageProps {
  nft: NFT;
  onClose: () => void;
}

const NFTViewerPage: React.FC<NFTViewerPageProps> = ({ nft, onClose }) => {
  const [scale, setScale] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    generateQRCode();
  }, [nft]); // eslint-disable-line

  const generateQRCode = async () => {
    try {
      const qrData = JSON.stringify({
        id: nft.id,
        title: nft.title,
        owner: nft.ownerName,
        created: nft.createdAt || new Date().toISOString(),
      });
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#0a0a0a', light: '#ffffff' },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR:', error);
    }
  };

  const handleZoomIn = () => setScale(p => Math.min(p + 0.25, 3));
  const handleZoomOut = () => setScale(p => Math.max(p - 0.25, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-page)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'var(--bg-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
          }}
          aria-label="Close"
        >
          <Icon.ArrowLeft />
        </button>
        <div style={{ textAlign: 'center', minWidth: 0, flex: 1, padding: '0 12px' }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nft.title}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            #{(nft.id || '').slice(0, 8)}
          </div>
        </div>
        <button
          onClick={() => setShowQR(v => !v)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: showQR ? 'var(--primary)' : 'var(--primary-soft)',
            color: showQR ? 'white' : 'var(--primary-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Toggle QR"
        >
          <Icon.QR size={18} />
        </button>
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'linear-gradient(180deg, var(--bg-page) 0%, var(--bg-soft) 100%)',
          overflow: 'auto',
        }}
      >
        {!showQR ? (
          <div
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 20px 60px -20px rgba(16,185,129,0.25), 0 4px 12px rgba(0,0,0,0.08)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              padding: 12,
            }}
          >
            <img
              src={nft.image}
              alt={nft.title}
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.3s ease',
                maxWidth: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                transformOrigin: 'center',
                borderRadius: 16,
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 24,
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" style={{ width: 240, height: 240, display: 'block' }} />
            ) : (
              <div className="spinner" />
            )}
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: '#666',
                letterSpacing: '0.08em',
              }}
            >
              SCAN TO VERIFY
            </div>
            {qrCodeUrl && (
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `nft-${nft.id}-qr.png`;
                  link.href = qrCodeUrl;
                  link.click();
                }}
                className="btn btn-primary"
                style={{ marginTop: 6, fontSize: 13, padding: '8px 16px' }}
              >
                Download QR
              </button>
            )}
          </div>
        )}
      </div>

      {/* Zoom controls */}
      {!showQR && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 4,
              borderRadius: 999,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              onClick={handleZoomOut}
              style={{
                width: 32, height: 32,
                borderRadius: 999,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Zoom out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5M8 11h6" />
              </svg>
            </button>
            <span
              className="mono"
              style={{
                fontSize: 12,
                fontWeight: 600,
                minWidth: 44,
                textAlign: 'center',
              }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={{
                width: 32, height: 32,
                borderRadius: 999,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Zoom in"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5M11 8v6M8 11h6" />
              </svg>
            </button>
            <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
            <button
              onClick={handleResetZoom}
              style={{
                width: 32, height: 32,
                borderRadius: 999,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Reset zoom"
            >
              <Icon.Refresh size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: '14px 20px 18px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
              }}
            >
              Owner
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{nft.ownerName}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
              }}
            >
              Created
            </div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
              {nft.createdAt ? new Date(nft.createdAt).toLocaleDateString() : 'Today'}
            </div>
          </div>
          {nft.price && (
            <div style={{ textAlign: 'right' }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--text-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                }}
              >
                Price
              </div>
              <div
                className="mono"
                style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}
              >
                {nft.price} {nft.currency || 'SOL'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFTViewerPage;
