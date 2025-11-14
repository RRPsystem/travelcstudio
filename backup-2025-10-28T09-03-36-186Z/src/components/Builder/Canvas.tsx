import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { PageComponent, ComponentType } from '../../types';
import { ComponentRenderer } from './ComponentRenderer';
import { Plus } from 'lucide-react';

export function Canvas() {
  const { currentPage, updatePageComponents, isPreviewMode } = useApp();
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const componentHeight = 100; // Approximate height per component
    const index = Math.floor(y / componentHeight);
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const newComponent: PageComponent = {
        id: Date.now().toString(),
        type: data.type as ComponentType,
        props: getDefaultProps(data.type),
      };

      const components = currentPage?.components || [];
      const insertIndex = dragOverIndex !== null ? dragOverIndex : components.length;
      const newComponents = [
        ...components.slice(0, insertIndex),
        newComponent,
        ...components.slice(insertIndex)
      ];

      updatePageComponents(newComponents);
    } catch (error) {
      console.error('Error adding component:', error);
    }
  };

  const getDefaultProps = (type: ComponentType): Record<string, any> => {
    switch (type) {
      case 'hero':
        return {
          title: 'Discover Amazing Destinations',
          subtitle: 'Explore the world with our curated travel experiences',
          backgroundImage: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600',
          ctaText: 'Explore Now',
          ctaUrl: '#'
        };
      case 'text':
        return {
          content: 'Add your text content here. You can format it using the rich text editor.',
          alignment: 'left'
        };
      case 'image':
        return {
          src: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800',
          alt: 'Beautiful destination',
          caption: 'Caption text'
        };
      case 'gallery':
        return {
          images: [
            { src: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=400', alt: 'Image 1' },
            { src: 'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=400', alt: 'Image 2' },
            { src: 'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=400', alt: 'Image 3' },
          ]
        };
      case 'booking-form':
        return {
          title: 'Book Your Adventure',
          fields: ['destination', 'dates', 'guests', 'contact']
        };
      case 'testimonial':
        return {
          quote: 'This was an absolutely incredible experience! The team made our dream vacation come true.',
          author: 'Sarah Johnson',
          location: 'New York, USA',
          avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100',
          rating: 5
        };
      case 'destination-card':
        return {
          title: 'Bali, Indonesia',
          description: 'Experience the magic of Bali with its stunning beaches, rich culture, and vibrant nightlife.',
          image: 'https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg?auto=compress&cs=tinysrgb&w=400',
          price: 'From $899',
          duration: '7 days'
        };
      default:
        return {};
    }
  };

  const removeComponent = (componentId: string) => {
    if (!currentPage) return;
    const newComponents = currentPage.components.filter(c => c.id !== componentId);
    updatePageComponents(newComponents);
  };

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Page Selected</h2>
          <p className="text-gray-600">Select a page from the sidebar to start building</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div 
        className={`${isPreviewMode ? '' : 'py-8'} min-h-screen relative`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {currentPage.components.length === 0 ? (
          <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-16 text-center">
            <Plus className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Building Your Page</h3>
            <p className="text-gray-600">
              Drag components from the sidebar to add content to your page
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {currentPage.components.map((component, index) => (
              <div key={component.id} className="relative group">
                {dragOverIndex === index && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 z-10"></div>
                )}
                <ComponentRenderer 
                  component={component} 
                  isPreview={isPreviewMode}
                  onRemove={() => removeComponent(component.id)}
                />
              </div>
            ))}
            {dragOverIndex === currentPage.components.length && (
              <div className="h-1 bg-blue-500"></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}