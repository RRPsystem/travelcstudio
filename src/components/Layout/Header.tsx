import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Eye, EyeOff, Save, ChevronDown, Building2, UserCircle, Shield, Wrench } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { user, currentSite, isPreviewMode, setPreviewMode } = useApp();
  const {
    isOperator,
    impersonationContext,
    availableContexts,
    switchContext,
    resetContext
  } = useAuth();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getContextIcon = (type: string) => {
    switch (type) {
      case 'operator': return <Wrench size={16} />;
      case 'admin': return <Shield size={16} />;
      case 'brand': return <Building2 size={16} />;
      case 'agent': return <UserCircle size={16} />;
      default: return <User size={16} />;
    }
  };

  const getCurrentContextDisplay = () => {
    if (!impersonationContext) {
      return user?.email || 'User';
    }

    switch (impersonationContext.role) {
      case 'operator':
        return '⚙️ Operator View';
      case 'admin':
        return '🛡️ Admin View';
      case 'brand':
        return `🏢 ${impersonationContext.brandName}`;
      case 'agent':
        return `👤 ${impersonationContext.agentName}`;
      default:
        return user?.email || 'User';
    }
  };

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

          <div className="relative pl-3 border-l border-gray-200" ref={menuRef}>
            {user?.role === 'operator' ? (
              <button
                onClick={() => setShowContextMenu(!showContextMenu)}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.email} className="w-8 h-8 rounded-full" />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
                <div className="text-sm text-left">
                  <div className="font-medium text-gray-900">{getCurrentContextDisplay()}</div>
                  {impersonationContext && (
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  )}
                </div>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
            ) : (
              <div className="flex items-center space-x-3 px-3 py-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.email} className="w-8 h-8 rounded-full" />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{user?.email}</div>
                </div>
              </div>
            )}

            {showContextMenu && user?.role === 'operator' && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Switch Context</div>
                </div>

                {impersonationContext && (
                  <div className="px-2 py-2 border-b border-gray-200">
                    <button
                      onClick={() => {
                        resetContext();
                        setShowContextMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors border border-orange-200"
                    >
                      <Wrench size={18} />
                      <span className="text-sm font-semibold">← Terug naar Operator</span>
                    </button>
                  </div>
                )}

                {availableContexts.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                ) : (
                  <>
                    <div className="px-2 py-1">
                      <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">System</div>
                      {availableContexts.filter(ctx => ctx.type === 'operator' || ctx.type === 'admin').map((ctx) => (
                        <button
                          key={ctx.type}
                          onClick={() => {
                            if (ctx.type === 'operator') {
                              resetContext();
                            } else {
                              switchContext({ role: ctx.type as any });
                            }
                            setShowContextMenu(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                            (ctx.type === 'operator' && !impersonationContext) || impersonationContext?.role === ctx.type ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {getContextIcon(ctx.type)}
                          <span className="text-sm font-medium">{ctx.name}</span>
                        </button>
                      ))}
                    </div>

                    {availableContexts.filter(ctx => ctx.type === 'brand').length > 0 && (
                      <div className="px-2 py-1 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Brands</div>
                        {availableContexts.filter(ctx => ctx.type === 'brand').map((ctx) => (
                          <button
                            key={ctx.id}
                            onClick={() => {
                              switchContext({
                                role: 'brand',
                                brandId: ctx.brandId,
                                brandName: ctx.name
                              });
                              setShowContextMenu(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                              impersonationContext?.brandId === ctx.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            {getContextIcon(ctx.type)}
                            <span className="text-sm">{ctx.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {availableContexts.filter(ctx => ctx.type === 'agent').length > 0 && (
                      <div className="px-2 py-1 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Agents</div>
                        {availableContexts.filter(ctx => ctx.type === 'agent').map((ctx) => (
                          <button
                            key={ctx.id}
                            onClick={() => {
                              switchContext({
                                role: 'agent',
                                agentId: ctx.id,
                                agentName: ctx.name,
                                brandId: ctx.brandId
                              });
                              setShowContextMenu(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                              impersonationContext?.agentId === ctx.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            {getContextIcon(ctx.type)}
                            <span className="text-sm">{ctx.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}