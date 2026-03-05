import {
    collection, addDoc, getDocs,
    doc, updateDoc, deleteDoc, arrayUnion, getDoc
} from 'firebase/firestore';
import { db } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export interface Post {
    id?: string;
    userId: string;
    userName: string;
    userAvatar: string;
    nftImage: string;
    title: string;
    description: string;
    tags: string[];
    likes: number;
    likedBy: string[];
    comments: Comment[];
    createdAt: string;
    forSale?: boolean;
    price?: number | null;
    currency?: string;
    walletNftId?: string;
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: string;
}

export const createPost = async (postData: Omit<Post, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>) => {
    try {
        const docRef = await addDoc(collection(db, 'posts'), {
            ...postData,
            likes: 0,
            likedBy: [],
            comments: [],
            createdAt: new Date().toISOString()
        });
        return { success: true, id: docRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// Без orderBy — сортуємо на клієнті (не потребує індексу)
export const getPosts = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'posts'));
        const posts = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }) as Post)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { success: true, posts };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ← НОВА: видалити пост повністю
export const deletePost = async (postId: string) => {
    try {
        await deleteDoc(doc(db, 'posts', postId));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const likePost = async (postId: string, userId: string) => {
    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const data    = postDoc.data();
            const likedBy = data.likedBy || [];
            if (!likedBy.includes(userId)) {
                await updateDoc(postRef, { likes: (data.likes || 0) + 1, likedBy: arrayUnion(userId) });
            } else {
                await updateDoc(postRef, {
                    likes:   Math.max((data.likes || 0) - 1, 0),
                    likedBy: likedBy.filter((id: string) => id !== userId)
                });
            }
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const addComment = async (postId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => {
    try {
        const newComment = { ...comment, id: Date.now().toString(), createdAt: new Date().toISOString() };
        await updateDoc(doc(db, 'posts', postId), { comments: arrayUnion(newComment) });
        return { success: true, comment: newComment };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const uploadImage = async (file: File, path: string) => {
    try {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return { success: true, url };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};