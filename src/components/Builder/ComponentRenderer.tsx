import React, { useState, useEffect } from 'react';
import { PageComponent } from '../../types';
import { Trash2, Settings, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';

interface ComponentRendererProps {
  component: PageComponent;
  isPreview?: boolean;
  onRemove: () => void;
}

export function ComponentRenderer({ component, isPreview = false, onRemove }: ComponentRendererProps) {
  const renderComponent = () => {
    switch (component.type) {
      case 'hero':
        return (
          <div 
            className="relative h-96 bg-cover bg-center flex items-center justify-center text-white w-full"
            style={{ backgroundImage: `url(${component.props.backgroundImage})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            <div className="relative text-center z-10">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">{component.props.title}</h1>
              <p className="text-xl mb-8 max-w-2xl">{component.props.subtitle}</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors">
                {component.props.ctaText}
              </button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="p-8 max-w-4xl mx-auto bg-white">
            <div
              className={`text-gray-900 leading-relaxed text-${component.props.alignment || 'left'}`}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(component.props.content) }}
            />
          </div>
        );

      case 'image':
        return (
          <div className="p-8 max-w-4xl mx-auto bg-white">
            <div className="text-center">
              <img 
                src={component.props.src} 
                alt={component.props.alt}
                className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
              />
              {component.props.caption && (
                <p className="text-sm text-gray-600 mt-3">{component.props.caption}</p>
              )}
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="p-8 max-w-4xl mx-auto bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {component.props.images.map((img: any, index: number) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg">
                  <img 
                    src={img.src} 
                    alt={img.alt}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'booking-form':
        return (
          <div className="p-8 bg-gray-50 max-w-4xl mx-auto">
            <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                {component.props.title}
              </h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Select destination</option>
                    <option>Bali, Indonesia</option>
                    <option>Paris, France</option>
                    <option>Tokyo, Japan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>1 Guest</option>
                    <option>2 Guests</option>
                    <option>3 Guests</option>
                    <option>4+ Guests</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium transition-colors">
                  Book Now
                </button>
              </form>
            </div>
          </div>
        );

      case 'testimonial':
        return (
          <div className="p-8 max-w-4xl mx-auto bg-white">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex justify-center mb-4">
                {[...Array(component.props.rating || 5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <blockquote className="text-xl text-gray-900 mb-6 italic">
                "{component.props.quote}"
              </blockquote>
              <div className="flex items-center justify-center space-x-3">
                <img 
                  src={component.props.avatar} 
                  alt={component.props.author}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="font-medium text-gray-900">{component.props.author}</div>
                  <div className="text-sm text-gray-600">{component.props.location}</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'destination-card':
        return (
          <div className="p-8 max-w-4xl mx-auto bg-white">
            <div className="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
              <img
                src={component.props.image}
                alt={component.props.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{component.props.title}</h3>
                <p className="text-gray-600 mb-4">{component.props.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-600">{component.props.price}</span>
                  <span className="text-sm text-gray-500">{component.props.duration}</span>
                </div>
                <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>
        );

      case 'news-overview':
        return <NewsOverviewComponent component={component} isPreview={isPreview} />;

      default:
        return (
          <div className="p-8 max-w-4xl mx-auto bg-white">
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
              <p className="text-gray-600">Component type "{component.type}" not implemented</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`relative ${isPreview ? '' : 'group'}`}>
      {!isPreview && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-md shadow-md flex">
          <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
            <Settings size={16} />
          </button>
          <button
            onClick={onRemove}
            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      {renderComponent()}
    </div>
  );
}

function NewsOverviewComponent({ component, isPreview }: { component: PageComponent; isPreview: boolean }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Alle');
  const [brandId, setBrandId] = useState<string | null>(null);

  useEffect(() => {
    const getBrandIdFromUrl = () => {
      const hash = window.location.hash;
      const match = hash.match(/brand_id=([^&]+)/);
      return match ? match[1] : null;
    };

    const id = getBrandIdFromUrl();
    setBrandId(id);
  }, []);

  useEffect(() => {
    if (!brandId) return;

    const fetchArticles = async () => {
      try {
        setLoading(true);
        const maxArticles = component.props.maxArticles || 6;

        const { data, error } = await supabase
          .from('news_items')
          .select('*, news_brand_assignments!inner(*)')
          .eq('status', 'published')
          .eq('news_brand_assignments.brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(maxArticles);

        if (error) throw error;
        setArticles(data || []);
      } catch (error) {
        console.error('Error fetching news articles:', error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [brandId, component.props.maxArticles]);

  const filters = component.props.filters || ['Alle'];
  const badge = component.props.badge || 'Nieuws';
  const title = component.props.title || 'Blijf op de hoogte';
  const showFilters = component.props.showFilters !== false;

  const filteredArticles = activeFilter === 'Alle'
    ? articles
    : articles.filter(article => {
        const tags = article.tags || [];
        return tags.includes(activeFilter);
      });

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-white">
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium mb-4">
          {badge}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>
      </div>

      {showFilters && filters.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {filteredArticles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Geen nieuwsartikelen gevonden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => {
            const imageUrl = article.featured_image || 'https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg';
            const excerpt = article.excerpt || article.content?.substring(0, 150) || '';

            return (
              <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <img
                  src={imageUrl}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {article.tags && article.tags.length > 0 && (
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-medium">
                        {article.tags[0]}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {new Date(article.created_at).toLocaleDateString('nl-NL')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {excerpt}
                  </p>
                  <a
                    href={`#/nieuws/${article.slug}`}
                    className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    Lees verder
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}