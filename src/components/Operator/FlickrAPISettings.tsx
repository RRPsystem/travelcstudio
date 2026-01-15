import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Image as ImageIcon, Save, TestTube, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function FlickrAPISettings() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [userId, setUserId] = useState('');
  const [photosetId, setPhotosetId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [settingId, setSettingId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_settings')
        .select('*')
        .eq('provider', 'Flickr')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingId(data.id);
        setApiKey(data.api_key || '');
        setIsActive(data.is_active || false);
        if (data.metadata) {
          setApiSecret(data.metadata.api_secret || '');
          setUserId(data.metadata.user_id || '');
          setPhotosetId(data.metadata.photoset_id || '');
        }
      }
    } catch (error) {
      console.error('Error loading Flickr settings:', error);
      alert('Fout bij laden instellingen');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'Vul eerst een API key in' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      let url = 'https://api.flickr.com/services/rest/?method=flickr.test.echo&format=json&nojsoncallback=1&api_key=' + apiKey;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Flickr API antwoordde niet correct');
      }

      const data = await response.json();

      if (data.stat === 'ok') {
        if (userId) {
          const userUrl = `https://api.flickr.com/services/rest/?method=flickr.people.getInfo&format=json&nojsoncallback=1&api_key=${apiKey}&user_id=${userId}`;
          const userResponse = await fetch(userUrl);
          const userData = await userResponse.json();

          if (userData.stat === 'ok') {
            setTestResult({
              success: true,
              message: `Verbinding succesvol! User: ${userData.person?.username?._content || userId}`
            });
          } else {
            setTestResult({
              success: false,
              message: `API key werkt, maar user ID '${userId}' is ongeldig`
            });
          }
        } else {
          setTestResult({ success: true, message: 'Verbinding succesvol!' });
        }
      } else {
        throw new Error(data.message || 'Onbekende fout');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Fout bij testen verbinding'
      });
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async () => {
    if (!apiKey) {
      alert('API Key is verplicht');
      return;
    }

    setLoading(true);

    try {
      const metadata = {
        api_secret: apiSecret,
        user_id: userId,
        photoset_id: photosetId,
        api_key_label: 'Flickr API Key',
        api_secret_label: 'Flickr API Secret (optioneel)',
        user_id_label: 'Flickr User ID (voor Pro account)',
        photoset_id_label: 'Photoset/Album ID (optioneel)',
        search_params: {
          per_page: 20,
          sort: 'date-posted-desc',
          extras: 'url_m,url_z,url_l,url_o,description,date_taken,owner_name'
        }
      };

      if (settingId) {
        const { error } = await supabase
          .from('api_settings')
          .update({
            api_key: apiKey,
            is_active: isActive,
            metadata: metadata
          })
          .eq('id', settingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('api_settings')
          .insert({
            provider: 'Flickr',
            service_name: 'Flickr Pro Photo API',
            api_key: apiKey,
            is_active: isActive,
            endpoints: ['https://api.flickr.com/services/rest/'],
            metadata: metadata
          })
          .select()
          .single();

        if (error) throw error;
        setSettingId(data.id);
      }

      alert('Instellingen opgeslagen');
      setTestResult(null);
    } catch (error) {
      console.error('Error saving Flickr settings:', error);
      alert('Fout bij opslaan instellingen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <ImageIcon className="text-pink-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Flickr Pro API</h2>
            <p className="text-sm text-gray-500">Configureer Flickr voor foto selectie</p>
          </div>
        </div>
        <a
          href="https://www.flickr.com/services/api/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm text-pink-600 hover:text-pink-700 border border-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
        >
          <ExternalLink size={16} />
          Flickr API Docs
        </a>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Setup Instructies</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal ml-4">
            <li>Ga naar <a href="https://www.flickr.com/services/apps/create/" target="_blank" rel="noopener noreferrer" className="underline">Flickr App Garden</a> en maak een nieuwe app</li>
            <li>Kies "Apply for a Non-Commercial Key" (of Commercial als van toepassing)</li>
            <li>Kopieer de API Key en optioneel de API Secret</li>
            <li>Vind je User ID via <a href="https://www.flickr.com/services/api/explore/flickr.people.getInfo" target="_blank" rel="noopener noreferrer" className="underline">Flickr API Explorer</a></li>
            <li>Optioneel: Vind je Album/Photoset ID in de URL van je album</li>
          </ol>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Flickr API Key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Secret (optioneel)
          </label>
          <input
            type="text"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Flickr API Secret (voor signed requests)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Alleen nodig voor geavanceerde functionaliteit</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flickr User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="123456789@N01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">User ID van je Flickr Pro account om je eigen foto's te tonen</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photoset/Album ID (optioneel)
          </label>
          <input
            type="text"
            value={photosetId}
            onChange={(e) => setPhotosetId(e.target.value)}
            placeholder="72157720123456789"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Als ingesteld, worden standaard foto's uit dit album getoond</p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="flickr-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
          />
          <label htmlFor="flickr-active" className="text-sm font-medium text-gray-700">
            Flickr integratie actief
          </label>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <XCircle className="text-red-600" size={20} />
              )}
              <span className={`text-sm font-medium ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                {testResult.message}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3 pt-4">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            <span>{loading ? 'Opslaan...' : 'Instellingen Opslaan'}</span>
          </button>
          <button
            onClick={testConnection}
            disabled={testing || !apiKey}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <TestTube size={20} />
            <span>{testing ? 'Testen...' : 'Test Verbinding'}</span>
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Hoe werkt het?</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc ml-4">
            <li>Admins kunnen via de Flickr knop foto's selecteren bij podcast onderwerpen</li>
            <li>Als je een User ID instelt, worden standaard je eigen foto's getoond</li>
            <li>Met een Photoset ID worden alleen foto's uit dat specifieke album getoond</li>
            <li>Je kunt verschillende formaten kiezen (medium, large, extra large, origineel)</li>
            <li>Flickr Pro accounts hebben onbeperkte opslag voor high-resolution foto's</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
