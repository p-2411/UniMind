import { useState } from 'react';
import logo from '../assets/logo.png';

const API_BASE_URL = 'http://localhost:8000';

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
    <div className="fixed inset-0 flex items-center justify-center px-6 bg-gradient-to-br from-gray-950 to-[#052334]">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="UniMind Logo" className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-orange-500 text-transparent bg-clip-text">
            UniMind
          </h1>
          <p className="text-slate-600 mt-2 text-center">
            Log in to start your focus sessions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-500 hover:from-yellow-400 hover:via-orange-500 hover:to-orange-600 text-slate-900 font-semibold py-3 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          Don't have an account?{' '}
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Sign up on web
          </a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;