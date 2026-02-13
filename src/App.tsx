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
import { TravelBroPage } from './components/TravelBro/TravelBroPage';
import { DemoInterface } from './components/TravelBro/DemoInterface';
import { ChatEmbed } from './components/TravelBro/ChatEmbed';
import { SubdomainViewer } from './components/Website/SubdomainViewer';
import TravelJournal from './components/TravelJournal/TravelJournal';
import QuestionSubmission from './components/Podcast/QuestionSubmission';
import { TripViewer } from './components/Public/TripViewer';
import { OfferteViewer } from './components/Public/OfferteViewer';
import { RoadbookPreview } from './components/Public/RoadbookPreview';
import { OfferteViewerSimple } from './components/Public/OfferteViewerSimple';
import { LandingPage } from './components/Landing/LandingPage';

function AppContent() {
  console.log('🚀 AppContent component rendering');

  // Check for payment success/error in hash
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#payment-success') {
      // Show success message
      setTimeout(() => {
        alert('✅ Betaling succesvol! Je credits zijn bijgeschreven.');
        // Clear hash without page reload
        window.history.replaceState(null, '', window.location.pathname);
        // Reload to update credit balance
        window.location.reload();
      }, 100);
    } else if (hash === '#payment-error') {
      setTimeout(() => {
        alert('❌ Er is iets misgegaan met de betaling. Probeer het opnieuw.');
        window.history.replaceState(null, '', window.location.pathname);
      }, 100);
    }
  }, []);

  const hostname = window.location.hostname;
  const path = window.location.pathname;
  console.log('[App] Current hostname:', hostname, 'path:', path);

  // TravelBro.nl domain - show TravelBroPage
  const isTravelBroDomain = hostname === 'travelbro.nl' || 
                            hostname === 'www.travelbro.nl' ||
                            hostname.endsWith('.travelbro.nl');

  if (isTravelBroDomain) {
    console.log('[App] TravelBro.nl domain detected');
    // Check if there's a token in the path
    const tokenMatch = path.match(/^\/([a-f0-9]{8,})$/);
    if (tokenMatch) {
      return <TravelBroPage shareToken={tokenMatch[1]} />;
    }
    // Otherwise show demo (loads most recent trip)
    return <DemoInterface />;
  }

  const isSubdomain = hostname !== 'ai-travelstudio.nl' &&
                     hostname !== 'www.ai-travelstudio.nl' &&
                     hostname.endsWith('.ai-travelstudio.nl');

  if (isSubdomain) {
    const subdomain = hostname.replace('.ai-travelstudio.nl', '');
    console.log('[App] Subdomain detected:', subdomain);
    return <SubdomainViewer subdomain={subdomain} />;
  }

  // TravelBro demo route - automatically loads first active trip
  if (path === '/travelbro' || path === '/travelbro-demo') {
    console.log('[App] Matched TravelBRO demo route');
    return <DemoInterface />;
  }

  // TravelBro embed route for iframe embedding in external builder
  // URL: /travelbro/embed/[share_token] or /travelbro/embed?trip_id=[trip_id]
  const embedMatch = path.match(/^\/travelbro\/embed\/([a-f0-9-]+)$/);
  if (embedMatch) {
    console.log('[App] Matched TravelBRO embed route');
    return <ChatEmbed shareToken={embedMatch[1]} />;
  }
  if (path === '/travelbro/embed') {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('trip_id');
    const shareToken = params.get('share_token');
    console.log('[App] Matched TravelBRO embed route with params');
    return <ChatEmbed tripId={tripId || undefined} shareToken={shareToken || undefined} />;
  }

  // Match TravelBRO chat links: /travelbro/[token], /travel/[token], or just /[token]
  const travelMatch = path.match(/^\/(?:travel|travelbro)\/([a-f0-9]+)$/) ||
                      path.match(/^\/([a-f0-9]{8,})$/);

  if (travelMatch) {
    console.log('[App] Matched TravelBRO route');
    return <TravelBroPage shareToken={travelMatch[1]} />;
  }

  const agentProfileMatch = path.match(/^\/agents\/([a-z0-9-]+)$/);
  if (agentProfileMatch) {
    console.log('[App] Matched agent profile route');
    return <AgentProfile slug={agentProfileMatch[1]} />;
  }

  // Match trip viewer route: /trip/[token] (UUID or share_token)
  const tripViewerMatch = path.match(/^\/trip\/([a-f0-9-]+)$/);
  if (tripViewerMatch) {
    console.log('[App] Matched trip viewer route');
    return <TripViewer shareToken={tripViewerMatch[1]} />;
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

  if (path === '/travelc-talk' || path === '/travel-journal' || path === '/travel-journaal' || path === '/podcast') {
    console.log('[App] Matched TravelC Talk/Podcast route');
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
    // Show landing page instead of login at root
    if (path === '/') {
      return <LandingPage />;
    }
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

  // Check for public routes BEFORE AuthProvider
  const path = window.location.pathname;

  // Public trip viewer route
  const tripViewMatch = path.match(/^\/trip\/([a-f0-9-]+)$/);
  if (tripViewMatch) {
    console.log('[App] Rendering public trip viewer (outside AuthProvider)');
    return <TripViewer shareToken={tripViewMatch[1]} />;
  }

  // Public roadbook preview route
  const roadbookViewMatch = path.match(/^\/roadbook\/([a-f0-9-]+)$/);
  if (roadbookViewMatch) {
    console.log('[App] Rendering public roadbook preview (outside AuthProvider)');
    return <RoadbookPreview roadbookId={roadbookViewMatch[1]} />;
  }

  // Public offerte viewer route
  const offerteViewMatch = path.match(/^\/offerte\/([a-f0-9-]+)$/);
  if (offerteViewMatch) {
    console.log('[App] Rendering public offerte viewer (outside AuthProvider)');
    return <OfferteViewer offerteId={offerteViewMatch[1]} />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;