import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToPushNotifications, checkNotificationSupport, sendTestNotification } from '../../utils/pushNotifications';
import Button from './Button';

const NotificationPrompt: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission;
  }>({ supported: false, permission: 'default' });
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const status = await checkNotificationSupport();
    setNotificationStatus({
      supported: status.supported,
      permission: status.permission
    });

    if (status.supported && status.permission === 'default') {
      const dismissed = localStorage.getItem('notification_prompt_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (!user) return;

    setIsSubscribing(true);
    try {
      const success = await subscribeToPushNotifications(user.id, user.type);

      if (success) {
        setShowPrompt(false);
        localStorage.setItem('notification_prompt_dismissed', 'true');

        await sendTestNotification();

        const status = await checkNotificationSupport();
        setNotificationStatus({
          supported: status.supported,
          permission: status.permission
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification_prompt_dismissed', 'true');
  };

  if (!showPrompt || !notificationStatus.supported || notificationStatus.permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-brand-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Enable Notifications
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Stay updated with new messages and important updates from the Stone River Portal.
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={handleEnableNotifications}
              disabled={isSubscribing}
              className="text-xs px-3 py-1.5"
            >
              {isSubscribing ? 'Enabling...' : 'Enable'}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
