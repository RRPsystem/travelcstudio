import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RefreshCw, Edit, Eye, FileText, CheckCircle, Clock } from 'lucide-react';

interface WordPressPage {
  id: string;
  wordpress_page_id: number;
  title: string;
  slug: string;
  page_url: string;
  edit_url: string;
  status: string;
  last_synced_at: string;
}

export default function WordPressPageManager() {
  const { effectiveBrandId } = useAuth();
  const [pages, setPages] = useState<WordPressPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const loadPages = async () => {
    if (!effectiveBrandId) {
      console.log('⚠️ No brandId available');
      setLoading(false);
      return;
    }

    console.log('📄 Loading pages for brand:', effectiveBrandId);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('wordpress_pages_cache')
        .select('*')
        .eq('brand_id', effectiveBrandId)
        .order('title', { ascending: true });

      console.log('📄 Query result:', { data, error });

      if (error) {
        console.error('❌ Error loading pages:', error);
        alert(`Fout bij laden pagina's: ${error.message}`);
      } else {
        console.log('✅ Pages loaded:', data?.length || 0);
        setPages(data || []);

        if (data && data.length > 0) {
          setLastSyncTime(data[0].last_synced_at);
        }
      }
    } catch (err) {
      console.error('❌ Exception loading pages:', err);
      alert(`Onverwachte fout: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveBrandId) {
      loadPages();
    } else {
      setLoading(false);
    }
  }, [effectiveBrandId]);

  const syncPages = async () => {
    setSyncing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Niet ingelogd');
        setSyncing(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wordpress-sync-pages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync pages');
      }

      const result = await response.json();

      await loadPages();
      alert(`Succesvol ${result.pages_synced} pagina's gesynchroniseerd!`);
    } catch (error: any) {
      console.error('Sync error:', error);
      alert(error.message || 'Fout bij synchroniseren. Controleer of je WordPress gegevens correct zijn ingevuld.');
    }

    setSyncing(false);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      publish: { label: 'Gepubliceerd', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      draft: { label: 'Concept', color: 'bg-gray-100 text-gray-800', icon: FileText },
      pending: { label: 'In Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      private: { label: 'Privé', color: 'bg-blue-100 text-blue-800', icon: Eye },
    };

    const { label, color, icon: Icon } = config[status as keyof typeof config] || config.draft;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">WordPress Pagina Beheer</h1>
            <p className="text-gray-600">Beheer je WordPress pagina's vanuit Bolt</p>
          </div>

          <button
            onClick={syncPages}
            disabled={syncing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchroniseren...' : 'Pagina\'s Synchroniseren'}
          </button>
        </div>

        {lastSyncTime && (
          <div className="text-sm text-gray-600">
            Laatste synchronisatie: {new Date(lastSyncTime).toLocaleString('nl-NL')}
          </div>
        )}
      </div>

      {pages.length === 0 && !loading && (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen Pagina's Gevonden</h3>
          <p className="text-gray-600 mb-4">
            Klik op "Pagina's Synchroniseren" om je WordPress pagina's in te laden
          </p>
          <button
            onClick={syncPages}
            disabled={syncing}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Bezig...' : 'Nu Synchroniseren'}
          </button>
        </div>
      )}

      {pages.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagina Titel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{page.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">/{page.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(page.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={page.edit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          title="Bewerken in WordPress"
                        >
                          <Edit className="w-4 h-4" />
                          Bewerken
                        </a>
                        <a
                          href={page.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                          title="Bekijk live pagina"
                        >
                          <Eye className="w-4 h-4" />
                          Bekijken
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Totaal {pages.length} {pages.length === 1 ? 'pagina' : 'pagina\'s'} gevonden
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Hoe werkt het?
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Klik op "Pagina's Synchroniseren" om je WordPress pagina's in te laden</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Gebruik de "Bewerken" knop om een pagina te bewerken in WordPress</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Gebruik de "Bekijken" knop om de live pagina te zien</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Synchroniseer regelmatig om de laatste wijzigingen te zien</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
