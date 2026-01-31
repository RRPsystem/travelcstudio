import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, ExternalLink, Check, X, RefreshCw, Webhook, Edit2, Save } from 'lucide-react';

interface Builder {
  id: string;
  name: string;
  builder_url: string;
  api_endpoint: string;
  editor_url?: string;
  compositor_webhook_url?: string;
  compositor_webhook_secret?: string;
  is_active: boolean;
  version: string;
  created_at: string;
  builder_categories: Category[];
}

interface Category {
  id: string;
  category_slug: string;
  display_name: string;
  description?: string;
  total_pages: number;
  preview_url?: string;
  tags: string[];
  features: string[];
  recommended_pages: string[];
  is_active: boolean;
}

export default function ExternalBuilderManager() {
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    loadBuilders();
  }, []);

  const loadBuilders = async () => {
    try {
      const { data, error } = await supabase
        .from('external_builders')
        .select(`
          *,
          builder_categories (*)
        `)
        .order('name');

      if (error) throw error;
      setBuilders(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerBuilder = async () => {
    if (!registrationUrl.trim()) {
      setError('Registration URL is required');
      return;
    }

    setRegistering(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-external-builder`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registration_url: registrationUrl,
            auth_token: authToken || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register builder');
      }

      setSuccess(`Builder "${result.builder.name}" registered successfully!`);
      setRegistrationUrl('');
      setAuthToken('');
      await loadBuilders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const toggleBuilder = async (builderId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('external_builders')
        .update({ is_active: !isActive })
        .eq('id', builderId);

      if (error) throw error;
      await loadBuilders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditingWebhook = (builder: Builder) => {
    setEditingWebhook(builder.id);
    setWebhookUrl(builder.compositor_webhook_url || '');
    setWebhookSecret(builder.compositor_webhook_secret || '');
    setError('');
    setSuccess('');
  };

  const saveWebhookConfig = async (builderId: string) => {
    setSavingWebhook(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('external_builders')
        .update({
          compositor_webhook_url: webhookUrl.trim() || null,
          compositor_webhook_secret: webhookSecret.trim() || null,
        })
        .eq('id', builderId);

      if (error) throw error;

      setSuccess('Webhook configuration saved successfully!');
      setEditingWebhook(null);
      setWebhookUrl('');
      setWebhookSecret('');
      await loadBuilders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Register New Builder</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration URL
              </label>
              <input
                type="url"
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="https://example.com/api/templates/registration"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Token (Optional)
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Bearer token for authentication"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={registerBuilder}
              disabled={registering}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Register Builder
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Registered Builders</h3>

          {builders.length === 0 ? (
            <p className="text-gray-500">No builders registered yet.</p>
          ) : (
            <div className="space-y-4">
              {builders.map((builder) => (
                <div
                  key={builder.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{builder.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          builder.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {builder.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <a
                          href={builder.builder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-blue-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Website
                        </a>
                        {builder.editor_url && (
                          <a
                            href={builder.editor_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Editor
                          </a>
                        )}
                        <span>v{builder.version}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleBuilder(builder.id, builder.is_active)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        builder.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {builder.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Webhook className="w-4 h-4" />
                        Travel Compositor Webhook
                      </h5>
                      {editingWebhook !== builder.id && (
                        <button
                          onClick={() => startEditingWebhook(builder)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Configure
                        </button>
                      )}
                    </div>

                    {editingWebhook === builder.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Webhook URL
                          </label>
                          <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://your-builder.com/api/travelbro/compositor-sync"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Webhook Secret
                          </label>
                          <input
                            type="password"
                            value={webhookSecret}
                            onChange={(e) => setWebhookSecret(e.target.value)}
                            placeholder="Secret key for webhook authentication"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveWebhookConfig(builder.id)}
                            disabled={savingWebhook}
                            className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingWebhook ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-3 h-3" />
                                Save
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingWebhook(null);
                              setWebhookUrl('');
                              setWebhookSecret('');
                            }}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {builder.compositor_webhook_url ? (
                          <>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">URL:</span>{' '}
                              <code className="bg-white px-2 py-1 rounded text-xs">
                                {builder.compositor_webhook_url}
                              </code>
                            </div>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Secret:</span>{' '}
                              <code className="bg-white px-2 py-1 rounded text-xs">
                                {builder.compositor_webhook_secret ? '••••••••' : 'Not set'}
                              </code>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-green-600">
                              <Check className="w-3 h-3" />
                              Webhook configured
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <X className="w-3 h-3" />
                            No webhook configured - Compositor sync will not work
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Categories ({builder.builder_categories.length})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {builder.builder_categories.map((category) => (
                        <div
                          key={category.id}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">
                              {category.display_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {category.total_pages} pages
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {category.description}
                            </p>
                          )}
                          {category.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {category.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
