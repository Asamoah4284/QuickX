import { useState, useEffect } from 'react';
import { FiMail, FiLock, FiLogIn, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { readPendingCheckout, savePendingCheckout } from '../../utils/pendingCheckout';
// import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// import { auth } from "../../components/firebase"; // <-- this is critical
// import { onAuthStateChanged } from "firebase/auth";


 

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = location.state?.from;
  const postLoginPath =
    typeof rawFrom === 'string'
      ? rawFrom
      : typeof rawFrom === 'object' && rawFrom != null && typeof rawFrom.pathname === 'string'
        ? `${rawFrom.pathname}${rawFrom.search || ''}`
        : '/';
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.checkout?.item) {
      savePendingCheckout(location.state.checkout);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/users/login`, {
        email: formData.email,
        password: formData.password
      });
      
      // Store token and user in localStorage
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Make sure any "justRegistered" flag is cleared for login
      sessionStorage.removeItem('justRegistered');
      
      // Dispatch custom event to notify components of authentication
      window.dispatchEvent(new Event('auth-change'));

      const pending = location.state?.checkout || readPendingCheckout();
      if (pending?.item) {
        // Keep sessionStorage until Checkout loads so refresh still resumes payment
        navigate('/checkout', {
          replace: true,
          state: {
            item: pending.item,
            returnPath: pending.returnPath || null,
            returnTabState: pending.returnTabState ?? null,
          },
        });
        return;
      }
      
      navigate(postLoginPath, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  
  
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      <img
        src="/images/hero.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl items-stretch justify-center pt-[4.25rem] sm:items-center sm:px-6 sm:pb-12 sm:pt-28 lg:px-8">
        <div className="flex min-h-[calc(100dvh-4.25rem)] w-full flex-col overflow-hidden bg-white sm:min-h-0 sm:rounded-2xl sm:shadow-[0_16px_48px_rgba(15,23,42,0.12)] sm:ring-1 sm:ring-slate-200/80 md:block">
          <div className="flex min-h-0 flex-1 flex-col md:flex md:min-h-0 md:flex-row">
            <div className="shrink-0 bg-[#1B5EF5] px-5 py-7 text-white sm:px-8 sm:py-8 md:flex md:w-2/5 md:flex-col md:justify-center md:p-8">
              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome Back!</h1>
                <p className="mt-1.5 text-sm text-blue-100 sm:text-base">
                  Sign in to continue your learning journey
                </p>

                <div className="mt-8 hidden space-y-4 md:block">
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-white/20 p-2">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm0 18a8 8 0 100-16 8 8 0 000 16zm-1-13a1 1 0 112 0v4a1 1 0 11-2 0V5zm1 8a1 1 0 100 2 1 1 0 000-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm">Access exclusive content available only to members</p>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-white/20 p-2">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0v3H7V4h6zm-6 8v4h6v-4H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm">Track your progress across all courses</p>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-white/20 p-2">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a9 9 0 11-13.4 0 9 9 0 0113.4 0zM10 18a8 8 0 100-16 8 8 0 000 16z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm">Connect with other learners in the community</p>
                  </div>
                </div>

                {postLoginPath !== '/' && (
                  <div className="mt-5 rounded-lg bg-white/10 p-3 text-sm text-white backdrop-blur-sm md:mt-8">
                    Please sign in to access the requested page
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 md:w-3/5 md:p-8">
              <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold tracking-tight text-[#0B1F44] sm:text-2xl">
                  Sign In
                </h2>
                <p className="text-sm text-slate-500">
                  New here?{' '}
                  <Link
                    to="/register"
                    state={location.state || undefined}
                    className="inline-flex items-center font-semibold text-[#1B5EF5]"
                  >
                    Sign up <FiArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <FiMail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-[#1B5EF5] focus:outline-none focus:ring-2 focus:ring-[#1B5EF5]/20"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <FiLock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="block w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm focus:border-[#1B5EF5] focus:outline-none focus:ring-2 focus:ring-[#1B5EF5]/20"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <FiEyeOff className="h-4 w-4" />
                        ) : (
                          <FiEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="remember-me" className="flex items-center text-xs text-slate-700">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#1B5EF5] focus:ring-[#1B5EF5]"
                    />
                    <span className="ml-2">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#1B5EF5]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative flex w-full items-center justify-center rounded-xl bg-[#1B5EF5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1552D6] disabled:opacity-70"
                  >
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      {isLoading ? (
                        <svg
                          className="h-4 w-4 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <FiLogIn className="h-4 w-4 text-white" />
                      )}
                    </span>
                    <span className="ml-2">{isLoading ? 'Signing in...' : 'Sign in'}</span>
                  </button>
                </div>
              </form>

              <div className="mt-6 pb-1">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-slate-400">Or continue with</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.75 18.21 13.51 18.59 12 18.59C9.1 18.59 6.66 16.64 5.79 14H2.11V16.85C3.92 20.53 7.67 23 12 23Z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.79 14C5.58 13.34 5.46 12.63 5.46 11.9C5.46 11.17 5.58 10.46 5.79 9.8V6.95H2.11C1.41 8.44 1 10.13 1 11.9C1 13.67 1.41 15.36 2.11 16.85L5.79 14Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.21C13.55 5.21 14.97 5.78 16.08 6.83L19.25 3.66C17.45 1.99 14.97 1 12 1C7.67 1 3.92 3.47 2.11 7.15L5.79 10C6.66 7.36 9.1 5.21 12 5.21Z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </button>

                  <button
                    type="button"
                    className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 30 30"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M30 15C30 6.71573 23.2843 0 15 0C6.71573 0 0 6.71573 0 15C0 22.4869 5.48525 28.6925 12.6562 29.8177V19.3359H8.84766V15H12.6562V11.6953C12.6562 7.93359 14.8957 5.85938 18.322 5.85938C19.9626 5.85938 21.6797 6.15234 21.6797 6.15234V9.84375H19.7883C17.925 9.84375 17.3438 11 17.3438 12.1875V15H21.5039L20.8389 19.3359H17.3438V29.8177C24.5147 28.6925 30 22.4869 30 15Z"
                        fill="#1877F2"
                      />
                      <path
                        d="M20.8389 19.3359L21.5039 15H17.3438V12.1875C17.3438 11 17.925 9.84375 19.7883 9.84375H21.6797V6.15234C21.6797 6.15234 19.9626 5.85938 18.322 5.85938C14.8957 5.85938 12.6562 7.93359 12.6562 11.6953V15H8.84766V19.3359H12.6562V29.8177C13.2965 29.9388 13.9518 30 14.625 30C15.2982 30 15.9534 29.9388 16.5938 29.8177V19.3359H20.8389Z"
                        fill="white"
                      />
                    </svg>
                    Facebook
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; 