import React, { useState, useEffect } from 'react';
import './styles/App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiGetMarkiWallet } from './services/apiClient';
import { Icon } from './components/brand';
import SplashScreen        from './pages/SplashScreen';
import WelcomeScreen       from './pages/WelcomeScreen';
import AuthScreen          from './pages/AuthScreen';
import HomePage            from './pages/HomePage';
import WalletPage          from './pages/WalletPage';
import AddNFTPage          from './pages/AddNFTPage';
import AlertsPage          from './pages/AlertsPage';
import ProfilePage         from './pages/ProfilePage';
import NFTViewerPage       from './pages/NFTViewerPage';
import CreateWalletPage    from './pages/CreateWalletPage';
import WalletSettingsPage  from './pages/WalletSettingsPage';
import CryptoWalletsPage   from './pages/CryptoWalletsPage';
import CrmPage             from './pages/CrmPage';

function AppContent() {
    const [currentScreen, setCurrentScreen] = useState<'splash' | 'welcome' | 'auth' | 'app'>('splash');
    const [currentPage, setCurrentPage]     = useState<
        'home' | 'wallet' | 'add-nft' | 'alerts' | 'profile' |
        'nft-viewer' | 'wallet-settings' | 'crypto-wallets' | 'crm'
    >('home');
    const [selectedNFT, setSelectedNFT]           = useState<any>(null);
    const [showCreateWallet, setShowCreateWallet] = useState(false);
    const [checkingWallet, setCheckingWallet]     = useState(false);
    const [nftToSell, setNftToSell]               = useState<any | null>(null);

    const { currentUser, loading } = useAuth();

    useEffect(() => {
        if (!loading && currentUser) setCurrentScreen('app');
        if (!loading && !currentUser && currentScreen === 'app') {
            setCurrentScreen('auth');
            setCurrentPage('home');
            setShowCreateWallet(false);
            setSelectedNFT(null);
            setNftToSell(null);
        }
    }, [currentUser, loading, currentScreen]);

    useEffect(() => {
        const checkWallet = async () => {
            if (!currentUser) { setCheckingWallet(false); return; }
            setCheckingWallet(true);
            try {
                await apiGetMarkiWallet();
                setShowCreateWallet(false);
            } catch (err: any) {
                // 404 means no wallet yet
                setShowCreateWallet(true);
            } finally {
                setCheckingWallet(false);
            }
        };
        if (currentScreen === 'app' && currentUser) checkWallet();
    }, [currentUser, currentScreen]);

    const openNFTViewer      = (nft: any) => { setSelectedNFT(nft); setCurrentPage('nft-viewer'); };
    const closeNFTViewer     = () => { setSelectedNFT(null); setCurrentPage('home'); };
    const handleWalletComplete = () => { setShowCreateWallet(false); setCurrentPage('wallet'); };

    const handleSellNFT = (nft: any) => {
        setNftToSell(nft);
        setCurrentPage('add-nft');
    };

    const navigateTo = (page: typeof currentPage) => {
        if (page !== 'add-nft') setNftToSell(null);
        setCurrentPage(page);
    };

    if (currentScreen === 'app' && checkingWallet) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-page)' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="App">
            <div className="background"></div>

            {currentScreen === 'splash'  && <SplashScreen onComplete={() => setCurrentScreen('welcome')} />}
            {currentScreen === 'welcome' && <WelcomeScreen onNext={() => setCurrentScreen('auth')} />}
            {currentScreen === 'auth'    && <AuthScreen onAuthSuccess={() => setCurrentScreen('app')} />}

            {currentScreen === 'app' && (
                <div className="app-content active">
                    {showCreateWallet ? (
                        <CreateWalletPage onComplete={handleWalletComplete} />
                    ) : (
                        <>
                            {currentPage === 'home'    && <HomePage />}
                            {currentPage === 'wallet'  && (
                                <WalletPage
                                    onNFTClick={openNFTViewer}
                                    onSellNFT={handleSellNFT}
                                />
                            )}
                            {currentPage === 'add-nft' && (
                                <AddNFTPage preselectedNFT={nftToSell} />
                            )}
                            {currentPage === 'alerts'  && <AlertsPage />}
                            {currentPage === 'profile' && (
                                <ProfilePage
                                    onOpenWalletSettings={() => setCurrentPage('wallet-settings')}
                                    onOpenCryptoWallets={() => setCurrentPage('crypto-wallets')}
                                />
                            )}
                            {currentPage === 'nft-viewer' && selectedNFT && (
                                <NFTViewerPage nft={selectedNFT} onClose={closeNFTViewer} />
                            )}
                            {currentPage === 'wallet-settings' && (
                                <WalletSettingsPage onBack={() => setCurrentPage('profile')} />
                            )}
                            {currentPage === 'crypto-wallets' && (
                                <CryptoWalletsPage onBack={() => setCurrentPage('profile')} />
                            )}
                            {currentPage === 'crm' && (
                                <CrmPage onBack={() => setCurrentPage('home')} />
                            )}

                            {!['nft-viewer', 'wallet-settings', 'crypto-wallets'].includes(currentPage) && (
                                <div className="bottom-nav">
                                    {([
                                        { page: 'home',    icon: <Icon.Home />,   label: 'Home',    show: true,  primary: false },
                                        { page: 'wallet',  icon: <Icon.Wallet />, label: 'Wallet',  show: true,  primary: false },
                                        { page: 'add-nft', icon: <Icon.Plus />,   label: 'Add',     show: true,  primary: true },
                                        { page: 'crm',     icon: <Icon.Truck />,  label: 'CRM',     show: !!currentUser?.companyApproved || !!currentUser?.roles?.length, primary: false },
                                        { page: 'alerts',  icon: <Icon.Bell />,   label: 'Alerts',  show: true,  primary: false },
                                        { page: 'profile', icon: <Icon.User />,   label: 'Profile', show: true,  primary: false },
                                    ] as const).filter(i => i.show).map(item => (
                                        <button
                                            key={item.page}
                                            className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
                                            onClick={() => navigateTo(item.page)}
                                        >
                                            {item.primary ? (
                                                <span className="nav-add">{item.icon}</span>
                                            ) : (
                                                item.icon
                                            )}
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
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
