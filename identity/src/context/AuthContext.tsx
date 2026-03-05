import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getLocationFromCoords, getLocationByIP } from '../services/geocoding';

export interface UserData {
    uid: string;
    name: string;
    username: string;
    email: string;
    phone?: string;
    avatar?: string;
    location?: string;
    bio?: string;
    createdAt: string;
}

interface AuthContextType {
    currentUser: UserData | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; user?: UserData; error?: string }>;
    register: (email: string, password: string, name: string, username: string, phone?: string) => Promise<{ success: boolean; user?: UserData; error?: string }>;
    logout: () => Promise<{ success: boolean; error?: string }>;
    updateUserLocation: (location: string) => Promise<void>;
    updateUserProfile: (data: { name?: string; bio?: string; avatar?: string; username?: string }) => Promise<void>;
    refreshLocation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const createWalletForUser = async (userId: string, email: string) => {
    try {
        const walletRef = doc(db, 'wallets', userId);
        const walletData = {
            address: '0x' + Array.from({ length: 40 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join(''),
            email,
            password: 'default',
            recoveryPhrase: generateRecoveryPhrase(),
            balance: { ICP: 100, POLYGON: 50, SOLANA: 25 },
            nfts: [],
            createdAt: new Date().toISOString()
        };
        await setDoc(walletRef, walletData);
        return walletData;
    } catch (error) {
        console.error('Error creating wallet:', error);
        return null;
    }
};

const generateRecoveryPhrase = (): string => {
    const words = ['Galaxy', 'Bamboo', 'Velvet', 'Pyramid', 'Harmony', 'Rocket', 'Symbol', 'Orbit', 'Wisdom', 'Foil', 'Trophy', 'Harbor'];
    return words.join(' ');
};

// ← ВИПРАВЛЕНО: геолокація з таймаутом 3 секунди — не висить вічно
const getUserLocation = async (): Promise<string> => {
    try {
        const timeout = new Promise<string>((resolve) =>
            setTimeout(() => resolve('Unknown location'), 3000)
        );

        const ipLocationPromise = getLocationByIP().then(loc => loc || '').catch(() => '');
        const ipLocation = await Promise.race([ipLocationPromise, timeout]);

        if (ipLocation && ipLocation !== 'Unknown location') return ipLocation;

        if (navigator.geolocation) {
            return new Promise((resolve) => {
                const geoTimeout = setTimeout(() => resolve('Unknown location'), 4000);
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        clearTimeout(geoTimeout);
                        const { latitude, longitude } = position.coords;
                        const locationName = await getLocationFromCoords(latitude, longitude).catch(() => null);
                        resolve(locationName || 'Unknown location');
                    },
                    () => {
                        clearTimeout(geoTimeout);
                        resolve('Unknown location');
                    },
                    { timeout: 4000 }
                );
            });
        }

        return 'Unknown location';
    } catch {
        return 'Unknown location';
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    const updateUserLocation = async (location: string) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), { location });
            setCurrentUser(prev => prev ? { ...prev, location } : null);
        } catch (error) {
            console.error('Error updating location:', error);
        }
    };

    const updateUserProfile = async (data: { name?: string; bio?: string; avatar?: string; username?: string }) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), data);
            setCurrentUser(prev => prev ? { ...prev, ...data } : null);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const refreshLocation = async () => {
        if (!currentUser) return;
        const location = await getUserLocation();
        await updateUserLocation(location);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    const userRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userRef);

                    if (userDoc.exists()) {
                        setCurrentUser(userDoc.data() as UserData);
                    } else {
                        // ← ВИПРАВЛЕНО: геолокація не блокує — запускаємо паралельно
                        const location = await getUserLocation();

                        const newUser: UserData = {
                            uid: user.uid,
                            name: user.displayName || 'User',
                            username: (user.email?.split('@')[0] || 'user') + Math.floor(Math.random() * 1000),
                            email: user.email || '',
                            avatar: user.photoURL || '/img/default-avatar.png',
                            location,
                            bio: '',
                            createdAt: new Date().toISOString()
                        };

                        await setDoc(userRef, newUser);
                        await createWalletForUser(user.uid, user.email || '');
                        setCurrentUser(newUser);
                    }
                } else {
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error('Auth state change error:', error);
                setCurrentUser(null);
            } finally {
                // ← ВИПРАВЛЕНО: setLoading(false) викликається ЗАВЖДИ
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const login = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const register = async (email: string, password: string, name: string, username: string, phone?: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(result.user, { displayName: name });

            const location = await getUserLocation();
            const newUser: UserData = {
                uid: result.user.uid,
                name,
                username,
                email,
                phone: phone || '',
                avatar: '/img/default-avatar.png',
                location,
                bio: '',
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', result.user.uid), newUser);
            await createWalletForUser(result.user.uid, email);

            return { success: true, user: newUser };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            loading,
            login,
            register,
            logout,
            updateUserLocation,
            updateUserProfile,
            refreshLocation
        }}>
            {/* ← ВИПРАВЛЕНО: завжди рендеримо children, loading передаємо через контекст */}
            {children}
        </AuthContext.Provider>
    );
};