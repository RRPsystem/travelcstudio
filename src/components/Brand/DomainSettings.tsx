import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { Globe, Plus, Check, X, AlertCircle, Trash2, RefreshCw, Copy, ExternalLink } from 'lucide-react';

interface Domain {
  id: string;
  brand_id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  dns_verified_at: string | null;
  verification_token: string;
  ssl_enabled: boolean;
  is_primary: boolean;
  website_id: string | null;
  last_verification_attempt: string | null;
  created_at: string;
  updated_at: string;
}

interface Website {
  id: string;
  name: string;
  domain: string;
}

export function DomainSettings() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
    loadWebsites();
  }, [user?.brand_id]);

  const loadDomains = async () => {
    if (!user?.brand_id) return;

    try {
      const { data, error } = await db.supabase
        .from('brand_domains')
        .select('*')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (err: any) {
      console.error('Error loading domains:', err);
      setError('Fout bij laden van domeinen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWebsites = async () => {
    if (!user?.brand_id) return;

    try {
      const { data, error } = await db.supabase
        .from('websites')
        .select('id, name, domain')
        .eq('brand_id', user.brand_id)
        .order('name');

      if (error) throw error;
      setWebsites(data || []);
    } catch (err: any) {
      console.error('Error loading websites:', err);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Voer een geldig domein in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await db.supabase
        .from('brand_domains')
        .insert({
          brand_id: user?.brand_id,
          domain: newDomain.toLowerCase().trim(),
          website_id: selectedWebsiteId || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Domein toegevoegd! Voeg de DNS record toe om te verifiëren.');
      setNewDomain('');
      setSelectedWebsiteId('');
      setShowAddForm(false);
      await loadDomains();
    } catch (err: any) {
      console.error('Error adding domain:', err);
      setError('Fout bij toevoegen domein: ' + (err.message || 'Onbekende fout'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomain(domainId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-domain`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain_id: domainId })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verificatie mislukt');
      }

      if (result.verified) {
        setSuccess('Domein succesvol geverifieerd!');
      } else {
        setError('DNS record niet gevonden. Controleer of de TXT record correct is ingesteld.');
      }

      await loadDomains();
    } catch (err: any) {
      console.error('Error verifying domain:', err);
      setError('Verificatie fout: ' + err.message);
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Weet je zeker dat je dit domein wilt verwijderen?')) return;

    try {
      const { error } = await db.supabase
        .from('brand_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      setSuccess('Domein verwijderd');
      await loadDomains();
    } catch (err: any) {
      console.error('Error deleting domain:', err);
      setError('Fout bij verwijderen: ' + err.message);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      const { error } = await db.supabase
        .from('brand_domains')
        .update({ is_primary: true })
        .eq('id', domainId);

      if (error) throw error;

      setSuccess('Primair domein ingesteld');
      await loadDomains();
    } catch (err: any) {
      console.error('Error setting primary:', err);
      setError('Fout bij instellen primair domein: ' + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Gekopieerd naar klembord!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'expired': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <Check className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'failed': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Domein Instellingen</h2>
          <p className="text-gray-600 mt-1">Koppel je eigen domein aan je website</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-colors"
          style={{ backgroundColor: '#ff7700' }}
        >
          <Plus className="w-4 h-4" />
          <span>Domein Toevoegen</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Nieuw Domein Toevoegen</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domein Naam
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="bijvoorbeeld: mijnreisbureau.nl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Voer alleen het domein in zonder http:// of https://</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Koppel aan Website (optioneel)
              </label>
              <select
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Geen website geselecteerd</option>
                {websites.map((website) => (
                  <option key={website.id} value={website.id}>
                    {website.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAddDomain}
                disabled={loading}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#ff7700' }}
              >
                {loading ? 'Bezig...' : 'Domein Toevoegen'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Laden...</div>
        ) : domains.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen domeinen</h3>
            <p className="text-gray-600 mb-4">Voeg je eerste custom domein toe om te beginnen</p>
          </div>
        ) : (
          domains.map((domain) => (
            <div key={domain.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900">{domain.domain}</h3>
                    {domain.is_primary && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                        Primair
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded flex items-center space-x-1 ${getStatusColor(domain.status)}`}>
                      {getStatusIcon(domain.status)}
                      <span className="capitalize">{domain.status}</span>
                    </span>
                  </div>

                  {domain.website_id && websites.find(w => w.id === domain.website_id) && (
                    <p className="text-sm text-gray-600 mb-3">
                      Gekoppeld aan: {websites.find(w => w.id === domain.website_id)?.name}
                    </p>
                  )}

                  {domain.status === 'pending' && (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">Stap 1: Verificatie Record</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Voeg eerst deze TXT record toe voor verificatie:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Type</div>
                              <div className="font-mono text-sm">TXT</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Naam</div>
                              <div className="font-mono text-sm">_bolt-verify</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard('_bolt-verify')}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Kopieer naam"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Waarde</div>
                              <div className="font-mono text-sm truncate">{domain.verification_token}</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(domain.verification_token)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Kopieer waarde"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">Stap 2: Apex Domain (@ record)</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Voor het hoofddomein (bijv. mijnreisbureau.nl):
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Type</div>
                              <div className="font-mono text-sm">A</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Naam</div>
                              <div className="font-mono text-sm">@ (of leeg laten)</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard('@')}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Kopieer naam"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Waarde / IP</div>
                              <div className="font-mono text-sm">76.76.21.21</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard('76.76.21.21')}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Kopieer IP adres"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Dit is het Vercel IP adres waar je website wordt gehost
                        </p>
                      </div>

                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">Stap 3: WWW Subdomain</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Voor www.mijnreisbureau.nl:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Type</div>
                              <div className="font-mono text-sm">CNAME</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Naam</div>
                              <div className="font-mono text-sm">www</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard('www')}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Kopieer naam"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Waarde / Target</div>
                              <div className="font-mono text-sm">cname.vercel-dns.com</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard('cname.vercel-dns.com')}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Kopieer target"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs text-gray-600">
                          <strong>Let op:</strong> Het kan 5-30 minuten duren voordat DNS wijzigingen zijn doorgevoerd.
                          Begin met stap 1 (verificatie), wacht tot deze is geverifieerd, en voeg daarna stap 2 en 3 toe.
                        </p>
                      </div>
                    </div>
                  )}

                  {domain.status === 'verified' && domain.dns_verified_at && (
                    <div className="mt-4 space-y-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          <span>
                            <strong>Geverifieerd!</strong> Je domein is succesvol geverifieerd op {new Date(domain.dns_verified_at).toLocaleDateString('nl-NL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      </div>

                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-900 mb-3">Actieve DNS Records</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border">TXT _bolt-verify</span>
                            <span className="text-gray-600">Verificatie</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border">A @ → 76.76.21.21</span>
                            <span className="text-gray-600">Hoofddomein</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border">CNAME www → cname.vercel-dns.com</span>
                            <span className="text-gray-600">WWW subdomain</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-3">
                          SSL certificaat wordt automatisch gegenereerd en vernieuwd.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  {domain.status === 'pending' && (
                    <button
                      onClick={() => handleVerifyDomain(domain.id)}
                      disabled={verifyingDomain === domain.id}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Verificatie controleren"
                    >
                      <RefreshCw className={`w-5 h-5 ${verifyingDomain === domain.id ? 'animate-spin' : ''}`} />
                    </button>
                  )}

                  {domain.status === 'verified' && !domain.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(domain.id)}
                      className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      title="Instellen als primair domein"
                    >
                      Als Primair
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteDomain(domain.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">DNS Instellingen Help</h4>
            <div className="text-sm text-gray-700 space-y-3">
              <div>
                <strong>Waar voeg ik deze records toe?</strong>
                <p className="mt-1">Log in bij je domein provider (bijv. TransIP, Mijndomein, GoDaddy) en ga naar de DNS management sectie.</p>
              </div>
              <div>
                <strong>Belangrijke tips:</strong>
                <ul className="mt-1 space-y-1 ml-4">
                  <li>• Gebruik exact de aangegeven namen en waarden</li>
                  <li>• Bij sommige providers moet je bij "Naam" het domein weglaten (dus alleen <code className="bg-white px-1 rounded">_bolt-verify</code> in plaats van <code className="bg-white px-1 rounded">_bolt-verify.mijndomein.nl</code>)</li>
                  <li>• TTL kan je meestal op de standaard waarde laten (3600 seconden)</li>
                  <li>• Alle 3 de records zijn nodig voor een volledig werkende setup</li>
                  <li>• SSL certificaten worden automatisch aangemaakt na verificatie</li>
                </ul>
              </div>
              <div>
                <strong>Populaire providers:</strong>
                <div className="mt-1 flex flex-wrap gap-2">
                  <a href="https://www.transip.nl" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    TransIP <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-gray-400">•</span>
                  <a href="https://www.mijndomein.nl" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    Mijndomein <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-gray-400">•</span>
                  <a href="https://www.versio.nl" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    Versio <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-gray-400">•</span>
                  <a href="https://www.godaddy.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    GoDaddy <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
