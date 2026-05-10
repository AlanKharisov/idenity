import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/formatters';
import {
  apiGetNotifications,
  apiMarkRead,
  apiMarkAllRead,
  apiDeleteNotification,
} from '../services/apiClient';
import { Icon } from '../components/brand';

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

const POLL_INTERVAL = 30_000;

const AlertsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | NotifType>('all');

  const mapNotification = (n: any): AppNotification => ({
    id: n.id,
    type: n.type,
    title: n.title,
    text: n.text,
    read: n.read,
    createdAt: n.createdAt,
    metadata: n.metadata
      ? {
          price: n.metadata.price,
          currency: n.metadata.currency,
          fromUser: n.metadata.fromUser,
          nftTitle: n.metadata.nftTitle,
        }
      : undefined,
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
    setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, read: true } : a)));
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
  const unreadCount = alerts.filter(a => !a.read).length;

  const filterTabs: { key: 'all' | NotifType; label: string }[] = [
    { key: 'all',         label: 'All' },
    { key: 'purchase',    label: 'Bought' },
    { key: 'sale',        label: 'Sold' },
    { key: 'like',        label: 'Likes' },
    { key: 'comment',     label: 'Comments' },
    { key: 'nft_created', label: 'Created' },
  ];

  if (loading) {
    return (
      <div className="page alert-page active mi-screen-pad" style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
          <div className="spinner" />
          <p className="muted" style={{ marginTop: 14 }}>Loading notifications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page alert-page active mi-screen-pad" style={{ paddingTop: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div>
          <h1 className="h2">Notifications</h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="scrollx" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {filterTabs.map(t => (
          <span
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`chip ${filter === t.key ? 'chip-active' : ''}`}
          >
            {t.label}
          </span>
        ))}
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>
            {filter === 'all' ? '🔔' : ICON_MAP[filter] || '🔔'}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700 }}>
            {filter === 'all' ? 'No notifications yet' : `No ${filter.replace('_', ' ')} notifications`}
          </p>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Buy, sell or create NFTs to see updates here
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => handleMarkRead(alert)}
              style={{
                padding: 14,
                borderRadius: 14,
                background: alert.read ? 'var(--bg-card)' : 'var(--primary-faint)',
                border: '1px solid',
                borderColor: alert.read ? 'var(--border)' : 'var(--primary-soft)',
                display: 'flex',
                gap: 12,
                position: 'relative',
                cursor: alert.read ? 'default' : 'pointer',
              }}
            >
              {!alert.read && (
                <div
                  style={{
                    position: 'absolute',
                    top: 14, right: 14,
                    width: 8, height: 8,
                    borderRadius: 4,
                    background: 'var(--primary)',
                  }}
                />
              )}
              <div
                style={{
                  width: 38, height: 38,
                  borderRadius: 11,
                  background: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                  border: '1px solid var(--border)',
                }}
              >
                {ICON_MAP[alert.type] || 'ℹ️'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{alert.title}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-faint)',
                      marginLeft: 'auto',
                      marginRight: alert.read ? 0 : 14,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTime(alert.createdAt)}
                  </span>
                  {alert.id && (
                    <button
                      onClick={e => handleDelete(e, alert.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-faint)',
                        padding: '2px 4px',
                        marginLeft: 4,
                      }}
                      aria-label="Delete"
                    >
                      <Icon.X size={14} />
                    </button>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {alert.text}
                </div>
                {alert.metadata?.price && (
                  <span
                    className="mono"
                    style={{
                      display: 'inline-block',
                      marginTop: 8,
                      padding: '3px 9px',
                      borderRadius: 999,
                      background: 'var(--primary-soft)',
                      color: 'var(--primary-ink)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {alert.metadata.price} {alert.metadata.currency}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
