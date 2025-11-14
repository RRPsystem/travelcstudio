import React from 'react';
import { User, Settings, Eye, EyeOff, Save } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function Header() {
  const { user, currentSite, isPreviewMode, setPreviewMode } = useApp();

  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-gray-900">Travel Builder</h1>
        {currentSite && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>/</span>
            <span className="font-medium">{currentSite.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {currentSite && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(!isPreviewMode)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isPreviewMode
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              <Save size={16} />
              <span>Save</span>
            </button>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
          
          <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
              ) : (
                <User size={16} className="text-white" />
              )}
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-900">{user?.name}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}