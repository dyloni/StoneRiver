import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { useSync } from './hooks/useSync';
import Login from './pages/Login';
import Layout from './components/layout/Layout';

// Shared Pages
import PolicyDetailsPage from './pages/PolicyDetailsPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';

// Placeholder components for missing pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-brand-text-primary">{title}</h2>
    <p className="text-brand-text-secondary mt-2">This page is under construction.</p>
  </div>
);

const AgentDashboard = () => <PlaceholderPage title="Agent Dashboard" />;
const AgentCustomers = () => <PlaceholderPage title="My Customers" />;
const NewPolicyPage = () => <PlaceholderPage title="New Policy" />;
const PaymentPage = () => <PlaceholderPage title="Payment" />;
const AgentRequests = () => <PlaceholderPage title="My Requests" />;
const AgentClaims = () => <PlaceholderPage title="My Claims" />;
const AdminDashboard = () => <PlaceholderPage title="Admin Dashboard" />;
const AdminAgents = () => <PlaceholderPage title="Manage Agents" />;
const AdminCustomers = () => <PlaceholderPage title="All Customers" />;
const AgentProfilePage = () => <PlaceholderPage title="Agent Profile" />;
const AdminRequests = () => <PlaceholderPage title="All Requests" />;
const AdminSales = () => <PlaceholderPage title="Sales" />;
const AdminClaims = () => <PlaceholderPage title="All Claims" />;
const AdminReminders = () => <PlaceholderPage title="Reminders" />;
const AdminAccounts = () => <PlaceholderPage title="Manage Accounts" />;
const AdminPackages = () => <PlaceholderPage title="Package Configuration" />;

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Main />
      </DataProvider>
    </AuthProvider>
  );
};

const Main: React.FC = () => {
  const { user } = useAuth();
  const { dispatch } = useData();
  useSync(dispatch);

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ video: true });
          console.log('Camera permission granted');
        }
      } catch (error) {
        console.warn('Camera permission denied or unavailable:', error);
      }
    };

    if (user) {
      requestCameraPermission();
    }
  }, [user]);

  if (!user) {
    return <Login />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          {user.type === 'agent' && (
            <>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<AgentDashboard />} />
              <Route path="/customers" element={<AgentCustomers />} />
              <Route path="/customers/:id" element={<PolicyDetailsPage />} />
              <Route path="/new-policy" element={<NewPolicyPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/requests" element={<AgentRequests />} />
              <Route path="/claims" element={<AgentClaims />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </>
          )}
          {user.type === 'admin' && (
            <>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/sales" element={<AdminSales />} />
              <Route path="/agents" element={<AdminAgents />} />
              <Route path="/agents/:id" element={<AgentProfilePage />} />
              <Route path="/customers" element={<AdminCustomers />} />
              <Route path="/customers/:id" element={<PolicyDetailsPage />} />
              <Route path="/new-policy" element={<NewPolicyPage />} />
              <Route path="/requests" element={<AdminRequests />} />
              <Route path="/claims" element={<AdminClaims />} />
              <Route path="/reminders" element={<AdminReminders />} />
              <Route path="/accounts" element={<AdminAccounts />} />
              <Route path="/packages" element={<AdminPackages />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </>
          )}
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;