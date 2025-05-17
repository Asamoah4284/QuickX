import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiLock, FiLogIn, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
// import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// import { auth } from "../../components/firebase"; // <-- this is critical
// import { onAuthStateChanged } from "firebase/auth";


 

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      
      // Redirect to home page instead of membership area
      navigate('/', { replace: true });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl shadow-xl bg-white">
        <div className="md:flex">
          {/* Left Side - Promotional Content */}
          <div className="md:w-2/5 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white flex flex-col justify-center">
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
              <p className="text-blue-100 mb-6">Sign in to continue your learning journey</p>
              
              <div className="hidden md:block space-y-4 mt-8">
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-full mr-3">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm0 18a8 8 0 100-16 8 8 0 000 16zm-1-13a1 1 0 112 0v4a1 1 0 11-2 0V5zm1 8a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm">Access exclusive content available only to members</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-full mr-3">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0v3H7V4h6zm-6 8v4h6v-4H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm">Track your progress across all courses</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-full mr-3">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path fillRule="evenodd" d="M16.7 5.3a9 9 0 11-13.4 0 9 9 0 0113.4 0zM10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm">Connect with other learners in the community</p>
                </div>
              </div>
              
              {from !== '/' && (
                <div className="mt-8 p-3 bg-white/10 text-white rounded-lg text-sm backdrop-blur-sm">
                  Please sign in to access the requested page
                </div>
              )}
            </div>
          </div>
          
          {/* Right Side - Login Form */}
          <div className="md:w-3/5 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              <div className="flex items-center text-sm">
                <span className="text-gray-600 mr-2">New to our platform?</span>
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 inline-flex items-center">
                  Sign up <FiArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
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
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-700">
                    Remember me
                  </label>
                </div>
                <div className="text-xs">
                  <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </Link>
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm"
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    {isLoading ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <FiLogIn className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform duration-200" />
                    )}
                  </span>
                  <span className="ml-2">{isLoading ? 'Signing in...' : 'Sign in'}</span>
                </button>
              </div>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
    
                  type="button"
                  className="flex justify-center items-center py-2 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                    <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.75 18.21 13.51 18.59 12 18.59C9.1 18.59 6.66 16.64 5.79 14H2.11V16.85C3.92 20.53 7.67 23 12 23Z" fill="#34A853"/>
                    <path d="M5.79 14C5.58 13.34 5.46 12.63 5.46 11.9C5.46 11.17 5.58 10.46 5.79 9.8V6.95H2.11C1.41 8.44 1 10.13 1 11.9C1 13.67 1.41 15.36 2.11 16.85L5.79 14Z" fill="#FBBC05"/>
                    <path d="M12 5.21C13.55 5.21 14.97 5.78 16.08 6.83L19.25 3.66C17.45 1.99 14.97 1 12 1C7.67 1 3.92 3.47 2.11 7.15L5.79 10C6.66 7.36 9.1 5.21 12 5.21Z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                
                <button
                  type="button"
                  className="flex justify-center items-center py-2 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M30 15C30 6.71573 23.2843 0 15 0C6.71573 0 0 6.71573 0 15C0 22.4869 5.48525 28.6925 12.6562 29.8177V19.3359H8.84766V15H12.6562V11.6953C12.6562 7.93359 14.8957 5.85938 18.322 5.85938C19.9626 5.85938 21.6797 6.15234 21.6797 6.15234V9.84375H19.7883C17.925 9.84375 17.3438 11 17.3438 12.1875V15H21.5039L20.8389 19.3359H17.3438V29.8177C24.5147 28.6925 30 22.4869 30 15Z" fill="#1877F2"/>
                    <path d="M20.8389 19.3359L21.5039 15H17.3438V12.1875C17.3438 11 17.925 9.84375 19.7883 9.84375H21.6797V6.15234C21.6797 6.15234 19.9626 5.85938 18.322 5.85938C14.8957 5.85938 12.6562 7.93359 12.6562 11.6953V15H8.84766V19.3359H12.6562V29.8177C13.2965 29.9388 13.9518 30 14.625 30C15.2982 30 15.9534 29.9388 16.5938 29.8177V19.3359H20.8389Z" fill="white"/>
                  </svg>
                  Facebook
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; 