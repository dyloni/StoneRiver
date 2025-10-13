import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { supabase } from '../utils/supabase';
import ChangePasswordModal from '../components/modals/ChangePasswordModal';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [tempUserData, setTempUserData] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('authenticate_user', {
        user_email: email.toLowerCase().trim(),
        user_password: password,
      });

      if (rpcError) {
        throw new Error('Authentication error');
      }

      if (!data || data.length === 0) {
        throw new Error('Invalid email or password');
      }

      const userData = data[0];

      if (userData.requires_password_change) {
        setTempUserData(userData);
        setShowChangePassword(true);
        setLoading(false);
        return;
      }

      login({
        id: userData.id,
        firstName: userData.first_name,
        surname: userData.surname,
        email: userData.email,
        profilePictureUrl: userData.profile_picture_url,
        type: userData.user_type,
        role: userData.role,
      }, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    if (tempUserData) {
      login({
        id: tempUserData.id,
        firstName: tempUserData.first_name,
        surname: tempUserData.surname,
        email: tempUserData.email,
        profilePictureUrl: tempUserData.profile_picture_url,
        type: tempUserData.user_type,
        role: tempUserData.role,
      }, rememberMe);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-bg via-slate-50 to-brand-pink/5 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(236,72,153,0.05),transparent_50%)]"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-brand-pink/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-brand-accent/5 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md p-10 space-y-8 bg-brand-surface rounded-3xl shadow-elevated border border-brand-border/50 relative z-10 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-brand-pink to-brand-dark-pink rounded-2xl shadow-medium">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-brand-text-primary tracking-tight">
             <span className="bg-gradient-to-r from-brand-pink to-brand-dark-pink bg-clip-text text-transparent">Stone</span>
             <span className="text-brand-gray">River</span>
          </h2>
          <p className="mt-3 text-brand-text-secondary font-medium">
            Insurance Agent Portal
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
           <div>
            <label htmlFor="email" className="block text-sm font-semibold text-brand-text-primary mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full px-5 py-3.5 text-brand-text-primary placeholder-slate-400 bg-slate-50 border border-brand-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-base transition-all shadow-inner-soft"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-brand-text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full px-5 py-3.5 text-brand-text-primary placeholder-slate-400 bg-slate-50 border border-brand-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-base transition-all shadow-inner-soft"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-brand-pink focus:ring-brand-pink border-brand-border/50 rounded cursor-pointer transition-all"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-brand-text-secondary font-medium cursor-pointer">
                Stay logged in
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm font-semibold text-brand-pink hover:text-brand-dark-pink transition-colors"
            >
              Forgot?
            </button>
          </div>

          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl">
              <p className="text-sm text-center text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </Button>
          </div>
        </form>
      </div>

      {showChangePassword && tempUserData && (
        <ChangePasswordModal
          userId={tempUserData.id}
          userType={tempUserData.user_type}
          onPasswordChanged={handlePasswordChanged}
        />
      )}

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
};

export default Login;