import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './config';

export interface NFT {
    id: string;
    title: string;
    description: string;
    image: string;        // Firebase Storage URL
    nftImage?: string;    // alias — деякі старі пости зберігають nftImage
    ownerId: string;
    ownerName: string;
    price?: number | null;
    forSale: boolean;
    createdAt: string;
    currency?: string;
    postId?: string;      // ID поста в колекції posts (для оновлення після продажу)
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

// ─── NFT ─────────────────────────────────────────────────────────────────────

export const getUserNFTs = async (userId: string): Promise<NFT[]> => {
    try {
        if (!userId) return [];
        const walletRef = doc(db, 'marki_wallets', userId);
        const walletDoc = await getDoc(walletRef);
        if (walletDoc.exists()) {
            return walletDoc.data().nfts || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting user NFTs:', error);
        return [];
    }
};

export const addNFTToWallet = async (userId: string, nft: NFT) => {
    try {
        if (!userId) throw new Error('No user ID');
        const walletRef = doc(db, 'marki_wallets', userId);
        const walletDoc = await getDoc(walletRef);

        // Нормалізуємо: завжди зберігаємо image (не nftImage)
        const cleanNFT = {
            ...nft,
            image: nft.image || nft.nftImage || '',
            price: nft.price ?? null,
        };
        delete (cleanNFT as any).nftImage;

        if (walletDoc.exists()) {
            await updateDoc(walletRef, {
                nfts: arrayUnion(cleanNFT),
                updatedAt: new Date().toISOString()
            });
        } else {
            await setDoc(walletRef, {
                userId,
                address: generateWalletAddress(),
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

export const removeNFTFromWallet = async (userId: string, nftId: string) => {
    try {
        if (!userId) throw new Error('No user ID');
        const walletRef = doc(db, 'marki_wallets', userId);
        const walletDoc = await getDoc(walletRef);

        if (walletDoc.exists()) {
            const nfts: NFT[] = walletDoc.data().nfts || [];

            // arrayRemove НЕ працює якщо об'єкт змінився (forSale, price і т.д.)
            // Фільтруємо масив вручну і перезаписуємо повністю
            const filtered = nfts.filter(n => n.id !== nftId);

            if (filtered.length < nfts.length) {
                await updateDoc(walletRef, {
                    nfts: filtered,
                    updatedAt: new Date().toISOString()
                });
                return { success: true };
            }
        }
        return { success: false, error: 'NFT not found' };
    } catch (error: any) {
        console.error('Error removing NFT:', error);
        return { success: false, error: error.message };
    }
};

// Оновити NFT у гаманці (наприклад змінити forSale/price)
export const updateNFTInWallet = async (userId: string, updatedNFT: NFT) => {
    try {
        const walletRef = doc(db, 'marki_wallets', userId);
        const walletDoc = await getDoc(walletRef);
        if (!walletDoc.exists()) return { success: false, error: 'Wallet not found' };

        const nfts: NFT[] = walletDoc.data().nfts || [];
        const updated = nfts.map(n => n.id === updatedNFT.id ? updatedNFT : n);
        await updateDoc(walletRef, { nfts: updated, updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ─── КРИПТО ГАМАНЦІ ──────────────────────────────────────────────────────────

export const getCryptoWallets = async (userId: string): Promise<CryptoWallet[]> => {
    try {
        if (!userId) return [];
        const ref = doc(db, 'crypto_wallets', userId);
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data().wallets || []) : [];
    } catch (error) {
        console.error('Error getting crypto wallets:', error);
        return [];
    }
};

export const addCryptoWallet = async (userId: string, wallet: Omit<CryptoWallet, 'id' | 'connectedAt' | 'lastUsed'>) => {
    try {
        if (!userId) throw new Error('No user ID');
        const ref = doc(db, 'crypto_wallets', userId);
        const snap = await getDoc(ref);

        const newWallet: CryptoWallet = {
            ...wallet,
            id: `wallet_${Date.now()}`,
            connectedAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        if (snap.exists()) {
            const exists = (snap.data().wallets || []).some((w: CryptoWallet) => w.address === wallet.address);
            if (exists) return { success: false, error: 'Wallet already connected' };
            await updateDoc(ref, { wallets: arrayUnion(newWallet) });
        } else {
            await setDoc(ref, { userId, wallets: [newWallet] });
        }
        return { success: true, wallet: newWallet };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const removeCryptoWallet = async (userId: string, walletId: string) => {
    try {
        const ref = doc(db, 'crypto_wallets', userId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const wallet = (snap.data().wallets || []).find((w: CryptoWallet) => w.id === walletId);
            if (wallet) await updateDoc(ref, { wallets: arrayRemove(wallet) });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateCryptoBalance = async (userId: string, walletId: string, balance: number) => {
    try {
        const ref = doc(db, 'crypto_wallets', userId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const wallets: CryptoWallet[] = snap.data().wallets || [];
            const idx = wallets.findIndex(w => w.id === walletId);
            if (idx !== -1) {
                wallets[idx] = { ...wallets[idx], balance, lastUsed: new Date().toISOString() };
                await updateDoc(ref, { wallets });
            }
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ─── TRANSFER ГРОШЕЙ ПРОДАВЦЮ ─────────────────────────────────────────────────
// Знаходить перший гаманець з правильною валютою і додає кошти
export const addFundsToSeller = async (sellerId: string, amount: number, currency: string) => {
    try {
        if (!sellerId || sellerId === 'demo_seller') return { success: true }; // demo — пропускаємо

        const ref = doc(db, 'crypto_wallets', sellerId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return { success: false, error: 'Seller has no wallets' };

        const wallets: CryptoWallet[] = snap.data().wallets || [];
        const idx = wallets.findIndex(w => w.currency === currency);
        if (idx === -1) return { success: false, error: 'Seller has no matching wallet' };

        wallets[idx] = {
            ...wallets[idx],
            balance: wallets[idx].balance + amount,
            lastUsed: new Date().toISOString()
        };
        await updateDoc(ref, { wallets });
        return { success: true };
    } catch (error: any) {
        console.error('addFundsToSeller error:', error);
        return { success: false, error: error.message };
    }
};

const generateWalletAddress = (): string =>
    '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');