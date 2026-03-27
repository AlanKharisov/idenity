import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatTime } from '../utils/formatters';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import BuyModal from './BuyModal';
import HistoryView from './HistoryView';
import { useViewHistory } from '../hooks/useViewHistory';

const DEFAULT_AVATAR = '/img/default-avatar.png';

const FILTER_OPTIONS = ['All', 'For Sale', 'Art', 'Music', 'Photography', 'Gaming', '3D', 'Collectible'];

const HomePage: React.FC = () => {
    const { posts, loading, likePost, addComment, refreshPosts } = usePosts();
    const { currentUser } = useAuth();

    const [searchQuery, setSearchQuery]     = useState('');
    const [newComment, setNewComment]       = useState<Record<string, string>>({});
    const [selectedPost, setSelectedPost]   = useState<string | null>(null);
    const [buyNft, setBuyNft]               = useState<any | null>(null);

    // ── Hamburger menu ────────────────────────────────────────────────────────
    const [hamburgerOpen, setHamburgerOpen] = useState(false);
    // ── History panel ─────────────────────────────────────────────────────────
    const [historyOpen, setHistoryOpen]     = useState(false);
    // ── Filter menu ───────────────────────────────────────────────────────────
    const [filterOpen, setFilterOpen]       = useState(false);
    const [activeFilter, setActiveFilter]   = useState('All');
    const filterRef = useRef<HTMLDivElement>(null);

    // ── View history (IntersectionObserver) ───────────────────────────────────
    const { attachObserver } = useViewHistory();

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredPosts = posts.filter(post => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q || (
            post.title?.toLowerCase().includes(q) ||
            post.description?.toLowerCase().includes(q) ||
            post.tags?.some(tag => tag.toLowerCase().includes(q))
        );
        let matchesFilter = true;
        if (activeFilter === 'For Sale') matchesFilter = !!post.forSale;
        else if (activeFilter !== 'All') matchesFilter = (post as any).category === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const handleLike = async (post: any) => {
        if (!post.id || !currentUser) return;
        await likePost(post.id);
    };

    const handleAddComment = async (post: any) => {
        const text = (newComment[post.id] || '').trim();
        if (!text || !currentUser || !post.id) return;
        await addComment(post.id, text);
        setNewComment(prev => ({ ...prev, [post.id]: '' }));
    };

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

            {/* ── Hamburger side drawer ── */}
            <style>{`
                @keyframes slideInDrawer { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                @keyframes fadeInOverlay  { from { opacity: 0; } to { opacity: 1; } }
                .drawer-item-hover:hover { background: #f5f5f5 !important; }
            `}</style>
            {hamburgerOpen && (
                <>
                    <div
                        style={{ ...st.drawerOverlay, animation: 'fadeInOverlay 0.2s ease' }}
                        onClick={() => setHamburgerOpen(false)}
                    />
                    <div style={{ ...st.drawer, animation: 'slideInDrawer 0.25s ease' }}>
                        <div style={st.drawerHeader}>
                            <span style={st.drawerTitle}>Menu</span>
                            <button style={st.drawerClose} onClick={() => setHamburgerOpen(false)}>✕</button>
                        </div>
                        {[
                            { icon: '🏠', label: 'Home Feed',    filter: 'All'       },
                            { icon: '🔥', label: 'Trending',     filter: 'All'       },
                            { icon: '💰', label: 'For Sale',     filter: 'For Sale'  },
                            { icon: '🎨', label: 'Art',          filter: 'Art'       },
                            { icon: '🎵', label: 'Music',        filter: 'Music'     },
                            { icon: '📸', label: 'Photography',  filter: 'Photography'},
                            { icon: '🎮', label: 'Gaming',       filter: 'Gaming'    },
                            { icon: '📦', label: 'Collectibles', filter: 'Collectible'},
                        ].map(item => (
                            <div
                                key={item.label}
                                className="drawer-item-hover"
                                style={{
                                    ...st.drawerItem,
                                    background: activeFilter === item.filter && item.filter !== 'All' ? '#f0fff4' : 'white',
                                    color:      activeFilter === item.filter && item.filter !== 'All' ? '#00aa44' : '#333',
                                }}
                                onClick={() => { setActiveFilter(item.filter); setHamburgerOpen(false); }}
                            >
                                <span style={{ marginRight: '12px', fontSize: '18px' }}>{item.icon}</span>
                                <span style={{ fontSize: '15px' }}>{item.label}</span>
                                {activeFilter === item.filter && item.filter !== 'All' && (
                                    <span style={{ marginLeft: 'auto', color: '#01ff77', fontWeight: 'bold' }}>✓</span>
                                )}
                            </div>
                        ))}

                        {/* ── History tab (divider + entry) ── */}
                        <div style={st.drawerDivider} />
                        <div
                            className="drawer-item-hover"
                            style={st.drawerItem}
                            onClick={() => { setHistoryOpen(true); setHamburgerOpen(false); }}
                        >
                            <span style={{ marginRight: '12px', fontSize: '18px' }}>🕐</span>
                            <span style={{ fontSize: '15px' }}>View History</span>
                            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#bbb' }}>›</span>
                        </div>
                    </div>
                </>
            )}

            {/* ── History panel (separate slide-over, reuses drawer styles) ── */}
            {historyOpen && (
                <>
                    <div
                        style={{ ...st.drawerOverlay, animation: 'fadeInOverlay 0.2s ease' }}
                        onClick={() => setHistoryOpen(false)}
                    />
                    <div style={{ ...st.drawer, animation: 'slideInDrawer 0.25s ease' }}>
                        <div style={st.drawerHeader}>
                            <button
                                style={{ ...st.drawerClose, marginRight: '10px' }}
                                onClick={() => { setHistoryOpen(false); setHamburgerOpen(true); }}
                                aria-label="Back to menu"
                            >
                                ‹
                            </button>
                            <span style={st.drawerTitle}>View History</span>
                            <button style={st.drawerClose} onClick={() => setHistoryOpen(false)}>✕</button>
                        </div>
                        <HistoryView onClose={() => setHistoryOpen(false)} />
                    </div>
                </>
            )}

            {/* ── Search bar ── */}
            <div className="search-bar" style={{ position: 'relative' }}>
                <button
                    onClick={() => setHamburgerOpen(true)}
                    style={st.hamburgerBtn}
                    aria-label="Open menu"
                >
                    <span style={st.hamburgerLine} />
                    <span style={st.hamburgerLine} />
                    <span style={st.hamburgerLine} />
                </button>
                <div className="search-input">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search NFTs..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filter button + dropdown */}
                <div ref={filterRef} style={{ position: 'relative' }}>
                    <i
                        className="fas fa-ellipsis-v menu-icon"
                        style={{ cursor: 'pointer', color: filterOpen ? '#01ff77' : undefined }}
                        onClick={() => setFilterOpen(o => !o)}
                    />
                    {filterOpen && (
                        <div style={st.filterDropdown}>
                            <div style={st.filterTitle}>Filter by</div>
                            {FILTER_OPTIONS.map(opt => (
                                <div
                                    key={opt}
                                    style={{
                                        ...st.filterOption,
                                        background: activeFilter === opt ? '#f0fff4' : 'white',
                                        color:      activeFilter === opt ? '#01aa44' : '#333',
                                        fontWeight: activeFilter === opt ? 'bold'   : 'normal',
                                    }}
                                    onClick={() => { setActiveFilter(opt); setFilterOpen(false); }}
                                >
                                    {activeFilter === opt && <span style={{ marginRight: '6px' }}>✓</span>}
                                    {opt}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Active filter badge */}
            {activeFilter !== 'All' && (
                <div style={st.filterBadge}>
                    <span>Filtered: <strong>{activeFilter}</strong></span>
                    <button style={st.filterBadgeClear} onClick={() => setActiveFilter('All')}>✕</button>
                </div>
            )}

            {filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎨</div>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>No NFTs found</p>
                    <p style={{ fontSize: '13px' }}>Try a different search or filter</p>
                </div>
            ) : (
                filteredPosts.map(post => (
                    <div
                        key={post.id}
                        className="nft-post"
                        ref={el => { if (el && post.id) attachObserver(el, post.id); }}
                    >

                        <div className="user-info">
                            <div className="avatar">
                                <img
                                    src={post.userAvatar || DEFAULT_AVATAR}
                                    alt="Avatar"
                                    loading="lazy"
                                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
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

                        <div className="nft-content">
                            {(post as any).nftImages?.length > 0 ? (
                                /* ── Collection gallery (CSS Grid) ── */
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                        gap: '8px',
                                    }}>
                                        {(post as any).nftImages.map((src: string, idx: number) => (
                                            <img
                                                key={idx}
                                                src={src || '/img/default-nft.png'}
                                                alt={`${post.title} #${idx + 1}`}
                                                loading="lazy"
                                                style={{
                                                    width: '100%', aspectRatio: '1 / 1',
                                                    borderRadius: '10px', objectFit: 'cover',
                                                    display: 'block',
                                                }}
                                                onError={e => { e.currentTarget.src = '/img/default-nft.png'; }}
                                            />
                                        ))}
                                    </div>
                                    <div style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        background: 'rgba(0,0,0,0.6)', color: 'white',
                                        borderRadius: '12px', padding: '2px 8px',
                                        fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none',
                                    }}>
                                        {(post as any).nftImages.length} NFTs
                                    </div>
                                </div>
                            ) : (
                                /* ── Single NFT image ── */
                                <div className="nft-image">
                                    <img
                                        src={post.nftImage || '/img/default-nft.png'}
                                        alt={post.title}
                                        loading="lazy"
                                        style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', display: 'block' }}
                                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/default-nft.png'; }}
                                    />
                                </div>
                            )}
                            {(post as any).blockchain && (
                                <div style={{ padding: '6px 0', fontSize: '12px', color: '#888', display: 'flex', gap: '10px' }}>
                                    <span>⛓ {(post as any).blockchain}</span>
                                    {post.price && (
                                        <span style={{ color: '#01ff77', fontWeight: 'bold' }}>
                                            {post.price} {post.currency || 'SOL'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

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

                            {post.forSale && post.price && post.userId !== currentUser?.uid && (
                                <button className="buy-btn" onClick={() => setBuyNft(post)}>
                                    Buy {post.price} {post.currency || 'SOL'}
                                </button>
                            )}
                        </div>

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
                                    {post.comments?.map((comment: any) => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="comment-avatar">
                                                <img
                                                    src={comment.userAvatar || DEFAULT_AVATAR}
                                                    alt="Avatar"
                                                    loading="lazy"
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

const st: any = {
    drawerOverlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 3000,
    },
    drawer: {
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '260px',
        background: 'white',
        zIndex: 3001,
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
    },
    drawerHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 16px',
        borderBottom: '1px solid #f0f0f0',
        background: 'linear-gradient(135deg,#667eea,#764ba2)',
    },
    drawerTitle: { color: 'white', fontWeight: 'bold', fontSize: '18px' },
    drawerClose:  { background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' },
    drawerItem: {
        display: 'flex', alignItems: 'center',
        padding: '14px 16px',
        borderBottom: '1px solid #f5f5f5',
        cursor: 'pointer',
        color: '#333',
    },
    filterDropdown: {
        position: 'absolute', right: 0, top: '30px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: '160px',
        zIndex: 1000,
        overflow: 'hidden',
    },
    filterTitle: {
        padding: '10px 14px',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#999',
        background: '#f8f8f8',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    filterOption: {
        padding: '10px 14px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex', alignItems: 'center',
        transition: 'background 0.15s',
    },
    filterBadge: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '8px 15px 0',
        background: '#f0fff4',
        border: '1px solid #b2f0c8',
        borderRadius: '20px',
        padding: '6px 12px',
        fontSize: '13px',
        color: '#00aa44',
    },
    filterBadgeClear: {
        background: 'none', border: 'none',
        color: '#00aa44', cursor: 'pointer',
        fontSize: '14px', fontWeight: 'bold',
    },
    hamburgerBtn: {
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        width: '24px', height: '18px',
        background: 'none', border: 'none',
        cursor: 'pointer', padding: 0, flexShrink: 0,
    },
    hamburgerLine: {
        display: 'block', width: '100%', height: '2px',
        background: '#333', borderRadius: '2px',
    },
    drawerDivider: {
        height: '1px',
        background: '#ebebeb',
        margin: '4px 0',
    },
};

export default HomePage;
