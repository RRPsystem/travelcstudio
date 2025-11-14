import React, { useState, useEffect } from 'react';
import { Grid3x3, Wrench, Search, Plus, Eye } from 'lucide-react';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../../lib/jwtHelper';
import { useAuth } from '../../../contexts/AuthContext';

const templateCategories = [
  { id: 'all', label: 'All Templates', count: 1 },
  { id: 'landing', label: 'Landing Pages', count: 1 },
  { id: 'about', label: 'About Pages', count: 0 },
  { id: 'contact', label: 'Contact Pages', count: 0 },
  { id: 'services', label: 'Services', count: 0 },
  { id: 'galleries', label: 'Galleries', count: 0 },
  { id: 'blog', label: 'Blog Pages', count: 0 },
];

const templates = [
  {
    id: 1,
    name: 'Home 1',
    category: 'landing',
    description: 'Professionele travel homepage geïnspireerd door Gowilds design met hero slider, bestemmingen showcase en tour highlights',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
    tags: ['gowilds', 'hero-slider', 'tours', '+2'],
    isPopular: true
  }
];

interface Props {
  brandId?: string;
  onPageCreated?: () => void;
}

export function NewPage({ brandId: propBrandId, onPageCreated }: Props = {}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [initialPageCount, setInitialPageCount] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!propBrandId) return;

    const loadPageCount = async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pages-api?brand_id=${propBrandId}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const count = data.items?.length || 0;

          if (initialPageCount === null) {
            setInitialPageCount(count);
          } else if (count > initialPageCount && onPageCreated) {
            onPageCreated();
          }
        }
      } catch (error) {
        console.error('Error loading page count:', error);
      }
    };

    loadPageCount();
    const interval = setInterval(loadPageCount, 3000);

    return () => clearInterval(interval);
  }, [propBrandId, initialPageCount, onPageCreated]);

  const handleOpenPageBuilder = async () => {
    if (!user || !propBrandId) return;

    const token = await generateBuilderJWT(propBrandId, user.id);
    const deeplink = generateBuilderDeeplink(propBrandId, token);

    window.open(deeplink, '_blank');
  };

  const handleUseTemplate = async (templateId: number) => {
    if (!user || !propBrandId) return;

    const token = await generateBuilderJWT(propBrandId, user.id);
    const deeplink = generateBuilderDeeplink(propBrandId, token, {
      templateId: templateId.toString()
    });

    window.open(deeplink, '_blank');
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nieuwe Pagina Maken</h1>
          <p className="text-gray-600">Kies een kant-en-klare template of bouw zelf een pagina met de pagebuilder</p>
        </div>

        {/* Two main options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Pagebuilder Option */}
          <div className="bg-white rounded-lg border-2 border-dashed border-transparent hover:border-orange-400 p-8 text-center transition-colors cursor-pointer">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-orange-100 flex items-center justify-center">
              <Grid3x3 className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pagebuilder</h3>
            <p className="text-gray-600 mb-6">Bouw je pagina helemaal zelf met drag-and-drop blokken</p>
            <button
              onClick={handleOpenPageBuilder}
              className="inline-flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
              style={{ backgroundColor: '#ff7700' }}
            >
              <Wrench size={18} />
              <span>Start met Bouwen</span>
            </button>
          </div>

          {/* Templates Option */}
          <div className="bg-white rounded-lg border-2 border-dashed border-transparent hover:border-blue-400 p-8 text-center transition-colors cursor-pointer">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-blue-100 flex items-center justify-center">
              <Grid3x3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Kant-en-klare Templates</h3>
            <p className="text-gray-600 mb-6">Kies uit professionele templates en pas ze aan naar jouw wensen</p>
            <button className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium transition-colors hover:bg-blue-50">
              <span>Bekijk Templates Hieronder</span>
            </button>
          </div>
        </div>

        {/* Template Gallery */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Template Gallery</h2>
              <p className="text-gray-600">Choose from our collection of professional travel website templates</p>
            </div>
            <button className="inline-flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Plus size={18} />
              <span>Create Template</span>
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search templates by name, description, or tags..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-4 mb-8 pb-6 border-b border-gray-200">
            {templateCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label} <span className="ml-1 text-gray-500">{category.count}</span>
              </button>
            ))}
          </div>

          {/* Popular Templates Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-yellow-500 mr-2">⭐</span>
              Popular Templates
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {template.isPopular && (
                      <div className="absolute top-3 left-3 bg-orange-600 text-white text-xs font-semibold px-3 py-1 rounded flex items-center space-x-1">
                        <span>⭐</span>
                        <span>Popular</span>
                      </div>
                    )}
                    <div className="bg-gray-900 h-48">
                      <div className="grid grid-cols-4 grid-rows-2 h-full p-2 gap-1">
                        {[1,2,3,4,5,6,7,8].map((i) => (
                          <div key={i} className="bg-gray-700 rounded"></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        landing
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{template.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUseTemplate(template.id)}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>↓</span>
                        <span>Use Template</span>
                      </button>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Eye size={18} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
