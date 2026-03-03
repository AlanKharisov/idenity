import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface WalletData {
    address: string;
    email: string;
    password: string;
    recoveryPhrase: string;
    balance: {
        ICP: number;
        POLYGON: number;
        SOLANA: number;
    };
    nfts: any[];
    createdAt: string;
}

interface WalletSettingsPageProps {
    onBack: () => void;
}

const WalletSettingsPage: React.FC<WalletSettingsPageProps> = ({ onBack }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [wallet, setWallet] = useState<WalletData | null>(null);

    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [recoveryPhrase, setRecoveryPhrase] = useState('');
    const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
    const [showCreateWallet, setShowCreateWallet] = useState(false);
    const [fingerprintEnabled, setFingerprintEnabled] = useState(false);

    useEffect(() => {
        loadWallet();
    }, [currentUser]);

    const loadWallet = async () => {
        if (!currentUser) return;

        try {
            console.log('Loading wallet for user:', currentUser.uid);
            const walletRef = doc(db, 'wallets', currentUser.uid);
            const walletDoc = await getDoc(walletRef);

            if (walletDoc.exists()) {
                const walletData = walletDoc.data() as WalletData;
                console.log('Wallet loaded:', walletData);
                setWallet(walletData);
                setEmail(walletData.email || '');
                setRecoveryPhrase(walletData.recoveryPhrase || '');
            } else {
                console.log('No wallet found, showing create form');
                setShowCreateWallet(true);
            }
        } catch (error: any) {
            console.error('Error loading wallet:', error);
            if (error.code === 'permission-denied') {
                alert('⚠️ Firebase permission error. Please check your database rules.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentUser || !wallet) return;

        if (currentPassword !== wallet.password) {
            alert('Current password is incorrect');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        setSaving(true);
        try {
            const walletRef = doc(db, 'wallets', currentUser.uid);
            await updateDoc(walletRef, { password: newPassword });
            setWallet({ ...wallet, password: newPassword });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            alert('✅ Password changed successfully!');
        } catch (error) {
            console.error('Error changing password:', error);
            alert('❌ Error changing password');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!currentUser || !wallet) return;

        setSaving(true);
        try {
            const walletRef = doc(db, 'wallets', currentUser.uid);
            await updateDoc(walletRef, { email });
            setWallet({ ...wallet, email });
            alert('✅ Email updated successfully!');
        } catch (error) {
            console.error('Error updating email:', error);
            alert('❌ Error updating email');
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('📋 Copied to clipboard!');
    };

    // Функція для безпечного обчислення балансу
    const getTotalBalance = (): number => {
        if (!wallet || !wallet.balance) return 715;

        const icp = wallet.balance.ICP ?? 0;
        const polygon = wallet.balance.POLYGON ?? 0;
        const solana = wallet.balance.SOLANA ?? 0;

        return icp + polygon + solana;
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

    if (showCreateWallet) {
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
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '20px',
                    gap: '15px'
                }}>
                    <button onClick={() => setShowCreateWallet(false)} style={{
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
                    }}>Create Wallet</h2>
                </div>

                <div style={{
                    maxWidth: '400px',
                    margin: '0 auto',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '30px auto',
                        backgroundColor: '#01ff77',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        color: 'white'
                    }}>
                        <i className="fas fa-wallet"></i>
                    </div>
                    <h3 style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '10px'
                    }}>Welcome to Wallet!</h3>
                    <p style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '30px'
                    }}>
                        To start using NFT features, you need to create a wallet.
                    </p>
                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: '#01ff77',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            // Тут буде створення гаманця
                            const newWallet: WalletData = {
                                address: '0x' + Array.from({ length: 40 }, () =>
                                    Math.floor(Math.random() * 16).toString(16)
                                ).join(''),
                                email: email,
                                password: 'default123',
                                recoveryPhrase: 'Galaxy Bamboo Velvet Pyramid Harmony Rocket Symbol Orbit Wisdom Foil Trophy Harbor',
                                balance: {
                                    ICP: 342,
                                    POLYGON: 245,
                                    SOLANA: 128
                                },
                                nfts: [],
                                createdAt: new Date().toISOString()
                            };

                            if (currentUser) {
                                setDoc(doc(db, 'wallets', currentUser.uid), newWallet).then(() => {
                                    setWallet(newWallet);
                                    setShowCreateWallet(false);
                                    alert('✅ Wallet created successfully!');
                                });
                            }
                        }}
                    >
                        Create Wallet
                    </button>
                </div>
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
                }}>Wallet Settings</h2>
            </div>

            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                {/* Баланс */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '20px',
                    padding: '25px',
                    marginBottom: '20px',
                    color: 'white'
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        opacity: 0.8,
                        marginBottom: '5px'
                    }}>Total Balance</h3>
                    <div style={{
                        fontSize: '36px',
                        fontWeight: 'bold',
                        marginBottom: '20px'
                    }}>
                        ${getTotalBalance()}
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '10px'
                        }}>
                            <span>ICP</span>
                            <span style={{ fontWeight: 'bold', color: '#01ff77' }}>
                {wallet?.balance?.ICP ?? 342}$
              </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '10px'
                        }}>
                            <span>POLYGON</span>
                            <span style={{ fontWeight: 'bold', color: '#01ff77' }}>
                {wallet?.balance?.POLYGON ?? 245}$
              </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '10px'
                        }}>
                            <span>SOLANA</span>
                            <span style={{ fontWeight: 'bold', color: '#01ff77' }}>
                {wallet?.balance?.SOLANA ?? 128}$
              </span>
                        </div>
                    </div>
                </div>

                {/* Email налаштування */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '15px'
                    }}>Email</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="email"
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                        />
                        <button
                            style={{
                                padding: '12px 20px',
                                background: '#01ff77',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                            onClick={handleUpdateEmail}
                            disabled={saving}
                        >
                            Save
                        </button>
                    </div>
                </div>

                {/* Зміна пароля */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '15px'
                    }}>Change Password</h3>
                    <input
                        type="password"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            marginBottom: '10px'
                        }}
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            marginBottom: '10px'
                        }}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            marginBottom: '10px'
                        }}
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: '#01ff77',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                        onClick={handleChangePassword}
                        disabled={saving}
                    >
                        Change Password
                    </button>
                </div>

                {/* Recovery Phrase */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '15px'
                    }}>Recovery Phrase</h3>
                    {showRecoveryPhrase ? (
                        <div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '10px',
                                marginBottom: '20px',
                                padding: '20px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '12px'
                            }}>
                                {wallet?.recoveryPhrase.split(' ').map((word, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        gap: '5px',
                                        padding: '8px',
                                        backgroundColor: 'white',
                                        borderRadius: '6px'
                                    }}>
                                        <span style={{ color: '#01ff77', fontWeight: 'bold' }}>{index + 1}.</span>
                                        <span style={{ color: '#333' }}>{word}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                style={{
                                    background: '#01ff77',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    marginRight: '10px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => copyToClipboard(wallet?.recoveryPhrase || '')}
                            >
                                <i className="fas fa-copy"></i> Copy
                            </button>
                            <button
                                style={{
                                    background: '#f0f0f0',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setShowRecoveryPhrase(false)}
                            >
                                Hide
                            </button>
                        </div>
                    ) : (
                        <button
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#f0f0f0',
                                border: '1px dashed #01ff77',
                                borderRadius: '8px',
                                color: '#01ff77',
                                cursor: 'pointer'
                            }}
                            onClick={() => setShowRecoveryPhrase(true)}
                        >
                            <i className="fas fa-eye"></i> Show Recovery Phrase
                        </button>
                    )}
                    <p style={{
                        fontSize: '12px',
                        color: '#ff6b6b',
                        marginTop: '10px'
                    }}>
                        ⚠️ Never share your recovery phrase with anyone!
                    </p>
                </div>

                {/* Адреса гаманця */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '15px'
                    }}>Wallet Address</h3>
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        background: '#f5f5f5',
                        padding: '12px',
                        borderRadius: '8px'
                    }}>
            <span style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '12px',
                wordBreak: 'break-all'
            }}>{wallet?.address}</span>
                        <button
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#01ff77',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                            onClick={() => copyToClipboard(wallet?.address || '')}
                        >
                            <i className="fas fa-copy"></i>
                        </button>
                    </div>
                </div>

                {/* Fingerprint */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🔐 Enable fingerprint unlock</span>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="checkbox"
                                id="fingerprint-toggle"
                                style={{
                                    opacity: 0,
                                    width: 0,
                                    height: 0,
                                    position: 'absolute'
                                }}
                                checked={fingerprintEnabled}
                                onChange={(e) => setFingerprintEnabled(e.target.checked)}
                            />
                            <label
                                htmlFor="fingerprint-toggle"
                                style={{
                                    display: 'inline-block',
                                    width: '50px',
                                    height: '24px',
                                    backgroundColor: fingerprintEnabled ? '#01ff77' : '#ccc',
                                    borderRadius: '34px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.4s'
                                }}
                            >
        <span
            style={{
                position: 'absolute',
                height: '16px',
                width: '16px',
                left: fingerprintEnabled ? '30px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.4s'
            }}
        />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletSettingsPage;