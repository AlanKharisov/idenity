import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetNFTs, apiUpdateNFT, apiGetCryptoWallets } from '../services/apiClient';
import { Icon } from '../components/brand';

interface WalletPageProps {
  onNFTClick: (nft: any) => void;
  onSellNFT:  (nft: any) => void;
}

const getNFTImage = (nft: any): string => nft.image || nft.nftImage || '/img/default-nft.png';

type Tab = 'all' | 'listed' | 'hidden';

const WalletPage: React.FC<WalletPageProps> = ({ onNFTClick, onSellNFT }) => {
  const { currentUser } = useAuth();
  const [myNFTs, setMyNFTs] = useState<any[]>([]);
  const [cryptoWallets, setCryptoWallets] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [currentUser]); // eslint-disable-line

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [nfts, wallets] = await Promise.all([apiGetNFTs(), apiGetCryptoWallets()]);
      setMyNFTs(nfts || []);
      setCryptoWallets(wallets || []);
    } catch (e) {
      console.error('Error loading wallet data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromSale = async (nft: any) => {
    if (!currentUser) return;
    try {
      await apiUpdateNFT(nft.id, { forSale: false, price: null });
      setMyNFTs(prev => prev.map(n => (n.id === nft.id ? { ...n, forSale: false, price: null } : n)));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const totalBalance = cryptoWallets.reduce(
    (sum: number, w: any) => sum + (Number(w.balance) || 0),
    0,
  );

  const visibleNFTs = myNFTs.filter(n => {
    if (tab === 'listed') return n.forSale;
    if (tab === 'hidden') return n.hidden;
    return true;
  });

  if (loading) {
    return (
      <div className="page wallet-page active" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page wallet-page active mi-screen-pad" style={{ paddingTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 className="h2">Wallet</h1>
        <button
          aria-label="Settings"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--bg-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
          }}
        >
          <Icon.Settings />
        </button>
      </div>

      {/* Balance card */}
      <div
        style={{
          padding: 20,
          borderRadius: 18,
          background: 'linear-gradient(135deg, #0c5a44 0%, #10b981 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -20, right: -20,
            width: 120, height: 120,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div className="mono" style={{ fontSize: 12, opacity: 0.7, letterSpacing: '0.1em' }}>TOTAL BALANCE</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {totalBalance.toFixed(2)}
          </span>
          <span style={{ fontSize: 14, opacity: 0.7 }}>SOL</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {[
            { l: 'Send', icon: <Icon.Send size={16} /> },
            { l: 'Receive', icon: <Icon.Receive size={16} /> },
            { l: 'Buy', icon: <Icon.Plus size={16} /> },
          ].map(b => (
            <button
              key={b.l}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.18)',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {b.icon} {b.l}
            </button>
          ))}
        </div>
      </div>

      {/* Wallets row */}
      {cryptoWallets.length > 0 ? (
        <div className="scrollx" style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
          {cryptoWallets.map((w: any) => (
            <div
              key={w.id}
              style={{
                minWidth: 130,
                padding: '10px 12px',
                background: 'var(--bg-soft)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.type || 'Wallet'}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
                {Number(w.balance || 0).toFixed(4)} {w.currency || 'SOL'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '12px 14px',
            background: 'var(--primary-faint)',
            border: '1px solid var(--primary-soft)',
            color: 'var(--primary-ink)',
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          Connect a Phantom wallet in <strong>Profile → Crypto Wallets</strong> to buy NFTs.
        </div>
      )}

      {/* My NFTs header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0 12px',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          My NFTs <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{myNFTs.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          {(['all', 'listed', 'hidden'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: tab === t ? 700 : 500,
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {visibleNFTs.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '50px 20px' }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>🖼</div>
          <h3 className="h3">No NFTs yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Create your own NFT or buy from the marketplace.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {visibleNFTs.map((nft: any) => (
            <div
              key={nft.id}
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => onNFTClick(nft)}
            >
              <div
                style={{
                  height: 140,
                  background: 'var(--bg-soft)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={getNFTImage(nft)}
                  alt={nft.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/img/default-nft.png'; }}
                />
                {nft.forSale && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8, left: 8,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'var(--primary)',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}
                  >
                    LISTED
                  </div>
                )}
              </div>
              <div style={{ padding: 10 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nft.title || 'Untitled'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 4,
                  }}
                >
                  {nft.forSale && nft.price ? (
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      {nft.price} {nft.currency || 'SOL'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      Not listed
                    </span>
                  )}
                  {nft.forSale ? (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveFromSale(nft); }}
                      style={{
                        fontSize: 11,
                        color: 'var(--danger)',
                        fontWeight: 700,
                      }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); onSellNFT(nft); }}
                      style={{
                        fontSize: 11,
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      Sell
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletPage;
