import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Save, X, RefreshCw, Search, AlertCircle, CheckCircle } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  website_type: string | null;
  domain?: string;
  slug?: string;
  created_at: string;
}

export function BrandManagement() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [editedWebsiteType, setEditedWebsiteType] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, website_type, domain, slug, created_at')
        .order('name');

      if (error) throw error;

      setBrands(data || []);
    } catch (error: any) {
      console.error('Error loading brands:', error);
      setMessage({ type: 'error', text: 'Fout bij laden brands: ' + error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWebsiteType(brandId: string) {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('brands')
        .update({ website_type: editedWebsiteType || null })
        .eq('id', brandId);

      if (error) throw error;

      setBrands(brands.map(b =>
        b.id === brandId ? { ...b, website_type: editedWebsiteType || null } : b
      ));

      setMessage({ type: 'success', text: 'Website type opgeslagen!' });
      setEditingBrand(null);

      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving website type:', error);
      setMessage({ type: 'error', text: 'Fout bij opslaan: ' + error.message });
    } finally {
      setSaving(false);
    }
  }

  function startEditing(brand: Brand) {
    setEditingBrand(brand.id);
    setEditedWebsiteType(brand.website_type || '');
  }

  function cancelEditing() {
    setEditingBrand(null);
    setEditedWebsiteType('');
  }

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.slug?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (brand.domain?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (brand.website_type?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const websiteTypeOptions = [
    { value: '', label: 'Geen type ingesteld' },
    { value: 'travel_agency', label: 'Reisbureau (Travel Agency)' },
    { value: 'destination_marketing', label: 'Destination Marketing' },
    { value: 'tour_operator', label: 'Tour Operator' },
    { value: 'hotel_chain', label: 'Hotel Chain' },
    { value: 'travel_blog', label: 'Travel Blog' },
    { value: 'activity_provider', label: 'Activity Provider' },
    { value: 'transport_company', label: 'Transport Company' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={loadBrands}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Ververs</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek op naam, slug, domain of website type..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Brands laden...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Geen brands gevonden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Website Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aangemaakt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <Building2 className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{brand.slug || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{brand.domain || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {editingBrand === brand.id ? (
                        <select
                          value={editedWebsiteType}
                          onChange={(e) => setEditedWebsiteType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        >
                          {websiteTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm">
                          {brand.website_type ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {websiteTypeOptions.find(opt => opt.value === brand.website_type)?.label || brand.website_type}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Niet ingesteld</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(brand.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {editingBrand === brand.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleSaveWebsiteType(brand.id)}
                            disabled={saving}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Opslaan
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={saving}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Annuleer
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(brand)}
                          className="inline-flex items-center px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm"
                        >
                          Bewerk
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Website Types</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Travel Agency:</strong> Traditioneel reisbureau met reisadvies en boekingsservice</p>
          <p><strong>Destination Marketing:</strong> Marketing organisatie voor een specifieke bestemming</p>
          <p><strong>Tour Operator:</strong> Organiseert en verkoopt reispakketten</p>
          <p><strong>Hotel Chain:</strong> Hotelketen of accommodatie aanbieder</p>
          <p><strong>Travel Blog:</strong> Content-gedreven reisblog of magazine</p>
          <p><strong>Activity Provider:</strong> Aanbieder van activiteiten en excursies</p>
          <p><strong>Transport Company:</strong> Vervoerder (vliegtuig, trein, bus, ferry)</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Totaal {filteredBrands.length} van {brands.length} brands
        </div>
        <div>
          {brands.filter(b => b.website_type).length} brands hebben een website type ingesteld
        </div>
      </div>
    </div>
  );
}
