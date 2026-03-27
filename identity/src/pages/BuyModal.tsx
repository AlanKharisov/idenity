import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { apiGetCryptoWallets, apiTransferNFT, apiCashOnDelivery } from '../services/apiClient';

interface BuyModalProps {
    nft: any;
    onClose: () => void;
    onSuccess?: (boughtNft: any) => void;
}

const PLATFORM_FEE = 0.01; // 1%

type PaymentMethod = 'crypto' | 'cod';

const BuyModal: React.FC<BuyModalProps> = ({ nft, onClose, onSuccess }) => {
    const { currentUser } = useAuth();
    const [wallets, setWallets]                     = useState<any[]>([]);
    const [selectedWalletId, setSelectedWalletId]   = useState('');
    const [loading, setLoading]                     = useState(true);
    const [buying, setBuying]                       = useState(false);
    const [paymentMethod, setPaymentMethod]         = useState<PaymentMethod>('crypto');
    const [fiatCurrency, setFiatCurrency]           = useState<'UAH' | 'USD' | 'SOL'>('UAH');
    const [deliveryAddress, setDeliveryAddress]     = useState('');

    const nftCurrency = (nft.currency || 'SOL') as string;
    const nftPrice    = Number(nft.price) || 0;
    const fee         = nftPrice * PLATFORM_FEE;
    const total       = nftPrice + fee;

    useEffect(() => {
        (async () => {
            if (!currentUser) { setLoading(false); return; }
            try {
                const all = await apiGetCryptoWallets();
                setWallets(all || []);
                if (all?.length > 0) setSelectedWalletId(all[0].id);
            } catch (e) {
                console.error('Failed to load wallets:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [currentUser]);

    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const hasFunds       = selectedWallet ? (selectedWallet.balance || 0) >= total : false;

    const handleBuyCrypto = async () => {
        if (!currentUser || !selectedWalletId || !selectedWallet) return;

        // The seller's Phantom address must be present on the post object.
        // Ensure your backend populates `sellerAddress` when returning posts
        // (add it to the Post model and set it from the seller's crypto wallet
        // when a listing is created).
        const sellerAddress: string | undefined = (nft as any).sellerAddress;
        if (!sellerAddress) {
            alert('❌ Seller wallet address is unavailable — cannot execute on-chain transfer.');
            return;
        }

        setBuying(true);
        try {
            // ── Step 1: On-chain SOL transfer via Phantom ──────────────────────
            const phantom = (window as any).phantom?.solana ?? (window as any).solana;
            if (!phantom?.isPhantom) throw new Error('Phantom wallet not found. Please install the Phantom extension.');

            const rpcUrl = (import.meta as any).env?.VITE_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
            const connection = new Connection(rpcUrl, 'confirmed');

            const lamports = Math.round(total * LAMPORTS_PER_SOL);
            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(selectedWallet.address),
                    toPubkey:   new PublicKey(sellerAddress),
                    lamports,
                })
            );
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = new PublicKey(selectedWallet.address);

            const { signature } = await phantom.signAndSendTransaction(tx);
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

            // ── Step 2: Sync off-chain Firestore state ─────────────────────────
            const walletNftId = nft.walletNftId || nft.id;
            const sellerId    = nft.userId;   // seller's Firebase UID
            const postId      = nft.id;       // marketplace post document ID

            await apiTransferNFT(walletNftId, sellerId, postId);

            // ── Step 3: Update local UI ────────────────────────────────────────
            onSuccess?.({ ...nft, forSale: false, ownerId: currentUser.uid, ownerName: currentUser.email });
            onClose();
            alert(`✅ You bought "${nft.title}" for ${nftPrice} ${nftCurrency}!`);
        } catch (err: any) {
            console.error('Buy error:', err);
            alert(`❌ Error: ${err.message}`);
        } finally {
            setBuying(false);
        }
    };

    const handleCashOnDelivery = async () => {
        if (!currentUser) return;
        if (!deliveryAddress.trim()) {
            alert('Please enter your Nova Poshta delivery address.');
            return;
        }
        setBuying(true);
        try {
            await apiCashOnDelivery({
                postId:          nft.id,
                nftId:           nft.walletNftId || nft.id,
                deliveryAddress: deliveryAddress.trim(),
                currency:        fiatCurrency,
            });
            onSuccess?.(nft);
            onClose();
            alert(`✅ Order placed! The seller will ship "${nft.title}" to your Nova Poshta address.`);
        } catch (err: any) {
            console.error('COD error:', err);
            alert(`❌ Error: ${err.message}`);
        } finally {
            setBuying(false);
        }
    };

    return (
        <div style={s.overlay} onClick={onClose}>
            <style>{`
                @media(min-width:600px){
                    .buy-modal-sheet{border-radius:16px!important;align-self:center!important;margin:auto!important;}
                }
                @media(max-width:380px){
                    .buy-method-tab{font-size:11px!important;padding:8px 6px!important;}
                }
            `}</style>
            <div style={s.sheet} onClick={e => e.stopPropagation()}>
                <div style={s.handle} />

                <div style={s.header}>
                    <h2 style={s.title}>Purchase NFT</h2>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* NFT preview */}
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
                    </div>
                </div>

                {/* Payment method tabs */}
                <div style={s.methodTabs}>
                    <button
                        style={{ ...s.methodTab, background: paymentMethod === 'crypto' ? '#01ff77' : '#f0f0f0', color: paymentMethod === 'crypto' ? 'black' : '#666' }}
                        onClick={() => setPaymentMethod('crypto')}
                    >
                        👻 Crypto (SOL)
                    </button>
                    <button
                        style={{ ...s.methodTab, background: paymentMethod === 'cod' ? '#01ff77' : '#f0f0f0', color: paymentMethod === 'cod' ? 'black' : '#666' }}
                        onClick={() => setPaymentMethod('cod')}
                    >
                        🚚 Pay on Delivery
                    </button>
                </div>

                {/* Nova Poshta delivery address — shown for both methods */}
                <div style={{ marginBottom: '14px' }}>
                    <label style={s.label}>🚚 Nova Poshta Delivery Address {paymentMethod === 'cod' ? '*' : '(optional)'}</label>
                    <input
                        style={s.addrInput}
                        placeholder="e.g. Nova Poshta #42, Kyiv, Ukraine"
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                    />
                </div>

                {/* ── CRYPTO FLOW ─────────────────────────────────────── */}
                {paymentMethod === 'crypto' && (
                    loading ? (
                        <div style={s.center}>
                            <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                            <div style={s.spinner} />
                        </div>
                    ) : wallets.length === 0 ? (
                        <div style={s.errorBox}>
                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👻</div>
                            <strong>No Phantom wallet connected</strong>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                Go to Profile → Crypto Wallets to connect one
                            </div>
                        </div>
                    ) : (
                        <>
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
                                        <span style={{ fontSize: '22px' }}>👻</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={s.walletName}>Phantom {w.label ? `· ${w.label}` : ''}</div>
                                            <div style={s.walletAddr}>{w.address?.slice(0, 6)}...{w.address?.slice(-6)}</div>
                                            <div style={s.walletBal}>{(w.balance || 0).toFixed(4)} {w.currency || 'SOL'}</div>
                                        </div>
                                        {selectedWalletId === w.id && (
                                            <span style={{ color: '#01ff77', fontWeight: 'bold' }}>✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {selectedWallet && (
                                <div style={hasFunds ? s.okBox : s.warnBox}>
                                    {hasFunds
                                        ? `✅ Balance OK: ${(selectedWallet.balance || 0).toFixed(4)} ${selectedWallet.currency || 'SOL'}`
                                        : `❌ Need ${total.toFixed(4)} ${nftCurrency}, have ${(selectedWallet.balance || 0).toFixed(4)} ${selectedWallet.currency || 'SOL'}`
                                    }
                                </div>
                            )}

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
                                    <strong style={{ color: '#01ff77', fontSize: '16px' }}>{total.toFixed(4)} {nftCurrency}</strong>
                                </div>
                            </div>

                            <div style={s.actions}>
                                <button style={s.cancelBtn} onClick={onClose} disabled={buying}>Cancel</button>
                                <button
                                    style={{ ...s.buyBtn, opacity: (!selectedWalletId || buying) ? 0.5 : 1 }}
                                    onClick={handleBuyCrypto}
                                    disabled={!selectedWalletId || buying}
                                >
                                    {buying ? '⏳ Processing...' : `👻 Buy now with Crypto`}
                                </button>
                            </div>
                        </>
                    )
                )}

                {/* ── CASH ON DELIVERY FLOW ───────────────────────────── */}
                {paymentMethod === 'cod' && (
                    <>
                        {/* Fiat currency selector */}
                        <div style={{ marginBottom: '14px' }}>
                            <label style={s.label}>Payment currency:</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(['UAH', 'USD', 'SOL'] as const).map(c => (
                                    <button
                                        key={c}
                                        style={{ ...s.currencyChip, background: fiatCurrency === c ? '#01ff77' : '#f0f0f0', color: fiatCurrency === c ? 'black' : '#555', fontWeight: fiatCurrency === c ? 'bold' : 'normal' }}
                                        onClick={() => setFiatCurrency(c)}
                                    >
                                        {c === 'UAH' ? '₴ UAH' : c === 'USD' ? '$ USD' : '◎ SOL'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={s.codInfoBox}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#333', marginBottom: '6px' }}>📦 Cash on Delivery via Nova Poshta</div>
                            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                                Your order will be placed and the seller will be notified. Pay upon receiving your package at the Nova Poshta branch.
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '13px', color: '#888' }}>
                                Price: <strong style={{ color: '#222' }}>{nftPrice} {nftCurrency}</strong>
                                <span style={{ margin: '0 6px', color: '#ccc' }}>→</span>
                                Pay in: <strong style={{ color: '#01ff77' }}>{fiatCurrency}</strong>
                            </div>
                        </div>

                        <div style={s.actions}>
                            <button style={s.cancelBtn} onClick={onClose} disabled={buying}>Cancel</button>
                            <button
                                style={{ ...s.codBtn, opacity: buying ? 0.5 : 1 }}
                                onClick={handleCashOnDelivery}
                                disabled={buying}
                            >
                                {buying ? '⏳ Placing order...' : '🚚 Pay on Delivery'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const s: any = {
    overlay:     { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 5000 },
    sheet:       { background: 'white', borderRadius: '24px 24px 0 0', padding: '16px 20px 36px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' },
    handle:      { width: '40px', height: '4px', background: '#ddd', borderRadius: '2px', margin: '0 auto 16px' },
    header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
    title:       { fontSize: '20px', fontWeight: 'bold', color: '#222', margin: 0 },
    closeBtn:    { background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontSize: '15px' },
    nftRow:      { display: 'flex', gap: '14px', background: '#f8f8f8', borderRadius: '14px', padding: '14px', marginBottom: '16px' },
    nftImg:      { width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 },
    nftInfo:     { flex: 1 },
    nftTitle:    { fontWeight: 'bold', fontSize: '15px', color: '#222', marginBottom: '3px' },
    nftAuthor:   { fontSize: '12px', color: '#888', marginBottom: '4px' },
    nftPrice:    { fontWeight: 'bold', color: '#01ff77', fontSize: '20px' },
    methodTabs:  { display: 'flex', gap: '8px', marginBottom: '16px' },
    methodTab:   { flex: 1, padding: '10px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s' },
    label:       { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' },
    addrInput:   { width: '100%', padding: '11px 14px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '14px', background: '#fafafa', outline: 'none', boxSizing: 'border-box' },
    center:      { textAlign: 'center', padding: '30px' },
    spinner:     { width: '32px', height: '32px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
    walletList:  { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' },
    walletCard:  { display: 'flex', alignItems: 'center', gap: '12px', border: '2px solid', borderRadius: '12px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s' },
    walletName:  { fontWeight: '600', fontSize: '14px', color: '#222' },
    walletAddr:  { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' },
    walletBal:   { fontSize: '12px', color: '#888' },
    okBox:       { background: '#f0fff4', border: '1px solid #b2f0c8', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#00aa44', marginBottom: '14px' },
    warnBox:     { background: '#fff5f5', border: '1px solid #ffc0c0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#cc2222', marginBottom: '14px' },
    errorBox:    { textAlign: 'center', background: '#fff5f5', border: '1px solid #ffc0c0', borderRadius: '12px', padding: '24px', color: '#cc2222', marginBottom: '20px' },
    summary:     { background: '#f8f8f8', borderRadius: '12px', padding: '14px', marginBottom: '20px' },
    row:         { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' },
    actions:     { display: 'flex', gap: '10px' },
    cancelBtn:   { flex: 1, padding: '14px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', fontSize: '15px', cursor: 'pointer' },
    buyBtn:      { flex: 2, padding: '14px', background: '#01ff77', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', transition: 'opacity 0.2s', cursor: 'pointer' },
    codBtn:      { flex: 2, padding: '14px', background: '#ff6b35', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', transition: 'opacity 0.2s', cursor: 'pointer' },
    currencyChip:{ padding: '8px 20px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' },
    codInfoBox:  { background: '#fff8f0', border: '1px solid #ffd8b0', borderRadius: '12px', padding: '14px', marginBottom: '20px' },
};

export default BuyModal;
