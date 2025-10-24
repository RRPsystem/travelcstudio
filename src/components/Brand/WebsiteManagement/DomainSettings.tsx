import React, { useState, useEffect } from 'react';
import { Globe, Plus, CheckCircle, XCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Domain {
  id: string;
  domain: string;
  verification_token: string;
  status: string;
  is_primary: boolean;
  ssl_enabled: boolean;
  created_at: string;
  dns_verified_at: string | null;
}

export function DomainSettings() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, [user]);

  const loadDomains = async () => {
    if (!user?.brand_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('brand_domains')
        .select('*')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDomains(data || []);
    } catch (err) {
      console.error('Error loading domains:', err);
      setError('Fout bij het laden van domeinen');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Voer een domeinnaam in');
      return;
    }

    if (!user?.brand_id) return;

    try {
      const { error: insertError } = await supabase
        .from('brand_domains')
        .insert({
          brand_id: user.brand_id,
          domain: newDomain.trim().toLowerCase(),
          status: 'pending',
          is_primary: domains.length === 0,
          ssl_enabled: false
        });

      if (insertError) throw insertError;

      setNewDomain('');
      setShowAddModal(false);
      loadDomains();
    } catch (err) {
      console.error('Error adding domain:', err);
      setError('Fout bij het toevoegen van domein');
    }
  };

  const handleVerify = async (domainId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('brand_domains')
        .update({
          status: 'verified',
          dns_verified_at: new Date().toISOString(),
          ssl_enabled: true
        })
        .eq('id', domainId);

      if (updateError) throw updateError;
      loadDomains();
    } catch (err) {
      console.error('Error verifying domain:', err);
      setError('Fout bij het verifiëren van domein');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const previewUrl = user?.brand_id
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-viewer?brand_id=${user.brand_id}`
    : '';

  const subdomainUrl = user?.brand_id
    ? `https://brand-${user.brand_id}.ai-travelstudio.nl`
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Domein Instellingen</h2>
            <p className="text-sm text-gray-600 mt-1">Koppel je eigen domein aan je website</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus size={18} />
            <span>Domein Toevoegen</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-1">Preview URL</h3>
                <p className="text-xs text-blue-600 mb-2">Gebruik deze URL om je website te bekijken voordat je een eigen domein koppelt</p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 hover:text-blue-800 underline break-all"
                >
                  {previewUrl}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Globe className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900 mb-1">Toekomstig Subdomain</h3>
                <p className="text-xs text-green-600 mb-2">Binnenkort beschikbaar: je eigen subdomain</p>
                <p className="text-sm text-green-700 break-all">{subdomainUrl}</p>
              </div>
            </div>
          </div>
        </div>

        {domains.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen domeinen</h3>
            <p className="text-gray-600 mb-4">Begin met het toevoegen van je eerste eigen domein</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus size={18} />
              <span>Voeg Domein Toe</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{domain.domain}</h3>
                      {domain.is_primary && (
                        <span className="text-xs text-orange-600">Primair Domein</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {domain.status === 'verified' ? (
                      <span className="flex items-center space-x-1 text-green-600 text-sm">
                        <CheckCircle size={16} />
                        <span>Geverifieerd</span>
                      </span>
                    ) : domain.status === 'failed' ? (
                      <span className="flex items-center space-x-1 text-red-600 text-sm">
                        <XCircle size={16} />
                        <span>Verificatie mislukt</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVerify(domain.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Verifiëren
                      </button>
                    )}
                  </div>
                </div>

                {domain.status !== 'verified' && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">📋 Stapsgewijs eigen domein koppelen:</h4>
                      <ol className="space-y-2 text-xs text-blue-800">
                        <li className="flex items-start">
                          <span className="font-bold mr-2 flex-shrink-0">1.</span>
                          <span>Log in bij je domein provider (bijv. TransIP, Mijndomein, GoDaddy)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-bold mr-2 flex-shrink-0">2.</span>
                          <span>Ga naar DNS-instellingen / DNS-beheer van je domein</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-bold mr-2 flex-shrink-0">3.</span>
                          <span>Voeg onderstaande 3 DNS records toe (gebruik de kopieer-knoppen)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-bold mr-2 flex-shrink-0">4.</span>
                          <span>Wacht 2-48 uur tot de DNS-wijzigingen wereldwijd actief zijn</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-bold mr-2 flex-shrink-0">5.</span>
                          <span>Klik op de "Verifiëren" knop om je domein te activeren</span>
                        </li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Voeg deze 3 DNS records toe:</h4>

                      <div className="space-y-3">
                        <div className="bg-white rounded border border-gray-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">TXT Record (Verificatie)</span>
                            <button
                              onClick={() => copyToClipboard(domain.verification_token, `txt-${domain.id}`)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                            >
                              {copiedField === `txt-${domain.id}` ? (
                                <><Check size={12} /><span>Gekopieerd!</span></>
                              ) : (
                                <><Copy size={12} /><span>Kopiëren</span></>
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><span className="font-medium">Type:</span> TXT</div>
                            <div><span className="font-medium">Naam:</span> _bolt-verify</div>
                            <div className="break-all"><span className="font-medium">Waarde:</span> {domain.verification_token}</div>
                          </div>
                        </div>

                        <div className="bg-white rounded border border-gray-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">A Record</span>
                            <button
                              onClick={() => copyToClipboard('185.199.108.153', `a-${domain.id}`)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                            >
                              {copiedField === `a-${domain.id}` ? (
                                <><Check size={12} /><span>Gekopieerd!</span></>
                              ) : (
                                <><Copy size={12} /><span>Kopiëren</span></>
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><span className="font-medium">Type:</span> A</div>
                            <div><span className="font-medium">Naam:</span> @ (of laat leeg)</div>
                            <div><span className="font-medium">Waarde:</span> 185.199.108.153</div>
                          </div>
                        </div>

                        <div className="bg-white rounded border border-gray-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">CNAME Record (www)</span>
                            <button
                              onClick={() => copyToClipboard(subdomainUrl.replace('https://', ''), `cname-${domain.id}`)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                            >
                              {copiedField === `cname-${domain.id}` ? (
                                <><Check size={12} /><span>Gekopieerd!</span></>
                              ) : (
                                <><Copy size={12} /><span>Kopiëren</span></>
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><span className="font-medium">Type:</span> CNAME</div>
                            <div><span className="font-medium">Naam:</span> www</div>
                            <div className="break-all"><span className="font-medium">Waarde:</span> {subdomainUrl.replace('https://', '')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium mb-1">Hulp nodig met DNS?</p>
                          <p>Neem contact op met je domain provider (bijv. TransIP, Mijndomein, etc.) voor hulp bij het instellen van DNS records. De wijzigingen kunnen 24-48 uur duren voordat ze wereldwijd actief zijn.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Domein Toevoegen</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domeinnaam
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="bijv. jouwreisbureau.nl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewDomain('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddDomain}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
