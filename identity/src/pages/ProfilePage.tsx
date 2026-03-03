import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProfilePageProps {
    onOpenWalletSettings: () => void;
    onOpenCryptoWallets: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenWalletSettings, onOpenCryptoWallets }) => {
    const [currentPage, setCurrentPage] = useState('profile');
    const { currentUser, logout, updateUserProfile, refreshLocation } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    if (!currentUser) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
    }

    const editProfile = () => {
        const newName = prompt('Enter your name:', currentUser.name);
        if (newName) {
            const newBio = prompt('Enter your bio:', currentUser.bio || '');
            const newUsername = prompt('Enter your username:', currentUser.username || '');
            updateUserProfile({
                name: newName,
                bio: newBio || currentUser.bio,
                username: newUsername || currentUser.username
            });
        }
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            await logout();
        }
    };

    const changePassword = () => {
        if (newPassword !== confirmNewPassword) {
            alert("New passwords don't match");
            return;
        }
        alert('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = '/img/default-avatar.png';
    };

    return (
        <div className="profile-page active">
            <div className="profile-header">
                <div className="back-btn" onClick={() => window.history.back()}>
                    <i className="fas fa-arrow-left"></i>
                </div>
                <div className="profile-avatar">
                    <img
                        src={currentUser.avatar || '/img/default-avatar.png'}
                        alt="Profile Avatar"
                        onError={handleImageError}
                    />
                </div>
                <div className="profile-name">{currentUser.name}</div>
                <div className="profile-username" style={{
                    color: '#01ff77',
                    fontSize: '14px',
                    marginBottom: '10px'
                }}>
                    @{currentUser.username || 'username'}
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '10px'
                }}>
                    <i className="fas fa-map-marker-alt" style={{ color: '#01ff77' }}></i>
                    <span style={{ fontSize: '16px', color: '#666' }}>
            {currentUser.location || 'Detecting location...'}
          </span>
                    <button
                        onClick={refreshLocation}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#01ff77',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>

                <div className="profile-bio" style={{
                    padding: '10px 20px',
                    color: '#666',
                    fontSize: '14px'
                }}>
                    {currentUser.bio || 'No bio yet'}
                </div>
                <div className="profile-email" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    fontSize: '14px',
                    color: '#888'
                }}>
                    <i className="fas fa-envelope" style={{ color: '#01ff77' }}></i>
                    <span>{currentUser.email}</span>
                </div>
            </div>

            <div className="section-title" style={{
                fontSize: '16px',
                fontWeight: 'bold',
                margin: '15px',
                color: '#333'
            }}>Account</div>

            <div className="account-card" style={{
                background: 'white',
                borderRadius: '15px',
                margin: '0 15px 15px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                overflow: 'hidden'
            }}>
                <div className="account-item" onClick={editProfile} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                }}>
                    <div>
                        <i className="fas fa-user-edit" style={{ color: '#01ff77', width: '25px' }}></i>
                        <span style={{ marginLeft: '10px' }}>Edit Profile</span>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>

                <div className="account-item" onClick={() => setCurrentPage('security')} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                }}>
                    <div>
                        <i className="fas fa-lock" style={{ color: '#01ff77', width: '25px' }}></i>
                        <span style={{ marginLeft: '10px' }}>Security</span>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>

                <div className="account-item" onClick={onOpenCryptoWallets} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                }}>
                    <div>
                        <i className="fas fa-link" style={{ color: '#01ff77', width: '25px' }}></i>
                        <span style={{ marginLeft: '10px' }}>Crypto Wallets</span>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>

                <div className="account-item" onClick={onOpenWalletSettings} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                }}>
                    <div>
                        <i className="fas fa-wallet" style={{ color: '#01ff77', width: '25px' }}></i>
                        <span style={{ marginLeft: '10px' }}>Marki Wallet</span>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>

                <div className="account-item" onClick={handleLogout} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                }}>
                    <div>
                        <i className="fas fa-sign-out-alt" style={{ color: '#ff4444', width: '25px' }}></i>
                        <span style={{ marginLeft: '10px' }}>Logout</span>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>
            </div>

            {/* Security Page */}
            {currentPage === 'security' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'white',
                    zIndex: 2100,
                    overflowY: 'auto'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        position: 'relative',
                        borderBottom: '1px solid #f0f0f0'
                    }}>
                        <button
                            onClick={() => setCurrentPage('profile')}
                            style={{
                                position: 'absolute',
                                left: '15px',
                                top: '20px',
                                background: 'none',
                                border: 'none',
                                fontSize: '20px',
                                color: '#01ff77',
                                cursor: 'pointer'
                            }}
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#333',
                            textAlign: 'center',
                            margin: 0
                        }}>Security Settings</h2>
                    </div>

                    <div style={{ padding: '20px' }}>
                        <div style={{
                            background: '#f5f5f5',
                            borderRadius: '15px',
                            padding: '20px',
                            marginBottom: '15px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#333',
                                marginBottom: '15px'
                            }}>Change Password</h3>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    color: '#666',
                                    marginBottom: '5px'
                                }}>Current Password</label>
                                <input
                                    type="password"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    color: '#666',
                                    marginBottom: '5px'
                                }}>New Password</label>
                                <input
                                    type="password"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    color: '#666',
                                    marginBottom: '5px'
                                }}>Confirm New Password</label>
                                <input
                                    type="password"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    placeholder="Confirm new password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={changePassword}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: '#01ff77',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Save Changes
                            </button>
                        </div>

                        <div style={{
                            background: '#f5f5f5',
                            borderRadius: '15px',
                            padding: '20px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#333',
                                marginBottom: '15px'
                            }}>Two-Factor Authentication</h3>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <span>Enable 2FA</span>
                                <label style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    width: '50px',
                                    height: '24px'
                                }}>
                                    <input
                                        type="checkbox"
                                        style={{
                                            opacity: 0,
                                            width: 0,
                                            height: 0,
                                            position: 'absolute'
                                        }}
                                        checked={twoFactorEnabled}
                                        onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        cursor: 'pointer',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: twoFactorEnabled ? '#01ff77' : '#ccc',
                                        borderRadius: '34px',
                                        transition: '0.4s'
                                    }}>
                    <span style={{
                        position: 'absolute',
                        height: '16px',
                        width: '16px',
                        left: twoFactorEnabled ? '30px' : '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.4s'
                    }} />
                  </span>
                                </label>
                            </div>
                            <p style={{
                                fontSize: '12px',
                                color: '#888',
                                marginTop: '10px'
                            }}>
                                Two-factor authentication adds an extra layer of security to your account.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;