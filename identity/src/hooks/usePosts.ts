import { useState, useEffect } from 'react';
import {
    getPosts,
    createPost,
    likePost,
    addComment,
    Post,
    Comment
} from '../firebase/posts';
import { useAuth } from '../context/AuthContext';

export interface PostWithLiked extends Post {
    liked: boolean;
}

export const usePosts = () => {
    const [posts, setPosts] = useState<PostWithLiked[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        loadPosts();
    }, [currentUser]);

    const loadPosts = async () => {
        setLoading(true);
        const result = await getPosts();
        if (result.success && result.posts) {
            const postsWithLiked = result.posts.map(post => ({
                ...post,
                liked: currentUser ? (post.likedBy || []).includes(currentUser.uid) : false
            }));
            setPosts(postsWithLiked);
        }
        setLoading(false);
    };

    // ← ВИПРАВЛЕНО: зберігаємо nftImage (відповідає Post інтерфейсу)
    const addPost = async (postData: {
        image: string;
        title: string;
        description: string;
        tags?: string[];
        category?: string;
        blockchain?: string;
        royalty?: number;
        price?: number | null;
        forSale?: boolean;
        currency?: string;
    }) => {
        if (!currentUser) return { success: false, error: 'No user logged in' };

        const newPost = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userAvatar: currentUser.avatar || '/img/default-avatar.png',
            nftImage: postData.image,   // ← image → nftImage
            title: postData.title,
            description: postData.description,
            tags: postData.tags || [],
            // Додаткові поля для NFT
            ...(postData.category   && { category: postData.category }),
            ...(postData.blockchain && { blockchain: postData.blockchain }),
            ...(postData.royalty    && { royalty: postData.royalty }),
            ...(postData.price      && { price: postData.price }),
            ...(postData.forSale    !== undefined && { forSale: postData.forSale }),
            ...(postData.currency   && { currency: postData.currency }),
        };

        const result = await createPost(newPost);
        if (result.success) {
            await loadPosts();
            return { success: true };
        }
        return result;
    };

    const handleLike = async (postId: string) => {
        if (!currentUser) return;
        const result = await likePost(postId, currentUser.uid);
        if (result.success) {
            setPosts(prev =>
                prev.map(post => {
                    if (post.id === postId) {
                        const wasLiked = post.liked;
                        return {
                            ...post,
                            liked: !wasLiked,
                            likes: wasLiked ? post.likes - 1 : post.likes + 1
                        };
                    }
                    return post;
                })
            );
        }
    };

    const handleAddComment = async (postId: string, text: string) => {
        if (!currentUser || !text.trim()) return;
        const comment = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userAvatar: currentUser.avatar || '/img/default-avatar.png',
            text
        };
        const result = await addComment(postId, comment);
        if (result.success && result.comment) {
            setPosts(prev =>
                prev.map(post =>
                    post.id === postId
                        ? { ...post, comments: [...(post.comments || []), result.comment!] }
                        : post
                )
            );
        }
    };

    return {
        posts,
        loading,
        addPost,
        likePost: handleLike,
        addComment: handleAddComment,
        refreshPosts: loadPosts
    };
};