import React, { useState } from 'react';
import { formatTime } from '../utils/formatters';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import { notifyLike, notifyComment } from '../firebase/notifications';
import BuyModal from './BuyModal';

const DEFAULT_AVATAR = '/img/default-avatar.png';

const HomePage: React.FC = () => {
    const { posts, loading, likePost, addComment, refreshPosts } = usePosts();
    const { currentUser } = useAuth();

    const [searchQuery, setSearchQuery]   = useState('');
    const [newComment, setNewComment]     = useState<Record<string, string>>({});
    const [selectedPost, setSelectedPost] = useState<string | null>(null);
    const [buyNft, setBuyNft]             = useState<any | null>(null);

    const filteredPosts = posts.filter(post => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            post.title?.toLowerCase().includes(q) ||
            post.description?.toLowerCase().includes(q) ||
            post.tags?.some(tag => tag.toLowerCase().includes(q))
        );
    });

    const handleLike = async (post: any) => {
        if (!post.id || !currentUser) return;
        await likePost(post.id);
        if (post.userId && post.userId !== currentUser.uid) {
            await notifyLike(post.userId, post.title, currentUser.name || 'Someone');
        }
    };

    const handleAddComment = async (post: any) => {
        const text = (newComment[post.id] || '').trim();
        if (!text || !currentUser || !post.id) return;
        await addComment(post.id, text);
        setNewComment(prev => ({ ...prev, [post.id]: '' }));
        if (post.userId && post.userId !== currentUser.uid) {
            await notifyComment(post.userId, post.title, currentUser.name || 'Someone', text);
        }
    };

    // Після успішної купівлі — оновлюємо стрічку
    const handleBuySuccess = () => {
        setBuyNft(null);
        refreshPosts();
    };

    if (loading) {
        return (
            <div className="page home-page active">
                <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
                    <p style={{ color: '#888' }}>Loading NFTs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page home-page active">

            {/* Пошук */}
            <div className="search-bar">
                <i className="fas fa-bars menu-icon"></i>
                <div className="search-input">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search NFTs..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <i className="fas fa-ellipsis-v menu-icon"></i>
            </div>

            {filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎨</div>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>No NFTs yet</p>
                    <p style={{ fontSize: '13px' }}>Be the first to create an NFT!</p>
                </div>
            ) : (
                filteredPosts.map(post => (
                    <div key={post.id} className="nft-post">

                        {/* Автор — аватар завжди з onError fallback */}
                        <div className="user-info">
                            <div className="avatar">
                                <img
                                    src={post.userAvatar || DEFAULT_AVATAR}
                                    alt="Avatar"
                                    onError={e => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = DEFAULT_AVATAR;
                                    }}
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
                                {post.tags.map(tag => <div key={tag} className="tag">#{tag}</div>)}
                            </div>
                        )}

                        {/* ← ЗОБРАЖЕННЯ: nftImage — поле яке зберігається в posts */}
                        <div className="nft-content">
                            <div className="nft-image">
                                <img
                                    src={post.nftImage || '/img/default-nft.png'}
                                    alt={post.title}
                                    style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', display: 'block' }}
                                    onError={e => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/img/default-nft.png';
                                    }}
                                />
                            </div>
                            {(post as any).blockchain && (
                                <div style={{ padding: '6px 0', fontSize: '12px', color: '#888', display: 'flex', gap: '10px' }}>
                                    <span>⛓ {(post as any).blockchain}</span>
                                    {(post as any).price && (
                                        <span style={{ color: '#01ff77', fontWeight: 'bold' }}>
                                            {(post as any).price} {(post as any).currency || 'ETH'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Дії */}
                        <div className="post-actions">
                            <div className="action-left">
                                <div className="like-btn" style={{ cursor: 'pointer' }} onClick={() => handleLike(post)}>
                                    <i className={post.liked ? 'fas fa-heart' : 'far fa-heart'}
                                       style={{ color: post.liked ? '#ff4466' : undefined }} />
                                    <span style={{ marginLeft: '4px' }}>{post.likes || 0}</span>
                                </div>
                                <div className="comment-btn" style={{ cursor: 'pointer' }}
                                     onClick={() => post.id && setSelectedPost(selectedPost === post.id ? null : post.id)}>
                                    <i className="far fa-comment" />
                                    <span style={{ marginLeft: '4px' }}>{post.comments?.length || 0}</span>
                                </div>
                                <div className="share-btn" style={{ cursor: 'pointer' }}
                                     onClick={() => navigator.share?.({ title: post.title, text: post.description, url: window.location.href }).catch(() => {})}>
                                    <i className="fas fa-share" />
                                </div>
                            </div>

                            {/* Buy — тільки якщо forSale і не власний пост */}
                            {(post as any).forSale &&
                                (post as any).price &&
                                post.userId !== currentUser?.uid && (
                                    <button
                                        className="buy-btn"
                                        onClick={() => setBuyNft(post)}
                                    >
                                        Buy {(post as any).price} {(post as any).currency || 'ETH'}
                                    </button>
                                )}
                        </div>

                        {/* Коментарі */}
                        {selectedPost === post.id && (
                            <div className="comments-section">
                                <div className="comment-form">
                                    <input
                                        type="text"
                                        className="comment-input"
                                        placeholder="Write a comment..."
                                        value={newComment[post.id || ''] || ''}
                                        onChange={e => setNewComment(prev => ({ ...prev, [post.id!]: e.target.value }))}
                                        onKeyUp={e => { if (e.key === 'Enter') handleAddComment(post); }}
                                    />
                                    <button className="comment-submit" onClick={() => handleAddComment(post)}>Post</button>
                                </div>
                                <div className="comment-list">
                                    {post.comments?.map(comment => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="comment-avatar">
                                                <img
                                                    src={comment.userAvatar || DEFAULT_AVATAR}
                                                    alt="Avatar"
                                                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                                />
                                            </div>
                                            <div className="comment-content">
                                                <div className="comment-user">{comment.userName}</div>
                                                <div className="comment-text">{comment.text}</div>
                                                <div className="comment-time">{formatTime(comment.createdAt)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}

            {/* Модалка купівлі */}
            {buyNft && (
                <BuyModal
                    nft={buyNft}
                    onClose={() => setBuyNft(null)}
                    onSuccess={handleBuySuccess}
                />
            )}
        </div>
    );
};

export default HomePage;