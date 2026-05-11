import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUploadAvatar, apiChangePassword, apiRequestApproval } from '../services/apiClient';
import { Icon } from '../components/brand';

interface ProfilePageProps {
  onOpenWalletSettings: () => void;
  onOpenCryptoWallets:  () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenWalletSettings, onOpenCryptoWallets }) => {
  const { currentUser, logout, updateUserProfile, refreshLocation } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState<'profile' | 'security' | 'company' | 'edit-profile'>('profile');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '', bio: '', location: '' });
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [companyDesc, setCompanyDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser) {
    return (
      <div className="page active mi-screen-pad" style={{ paddingTop: 80, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB.'); return; }

    setAvatarLoading(true);
    try {
      const { url } = await apiUploadAvatar(currentUser.uid, file);
      await updateUserProfile({ avatar: url });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const openEditProfile = () => {
    setEditForm({
      name: currentUser.name || '',
      username: currentUser.username || '',
      bio: currentUser.bio || '',
      location: currentUser.location || '',
    });
    setCurrentPage('edit-profile');
  };

  const saveProfile = async () => {
    if (!editForm.name.trim() || !editForm.username.trim()) {
      alert('Name and username are required');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({
        name: editForm.name.trim(),
        username: editForm.username.trim(),
        bio: editForm.bio.trim(),
        location: editForm.location.trim(),
      });
      setCurrentPage('profile');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) await logout();
  };

  const changePassword = async () => {
    if (newPassword !== confirmNewPassword) { alert('New passwords do not match'); return; }
    if (newPassword.length < 8) { alert('Password must be at least 8 characters'); return; }
    try {
      await apiChangePassword(currentUser.uid, { newPassword });
      setNewPassword('');
      setConfirmNewPassword('');
      alert('Password changed successfully');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSubmitApproval = async () => {
    if (!companyName.trim() || !regNumber.trim() || !contactEmail.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequestApproval(currentUser.uid, {
        companyName: companyName.trim(),
        registrationNumber: regNumber.trim(),
        contactEmail: contactEmail.trim(),
        description: companyDesc.trim(),
      });
      setCurrentPage('profile');
      alert('Company verification request submitted');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const accountRows: { icon: React.ReactNode; label: string; sub: string; onClick: () => void; badge?: string }[] = [
    { icon: <Icon.User />, label: 'Edit profile', sub: 'Name, username, bio', onClick: openEditProfile },
    { icon: <Icon.Shield />, label: 'Security', sub: twoFactorEnabled ? '2FA enabled' : 'Manage password & 2FA', onClick: () => setCurrentPage('security') },
    { icon: <Icon.Wallet />, label: 'Crypto wallets', sub: 'Connect Phantom & Solflare', onClick: onOpenCryptoWallets },
    { icon: <Icon.CRM />, label: 'Marki Wallet', sub: 'Custodial · Verified', onClick: onOpenWalletSettings },
    { icon: <Icon.Globe />, label: 'Company approval', sub: currentUser.companyApproved ? 'Verified' : currentUser.pendingApproval ? 'Pending review' : 'Submit a request', onClick: () => setCurrentPage('company') },
  ];

  return (
    <div className="page profile-page active mi-screen-pad" style={{ paddingTop: 16, paddingBottom: 100 }}>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />

      {/* Header card */}
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          background: 'linear-gradient(135deg, var(--bg-card), var(--primary-faint))',
          border: '1px solid var(--border)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarLoading ? (
              <div
                style={{
                  width: 72, height: 72,
                  borderRadius: '50%',
                  background: 'var(--bg-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--bg-card)',
                }}
              >
                <div className="spinner" style={{ width: 24, height: 24 }} />
              </div>
            ) : (
              <img
                src={currentUser.avatar || '/img/default-avatar.png'}
                alt="Avatar"
                style={{
                  width: 72, height: 72,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--bg-card)',
                  display: 'block',
                }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/img/default-avatar.png'; }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 24,
                height: 24,
                borderRadius: 12,
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid var(--bg-card)',
              }}
            >
              <Icon.Camera size={12} />
            </div>
          </div>
          {currentUser.companyApproved && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--primary)',
                color: 'white',
                fontWeight: 700,
              }}
            >
              <Icon.Check size={12} /> Verified
            </span>
          )}
        </div>
        <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {currentUser.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>@{currentUser.username || 'username'}</span>
          {currentUser.location && (
            <>
              <span>·</span>
              <span>{currentUser.location}</span>
              <button
                onClick={refreshLocation}
                style={{ color: 'var(--primary)', display: 'inline-flex', padding: 0 }}
                aria-label="Refresh location"
              >
                <Icon.Refresh size={12} />
              </button>
            </>
          )}
        </div>
        {currentUser.bio && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            {currentUser.bio}
          </div>
        )}
      </div>

      {/* Account list */}
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Account
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {accountRows.map((row, i) => (
          <div
            key={row.label}
            onClick={row.onClick}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderBottom: i < accountRows.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 36, height: 36,
                borderRadius: 10,
                background: 'var(--primary-soft)',
                color: 'var(--primary-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {row.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{row.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.sub}</div>
            </div>
            <span style={{ color: 'var(--text-faint)' }}>
              <Icon.ChevronRight />
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleLogout}
        style={{
          marginTop: 18,
          width: '100%',
          padding: 14,
          borderRadius: 14,
          background: 'var(--bg-soft)',
          color: 'var(--danger)',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: 'inherit',
        }}
      >
        <Icon.Logout /> Logout
      </button>

      {/* Security overlay */}
      {currentPage === 'security' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-page)',
            zIndex: 2100,
            overflowY: 'auto',
            padding: '20px',
            paddingBottom: '120px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <button
              onClick={() => setCurrentPage('profile')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--bg-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
              }}
              aria-label="Back"
            >
              <Icon.ArrowLeft />
            </button>
            <h2 className="h2">Security</h2>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <h3 className="h3" style={{ marginBottom: 14 }}>Change password</h3>
            {[
              { label: 'New password', value: newPassword, setter: setNewPassword },
              { label: 'Confirm password', value: confirmNewPassword, setter: setConfirmNewPassword },
            ].map(f => (
              <div className="field" key={f.label} style={{ marginBottom: 12 }}>
                <label>{f.label}</label>
                <input
                  type="password"
                  placeholder="••••••••••"
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                />
              </div>
            ))}
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 6 }}
              onClick={changePassword}
            >
              Save changes
            </button>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 className="h3" style={{ marginBottom: 12 }}>Two-factor authentication</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>Enable 2FA</span>
              <div
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  background: twoFactorEnabled ? 'var(--primary)' : 'var(--border-strong)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.3s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    background: 'white',
                    borderRadius: '50%',
                    top: 4,
                    left: twoFactorEnabled ? 26 : 4,
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Adds an extra layer of security to your account.
            </p>
          </div>
        </div>
      )}

      {/* Edit Profile overlay */}
      {currentPage === 'edit-profile' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-page)',
            zIndex: 2100,
            overflowY: 'auto',
            padding: '20px',
            paddingBottom: '120px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setCurrentPage('profile')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--bg-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
              }}
              aria-label="Back"
            >
              <Icon.ArrowLeft />
            </button>
            <h2 className="h2">Редактирование профиля</h2>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--primary-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: '2px solid var(--primary)',
                }}
              >
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Icon.User />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{currentUser.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>@{currentUser.username}</div>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Имя</label>
              <input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Ваше имя"
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Username</label>
              <input
                value={editForm.username}
                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="@username"
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Bio</label>
              <textarea
                value={editForm.bio}
                onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Расскажите о себе..."
                style={{ height: 80, resize: 'none' as any }}
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Местоположение</label>
              <input
                value={editForm.location}
                onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="Город, страна"
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn btn-primary btn-block"
              style={{ padding: 14, marginTop: 8 }}
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      )}

      {/* Company overlay */}
      {currentPage === 'company' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-page)',
            zIndex: 2100,
            overflowY: 'auto',
            padding: '20px',
            paddingBottom: '120px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <button
              onClick={() => setCurrentPage('profile')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--bg-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
              }}
              aria-label="Back"
            >
              <Icon.ArrowLeft />
            </button>
            <h2 className="h2">Company verification</h2>
          </div>

          {currentUser.companyApproved ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
              <h3 className="h3" style={{ color: 'var(--primary-ink)' }}>Company verified</h3>
              <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                Your company account has been approved.
              </p>
            </div>
          ) : currentUser.pendingApproval ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
              <h3 className="h3" style={{ color: 'var(--warn)' }}>Request pending</h3>
              <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                Your verification request is under review.
              </p>
            </div>
          ) : (
            <div>
              <div
                className="card"
                style={{
                  padding: 14,
                  marginBottom: 16,
                  background: 'var(--primary-faint)',
                  border: '1px solid var(--primary-soft)',
                  fontSize: 13,
                  color: 'var(--primary-ink)',
                }}
              >
                Submit a request to verify your company. Verified accounts unlock batch NFT uploads and business features.
              </div>

              {[
                { label: 'Company name', value: companyName, setter: setCompanyName, placeholder: 'e.g. Acme Corp' },
                { label: 'Registration number', value: regNumber, setter: setRegNumber, placeholder: 'e.g. 12345678' },
                { label: 'Contact email', value: contactEmail, setter: setContactEmail, placeholder: 'company@example.com' },
              ].map(f => (
                <div className="field" key={f.label} style={{ marginBottom: 12 }}>
                  <label>{f.label}</label>
                  <input
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                  />
                </div>
              ))}

              <div className="field" style={{ marginBottom: 16 }}>
                <label>Business description</label>
                <textarea
                  placeholder="Briefly describe your company and its NFT activities…"
                  value={companyDesc}
                  onChange={e => setCompanyDesc(e.target.value)}
                  style={{ height: 90, resize: 'none' as any }}
                />
              </div>

              <button
                onClick={handleSubmitApproval}
                disabled={submitting}
                className="btn btn-primary btn-block"
                style={{ padding: 14 }}
              >
                {submitting ? 'Submitting…' : 'Submit verification request'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
