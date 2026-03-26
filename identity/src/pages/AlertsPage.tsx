import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/formatters';
import {
    apiGetNotifications,
    apiMarkRead,
    apiMarkAllRead,
    apiDeleteNotification,
} from '../services/apiClient';

type NotifType = 'purchase' | 'sale' | 'like' | 'comment' | 'nft_created' | 'welcome' | 'system' | 'wallet';

interface AppNotification {
    id: string;
    type: NotifType;
    title: string;
    text: string;
    read: boolean;
    createdAt: string;
    metadata?: { price?: number; currency?: string; fromUser?: string; nftTitle?: string };
}

const ICON_MAP: Record<string, string> = {
    purchase:    '🛒',
    sale:        '💰',
    like:        '❤️',
    comment:     '💬',
    nft_created: '🎨',
    welcome:     '👋',
    wallet:      '💼',
    system:      'ℹ️',
};

const COLOR_MAP: Record<string, string> = {
    purchase:    '#fff8e1',
    sale:        '#e8f5e9',
    like:        '#fce4ec',
    comment:     '#e3f2fd',
    nft_created: '#f3e5f5',
    welcome:     '#e8eaf6',
    wallet:      '#e0f2f1',
    system:      '#f5f5f5',
};

const POLL_INTERVAL = 30_000; // 30 s

