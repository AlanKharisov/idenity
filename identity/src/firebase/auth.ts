import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

export interface UserData {
    uid: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    location?: string;
    bio?: string;
    createdAt: string;
}

// Регистрация
export const signUp = async (
    email: string,
    password: string,
    name: string,
    phone?: string
): Promise<{ success: boolean; user?: UserData; error?: string }> => {
    try {
        // Создаем пользователя в Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Обновляем профиль с именем
        await updateProfile(user, {
            displayName: name
        });

        // Создаем документ пользователя в Firestore
        const userData: UserData = {
            uid: user.uid,
            name,
            email,
            phone: phone || '',
            avatar: '/img/default-avatar.png',
            location: '',
            bio: '',
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userData);

        return { success: true, user: userData };
    } catch (error: any) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
};

// Вход
export const signIn = async (
    email: string,
    password: string
): Promise<{ success: boolean; user?: UserData; error?: string }> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Получаем дополнительные данные из Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            return { success: true, user: userData };
        } else {
            // Если документа нет, создаем базовый
            const userData: UserData = {
                uid: user.uid,
                name: user.displayName || 'User',
                email: user.email || email,
                avatar: '/img/default-avatar.png',
                location: '',
                bio: '',
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', user.uid), userData);
            return { success: true, user: userData };
        }
    } catch (error: any) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
};

// Выход
export const logOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error: any) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
};