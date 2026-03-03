import React, { useState } from 'react';
import { formatTime } from '../utils/formatters';

interface Alert {
    id: number;
    title: string;
    text: string;
    createdAt: string;
    read: boolean;
}

const AlertsPage: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([
        {
            id: 1,
            title: 'Welcome to MARKIdentity!',
            text: 'Thank you for joining our platform. Start by creating your first NFT.',
            createdAt: new Date().toISOString(),
            read: false
        },
        {
            id: 2,
            title: 'NFT Sold',
            text: 'Your NFT "Sound Legacy" has been sold for 0.5 ETH',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            read: false
        },
        {
            id: 3,
            title: 'New Like',
            text: 'Olera Sydorenko liked your NFT',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            read: true
        }
    ]);

    // Отметить как прочитанное
    const markAsRead = (alertId: number) => {
        setAlerts(prev =>
            prev.map(alert =>
                alert.id === alertId ? { ...alert, read: true } : alert
            )
        );
    };

    // Удалить уведомление
    const deleteAlert = (alertId: number) => {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    };

    return (
        <div className="page alert-page active">
            <div className="alert-title">All notifications</div>

            {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>
                    No notifications yet
                </div>
            ) : (
                alerts.map(alert => (
                    <div
                        key={alert.id}
                        className="notification"
                        style={{ opacity: alert.read ? 0.6 : 1 }}
                        onClick={() => markAsRead(alert.id)}
                    >
                        <div className="notification-title">
              <span>
                {!alert.read && <span style={{ color: '#01ff77', marginRight: '5px' }}>●</span>}
                  {alert.title}
              </span>
                            <span className="notification-time">
                {formatTime(alert.createdAt)}
                                <button
                                    className="delete-btn"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        marginLeft: '10px',
                                        cursor: 'pointer',
                                        color: '#888'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAlert(alert.id);
                                    }}
                                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
                        </div>
                        <div className="notification-text">{alert.text}</div>
                    </div>
                ))
            )}
        </div>
    );
};

export default AlertsPage;