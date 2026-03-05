import {
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore';
import { db } from './config';

export type NotificationType =
    | 'purchase'
    | 'sale'
    | 'like'
    | 'comment'
    | 'welcome'
    | 'wallet'
    | 'system';

export interface AppNotification {
    id?: string;
    userId: string;
    type: NotificationType;
    title: string;
    text: string;
    read: boolean;
    createdAt: string;
    metadata?: {
        nftId?: string;
        nftTitle?: string;
        price?: number;
        currency?: string;
        fromUser?: string;
    };
}

export const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
        case 'purchase': return '🛒';
        case 'sale':     return '💰';
        case 'like':     return '❤️';
        case 'comment':  return '💬';
        case 'welcome':  return '🎉';
        case 'wallet':   return '💼';
        case 'system':   return '🔔';
        default:         return '🔔';
    }
};

export const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
        case 'purchase': return '#e3f2fd';
        case 'sale':     return '#e8f5e9';
        case 'like':     return '#fce4ec';
        case 'comment':  return '#f3e5f5';
        case 'welcome':  return '#fff8e1';
        case 'wallet':   return '#e0f7fa';
        case 'system':   return '#f5f5f5';
        default:         return '#f5f5f5';
    }
};

export const addNotification = async (
    notification: Omit<AppNotification, 'id'>
): Promise<string | null> => {
    try {
        const docRef = await addDoc(collection(db, 'notifications'), {
            ...notification,
            createdAt: new Date().toISOString(),
            read: false
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding notification:', error);
        return null;
    }
};

// ← БЕЗ orderBy у query — не потрібен індекс, сортуємо на клієнті
export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        })) as AppNotification[];

        return docs.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
        console.error('Error getting notifications:', error);
        return [];
    }
};

// ← БЕЗ orderBy — саме він і вимагав складний індекс
export const subscribeToNotifications = (
    userId: string,
    callback: (notifications: AppNotification[]) => void
): (() => void) => {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        })) as AppNotification[];

        const sorted = notifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        callback(sorted);
    }, (error) => {
        console.error('Notification listener error:', error);
    });

    return unsubscribe;
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
        console.error('Error marking as read:', error);
    }
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
    try {
        const notifications = await getNotifications(userId);
        const unread = notifications.filter(n => !n.read && n.id);
        await Promise.all(
            unread.map(n => updateDoc(doc(db, 'notifications', n.id!), { read: true }))
        );
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
};

// ─── ХЕЛПЕРИ ─────────────────────────────────────────────────────────────────

export const notifyPurchase = async (
    buyerId: string, nftTitle: string, price: number, currency: string
) => addNotification({
    userId: buyerId, type: 'purchase',
    title: 'NFT Purchased! 🛒',
    text: `You bought "${nftTitle}" for ${price} ${currency}`,
    read: false, createdAt: new Date().toISOString(),
    metadata: { nftTitle, price, currency }
});

export const notifySale = async (
    sellerId: string, nftTitle: string, price: number, currency: string, buyerName: string
) => addNotification({
    userId: sellerId, type: 'sale',
    title: 'NFT Sold! 💰',
    text: `"${nftTitle}" sold to ${buyerName} for ${price} ${currency}`,
    read: false, createdAt: new Date().toISOString(),
    metadata: { nftTitle, price, currency, fromUser: buyerName }
});

export const notifyLike = async (
    ownerId: string, nftTitle: string, fromUserName: string
) => addNotification({
    userId: ownerId, type: 'like',
    title: 'New Like ❤️',
    text: `${fromUserName} liked your NFT "${nftTitle}"`,
    read: false, createdAt: new Date().toISOString(),
    metadata: { nftTitle, fromUser: fromUserName }
});

export const notifyComment = async (
    ownerId: string, nftTitle: string, fromUserName: string, commentText: string
) => addNotification({
    userId: ownerId, type: 'comment',
    title: 'New Comment 💬',
    text: `${fromUserName} commented on "${nftTitle}": "${commentText.slice(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
    read: false, createdAt: new Date().toISOString(),
    metadata: { nftTitle, fromUser: fromUserName }
});

export const notifyWelcome = async (userId: string, userName: string) =>
    addNotification({
        userId, type: 'welcome',
        title: 'Welcome to MARKIdentity! 🎉',
        text: `Hi ${userName}! Your Marki Wallet is ready. Create your first NFT!`,
        read: false, createdAt: new Date().toISOString()
    });

export const notifyNFTCreated = async (userId: string, nftTitle: string) =>
    addNotification({
        userId, type: 'wallet',
        title: 'NFT Created! 🎨',
        text: `"${nftTitle}" has been created and added to your Marki Wallet.`,
        read: false, createdAt: new Date().toISOString(),
        metadata: { nftTitle }
    });