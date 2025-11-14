import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PageData {
  title: string;
  content_json: any;
  status: string;
}

export function PreviewPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadPage = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const brandId = params.get('brand_id');
        const slug = params.get('slug');
        const pageId = params.get('page_id');

        if (!brandId && !pageId) {
          setError('Geen brand_id of page_id opgegeven');
          setLoading(false);
          return;
        }

        let data, error;

        if (brandId && slug) {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pages-api/preview?brand_id=${brandId}&slug=${slug}`;
          const response = await fetch(apiUrl);

          if (!response.ok) {
            throw new Error('Fout bij laden van pagina');
          }

          const result = await response.json();
          data = result.page;
        } else if (pageId) {
          const result = await supabase
            .from('pages')
            .select('title, content_json, status')
            .eq('id', pageId)
            .maybeSingle();

          data = result.data;
          error = result.error;
        }

        if (error) throw error;

        if (!data) {
          setError('Pagina niet gevonden');
          setLoading(false);
          return;
        }

        if (!data.content_json && !data.body_html) {
          setError('Deze pagina heeft nog geen inhoud');
          setLoading(false);
          return;
        }

        setPageData(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Fout bij laden van pagina');
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Pagina laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{pageData.title}</h1>
        <div className="prose max-w-none">
          {pageData.content_json ? (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(pageData.content_json, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-600">Geen content beschikbaar</p>
          )}
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            pageData.status === 'published'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {pageData.status === 'published' ? 'Gepubliceerd' : 'Concept'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PreviewPage;
