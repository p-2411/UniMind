import { useState } from 'react';
import logo from '../assets/logo.png';
import '../styles/popup.css';
import { API_BASE_URL, FRONTEND_URL } from '../config.js';

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Store auth data in Chrome storage
      await chrome.storage.local.set({
        access_token: data.access_token,
        user: data.user,
      });

      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="popup-root">
      <div className="card" style={{ gap: '1.25rem' }}>
        <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          <img src={logo} alt="UniMind Logo" className="logo-img" />
          <h1
            className="title"
            style={{
              background: 'linear-gradient(90deg,#fde68a 0%,#fb923c 50%,#f97316 100%)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            UniMind
          </h1>
          <p className="subtitle">Log in to start your focus sessions</p>
        </div>

        {error && <div className="alert">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-group">
            <label className="input-label" htmlFor="extension-email">Email</label>
            <input
              id="extension-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="extension-password">Password</label>
            <input
              id="extension-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="muted-link">
          Don't have an account?{' '}
          <a href={FRONTEND_URL} target="_blank" rel="noopener noreferrer">
            Sign up on the web
          </a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
