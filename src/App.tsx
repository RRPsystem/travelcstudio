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
import { SubdomainViewer } from './components/Website/SubdomainViewer';
import TravelJournal from './components/TravelJournal/TravelJournal';
import QuestionSubmission from './components/Podcast/QuestionSubmission';
import { TripViewer } from './components/Public/TripViewer';

function AppContent() {
  console.log('🚀 AppContent component rendering');

  const hostname = window.location.hostname;
  const isSubdomain = hostname !== 'ai-travelstudio.nl' &&
                     hostname !== 'www.ai-travelstudio.nl' &&
                     hostname.endsWith('.ai-travelstudio.nl');

  if (isSubdomain) {
    const subdomain = hostname.replace('.ai-travelstudio.nl', '');
    console.log('[App] Subdomain detected:', subdomain);
    return <SubdomainViewer subdomain={subdomain} />;
  }

  const path = window.location.pathname;
  console.log('[App] Current path:', path);

  // Match TravelBRO chat links: /travelbro/[token], /travel/[token], or just /[token]
  const travelMatch = path.match(/^\/(?:travel|travelbro)\/([a-f0-9]+)$/) ||
                      path.match(/^\/([a-f0-9]{8,})$/);

  if (travelMatch) {
    console.log('[App] Matched TravelBRO route');
    return <ClientInterface shareToken={travelMatch[1]} />;
  }

  const agentProfileMatch = path.match(/^\/agents\/([a-z0-9-]+)$/);
  if (agentProfileMatch) {
    console.log('[App] Matched agent profile route');
    return <AgentProfile slug={agentProfileMatch[1]} />;
  }

  const tripViewMatch = path.match(/^\/trip\/([a-f0-9-]+)$/);
  if (tripViewMatch) {
    console.log('[App] Matched trip viewer route');
    return <TripViewer shareToken={tripViewMatch[1]} />;
  }

  const pagePreviewMatch = path.match(/^\/preview\/([a-f0-9-]+)$/);
  console.log('[App] Page preview check:', { path, match: pagePreviewMatch });
  if (pagePreviewMatch) {
    console.log('[App] ✅ Rendering PreviewPage with pageId:', pagePreviewMatch[1]);
    return <PreviewPage pageId={pagePreviewMatch[1]} />;
  }

  const newsPreviewMatch = path.match(/^\/preview\/news\/(.+)$/);
  if (newsPreviewMatch) {
    return <NewsPreview />;
  }

  if (path === '/podcast/vragen' || path === '/podcast/questions') {
    console.log('[App] Matched podcast questions route');
    return <QuestionSubmission />;
  }

  if (path === '/travel-journal' || path === '/travel-journaal' || path === '/podcast') {
    console.log('[App] Matched Travel Journal/Podcast route');
    return <TravelJournal />;
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