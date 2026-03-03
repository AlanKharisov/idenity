import React, { useState, useEffect } from 'react';
import './styles/App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import SplashScreen from './pages/SplashScreen';
import WelcomeScreen from './pages/WelcomeScreen';
import AuthScreen from './pages/AuthScreen';
import HomePage from './pages/HomePage';
import WalletPage from './pages/WalletPage';
import AddNFTPage from './pages/AddNFTPage';
import AlertsPage from './pages/AlertsPage';
import ProfilePage from './pages/ProfilePage';
import NFTViewerPage from './pages/NFTViewerPage';
import CreateWalletPage from './pages/CreateWalletPage';
import WalletSettingsPage from './pages/WalletSettingsPage';
import CryptoWalletsPage from './pages/CryptoWalletsPage'; // Імпортуємо, але поки не використовуємо

function AppContent() {
    const [currentScreen, setCurrentScreen] = useState<'splash' | 'welcome' | 'auth' | 'app'>('splash');
    const [currentPage, setCurrentPage] = useState<'home' | 'wallet' | 'add-nft' | 'alerts' | 'profile' | 'nft-viewer' | 'wallet-settings' | 'crypto-wallets'>('home');
    const [selectedNFT, setSelectedNFT] = useState<any>(null);
    const [showCreateWallet, setShowCreateWallet] = useState(false);
    const [checkingWallet, setCheckingWallet] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        const checkWallet = async () => {
            if (currentUser) {
                try {
                    console.log('Checking wallet for user:', currentUser.uid);
                    const walletRef = doc(db, 'wallets', currentUser.uid);
                    const walletDoc = await getDoc(walletRef);
                    console.log('Wallet exists:', walletDoc.exists());
                    setShowCreateWallet(!walletDoc.exists());
                } catch (error: any) {
                    console.error('Error checking wallet:', error);
                    if (error.code === 'permission-denied') {
                        alert('⚠️ Firebase permission error. Please check your database rules.');
                    }
                } finally {
                    setCheckingWallet(false);
                }
            } else {
                setCheckingWallet(false);
            }
        };

        if (currentScreen === 'app') {
            checkWallet();
        }
    }, [currentUser, currentScreen]);

    const handleSplashComplete = () => setCurrentScreen('welcome');
    const handleWelcomeNext = () => setCurrentScreen('auth');
    const handleAuthSuccess = () => setCurrentScreen('app');

    const openNFTViewer = (nft: any) => {
        setSelectedNFT(nft);
        setCurrentPage('nft-viewer');
    };

    const closeNFTViewer = () => {
        setSelectedNFT(null);
        setCurrentPage('home');
    };

    const handleWalletComplete = () => {
        setShowCreateWallet(false);
        setCurrentPage('wallet');
    };

    const openWalletSettings = () => {
        setCurrentPage('wallet-settings');
    };

    const closeWalletSettings = () => {
        setCurrentPage('profile');
    };

    const openCryptoWallets = () => {
        setCurrentPage('crypto-wallets');
    };

    const closeCryptoWallets = () => {
        setCurrentPage('profile');
    };

    useEffect(() => {
        if (currentUser) {
            setCurrentScreen('app');
        }
    }, [currentUser]);

    if (checkingWallet) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '3px solid #fff',
                    borderTop: '3px solid #01ff77',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        );
    }

    return (
        <div className="App">
            <div className="background"></div>

            {currentScreen === 'splash' && <SplashScreen onComplete={handleSplashComplete} />}
            {currentScreen === 'welcome' && <WelcomeScreen onNext={handleWelcomeNext} />}
            {currentScreen === 'auth' && <AuthScreen onAuthSuccess={handleAuthSuccess} />}

            {currentScreen === 'app' && (
                <div className="app-content active">
                    {/* Показуємо створення гаманця якщо потрібно */}
                    {showCreateWallet ? (
                        <CreateWalletPage onComplete={handleWalletComplete} />
                    ) : (
                        <>
                            {currentPage === 'home' && <HomePage />}
                            {currentPage === 'wallet' && (
                                <WalletPage onNFTClick={openNFTViewer} />
                            )}
                            {currentPage === 'add-nft' && <AddNFTPage />}
                            {currentPage === 'alerts' && <AlertsPage />}
                            {currentPage === 'profile' && (
                                <ProfilePage
                                    onOpenWalletSettings={openWalletSettings}
                                    onOpenCryptoWallets={openCryptoWallets}
                                />
                            )}
                            {currentPage === 'nft-viewer' && selectedNFT && (
                                <NFTViewerPage
                                    nft={selectedNFT}
                                    onClose={closeNFTViewer}
                                />
                            )}
                            {currentPage === 'wallet-settings' && (
                                <WalletSettingsPage onBack={closeWalletSettings} />
                            )}
                            {currentPage === 'crypto-wallets' && (
                                <CryptoWalletsPage onBack={closeCryptoWallets} />
                            )}

                            {/* Нижня навігація - показуємо тільки якщо не в спеціальних сторінках */}
                            {currentPage !== 'nft-viewer' &&
                                currentPage !== 'wallet-settings' &&
                                currentPage !== 'crypto-wallets' && (
                                    <div className="bottom-nav">
                                        <div
                                            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
                                            onClick={() => setCurrentPage('home')}
                                        >
                                            <i className="fas fa-home"></i>
                                            <span>Home</span>
                                        </div>
                                        <div
                                            className={`nav-item ${currentPage === 'wallet' ? 'active' : ''}`}
                                            onClick={() => setCurrentPage('wallet')}
                                        >
                                            <i className="fas fa-wallet"></i>
                                            <span>Wallet</span>
                                        </div>
                                        <div
                                            className={`nav-item ${currentPage === 'add-nft' ? 'active' : ''}`}
                                            onClick={() => setCurrentPage('add-nft')}
                                        >
                                            <i className="fas fa-plus-circle"></i>
                                            <span>Add NFT</span>
                                        </div>
                                        <div
                                            className={`nav-item ${currentPage === 'alerts' ? 'active' : ''}`}
                                            onClick={() => setCurrentPage('alerts')}
                                        >
                                            <i className="fas fa-bell"></i>
                                            <span>Alerts</span>
                                        </div>
                                        <div
                                            className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
                                            onClick={() => setCurrentPage('profile')}
                                        >
                                            <i className="fas fa-user"></i>
                                            <span>Profile</span>
                                        </div>
                                    </div>
                                )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;