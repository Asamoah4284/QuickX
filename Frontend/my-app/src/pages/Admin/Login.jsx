import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiLock, FiMail, FiShield } from 'react-icons/fi';
import BrandLogo from '../../ui/Logo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const inputClass =
  'block w-full rounded-xl border border-line bg-ink-850 py-3 pl-11 pr-4 text-sm text-fg placeholder:text-fg-subtle shadow-sm transition ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ' +
  '[color-scheme:dark] autofill:shadow-[inset_0_0_0_1000px_var(--color-ink-850)] autofill:[-webkit-text-fill-color:var(--color-fg)]';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/admin/login`, formData);
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('admin', JSON.stringify(res.data.admin));
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-800">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <BrandLogo size={44} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">
              Admin sign in
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-subtle">
              QuickX control center. Sign in with your admin details.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-ink-850 p-8 shadow-sm">
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              {error ? (
                <div
                  role="alert"
                  className="flex gap-3 rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down"
                >
                  <span className="mt-0.5 shrink-0 text-down" aria-hidden>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <FiMail className="h-5 w-5 text-fg-subtle" aria-hidden />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="admin@example.com"
                    aria-invalid={error ? 'true' : 'false'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <FiLock className="h-5 w-5 text-fg-subtle" aria-hidden />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Enter your password"
                    aria-invalid={error ? 'true' : 'false'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-fg-subtle">
            <Link to="/" className="font-medium text-brand-400 transition hover:text-brand-300">
              Back to site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
