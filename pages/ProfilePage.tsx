import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { RequestStatus } from '../types';
import Button from '../components/ui/Button';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, checkNotificationSupport } from '../utils/pushNotifications';

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-brand-text-secondary">{label}</dt>
        <dd className="mt-1 text-lg font-semibold text-brand-text-primary">{value || 'N/A'}</dd>
    </div>
);

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
    <Card className="text-center">
        <h3 className="text-lg font-semibold text-brand-text-secondary">{title}</h3>
        <p className="text-4xl font-bold mt-2 text-brand-pink">{value}</p>
    </Card>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-base font-semibold text-brand-text-secondary mb-2">{label}</label>
        <input {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-gray-50 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`} />
    </div>
);

const ProfilePage: React.FC = () => {
    const { user, updateUser, checkTutorialStatus, setShowTutorial } = useAuth();
    const { state } = useData();

    const [editData, setEditData] = useState({
        firstName: user?.firstName || '',
        surname: user?.surname || '',
    });
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    const [notificationSupport, setNotificationSupport] = useState({ supported: false, permission: 'default' as NotificationPermission });
    const [isTogglingNotification, setIsTogglingNotification] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(user) {
            setEditData({ firstName: user.firstName, surname: user.surname });
            setProfilePicPreview(user.profilePictureUrl || null);
        }

        checkNotifications();
    }, [user]);

    const checkNotifications = async () => {
        const support = await checkNotificationSupport();
        setNotificationSupport(support);
        setNotificationEnabled(support.permission === 'granted');
    };

    if (!user) return null;
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfilePicPreview(event.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const handleSaveChanges = (e: React.FormEvent) => {
        e.preventDefault();
        updateUser({
            firstName: editData.firstName,
            surname: editData.surname,
            profilePictureUrl: profilePicPreview || undefined,
        });
        alert('Profile updated successfully!');
    };

    const handleToggleNotifications = async () => {
        if (!user) return;

        setIsTogglingNotification(true);
        try {
            if (notificationEnabled) {
                const success = await unsubscribeFromPushNotifications(user.id, user.type);
                if (success) {
                    setNotificationEnabled(false);
                    alert('Push notifications disabled');
                }
            } else {
                const success = await subscribeToPushNotifications(user.id, user.type);
                if (success) {
                    setNotificationEnabled(true);
                    alert('Push notifications enabled');
                }
            }
            await checkNotifications();
        } catch (error) {
            console.error('Error toggling notifications:', error);
            alert('Failed to update notification settings');
        } finally {
            setIsTogglingNotification(false);
        }
    };

    const agentStats = user.type === 'agent' ? {
        customerCount: state.customers.filter(c => c.assignedAgentId === user.id).length,
        pendingRequests: state.requests.filter(r => r.agentId === user.id && r.status === RequestStatus.PENDING).length
    } : null;

    const adminStats = user.type === 'admin' ? {
        totalCustomers: state.customers.length,
        totalAgents: state.agents.length,
        totalPendingRequests: state.requests.filter(r => r.status === RequestStatus.PENDING).length
    } : null;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-brand-text-primary">My Profile</h2>
            <Card>
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
                    <DetailItem label="Full Name" value={`${user.firstName} ${user.surname}`} />
                    <DetailItem label="Email Address" value={user.email} />
                    <DetailItem label="User ID" value={user.id} />
                    <DetailItem label="User Type" value={user.type.charAt(0).toUpperCase() + user.type.slice(1)} />
                    {user.role && <DetailItem label="Role" value={user.role} />}
                </dl>
            </Card>

            <form onSubmit={handleSaveChanges}>
                <Card title="Profile Settings">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 flex flex-col items-center">
                            <img 
                                src={profilePicPreview || `https://ui-avatars.com/api/?name=${user.firstName}+${user.surname}&background=d63384&color=fff&size=128`}
                                alt="Profile"
                                className="h-32 w-32 rounded-full object-cover mb-4"
                            />
                            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                Upload new picture
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-6">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormInput 
                                    label="First Name" 
                                    value={editData.firstName}
                                    onChange={e => setEditData({...editData, firstName: e.target.value})}
                                />
                                <FormInput 
                                    label="Surname" 
                                    value={editData.surname}
                                    onChange={e => setEditData({...editData, surname: e.target.value})}
                                />
                            </div>
                             <div>
                                <h4 className="text-xl font-bold text-brand-text-primary mb-4 border-t pt-6">Change Password</h4>
                                <div className="space-y-4">
                                    <FormInput label="Current Password" type="password" placeholder="••••••••" />
                                    <FormInput label="New Password" type="password" placeholder="••••••••" />
                                    <FormInput label="Confirm New Password" type="password" placeholder="••••••••" />
                                </div>
                             </div>
                             <div className="flex justify-end pt-4">
                                <Button type="submit">Save Changes</Button>
                             </div>
                        </div>
                    </div>
                </Card>
            </form>

            <Card title="App Settings">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-semibold text-brand-text-primary">Tutorial</h4>
                            <p className="text-sm text-brand-text-secondary mt-1">
                                Restart the getting started tutorial
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                if (user) {
                                    await checkTutorialStatus();
                                    setShowTutorial(true);
                                }
                            }}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Restart Tutorial
                        </Button>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-brand-border/20">
                        <div>
                            <h4 className="text-lg font-semibold text-brand-text-primary">Push Notifications</h4>
                            <p className="text-sm text-brand-text-secondary mt-1">
                                Receive notifications for new messages and updates
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {notificationSupport.supported ? (
                                <>
                                    <span className={`text-sm ${notificationEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                        {notificationEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <button
                                        onClick={handleToggleNotifications}
                                        disabled={isTogglingNotification}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-offset-2 ${
                                            notificationEnabled ? 'bg-brand-pink' : 'bg-gray-300'
                                        } ${isTogglingNotification ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                notificationEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </>
                            ) : (
                                <span className="text-sm text-gray-500">Not supported</span>
                            )}
                        </div>
                    </div>
                    {notificationSupport.permission === 'denied' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                                Notifications are blocked. Please enable them in your browser settings.
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {user.type === 'agent' && agentStats && (
                <div>
                    <h3 className="text-2xl font-bold text-brand-text-primary mb-4">My Statistics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <StatCard title="My Customers" value={agentStats.customerCount} />
                       <StatCard title="Pending Requests" value={agentStats.pendingRequests} />
                    </div>
                </div>
            )}

            {user.type === 'admin' && adminStats && (
                 <div>
                    <h3 className="text-2xl font-bold text-brand-text-primary mb-4">System Overview</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                       <StatCard title="Total Customers" value={adminStats.totalCustomers} />
                       <StatCard title="Total Agents" value={adminStats.totalAgents} />
                       <StatCard title="Pending Requests" value={adminStats.totalPendingRequests} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;