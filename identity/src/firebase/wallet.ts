import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './config';

export interface NFT {
    id: string;
    title: string;
    description: string;
    image: string;
    ownerId: string;
    ownerName: string;
    price?: number | null;
    forSale: boolean;
    createdAt: string;
    currency?: string; // Додано валюту
}

export interface CryptoWallet {
    id: string;
    type: 'metamask' | 'walletconnect' | 'coinbase' | 'phantom';
    address: string;
    chainId: number;
    network: 'ethereum' | 'polygon' | 'solana' | 'icp';
    balance: number;
    currency: string;
    isConnected: boolean;
    connectedAt: string;
    lastUsed: string;
    label?: string;
}

// ============ ФУНКЦІЇ ДЛЯ NFT ============

// Отримати всі NFT користувача
export const getUserNFTs = async (userId: string): Promise<NFT[]> => {
    try {
        if (!userId) return [];

        const walletRef = doc(db, 'marki_wallets', userId);
        const walletDoc = await getDoc(walletRef);

        if (walletDoc.exists()) {
            const data = walletDoc.data();
            return data.nfts || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting user NFTs:', error);
        return [];
    }
};

// Додати NFT в гаманець
export const addNFTToWallet = async (userId: string, nft: NFT) => {
    try {
        if (!userId) throw new Error('No user ID');

        const walletRef = doc(db, 'marki_wallets', userId);
        const walletDoc = await getDoc(walletRef);

        const cleanNFT = {
            ...nft,
            price: nft.price || null,
        };

        if (walletDoc.exists()) {
            await updateDoc(walletRef, {
                nfts: arrayUnion(cleanNFT),
                updatedAt: new Date().toISOString()
            });
        } else {
            await setDoc(walletRef, {
                userId,
                address: generateWalletAddress(),
                balance: {
                    ICP: 100,
                    POLYGON: 50,
                    SOLANA: 25,
                    USD: 0
                },
                nfts: [cleanNFT],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error adding NFT to wallet:', error);
        return { success: false, error: error.message };
    }
};

// Видалити NFT з гаманця (ВИПРАВЛЕНО)
export const removeNFTFromWallet = async (userId: string, nftId: string) => {
    try {
        if (!userId) throw new Error('No user ID');

        const walletRef = doc(db, 'marki_wallets', userId);
        const walletDoc = await getDoc(walletRef);

        if (walletDoc.exists()) {
            const data = walletDoc.data();
            const nfts = data.nfts || [];
            const nftToRemove = nfts.find((nft: NFT) => nft.id === nftId);

            if (nftToRemove) {
                await updateDoc(walletRef, {
                    nfts: arrayRemove(nftToRemove),
                    updatedAt: new Date().toISOString()
                });
                return { success: true };
            }
        }
        return { success: false, error: 'NFT not found' };
    } catch (error: any) {
        console.error('Error removing NFT from wallet:', error);
        return { success: false, error: error.message };
    }
};

// Транзакція купівлі NFT (ВИПРАВЛЕНО)
export const purchaseNFT = async (
    buyerId: string,
    sellerId: string,
    nft: NFT,
    price: number,
    walletId: string
) => {
    try {
        if (!buyerId || !sellerId) throw new Error('Missing user IDs');

        console.log('Starting purchase:', { buyerId, sellerId, nftId: nft.id, price });

        // 1. Забираємо NFT у продавця
        const removeResult = await removeNFTFromWallet(sellerId, nft.id);
        if (!removeResult.success) {
            throw new Error(`Failed to remove NFT from seller: ${removeResult.error}`);
        }

        // 2. Додаємо NFT покупцю
        const purchasedNFT: NFT = {
            ...nft,
            id: `nft_${Date.now()}`,
            ownerId: buyerId,
            forSale: false,
            price: null,
            createdAt: new Date().toISOString()
        };

        const addResult = await addNFTToWallet(buyerId, purchasedNFT);
        if (!addResult.success) {
            throw new Error('Failed to add NFT to buyer');
        }

        // 3. Оновлюємо баланс крипто гаманця
        const cryptoWalletsRef = doc(db, 'crypto_wallets', buyerId);
        const cryptoDoc = await getDoc(cryptoWalletsRef);

        if (cryptoDoc.exists()) {
            const data = cryptoDoc.data();
            const wallets = data.wallets || [];
            const walletIndex = wallets.findIndex((w: CryptoWallet) => w.id === walletId);

            if (walletIndex !== -1) {
                wallets[walletIndex] = {
                    ...wallets[walletIndex],
                    balance: Math.max(0, wallets[walletIndex].balance - price),
                    lastUsed: new Date().toISOString()
                };
                await updateDoc(cryptoWalletsRef, { wallets });
            }
        }

        return { success: true, nft: purchasedNFT };
    } catch (error: any) {
        console.error('Error purchasing NFT:', error);
        return { success: false, error: error.message };
    }
};

// ============ ФУНКЦІЇ ДЛЯ КРИПТО ГАМАНЦІВ ============

// Додати крипто гаманець
export const addCryptoWallet = async (userId: string, wallet: Omit<CryptoWallet, 'id' | 'connectedAt' | 'lastUsed'>) => {
    try {
        if (!userId) throw new Error('No user ID');

        const cryptoWalletsRef = doc(db, 'crypto_wallets', userId);
        const cryptoDoc = await getDoc(cryptoWalletsRef);

        const newWallet: CryptoWallet = {
            ...wallet,
            id: `wallet_${Date.now()}`,
            connectedAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        if (cryptoDoc.exists()) {
            const data = cryptoDoc.data();
            const wallets = data.wallets || [];

            // Перевіряємо чи вже є такий гаманець
            const exists = wallets.some((w: CryptoWallet) => w.address === wallet.address);
            if (exists) {
                return { success: false, error: 'Wallet already connected' };
            }

            await updateDoc(cryptoWalletsRef, {
                wallets: arrayUnion(newWallet)
            });
        } else {
            await setDoc(cryptoWalletsRef, {
                userId,
                wallets: [newWallet]
            });
        }

        return { success: true, wallet: newWallet };
    } catch (error: any) {
        console.error('Error adding crypto wallet:', error);
        return { success: false, error: error.message };
    }
};

// Отримати всі крипто гаманці
export const getCryptoWallets = async (userId: string): Promise<CryptoWallet[]> => {
    try {
        if (!userId) return [];

        const cryptoWalletsRef = doc(db, 'crypto_wallets', userId);
        const cryptoDoc = await getDoc(cryptoWalletsRef);

        if (cryptoDoc.exists()) {
            const data = cryptoDoc.data();
            return data.wallets || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting crypto wallets:', error);
        return [];
    }
};

// Видалити крипто гаманець
export const removeCryptoWallet = async (userId: string, walletId: string) => {
    try {
        if (!userId) throw new Error('No user ID');

        const cryptoWalletsRef = doc(db, 'crypto_wallets', userId);
        const cryptoDoc = await getDoc(cryptoWalletsRef);

        if (cryptoDoc.exists()) {
            const data = cryptoDoc.data();
            const wallets = data.wallets || [];
            const walletToRemove = wallets.find((w: CryptoWallet) => w.id === walletId);

            if (walletToRemove) {
                await updateDoc(cryptoWalletsRef, {
                    wallets: arrayRemove(walletToRemove)
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error removing crypto wallet:', error);
        return { success: false, error: error.message };
    }
};

// Оновити баланс крипто гаманця
export const updateCryptoBalance = async (userId: string, walletId: string, balance: number) => {
    try {
        if (!userId) throw new Error('No user ID');

        const cryptoWalletsRef = doc(db, 'crypto_wallets', userId);
        const cryptoDoc = await getDoc(cryptoWalletsRef);

        if (cryptoDoc.exists()) {
            const data = cryptoDoc.data();
            const wallets = data.wallets || [];
            const walletIndex = wallets.findIndex((w: CryptoWallet) => w.id === walletId);

            if (walletIndex !== -1) {
                wallets[walletIndex] = {
                    ...wallets[walletIndex],
                    balance,
                    lastUsed: new Date().toISOString()
                };

                await updateDoc(cryptoWalletsRef, { wallets });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error updating crypto balance:', error);
        return { success: false, error: error.message };
    }
};

// Генерація адреси гаманця
const generateWalletAddress = (): string => {
    return '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
};