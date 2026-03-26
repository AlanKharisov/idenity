import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    apiGetCryptoWallets,
    apiAddCryptoWallet,
    apiRemoveCryptoWallet,
    apiRefreshWalletBalance,
} from '../services/apiClient';

interface CryptoWalletsPageProps {
    onBack: () => void;
}

const CryptoWalletsPage: React.FC<CryptoWalletsPageProps> = ({ onBack }) => {
    const { currentUser }                   = useAuth();
    const [wallets, setWallets]             = useState<any[]>([]);
    const [loading, setLoading]             = useState(true);
    const [showAddForm, setShowAddForm]     = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [walletLabel, setWalletLabel]     = useState('');
    const [refreshing, setRefreshing]       = useState<string | null>(null);
    const [validationError, setValidError]  = useState('');

    useEffect(() => { loadWallets(); }, [currentUser]); // eslint-disable-line

    const loadWallets = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await apiGetCryptoWallets();
            setWallets(data || []);
        } catch (e) {
            console.error('Error loading wallets:', e);
        } finally {
            setLoading(false);
        }
    };

    // Phantom (Solana) address: base58, 32–44 chars, no 0x prefix
    const validatePhantomAddress = (addr: string): boolean =>
        /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());

    const connectWallet = async () => {
        if (!currentUser)  { alert('Please login first'); return; }
        if (!walletAddress){ alert('Please enter your Phantom wallet address'); return; }
        setValidError('');

        if (!validatePhantomAddress(walletAddress)) {
            if (!window.confirm('Address format looks unusual. Connect anyway?')) return;
        }

        try {
            await apiAddCryptoWallet({
                address: walletAddress.trim(),
                ...(walletLabel.trim() ? { label: walletLabel.trim() } : {}),
            });
            await loadWallets();
            setShowAddForm(false);
            setWalletAddress('');
            setWalletLabel('');
            alert('✅ Phantom wallet connected!');
        } catch (e: any) {
            alert(`❌ Error: ${e.message}`);
        }
    };

    const handleRemoveWallet = async (id: string) => {
        if (!window.confirm('Disconnect this wallet?')) return;
        try {
            await apiRemoveCryptoWallet(id);
            setWallets(prev => prev.filter(w => w.id !== id));
            alert('✅ Wallet disconnected');
        } catch (e: any) {
            alert(`❌ Error: ${e.message}`);
        }
    };

    const handleRefreshBalance = async (wallet: any) => {
        setRefreshing(wallet.id);
        try {
            await apiRefreshWalletBalance(wallet.id);
            await loadWallets();
        } catch (e) {
            console.error('Refresh balance error:', e);
        } finally {
            setRefreshing(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
                <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                <div style={{ width: '50px', height: '50px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f5f5f5', zIndex: 2000, overflowY: 'auto', padding: '20px' }}>
            <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#01ff77', padding: '10px' }}>
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>Crypto Wallets</h2>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                {/* Phantom branding banner */}
                <div style={{ background: 'linear-gradient(135deg,#ab9ff2,#7c5bdc)', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '36px' }}>👻</span>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Phantom Wallet (Solana)</div>
                        <div style={{ fontSize: '13px', opacity: 0.85 }}>Only Phantom/Solana wallets are supported</div>
                    </div>
                </div>

                {/* Connected wallets */}
                <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Connected Wallets</h3>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            style={{ background: '#01ff77', border: 'none', borderRadius: '8px', padding: '8px 15px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <i className="fas fa-plus"></i> Add Wallet
                        </button>
                    </div>

                    {wallets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <span style={{ fontSize: '50px' }}>👻</span>
                            <p style={{ fontSize: '16px', color: '#666', marginTop: '12px' }}>No wallets connected</p>
                            <p style={{ fontSize: '14px', color: '#999' }}>Connect your Phantom wallet to start trading</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {wallets.map((wallet: any) => (
                                <div key={wallet.id} style={{ border: '1px solid #eee', borderRadius: '12px', padding: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '24px', marginRight: '12px' }}>👻</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                Phantom
                                                {wallet.label && (
                                                    <span style={{ color: '#01ff77', fontSize: '12px', background: '#f0fff0', padding: '2px 8px', borderRadius: '12px' }}>
                                                        {wallet.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                                                {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-8)}
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveWallet(wallet.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '16px' }}>
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Balance</div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#01ff77' }}>
                                                {(wallet.balance || 0).toFixed(4)} {wallet.currency || 'SOL'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#666', background: '#f0f0f0', padding: '4px 8px', borderRadius: '12px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: wallet.isConnected ? '#4caf50' : '#ff4444', display: 'inline-block' }}></span>
                                                solana
                                            </div>
                                            <button
                                                onClick={() => handleRefreshBalance(wallet)}
                                                disabled={refreshing === wallet.id}
                                                style={{ background: 'none', border: 'none', color: '#01ff77', cursor: 'pointer', padding: '5px' }}
                                            >
                                                <i className={`fas fa-sync-alt ${refreshing === wallet.id ? 'fa-spin' : ''}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
                                        Connected: {new Date(wallet.connectedAt || Date.now()).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add form */}
                {showAddForm && (
                    <div style={{ ...card, border: '2px solid #01ff77' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Connect Phantom Wallet</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Phantom Wallet Address</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="Solana address (32–44 base58 characters)"
                                value={walletAddress}
                                onChange={e => { setWalletAddress(e.target.value); setValidError(''); }}
                            />
                            {validationError && (
                                <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px', padding: '5px', background: '#ffeeee', borderRadius: '4px' }}>
                                    {validationError}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Label (optional)</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. My Trading Wallet"
                                value={walletLabel}
                                onChange={e => setWalletLabel(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => { setShowAddForm(false); setValidError(''); }}
                                    style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={connectWallet}
                                    style={{ flex: 1, padding: '12px', background: '#01ff77', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Connect
                            </button>
                        </div>
                    </div>
                )}

                {/* Info */}
                <div style={{ background: '#e3f2fd', borderRadius: '12px', padding: '15px', display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <i className="fas fa-info-circle" style={{ fontSize: '24px', color: '#2196f3' }}></i>
                    <div style={{ fontSize: '14px', color: '#333' }}>
                        <strong>ℹ️ About Phantom Wallet:</strong>
                        <ul style={{ marginTop: '5px', marginBottom: '5px', paddingLeft: '16px' }}>
                            <li>Only Solana/Phantom wallets are supported</li>
                            <li>Use Phantom browser extension to get your address</li>
                            <li>Balance is fetched from the Solana network</li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
};

const card:       React.CSSProperties = { background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '5px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };

export default CryptoWalletsPage;
