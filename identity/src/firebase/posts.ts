import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    arrayUnion,
    getDoc,
    Timestamp
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
    likedBy: string[];  // массив ID пользователей, кто лайкнул
    comments: Comment[];
    createdAt: string;
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: string;
}

// Создание поста
export const createPost = async (postData: Omit<Post, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>) => {
    try {
        const newPost = {
            ...postData,
            likes: 0,
            likedBy: [],
            comments: [],
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'posts'), newPost);
        return { success: true, id: docRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// Получение всех постов
export const getPosts = async () => {
    try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const posts: Post[] = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() } as Post);
        });

        return { success: true, posts };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// Лайк поста
// Лайк поста
export const likePost = async (postId: string, userId: string) => {
    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
            const postData = postDoc.data();
            const likedBy = postData.likedBy || [];

            if (!likedBy.includes(userId)) {
                // Добавляем лайк
                await updateDoc(postRef, {
                    likes: (postData.likes || 0) + 1,
                    likedBy: arrayUnion(userId)
                });
            } else {
                // Убираем лайк (если нужно реализовать дизлайк)
                await updateDoc(postRef, {
                    likes: Math.max((postData.likes || 0) - 1, 0),
                    likedBy: likedBy.filter((id: string) => id !== userId)
                });
            }
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error liking post:', error);
        return { success: false, error: error.message };
    }
};

// Добавление комментария
export const addComment = async (postId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => {
    try {
        const newComment = {
            ...comment,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };

        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            comments: arrayUnion(newComment)
        });

        return { success: true, comment: newComment };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// Загрузка изображения
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