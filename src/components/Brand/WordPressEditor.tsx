import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { ArrowLeft, FileText, ExternalLink, Globe } from 'lucide-react';

interface WebsitePage {
  name: string;
  path: string;
  html: string;
  modified: boolean;
  order: number;
}

interface Website {
  id: string;
  brand_id: string;
  name: string;
  template_name?: string;
  pages?: WebsitePage[];
  status: 'draft' | 'preview' | 'live';
  domain?: string;
  preview_url?: string;
  live_url?: string;
}

interface WordPressEditorProps {
  websiteId: string;
  onBack: () => void;
}

export function WordPressEditor({ websiteId, onBack }: WordPressEditorProps) {
  const { user } = useAuth();
  const [website, setWebsite] = useState<Website | null>(null);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWebsite();
  }, [websiteId]);

  async function loadWebsite() {
    try {
      const { data: websiteData, error: websiteError } = await db.supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .single();

      if (websiteError) throw websiteError;

      console.log('Loaded website:', websiteData);

      setWebsite(websiteData);

      if (websiteData.pages && Array.isArray(websiteData.pages) && websiteData.pages.length > 0) {
        console.log('Using existing pages:', websiteData.pages.length);
        console.log('First page HTML length:', websiteData.pages[0]?.html?.length || 0);
        console.log('First page HTML preview:', websiteData.pages[0]?.html?.substring(0, 200));
        setPages(websiteData.pages);
      } else if (websiteData.template_name) {
        console.log('Loading template pages for:', websiteData.template_name);
        const { data: templatePages, error: pagesError } = await db.supabase
          .from('wordpress_template_pages')
          .select('*')
          .eq('template_name', websiteData.template_name)
          .order('page_order');

        if (pagesError) {
          console.error('Error loading template pages:', pagesError);
          throw pagesError;
        }

        console.log('Template pages loaded:', templatePages?.length || 0);

        const formattedPages: WebsitePage[] = (templatePages || []).map((page: any) => ({
          name: page.page_name,
          path: page.page_path,
          html: page.html_content || page.cached_html || '',
          modified: false,
          order: page.page_order
        }));

        setPages(formattedPages);

        await db.supabase
          .from('websites')
          .update({ pages: formattedPages })
          .eq('id', websiteId);
      } else {
        console.log('No pages found, setting empty array');
        setPages([]);
      }
    } catch (error) {
      console.error('Error loading website:', error);
      alert('Fout bij laden website: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }




  async function openInExternalBuilder(pageIndex: number) {
    const page = pages[pageIndex];
    if (!page) return;

    try {
      const { data: { session } } = await db.supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Geen sessie gevonden');
        return;
      }

      const builderUrl = new URL('https://www.ai-websitestudio.nl/index.html');
      builderUrl.searchParams.set('token', session.access_token);
      builderUrl.searchParams.set('api', db.supabase.supabaseUrl);
      builderUrl.searchParams.set('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
      builderUrl.searchParams.set('mode', 'edit-html');
      builderUrl.searchParams.set('html', page.html);
      builderUrl.searchParams.set('page_name', page.name);
      builderUrl.searchParams.set('return_url', window.location.href);
      builderUrl.searchParams.set('website_id', websiteId);
      builderUrl.searchParams.set('page_index', pageIndex.toString());

      window.open(builderUrl.toString(), '_blank');
    } catch (error) {
      console.error('Error opening builder:', error);
      alert('Fout bij openen builder');
    }
  }

  async function publishWebsite() {
    if (!website) return;

    if (hasUnsavedChanges) {
      alert('Sla eerst je wijzigingen op voordat je publiceert');
      return;
    }

    try {
      const { error } = await db.supabase
        .from('websites')
        .update({
          status: 'live',
          published_at: new Date().toISOString()
        })
        .eq('id', websiteId);

      if (error) throw error;

      await loadWebsite();
      alert('✅ Website gepubliceerd!');
    } catch (error) {
      console.error('Error publishing website:', error);
      alert('❌ Fout bij publiceren');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#ff7700' }}></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">Website niet gevonden</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Terug naar overzicht
        </button>
      </div>
    );
  }

  if (!pages || pages.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">Geen paginas gevonden voor deze website</p>
        <p className="text-gray-600 mt-2">Website ID: {websiteId}</p>
        <p className="text-gray-600">Template: {website.template_name || 'Geen'}</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Terug naar overzicht
        </button>
      </div>
    );
  }

  const currentPage = pages[selectedPageIndex];
  const previewUrl = `https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/wordpress-preview?website_id=${websiteId}&page=${selectedPageIndex}`;

  console.log('WordPress Editor - Website ID:', websiteId);
  console.log('WordPress Editor - Preview URL:', previewUrl);

  if (!currentPage) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">Pagina niet gevonden</p>
        <p className="text-gray-600 mt-2">Selected index: {selectedPageIndex}</p>
        <p className="text-gray-600">Total pages: {pages.length}</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Terug naar overzicht
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Terug</span>
            </button>
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-xl font-bold text-gray-900">{website.name}</h1>
              <p className="text-sm text-gray-500">
                {currentPage?.name} - {website.template_name}
              </p>
              <p className="text-xs text-gray-400">
                HTML: {editingHtml?.length || 0} chars | Pages: {pages.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openInExternalBuilder(selectedPageIndex)}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <ExternalLink size={18} />
              Bewerken in Editor
            </button>

            <button
              onClick={publishWebsite}
              className="px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2"
              style={{ backgroundColor: '#ff7700' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e66900'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff7700'}
            >
              <Globe size={18} />
              Publiceren
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-2">
            {pages.map((page, index) => (
              <div
                key={index}
                className={`group relative flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                  selectedPageIndex === index
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => setSelectedPageIndex(index)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText size={18} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{page.name}</p>
                    <p className="text-xs text-gray-500 truncate">{page.path}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-white flex flex-col">
            <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-b">
              Preview URL: {previewUrl}
            </div>
            <iframe
              key={`preview-${selectedPageIndex}`}
              src={previewUrl}
              className="flex-1 w-full border-0"
              title="Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
