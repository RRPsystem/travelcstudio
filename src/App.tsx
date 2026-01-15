import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { BrandDashboard } from './components/Brand/BrandDashboard';
import { OperatorDashboard } from './components/Operator/OperatorDashboard';
import { AgentDashboard } from './components/Agent/AgentDashboard';
import AgentProfile from './components/Agent/AgentProfile';
import { PreviewPage } from './components/Preview/PreviewPage';
import { NewsPreview } from './components/Preview/NewsPreview';
import { ClientInterface } from './components/TravelBro/ClientInterface';

function AppContent() {
  console.log('🚀 AppContent component rendering');

  const path = window.location.pathname;

  // Match TravelBRO chat links: /travelbro/[token], /travel/[token], or just /[token]
  const travelMatch = path.match(/^\/(?:travel|travelbro)\/([a-f0-9]+)$/) ||
                      path.match(/^\/([a-f0-9]{8,})$/);

  if (travelMatch) {
    return <ClientInterface shareToken={travelMatch[1]} />;
  }

  const agentProfileMatch = path.match(/^\/agents\/([a-z0-9-]+)$/);
  if (agentProfileMatch) {
    return <AgentProfile slug={agentProfileMatch[1]} />;
  }

  const pagePreviewMatch = path.match(/^\/preview\/([a-f0-9-]+)$/);
  if (pagePreviewMatch) {
    return <PreviewPage pageId={pagePreviewMatch[1]} />;
  }

  const newsPreviewMatch = path.match(/^\/preview\/news\/(.+)$/);
  if (newsPreviewMatch) {
    return <NewsPreview />;
  }

  const params = new URLSearchParams(window.location.search);
  const isPreview = params.has('preview') || params.has('page_id') ||
                    (params.has('brand_id') && params.has('slug'));

  if (isPreview) {
    return <PreviewPage />;
  }

  const { user, loading, isAdmin, isBrand, isOperator, isAgent } = useAuth();
  console.log('🔐 Auth state:', { user: user?.email, loading, isAdmin, isBrand, isOperator, isAgent });

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

  if (isAgent) {
    return <AgentDashboard />;
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