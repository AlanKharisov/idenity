import React, { useState, useRef } from 'react';
import { formatTime } from '../utils/formatters';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import BuyModal from './BuyModal';
import HistoryView from './HistoryView';
import { useViewHistory } from '../hooks/useViewHistory';
import { Icon } from '../components/brand';

const DEFAULT_AVATAR = '/img/default-avatar.png';

const FILTER_OPTIONS = [
  'Trending', 'For Sale', 'Art', 'Music', 'Photography', 'Gaming', '3D', 'Collectible',
];

function CollectionGallery({ images, title }: { images: string[]; title: string }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          position: 'absolute',
          top: 12, left: 12, zIndex: 2,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        {images.length} NFTs
      </div>
      <div
        className="scrollx"
        style={{
          display: 'flex',
          gap: 8,
          scrollSnapType: 'x mandatory',
          borderRadius: 12,
        }}
      >
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src || '/img/default-nft.png'}
            alt={`${title} #${idx + 1}`}
            loading="lazy"
            style={{
              width: '72%',
              flexShrink: 0,
              aspectRatio: '1 / 1',
              objectFit: 'cover',
              borderRadius: 12,
              display: 'block',
              scrollSnapAlign: 'start',
            }}
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/img/default-nft.png'; }}
          />
        ))}
        <div style={{ flexShrink: 0, width: 4 }} />
      </div>
      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
          {images.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6, height: 6,
                borderRadius: 999,
                background: i === 0 ? 'var(--primary)' : 'var(--border-strong)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const HomePage: React.FC = () => {
  const { posts, loading, likePost, addComment, refreshPosts } = usePosts();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [buyNft, setBuyNft] = useState<any | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Trending');
  const filterRef = useRef<HTMLDivElement>(null);

  const { attachObserver } = useViewHistory();

  const filteredPosts = posts.filter(post => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      post.title?.toLowerCase().includes(q) ||
      post.description?.toLowerCase().includes(q) ||
      post.tags?.some(tag => tag.toLowerCase().includes(q))
    );
    let matchesFilter = true;
    if (activeFilter === 'Trending') matchesFilter = true;
    else if (activeFilter === 'For Sale') matchesFilter = !!post.forSale;
    else matchesFilter = post.category === activeFilter;
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

  const handleBuySuccess = () => { setBuyNft(null); refreshPosts(); };

  if (loading) {
    return (
      <div className="page home-page active mi-screen-pad" style={{ paddingTop: 60 }}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 15px' }} />
          <p className="muted">Loading NFTs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page home-page active mi-screen-pad" style={{ paddingTop: 12 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            flex: 1,
            background: 'var(--bg-soft)',
            borderRadius: 999,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-faint)',
            fontSize: 14,
          }}
        >
          <Icon.Search size={18} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search NFTs, creators…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 14,
              padding: 0,
            }}
          />
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--bg-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            color: 'var(--text)',
          }}
          aria-label="History"
        >
          <Icon.Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: 8, right: 8,
              width: 8, height: 8,
              borderRadius: 4,
              background: 'var(--primary)',
            }}
          />
        </button>
      </div>

      {/* Category chips */}
      <div ref={filterRef} className="scrollx" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {FILTER_OPTIONS.map(opt => (
          <span
            key={opt}
            onClick={() => setActiveFilter(opt)}
            className={`chip ${activeFilter === opt ? 'chip-active' : ''}`}
          >
            {opt}
          </span>
        ))}
      </div>

      {/* Feed */}
      {filteredPosts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎨</div>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>No NFTs found</p>
          <p className="muted" style={{ fontSize: 13 }}>Try a different search or filter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredPosts.map(post => (
            <div
              key={post.id}
              className="card"
              ref={el => { if (el && post.id) attachObserver(el, post.id); }}
              style={{ padding: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar">
                  {post.userAvatar ? (
                    <img
                      src={post.userAvatar}
                      alt="Avatar"
                      onError={e => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = DEFAULT_AVATAR; }}
                    />
                  ) : (
                    (post.userName || '?').slice(0, 1).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{post.userName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {formatTime(post.createdAt)}
                  </div>
                </div>
                <button style={{ color: 'var(--text-faint)', padding: 4 }} aria-label="More">
                  <Icon.More />
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{post.title}</div>
                {post.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                    {post.description}
                  </div>
                )}
                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {post.tags.map((t: string) => (
                      <span
                        key={t}
                        style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
                {post.nftImages && post.nftImages.length > 0 ? (
                  <CollectionGallery images={post.nftImages} title={post.title} />
                ) : (
                  <img
                    src={post.nftImage || '/img/default-nft.png'}
                    alt={post.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      objectFit: 'cover',
                      display: 'block',
                      maxHeight: 380,
                    }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/img/default-nft.png'; }}
                  />
                )}
                {post.forSale && post.price && (
                  <div
                    className="mono"
                    style={{
                      position: 'absolute',
                      top: 12, right: 12,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      fontSize: 11,
                    }}
                  >
                    {post.price} {post.currency || 'SOL'}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  color: 'var(--text-muted)',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: 18, fontSize: 13, alignItems: 'center' }}>
                  <span
                    onClick={() => handleLike(post)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      color: post.liked ? 'var(--danger)' : 'inherit',
                    }}
                  >
                    <Icon.Heart filled={post.liked} /> {post.likes || 0}
                  </span>
                  <span
                    onClick={() => post.id && setSelectedPost(selectedPost === post.id ? null : post.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Icon.Comment /> {post.comments?.length || 0}
                  </span>
                  <span
                    onClick={() =>
                      navigator.share?.({
                        title: post.title,
                        text: post.description,
                        url: window.location.href,
                      }).catch(() => {})
                    }
                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Icon.Share />
                  </span>
                </div>
                {post.forSale && post.price && post.userId !== currentUser?.uid && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setBuyNft(post)}
                    style={{ padding: '8px 14px', fontSize: 13 }}
                  >
                    Buy {post.price} {post.currency || 'SOL'}
                  </button>
                )}
              </div>

              {selectedPost === post.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={newComment[post.id || ''] || ''}
                      onChange={e =>
                        setNewComment(prev => ({ ...prev, [post.id!]: e.target.value }))
                      }
                      onKeyUp={e => { if (e.key === 'Enter') handleAddComment(post); }}
                      placeholder="Write a comment…"
                      style={{
                        flex: 1,
                        background: 'var(--bg-soft)',
                        border: 'none',
                        borderRadius: 12,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                        color: 'var(--text)',
                      }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAddComment(post)}
                      style={{ padding: '0 14px', fontSize: 13 }}
                    >
                      Post
                    </button>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {post.comments?.map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                          {c.userAvatar ? (
                            <img src={c.userAvatar} alt="" />
                          ) : (
                            (c.userName || '?').slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{c.userName}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.text}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                            {formatTime(c.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {historyOpen && (
        <>
          <div
            onClick={() => setHistoryOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 3000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: 320,
              maxWidth: '100%',
              background: 'var(--bg-card)',
              zIndex: 3001,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 16px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span className="h3">View history</span>
              <button
                onClick={() => setHistoryOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'var(--bg-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text)',
                }}
                aria-label="Close"
              >
                <Icon.X />
              </button>
            </div>
            <HistoryView onClose={() => setHistoryOpen(false)} />
          </div>
        </>
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

export default HomePage;
