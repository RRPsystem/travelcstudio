import React from 'react';
import { PageComponent } from '../../types';
import { Trash2, Settings } from 'lucide-react';

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
              dangerouslySetInnerHTML={{ __html: component.props.content }}
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