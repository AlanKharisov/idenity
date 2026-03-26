import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetNFTs, apiUpdateNFT, apiDeletePost, apiGetCryptoWallets } from '../services/apiClient';

interface WalletPageProps {
    onNFTClick: (nft: any) => void;
    onSellNFT:  (nft: any) => void;
}

const getNFTImage = (nft: any): string => nft.image || nft.nftImage || '/img/default-nft.png';

const WalletPage: React.FC<WalletPageProps> = ({ onNFTClick, onSellNFT }) => {
    const { currentUser }                   = useAuth();
    const [myNFTs, setMyNFTs]               = useState<any[]>([]);
    const [cryptoWallets, setCryptoWallets] = useState<any[]>([]);
    const [flippedNFTs, setFlippedNFTs]     = useState<Record<string, boolean>>({});
    const [loading, setLoading]             = useState(true);

    useEffect(() => { loadData(); }, [currentUser]); // eslint-disable-line

    const loadData = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const [nfts, wallets] = await Promise.all([
                apiGetNFTs(),
                apiGetCryptoWallets(),
            ]);
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
            setMyNFTs(prev => prev.map(n => n.id === nft.id ? { ...n, forSale: false, price: null } : n));
            alert('✅ NFT removed from marketplace');
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        }
    };

    const toggleFlip = (id: string) =>
        setFlippedNFTs(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading) {
        return (
            <div style={st.loadingBox}>
                <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                <div style={st.spinner} />
            </div>
        );
    }

    return (
        <div className="page wallet-page active">
            <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>

            {/* Connected crypto wallets */}
            <div style={st.balanceCard}>
                <h1 style={st.balanceTitle}>💼 Your Wallet</h1>
                {cryptoWallets.length > 0 ? (
                    <div style={st.tokenGrid}>
                        {cryptoWallets.map((w: any) => (
                            <div key={w.id} style={st.tokenItem}>
                                <span style={{ fontSize: '12px' }}>👻 {w.type}</span>
                                <span style={st.tokenValue}>{w.balance?.toFixed(4) || '0.0000'} {w.currency}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: '13px', paddingTop: '8px' }}>
                        No crypto wallets connected
                    </div>
                )}
            </div>

            {cryptoWallets.length === 0 && (
                <div style={st.noWalletBanner}>
                    ⚠️ Connect a Phantom wallet in <strong>Profile → Crypto Wallets</strong> to buy NFTs
                </div>
            )}

            {/* My NFTs */}
            <div style={st.sectionHeader}>
                <span style={st.sectionTitle}>🎨 My NFTs ({myNFTs.length})</span>
            </div>

            <div style={st.content}>
                {myNFTs.length === 0 ? (
                    <div style={st.empty}>
                        <div style={{ fontSize: '50px', marginBottom: '15px' }}>🖼</div>
                        <h3>No NFTs Yet</h3>
                        <p style={{ color: '#888', fontSize: '13px' }}>Create your own NFT or buy from the marketplace!</p>
                    </div>
                ) : (
                    <div style={st.grid}>
                        {myNFTs.map((nft: any) => (
                            <div
                                key={nft.id}
                                style={st.card}
                                onMouseEnter={() => toggleFlip(nft.id)}
                                onMouseLeave={() => toggleFlip(nft.id)}
                                onTouchStart={() => toggleFlip(nft.id)}
                            >
                                <div style={{ ...st.flipInner, transform: flippedNFTs[nft.id] ? 'rotateY(180deg)' : 'none' }}>
                                    {/* Front */}
                                    <div style={st.front}>
                                        <img
                                            src={getNFTImage(nft)}
                                            alt={nft.title}
                                            style={st.nftImg}
                                            onError={e => { e.currentTarget.src = '/img/default-nft.png'; }}
                                        />
                                        <div style={st.overlay}>
                                            <div style={st.nftTitle}>{nft.title}</div>
                                            <div style={st.nftBottom}>
                                                {nft.forSale ? (
                                                    <>
                                                        <span style={st.priceGreen}>{nft.price} {nft.currency || 'SOL'}</span>
                                                        <button
                                                            style={st.removeBtn}
                                                            onClick={e => { e.stopPropagation(); handleRemoveFromSale(nft); }}
                                                        >✕ Remove</button>
                                                    </>
                                                ) : (
                                                    <button
                                                        style={st.sellBtn}
                                                        onClick={e => { e.stopPropagation(); onSellNFT(nft); }}
                                                    >💰 Sell</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Back */}
                                    <div style={st.back} onClick={() => onNFTClick(nft)}>
                                        <i className="fas fa-qrcode" style={{ fontSize: '36px', marginBottom: '8px' }}></i>
                                        <div style={{ fontSize: '12px' }}>View Details</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const st: any = {
    loadingBox:     { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' },
    spinner:        { width: '48px', height: '48px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    balanceCard:    { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px 20px 20px', borderRadius: '0 0 28px 28px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
    balanceTitle:   { color: 'white', fontSize: '22px', marginBottom: '16px', textAlign: 'center' },
    tokenGrid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: '10px' },
    tokenItem:      { background: 'rgba(255,255,255,0.13)', borderRadius: '10px', padding: '10px', color: 'white', display: 'flex', flexDirection: 'column', gap: '6px' },
    tokenValue:     { color: '#01ff77', fontWeight: 'bold', fontSize: '13px' },
    noWalletBanner: { background: '#fff3cd', margin: '12px 15px', padding: '12px 15px', borderRadius: '10px', fontSize: '13px', color: '#856404', border: '1px solid #ffc107' },
    sectionHeader:  { padding: '16px 15px 0' },
    sectionTitle:   { fontWeight: 'bold', fontSize: '16px', color: '#333' },
    content:        { padding: '14px 15px 100px' },
    empty:          { textAlign: 'center', padding: '50px 20px', background: 'white', borderRadius: '20px' },
    grid:           { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
    card:           { background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', aspectRatio: '1', perspective: '600px' },
    flipInner:      { position: 'relative', width: '100%', height: '100%', transition: 'transform 0.55s', transformStyle: 'preserve-3d' },
    front:          { position: 'absolute', inset: 0, backfaceVisibility: 'hidden' },
    back:           { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white', cursor: 'pointer' },
    nftImg:         { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    overlay:        { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.82))', color: 'white', padding: '10px' },
    nftTitle:       { fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    nftBottom:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    priceGreen:     { color: '#01ff77', fontWeight: 'bold', fontSize: '12px' },
    sellBtn:        { background: '#01ff77', border: 'none', borderRadius: '12px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
    removeBtn:      { background: '#ff4444', border: 'none', borderRadius: '12px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', color: 'white' },
};

export default WalletPage;
