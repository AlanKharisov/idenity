import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUploadAvatar, apiChangePassword, apiRequestApproval } from '../services/apiClient';

interface ProfilePageProps {
    onOpenWalletSettings: () => void;
    onOpenCryptoWallets:  () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenWalletSettings, onOpenCryptoWallets }) => {
    const { currentUser, logout, updateUserProfile, refreshLocation } = useAuth();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [currentPage, setCurrentPage]               = useState('profile');
    const [avatarLoading, setAvatarLoading]           = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled]     = useState(false);

    // Security
    const [newPassword, setNewPassword]               = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // Company approval form
    const [companyName, setCompanyName]               = useState('');
    const [regNumber, setRegNumber]                   = useState('');
    const [contactEmail, setContactEmail]             = useState('');
    const [companyDesc, setCompanyDesc]               = useState('');
    const [submitting, setSubmitting]                 = useState(false);

    if (!currentUser) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
    }

    // ─── Avatar ───────────────────────────────────────────────────────────────
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
        if (file.size > 5 * 1024 * 1024)    { alert('Image too large. Max 5MB.'); return; }

        setAvatarLoading(true);
        try {
            const { url } = await apiUploadAvatar(currentUser.uid, file);
            await updateUserProfile({ avatar: url });
            alert('✅ Avatar updated!');
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        } finally {
            setAvatarLoading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    // ─── Edit profile ────────────────────────────────────────────────────────
    const editProfile = () => {
        const newName     = prompt('Enter your name:', currentUser.name);
        if (!newName) return;
        const newBio      = prompt('Enter your bio:', currentUser.bio || '');
        const newUsername = prompt('Enter your username:', currentUser.username || '');
        updateUserProfile({ name: newName, bio: newBio || currentUser.bio, username: newUsername || currentUser.username });
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) await logout();
    };

    // ─── Change password ──────────────────────────────────────────────────────
    const changePassword = async () => {
        if (newPassword !== confirmNewPassword) { alert("New passwords don't match"); return; }
        if (newPassword.length < 8) { alert('Password must be at least 8 characters'); return; }
        try {
            await apiChangePassword(currentUser.uid, { newPassword });
            alert('✅ Password changed successfully');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        }
    };

    // ─── Company approval ────────────────────────────────────────────────────
    const handleSubmitApproval = async () => {
        if (!companyName.trim() || !regNumber.trim() || !contactEmail.trim()) {
            alert('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        try {
            await apiRequestApproval(currentUser.uid, {
                companyName:        companyName.trim(),
                registrationNumber: regNumber.trim(),
                contactEmail:       contactEmail.trim(),
                description:        companyDesc.trim(),
            });
            alert('✅ Company verification request submitted!');
            setCurrentPage('profile');
        } catch (err: any) {
            alert(`❌ Error: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="profile-page active">

            <input
                ref={avatarInputRef}
                type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
            />

            <div className="profile-header">
                <div className="back-btn" onClick={() => window.history.back()}>
                    <i className="fas fa-arrow-left"></i>
                </div>

                {/* Avatar */}
                <div style={s.avatarWrap} onClick={() => avatarInputRef.current?.click()} title="Click to change avatar">
                    {avatarLoading ? (
                        <div style={s.avatarLoading}>
                            <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                            <div style={s.spinner} />
                        </div>
                    ) : (
                        <img src={currentUser.avatar || '/img/default-avatar.png'} alt="Avatar"
                             style={s.avatarImg}
                             onError={e => { e.currentTarget.src = '/img/default-avatar.png'; }} />
                    )}
                    <div style={s.cameraOverlay}>
                        <i className="fas fa-camera" style={{ color: 'white', fontSize: '16px' }} />
                    </div>
                </div>

                <div className="profile-name">{currentUser.name}</div>
                <div className="profile-username" style={{ color: '#01ff77', fontSize: '14px', marginBottom: '10px' }}>
                    @{currentUser.username || 'username'}
                    {currentUser.companyApproved && (
                        <span style={{ marginLeft: '8px', background: '#01ff77', color: 'black', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>✓ Verified</span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                    <i className="fas fa-map-marker-alt" style={{ color: '#01ff77' }}></i>
                    <span style={{ fontSize: '16px', color: '#666' }}>{currentUser.location || 'Detecting...'}</span>
                    <button onClick={refreshLocation} style={{ background: 'none', border: 'none', color: '#01ff77', cursor: 'pointer' }}>
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

            <div style={s.avatarHint}>
                <i className="fas fa-camera" style={{ marginRight: '6px', color: '#01ff77' }} /> Tap your photo to change avatar
            </div>

            <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', margin: '15px', color: '#333' }}>Account</div>

            <div className="account-card" style={{ background: 'white', borderRadius: '15px', margin: '0 15px 15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {[
                    { icon: 'fa-user-edit',    label: 'Edit Profile',     onClick: editProfile },
                    { icon: 'fa-lock',          label: 'Security',         onClick: () => setCurrentPage('security') },
                    { icon: 'fa-link',          label: 'Crypto Wallets',   onClick: onOpenCryptoWallets },
                    { icon: 'fa-wallet',        label: 'Marki Wallet',     onClick: onOpenWalletSettings },
                    { icon: 'fa-building',      label: 'Company Approval', onClick: () => setCurrentPage('company') },
                ].map((item, i, arr) => (
                    <div key={item.label} onClick={item.onClick}
                         style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer' }}>
                        <div>
                            <i className={`fas ${item.icon}`} style={{ color: '#01ff77', width: '25px' }}></i>
                            <span style={{ marginLeft: '10px' }}>{item.label}</span>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                    </div>
                ))}

                <div onClick={handleLogout}
                     style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', cursor: 'pointer' }}>
                    <div>
                        <i className="fas fa-sign-out-alt" style={{ color: '#ff4444', width: '25px' }}></i>
                        <span style={{ marginLeft: '10px', color: '#ff4444' }}>Logout</span>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>
            </div>

            {/* ── Security page ── */}
            {currentPage === 'security' && (
                <div style={s.overlay}>
                    <div style={s.overlayHeader}>
                        <button onClick={() => setCurrentPage('profile')} style={s.backBtnOverlay}><i className="fas fa-arrow-left"></i></button>
                        <h2 style={s.overlayTitle}>Security Settings</h2>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ background: '#f5f5f5', borderRadius: '15px', padding: '20px', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Change Password</h3>
                            {[
                                { label: 'New Password',         value: newPassword,        setter: setNewPassword },
                                { label: 'Confirm New Password', value: confirmNewPassword, setter: setConfirmNewPassword },
                            ].map(field => (
                                <div key={field.label} style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '5px' }}>{field.label}</label>
                                    <input type="password"
                                           style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                                           placeholder={`Enter ${field.label.toLowerCase()}`}
                                           value={field.value}
                                           onChange={e => field.setter(e.target.value)} />
                                </div>
                            ))}
                            <button onClick={changePassword}
                                    style={{ width: '100%', padding: '14px', background: '#01ff77', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Save Changes
                            </button>
                        </div>

                        {/* 2FA */}
                        <div style={{ background: '#f5f5f5', borderRadius: '15px', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Two-Factor Authentication</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span>Enable 2FA</span>
                                <div style={{ width: '50px', height: '26px', borderRadius: '13px', background: twoFactorEnabled ? '#01ff77' : '#ccc', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                                     onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}>
                                    <div style={{ position: 'absolute', width: '18px', height: '18px', background: 'white', borderRadius: '50%', top: '4px', left: twoFactorEnabled ? '28px' : '4px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                </div>
                            </div>
                            <p style={{ fontSize: '12px', color: '#888' }}>Two-factor authentication adds an extra layer of security.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Company Approval page ── */}
            {currentPage === 'company' && (
                <div style={s.overlay}>
                    <div style={s.overlayHeader}>
                        <button onClick={() => setCurrentPage('profile')} style={s.backBtnOverlay}><i className="fas fa-arrow-left"></i></button>
                        <h2 style={s.overlayTitle}>Company Verification</h2>
                    </div>
                    <div style={{ padding: '20px' }}>
                        {currentUser.companyApproved ? (
                            <div style={{ background: '#e8f5e9', borderRadius: '15px', padding: '24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                                <h3 style={{ color: '#2e7d32', marginBottom: '8px' }}>Company Verified</h3>
                                <p style={{ color: '#555', fontSize: '14px' }}>Your company account has been approved.</p>
                            </div>
                        ) : currentUser.pendingApproval ? (
                            <div style={{ background: '#fff8e1', borderRadius: '15px', padding: '24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
                                <h3 style={{ color: '#f57f17', marginBottom: '8px' }}>Request Pending</h3>
                                <p style={{ color: '#555', fontSize: '14px' }}>Your company verification request is under review. We'll notify you once it's processed.</p>
                            </div>
                        ) : (
                            <div>
                                <div style={{ background: '#e3f2fd', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#1565c0' }}>
                                    <strong>ℹ️ Company Verification:</strong> Submit a request to get your company verified on the platform. Verified companies gain access to batch NFT uploads and other business features.
                                </div>

                                {[
                                    { label: 'Company Name *',          value: companyName,   setter: setCompanyName,   placeholder: 'e.g. Acme Corp' },
                                    { label: 'Registration Number *',   value: regNumber,     setter: setRegNumber,     placeholder: 'e.g. 12345678' },
                                    { label: 'Contact Email *',         value: contactEmail,  setter: setContactEmail,  placeholder: 'company@example.com' },
                                ].map(field => (
                                    <div key={field.label} style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>{field.label}</label>
                                        <input type="text"
                                               style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                                               placeholder={field.placeholder}
                                               value={field.value}
                                               onChange={e => field.setter(e.target.value)} />
                                    </div>
                                ))}

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Business Description</label>
                                    <textarea
                                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', height: '90px', resize: 'none', boxSizing: 'border-box' }}
                                        placeholder="Briefly describe your company and its NFT activities..."
                                        value={companyDesc}
                                        onChange={e => setCompanyDesc(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleSubmitApproval}
                                    disabled={submitting}
                                    style={{ width: '100%', padding: '14px', background: '#01ff77', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
                                >
                                    {submitting ? 'Submitting...' : '🏢 Submit Verification Request'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const s: any = {
    avatarWrap:    { position: 'relative', width: '90px', height: '90px', margin: '0 auto 10px', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden' },
    avatarImg:     { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' },
    avatarLoading: { width: '100%', height: '100%', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    spinner:       { width: '30px', height: '30px', border: '3px solid #ddd', borderTop: '3px solid #01ff77', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    cameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    avatarHint:    { textAlign: 'center', fontSize: '12px', color: '#aaa', marginBottom: '10px' },
    overlay:       { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 2100, overflowY: 'auto' },
    overlayHeader: { background: 'white', padding: '20px', position: 'relative', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '16px' },
    overlayTitle:  { fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 },
    backBtnOverlay:{ background: 'none', border: 'none', fontSize: '20px', color: '#01ff77', cursor: 'pointer' },
};

export default ProfilePage;
