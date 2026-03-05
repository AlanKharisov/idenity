import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/formatters';
import {
    AppNotification,
    subscribeToNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    getNotificationIcon,
    getNotificationColor,
    NotificationType
} from '../firebase/notifications';

const AlertsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [alerts, setAlerts] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | NotificationType>('all');

    // Підписка на сповіщення в реальному часі
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = subscribeToNotifications(currentUser.uid, (notifications) => {
            setAlerts(notifications);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleMarkRead = async (alert: AppNotification) => {
        if (!alert.read && alert.id) {
            await markNotificationRead(alert.id);
            // Оновлюємо локально одразу (не чекаємо Firestore)
            setAlerts(prev =>
                prev.map(a => a.id === alert.id ? { ...a, read: true } : a)
            );
        }
    };

    const handleDelete = async (e: React.MouseEvent, alertId: string) => {
        e.stopPropagation();
        await deleteNotification(alertId);
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        await markAllNotificationsRead(currentUser.uid);
        setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    };

    // Фільтрація
    const filteredAlerts = filter === 'all'
        ? alerts
        : alerts.filter(a => a.type === filter);

    const unreadCount = alerts.filter(a => !a.read).length;

    // Типи для фільтрів
    const filterTabs: { key: 'all' | NotificationType; label: string; icon: string }[] = [
        { key: 'all',      label: 'All',      icon: '🔔' },
        { key: 'purchase', label: 'Bought',   icon: '🛒' },
        { key: 'sale',     label: 'Sold',     icon: '💰' },
        { key: 'like',     label: 'Likes',    icon: '❤️' },
        { key: 'comment',  label: 'Comments', icon: '💬' },
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

            {/* Заголовок */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <div className="alert-title" style={{ margin: 0 }}>Notifications</div>
                    {unreadCount > 0 && (
                        <div style={styles.badge}>{unreadCount}</div>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button style={styles.markAllBtn} onClick={handleMarkAllRead}>
                        Mark all read
                    </button>
                )}
            </div>

            {/* Фільтри */}
            <div style={styles.filterRow}>
                {filterTabs.map(tab => (
                    <button
                        key={tab.key}
                        style={{
                            ...styles.filterBtn,
                            background: filter === tab.key ? '#01ff77' : '#f0f0f0',
                            color: filter === tab.key ? 'black' : '#666',
                            fontWeight: filter === tab.key ? 'bold' : 'normal'
                        }}
                        onClick={() => setFilter(tab.key)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Список */}
            {filteredAlerts.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🔔</div>
                    <p style={styles.emptyText}>
                        {filter === 'all'
                            ? 'No notifications yet'
                            : `No "${filter}" notifications`}
                    </p>
                    <p style={styles.emptyHint}>
                        Buy or sell NFTs to see notifications here
                    </p>
                </div>
            ) : (
                <div style={styles.list}>
                    {filteredAlerts.map(alert => (
                        <div
                            key={alert.id}
                            style={{
                                ...styles.card,
                                background: alert.read ? '#fafafa' : getNotificationColor(alert.type),
                                opacity: alert.read ? 0.75 : 1,
                                borderLeft: alert.read ? '3px solid #ddd' : '3px solid #01ff77'
                            }}
                            onClick={() => handleMarkRead(alert)}
                        >
                            {/* Іконка + текст */}
                            <div style={styles.cardMain}>
                                <div style={styles.iconBox}>
                                    <span style={styles.icon}>
                                        {getNotificationIcon(alert.type)}
                                    </span>
                                </div>

                                <div style={styles.cardBody}>
                                    <div style={styles.cardTop}>
                                        <span style={styles.cardTitle}>
                                            {!alert.read && (
                                                <span style={styles.dot}>●</span>
                                            )}
                                            {alert.title}
                                        </span>
                                        <div style={styles.cardActions}>
                                            <span style={styles.time}>
                                                {formatTime(alert.createdAt)}
                                            </span>
                                            <button
                                                style={styles.deleteBtn}
                                                onClick={(e) => alert.id && handleDelete(e, alert.id)}
                                                title="Delete"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div style={styles.cardText}>{alert.text}</div>

                                    {/* Метадані */}
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

const spinCSS = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const styles: any = {
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 15px 0',
        marginBottom: '10px'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    badge: {
        background: '#01ff77',
        color: 'black',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    markAllBtn: {
        background: 'none',
        border: '1px solid #01ff77',
        color: '#01ff77',
        borderRadius: '20px',
        padding: '6px 14px',
        fontSize: '13px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    filterRow: {
        display: 'flex',
        gap: '8px',
        padding: '0 15px 15px',
        overflowX: 'auto',
        scrollbarWidth: 'none'
    },
    filterBtn: {
        padding: '6px 12px',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '0 15px 20px'
    },
    card: {
        borderRadius: '12px',
        padding: '14px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    },
    cardMain: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
    },
    iconBox: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    icon: {
        fontSize: '20px'
    },
    cardBody: {
        flex: 1,
        minWidth: 0
    },
    cardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '5px'
    },
    cardTitle: {
        fontWeight: 'bold',
        fontSize: '14px',
        color: '#222',
        flex: 1
    },
    dot: {
        color: '#01ff77',
        marginRight: '5px',
        fontSize: '10px'
    },
    cardActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
    },
    time: {
        fontSize: '11px',
        color: '#999',
        whiteSpace: 'nowrap'
    },
    deleteBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#bbb',
        padding: '2px 4px',
        fontSize: '13px',
        lineHeight: 1
    },
    cardText: {
        fontSize: '13px',
        color: '#555',
        lineHeight: '1.4'
    },
    metaRow: {
        marginTop: '8px'
    },
    metaPrice: {
        background: '#01ff77',
        color: 'black',
        borderRadius: '12px',
        padding: '2px 10px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px'
    },
    emptyIcon: {
        fontSize: '50px',
        marginBottom: '15px'
    },
    emptyText: {
        fontSize: '16px',
        color: '#555',
        fontWeight: 'bold',
        marginBottom: '8px'
    },
    emptyHint: {
        fontSize: '13px',
        color: '#999'
    },
    loadingBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #ddd',
        borderTop: '3px solid #01ff77',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    }
};

export default AlertsPage;