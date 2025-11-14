import React from 'react';
import { LayoutGrid as Layout } from 'lucide-react';

export function FooterBuilder() {
  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff7700, #ffaa44)' }}>
          <Layout className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Footer Builder</h2>
        <p className="text-gray-600 mb-6">Ontwerp en beheer je website footer</p>
        <button className="text-white px-6 py-3 rounded-lg font-medium transition-colors hover:bg-orange-700" style={{ backgroundColor: '#ff7700' }}>
          Binnenkort Beschikbaar
        </button>
      </div>
    </div>
  );
}
