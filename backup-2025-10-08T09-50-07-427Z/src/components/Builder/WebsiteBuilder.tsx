import React, { useState } from 'react';
import { 
  ArrowLeft,
  Grid3X3,
  Eye,
  Plus
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  image: string;
  popular?: boolean;
}

const templates: Template[] = [
  {
    id: 'home-1',
    name: 'Home 1',
    description: 'Professionele travel homepage geïnspireerd door Gowilds design met hero slider, bestemmingen showcase en tour highlights',
    category: 'landing',
    tags: ['gowilds', 'hero-slider', 'tours'],
    image: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=300',
    popular: true
  }
];

const categories = [
  { id: 'all', name: 'All Templates', count: 1 },
  { id: 'landing', name: 'Landing Pages', count: 1 },
  { id: 'about', name: 'About Pages', count: 0 },
  { id: 'contact', name: 'Contact Pages', count: 0 },
  { id: 'services', name: 'Services', count: 0 },
  { id: 'galleries', name: 'Galleries', count: 0 },
  { id: 'blog', name: 'Blog Pages', count: 0 }
];

export function WebsiteBuilder() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Nieuwe Pagina Maken</h1>
            <p className="text-sm text-gray-600">Kies een kant-en-klare template of bouw zelf een pagina met de pagebuilder</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Builder Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border-2 border-dashed border-orange-300 p-8 text-center hover:border-orange-400 transition-colors">
            <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Grid3X3 className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagebuilder</h3>
            <p className="text-gray-600 mb-4">Bouw je pagina helemaal zelf met drag-and-drop blokken</p>
            <button className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 mx-auto">
              <Plus size={16} />
              <span>Start met Bouwen</span>
            </button>
          </div>

          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kant-en-klare Templates</h3>
            <p className="text-gray-600 mb-4">Kies uit professionele templates en pas ze aan naar jouw wensen</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Bekijk Templates Hieronder
            </button>
          </div>
        </div>

        {/* Template Selection */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kies een Template</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Template Gallery</h3>
            <p className="text-gray-600 mb-4">Choose from our collection of professional travel website templates</p>
            
            <div className="flex items-center justify-between mb-4">
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
                <Plus size={16} />
                <span>Create Template</span>
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search templates by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name} {category.count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Popular Templates */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-yellow-500">⭐</span>
            <h3 className="text-lg font-semibold text-gray-900">Popular Templates</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                {template.popular && (
                  <div className="bg-orange-600 text-white text-xs px-2 py-1 absolute z-10 m-2 rounded">
                    Popular
                  </div>
                )}
                
                <div className="relative">
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-square bg-gray-200 rounded">
                        <img 
                          src={template.image} 
                          alt={`Template preview ${i}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {template.category}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <button className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center space-x-1">
                      <span>⬇</span>
                      <span>Use Template</span>
                    </button>
                    <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}