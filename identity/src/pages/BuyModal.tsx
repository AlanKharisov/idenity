import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getCryptoWallets, addNFTToWallet, updateCryptoBalance,
    removeNFTFromWallet, addFundsToSeller, CryptoWallet
} from '../firebase/wallet';
import { notifyPurchase, notifySale } from '../firebase/notifications';
import { doc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface BuyModalProps {
    nft: any;
    onClose: () => void;
    onSuccess?: (boughtNft: any) => void;
}

const WALLET_ICONS: Record<string, string> = {
    metamask: '🦊', walletconnect: '🔗', coinbase: '📦', phantom: '👻',
};

const PLATFORM_FEE = 0.01; // 1%

const BuyModal: React.FC<BuyModalProps> = ({ nft, onClose, onSuccess }) => {
    const { currentUser } = useAuth();
    const [wallets, setWallets]             = useState<CryptoWallet[]>([]);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [loading, setLoading]             = useState(true);
    const [buying, setBuying]               = useState(false);

    const nftCurrency = (nft.currency || 'ETH') as string;
    const nftPrice    = Number(nft.price) || 0;
    const fee         = nftPrice * PLATFORM_FEE;
    const total       = nftPrice + fee;

    // Продавець — з поста (userId) або з NFT (ownerId)
    const sellerId = nft.userId || nft.ownerId || '';
    const isDemo   = nft.isDemo || sellerId === 'demo_seller' || !sellerId;

    useEffect(() => {
        (async () => {
            if (!currentUser) { setLoading(false); return; }
            const all        = await getCryptoWallets(currentUser.uid);
            const compatible = all.filter(w => w.currency === nftCurrency);
            setWallets(compatible);
            if (compatible.length > 0) setSelectedWalletId(compatible[0].id);
            setLoading(false);
        })();
    }, [currentUser, nftCurrency]);

    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const hasFunds       = selectedWallet ? selectedWallet.balance >= total : false;

    const handleBuy = async () => {
        if (!currentUser || !selectedWallet) return;
        setBuying(true);
        try {
            // ── 1. Формуємо NFT для покупця зі збереженням усіх метаданих ──
            const purchasedNFT: any = {
                id:          `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title:       nft.title,
                description: nft.description || '',
                image:       nft.nftImage || nft.image || '',
                tags:        nft.tags || [],
                category:    nft.category || '',
                blockchain:  nft.blockchain || '',
                royalty:     nft.royalty || 0,
                ownerId:     currentUser.uid,
                ownerName:   currentUser.name || 'Me',
                forSale:     false,
                price:       null,
                currency:    nftCurrency,
                createdAt:   new Date().toISOString(),
                originalCreatorId:   sellerId,
                originalCreatorName: nft.ownerName || nft.userName || 'Unknown',
            };

            // ── 2. Додаємо NFT покупцю ──
            await addNFTToWallet(currentUser.uid, purchasedNFT);

            // ── 3. Списуємо баланс покупця (ціна + 1% комісія) ──
            await updateCryptoBalance(
                currentUser.uid, selectedWalletId,
                selectedWallet.balance - total
            );

            if (!isDemo && sellerId && sellerId !== currentUser.uid) {

                // ── 4. Видаляємо NFT з гаманця продавця ──
                // walletNftId — це реальний ID NFT в гаманці продавця (якщо виставлено через WalletPage)
                // nft.id — це ID документа поста в Firestore (не те саме!)
                const nftIdInWallet = nft.walletNftId || nft.id;
                await removeNFTFromWallet(sellerId, nftIdInWallet);

                // ── 5. Зараховуємо 100% ціни продавцю (комісія вже з покупця) ──
                await addFundsToSeller(sellerId, nftPrice, nftCurrency);

                // ── 6. Видаляємо пост продавця з Firestore ──
                // Спроба 1: прямий ID документа поста
                if (nft.id) {
                    try { await deleteDoc(doc(db, 'posts', nft.id)); } catch (_) {}
                }

                // Спроба 2: пошук по walletNftId (пости виставлені через WalletPage)
                if (nft.walletNftId) {
                    const q = query(
                        collection(db, 'posts'),
                        where('walletNftId', '==', nft.walletNftId),
                        where('userId', '==', sellerId)
                    );
                    const snap = await getDocs(q);
                    for (const d of snap.docs) await deleteDoc(d.ref);
                }

                // Спроба 3: пошук по userId + title (на випадок якщо немає walletNftId)
                if (!nft.walletNftId) {
                    const q2 = query(
                        collection(db, 'posts'),
                        where('userId', '==', sellerId),
                        where('title', '==', nft.title),
                        where('forSale', '==', true)
                    );
                    const snap2 = await getDocs(q2);
                    for (const d of snap2.docs) await deleteDoc(d.ref);
                }

                // ── 7. Сповіщення продавцю ──
                await notifySale(
                    sellerId, nft.title, nftPrice, nftCurrency,
                    currentUser.name || 'Someone'
                );
            }

            // ── 8. Сповіщення покупцю ──
            await notifyPurchase(currentUser.uid, nft.title, nftPrice, nftCurrency);

            onSuccess?.(purchasedNFT);
            onClose();
            alert(`✅ You bought "${nft.title}" for ${nftPrice} ${nftCurrency}!`);
        } catch (err: any) {
            console.error('Buy error:', err);
            alert(`❌ Error: ${err.message}`);
        } finally {
            setBuying(false);
        }
    };

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.sheet} onClick={e => e.stopPropagation()}>
                <div style={s.handle} />

                <div style={s.header}>
                    <h2 style={s.title}>Purchase NFT</h2>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Прев'ю NFT */}
                <div style={s.nftRow}>
                    <img
                        src={nft.nftImage || nft.image || '/img/default-nft.png'}
                        alt={nft.title}
                        style={s.nftImg}
                        onError={e => { e.currentTarget.src = '/img/default-nft.png'; }}
                    />
                    <div style={s.nftInfo}>
                        <div style={s.nftTitle}>{nft.title}</div>
                        <div style={s.nftAuthor}>by {nft.ownerName || nft.userName || 'Unknown'}</div>
                        <div style={s.nftPrice}>{nftPrice} {nftCurrency}</div>
                        {isDemo && <div style={s.demoBadge}>Demo NFT</div>}
                    </div>
                </div>

                {loading ? (
                    <div style={s.center}>
                        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                        <div style={s.spinner} />
                    </div>
                ) : wallets.length === 0 ? (
                    <div style={s.errorBox}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>💼</div>
                        <strong>No {nftCurrency} wallet connected</strong>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                            Go to Profile → Crypto Wallets to connect one
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Вибір гаманця */}
                        <label style={s.label}>Pay with:</label>
                        <div style={s.walletList}>
                            {wallets.map(w => (
                                <div
                                    key={w.id}
                                    style={{
                                        ...s.walletCard,
                                        borderColor: selectedWalletId === w.id ? '#01ff77' : '#e0e0e0',
                                        background:  selectedWalletId === w.id ? '#f0fff4' : 'white',
                                    }}
                                    onClick={() => setSelectedWalletId(w.id)}
                                >
                                    <span style={{ fontSize: '22px' }}>{WALLET_ICONS[w.type] || '💼'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={s.walletName}>{w.type}</div>
                                        <div style={s.walletBal}>{w.balance.toFixed(4)} {w.currency}</div>
                                    </div>
                                    {selectedWalletId === w.id && (
                                        <span style={{ color: '#01ff77', fontWeight: 'bold' }}>✓</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Статус балансу */}
                        {selectedWallet && (
                            <div style={hasFunds ? s.okBox : s.warnBox}>
                                {hasFunds
                                    ? `✅ Balance OK: ${selectedWallet.balance.toFixed(4)} ${nftCurrency}`
                                    : `❌ Need ${total.toFixed(4)}, have ${selectedWallet.balance.toFixed(4)} ${nftCurrency}`
                                }
                            </div>
                        )}

                        {/* Підсумок — БЕЗ відсотків для продавця */}
                        <div style={s.summary}>
                            <div style={s.row}>
                                <span style={{ color: '#888' }}>NFT price</span>
                                <span style={{ color: '#888' }}>{nftPrice} {nftCurrency}</span>
                            </div>
                            <div style={s.row}>
                                <span style={{ color: '#888' }}>Platform fee (1%)</span>
                                <span style={{ color: '#888' }}>+{fee.toFixed(4)} {nftCurrency}</span>
                            </div>
                            <div style={{ ...s.row, borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '4px' }}>
                                <strong>Total</strong>
                                <strong style={{ color: '#01ff77', fontSize: '16px' }}>
                                    {total.toFixed(4)} {nftCurrency}
                                </strong>
                            </div>
                        </div>

                        <div style={s.actions}>
                            <button style={s.cancelBtn} onClick={onClose} disabled={buying}>
                                Cancel
                            </button>
                            <button
                                style={{ ...s.buyBtn, opacity: (!hasFunds || buying) ? 0.5 : 1 }}
                                onClick={handleBuy}
                                disabled={!hasFunds || buying}
                            >
                                {buying ? '⏳ Processing...' : `🛒 Buy ${nftPrice} ${nftCurrency}`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const s: any = {
    overlay:    { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 5000 },
    sheet:      { background: 'white', borderRadius: '24px 24px 0 0', padding: '16px 20px 36px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' },
    handle:     { width: '40px', height: '4px', background: '#ddd', borderRadius: '2px', margin: '0 auto 16px' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
    title:      { fontSize: '20px', fontWeight: 'bold', color: '#222', margin: 0 },
    closeBtn:   { background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontSize: '15px' },
    nftRow:     { display: 'flex', gap: '14px', background: '#f8f8f8', borderRadius: '14px', padding: '14px', marginBottom: '20px' },
    nftImg:     { width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 },
    nftInfo:    { flex: 1 },
    nftTitle:   { fontWeight: 'bold', fontSize: '15px', color: '#222', marginBottom: '3px' },
    nftAuthor:  { fontSize: '12px', color: '#888', marginBottom: '4px' },
    nftPrice:   { fontWeight: 'bold', color: '#01ff77', fontSize: '20px' },
    demoBadge:  { fontSize: '10px', background: '#eee', color: '#888', borderRadius: '8px', padding: '2px 6px', display: 'inline-block', marginTop: '4px' },
    center:     { textAlign: 'center', padding: '30px' },
    spinner:    { width: '32px', height: '32px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
    label:      { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '8px' },
    walletList: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' },
    walletCard: { display: 'flex', alignItems: 'center', gap: '12px', border: '2px solid', borderRadius: '12px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s' },
    walletName: { fontWeight: '600', fontSize: '14px', color: '#222', textTransform: 'capitalize' },
    walletBal:  { fontSize: '12px', color: '#888' },
    okBox:      { background: '#f0fff4', border: '1px solid #b2f0c8', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#00aa44', marginBottom: '14px' },
    warnBox:    { background: '#fff5f5', border: '1px solid #ffc0c0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#cc2222', marginBottom: '14px' },
    errorBox:   { textAlign: 'center', background: '#fff5f5', border: '1px solid #ffc0c0', borderRadius: '12px', padding: '24px', color: '#cc2222', marginBottom: '20px' },
    summary:    { background: '#f8f8f8', borderRadius: '12px', padding: '14px', marginBottom: '20px' },
    row:        { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' },
    actions:    { display: 'flex', gap: '10px' },
    cancelBtn:  { flex: 1, padding: '14px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', fontSize: '15px', cursor: 'pointer' },
    buyBtn:     { flex: 2, padding: '14px', background: '#01ff77', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', transition: 'opacity 0.2s', cursor: 'pointer' },
};

export default BuyModal;