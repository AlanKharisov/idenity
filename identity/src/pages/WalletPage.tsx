import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getUserNFTs, getCryptoWallets, updateNFTInWallet,
    NFT, CryptoWallet
} from '../firebase/wallet';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import BuyModal from './BuyModal';

interface WalletPageProps {
    onNFTClick:  (nft: NFT) => void;
    // Коли юзер хоче продати NFT — переходимо на AddNFTPage з вибраною NFT
    onSellNFT:   (nft: NFT) => void;
}

const getWalletIcon = (type: string) =>
    ({ metamask: '🦊', walletconnect: '🔗', coinbase: '📦', phantom: '👻' }[type] || '💼');

const getNFTImage = (nft: any): string =>
    nft.image || nft.nftImage || '/img/default-nft.png';

const DEMO_MARKET_NFTS: any[] = [
    { id: 'm1', title: 'Cosmic Dream #1',  description: 'Digital art in space',          image: 'https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400', ownerId: 'demo_seller', ownerName: 'CryptoArtist',  price: 0.01,  forSale: true, createdAt: new Date().toISOString(), currency: 'ETH', isDemo: true },
    { id: 'm2', title: 'Digital Pulse #2', description: 'Abstract sound visualization', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', ownerId: 'demo_seller', ownerName: 'NFTMaster',     price: 0.005, forSale: true, createdAt: new Date().toISOString(), currency: 'ETH', isDemo: true },
    { id: 'm3', title: 'Neon City #3',     description: 'Cyberpunk cityscape',          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', ownerId: 'demo_seller', ownerName: 'NeonArtist',    price: 0.5,   forSale: true, createdAt: new Date().toISOString(), currency: 'ETH', isDemo: true },
    { id: 'm4', title: 'Galaxy Art #4',    description: 'Deep space collection',        image: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=400', ownerId: 'demo_seller', ownerName: 'SpaceCreator', price: 2.0,   forSale: true, createdAt: new Date().toISOString(), currency: 'SOL', isDemo: true },
    { id: 'm5', title: 'Solana Seeker #5', description: 'Solana native NFT',            image: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400', ownerId: 'demo_seller', ownerName: 'SolanaArtist', price: 1.5,   forSale: true, createdAt: new Date().toISOString(), currency: 'SOL', isDemo: true },
    { id: 'm6', title: 'Phantom Dream #6', description: 'Beautiful art for collectors', image: 'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=400', ownerId: 'demo_seller', ownerName: 'PhantomMaster',price: 0.8,   forSale: true, createdAt: new Date().toISOString(), currency: 'SOL', isDemo: true },
];

const WalletPage: React.FC<WalletPageProps> = ({ onNFTClick, onSellNFT }) => {
    const { currentUser } = useAuth();
    const [myNFTs, setMyNFTs]               = useState<NFT[]>([]);
    const [marketNFTs, setMarketNFTs]       = useState<any[]>(DEMO_MARKET_NFTS);
    const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
    const [flippedNFTs, setFlippedNFTs]     = useState<Record<string, boolean>>({});
    const [loading, setLoading]             = useState(true);
    const [selectedTab, setSelectedTab]     = useState<'my' | 'market'>('my');
    const [buyNft, setBuyNft]               = useState<any | null>(null);

    useEffect(() => { loadData(); }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadData = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const [userNfts, wallets] = await Promise.all([
                getUserNFTs(currentUser.uid),
                getCryptoWallets(currentUser.uid)
            ]);
            setMyNFTs(userNfts);
            setCryptoWallets(wallets);

            // Реальні NFT на продаж (крім своїх)
            const q = query(collection(db, 'posts'), where('forSale', '==', true));
            const snap = await getDocs(q);
            const realPosts = snap.docs
                .map(d => ({ ...d.data(), id: d.id }))
                .filter((p: any) => p.userId !== currentUser.uid);

            setMarketNFTs([...DEMO_MARKET_NFTS, ...realPosts]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Прибрати з продажу ───────────────────────────────────────────────────
    const handleRemoveFromSale = async (nft: NFT) => {
        if (!currentUser) return;
        try {
            const updatedNFT = { ...nft, price: null, forSale: false };
            await updateNFTInWallet(currentUser.uid, updatedNFT);

            const q = query(
                collection(db, 'posts'),
                where('walletNftId', '==', nft.id),
                where('userId', '==', currentUser.uid)
            );
            const snap = await getDocs(q);
            for (const d of snap.docs) await deleteDoc(d.ref);

            setMyNFTs(prev => prev.map(n => n.id === nft.id ? updatedNFT as NFT : n));
            setMarketNFTs(prev => prev.filter(m => m.walletNftId !== nft.id));
            alert('✅ NFT removed from marketplace');
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        }
    };

    // ── Після купівлі ────────────────────────────────────────────────────────
    const handleBuySuccess = (purchasedNFT: any) => {
        setMyNFTs(prev => [...prev, purchasedNFT]);
        setBuyNft(null);
        loadData();
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

            {/* Баланс */}
            <div style={st.balanceCard}>
                <h1 style={st.balanceTitle}>💼 Your Wallet</h1>
                {cryptoWallets.length > 0 ? (
                    <div style={st.tokenGrid}>
                        {cryptoWallets.map(w => (
                            <div key={w.id} style={st.tokenItem}>
                                <span style={{ fontSize: '12px' }}>{getWalletIcon(w.type)} {w.type}</span>
                                <span style={st.tokenValue}>{w.balance.toFixed(4)} {w.currency}</span>
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
                    ⚠️ Connect a crypto wallet in <strong>Profile → Crypto Wallets</strong> to buy NFTs
                </div>
            )}

            {/* Таби */}
            <div style={st.tabs}>
                {(['my', 'market'] as const).map(tab => (
                    <button key={tab} onClick={() => setSelectedTab(tab)} style={{
                        ...st.tab,
                        background: selectedTab === tab ? '#01ff77' : 'transparent',
                        color:      selectedTab === tab ? 'black'   : '#666',
                    }}>
                        {tab === 'my' ? `🎨 My NFTs (${myNFTs.length})` : `🛒 Market (${marketNFTs.length})`}
                    </button>
                ))}
            </div>

            <div style={st.content}>

                {/* ── МОЯ КОЛЕКЦІЯ ── */}
                {selectedTab === 'my' && (
                    myNFTs.length === 0 ? (
                        <div style={st.empty}>
                            <div style={{ fontSize: '50px', marginBottom: '15px' }}>🖼</div>
                            <h3>No NFTs Yet</h3>
                            <p style={{ color: '#888', fontSize: '13px' }}>Buy from marketplace or create your own!</p>
                            <button onClick={() => setSelectedTab('market')} style={st.primaryBtn}>
                                Go to Marketplace
                            </button>
                        </div>
                    ) : (
                        <div style={st.grid}>
                            {myNFTs.map(nft => (
                                <div
                                    key={nft.id}
                                    style={st.card}
                                    onMouseEnter={() => toggleFlip(nft.id)}
                                    onMouseLeave={() => toggleFlip(nft.id)}
                                    onTouchStart={() => toggleFlip(nft.id)}
                                >
                                    <div style={{ ...st.flipInner, transform: flippedNFTs[nft.id] ? 'rotateY(180deg)' : 'none' }}>

                                        {/* Передня сторона */}
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
                                                            <span style={st.priceGreen}>{nft.price} {(nft as any).currency || 'ETH'}</span>
                                                            <button
                                                                style={st.removeBtn}
                                                                onClick={e => { e.stopPropagation(); handleRemoveFromSale(nft); }}
                                                            >✕ Remove</button>
                                                        </>
                                                    ) : (
                                                        // ← Кнопка "Sell" відкриває AddNFTPage з цією NFT
                                                        <button
                                                            style={st.sellBtn}
                                                            onClick={e => { e.stopPropagation(); onSellNFT(nft); }}
                                                        >💰 Sell</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Задня сторона */}
                                        <div style={st.back} onClick={() => onNFTClick(nft)}>
                                            <i className="fas fa-qrcode" style={{ fontSize: '36px', marginBottom: '8px' }}></i>
                                            <div style={{ fontSize: '12px' }}>View Details</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* ── МАРКЕТПЛЕЙС ── */}
                {selectedTab === 'market' && (
                    <div style={st.grid}>
                        {marketNFTs.map((nft: any) => (
                            <div key={nft.id} style={st.marketCard}>
                                <img
                                    src={getNFTImage(nft)}
                                    alt={nft.title}
                                    style={st.nftImg}
                                    onError={e => { e.currentTarget.src = '/img/default-nft.png'; }}
                                />
                                <div style={st.marketOverlay}>
                                    <div style={st.nftTitle}>{nft.title}</div>
                                    <div style={st.marketMeta}>
                                        <span style={{ fontSize: '11px', color: '#ccc' }}>by {nft.ownerName || nft.userName}</span>
                                        <span style={st.priceGreen}>{nft.price} {nft.currency || 'ETH'}</span>
                                    </div>
                                    <button onClick={() => setBuyNft(nft)} style={st.buyBtn}>
                                        Buy Now 🚀
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Модалка купівлі */}
            {buyNft && (
                <BuyModal
                    nft={buyNft}
                    onClose={() => setBuyNft(null)}
                    onSuccess={handleBuySuccess}
                />
            )}
        </div>
    );
};

const st: any = {
    loadingBox:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' },
    spinner:       { width: '48px', height: '48px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    balanceCard:   { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px 20px 20px', borderRadius: '0 0 28px 28px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
    balanceTitle:  { color: 'white', fontSize: '22px', marginBottom: '16px', textAlign: 'center' },
    tokenGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: '10px' },
    tokenItem:     { background: 'rgba(255,255,255,0.13)', borderRadius: '10px', padding: '10px', color: 'white', display: 'flex', flexDirection: 'column', gap: '6px' },
    tokenValue:    { color: '#01ff77', fontWeight: 'bold', fontSize: '13px' },
    noWalletBanner:{ background: '#fff3cd', margin: '12px 15px', padding: '12px 15px', borderRadius: '10px', fontSize: '13px', color: '#856404', border: '1px solid #ffc107' },
    tabs:          { display: 'flex', margin: '16px 15px 0', background: '#f0f0f0', borderRadius: '25px', padding: '4px' },
    tab:           { flex: 1, padding: '11px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.25s', fontSize: '13px' },
    content:       { padding: '14px 15px 100px' },
    empty:         { textAlign: 'center', padding: '50px 20px', background: 'white', borderRadius: '20px' },
    primaryBtn:    { background: '#01ff77', border: 'none', padding: '12px 30px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px', fontSize: '14px' },
    grid:          { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
    card:          { background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', aspectRatio: '1', perspective: '600px' },
    flipInner:     { position: 'relative', width: '100%', height: '100%', transition: 'transform 0.55s', transformStyle: 'preserve-3d' },
    front:         { position: 'absolute', inset: 0, backfaceVisibility: 'hidden' },
    back:          { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white', cursor: 'pointer' },
    nftImg:        { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    overlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.82))', color: 'white', padding: '10px' },
    nftTitle:      { fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    nftBottom:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    priceGreen:    { color: '#01ff77', fontWeight: 'bold', fontSize: '12px' },
    sellBtn:       { background: '#01ff77', border: 'none', borderRadius: '12px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
    removeBtn:     { background: '#ff4444', border: 'none', borderRadius: '12px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', color: 'white' },
    marketCard:    { background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', aspectRatio: '1', position: 'relative' },
    marketOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.9))', color: 'white', padding: '12px' },
    marketMeta:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    buyBtn:        { background: '#01ff77', border: 'none', borderRadius: '18px', padding: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', width: '100%', color: 'black' },
};

export default WalletPage;