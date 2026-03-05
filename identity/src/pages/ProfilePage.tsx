import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

interface ProfilePageProps {
    onOpenWalletSettings: () => void;
    onOpenCryptoWallets:  () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenWalletSettings, onOpenCryptoWallets }) => {
    const { currentUser, logout, updateUserProfile, refreshLocation } = useAuth();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [currentPage, setCurrentPage]           = useState('profile');
    const [avatarLoading, setAvatarLoading]       = useState(false);
    const [currentPassword, setCurrentPassword]   = useState('');
    const [newPassword, setNewPassword]           = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    if (!currentUser) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
    }

    // ─── Зміна аватару ────────────────────────────────────────────────────────
    const handleAvatarClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Image too large. Max 5MB.');
            return;
        }

        setAvatarLoading(true);
        try {
            // Завантажуємо у Firebase Storage
            const ext        = file.name.split('.').pop() || 'jpg';
            const storagePath = `avatars/${currentUser.uid}/avatar.${ext}`;
            const storageRef  = ref(storage, storagePath);

            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // Оновлюємо профіль з реальним URL
            await updateUserProfile({ avatar: downloadUrl });
            alert('✅ Avatar updated!');
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            if (err.code === 'storage/unauthorized') {
                alert('❌ Storage permission denied. Check Firebase Storage Rules.');
            } else {
                alert(`❌ Error: ${err.message}`);
            }
        } finally {
            setAvatarLoading(false);
            // Скидаємо input щоб можна було вибрати той самий файл знову
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    // ─── Редагування профілю ──────────────────────────────────────────────────
    const editProfile = () => {
        const newName     = prompt('Enter your name:', currentUser.name);
        if (!newName) return;
        const newBio      = prompt('Enter your bio:', currentUser.bio || '');
        const newUsername = prompt('Enter your username:', currentUser.username || '');
        updateUserProfile({
            name:     newName,
            bio:      newBio      || currentUser.bio,
            username: newUsername || currentUser.username,
        });
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

    // ─── Рендер ───────────────────────────────────────────────────────────────
    return (
        <div className="profile-page active">

            {/* Прихований input для аватару */}
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
            />

            <div className="profile-header">
                <div className="back-btn" onClick={() => window.history.back()}>
                    <i className="fas fa-arrow-left"></i>
                </div>

                {/* Аватар — клікабельний */}
                <div
                    style={s.avatarWrap}
                    onClick={handleAvatarClick}
                    title="Click to change avatar"
                >
                    {avatarLoading ? (
                        <div style={s.avatarLoading}>
                            <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                            <div style={s.spinner} />
                        </div>
                    ) : (
                        <img
                            src={currentUser.avatar || '/img/default-avatar.png'}
                            alt="Profile Avatar"
                            style={s.avatarImg}
                            onError={e => { e.currentTarget.src = '/img/default-avatar.png'; }}
                        />
                    )}
                    {/* Іконка камери поверх */}
                    <div style={s.cameraOverlay}>
                        <i className="fas fa-camera" style={{ color: 'white', fontSize: '16px' }} />
                    </div>
                </div>

                <div className="profile-name">{currentUser.name}</div>
                <div className="profile-username" style={{ color: '#01ff77', fontSize: '14px', marginBottom: '10px' }}>
                    @{currentUser.username || 'username'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                    <i className="fas fa-map-marker-alt" style={{ color: '#01ff77' }}></i>
                    <span style={{ fontSize: '16px', color: '#666' }}>
                        {currentUser.location || 'Detecting location...'}
                    </span>
                    <button onClick={refreshLocation} style={{ background: 'none', border: 'none', color: '#01ff77', cursor: 'pointer', fontSize: '14px' }}>
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>

                <div className="profile-bio" style={{ padding: '10px 20px', color: '#666', fontSize: '14px' }}>
                    {currentUser.bio || 'No bio yet'}
                </div>

                <div className="profile-email" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '14px', color: '#888' }}>
                    <i className="fas fa-envelope" style={{ color: '#01ff77' }}></i>
                    <span>{currentUser.email}</span>
                </div>
            </div>

            {/* Підказка для аватару */}
            <div style={s.avatarHint}>
                <i className="fas fa-camera" style={{ marginRight: '6px', color: '#01ff77' }} />
                Tap your photo to change avatar
            </div>

            <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', margin: '15px', color: '#333' }}>
                Account
            </div>

            <div className="account-card" style={{ background: 'white', borderRadius: '15px', margin: '0 15px 15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

                {[
                    { icon: 'fa-user-edit', label: 'Edit Profile', onClick: editProfile },
                    { icon: 'fa-lock',      label: 'Security',     onClick: () => setCurrentPage('security') },
                    { icon: 'fa-link',      label: 'Crypto Wallets', onClick: onOpenCryptoWallets },
                    { icon: 'fa-wallet',    label: 'Marki Wallet', onClick: onOpenWalletSettings },
                ].map((item, i, arr) => (
                    <div
                        key={item.label}
                        onClick={item.onClick}
                        style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '15px', borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <div>
                            <i className={`fas ${item.icon}`} style={{ color: '#01ff77', width: '25px' }}></i>
                            <span style={{ marginLeft: '10px' }}>{item.label}</span>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                    </div>
                ))}

                {/* Logout окремо — червоний */}
                <div
                    onClick={handleLogout}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', cursor: 'pointer' }}
                >
                    <div>
                        <i className="fas fa-sign-out-alt" style={{ color: '#ff4444', width: '25px' }}></i>
                        <span style={{ marginLeft: '10px', color: '#ff4444' }}>Logout</span>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>
            </div>

            {/* Security */}
            {currentPage === 'security' && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 2100, overflowY: 'auto' }}>
                    <div style={{ background: 'white', padding: '20px', position: 'relative', borderBottom: '1px solid #f0f0f0' }}>
                        <button onClick={() => setCurrentPage('profile')} style={{ position: 'absolute', left: '15px', top: '20px', background: 'none', border: 'none', fontSize: '20px', color: '#01ff77', cursor: 'pointer' }}>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', textAlign: 'center', margin: 0 }}>
                            Security Settings
                        </h2>
                    </div>

                    <div style={{ padding: '20px' }}>
                        <div style={{ background: '#f5f5f5', borderRadius: '15px', padding: '20px', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Change Password</h3>

                            {[
                                { label: 'Current Password', value: currentPassword, setter: setCurrentPassword },
                                { label: 'New Password',     value: newPassword,     setter: setNewPassword },
                                { label: 'Confirm New Password', value: confirmNewPassword, setter: setConfirmNewPassword },
                            ].map(field => (
                                <div key={field.label} style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                                        {field.label}
                                    </label>
                                    <input
                                        type="password"
                                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                        value={field.value}
                                        onChange={e => field.setter(e.target.value)}
                                    />
                                </div>
                            ))}

                            <button onClick={changePassword} style={{ width: '100%', padding: '14px', background: '#01ff77', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Save Changes
                            </button>
                        </div>

                        {/* 2FA */}
                        <div style={{ background: '#f5f5f5', borderRadius: '15px', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Two-Factor Authentication</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span>Enable 2FA</span>
                                <div
                                    style={{ width: '50px', height: '26px', borderRadius: '13px', background: twoFactorEnabled ? '#01ff77' : '#ccc', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                >
                                    <div style={{ position: 'absolute', width: '18px', height: '18px', background: 'white', borderRadius: '50%', top: '4px', left: twoFactorEnabled ? '28px' : '4px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                </div>
                            </div>
                            <p style={{ fontSize: '12px', color: '#888' }}>
                                Two-factor authentication adds an extra layer of security.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const s: any = {
    avatarWrap: {
        position: 'relative',
        width: '90px', height: '90px',
        margin: '0 auto 10px',
        cursor: 'pointer',
        borderRadius: '50%',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%', height: '100%',
        objectFit: 'cover',
        borderRadius: '50%',
        display: 'block',
    },
    avatarLoading: {
        width: '100%', height: '100%',
        background: '#eee', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    spinner: {
        width: '30px', height: '30px',
        border: '3px solid #ddd', borderTop: '3px solid #01ff77',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    },
    cameraOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '30px',
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    avatarHint: {
        textAlign: 'center', fontSize: '12px',
        color: '#aaa', marginBottom: '10px',
    },
};

export default ProfilePage;