import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import Button from '../ui/Button';
import StatusIndicator from '../ui/StatusIndicator';

interface HeaderProps {
  onMenuButtonClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuButtonClick }) => {
  const { user, logout } = useAuth();
  const { state, refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const userName = user ? `${user.firstName} ${user.surname}` : '';

  const currentUserId = user?.type === 'agent' ? user.id : 'admin';
  const unreadCount = state.messages.filter(m => m.recipientId === currentUserId && m.status === 'unread').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  return (
    <header className="glass-effect shadow-soft border-b border-brand-border/50 sticky top-0 z-40 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuButtonClick}
              className="md:hidden p-2 -ml-2 text-brand-text-secondary hover:text-brand-pink hover:bg-brand-pink/5 rounded-xl focus:outline-none transition-all"
              aria-label="Open sidebar"
            >
               <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
               </svg>
            </button>
            <h1 className="text-xl font-bold text-brand-text-primary tracking-tight">
                <span className="bg-gradient-to-r from-brand-pink to-brand-dark-pink bg-clip-text text-transparent">Stone</span>
                <span className="text-brand-gray">River</span>
                <span className="hidden sm:inline text-brand-text-secondary font-medium text-base ml-2">Insurance</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <StatusIndicator />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-brand-text-secondary hover:text-brand-pink hover:bg-brand-pink/5 rounded-xl transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <Link to="/messages" className="relative p-2 text-brand-text-secondary hover:text-brand-pink hover:bg-brand-pink/5 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-brand-danger to-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <span className="text-brand-text-secondary hidden lg:block text-sm font-medium">Welcome, <span className="text-brand-text-primary font-semibold">{userName}</span></span>
            <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
              Logout
            </Button>
            <button onClick={logout} className="sm:hidden p-2 text-brand-text-secondary hover:text-brand-danger hover:bg-brand-danger/5 rounded-xl transition-all" title="Logout">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;