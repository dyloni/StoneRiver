import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const agentLinks = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Customers', path: '/customers' },
  { name: 'New Policy', path: '/new-policy' },
  { name: 'Make Payment', path: '/payment' },
  { name: 'Claims', path: '/claims' },
  { name: 'Messages', path: '/messages' },
  { name: 'My Profile', path: '/profile' },
];

const adminLinks = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Sales Analytics', path: '/sales' },
  { name: 'Agents', path: '/agents' },
  { name: 'Customers', path: '/customers' },
  { name: 'Claims', path: '/claims' },
  { name: 'Reminders', path: '/reminders' },
  { name: 'Admin Accounts', path: '/accounts' },
  { name: 'Package Management', path: '/packages' },
  { name: 'Messages', path: '/messages' },
  { name: 'My Profile', path: '/profile' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { state } = useData();
  const links = user?.type === 'agent' ? agentLinks : adminLinks;
  
  const currentUserId = user?.id || null;
  const unreadCount = state.messages.filter(m => m.recipientId === currentUserId && m.status === 'unread').length;

  const navLinkClasses = 'flex items-center justify-between px-4 py-3 mt-1 text-brand-text-secondary rounded-xl hover:bg-slate-50 transition-all duration-200 group';
  const activeNavLinkClasses = 'bg-gradient-to-r from-brand-pink/10 to-brand-pink/5 text-brand-pink font-semibold shadow-soft border border-brand-pink/20';

  return (
    <>
      <div className={`fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={onClose}></div>
      <div className={`fixed inset-y-0 left-0 z-30 w-72 px-4 py-6 overflow-y-auto glass-effect border-r border-brand-border/50 transform md:translate-x-0 md:static md:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out shadow-elevated`}>
        <div className="flex items-center justify-between px-2 mb-2">
           <span className="text-2xl font-bold tracking-tight">
             <span className="bg-gradient-to-r from-brand-pink to-brand-dark-pink bg-clip-text text-transparent">Stone</span>
             <span className="text-brand-gray">River</span>
           </span>
        </div>
        <nav className="mt-8 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={onClose}
              className={({ isActive }) =>
                `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`
              }
            >
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity"></span>
                {link.name}
              </span>
              {link.name === 'Messages' && unreadCount > 0 && (
                 <span className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-brand-danger to-red-600 rounded-full shadow-medium">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-6 left-4 right-4">
          <div className="px-4 py-3 bg-gradient-to-br from-brand-pink/5 to-brand-accent/5 rounded-xl border border-brand-pink/10">
            <p className="text-xs font-medium text-brand-text-secondary">Insurance Portal</p>
            <p className="text-sm font-bold text-brand-text-primary mt-1">v2.0</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;