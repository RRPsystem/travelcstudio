import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SiteHomepage } from './SiteHomepage';

interface BrandData {
  id: string;
  name: string;
  logo_url: string;
  primary_color: string;
  tagline?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  website_url?: string;
}

interface SiteRendererProps {
  brandId: string;
}

export function SiteRenderer({ brandId }: SiteRendererProps) {
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [travels, setTravels] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    // Parse path after /site/{brandId}/...
    const hash = window.location.hash;
    const siteMatch = hash.match(/\/site\/[^/]+(\/.*)?$/);
    const subPath = siteMatch?.[1] || '/';
    setCurrentPath(subPath);

    const handleHashChange = () => {
      const h = window.location.hash;
      const m = h.match(/\/site\/[^/]+(\/.*)?$/);
      setCurrentPath(m?.[1] || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    loadSiteData();
  }, [brandId]);

  const loadSiteData = async () => {
    if (!supabase) { setError('Configuratiefout'); setLoading(false); return; }

    try {
      // Load brand
      const { data: brandData, error: brandErr } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .maybeSingle();

      if (brandErr) throw brandErr;
      if (!brandData) throw new Error('Brand niet gevonden');
      setBrand(brandData);

      // Load destinations, travels, agents, news in parallel
      const [destResult, travelResult, agentResult, newsResult] = await Promise.all([
        supabase
          .from('destinations')
          .select('*')
          .eq('brand_id', brandId)
          .eq('published', true)
          .order('name')
          .limit(50),
        supabase
          .from('travelc_travels')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('agents')
          .select('*')
          .eq('brand_id', brandId)
          .order('name')
          .limit(50),
        supabase
          .from('news_items')
          .select('*')
          .eq('brand_id', brandId)
          .eq('published', true)
          .order('published_at', { ascending: false })
          .limit(10),
      ]);

      if (destResult.data) setDestinations(destResult.data);
      if (travelResult.data) setTravels(travelResult.data);
      if (agentResult.data) setAgents(agentResult.data);
      if (newsResult.data) setNewsItems(newsResult.data);

    } catch (err: any) {
      console.error('[SiteRenderer] Error:', err);
      setError(err.message || 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Laden...</p>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oeps!</h1>
          <p className="text-gray-500">{error || 'Pagina niet gevonden'}</p>
        </div>
      </div>
    );
  }

  const primaryColor = brand.primary_color || '#2563eb';

  // For now, render homepage. Later we add routing for sub-pages.
  return (
    <SiteHomepage
      brand={brand}
      primaryColor={primaryColor}
      destinations={destinations}
      travels={travels}
      agents={agents}
      newsItems={newsItems}
    />
  );
}
