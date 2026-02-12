import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export function APISettings() {
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  
  // OpenAI settings
  const [openaiKey, setOpenaiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [savingOpenai, setSavingOpenai] = useState(false);
  
  // Twilio settings
  const [twilioSettings, setTwilioSettings] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_whatsapp_number: ''
  });
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  
  // Google settings
  const [googleSettings, setGoogleSettings] = useState({
    google_places_api_key: '',
    google_search_api_key: '',
    google_search_engine_id: ''
  });
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGoogleKeys, setShowGoogleKeys] = useState({
    places: false,
    search: false
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadOpenAISettings();
      loadTwilioSettings();
      loadGoogleSettings();
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');

      if (fetchError) throw fetchError;
      setBrands(data || []);
      setSelectedBrandId('all');
    } catch (err: any) {
      console.error('Error loading brands:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOpenAISettings = async () => {
    try {
      const { data } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('provider', 'OpenAI')
        .eq('service_name', 'ChatGPT')
        .maybeSingle();

      if (data) {
        setOpenaiKey(data.api_key || '');
      }
    } catch (err: any) {
      console.error('Error loading OpenAI settings:', err);
    }
  };

  const loadTwilioSettings = async () => {
    try {
      let query = supabase
        .from('api_settings')
        .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number');

      if (selectedBrandId === 'all') {
        query = query
          .eq('provider', 'system')
          .eq('service_name', 'Twilio WhatsApp');
      } else {
        query = query
          .eq('provider', 'Twilio')
          .eq('brand_id', selectedBrandId);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        setTwilioSettings({
          twilio_account_sid: data.twilio_account_sid || '',
          twilio_auth_token: data.twilio_auth_token || '',
          twilio_whatsapp_number: data.twilio_whatsapp_number || ''
        });
      } else {
        setTwilioSettings({
          twilio_account_sid: '',
          twilio_auth_token: '',
          twilio_whatsapp_number: ''
        });
      }
    } catch (err: any) {
      console.error('Error loading Twilio settings:', err);
    }
  };

  const loadGoogleSettings = async () => {
    try {
      let query = supabase
        .from('api_settings')
        .select('google_places_api_key, google_search_api_key, google_search_engine_id');

      if (selectedBrandId === 'all') {
        query = query
          .eq('provider', 'system')
          .eq('service_name', 'Twilio WhatsApp');
      } else {
        query = query.eq('brand_id', selectedBrandId);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        setGoogleSettings({
          google_places_api_key: data.google_places_api_key || '',
          google_search_api_key: data.google_search_api_key || '',
          google_search_engine_id: data.google_search_engine_id || ''
        });
      } else {
        setGoogleSettings({
          google_places_api_key: '',
          google_search_api_key: '',
          google_search_engine_id: ''
        });
      }
    } catch (err: any) {
      console.error('Error loading Google settings:', err);
    }
  };

  const saveOpenAISettings = async () => {
    setSavingOpenai(true);
    try {
      const { data: existing } = await supabase
        .from('api_settings')
        .select('id')
        .eq('provider', 'OpenAI')
        .eq('service_name', 'ChatGPT')
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('api_settings')
          .update({ api_key: openaiKey })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('api_settings')
          .insert({
            provider: 'OpenAI',
            service_name: 'ChatGPT',
            api_key: openaiKey,
            is_active: true
          });

        if (insertError) throw insertError;
      }

      alert('OpenAI API key opgeslagen!');
    } catch (err: any) {
      console.error('Error saving OpenAI settings:', err);
      alert(`Fout bij opslaan: ${err.message}`);
    } finally {
      setSavingOpenai(false);
    }
  };

  const testTwilioSettings = async () => {
    setTestingTwilio(true);
    setTwilioTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Niet geauthenticeerd');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-twilio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            account_sid: twilioSettings.twilio_account_sid,
            auth_token: twilioSettings.twilio_auth_token,
            whatsapp_number: twilioSettings.twilio_whatsapp_number
          })
        }
      );

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        setTwilioTestResult({
          success: false,
          message: `❌ Ongeldig antwoord van server: ${responseText}`
        });
        return;
      }
      
      setTwilioTestResult({
        success: data.success,
        message: data.details ? `${data.message}\n${data.details}` : data.message
      });
    } catch (err: any) {
      setTwilioTestResult({
        success: false,
        message: `❌ Netwerk fout: ${err.message}`
      });
    } finally {
      setTestingTwilio(false);
    }
  };

  const saveTwilioSettings = async () => {
    if (!selectedBrandId) {
      alert('Selecteer eerst een brand');
      return;
    }

    setSavingTwilio(true);
    setTwilioTestResult(null);
    try {
      let query = supabase
        .from('api_settings')
        .select('id');

      if (selectedBrandId === 'all') {
        query = query
          .eq('provider', 'system')
          .eq('service_name', 'Twilio WhatsApp');
      } else {
        query = query
          .eq('provider', 'Twilio')
          .eq('brand_id', selectedBrandId);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('api_settings')
          .update(twilioSettings)
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('api_settings')
          .insert({
            brand_id: selectedBrandId === 'all' ? null : selectedBrandId,
            provider: selectedBrandId === 'all' ? 'system' : 'Twilio',
            service_name: selectedBrandId === 'all' ? 'Twilio WhatsApp' : 'WhatsApp',
            ...twilioSettings
          });

        if (insertError) throw insertError;
      }

      const scope = selectedBrandId === 'all' ? 'voor ALLE brands' : 'voor deze brand';
      alert(`Twilio instellingen opgeslagen ${scope}!`);
      loadTwilioSettings();
    } catch (err: any) {
      console.error('Error saving Twilio settings:', err);
      alert(`Fout bij opslaan: ${err.message}`);
    } finally {
      setSavingTwilio(false);
    }
  };

  const testGoogleSearch = async () => {
    if (!googleSettings.google_search_api_key || !googleSettings.google_search_engine_id) {
      setGoogleTestResult({
        success: false,
        message: '❌ Vul eerst de API Key en Search Engine ID in'
      });
      return;
    }

    setTestingGoogle(true);
    setGoogleTestResult(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Niet geauthenticeerd');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://huaaogdxxdcakxryecnw.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/test-google-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseKey,
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setGoogleTestResult({
          success: true,
          message: `✅ Google Custom Search werkt! Gevonden: ${data.resultsCount} resultaten voor "${data.query}"`
        });
      } else {
        setGoogleTestResult({
          success: false,
          message: `❌ ${data.error || 'API test mislukt'}\n\n${data.details?.message || ''}\n\nControleer:\n- Is Custom Search API geactiveerd in Google Cloud?\n- Is de API key correct?\n- Is de Search Engine ID correct?`
        });
      }
    } catch (err: any) {
      setGoogleTestResult({
        success: false,
        message: `❌ Netwerk fout: ${err.message}`
      });
    } finally {
      setTestingGoogle(false);
    }
  };

  const saveGoogleSettings = async () => {
    if (!selectedBrandId) {
      alert('Selecteer eerst een brand');
      return;
    }

    setSavingGoogle(true);
    try {
      let query = supabase
        .from('api_settings')
        .select('id');

      if (selectedBrandId === 'all') {
        query = query
          .eq('provider', 'system')
          .eq('service_name', 'Twilio WhatsApp');
      } else {
        query = query
          .eq('provider', 'Twilio')
          .eq('brand_id', selectedBrandId);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('api_settings')
          .update(googleSettings)
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('api_settings')
          .insert({
            brand_id: selectedBrandId === 'all' ? null : selectedBrandId,
            provider: selectedBrandId === 'all' ? 'system' : 'Twilio',
            service_name: selectedBrandId === 'all' ? 'Twilio WhatsApp' : 'WhatsApp',
            ...googleSettings
          });

        if (insertError) throw insertError;
      }

      const scope = selectedBrandId === 'all' ? 'voor ALLE brands' : 'voor deze brand';
      alert(`Google API instellingen opgeslagen ${scope}!`);
      loadGoogleSettings();
    } catch (err: any) {
      console.error('Error saving Google settings:', err);
      alert(`Fout bij opslaan: ${err.message}`);
    } finally {
      setSavingGoogle(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">API Instellingen</h1>
        <p className="text-gray-600">Configureer API keys en externe service credentials</p>
      </div>

      {/* OpenAI Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">OpenAI API</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOpenaiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={saveOpenAISettings}
            disabled={savingOpenai}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingOpenai ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Opslaan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Brand Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Brand Selectie</h2>
        <p className="text-sm text-gray-600 mb-4">
          Selecteer "Alle Brands" voor system-wide instellingen of kies een specifieke brand
        </p>
        
        <select
          value={selectedBrandId}
          onChange={(e) => setSelectedBrandId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecteer een brand...</option>
          <option value="all">🌍 Alle Brands (System-wide)</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {selectedBrandId && (
        <>
          {/* Twilio WhatsApp Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Twilio WhatsApp Instellingen</h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 System-wide vs Brand-specific</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>"Alle Brands"</strong> - Eén centraal Twilio nummer voor alle brands (aanbevolen)</li>
                <li><strong>Specifieke Brand</strong> - Unieke Twilio credentials per brand (optioneel)</li>
                <li>Nieuwe brands gebruiken automatisch de system-wide instellingen</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account SID
                </label>
                <input
                  type="text"
                  value={twilioSettings.twilio_account_sid}
                  onChange={(e) => setTwilioSettings(prev => ({ ...prev, twilio_account_sid: e.target.value }))}
                  placeholder="AC..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auth Token
                </label>
                <div className="relative">
                  <input
                    type={showTwilioToken ? 'text' : 'password'}
                    value={twilioSettings.twilio_auth_token}
                    onChange={(e) => setTwilioSettings(prev => ({ ...prev, twilio_auth_token: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwilioToken(!showTwilioToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showTwilioToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={twilioSettings.twilio_whatsapp_number}
                  onChange={(e) => setTwilioSettings(prev => ({ ...prev, twilio_whatsapp_number: e.target.value }))}
                  placeholder="whatsapp:+31..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {twilioTestResult && (
                <div className={`p-4 rounded-lg border ${
                  twilioTestResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {twilioTestResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm whitespace-pre-line ${
                      twilioTestResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {twilioTestResult.message}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={testTwilioSettings}
                  disabled={testingTwilio || !twilioSettings.twilio_account_sid || !twilioSettings.twilio_auth_token}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testingTwilio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testen...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Test Verbinding
                    </>
                  )}
                </button>
                <button
                  onClick={saveTwilioSettings}
                  disabled={savingTwilio}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingTwilio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Opslaan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Google APIs Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Google APIs Instellingen</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-900 mb-2">🔑 Google API Keys</h3>
              <p className="text-sm text-yellow-800">
                Configureer Google Places API (voor lokale suggesties) en Google Custom Search API (voor reisinfo zoeken). 
                Deze worden automatisch gekoppeld aan de Twilio settings hierboven.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Places API Key
                </label>
                <div className="relative">
                  <input
                    type={showGoogleKeys.places ? 'text' : 'password'}
                    value={googleSettings.google_places_api_key}
                    onChange={(e) => setGoogleSettings(prev => ({ ...prev, google_places_api_key: e.target.value }))}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleKeys(prev => ({ ...prev, places: !prev.places }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showGoogleKeys.places ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Search API Key
                </label>
                <div className="relative">
                  <input
                    type={showGoogleKeys.search ? 'text' : 'password'}
                    value={googleSettings.google_search_api_key}
                    onChange={(e) => setGoogleSettings(prev => ({ ...prev, google_search_api_key: e.target.value }))}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleKeys(prev => ({ ...prev, search: !prev.search }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showGoogleKeys.search ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Search Engine ID
                </label>
                <input
                  type="text"
                  value={googleSettings.google_search_engine_id}
                  onChange={(e) => setGoogleSettings(prev => ({ ...prev, google_search_engine_id: e.target.value }))}
                  placeholder="abc123..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {googleTestResult && (
                <div className={`p-4 rounded-lg border ${
                  googleTestResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {googleTestResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm whitespace-pre-line ${
                      googleTestResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {googleTestResult.message}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={testGoogleSearch}
                  disabled={testingGoogle || !googleSettings.google_search_api_key || !googleSettings.google_search_engine_id}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testingGoogle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testen...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Test Key
                    </>
                  )}
                </button>
                <button
                  onClick={saveGoogleSettings}
                  disabled={savingGoogle}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingGoogle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Opslaan
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📍 Waar vind je deze gegevens?</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <div>
                  <strong>Google Places API:</strong>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>Ga naar <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="underline hover:text-blue-900">Google Cloud Console</a></li>
                    <li>Maak een project aan of selecteer bestaand project</li>
                    <li>Activeer "Places API (New)"</li>
                    <li>Ga naar Credentials → Create API Key</li>
                  </ul>
                </div>
                <div>
                  <strong>Google Custom Search:</strong>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>Activeer "Custom Search API" in Cloud Console</li>
                    <li>Maak Search Engine aan op <a href="https://programmablesearchengine.google.com" target="_blank" rel="noopener" className="underline hover:text-blue-900">Programmable Search Engine</a></li>
                    <li>Kopieer de Search Engine ID</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
