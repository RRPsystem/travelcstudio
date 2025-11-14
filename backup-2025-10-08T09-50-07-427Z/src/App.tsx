import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { BrandDashboard } from './components/Brand/BrandDashboard';
import { OperatorDashboard } from './components/Operator/OperatorDashboard';
import { PreviewPage } from './components/Preview/PreviewPage';

function AppContent() {
  console.log('🚀 AppContent component rendering');
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.has('preview') || params.has('page_id') ||
                    (params.has('brand_id') && params.has('slug'));

  if (isPreview) {
    return <PreviewPage />;
  }

  const { user, loading, isAdmin, isBrand, isOperator } = useAuth();
  console.log('🔐 Auth state:', { user: user?.email, loading, isAdmin, isBrand, isOperator });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isBrand) {
    return <BrandDashboard />;
  }

  if (isOperator) {
    return <OperatorDashboard />;
  }

  return <div>Unauthorized</div>;
}

function App() {
  console.log('🚀 App component rendering');
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;