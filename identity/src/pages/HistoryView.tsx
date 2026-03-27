import React, { useEffect, useState } from 'react';
import { apiGetPosts } from '../services/apiClient';
import { getHistory, clearHistory } from '../hooks/useViewHistory';

const DEFAULT_NFT = '/img/default-nft.png';

interface HistoryViewProps {
    onClose: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onClose }) => {
    const [items,   setItems]   = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ids = getHistory();
        if (ids.length === 0) {
            setLoading(false);
            return;
        }

        apiGetPosts()
            .then((posts: any[]) => {
                // Build a lookup map keyed by post id
                const byId = new Map(posts.map(p => [p.id, p]));
                // Preserve the viewed order (most recent first)
                const ordered = ids
                    .map(id => byId.get(id))
                    .filter(Boolean) as any[];
                setItems(ordered);
            })
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, []);

    const handleClear = () => {
        clearHistory();
        setItems([]);
    };

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!loading && items.length === 0) {
        return (
            <div style={s.emptyWrap}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👁</div>
                <p style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>No history yet</p>
                <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', lineHeight: 1.5 }}>
                    Pause on any NFT card in the feed for 2 seconds and it will appear here.
                </p>
            </div>
        );
    }

    // ── List ──────────────────────────────────────────────────────────────────
    return (
        <div style={s.wrap}>
            {/* Sticky toolbar */}
            <div style={s.toolbar}>
                <span style={s.count}>{loading ? '…' : `${items.length} viewed`}</span>
                {!loading && items.length > 0 && (
                    <button style={s.clearBtn} onClick={handleClear}>
                        Clear all
                    </button>
                )}
            </div>

            {loading ? (
                <div style={s.emptyWrap}>
                    <div style={s.spinner} />
                </div>
            ) : (
                <div style={s.list}>
                    {items.map((post, idx) => (
                        <div key={post.id ?? idx} style={s.row}>
                            <img
                                src={post.nftImage || DEFAULT_NFT}
                                alt={post.title}
                                style={s.thumb}
                                onError={e => { e.currentTarget.src = DEFAULT_NFT; }}
                            />
                            <div style={s.meta}>
                                <div style={s.nftTitle}>{post.title}</div>
                                <div style={s.nftOwner}>{post.userName}</div>
                                {post.forSale && post.price != null && (
                                    <div style={s.price}>
                                        {post.price} {post.currency || 'SOL'}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
    wrap: {
        display:  'flex',
        flexDirection: 'column',
        height:   '100%',
        overflow: 'hidden',
    },
    toolbar: {
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '12px 16px',
        borderBottom:   '1px solid #f0f0f0',
        flexShrink:     0,
    },
    count: {
        fontSize:   '13px',
        color:      '#999',
        fontWeight: '500',
    },
    clearBtn: {
        background:  'none',
        border:      '1px solid #ddd',
        borderRadius: '12px',
        padding:     '4px 10px',
        fontSize:    '12px',
        color:       '#999',
        cursor:      'pointer',
    },
    list: {
        overflowY: 'auto',
        flex:       1,
        padding:   '8px 0',
    },
    row: {
        display:    'flex',
        alignItems: 'center',
        gap:        '12px',
        padding:    '10px 16px',
        borderBottom: '1px solid #f8f8f8',
        cursor:     'pointer',
    },
    thumb: {
        width:        '52px',
        height:       '52px',
        borderRadius: '10px',
        objectFit:    'cover',
        flexShrink:   0,
    },
    meta: {
        flex:     1,
        overflow: 'hidden',
    },
    nftTitle: {
        fontWeight:   '600',
        fontSize:     '14px',
        color:        '#222',
        whiteSpace:   'nowrap',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
    },
    nftOwner: {
        fontSize: '12px',
        color:    '#888',
        marginTop: '2px',
    },
    price: {
        fontSize:   '12px',
        color:      '#01cc66',
        fontWeight: 'bold',
        marginTop:  '2px',
    },
    emptyWrap: {
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        flex:           1,
        padding:        '40px 24px',
    },
    spinner: {
        width:       '32px',
        height:      '32px',
        border:      '3px solid #eee',
        borderTop:   '3px solid #01ff77',
        borderRadius: '50%',
        animation:   'spin 0.8s linear infinite',
    },
};

export default HistoryView;