const AlertsPage: React.FC = () => {
    const { currentUser }   = useAuth();
    const [alerts, setAlerts] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter]   = useState<'all' | NotifType>('all');

    const mapNotification = (n: any): AppNotification => ({
        id:        n.id,
        type:      n.type,
        title:     n.title,
        text:      n.text,
        read:      n.read,
        createdAt: n.createdAt,
        metadata:  n.metadata ? {
            price:    n.metadata.price,
            currency: n.metadata.currency,
            fromUser: n.metadata.fromUser,
            nftTitle: n.metadata.nftTitle,
        } : undefined,
    });

    const loadNotifications = useCallback(async () => {
        if (!currentUser) { setLoading(false); return; }
        try {
            const data = await apiGetNotifications();
            setAlerts((data || []).map(mapNotification));
        } catch (e) {
            console.error('Notifications error:', e);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    const handleMarkRead = async (alert: AppNotification) => {
        if (alert.read || !alert.id) return;
        await apiMarkRead(alert.id).catch(() => null);
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await apiDeleteNotification(id).catch(() => null);
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        await apiMarkAllRead().catch(() => null);
        setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    };

    const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
    const unreadCount    = alerts.filter(a => !a.read).length;

    const filterTabs: { key: 'all' | NotifType; label: string; icon: string }[] = [
        { key: 'all',         label: 'All',            icon: '🔔' },
        { key: 'purchase',    label: 'Bought',         icon: '🛒' },
        { key: 'sale',        label: 'Sold',           icon: '💰' },
        { key: 'like',        label: 'Likes',          icon: '❤️' },
        { key: 'comment',     label: 'Comments',       icon: '💬' },
        { key: 'nft_created', label: 'Created NFTs',   icon: '🎨' },
    ];

    if (loading) {
        return (
            <div className="page alert-page active">
                <style>{spinCSS}</style>
                <div style={styles.loadingBox}>
                    <div style={styles.spinner} />
                    <p style={{ color: '#888', marginTop: '15px' }}>Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page alert-page active">
            <style>{spinCSS}</style>

            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <div className="alert-title" style={{ margin: 0 }}>Notifications</div>
                    {unreadCount > 0 && <div style={styles.badge}>{unreadCount}</div>}
                </div>
                {unreadCount > 0 && (
                    <button style={styles.markAllBtn} onClick={handleMarkAllRead}>Mark all read</button>
                )}
            </div>

            {/* Filter tabs */}
            <div style={styles.filterRow}>
                {filterTabs.map(tab => (
                    <button
                        key={tab.key}
                        style={{
                            ...styles.filterBtn,
                            background: filter === tab.key ? '#01ff77' : '#f0f0f0',
                            color:      filter === tab.key ? 'black'   : '#666',
                            fontWeight: filter === tab.key ? 'bold'    : 'normal',
                        }}
                        onClick={() => setFilter(tab.key)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {filteredAlerts.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>{filter === 'all' ? '🔔' : ICON_MAP[filter] || '🔔'}</div>
                    <p style={styles.emptyText}>
                        {filter === 'all' ? 'No notifications yet' : `No "${filter.replace('_', ' ')}" notifications`}
                    </p>
                    <p style={styles.emptyHint}>Buy, sell or create NFTs to see notifications here</p>
                </div>
            ) : (
                <div style={styles.list}>
                    {filteredAlerts.map(alert => (
                        <div
                            key={alert.id}
                            style={{
                                ...styles.card,
                                background:  alert.read ? '#fafafa' : (COLOR_MAP[alert.type] || '#f5f5f5'),
                                opacity:     alert.read ? 0.75 : 1,
                                borderLeft:  alert.read ? '3px solid #ddd' : '3px solid #01ff77',
                            }}
                            onClick={() => handleMarkRead(alert)}
                        >
                            <div style={styles.cardMain}>
                                <div style={styles.iconBox}>
                                    <span style={styles.icon}>{ICON_MAP[alert.type] || 'ℹ️'}</span>
                                </div>
                                <div style={styles.cardBody}>
                                    <div style={styles.cardTop}>
                                        <span style={styles.cardTitle}>
                                            {!alert.read && <span style={styles.dot}>●</span>}
                                            {alert.title}
                                        </span>
                                        <div style={styles.cardActions}>
                                            <span style={styles.time}>{formatTime(alert.createdAt)}</span>
                                            <button
                                                style={styles.deleteBtn}
                                                onClick={e => alert.id && handleDelete(e, alert.id)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div style={styles.cardText}>{alert.text}</div>
                                    {alert.metadata?.price && (
                                        <div style={styles.metaRow}>
                                            <span style={styles.metaPrice}>
                                                {alert.metadata.price} {alert.metadata.currency}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const spinCSS = `@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`;

const styles: any = {
    header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 15px 0', marginBottom: '10px' },
    headerLeft:   { display: 'flex', alignItems: 'center', gap: '10px' },
    badge:        { background: '#01ff77', color: 'black', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' },
    markAllBtn:   { background: 'none', border: '1px solid #01ff77', color: '#01ff77', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' },
    filterRow:    { display: 'flex', gap: '8px', padding: '0 15px 15px', overflowX: 'auto', scrollbarWidth: 'none' },
    filterBtn:    { padding: '6px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', transition: 'all 0.2s' },
    list:         { display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 15px 20px' },
    card:         { borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    cardMain:     { display: 'flex', gap: '12px', alignItems: 'flex-start' },
    iconBox:      { width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    icon:         { fontSize: '20px' },
    cardBody:     { flex: 1, minWidth: 0 },
    cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' },
    cardTitle:    { fontWeight: 'bold', fontSize: '14px', color: '#222', flex: 1 },
    dot:          { color: '#01ff77', marginRight: '5px', fontSize: '10px' },
    cardActions:  { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
    time:         { fontSize: '11px', color: '#999', whiteSpace: 'nowrap' },
    deleteBtn:    { background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: '2px 4px', fontSize: '13px', lineHeight: 1 },
    cardText:     { fontSize: '13px', color: '#555', lineHeight: '1.4' },
    metaRow:      { marginTop: '8px' },
    metaPrice:    { background: '#01ff77', color: 'black', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 'bold' },
    emptyState:   { textAlign: 'center', padding: '60px 20px' },
    emptyIcon:    { fontSize: '50px', marginBottom: '15px' },
    emptyText:    { fontSize: '16px', color: '#555', fontWeight: 'bold', marginBottom: '8px' },
    emptyHint:    { fontSize: '13px', color: '#999' },
    loadingBox:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
    spinner:      { width: '40px', height: '40px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};

export default AlertsPage;
