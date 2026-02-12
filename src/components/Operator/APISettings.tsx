import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Key,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { GoogleAPITester } from './GoogleAPITester';

interface APISetting {
  id: string;
  provider: string;
  service_name: string;
  api_key: string;
  is_active: boolean;
  last_tested: string | null;
  test_status: string;
  usage_count: number;
  metadata: any;
}

export function APISettings() {
  const [settings, setSettings] = useState<APISetting[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [twilioSettings, setTwilioSettings] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_whatsapp_number: ''
  });
  const [googleSettings, setGoogleSettings] = useState({
    google_places_api_key: '',
    google_search_api_key: '',
    google_search_engine_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showGoogleKeys, setShowGoogleKeys] = useState({
    places: false,
    search: false
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadTwilioSettings();
      loadGoogleSettings();
    }
  }, [selectedBrandId]);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('api_settings')
        .select('*')
        .order('provider', { ascending: true });

      if (fetchError) throw fetchError;
      setSettings(data || []);
    } catch (err: any) {
      console.error('Error loading API settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const loadTwilioSettings = async () => {
    if (!selectedBrandId) return;

    try {
      let query = supabase
        .from('api_settings')
        .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number, brand_id');

      if (selectedBrandId === 'all') {
        query = query
          .eq('provider', 'system')
          .eq('service_name', 'Twilio WhatsApp');
      } else {
        query = query
          .eq('provider', 'Twilio')
          .eq('brand_id', selectedBrandId);
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;
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

  const testTwilioConnection = async () => {
    console.log('🔵 testTwilioConnection called');
    console.log('🔵 twilioSettings:', twilioSettings);

    if (!twilioSettings.twilio_account_sid || !twilioSettings.twilio_auth_token) {
      console.log('🔴 Missing credentials');
      setTwilioTestResult({ success: false, message: 'Vul eerst Account SID en Auth Token in' });
      return;
    }

    console.log('🟢 Starting Twilio test...');
    setTestingTwilio(true);
    setTwilioTestResult(null);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-twilio`;
      const payload = {
        accountSid: twilioSettings.twilio_account_sid,
        authToken: twilioSettings.twilio_auth_token,
        whatsappNumber: twilioSettings.twilio_whatsapp_number
      };

      console.log('🔵 Fetch URL:', url);
      console.log('🔵 Payload:', payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('🟢 Response received:', response.status);

      // First read the body as text to see what we got
      const responseText = await response.text();
      console.log('🔵 Response body:', responseText);

      if (!response.ok) {
        console.error('Response error:', response.status, responseText);
        setTwilioTestResult({
          success: false,
          message: `❌ Verbinding mislukt: ${response.status}\n${responseText}`
        });
        return;
      }

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🟢 Parsed data:', data);
      } catch (parseError) {
        console.error('🔴 JSON parse error:', parseError);
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
      console.error('🔴 Fetch error:', err);
      setTwilioTestResult({
        success: false,
        message: `❌ Netwerk fout: ${err.message}`
      });
    } finally {
      console.log('🔵 Finally: setting testingTwilio to false');
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

  const loadGoogleSettings = async () => {
    if (!selectedBrandId) return;

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
      
      console.log('[testGoogleSearch] Calling Edge Function:', `${supabaseUrl}/functions/v1/test-google-search`);
      
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
      
      console.log('[testGoogleSearch] Response status:', response.status);
      
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

  const updateAPIKey = async (id: string, api_key: string, is_active: boolean, metadata?: any) => {
    setSaving(id);
    setError('');
    try {
      const updateData: any = {
        api_key,
        is_active,
        updated_at: new Date().toISOString()
      };

      if (metadata) {
        updateData.metadata = metadata;
      }

      const { error: updateError } = await supabase
        .from('api_settings')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setSettings(prev =>
        prev.map(s => s.id === id ? { ...s, api_key, is_active, metadata: metadata || s.metadata } : s)
      );

      alert('API key succesvol opgeslagen!');
    } catch (err: any) {
      console.error('Error updating API key:', err);
      setError(err.message);
      alert(`Fout bij opslaan: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const testAPIKey = async (setting: APISetting) => {
    if (!setting.api_key || setting.api_key.trim() === '') {
      alert('Voer eerst een API key in');
      return;
    }

    setTesting(setting.id);
    setError('');

    try {
      if (setting.provider === 'OpenAI') {
        // Use edge function to avoid CORS issues
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-openai`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ apiKey: setting.api_key })
          }
        );

        const data = await response.json();

        if (data.success) {
          const { error: updateError } = await supabase
            .from('api_settings')
            .update({
              test_status: 'success',
              last_tested: new Date().toISOString()
            })
            .eq('id', setting.id);

          if (updateError) throw updateError;

          setSettings(prev =>
            prev.map(s => s.id === setting.id ? { ...s, test_status: 'success', last_tested: new Date().toISOString() } : s)
          );

          alert(`✅ ${data.message}`);
        } else {
          throw new Error(data.error || 'API key is ongeldig of heeft onvoldoende rechten');
        }
      } else if (setting.provider === 'Google' && setting.service_name === 'Google Maps API') {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('Niet ingelogd');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-google-places`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ test: 'geocoding' })
          }
        );

        const data = await response.json();

        console.log('🗺️ Google Maps API test response:', data);

        if (data.success) {
          const { error: updateError } = await supabase
            .from('api_settings')
            .update({
              test_status: 'success',
              last_tested: new Date().toISOString()
            })
            .eq('id', setting.id);

          if (updateError) throw updateError;

          setSettings(prev =>
            prev.map(s => s.id === setting.id ? { ...s, test_status: 'success', last_tested: new Date().toISOString() } : s)
          );

          alert('✅ Google Maps API key werkt correct!\n\nHet Geocoding API antwoord is succesvol ontvangen.');
        } else {
          const errorMsg = data.error || data.details?.error_message || 'Onbekende fout';
          console.error('❌ Google Maps API test failed:', data);

          if (errorMsg.includes('REQUEST_DENIED') || errorMsg.includes('API key not valid')) {
            throw new Error(`Google Maps API - Toegang Geweigerd\n\n${errorMsg}\n\nControleer of deze APIs zijn geactiveerd in Google Cloud Console:\n- Geocoding API\n- Places API (New)\n- Routes API\n- Maps JavaScript API`);
          } else {
            throw new Error(`Google Maps API Test Mislukt\n\n${errorMsg}\n\nControleer je API key en quota in Google Cloud Console.`);
          }
        }
      } else if (setting.provider === 'Google' && setting.service_name === 'Google Custom Search') {
        const searchEngineId = setting.metadata?.search_engine_id;

        if (!searchEngineId) {
          throw new Error('Search Engine ID ontbreekt in de configuratie');
        }

        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${setting.api_key}&cx=${searchEngineId}&q=test`
        );

        const data = await response.json();

        if (response.ok && !data.error) {
          const { error: updateError } = await supabase
            .from('api_settings')
            .update({
              test_status: 'success',
              last_tested: new Date().toISOString()
            })
            .eq('id', setting.id);

          if (updateError) throw updateError;

          setSettings(prev =>
            prev.map(s => s.id === setting.id ? { ...s, test_status: 'success', last_tested: new Date().toISOString() } : s)
          );

          alert('Google Search API key werkt correct!');
        } else {
          throw new Error(data.error?.message || 'Google Search API key is ongeldig');
        }
      } else if (setting.provider === 'Unsplash') {
        // Test Unsplash API via edge function (CSP blocks direct calls)
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-unsplash`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ apiKey: setting.api_key })
          }
        );

        const data = await response.json();

        if (data.success) {
          const { error: updateError } = await supabase
            .from('api_settings')
            .update({
              test_status: 'success',
              last_tested: new Date().toISOString()
            })
            .eq('id', setting.id);

          if (updateError) throw updateError;

          setSettings(prev =>
            prev.map(s => s.id === setting.id ? { ...s, test_status: 'success', last_tested: new Date().toISOString() } : s)
          );

          alert(`✅ ${data.message}`);
        } else {
          throw new Error(data.error || 'Unsplash API key is ongeldig');
        }
      } else if (setting.provider === 'YouTube') {
        // Test YouTube API
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${setting.api_key}`
        );

        if (response.ok) {
          const { error: updateError } = await supabase
            .from('api_settings')
            .update({
              test_status: 'success',
              last_tested: new Date().toISOString()
            })
            .eq('id', setting.id);

          if (updateError) throw updateError;

          setSettings(prev =>
            prev.map(s => s.id === setting.id ? { ...s, test_status: 'success', last_tested: new Date().toISOString() } : s)
          );

          alert('✅ YouTube API key werkt correct!');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'YouTube API key is ongeldig');
        }
      } else {
        alert('Test functie nog niet geïmplementeerd voor deze provider');
      }
    } catch (err: any) {
      console.error('Error testing API key:', err);

      const { error: updateError } = await supabase
        .from('api_settings')
        .update({
          test_status: 'failed',
          last_tested: new Date().toISOString()
        })
        .eq('id', setting.id);

      if (!updateError) {
        setSettings(prev =>
          prev.map(s => s.id === setting.id ? { ...s, test_status: 'failed', last_tested: new Date().toISOString() } : s)
        );
      }

      alert(`API test mislukt: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={loadSettings}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Ververs
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Fout bij laden</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <GoogleAPITester />

      <div className="grid grid-cols-1 gap-6">
        {settings.map((setting) => (
          <div key={setting.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{setting.service_name}</h3>
                  <p className="text-sm text-gray-600">{setting.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(setting.test_status)}
                <span className="text-sm text-gray-600">
                  {setting.test_status === 'success' ? 'Getest' :
                   setting.test_status === 'failed' ? 'Test mislukt' : 'Niet getest'}
                </span>
              </div>
            </div>

            {setting.metadata?.description && (
              <p className="text-sm text-gray-600 mb-4">{setting.metadata.description}</p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey[setting.id] ? 'text' : 'password'}
                      value={setting.api_key || ''}
                      onChange={(e) => {
                        setSettings(prev =>
                          prev.map(s => s.id === setting.id ? { ...s, api_key: e.target.value } : s)
                        );
                      }}
                      placeholder="Voer API key in..."
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(setting.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey[setting.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {setting.provider === 'Google' && setting.service_name === 'Google Custom Search' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Engine ID (cx)
                  </label>
                  <input
                    type="text"
                    value={setting.metadata?.search_engine_id || ''}
                    onChange={(e) => {
                      setSettings(prev =>
                        prev.map(s => s.id === setting.id ? {
                          ...s,
                          metadata: { ...s.metadata, search_engine_id: e.target.value }
                        } : s)
                      );
                    }}
                    placeholder="Bijv: 1234567890abc:defghijk"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vind je Search Engine ID op: <a href="https://programmablesearchengine.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Programmable Search Engine</a>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.is_active}
                    onChange={(e) => {
                      setSettings(prev =>
                        prev.map(s => s.id === setting.id ? { ...s, is_active: e.target.checked } : s)
                      );
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Actief</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => updateAPIKey(setting.id, setting.api_key, setting.is_active, setting.metadata)}
                  disabled={saving === setting.id}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving === setting.id ? (
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
                <button
                  onClick={() => testAPIKey(setting)}
                  disabled={testing === setting.id || !setting.api_key}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testing === setting.id ? (
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
              </div>

              {setting.last_tested && (
                <div className="text-xs text-gray-500 pt-2">
                  Laatst getest: {new Date(setting.last_tested).toLocaleString('nl-NL')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {settings.length === 0 && (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Geen API instellingen gevonden</p>
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Twilio WhatsApp Instellingen</h2>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 System-wide vs Brand-specific</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>"Alle Brands"</strong> - Eén centraal Twilio nummer voor alle brands (aanbevolen)</li>
              <li><strong>Specifieke Brand</strong> - Unieke Twilio credentials per brand (optioneel)</li>
              <li>Nieuwe brands gebruiken automatisch de system-wide instellingen</li>
            </ul>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scope
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">🌍 Alle Brands (System-wide)</option>
              <optgroup label="Brand-specific overrides">
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twilio Account SID
              </label>
              <input
                type="text"
                value={twilioSettings.twilio_account_sid}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, twilio_account_sid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twilio Auth Token
              </label>
              <div className="relative">
                <input
                  type={showTwilioToken ? 'text' : 'password'}
                  value={twilioSettings.twilio_auth_token}
                  onChange={(e) => setTwilioSettings({ ...twilioSettings, twilio_auth_token: e.target.value })}
                  placeholder="********************************"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                Twilio WhatsApp Number (Production)
              </label>
              <input
                type="tel"
                value={twilioSettings.twilio_whatsapp_number}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, twilio_whatsapp_number: e.target.value })}
                placeholder="+3197010255051"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Je goedgekeurde WhatsApp Business nummer (bijv. +3197010255051)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={testTwilioConnection}
                disabled={testingTwilio}
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

            {twilioTestResult && (
              <div className={`mt-4 p-4 rounded-lg border ${twilioTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-medium ${twilioTestResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {twilioTestResult.message}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📱 Waar vind je deze gegevens?</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                <strong>1. Account SID & Auth Token:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Ga naar <a href="https://console.twilio.com" target="_blank" rel="noopener" className="underline hover:text-blue-900">Twilio Console</a></li>
                  <li>Rechts bovenaan zie je: <strong>Account SID</strong> (34 tekens)</li>
                  <li>Klik op "Show" bij <strong>Auth Token</strong> (32 tekens)</li>
                </ul>
              </div>
              <div>
                <strong>2. WhatsApp Number:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Ga naar: Messaging → Try it out → Send a WhatsApp message</li>
                  <li>Kopieer <strong>Sandbox Phone Number</strong> (bijv. +1 415 523 8886)</li>
                  <li>Voor productie: gebruik je eigen WhatsApp Business nummer</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-blue-300">
                <strong>💡 Tip:</strong> Twilio Sandbox is GRATIS voor testen. WhatsApp Business kost ~€15/maand.
                Zie <strong>TWILIO_WHATSAPP_SETUP.md</strong> voor volledige uitleg met screenshots.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Google APIs Instellingen</h2>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">🔑 Google API Keys</h3>
            <p className="text-sm text-blue-800">
              Configureer Google Places API (voor locatie suggesties) en Google Custom Search API (voor reisinfo zoeken).
              Deze worden automatisch gekoppeld aan de Twilio settings hierboven.
            </p>
          </div>

          {selectedBrandId && (
            <>
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
              </div>

              {googleTestResult && (
                <div className={`mt-4 p-4 rounded-lg border ${
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

              <div className="mt-6 flex gap-3">
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
            </>
          )}

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
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
      </div>
    </div>
  );
}
