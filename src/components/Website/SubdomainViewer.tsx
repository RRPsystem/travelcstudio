import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TripViewer } from '../Public/TripViewer';

interface SubdomainViewerProps {
  subdomain: string;
}

export function SubdomainViewer({ subdomain }: SubdomainViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadWebsiteContent();
  }, [subdomain]);

  async function loadWebsiteContent() {
    try {
      setLoading(true);
      setError('');

      const path = window.location.pathname;

      // Check if this is a trip share link
      const tripMatch = path.match(/^\/trip\/([a-f0-9-]+)$/);
      if (tripMatch) {
        setLoading(false);
        return; // Will be rendered by TripViewer below
      }

      const { data: domainData, error: domainError } = await supabase
        .from('brand_domains')
        .select('website_id')
        .eq('subdomain_prefix', subdomain)
        .maybeSingle();

      if (domainError) throw domainError;
      if (!domainData?.website_id) {
        setError('Website not found');
        return;
      }

      const slug = path === '/' ? '/' : path;

      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('body_html, title')
        .eq('website_id', domainData.website_id)
        .eq('slug', slug)
        .maybeSingle();

      if (pageError) throw pageError;
      if (!pageData) {
        setError('Page not found');
        return;
      }

      document.open();
      document.write(pageData.body_html || '');
      document.close();
    } catch (err) {
      console.error('Error loading website:', err);
      setError('Failed to load website');
      setLoading(false);
    }
  }

  // Check if this is a trip share link
  const path = window.location.pathname;
  const tripMatch = path.match(/^\/trip\/([a-f0-9-]+)$/);
  if (tripMatch) {
    return <TripViewer shareToken={tripMatch[1]} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading website...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Website Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ minHeight: '100vh' }}
    />
  );
}
