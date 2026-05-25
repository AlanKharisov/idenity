import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    FacebookAuthProvider,
    OAuthProvider,
    UserCredential
} from 'firebase/auth';
import { auth } from './config';
import { apiMe, apiRegister } from '../services/apiClient';

const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Google sign-in
export const signInWithGoogle = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
        const provider = new GoogleAuthProvider();
        if (isMobile()) {
            await signInWithRedirect(auth, provider);
            return { success: true };
        }
        const result   = await signInWithPopup(auth, provider);
        return await handleSocialAuthResult(result);
    } catch (error: any) {
        console.error('Google sign in error:', error);
        return { success: false, error: error.message };
    }
};

// Facebook sign-in
export const signInWithFacebook = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
        const provider = new FacebookAuthProvider();
        if (isMobile()) {
            await signInWithRedirect(auth, provider);
            return { success: true };
        }
        const result   = await signInWithPopup(auth, provider);
        return await handleSocialAuthResult(result);
    } catch (error: any) {
        console.error('Facebook sign in error:', error);
        return { success: false, error: error.message };
    }
};

// Apple sign-in
export const signInWithApple = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
        const provider = new OAuthProvider('apple.com');
        if (isMobile()) {
            await signInWithRedirect(auth, provider);
            return { success: true };
        }
        const result   = await signInWithPopup(auth, provider);
        return await handleSocialAuthResult(result);
    } catch (error: any) {
        console.error('Apple sign in error:', error);
        return { success: false, error: error.message };
    }
};

// After Firebase popup succeeds, ensure user exists in Rust backend
const handleSocialAuthResult = async (result: UserCredential) => {
    const fbUser = result.user;
    try {
        // Check if user already registered in Rust API
        const existing = await apiMe().catch(() => null);
        if (existing) {
            return { success: true, user: existing };
        }

        // New user — register in Rust backend
        const displayName = fbUser.displayName || 'User';
        const nameParts   = displayName.split(' ');
        const username    = (nameParts[0] || 'user').toLowerCase() + fbUser.uid.slice(-4);

        await apiRegister({
            uid:      fbUser.uid,
            name:     displayName,
            username,
            email:    fbUser.email || '',
        });

        const userData = await apiMe();
        return { success: true, user: userData };
    } catch (error: any) {
        console.error('Social auth backend sync error:', error);
        return { success: false, error: error.message };
    }
};
