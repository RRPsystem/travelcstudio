import React, { useState } from 'react';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { db } from '../../lib/supabase';

interface BrandFormProps {
  onBack: () => void;
  onSuccess: () => void;
  editingBrand?: any;
}

export function BrandForm({ onBack, onSuccess, editingBrand }: BrandFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    business_type: 'custom_travel_agency',
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
    logo_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const isEditing = !!editingBrand;

  // Load editing data when component mounts
  React.useEffect(() => {
    if (editingBrand) {
      setFormData({
        name: editingBrand.name || '',
        slug: editingBrand.slug || '',
        description: editingBrand.description || '',
        business_type: editingBrand.business_type || 'custom_travel_agency',
        primary_color: editingBrand.primary_color || '#3B82F6',
        secondary_color: editingBrand.secondary_color || '#6B7280',
        contact_person: editingBrand.contact_person || '',
        contact_email: editingBrand.contact_email || '',
        contact_phone: editingBrand.contact_phone || '',
        street_address: editingBrand.street_address || '',
        city: editingBrand.city || '',
        postal_code: editingBrand.postal_code || '',
        country: editingBrand.country || 'Netherlands',
        website_url: editingBrand.website_url || '',
        logo_url: editingBrand.logo_url || ''
      });
    }
  }, [editingBrand]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from name
      ...(field === 'name' && {
        slug: value.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
      })
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    setError('');

    try {
      // Convert file to base64 for demo purposes
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, logo_url: result }));
        setUploadingLogo(false);
      };
      reader.onerror = () => {
        setError('Error reading file');
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error uploading logo');
      setUploadingLogo(false);
    }
  };

  const handleLogoUrlInput = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await db.updateBrand(editingBrand.id, formData);
      } else {
        const companies = await db.getCompanies();
        const defaultCompanyId = companies?.[0]?.id || '550e8400-e29b-41d4-a716-446655440100';

        const brandData = {
          ...formData,
          company_id: defaultCompanyId
        };

        await db.createBrand(brandData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || `Er is een fout opgetreden bij het ${isEditing ? 'bijwerken' : 'aanmaken'} van de brand`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Brand Bewerken' : 'Nieuwe Brand Aanmaken'}
            </h1>
            <p className="text-sm text-gray-600">
              {isEditing 
                ? 'Wijzig de gegevens van de travel agency brand' 
                : 'Vul de basisgegevens in voor de nieuwe travel agency brand'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Brand Informatie */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Brand Informatie</h2>
              <p className="text-sm text-gray-600">Configureer de basis instellingen voor de nieuwe travel agency</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Bijv. Reisbureau Del Monde"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="del-monde"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Brand Logo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Logo</label>
              <div className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
                {formData.logo_url ? (
                  <div className="relative inline-block">
                    <img src={formData.logo_url} alt="Logo" className="max-w-32 max-h-32 mx-auto" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                        <p className="text-gray-600">Logo uploaden...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-2">Sleep een bestand hierheen of klik om te uploaden</p>
                      </>
                    )}
                    <p className="text-xs text-gray-500">PNG, JPG, SVG tot 2MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={uploadingLogo}
                    />
                    <label
                      htmlFor="logo-upload"
                      className="mt-4 inline-block bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
                    >
                      Bestand Kiezen
                    </label>
                  </div>
                )}
                </div>
                
                {/* URL Input Alternative */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Of voer een logo URL in:</p>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url.startsWith('data:') ? '' : formData.logo_url}
                    onChange={(e) => handleLogoUrlInput(e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Business Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Business Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="business_type"
                    value="custom_travel_agency"
                    checked={formData.business_type === 'custom_travel_agency'}
                    onChange={(e) => handleInputChange('business_type', e.target.value)}
                    className="mr-3"
                  />
                  <span>Custom Travel Agency</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="business_type"
                    value="franchise"
                    checked={formData.business_type === 'franchise'}
                    onChange={(e) => handleInputChange('business_type', e.target.value)}
                    className="mr-3"
                  />
                  <span>Franchise</span>
                </label>
              </div>
            </div>

            {/* Beschrijving */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Korte beschrijving van de travel agency..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded border border-gray-300"
                    style={{ backgroundColor: formData.primary_color }}
                  ></div>
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded border border-gray-300"
                    style={{ backgroundColor: formData.secondary_color }}
                  ></div>
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      placeholder="#6B7280"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Informatie */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact Informatie</h2>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Persoon</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  placeholder="Jan van der Berg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="info@brand.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Telefoon</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="+31 20 123 4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Adres Gegevens */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Adres Gegevens</h2>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Straat + Huisnummer</label>
                <input
                  type="text"
                  value={formData.street_address}
                  onChange={(e) => handleInputChange('street_address', e.target.value)}
                  placeholder="Hoofdstraat 123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stad</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Amsterdam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder="1234 AB"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="Netherlands">Netherlands</option>
                  <option value="Belgium">Belgium</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Bezig...' : (isEditing ? 'Brand Bijwerken' : 'Brand Aanmaken')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}