import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getUserNFTs,
    getCryptoWallets,
    purchaseNFT,
    removeNFTFromWallet,

    NFT,
    CryptoWallet
} from '../firebase/wallet';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface WalletPageProps {
    onNFTClick: (nft: NFT) => void;
}

// Допоміжна функція для іконок
const getWalletIcon = (type: string): string => {
    switch (type) {
        case 'metamask': return '🦊';
        case 'walletconnect': return '🔗';
        case 'coinbase': return '📦';
        case 'phantom': return '👻';
        default: return '💼';
    }
};

// Функція для визначення валюти NFT
const getNFTCurrency = (nft: NFT): string => {
    // Якщо є поле currency, використовуємо його
    if ((nft as any).currency) return (nft as any).currency;

    // За замовчуванням ETH
    return 'ETH';
};

const WalletPage: React.FC<WalletPageProps> = ({ onNFTClick }) => {
    const { currentUser } = useAuth();
    const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
    const [marketNFTs, setMarketNFTs] = useState<NFT[]>([]);
    const [flippedNFTs, setFlippedNFTs] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'my' | 'market'>('my');
    const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<string>('');
    const [walletError, setWalletError] = useState<string>('');

    // Завантаження всіх даних
    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            // Завантажуємо NFT користувача
            const userNfts = await getUserNFTs(currentUser.uid);
            setMyNFTs(userNfts);

            // Завантажуємо крипто гаманці
            const wallets = await getCryptoWallets(currentUser.uid);
            setCryptoWallets(wallets);
            console.log('Loaded crypto wallets:', wallets);

            // Демо маркет з різними валютами (ETH та SOL)
            const demoMarket: NFT[] = [
                // ETH NFTs
                {
                    id: 'm1',
                    title: 'Cosmic Dream #1',
                    description: 'Digital art in space',
                    image: 'https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400',
                    ownerId: 'artist1',
                    ownerName: 'CryptoArtist',
                    price: 1.2,
                    forSale: true,
                    createdAt: new Date().toISOString(),
                    currency: 'ETH' // Додаємо валюту
                } as any,
                {
                    id: 'm2',
                    title: 'Digital Pulse #2',
                    description: 'Abstract sound visualization',
                    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
                    ownerId: 'artist2',
                    ownerName: 'NFTMaster',
                    price: 0.8,
                    forSale: true,
                    createdAt: new Date().toISOString(),
                    currency: 'ETH'
                } as any,
                // SOL NFTs
                {
                    id: 'm5',
                    title: 'Solana Seeker #5',
                    description: 'Solana native NFT for Phantom wallet',
                    image: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400',
                    ownerId: 'artist5',
                    ownerName: 'SolanaArtist',
                    price: 5.5,
                    forSale: true,
                    createdAt: new Date().toISOString(),
                    currency: 'SOL' // Додаємо валюту
                } as any,
                {
                    id: 'm6',
                    title: 'Phantom Dream #6',
                    description: 'Beautiful art for Solana collectors',
                    image: 'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=400',
                    ownerId: 'artist6',
                    ownerName: 'PhantomMaster',
                    price: 3.2,
                    forSale: true,
                    createdAt: new Date().toISOString(),
                    currency: 'SOL'
                } as any
            ];
            setMarketNFTs(demoMarket);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Відкриття модалки покупки з перевіркою сумісності
    const openBuyModal = (nft: NFT) => {
        setWalletError('');

        if (cryptoWallets.length === 0) {
            alert('❌ Please connect a crypto wallet first!');
            return;
        }

        const nftCurrency = getNFTCurrency(nft);

        // Перевіряємо, чи є сумісний гаманець
        const compatibleWallets = cryptoWallets.filter(w =>
            w.currency === nftCurrency
        );

        if (compatibleWallets.length === 0) {
            alert(`❌ This NFT is priced in ${nftCurrency}. Please connect a wallet with ${nftCurrency} ${
                nftCurrency === 'ETH' ? '(e.g., MetaMask)' : '(e.g., Phantom)'
            }.`);
            return;
        }

        setSelectedNFT(nft);
        setSelectedWallet(compatibleWallets[0]?.id || '');
        setShowBuyModal(true);
    };

    // Обробка покупки
    const handleBuyNFT = async () => {
        if (!currentUser || !selectedNFT || !selectedWallet) return;

        const wallet = cryptoWallets.find(w => w.id === selectedWallet);
        const nftPrice = selectedNFT.price || 0;
        const nftCurrency = getNFTCurrency(selectedNFT);

        // Перевіряємо сумісність валют
        if (!wallet || wallet.currency !== nftCurrency) {
            alert(`❌ Currency mismatch! This NFT requires ${nftCurrency}, but your wallet has ${wallet?.currency}.`);
            return;
        }

        // Перевіряємо чи достатньо коштів
        if (!wallet || wallet.balance < nftPrice) {
            alert(`❌ Insufficient funds! You have ${wallet?.balance.toFixed(4) || 0} ${wallet?.currency}, need ${nftPrice} ${wallet?.currency}`);
            return;
        }

        // Підтвердження покупки
        const confirmBuy = window.confirm(
            `🛒 **Purchase Confirmation**\n\n` +
            `NFT: ${selectedNFT.title}\n` +
            `Price: ${nftPrice} ${wallet.currency}\n` +
            `Seller: ${selectedNFT.ownerName}\n` +
            `From wallet: ${wallet.type} (${wallet.address.slice(0,6)}...${wallet.address.slice(-4)})\n\n` +
            `Confirm purchase?`
        );

        if (confirmBuy) {
            try {
                // Виконуємо транзакцію
                const result = await purchaseNFT(
                    currentUser.uid,
                    selectedNFT.ownerId,
                    selectedNFT,
                    nftPrice,
                    selectedWallet
                );

                if (result.success) {
                    // Оновлюємо списки
                    setMyNFTs(prev => [...prev, result.nft!]);
                    setMarketNFTs(prev => prev.filter(item => item.id !== selectedNFT.id));

                    // Оновлюємо баланс гаманця
                    const updatedWallets = cryptoWallets.map(w =>
                        w.id === selectedWallet
                            ? { ...w, balance: w.balance - nftPrice }
                            : w
                    );
                    setCryptoWallets(updatedWallets);

                    setShowBuyModal(false);
                    setSelectedNFT(null);
                    setWalletError('');

                    alert(`✅ **Purchase Successful!**\n\n"${selectedNFT.title}" is now in your collection.`);
                } else {
                    alert('❌ Purchase failed. Please try again.');
                }
            } catch (error) {
                console.error('Purchase error:', error);
                alert('❌ Error during purchase');
            }
        }
    };

    // Виставлення NFT на продаж
    const handleSetPrice = async (nft: NFT) => {
        // Питаємо валюту
        const currency = prompt('Enter currency (ETH or SOL):', 'ETH');
        if (!currency || (currency !== 'ETH' && currency !== 'SOL')) {
            alert('Please enter valid currency: ETH or SOL');
            return;
        }

        const price = prompt(`Enter price in ${currency}:`, '1.0');
        if (price) {
            const numPrice = parseFloat(price);
            if (!isNaN(numPrice) && numPrice > 0) {
                try {
                    // Оновлюємо локально з валютою
                    const updatedNFTs = myNFTs.map(item =>
                        item.id === nft.id
                            ? { ...item, price: numPrice, forSale: true, currency }
                            : item
                    );
                    setMyNFTs(updatedNFTs);

                    // Додаємо в маркет
                    const listedNFT = { ...nft, price: numPrice, forSale: true, currency };
                    setMarketNFTs(prev => [...prev, listedNFT as any]);

                    alert(`✅ NFT listed for sale at ${numPrice} ${currency}`);
                } catch (error) {
                    alert('❌ Error listing NFT');
                }
            }
        }
    };

    // Видалення NFT з продажу
    const handleRemoveFromSale = async (nft: NFT) => {
        const updatedNFTs = myNFTs.map(item =>
            item.id === nft.id
                ? { ...item, price: null, forSale: false }
                : item
        );
        setMyNFTs(updatedNFTs);
        setMarketNFTs(prev => prev.filter(item => item.id !== nft.id));
        alert('✅ NFT removed from marketplace');
    };

    const toggleFlip = (nftId: string) => {
        setFlippedNFTs(prev => ({
            ...prev,
            [nftId]: !prev[nftId]
        }));
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = 'https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400';
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
            </div>
        );
    }

    return (
        <div className="page wallet-page active">
            <style>{stylesCSS}</style>

            {/* Баланс токенів */}
            <div style={styles.balanceCard}>
                <h1 style={styles.balanceTitle}>💼 Your Wallet</h1>
                <div style={styles.tokenGrid}>
                    <div style={styles.tokenItem}>
                        <span>💰 ICP</span>
                        <span style={styles.tokenValue}>342$</span>
                    </div>
                    <div style={styles.tokenItem}>
                        <span>🔷 POLYGON</span>
                        <span style={styles.tokenValue}>245$</span>
                    </div>
                    <div style={styles.tokenItem}>
                        <span>◎ SOLANA</span>
                        <span style={styles.tokenValue}>128$</span>
                    </div>
                </div>
            </div>

            {/* Інформація про крипто гаманці */}
            {cryptoWallets.length > 0 && (
                <div style={styles.walletInfo}>
                    <h4 style={styles.walletInfoTitle}>Connected Crypto Wallets:</h4>
                    {cryptoWallets.map(w => (
                        <div key={w.id} style={styles.walletInfoItem}>
                            <span>{getWalletIcon(w.type)} {w.type}</span>
                            <span style={styles.walletBalance}>
                {w.balance.toFixed(4)} {w.currency}
              </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Таби */}
            <div style={styles.tabContainer}>
                <button
                    onClick={() => setSelectedTab('my')}
                    style={{
                        ...styles.tabButton,
                        background: selectedTab === 'my' ? '#01ff77' : 'transparent',
                        color: selectedTab === 'my' ? 'black' : '#666'
                    }}
                >
                    🎨 My Collection ({myNFTs.length})
                </button>
                <button
                    onClick={() => setSelectedTab('market')}
                    style={{
                        ...styles.tabButton,
                        background: selectedTab === 'market' ? '#01ff77' : 'transparent',
                        color: selectedTab === 'market' ? 'black' : '#666'
                    }}
                >
                    🛒 Marketplace ({marketNFTs.length})
                </button>
            </div>

            {/* Контент */}
            <div style={styles.content}>
                {selectedTab === 'my' ? (
                    <>
                        {myNFTs.length === 0 ? (
                            <div style={styles.emptyState}>
                                <i className="fas fa-wallet" style={styles.emptyIcon}></i>
                                <h3>No NFTs Yet</h3>
                                <p>Visit marketplace to buy your first NFT!</p>
                                <button onClick={() => setSelectedTab('market')} style={styles.primaryButton}>
                                    Go to Marketplace
                                </button>
                            </div>
                        ) : (
                            <div style={styles.nftGrid}>
                                {myNFTs.map(nft => (
                                    <div
                                        key={nft.id}
                                        style={styles.nftCard}
                                        onMouseEnter={() => toggleFlip(nft.id)}
                                        onMouseLeave={() => toggleFlip(nft.id)}
                                    >
                                        <div style={{
                                            ...styles.flipCard,
                                            transform: flippedNFTs[nft.id] ? 'rotateY(180deg)' : 'none'
                                        }}>
                                            <div style={styles.flipCardFront}>
                                                <img
                                                    src={nft.image}
                                                    alt={nft.title}
                                                    style={styles.nftImage}
                                                    onError={handleImageError}
                                                />
                                                <div style={styles.nftOverlay}>
                                                    <div style={styles.nftTitle}>{nft.title}</div>
                                                    <div style={styles.nftPrice}>
                                                        {nft.forSale ? (
                                                            <>
                                <span style={styles.priceValue}>
                                  {nft.price} {(nft as any).currency || 'ETH'}
                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveFromSale(nft);
                                                                    }}
                                                                    style={styles.removeButton}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSetPrice(nft);
                                                                }}
                                                                style={styles.sellButton}
                                                            >
                                                                Set Price
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                style={styles.flipCardBack}
                                                onClick={() => onNFTClick(nft)}
                                            >
                                                <i className="fas fa-qrcode" style={styles.qrIcon}></i>
                                                <div style={styles.qrText}>View Details</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={styles.nftGrid}>
                        {marketNFTs.map((nft: any) => (
                            <div key={nft.id} style={styles.marketCard}>
                                <img
                                    src={nft.image}
                                    alt={nft.title}
                                    style={styles.nftImage}
                                    onError={handleImageError}
                                />
                                <div style={styles.marketOverlay}>
                                    <div style={styles.nftTitle}>{nft.title}</div>
                                    <div style={styles.marketDetails}>
                                        <span>by {nft.ownerName}</span>
                                        <span style={styles.priceValue}>
                      {nft.price} {nft.currency || 'ETH'}
                    </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openBuyModal(nft);
                                        }}
                                        style={styles.buyButton}
                                    >
                                        Buy Now 🚀
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Модалка покупки */}
            {showBuyModal && selectedNFT && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Complete Purchase</h2>

                        <div style={styles.modalContent}>
                            <img
                                src={selectedNFT.image}
                                alt={selectedNFT.title}
                                style={styles.modalImage}
                                onError={handleImageError}
                            />

                            <div style={styles.modalDetails}>
                                <h3>{selectedNFT.title}</h3>
                                <p style={styles.modalDescription}>{selectedNFT.description}</p>

                                <div style={styles.priceInfo}>
                                    <span>Price:</span>
                                    <span style={styles.modalPrice}>
                    {selectedNFT.price} {(selectedNFT as any).currency || 'ETH'}
                  </span>
                                </div>

                                <div style={styles.walletSelector}>
                                    <label>Pay with:</label>
                                    <select
                                        value={selectedWallet}
                                        onChange={(e) => setSelectedWallet(e.target.value)}
                                        style={styles.select}
                                    >
                                        {cryptoWallets
                                            .filter(w => w.currency === ((selectedNFT as any).currency || 'ETH'))
                                            .map(w => (
                                                <option key={w.id} value={w.id}>
                                                    {getWalletIcon(w.type)} {w.type} ({w.balance.toFixed(4)} {w.currency})
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Перевірка балансу */}
                                {(() => {
                                    const wallet = cryptoWallets.find(w => w.id === selectedWallet);
                                    const nftPrice = selectedNFT.price || 0;

                                    if (!wallet) {
                                        return (
                                            <div style={styles.errorMessage}>
                                                ⚠️ No compatible wallet found for this purchase
                                            </div>
                                        );
                                    }

                                    if (wallet.balance < nftPrice) {
                                        return (
                                            <div style={styles.errorMessage}>
                                                ⚠️ Insufficient funds! You have {wallet.balance.toFixed(4)} {wallet.currency}, need {nftPrice} {wallet.currency}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button onClick={() => setShowBuyModal(false)} style={styles.cancelButton}>
                                Cancel
                            </button>

                            {/* Кнопка підтвердження */}
                            {(() => {
                                const wallet = cryptoWallets.find(w => w.id === selectedWallet);
                                const nftPrice = selectedNFT.price || 0;
                                const isDisabled = !wallet || wallet.balance < nftPrice;

                                return (
                                    <button
                                        onClick={handleBuyNFT}
                                        style={{
                                            ...styles.confirmButton,
                                            opacity: isDisabled ? 0.5 : 1
                                        }}
                                        disabled={isDisabled}
                                    >
                                        Confirm Purchase
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const stylesCSS = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const styles: any = {
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f5f5f5'
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '3px solid #ddd',
        borderTop: '3px solid #01ff77',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    balanceCard: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '30px 20px',
        borderRadius: '0 0 30px 30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    },
    balanceTitle: {
        color: 'white',
        fontSize: '28px',
        marginBottom: '20px',
        textAlign: 'center'
    },
    tokenGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '15px'
    },
    tokenItem: {
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '10px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    tokenValue: {
        color: '#01ff77',
        fontWeight: 'bold'
    },
    walletInfo: {
        background: 'white',
        margin: '15px',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    },
    walletInfoTitle: {
        margin: '0 0 10px 0',
        fontSize: '14px',
        color: '#666'
    },
    walletInfoItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #f0f0f0'
    },
    walletBalance: {
        color: '#01ff77',
        fontWeight: 'bold'
    },
    tabContainer: {
        display: 'flex',
        margin: '20px',
        background: '#f0f0f0',
        borderRadius: '25px',
        padding: '5px'
    },
    tabButton: {
        flex: 1,
        padding: '12px',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s',
        fontSize: '14px'
    },
    content: {
        padding: '0 15px 20px'
    },
    emptyState: {
        textAlign: 'center',
        padding: '50px 20px',
        background: 'white',
        borderRadius: '20px'
    },
    emptyIcon: {
        fontSize: '50px',
        color: '#ccc',
        marginBottom: '15px'
    },
    primaryButton: {
        background: '#01ff77',
        border: 'none',
        padding: '12px 30px',
        borderRadius: '25px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '15px'
    },
    nftGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '15px'
    },
    nftCard: {
        background: 'white',
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        aspectRatio: '1',
        position: 'relative'
    },
    flipCard: {
        position: 'relative',
        width: '100%',
        height: '100%',
        transition: 'transform 0.6s',
        transformStyle: 'preserve-3d'
    },
    flipCardFront: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden'
    },
    flipCardBack: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: 'white',
        cursor: 'pointer'
    },
    nftImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    nftOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        color: 'white',
        padding: '10px'
    },
    nftTitle: {
        fontWeight: 'bold',
        marginBottom: '5px',
        fontSize: '14px'
    },
    nftPrice: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    priceValue: {
        color: '#01ff77',
        fontWeight: 'bold',
        fontSize: '12px'
    },
    sellButton: {
        background: '#01ff77',
        border: 'none',
        borderRadius: '15px',
        padding: '5px 10px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    removeButton: {
        background: '#ff4444',
        border: 'none',
        borderRadius: '15px',
        padding: '5px 10px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        color: 'white'
    },
    qrIcon: {
        fontSize: '40px',
        marginBottom: '10px'
    },
    qrText: {
        fontSize: '12px'
    },
    marketCard: {
        background: 'white',
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        position: 'relative',
        aspectRatio: '1'
    },
    marketOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
        color: 'white',
        padding: '15px'
    },
    marketDetails: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        marginBottom: '10px'
    },
    buyButton: {
        background: '#01ff77',
        border: 'none',
        borderRadius: '20px',
        padding: '8px 15px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '12px',
        width: '100%',
        color: 'black'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000
    },
    modal: {
        background: 'white',
        borderRadius: '20px',
        padding: '20px',
        maxWidth: '400px',
        width: '90%'
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'center'
    },
    modalContent: {
        display: 'flex',
        gap: '15px',
        marginBottom: '20px'
    },
    modalImage: {
        width: '100px',
        height: '100px',
        borderRadius: '10px',
        objectFit: 'cover'
    },
    modalDetails: {
        flex: 1
    },
    modalDescription: {
        fontSize: '12px',
        color: '#666',
        margin: '5px 0'
    },
    priceInfo: {
        display: 'flex',
        justifyContent: 'space-between',
        margin: '10px 0',
        padding: '10px 0',
        borderTop: '1px solid #eee',
        borderBottom: '1px solid #eee'
    },
    modalPrice: {
        color: '#01ff77',
        fontWeight: 'bold',
        fontSize: '18px'
    },
    walletSelector: {
        marginTop: '10px'
    },
    select: {
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginTop: '5px'
    },
    errorMessage: {
        color: '#ff4444',
        fontSize: '12px',
        marginTop: '10px',
        padding: '5px',
        background: '#ffeeee',
        borderRadius: '5px'
    },
    modalActions: {
        display: 'flex',
        gap: '10px'
    },
    cancelButton: {
        flex: 1,
        padding: '12px',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '10px',
        cursor: 'pointer'
    },
    confirmButton: {
        flex: 1,
        padding: '12px',
        background: '#01ff77',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer'
    }
};

export default WalletPage;