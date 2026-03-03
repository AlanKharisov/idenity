import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle, signInWithFacebook, signInWithApple } from '../firebase/socialAuth';

interface AuthScreenProps {
    onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
    const [currentForm, setCurrentForm] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { login, register } = useAuth();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!username) {
            setError('Username is required');
            return;
        }

        setLoading(true);
        const result = await register(email, password, name, username, phone);
        setLoading(false);

        if (result.success) {
            onAuthSuccess();
        } else {
            setError(result.error || 'Registration failed');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);
        setLoading(false);

        if (result.success) {
            onAuthSuccess();
        } else {
            setError(result.error || 'Login failed');
        }
    };

    return (
        <div className="screen auth-screen active">
            {/* Форма реєстрації */}
            <div className={`auth-form signup-form ${currentForm === 'signup' ? 'active' : ''}`}>
                <div className="auth-header">
                    <h2 className="auth-title">Sign Up</h2>
                </div>
                <div className="auth-container">
                    {error && <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}

                    <form onSubmit={handleSignup}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="your@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                placeholder="@username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone Number (optional)</label>
                            <input
                                type="tel"
                                placeholder="+380995683023"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="Enter password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                placeholder="Confirm password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Loading...' : 'Sign Up'}
                        </button>
                    </form>

                    <p className="divider">or</p>

                    <div className="social-buttons">
                        <button
                            className="social-btn google"
                            onClick={() => signInWithGoogle()}
                            disabled={loading}
                        >
                            <i className="fab fa-google"></i>
                        </button>
                        <button
                            className="social-btn facebook"
                            onClick={() => signInWithFacebook()}
                            disabled={loading}
                        >
                            <i className="fab fa-facebook-f"></i>
                        </button>
                        <button
                            className="social-btn apple"
                            onClick={() => signInWithApple()}
                            disabled={loading}
                        >
                            <i className="fab fa-apple"></i>
                        </button>
                    </div>

                    <p className="switch-auth">
                        Already have an account?
                        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentForm('login'); setError(''); }}>
                            Sign In
                        </a>
                    </p>
                </div>
            </div>

            {/* Форма входу */}
            <div className={`auth-form login-form ${currentForm === 'login' ? 'active' : ''}`}>
                <div className="auth-header">
                    <h2 className="auth-title">Sign In</h2>
                </div>
                <div className="auth-container">
                    {error && <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}

                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="your@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="Enter password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Loading...' : 'Sign In'}
                        </button>
                        <button className="forgot-password" type="button">Forgot password?</button>
                    </form>

                    <p className="divider">or</p>

                    <div className="social-buttons">
                        <button
                            className="social-btn google"
                            onClick={() => signInWithGoogle()}
                            disabled={loading}
                        >
                            <i className="fab fa-google"></i>
                        </button>
                        <button
                            className="social-btn facebook"
                            onClick={() => signInWithFacebook()}
                            disabled={loading}
                        >
                            <i className="fab fa-facebook-f"></i>
                        </button>
                        <button
                            className="social-btn apple"
                            onClick={() => signInWithApple()}
                            disabled={loading}
                        >
                            <i className="fab fa-apple"></i>
                        </button>
                    </div>

                    <p className="switch-auth">
                        Don't have an account?
                        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentForm('signup'); setError(''); }}>
                            Sign Up
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;