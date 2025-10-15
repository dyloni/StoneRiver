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

// Agent Pages
import AgentDashboard from './pages/AgentDashboard';
import AgentCustomers from './pages/AgentCustomers';
import NewPolicyPage from './pages/NewPolicyPage';
import PaymentPage from './pages/PaymentPage';
import AgentRequests from './pages/AgentRequests';
import AgentClaims from './pages/AgentClaims';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminAgents from './pages/AdminAgents';
import AdminCustomers from './pages/AdminCustomers';
import AgentProfilePage from './pages/AgentProfilePage';
import AdminRequests from './pages/AdminRequests';
import AdminSales from './pages/AdminSales';
import AdminClaims from './pages/AdminClaims';
import AdminReminders from './pages/AdminReminders';
import AdminAccounts from './pages/AdminAccounts';
import AdminPackages from './pages/AdminPackages';
import AdminNewPolicyPage from './pages/AdminNewPolicyPage';

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
              <Route path="/new-policy" element={<AdminNewPolicyPage />} />
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