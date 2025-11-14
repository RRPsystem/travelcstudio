import React, { useState } from 'react';
import { 
  Layers, 
  Image, 
  Type, 
  Map, 
  Calendar, 
  Star, 
  Mail, 
  Play,
  Camera,
  Upload,
  Search
} from 'lucide-react';
import { ComponentType, DragItem } from '../../types';

const componentLibrary: DragItem[] = [
  { id: 'hero', type: 'hero', name: 'Hero Section', icon: 'Camera' },
  { id: 'text', type: 'text', name: 'Text Block', icon: 'Type' },
  { id: 'image', type: 'image', name: 'Image', icon: 'Image' },
  { id: 'gallery', type: 'gallery', name: 'Photo Gallery', icon: 'Layers' },
  { id: 'booking-form', type: 'booking-form', name: 'Booking Form', icon: 'Calendar' },
  { id: 'testimonial', type: 'testimonial', name: 'Testimonial', icon: 'Star' },
  { id: 'destination-card', type: 'destination-card', name: 'Destination Card', icon: 'Map' },
  { id: 'tour-package', type: 'tour-package', name: 'Tour Package', icon: 'Calendar' },
  { id: 'contact-form', type: 'contact-form', name: 'Contact Form', icon: 'Mail' },
  { id: 'youtube-video', type: 'youtube-video', name: 'YouTube Video', icon: 'Play' },
  { id: 'map', type: 'map', name: 'Map', icon: 'Map' },
];

const iconComponents = {
  Camera,
  Type,
  Image,
  Layers,
  Calendar,
  Star,
  Map,
  Mail,
  Play
};

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<'components' | 'media' | 'pages'>('components');

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('components')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'components'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Components
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'media'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Media
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'pages'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pages
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'components' && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Travel Components</h3>
            <div className="grid grid-cols-2 gap-3">
              {componentLibrary.map((item) => {
                const IconComponent = iconComponents[item.icon as keyof typeof iconComponents];
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="p-3 border border-gray-200 rounded-lg cursor-move hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <IconComponent size={16} className="text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{item.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Upload Media</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Drop files here or click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF up to 10MB</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Unsplash Photos</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search travel photos..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">YouTube Videos</h3>
                <input
                  type="text"
                  placeholder="Paste YouTube URL..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Site Pages</h3>
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Home</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Current</span>
                </div>
                <div className="text-xs text-blue-600 mt-1">/</div>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="text-sm font-medium text-gray-900">About</div>
                <div className="text-xs text-gray-500 mt-1">/about</div>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="text-sm font-medium text-gray-900">Tours</div>
                <div className="text-xs text-gray-500 mt-1">/tours</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}