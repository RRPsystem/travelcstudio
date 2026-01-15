import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Key,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Loader2
} from 'lucide-react';

interface OAuthSetting {
  id: string;
  platform: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const platformConfig = {
  facebook: {
    icon: Facebook,
    color: '#1877F2',
    name: 'Facebook',
    defaultScopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
    docsUrl: 'https://developers.facebook.com/docs/facebook-login/guides/access-tokens'
  },
  instagram: {
    icon: Instagram,
    color: '#E4405F',
    name: 'Instagram',
    defaultScopes: ['instagram_basic', 'instagram_content_publish'],
    docsUrl: 'https://developers.facebook.com/docs/instagram-basic-display-api'
  },
  twitter: {
    icon: Twitter,
    color: '#1DA1F2',
    name: 'Twitter/X',
    defaultScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    docsUrl: 'https://developer.twitter.com/en/docs/authentication/oauth-2-0'
  },
  linkedin: {
    icon: Linkedin,
    color: '#0A66C2',
    name: 'LinkedIn',
    defaultScopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    docsUrl: 'https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication'
  },
  youtube: {
    icon: Youtube,
    color: '#FF0000',
    name: 'YouTube',
    defaultScopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'],
    docsUrl: 'https://developers.google.com/youtube/v3/guides/authentication'
  }
};

export function OAuthManagement() {
  const [settings, setSettings] = useState<OAuthSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    platform: '',
    client_id: '',
    client_secret: '',
    redirect_uri: '',
    scopes: [] as string[],
    is_active: true,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('oauth_settings')
        .select('*')
        .order('platform');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error loading OAuth settings:', error);
      alert('Fout bij laden van OAuth instellingen');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: OAuthSetting) => {
    setEditingId(setting.id);
    setFormData({
      platform: setting.platform,
      client_id: setting.client_id,
      client_secret: setting.client_secret,
      redirect_uri: setting.redirect_uri,
      scopes: setting.scopes,
      is_active: setting.is_active,
      notes: setting.notes || ''
    });
  };

  const handleAdd = (platform: string) => {
    const config = platformConfig[platform as keyof typeof platformConfig];
    setShowAddForm(true);
    setFormData({
      platform,
      client_id: '',
      client_secret: '',
      redirect_uri: `${window.location.origin}/api/oauth-callback`,
      scopes: config.defaultScopes,
      is_active: true,
      notes: ''
    });
  };

  const handleSave = async () => {
    if (!formData.platform || !formData.client_id || !formData.client_secret) {
      alert('Vul alle verplichte velden in');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from('oauth_settings')
          .update({
            client_id: formData.client_id,
            client_secret: formData.client_secret,
            redirect_uri: formData.redirect_uri,
            scopes: formData.scopes,
            is_active: formData.is_active,
            notes: formData.notes || null
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('oauth_settings')
          .insert([formData]);

        if (error) throw error;
      }

      await loadSettings();
      handleCancel();
      alert('OAuth instellingen opgeslagen!');
    } catch (error) {
      console.error('Error saving OAuth settings:', error);
      alert('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze OAuth configuratie wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('oauth_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
      alert('OAuth configuratie verwijderd');
    } catch (error) {
      console.error('Error deleting OAuth setting:', error);
      alert('Fout bij verwijderen');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      platform: '',
      client_id: '',
      client_secret: '',
      redirect_uri: '',
      scopes: [],
      is_active: true,
      notes: ''
    });
  };

  const configuredPlatforms = settings.map(s => s.platform);
  const availablePlatforms = Object.keys(platformConfig).filter(p => !configuredPlatforms.includes(p));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Key className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">OAuth App Management</h2>
              <p className="text-gray-600 mt-1">
                Configureer OAuth apps voor social media integraties. Elke brand gebruikt deze credentials om hun eigen accounts te koppelen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Hoe werkt het?</p>
            <ol className="space-y-1 ml-4">
              <li>1. Maak een OAuth app aan bij het platform (Facebook, Twitter, etc.)</li>
              <li>2. Kopieer de Client ID en Client Secret</li>
              <li>3. Stel de Redirect URI in bij het platform</li>
              <li>4. Voeg de credentials hier toe</li>
              <li>5. Brands kunnen nu hun accounts koppelen via jouw OAuth app</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Add New Platform */}
      {availablePlatforms.length > 0 && !showAddForm && !editingId && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Voeg Platform Toe</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {availablePlatforms.map((platform) => {
              const config = platformConfig[platform as keyof typeof platformConfig];
              const Icon = config.icon;
              return (
                <button
                  key={platform}
                  onClick={() => handleAdd(platform)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-400 transition-colors flex flex-col items-center space-y-2"
                >
                  <Icon size={32} style={{ color: config.color }} />
                  <span className="text-sm font-medium text-gray-700">{config.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'OAuth Configuratie Bewerken' : 'Nieuwe OAuth Configuratie'}
            </h3>
            <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <input
                type="text"
                value={platformConfig[formData.platform as keyof typeof platformConfig]?.name || formData.platform}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID *</label>
              <input
                type="text"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Plak hier de Client ID van het platform"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret *</label>
              <input
                type="password"
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Plak hier de Client Secret van het platform"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URI *</label>
              <input
                type="text"
                value={formData.redirect_uri}
                onChange={(e) => setFormData({ ...formData, redirect_uri: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gebruik deze URL in je OAuth app configuratie bij het platform
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scopes</label>
              <textarea
                value={formData.scopes.join('\n')}
                onChange={(e) => setFormData({ ...formData, scopes: e.target.value.split('\n').filter(s => s.trim()) })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                placeholder="Eén scope per regel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Optionele notities over deze configuratie"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Actief (brands kunnen dit platform koppelen)
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Opslaan...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Opslaan</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>

          {formData.platform && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Documentatie:</strong>{' '}
                <a
                  href={platformConfig[formData.platform as keyof typeof platformConfig]?.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline"
                >
                  {platformConfig[formData.platform as keyof typeof platformConfig]?.name} OAuth Docs
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Configured Platforms */}
      {settings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Geconfigureerde Platforms</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {settings.map((setting) => {
              const config = platformConfig[setting.platform as keyof typeof platformConfig];
              const Icon = config?.icon || Key;

              return (
                <div key={setting.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: `${config?.color}15` }}>
                        <Icon size={24} style={{ color: config?.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{config?.name || setting.platform}</h4>
                          {setting.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center space-x-1">
                              <CheckCircle2 size={12} />
                              <span>Actief</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              Inactief
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Client ID:</strong> {setting.client_id.substring(0, 20)}...</p>
                          <p><strong>Redirect URI:</strong> {setting.redirect_uri}</p>
                          <p><strong>Scopes:</strong> {setting.scopes.join(', ')}</p>
                          {setting.notes && (
                            <p className="text-gray-500 italic">{setting.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(setting)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(setting.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {settings.length === 0 && !showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen OAuth Apps Geconfigureerd</h3>
          <p className="text-gray-600 mb-6">
            Voeg een platform toe om brands in staat te stellen hun social media accounts te koppelen.
          </p>
        </div>
      )}
    </div>
  );
}
