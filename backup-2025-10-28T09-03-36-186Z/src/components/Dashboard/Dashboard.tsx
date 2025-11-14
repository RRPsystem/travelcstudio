import React, { useState } from 'react';
import { Plus, Globe, Settings, BarChart3, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Site, Page } from '../../types';

export function Dashboard() {
  const { sites, setSites, setCurrentSite, setCurrentPage } = useApp();
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');

  const createSite = () => {
    if (!newSiteName.trim()) return;

    const newSite: Site = {
      id: Date.now().toString(),
      name: newSiteName,
      domain: `${newSiteName.toLowerCase().replace(/\s+/g, '-')}.travelbuilder.com`,
      userId: '1',
      template: 'travel-basic',
      pages: [{
        id: '1',
        name: 'Home',
        path: '/',
        siteId: Date.now().toString(),
        components: [],
        isPublished: false
      }],
      settings: {
        title: newSiteName,
        description: 'A beautiful travel website',
        primaryColor: '#0EA5E9',
        secondaryColor: '#F97316',
        font: 'Inter'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSites([...sites, newSite]);
    setNewSiteName('');
    setShowNewSiteModal(false);
  };

  const openSite = (site: Site) => {
    setCurrentSite(site);
    setCurrentPage(site.pages[0] || null);
  };

  return (
    <div className="flex-1 bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Travel Websites</h1>
            <p className="text-gray-600 mt-2">Build and manage beautiful travel websites</p>
          </div>
          <button 
            onClick={() => setShowNewSiteModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus size={20} />
            <span>New Website</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <div key={site.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-500 to-orange-500"></div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{site.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{site.domain}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{site.pages.length} pages</span>
                  <span>Updated {new Date(site.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => openSite(site)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                    <Globe size={16} />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                    <BarChart3 size={16} />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-white rounded-lg shadow-md border-2 border-dashed border-gray-300 flex items-center justify-center min-h-64 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => setShowNewSiteModal(true)}>
            <div className="text-center">
              <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Create New Website</h3>
              <p className="text-gray-500">Start building your travel website</p>
            </div>
          </div>
        </div>

        {showNewSiteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Website</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Website Name</label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="My Travel Agency"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewSiteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createSite}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}