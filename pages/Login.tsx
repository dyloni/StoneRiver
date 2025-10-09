import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { supabase } from '../utils/supabase';
import ChangePasswordModal from '../components/modals/ChangePasswordModal';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
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
      });
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
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-brand-surface rounded-2xl shadow-xl">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-brand-text-primary">
             <span className="text-brand-pink">Stone</span><span className="text-brand-gray">River</span> Portal
          </h2>
          <p className="mt-2 text-center text-brand-text-secondary">
            Sign in with your email
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
           <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-text-secondary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full px-4 py-3 text-brand-text-primary placeholder-gray-400 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink text-base"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-text-secondary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full px-4 py-3 text-brand-text-primary placeholder-gray-400 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink text-base"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-sm text-center text-red-500">{error}</p>}

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
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
    </div>
  );
};

export default Login;