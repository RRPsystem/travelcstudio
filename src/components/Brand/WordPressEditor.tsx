import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { ArrowLeft, Eye, Save, Plus, Trash2, FileText, Edit2, ExternalLink, Globe } from 'lucide-react';

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
  const [editingHtml, setEditingHtml] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWebsite();
  }, [websiteId]);

  useEffect(() => {
    if (pages[selectedPageIndex]) {
      const html = pages[selectedPageIndex].html;
      console.log('Setting editing HTML for page:', pages[selectedPageIndex].name);
      console.log('HTML length:', html?.length || 0);
      console.log('HTML preview:', html?.substring(0, 200) || 'EMPTY');
      setEditingHtml(html || '');
    }
  }, [selectedPageIndex, pages]);

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

  async function saveWebsite() {
    if (!website) return;

    setSaving(true);
    try {
      const updatedPages = [...pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        html: editingHtml,
        modified: true
      };

      const { error } = await db.supabase
        .from('websites')
        .update({
          pages: updatedPages,
          updated_at: new Date().toISOString()
        })
        .eq('id', websiteId);

      if (error) throw error;

      setPages(updatedPages);
      setHasUnsavedChanges(false);
      alert('✅ Wijzigingen opgeslagen!');
    } catch (error) {
      console.error('Error saving website:', error);
      alert('❌ Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  }

  function handleHtmlChange(value: string) {
    setEditingHtml(value);
    setHasUnsavedChanges(true);
  }

  async function addNewPage() {
    const pageName = prompt('Naam voor de nieuwe pagina:');
    if (!pageName) return;

    const newPage: WebsitePage = {
      name: pageName,
      path: `/${pageName.toLowerCase().replace(/\s+/g, '-')}`,
      html: `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageName}</title>
</head>
<body>
    <h1>${pageName}</h1>
    <p>Nieuwe pagina - voeg hier jouw content toe.</p>
</body>
</html>`,
      modified: true,
      order: pages.length
    };

    const updatedPages = [...pages, newPage];
    setPages(updatedPages);
    setSelectedPageIndex(updatedPages.length - 1);
    setHasUnsavedChanges(true);
  }

  async function deletePage(index: number) {
    if (pages.length <= 1) {
      alert('Je moet minimaal 1 pagina behouden');
      return;
    }

    if (!confirm(`Weet je zeker dat je "${pages[index].name}" wilt verwijderen?`)) return;

    const updatedPages = pages.filter((_, i) => i !== index);
    setPages(updatedPages);
    setSelectedPageIndex(Math.max(0, index - 1));
    setHasUnsavedChanges(true);
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

  const currentPage = pages[selectedPageIndex];

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
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600 font-medium">Niet opgeslagen wijzigingen</span>
            )}

            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye size={18} className="inline mr-2" />
                Preview
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit2 size={18} className="inline mr-2" />
                HTML
              </button>
            </div>

            <button
              onClick={saveWebsite}
              disabled={saving || !hasUnsavedChanges}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Opslaan...' : 'Opslaan'}
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
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={addNewPage}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Nieuwe Pagina
            </button>
          </div>

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
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                    title="Verwijderen"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'preview' ? (
            <div className="h-full bg-white">
              <iframe
                srcDoc={editingHtml}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <div className="h-full bg-gray-900 p-4">
              <textarea
                value={editingHtml}
                onChange={(e) => handleHtmlChange(e.target.value)}
                className="w-full h-full bg-gray-800 text-gray-100 font-mono text-sm p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
