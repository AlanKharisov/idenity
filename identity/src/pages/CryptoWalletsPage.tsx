import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getCryptoWallets,
    addCryptoWallet,
    removeCryptoWallet,
    updateCryptoBalance
} from '../firebase/wallet';

type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'phantom';
type NetworkType = 'ethereum' | 'polygon' | 'solana' | 'icp';

interface CryptoWallet {
    id: string;
    type: WalletType;
    address: string;
    chainId: number;
    network: NetworkType;
    balance: number;
    currency: string;
    isConnected: boolean;
    connectedAt: string;
    lastUsed: string;
    label?: string;
}

interface CryptoWalletsPageProps {
    onBack: () => void;
}

const CryptoWalletsPage: React.FC<CryptoWalletsPageProps> = ({ onBack }) => {
    const { currentUser } = useAuth();
    const [wallets, setWallets] = useState<CryptoWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedType, setSelectedType] = useState<WalletType>('metamask');
    const [walletAddress, setWalletAddress] = useState('');
    const [walletLabel, setWalletLabel] = useState('');
    const [refreshing, setRefreshing] = useState<string | null>(null);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        loadWallets();
    }, [currentUser]);

    const loadWallets = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const userWallets = await getCryptoWallets(currentUser.uid);
            setWallets(userWallets);
        } catch (error) {
            console.error('Error loading wallets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Функція валідації адреси
    const validateAddress = (address: string, type: WalletType): boolean => {
        const trimmedAddress = address.trim();

        switch (type) {
            case 'metamask':
            case 'walletconnect':
            case 'coinbase':
                return /^0x[a-fA-F0-9]{40}$/.test(trimmedAddress);

            case 'phantom':
                return /^[1-9A-HJ-NP-Za-km-z]{32,100}$/.test(trimmedAddress) && !trimmedAddress.startsWith('0x');

            default:
                return false;
        }
    };

    const connectWallet = async () => {
        if (!currentUser) {
            alert('Please login first');
            return;
        }

        if (!walletAddress) {
            alert('Please enter wallet address');
            return;
        }

        setValidationError('');

        // Валідація адреси
        if (!validateAddress(walletAddress, selectedType)) {
            if (selectedType === 'phantom') {
                if (!window.confirm('This address format is unusual. Try connecting anyway?')) {
                    return;
                }
            } else {
                setValidationError('Invalid wallet address format');
                return;
            }
        }

        // Створюємо об'єкт гаманця - ВИПРАВЛЕНО!
        const walletData = {
            type: selectedType,
            address: walletAddress.trim(),
            chainId: getChainId(selectedType),
            network: getNetwork(selectedType),
            balance: 0, // Початковий баланс 0
            currency: getCurrency(selectedType),
            isConnected: true,
        };

        // Додаємо label тільки якщо він є (ОБ'ЄДНУЄМО В ОДИН ОБ'ЄКТ)
        const newWallet = {
            ...walletData,
            ...(walletLabel && walletLabel.trim() !== '' ? { label: walletLabel.trim() } : {})
        };

        console.log('Adding wallet:', newWallet);

        try {
            const result = await addCryptoWallet(currentUser.uid, newWallet);

            if (result.success) {
                await loadWallets();
                setShowAddForm(false);
                setWalletAddress('');
                setWalletLabel('');
                setValidationError('');
                alert('✅ Wallet connected and saved!');
            } else {
                console.error('Add wallet error:', result.error);
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error: any) {
            console.error('Error in connectWallet:', error);
            alert(`❌ Error: ${error.message}`);
        }
    };

    const handleRemoveWallet = async (walletId: string) => {
        if (!currentUser) return;

        if (window.confirm('Are you sure you want to disconnect this wallet?')) {
            const result = await removeCryptoWallet(currentUser.uid, walletId);
            if (result.success) {
                await loadWallets();
                alert('✅ Wallet disconnected');
            }
        }
    };

    const handleRefreshBalance = async (wallet: CryptoWallet) => {
        setRefreshing(wallet.id);

        // Симуляція отримання балансу
        setTimeout(async () => {
            const mockBalance = Math.random() * 5;
            await updateCryptoBalance(currentUser!.uid, wallet.id, mockBalance);
            await loadWallets();
            setRefreshing(null);
        }, 1500);
    };

    const getChainId = (type: WalletType): number => {
        switch (type) {
            case 'metamask': return 1;
            case 'walletconnect': return 1;
            case 'coinbase': return 1;
            case 'phantom': return 0;
            default: return 1;
        }
    };

    const getNetwork = (type: WalletType): NetworkType => {
        switch (type) {
            case 'metamask': return 'ethereum';
            case 'walletconnect': return 'ethereum';
            case 'coinbase': return 'ethereum';
            case 'phantom': return 'solana';
            default: return 'ethereum';
        }
    };

    const getCurrency = (type: WalletType): string => {
        switch (type) {
            case 'metamask': return 'ETH';
            case 'walletconnect': return 'ETH';
            case 'coinbase': return 'ETH';
            case 'phantom': return 'SOL';
            default: return 'ETH';
        }
    };

    const getWalletIcon = (type: WalletType): string => {
        switch (type) {
            case 'metamask': return '🦊';
            case 'walletconnect': return '🔗';
            case 'coinbase': return '📦';
            case 'phantom': return '👻';
            default: return '💼';
        }
    };

    const getPlaceholder = (type: WalletType): string => {
        switch (type) {
            case 'metamask':
            case 'walletconnect':
            case 'coinbase':
                return '0x... (42 characters)';
            case 'phantom':
                return 'Solana address (32-100 characters)';
            default:
                return 'Enter wallet address';
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f5f5f5'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '3px solid #ddd',
                    borderTop: '3px solid #01ff77',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#f5f5f5',
            zIndex: 2000,
            overflowY: 'auto',
            padding: '20px'
        }}>
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
                gap: '15px'
            }}>
                <button onClick={onBack} style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#01ff77',
                    padding: '10px'
                }}>
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#333',
                    margin: 0
                }}>Crypto Wallets</h2>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Підключені гаманці */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#333',
                            margin: 0
                        }}>Connected Wallets</h3>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            style={{
                                background: '#01ff77',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 15px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <i className="fas fa-plus"></i> Add Wallet
                        </button>
                    </div>

                    {wallets.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px'
                        }}>
                            <i className="fas fa-wallet" style={{
                                fontSize: '50px',
                                color: '#ccc',
                                marginBottom: '15px'
                            }}></i>
                            <p style={{
                                fontSize: '16px',
                                color: '#666',
                                marginBottom: '5px'
                            }}>No wallets connected</p>
                            <p style={{
                                fontSize: '14px',
                                color: '#999'
                            }}>Connect a wallet to start trading</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px'
                        }}>
                            {wallets.map(wallet => (
                                <div
                                    key={wallet.id}
                                    style={{
                                        border: '1px solid #eee',
                                        borderRadius: '12px',
                                        padding: '15px',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: '12px'
                                    }}>
                    <span style={{
                        fontSize: '24px',
                        marginRight: '12px'
                    }}>{getWalletIcon(wallet.type)}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontWeight: 'bold',
                                                color: '#333',
                                                marginBottom: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                {wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)}
                                                {wallet.label && (
                                                    <span style={{
                                                        color: '#01ff77',
                                                        fontSize: '12px',
                                                        background: '#f0fff0',
                                                        padding: '2px 6px',
                                                        borderRadius: '12px'
                                                    }}>
                            {wallet.label}
                          </span>
                                                )}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#666',
                                                fontFamily: 'monospace',
                                                wordBreak: 'break-all'
                                            }}>
                                                {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveWallet(wallet.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ff4444',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: '5px'
                                            }}
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#888',
                                                marginBottom: '2px'
                                            }}>Balance</div>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                                color: '#01ff77'
                                            }}>
                                                {wallet.balance.toFixed(4)} {wallet.currency}
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                fontSize: '12px',
                                                color: '#666',
                                                background: '#f0f0f0',
                                                padding: '4px 8px',
                                                borderRadius: '12px'
                                            }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: wallet.isConnected ? '#4caf50' : '#ff4444'
                        }}></span>
                                                {wallet.network}
                                            </div>
                                            <button
                                                onClick={() => handleRefreshBalance(wallet)}
                                                disabled={refreshing === wallet.id}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#01ff77',
                                                    cursor: 'pointer',
                                                    padding: '5px'
                                                }}
                                            >
                                                <i className={`fas fa-sync-alt ${refreshing === wallet.id ? 'fa-spin' : ''}`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{
                                        fontSize: '10px',
                                        color: '#999',
                                        marginTop: '8px'
                                    }}>
                                        <small>Connected: {new Date(wallet.connectedAt || Date.now()).toLocaleDateString()}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Форма додавання */}
                {showAddForm && (
                    <div style={{
                        background: 'white',
                        borderRadius: '15px',
                        padding: '20px',
                        marginTop: '15px',
                        border: '2px solid #01ff77'
                    }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#333',
                            marginBottom: '15px'
                        }}>Connect New Wallet</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                marginBottom: '5px'
                            }}>Wallet Type</label>
                            <select
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    background: 'white'
                                }}
                                value={selectedType}
                                onChange={(e) => {
                                    setSelectedType(e.target.value as WalletType);
                                    setValidationError('');
                                }}
                            >
                                <option value="metamask">🦊 MetaMask (Ethereum)</option>
                                <option value="walletconnect">🔗 WalletConnect (Ethereum)</option>
                                <option value="coinbase">📦 Coinbase Wallet (Ethereum)</option>
                                <option value="phantom">👻 Phantom (Solana)</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                marginBottom: '5px'
                            }}>Wallet Address</label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                                placeholder={getPlaceholder(selectedType)}
                                value={walletAddress}
                                onChange={(e) => {
                                    setWalletAddress(e.target.value);
                                    setValidationError('');
                                }}
                            />
                            {validationError && (
                                <div style={{
                                    color: '#ff4444',
                                    fontSize: '12px',
                                    marginTop: '5px',
                                    padding: '5px',
                                    background: '#ffeeee',
                                    borderRadius: '4px'
                                }}>
                                    {validationError}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                marginBottom: '5px'
                            }}>Label (optional)</label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                                placeholder="e.g., My Trading Wallet"
                                value={walletLabel}
                                onChange={(e) => setWalletLabel(e.target.value)}
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            marginTop: '20px'
                        }}>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setValidationError('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={connectWallet}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#01ff77',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Connect Wallet
                            </button>
                        </div>
                    </div>
                )}

                {/* Інформація */}
                <div style={{
                    background: '#e3f2fd',
                    borderRadius: '12px',
                    padding: '15px',
                    display: 'flex',
                    gap: '15px',
                    marginTop: '20px'
                }}>
                    <i className="fas fa-info-circle" style={{
                        fontSize: '24px',
                        color: '#2196f3'
                    }}></i>
                    <div style={{
                        flex: 1,
                        fontSize: '14px',
                        color: '#333'
                    }}>
                        <strong>ℹ️ About Crypto Wallets:</strong>
                        <ul style={{
                            marginTop: '5px',
                            marginBottom: '5px',
                            paddingLeft: '20px'
                        }}>
                            <li>• Connected wallets are saved in Firebase</li>
                            <li>• Balance starts at 0 (demo mode)</li>
                            <li>• Use "Refresh" to simulate balance update</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CryptoWalletsPage;