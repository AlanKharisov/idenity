import React, { useState } from 'react';
import { formatTime } from '../utils/formatters';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
    const { posts, loading, likePost, addComment } = usePosts();
    const { currentUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [newComment, setNewComment] = useState('');
    const [selectedPost, setSelectedPost] = useState<string | null>(null);

    // Фильтрация постов
    const filteredPosts = posts.filter(post => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            post.title?.toLowerCase().includes(query) ||
            post.description?.toLowerCase().includes(query) ||
            post.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    });

    const handleBuyNFT = (post: any) => {
        if (!currentUser) {
            alert('Please login to buy NFTs');
            return;
        }
        alert(`Demo: You want to buy "${post.title}" NFT. In production, this would connect to a payment system.`);
    };

    const toggleComments = (postId: string) => {
        setSelectedPost(selectedPost === postId ? null : postId);
    };

    const handleAddComment = (postId: string) => {
        if (!newComment.trim() || !currentUser) return;
        addComment(postId, newComment);
        setNewComment('');
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
    }

    return (
        <div className="page home-page active">
            <div className="search-bar">
                <i className="fas fa-bars menu-icon"></i>
                <div className="search-input">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search NFTs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <i className="fas fa-ellipsis-v menu-icon"></i>
            </div>

            {filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                    No posts yet. Be the first to create an NFT!
                </div>
            ) : (
                filteredPosts.map(post => (
                    <div key={post.id} className="nft-post">
                        <div className="user-info">
                            <div className="avatar">
                                <img
                                    src={post.userAvatar || '/img/default-avatar.png'}
                                    alt="User Avatar"
                                />
                            </div>
                            <div>
                                <div className="username">{post.userName}</div>
                                <div className="post-time">{formatTime(post.createdAt)}</div>
                            </div>
                        </div>

                        <div className="nft-title">{post.title}</div>
                        <div className="nft-description">{post.description}</div>

                        {post.tags && post.tags.length > 0 && (
                            <div className="tags">
                                {post.tags.map(tag => (
                                    <div key={tag} className="tag">#{tag}</div>
                                ))}
                            </div>
                        )}

                        <div className="nft-content">
                            <div className="nft-image">
                                <img
                                    src={post.nftImage || '/img/default-nft.png'}
                                    alt="NFT Image"
                                />
                            </div>
                            <div className="sound-wave">Sound Wave Visualization</div>
                        </div>

                        <div className="post-actions">
                            <div className="action-left">
                                <div
                                    className="like-btn"
                                    onClick={() => post.id && likePost(post.id)}
                                >
                                    <i className={`far fa-heart ${post.liked ? 'fas' : ''}`}></i>
                                    {post.likes || 0}
                                </div>
                                <div
                                    className="comment-btn"
                                    onClick={() => post.id && toggleComments(post.id)}
                                >
                                    <i className="far fa-comment"></i>
                                    {post.comments?.length || 0}
                                </div>
                                <div className="share-btn">
                                    <i className="fas fa-share"></i>
                                </div>
                            </div>
                            <button className="buy-btn">Buy</button>
                        </div>

                        {selectedPost === post.id && (
                            <div className="comments-section">
                                <div className="comment-form">
                                    <input
                                        type="text"
                                        className="comment-input"
                                        placeholder="Write a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyUp={(e) => e.key === 'Enter' && post.id && handleAddComment(post.id)}
                                    />
                                    <button
                                        className="comment-submit"
                                        onClick={() => post.id && handleAddComment(post.id)}
                                    >
                                        Post
                                    </button>
                                </div>

                                <div className="comment-list">
                                    {post.comments?.map(comment => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="comment-avatar">
                                                <img
                                                    src={comment.userAvatar || '/img/default-avatar.png'}
                                                    alt="User Avatar"
                                                />
                                            </div>
                                            <div className="comment-content">
                                                <div className="comment-user">{comment.userName}</div>
                                                <div className="comment-text">{comment.text}</div>
                                                <div className="comment-time">
                                                    {formatTime(comment.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default HomePage;