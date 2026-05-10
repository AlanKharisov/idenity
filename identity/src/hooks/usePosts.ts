import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetPosts, apiCreatePost, apiLikePost, apiAddComment } from '../services/apiClient';
import { moderateText } from '../utils/contentModeration';

export interface PostWithLiked {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    nftImage?: string;
    title: string;
    description: string;
    tags?: string[];
    blockchain?: string;
    price?: number;
    currency?: string;
    forSale?: boolean;
    walletNftId?: string;
    likes: number;
    likedBy?: string[];
    comments?: any[];
    createdAt: string;
    liked: boolean;
}

export const usePosts = () => {
    const [posts, setPosts]   = useState<PostWithLiked[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser }     = useAuth();

    useEffect(() => { loadPosts(); }, [currentUser]); // eslint-disable-line

    const loadPosts = async () => {
        setLoading(true);
        try {
            const data = await apiGetPosts();
            const mapped = (data || []).map((p: any) => ({
                id:          p.id,
                userId:      p.userId,
                userName:    p.userName,
                userAvatar:  p.userAvatar,
                nftImage:    p.nftImage,
                title:       p.title,
                description: p.description,
                tags:        p.tags || [],
                blockchain:  p.blockchain,
                price:       p.price,
                currency:    p.currency,
                forSale:     p.forSale,
                walletNftId: p.walletNftId,
                likes:       p.likes || 0,
                likedBy:     p.likedBy || [],
                comments:    (p.comments || []).map((c: any) => ({
                    id:         c.id,
                    userId:     c.userId,
                    userName:   c.userName,
                    userAvatar: c.userAvatar,
                    text:       c.text,
                    createdAt:  c.createdAt,
                })),
                createdAt:   p.createdAt,
                liked: currentUser ? (p.likedBy || []).includes(currentUser.uid) : false,
            }));
            setPosts(mapped);
        } catch (e) {
            console.error('Error loading posts:', e);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const addPost = async (postData: {
        image: string;
        title: string;
        description: string;
        tags?: string[];
        forSale?: boolean;
        price?: number | null;
        currency?: string;
        walletNftId?: string;
    }) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            await apiCreatePost({
                nftImage:    postData.image,
                title:       postData.title,
                description: postData.description,
                tags:        postData.tags || [],
                forSale:     postData.forSale || false,
                price:       postData.price ?? null,
                currency:    postData.currency,
                walletNftId: postData.walletNftId,
            });
            await loadPosts();
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const handleLike = async (postId: string) => {
        if (!currentUser) return;
        try {
            await apiLikePost(postId);
            setPosts(prev => prev.map(p => {
                if (p.id !== postId) return p;
                const wasLiked = p.liked;
                return { ...p, liked: !wasLiked, likes: wasLiked ? p.likes - 1 : p.likes + 1 };
            }));
        } catch (e) { console.error('Like error:', e); }
    };

    const handleAddComment = async (postId: string, text: string) => {
        if (!currentUser || !text.trim()) return;
        try {
            const comment = await apiAddComment(postId, moderateText(text));
            setPosts(prev => prev.map(p =>
                p.id === postId
                    ? { ...p, comments: [...(p.comments || []), comment] }
                    : p
            ));
        } catch (e) { console.error('Comment error:', e); }
    };

    return {
        posts,
        loading,
        addPost,
        likePost:     handleLike,
        addComment:   handleAddComment,
        refreshPosts: loadPosts,
    };
};
