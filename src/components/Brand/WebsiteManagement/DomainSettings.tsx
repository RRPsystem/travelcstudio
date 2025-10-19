import React, { useState, useEffect } from 'react';
import { Globe, Plus, CheckCircle, XCircle, Clock, Copy, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  dns_verified_at?: string;
  verification_token: string;
  ssl_enabled: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function DomainSettings() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, [user]);

  const loadDomains = async () => {
    if (!user?.brand_id) return;

    try {
      const { data, error } = await supabase
        .from('brand_domains')
        .select('*')
        .eq('brand_id', user.brand_id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.brand_id || !newDomain.trim()) return;

    try {
      const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      const { error } = await supabase
        .from('brand_domains')
        .insert({
          brand_id: user.brand_id,
          domain: cleanDomain,
          status: 'pending',
        });

      if (error) throw error;

      setNewDomain('');
      setShowAddForm(false);
      loadDomains();
      alert('✅ Domein toegevoegd! Configureer nu je DNS records.');
    } catch (error: any) {
      console.error('Error adding domain:', error);
      if (error.code === '23505') {
        alert('Dit domein is al in gebruik');
      } else {
        alert('Er ging iets mis bij het toevoegen van het domein');
      }
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifying(domainId);
    try {
      alert('DNS verificatie is in ontwikkeling. Neem contact op met support voor handmatige verificatie.');
    } catch (error) {
      console.error('Error verifying domain:', error);
      alert('Er ging iets mis bij het verifiëren');
    } finally {
      setVerifying(null);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('brand_domains')
        .update({ is_primary: true })
        .eq('id', domainId);

      if (error) throw error;

      alert('✅ Primair domein ingesteld');
      loadDomains();
    } catch (error) {
      console.error('Error setting primary:', error);
      alert('Er ging iets mis');
    }
  };

  const handleDeleteDomain = async (domainId: string, domain: string) => {
    if (!confirm(`Weet je zeker dat je ${domain} wilt verwijderen?`)) return;

    try {
      const { error } = await supabase
        .from('brand_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      alert('Domein verwijderd');
      loadDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      alert('Er ging iets mis bij het verwijderen');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('📋 Gekopieerd naar clipboard!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Geverifieerd
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            In afwachting
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Mislukt
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Verlopen
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domein Instellingen</h1>
          <p className="text-gray-600 mt-1">Koppel je eigen domein aan je website</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
          style={{ backgroundColor: '#ff7700' }}
        >
          <Plus className="w-5 h-5" />
          Domein Toevoegen
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nieuw Domein Toevoegen</h3>
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domein naam
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="bijv. reisbureau-amsterdam.nl"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Voer je domein in zonder http:// of https://
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
                style={{ backgroundColor: '#ff7700' }}
              >
                Toevoegen
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {domains.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nog geen domeinen</h3>
          <p className="text-gray-600 mb-6">Begin met het toevoegen van je eerste eigen domein</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
            style={{ backgroundColor: '#ff7700' }}
          >
            Voeg Domein Toe
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <div key={domain.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{domain.domain}</h3>
                      {domain.is_primary && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Primair
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Toegevoegd op {new Date(domain.created_at).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(domain.status)}
                </div>
              </div>

              {domain.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                    DNS Configuratie Vereist
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    Voeg de volgende DNS records toe aan je domein:
                  </p>

                  <div className="space-y-2">
                    <div className="bg-white rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">TXT Record (Verificatie)</span>
                        <button
                          onClick={() => copyToClipboard(domain.verification_token)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="font-mono text-xs text-gray-600 break-all">
                        Host: _bolt-verify.{domain.domain}
                      </div>
                      <div className="font-mono text-xs text-gray-600 break-all">
                        Value: {domain.verification_token}
                      </div>
                    </div>

                    <div className="bg-white rounded p-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">A Record (Website)</div>
                      <div className="font-mono text-xs text-gray-600">
                        Host: @ of {domain.domain}
                      </div>
                      <div className="font-mono text-xs text-gray-600">
                        Value: [IP adres van support]
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerifyDomain(domain.id)}
                    disabled={verifying === domain.id}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {verifying === domain.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifiëren...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        DNS Verifiëren
                      </>
                    )}
                  </button>
                </div>
              )}

              {domain.status === 'verified' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-green-900">Domein Actief</h4>
                      <p className="text-sm text-green-700">
                        Je website is beschikbaar op https://{domain.domain}
                      </p>
                      {domain.dns_verified_at && (
                        <p className="text-xs text-green-600 mt-1">
                          Geverifieerd op {new Date(domain.dns_verified_at).toLocaleDateString('nl-NL')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>SSL: {domain.ssl_enabled ? '✅ Actief' : '⏳ In behandeling'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!domain.is_primary && domain.status === 'verified' && (
                    <button
                      onClick={() => handleSetPrimary(domain.id)}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Primair maken
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Hulp nodig met DNS?</h4>
            <p className="text-sm text-blue-700">
              Neem contact op met je domein provider (bijv. TransIP, Mijndomein, etc.) voor hulp bij het instellen van DNS records.
              De wijzigingen kunnen 24-48 uur duren voordat ze wereldwijd actief zijn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
