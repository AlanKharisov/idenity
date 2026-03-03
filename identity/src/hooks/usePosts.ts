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

// Расширяем тип Post для UI с временным полем liked
interface PostWithLiked extends Post {
    liked: boolean;
}

export const usePosts = () => {
    const [posts, setPosts] = useState<PostWithLiked[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    // Загрузка постов
    useEffect(() => {
        loadPosts();
    }, [currentUser]);

    const loadPosts = async () => {
        setLoading(true);
        const result = await getPosts();
        if (result.success && result.posts) {
            // Добавляем поле liked для каждого поста
            const postsWithLiked = result.posts.map(post => ({
                ...post,
                liked: currentUser ? (post.likedBy || []).includes(currentUser.uid) : false
            }));
            setPosts(postsWithLiked);
        }
        setLoading(false);
    };

    // Создание поста
    // Создание поста
    const addPost = async (postData: any) => {
        if (!currentUser) {
            console.log('No current user');
            return { success: false, error: 'No user logged in' };
        }

        console.log('Creating post with data:', postData);

        const newPost = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userAvatar: currentUser.avatar || '/img/default-avatar.png',
            nftImage: postData.image || '/img/default-nft.png',
            title: postData.title,
            description: postData.description,
            tags: postData.tags || []
        };

        console.log('New post object:', newPost);

        const result = await createPost(newPost);
        console.log('Create post result:', result);

        if (result.success) {
            await loadPosts();
            return { success: true };
        }
        return result;
    };

    // Лайк поста
    const handleLike = async (postId: string) => {
        if (!currentUser) return;

        const result = await likePost(postId, currentUser.uid);
        if (result.success) {
            // Оптимистичное обновление UI
            setPosts(prevPosts =>
                prevPosts.map(post => {
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

    // Добавление комментария
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
            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post.id === postId
                        ? { ...post, comments: [...(post.comments || []), result.comment] }
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