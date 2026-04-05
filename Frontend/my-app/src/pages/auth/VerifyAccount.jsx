import { useState, useEffect } from 'react';
import { FiLock, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '@/config/api';

function VerifyAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email') || '';
  const phone = queryParams.get('phone') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`).focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/api/users/verify-account`, {
        email,
        code: verificationCode
      });
      
      setSuccess('Account verified successfully! Redirecting...');
      
      // Store new token and user data
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('auth-change'));

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_URL}/api/users/resend-otp`, { email });
      setSuccess('Verification code resent successfully!');
      setTimer(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 overflow-hidden">
      <img 
        src="/images/hero.png" 
        alt="Page Background" 
        className="absolute inset-0 w-full h-full object-cover" 
      />
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>
      
      <div className="w-full max-w-md overflow-hidden rounded-sm shadow-2xl bg-white mt-12 relative z-10 p-8">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <FiLock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a 6-digit code to your phone <span className="font-medium text-gray-900">{phone}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`code-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-600">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={timer > 0 || resendLoading}
              className={`font-medium ${timer > 0 || resendLoading ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-500'} inline-flex items-center`}
            >
              {resendLoading ? (
                <FiRefreshCw className="animate-spin mr-1 h-3 w-3" />
              ) : null}
              {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyAccount;
