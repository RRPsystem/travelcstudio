import React, { useState, useEffect } from 'react';
import { Upload, Save, AlertCircle, Settings, Globe, Copy, Check, FileText, Wallet, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DomainSettings } from './DomainSettings';
import WebsiteIntakeForm from './WebsiteIntakeForm';
import CreditWallet from '../shared/CreditWallet';
import { AgentManagement } from './AgentManagement';

type TabType = 'general' | 'domains' | 'intake' | 'credits' | 'agents';

export function BrandSettings() {
  const { user, effectiveBrandId } = useAuth();
  const getInitialTab = (): TabType => {
    const hash = window.location.hash;
    if (hash.includes('domains')) return 'domains';
    if (hash.includes('intake')) return 'intake';
    return 'general';
  };
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedSetup, setCopiedSetup] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    primary_color: '#3B82F6',
    secondary_color: '#6B7280',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    street_address: '',
    city: '',
    postal_code: '',
    country: 'Netherlands',
    website_url: '',
    logo_url: '',
    website_type: 'wordpress',
    wordpress_url: '',
    wordpress_username: '',
    wordpress_app_password: '',
    wordpress_connected: false
  });

  const [websiteInfo, setWebsiteInfo] = useState<{
    type: string;
    builderName?: string;
    hasWebsite: boolean;
  }>({
    type: 'Geen website',
    hasWebsite: false
  });

  useEffect(() => {
    loadBrandData();
  }, [user]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('domains')) {
        setActiveTab('domains');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadBrandData = async () => {
    if (!effectiveBrandId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', effectiveBrandId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setFormData({
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          primary_color: data.primary_color || '#3B82F6',
          secondary_color: data.secondary_color || '#6B7280',
          contact_person: data.contact_person || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          street_address: data.street_address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          country: data.country || 'Netherlands',
          website_url: data.website_url || '',
          logo_url: data.logo_url || '',
          website_type: data.website_type || 'wordpress',
          wordpress_url: data.wordpress_url || '',
          wordpress_username: data.wordpress_username || '',
          wordpress_app_password: data.wordpress_app_password || '',
          wordpress_connected: data.wordpress_connected || false
        });
      }

      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, template_source_type, external_builder_id, external_builders(name)')
        .eq('brand_id', effectiveBrandId)
        .maybeSingle();

      if (!websiteError && website) {
        let type = 'Onbekend';
        let builderName = undefined;

        if (website.template_source_type === 'wordpress') {
          type = 'WordPress Website';
        } else if (website.external_builder_id && website.external_builders) {
          type = 'External Builder Website';
          builderName = (website.external_builders as any).name || 'Unknown Builder';
        } else if (website.template_source_type === 'quickstart') {
          type = 'QuickStart Website (External Builder)';
        }

        setWebsiteInfo({
          type,
          builderName,
          hasWebsite: true
        });
      } else {
        setWebsiteInfo({
          type: 'Geen website',
          hasWebsite: false
        });
      }
    } catch (err) {
      console.error('Error loading brand data:', err);
      setError('Failed to load brand settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess('');
  };

  const copySetupCode = async () => {
    const setupCode = `=== WordPress AI News Setup Code ===

Supabase Function URL:
${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wordpress-news

Brand ID:
${effectiveBrandId}

OpenAI API Key:
[Vraag aan Bolt support, of gebruik je eigen OpenAI key]

---
Plak deze gegevens in WordPress > Instellingen > AI News Plugin`;

    try {
      await navigator.clipboard.writeText(setupCode);
      setCopiedSetup(true);
      setTimeout(() => setCopiedSetup(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, logo_url: result }));
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Failed to upload logo');
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveBrandId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('brands')
        .update({
          name: formData.name,
          description: formData.description,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          contact_person: formData.contact_person,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          street_address: formData.street_address,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country,
          website_url: formData.website_url,
          logo_url: formData.logo_url,
          website_type: formData.website_type,
          content_system: formData.website_type,
          wordpress_url: formData.wordpress_url,
          wordpress_username: formData.wordpress_username,
          wordpress_app_password: formData.wordpress_app_password,
          updated_at: new Date().toISOString()
        })
        .eq('id', effectiveBrandId);

      if (updateError) throw updateError;

      setSuccess('Brand settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving brand settings:', err);
      setError('Failed to save brand settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Brand Instellingen</h1>
        <p className="text-gray-600">Beheer je brand en domein instellingen</p>
      </div>

      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'general'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Settings size={18} />
              <span>Algemene Instellingen</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domains')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'domains'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Globe size={18} />
              <span>Domein Instellingen</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('intake')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'intake'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText size={18} />
              <span>Intake Formulier</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credits')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'credits'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Wallet size={18} />
              <span>Mijn Credits</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'agents'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users size={18} />
              <span>Mijn Agenten</span>
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'domains' ? (
          <div className="p-6">
            <DomainSettings />
          </div>
        ) : activeTab === 'intake' ? (
          <div className="p-6">
            <WebsiteIntakeForm />
          </div>
        ) : activeTab === 'credits' ? (
          <div className="p-6">
            <CreditWallet />
          </div>
        ) : activeTab === 'agents' ? (
          <AgentManagement />
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">Brand ID</p>
                  <p className="text-sm text-blue-800 font-mono bg-blue-100 px-2 py-1 rounded inline-block">
                    {effectiveBrandId || 'N/A'}
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    Dit ID gebruik je voor externe integraties en API calls
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (URL identifier)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo
              </label>
              <div className="flex items-center space-x-3">
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Logo"
                    className="w-12 h-12 object-contain rounded border border-gray-300"
                  />
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Upload size={16} className="mr-2" />
                    <span className="text-sm text-gray-700">
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Website Informatie</h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Systeem
                </label>
                <select
                  value={formData.website_type}
                  onChange={(e) => handleInputChange('website_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="internal">Option A - AI Websitebuilder</option>
                  <option value="wordpress">Option B - WordPress</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Kies je content management systeem: Gebruik het interne systeem (A) of koppel je WordPress website (B).
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Globe className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Huidig Website Type</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {websiteInfo.hasWebsite ? (
                        <>
                          {websiteInfo.type}
                          {websiteInfo.builderName && (
                            <span className="ml-2 text-blue-600">({websiteInfo.builderName})</span>
                          )}
                        </>
                      ) : (
                        'Geen website geconfigureerd'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.street_address}
                    onChange={(e) => handleInputChange('street_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {formData.website_type === 'wordpress' && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">WordPress Integratie</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Verbind je WordPress site om pagina's automatisch te synchroniseren naar Bolt
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">WordPress Application Password nodig</h4>
                  <p className="text-xs text-yellow-800 mb-2">
                    Je hebt een WordPress Application Password nodig (geen gewoon wachtwoord):
                  </p>
                  <ol className="text-xs text-yellow-800 space-y-1 ml-4 list-decimal">
                    <li>Log in op je WordPress admin</li>
                    <li>Ga naar: Gebruikers → Profiel</li>
                    <li>Scroll naar "Application Passwords"</li>
                    <li>Geef een naam (bijv. "Bolt Integration")</li>
                    <li>Klik "Add New Application Password"</li>
                    <li>Kopieer het gegenereerde wachtwoord hieronder</li>
                  </ol>
                </div>

                {formData.wordpress_connected && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">✓ WordPress verbinding actief</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WordPress URL *
                    </label>
                    <input
                      type="url"
                      value={formData.wordpress_url}
                      onChange={(e) => handleInputChange('wordpress_url', e.target.value)}
                      placeholder="https://jouwwebsite.nl"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required={formData.website_type === 'wordpress'}
                    />
                    <p className="text-xs text-gray-500 mt-1">De volledige URL van je WordPress site</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WordPress Gebruikersnaam *
                    </label>
                    <input
                      type="text"
                      value={formData.wordpress_username}
                      onChange={(e) => handleInputChange('wordpress_username', e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required={formData.website_type === 'wordpress'}
                    />
                    <p className="text-xs text-gray-500 mt-1">Je WordPress admin gebruikersnaam</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Application Password *
                    </label>
                    <input
                      type="password"
                      value={formData.wordpress_app_password}
                      onChange={(e) => handleInputChange('wordpress_app_password', e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                      required={formData.website_type === 'wordpress'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Het WordPress Application Password (inclusief spaties is OK)
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">WordPress Plugin Setup Instructies</h4>
                  <p className="text-xs text-gray-600 mb-4">
                    Kopieer onderstaande setup code en plak deze in je WordPress AI News plugin instellingen
                  </p>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700 mb-1">Supabase Function URL</p>
                        <code className="text-xs text-gray-900 bg-white px-2 py-1 rounded border border-gray-300 block break-all">
                          {import.meta.env.VITE_SUPABASE_URL}/functions/v1/wordpress-news
                        </code>
                      </div>
                    </div>

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700 mb-1">Brand ID</p>
                        <code className="text-xs text-gray-900 bg-white px-2 py-1 rounded border border-gray-300 block break-all">
                          {effectiveBrandId}
                        </code>
                      </div>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700 mb-1">OpenAI API Key</p>
                        <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-300">
                          Vraag aan Bolt support, of gebruik je eigen OpenAI API key
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={copySetupCode}
                    className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {copiedSetup ? (
                      <>
                        <Check size={16} />
                        <span>Gekopieerd!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Kopieer Setup Code</span>
                      </>
                    )}
                  </button>

                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Let op:</strong> Download eerst de WordPress AI News plugin en installeer deze op je WordPress site voordat je de setup code gebruikt.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{ backgroundColor: '#ff7700' }}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
            </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
