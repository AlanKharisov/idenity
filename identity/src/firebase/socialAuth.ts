import {
    GoogleAuthProvider,
    signInWithPopup,
    FacebookAuthProvider,
    OAuthProvider,
    UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

// Google вход
export const signInWithGoogle = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return await handleSocialAuthResult(result);
    } catch (error: any) {
        console.error('Google sign in error:', error);
        return { success: false, error: error.message };
    }
};

// Facebook вход
export const signInWithFacebook = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
        const provider = new FacebookAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return await handleSocialAuthResult(result);
    } catch (error: any) {
        console.error('Facebook sign in error:', error);
        return { success: false, error: error.message };
    }
};

// Apple вход
export const signInWithApple = async (): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
        const provider = new OAuthProvider('apple.com');
        const result = await signInWithPopup(auth, provider);
        return await handleSocialAuthResult(result);
    } catch (error: any) {
        console.error('Apple sign in error:', error);
        return { success: false, error: error.message };
    }
};

// Обработка результата соц. входа
const handleSocialAuthResult = async (result: UserCredential) => {
    const user = result.user;

    // Проверяем, есть ли пользователь в Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
        // Создаем нового пользователя
        const userData = {
            uid: user.uid,
            name: user.displayName || 'User',
            email: user.email || '',
            avatar: user.photoURL || '/img/default-avatar.png',
            location: '',
            bio: '',
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userData);
        return { success: true, user: userData };
    } else {
        return { success: true, user: userDoc.data() };
    }
};