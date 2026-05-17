import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';
import {
  apiAdminMe,
  apiApprove,
  apiBan,
  apiListCompanies,
  apiReject,
  apiUnban,
  type Company,
  type StatusFilter,
} from './api';
import Login from './Login';
import CompanyCard from './CompanyCard';
import ReasonModal from './ReasonModal';

type AdminCheck = 'unknown' | 'allowed' | 'denied';
type Modal =
  | { kind: 'reject' | 'ban'; uid: string; companyLabel: string }
  | null;

const TABS: { id: StatusFilter; label: string }[] = [
  { id: 'pending',  label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'banned',   label: 'Banned' },
  { id: 'all',      label: 'All' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [admin, setAdmin] = useState<AdminCheck>('unknown');
  const [tab, setTab] = useState<StatusFilter>('pending');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setAdmin('unknown');
        setCompanies([]);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setAdmin('unknown');
    apiAdminMe()
      .then(() => setAdmin('allowed'))
      .catch(() => setAdmin('denied'));
  }, [user]);

  const reload = useCallback(async () => {
    if (admin !== 'allowed') return;
    setLoading(true);
    setError(null);
    try {
      const list = await apiListCompanies(tab);
      setCompanies(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [admin, tab]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleApprove = async (uid: string) => {
    if (!confirm('Approve this company?')) return;
    try {
      await apiApprove(uid);
      await reload();
    } catch (err: any) {
      alert(`Approve failed: ${err?.message ?? err}`);
    }
  };

  const handleUnban = async (uid: string) => {
    if (!confirm('Unban this user?')) return;
    try {
      await apiUnban(uid);
      await reload();
    } catch (err: any) {
      alert(`Unban failed: ${err?.message ?? err}`);
    }
  };

  const submitModal = async (reason: string) => {
    if (!modal) return;
    try {
      if (modal.kind === 'reject') await apiReject(modal.uid, reason);
      else                          await apiBan(modal.uid, reason);
      setModal(null);
      await reload();
    } catch (err: any) {
      alert(`Action failed: ${err?.message ?? err}`);
    }
  };

  if (!authReady) {
    return <div className="spinner">Loading…</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>Marki — Company Applications</h1>
        <div className="who">
          {user.email}
          <button onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      {admin === 'unknown' && <div className="spinner">Checking admin access…</div>}

      {admin === 'denied' && (
        <div className="error" style={{ maxWidth: 540 }}>
          Your account ({user.email}) is signed in to Firebase, but it is not in the backend's
          <code style={{ margin: '0 4px' }}>ADMIN_UIDS</code> allowlist. Ask whoever runs the API
          to add this UID:
          <div style={{ fontFamily: 'monospace', marginTop: 8 }}>{user.uid}</div>
        </div>
      )}

      {admin === 'allowed' && (
        <>
          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {tab === t.id && <span className="count">{companies.length}</span>}
              </button>
            ))}
          </div>

          {error && <div className="error">{error}</div>}

          {loading ? (
            <div className="spinner">Loading…</div>
          ) : companies.length === 0 ? (
            <div className="empty">No companies in this bucket.</div>
          ) : (
            companies.map(c => (
              <CompanyCard
                key={c.uid}
                company={c}
                onApprove={() => handleApprove(c.uid)}
                onReject={() =>
                  setModal({ kind: 'reject', uid: c.uid, companyLabel: c.companyName || c.name })
                }
                onBan={() =>
                  setModal({ kind: 'ban', uid: c.uid, companyLabel: c.companyName || c.name })
                }
                onUnban={() => handleUnban(c.uid)}
              />
            ))
          )}
        </>
      )}

      {modal && (
        <ReasonModal
          title={modal.kind === 'reject' ? 'Reject application' : 'Ban account'}
          description={
            modal.kind === 'reject'
              ? `Reject ${modal.companyLabel}'s application. The user can re-apply later.`
              : `Ban ${modal.companyLabel}. The account will be blocked from re-applying until unbanned.`
          }
          confirmLabel={modal.kind === 'reject' ? 'Reject' : 'Ban'}
          confirmVariant={modal.kind === 'reject' ? 'btn-warn' : 'btn-danger'}
          reasonRequired={modal.kind === 'ban'}
          onCancel={() => setModal(null)}
          onConfirm={submitModal}
        />
      )}
    </div>
  );
}
