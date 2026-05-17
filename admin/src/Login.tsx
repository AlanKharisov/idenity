import { useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <h2>Marki Admin</h2>
      <p className="sub">Authorized accounts only.</p>

      <button
        type="button"
        className="btn"
        onClick={submitGoogle}
        disabled={busy}
        style={{ width: '100%', padding: 12, fontSize: 14, marginBottom: 8 }}
      >
        {busy ? 'Working…' : 'Continue with Google'}
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--muted)',
          fontSize: 11,
          margin: '14px 0 6px',
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        OR EMAIL
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={submitEmail}>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={busy || !email || !password}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
