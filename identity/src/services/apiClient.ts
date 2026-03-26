import { auth } from '../firebase/config';

const BASE_URL = 'http://localhost:8081';

async function getToken(): Promise<string | null> {
    try {
        return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
        return null;
    }
}

async function req<T>(
    method: string,
    path: string,
    body?: any,
    asForm = false
): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body && !asForm) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: asForm ? body : body != null ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const msg = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(msg || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
}

const get       = <T>(path: string)                    => req<T>('GET',    path);
const post      = <T>(path: string, b?: any)           => req<T>('POST',   path, b);
const put       = <T>(path: string, b?: any)           => req<T>('PUT',    path, b);
const del       = <T>(path: string)                    => req<T>('DELETE', path);
const postForm  = <T>(path: string, form: FormData)    => req<T>('POST',   path, form, true);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const apiRegister = (d: {
    uid: string; name: string; username: string; email: string; phone?: string;
}) => post<any>('/api/auth/register', d);

export const apiMe = () => get<any>('/api/auth/me');

// ── Profile ───────────────────────────────────────────────────────────────────
export const apiGetProfile    = (uid: string)          => get<any>(`/api/profile/${uid}`);
export const apiUpdateProfile = (uid: string, d: any)  => put<any>(`/api/profile/${uid}`, d);

export const apiUploadAvatar = (uid: string, file: File) => {
    const f = new FormData();
    f.append('avatar', file);
    return postForm<{ url: string }>(`/api/profile/${uid}/avatar`, f);
};

export const apiChangePassword = (uid: string, d: { newPassword: string }) =>
    put<any>(`/api/profile/${uid}/password`, d);

export const apiRequestApproval = (uid: string, d: {
    companyName: string;
    registrationNumber: string;
    contactEmail: string;
    description: string;
}) => post<any>(`/api/profile/${uid}/request-approval`, d);

// ── Marki Wallet ──────────────────────────────────────────────────────────────
export const apiGetMarkiWallet    = ()                    => get<any>('/api/wallets/marki');
export const apiUpdateMarkiEmail  = (newEmail: string)    => put<any>('/api/wallets/marki/email', { newEmail });
export const apiUpdateFingerprint = (enabled: boolean)    => put<any>('/api/wallets/marki/fingerprint', { enabled });

// ── Crypto Wallets (Phantom only) ─────────────────────────────────────────────
export const apiGetCryptoWallets    = ()                  => get<any[]>('/api/wallets/crypto');
export const apiAddCryptoWallet     = (d: { address: string; label?: string }) =>
    post<any>('/api/wallets/crypto', d);
export const apiRemoveCryptoWallet  = (id: string)        => del<any>(`/api/wallets/crypto/${id}`);
export const apiRefreshWalletBalance = (id: string)       => put<any>(`/api/wallets/crypto/${id}/balance`);

// ── NFTs ──────────────────────────────────────────────────────────────────────
export const apiGetNFTs   = ()                            => get<any[]>('/api/nfts');
export const apiCreateNFT = (form: FormData)              => postForm<any>('/api/nfts', form);
export const apiUpdateNFT = (id: string, d: any)          => put<any>(`/api/nfts/${id}`, d);
export const apiDeleteNFT = (id: string)                  => del<any>(`/api/nfts/${id}`);
export const apiBatchCreate = (form: FormData)             => postForm<any>('/api/nfts/batch', form);

// ── Posts ─────────────────────────────────────────────────────────────────────
export const apiGetPosts   = ()                           => get<any[]>('/api/posts');
export const apiCreatePost = (d: any)                     => post<any>('/api/posts', d);
export const apiDeletePost = (id: string)                 => del<any>(`/api/posts/${id}`);
export const apiLikePost   = (id: string)                 => post<any>(`/api/posts/${id}/like`);
export const apiAddComment = (id: string, text: string)   => post<any>(`/api/posts/${id}/comments`, { text });

// ── Marketplace ───────────────────────────────────────────────────────────────
export const apiBuyNFT = (d: {
    postId: string;
    buyerWalletId: string;
    nftId: string;
}) => post<any>('/api/marketplace/buy', d);

export const apiCashOnDelivery = (d: {
    postId: string;
    nftId: string;
    deliveryAddress: string;
    currency: string;
}) => post<any>('/api/marketplace/cod', d);

// ── Notifications ─────────────────────────────────────────────────────────────
export const apiGetNotifications   = ()                   => get<any[]>('/api/notifications');
export const apiMarkRead           = (id: string)         => put<any>(`/api/notifications/${id}/read`);
export const apiMarkAllRead        = ()                   => put<any>('/api/notifications/read-all');
export const apiDeleteNotification = (id: string)         => del<any>(`/api/notifications/${id}`);
