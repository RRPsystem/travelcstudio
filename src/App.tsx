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
import { SubdomainViewer } from './components/Website/SubdomainViewer';
import TravelJournal from './components/TravelJournal/TravelJournal';
import QuestionSubmission from './components/Podcast/QuestionSubmission';
import { TripViewer } from './components/Public/TripViewer';

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

  // TravelBro demo route - automatically loads first active trip
  if (path === '/travelbro' || path === '/travelbro-demo') {
    console.log('[App] Matched TravelBRO demo route');
    return <DemoInterface />;
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
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">AI Travel Studio</h1>
                  <p className="text-xs text-slate-500">Travel Tech Platform</p>
                </div>
              </div>
              <a
                href="/login"
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
              >
                Sign In
              </a>
            </div>
          </header>

          {/* Hero Section */}
          <div className="container mx-auto px-6 py-20">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-slate-900 mb-4">
                Multi-Tenant Travel Website Builder
              </h2>
              <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                Professionele AI-powered tools voor reisbureaus en reisagenten
              </p>
              <div className="flex gap-4 justify-center">
                <a
                  href="/login"
                  className="px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition text-lg"
                >
                  Start Now
                </a>
                <a
                  href="/travelbro"
                  className="px-8 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 transition text-lg"
                >
                  Live Demo
                </a>
              </div>
            </div>

            {/* Product Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">TravelBro</h3>
                <p className="text-slate-600 mb-6">
                  AI-powered WhatsApp reisassistent met multimodaal begrip en foto herkenning
                </p>
                <a
                  href="/travelbro"
                  className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition"
                >
                  Demo bekijken
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Website Builder</h3>
                <p className="text-slate-600 mb-6">
                  Drag & drop website builder met WordPress integratie voor professionele reiswebsites
                </p>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition"
                >
                  Inloggen
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Content AI</h3>
                <p className="text-slate-600 mb-6">
                  Automatische content generatie voor reisartikelen, blogs en social media posts
                </p>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition"
                >
                  Inloggen
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Features Grid */}
            <div className="bg-white rounded-xl p-10 shadow-sm border border-slate-200 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Platform Features</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Multi-tenant architectuur</h4>
                    <p className="text-sm text-slate-600">Onbeperkt reisbureaus op één platform</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">WordPress integratie</h4>
                    <p className="text-sm text-slate-600">Naadloze sync met WordPress websites</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">WhatsApp Business API</h4>
                    <p className="text-sm text-slate-600">Direct contact met reizigers via WhatsApp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">OpenAI GPT-4 integratie</h4>
                    <p className="text-sm text-slate-600">Geavanceerde AI voor content en support</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Video generatie</h4>
                    <p className="text-sm text-slate-600">Automatische video content voor reizen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Podcast management</h4>
                    <p className="text-sm text-slate-600">Complete podcast productie workflow</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-slate-900 text-white py-8 mt-20">
            <div className="container mx-auto px-6 text-center">
              <p className="text-slate-400">AI Travel Studio - Professional Travel Tech Platform</p>
            </div>
          </footer>
        </div>
      );
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

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;