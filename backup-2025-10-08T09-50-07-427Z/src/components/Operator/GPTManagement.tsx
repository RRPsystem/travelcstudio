import React, { useState } from 'react';
import { Plus, CreditCard as Edit, Trash2, Save, X, Bot, Settings, Copy, Eye, EyeOff, RefreshCw, Download, Upload } from 'lucide-react';
import { db, supabase } from '../../lib/supabase';
import { SupabaseSetup } from '../Setup/SupabaseSetup';

interface GPTModel {
  id: string;
  name: string;
  description: string;
  contentType: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  isActive: boolean;
  usageCount: number;
  lastUsed: string;
}

export function GPTManagement() {
  const [gptModels, setGptModels] = useState<GPTModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGPT, setEditingGPT] = useState<GPTModel | null>(null);
  const [showPrompt, setShowPrompt] = useState<string | null>(null);
  const [showSupabaseSetup, setShowSupabaseSetup] = useState(false);

  // Load GPT models from Supabase
  React.useEffect(() => {
    loadGPTModels();
  }, []);

  const loadGPTModels = async () => {
    setLoading(true);
    setError('');
    console.log('🔄 Loading GPT models...');
    console.log('📡 Supabase available:', !!supabase);

    try {
      const data = await db.getGPTModels();
      console.log('✅ GPT models loaded from Supabase:', data?.length || 0);
      console.log('📊 First GPT data:', data?.[0]);
      console.log('🔍 isActive values:', data?.map(g => ({ name: g.name, isActive: g.isActive, is_active: g.is_active })));
      setGptModels(data || []);
    } catch (err: any) {
      console.error('Error loading GPT models:', err);
      setError(err.message || 'Failed to load GPT models');
      // Fallback to localStorage for development
      console.log('⚠️ Falling back to localStorage...');
      const savedGPTs = localStorage.getItem('gpt-models');
      if (savedGPTs) {
        try {
          const parsedGPTs = JSON.parse(savedGPTs);
          if (Array.isArray(parsedGPTs)) {
            setGptModels(parsedGPTs);
            console.log('✅ GPT models loaded from localStorage:', parsedGPTs.length);
          }
        } catch (parseError) {
          console.error('Error parsing localStorage GPTs:', parseError);
        }
      } else {
        console.log('📝 No GPTs found in localStorage, starting fresh');
      }
    } finally {
      setLoading(false);
    }
  };

  const contentTypes = [
    { id: 'destination', label: 'Bestemmings tekst' },
    { id: 'route', label: 'Routebeschrijving' },
    { id: 'planning', label: 'Dagplanning' },
    { id: 'hotel', label: 'Hotel zoeker' },
    { id: 'image', label: 'Afbeelding maker' }
  ];

  const writingStyles = [
    { id: 'business', label: 'Zakelijk' },
    { id: 'speels', label: 'Speels' },
    { id: 'enthusiast', label: 'Enthusiast' },
    { id: 'beknopt', label: 'Beknopt' },
    { id: 'luxe', label: 'Luxe' },
    { id: 'budget', label: 'Budget' }
  ];

  const routeTypes = [
    { id: 'snelle-route', label: 'Snelle Route' },
    { id: 'toeristische-route', label: 'Toeristische Route' },
    { id: 'binnendoor-weggetjes', label: 'Binnendoor Weggetjes' },
    { id: 'gemengd', label: 'Gemengd' }
  ];

  const vacationTypes = [
    { id: 'cultuur', label: 'Cultuur' },
    { id: 'avontuur', label: 'Avontuur' },
    { id: 'ontspanning', label: 'Ontspanning' },
    { id: 'familie', label: 'Familie' },
    { id: 'romantisch', label: 'Romantisch' },
    { id: 'budget', label: 'Budget' },
    { id: 'luxe', label: 'Luxe' }
  ];

  const models = [
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', cost: '$0.002/1K tokens' },
    { id: 'gpt-4', label: 'GPT-4', cost: '$0.03/1K tokens' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: '$0.01/1K tokens' }
  ];

  const handleEditGPT = (gpt: GPTModel) => {
    setEditingGPT({ ...gpt });
    setShowEditModal(true);
  };

  const handleSaveGPT = () => {
    if (!editingGPT) return;

    const saveGPT = async () => {
      try {
        const isNewGPT = !gptModels.find(gpt => gpt.id === editingGPT.id);
        
        // Try Supabase first, fallback to localStorage
        try {
          if (isNewGPT) {
            // Create new GPT
            const newGPT = await db.createGPTModel({
              name: editingGPT.name,
              description: editingGPT.description,
              content_type: editingGPT.contentType,
              system_prompt: editingGPT.systemPrompt,
              temperature: editingGPT.temperature,
              max_tokens: editingGPT.maxTokens,
              model: editingGPT.model,
              is_active: editingGPT.isActive
            });
            setGptModels(prev => [newGPT, ...prev]);
            console.log('✅ GPT created in Supabase');
          } else {
            // Update existing GPT
            const updatedGPT = await db.updateGPTModel(editingGPT.id, {
              name: editingGPT.name,
              description: editingGPT.description,
              content_type: editingGPT.contentType,
              system_prompt: editingGPT.systemPrompt,
              temperature: editingGPT.temperature,
              max_tokens: editingGPT.maxTokens,
              model: editingGPT.model,
              is_active: editingGPT.isActive
            });
            setGptModels(prev => prev.map(gpt => 
              gpt.id === editingGPT.id ? updatedGPT : gpt
            ));
            console.log('✅ GPT updated in Supabase');
          }
        } catch (supabaseError) {
          console.log('⚠️ Supabase not available, using localStorage fallback');
          // Fallback to localStorage
          let updatedGPTs;
          if (isNewGPT) {
            updatedGPTs = [editingGPT, ...gptModels];
            setGptModels(updatedGPTs);
          } else {
            updatedGPTs = gptModels.map(gpt => 
              gpt.id === editingGPT.id ? editingGPT : gpt
            );
            setGptModels(updatedGPTs);
          }
          localStorage.setItem('gpt-models', JSON.stringify(updatedGPTs));
          console.log('✅ GPT saved to localStorage');
        }
        
        setShowEditModal(false);
        setEditingGPT(null);
      } catch (err: any) {
        console.error('Error saving GPT:', err);
        alert(`Error saving GPT: ${err.message || 'Unknown error'}`);
      }
    };

    saveGPT();
  };

  const handleDeleteGPT = (id: string) => {
    if (window.confirm('Are you sure you want to delete this GPT model?')) {
      const deleteGPT = async () => {
        try {
          // Try Supabase first, fallback to localStorage
          try {
            await db.deleteGPTModel(id);
            setGptModels(prev => prev.filter(gpt => gpt.id !== id));
            console.log('✅ GPT deleted from Supabase');
          } catch (supabaseError) {
            console.log('⚠️ Supabase not available, using localStorage fallback');
            // Fallback to localStorage
            const updatedGPTs = gptModels.filter(gpt => gpt.id !== id);
            setGptModels(updatedGPTs);
            localStorage.setItem('gpt-models', JSON.stringify(updatedGPTs));
            console.log('✅ GPT deleted from localStorage');
          }
        } catch (err: any) {
          console.error('Error deleting GPT:', err);
          alert(`Error deleting GPT: ${err.message || 'Unknown error'}`);
        }
      };
      deleteGPT();
    }
  };

  const handleToggleActive = (id: string) => {
    const toggleActive = async () => {
      const gpt = gptModels.find(g => g.id === id);
      if (!gpt) return;

      console.log('🔄 Toggling GPT:', { id, currentIsActive: gpt.isActive, newIsActive: !gpt.isActive });

      try {
        // Try Supabase first, fallback to localStorage
        try {
          const updatedGPT = await db.updateGPTModel(id, { is_active: !gpt.isActive });
          console.log('📥 Updated GPT from database:', updatedGPT);
          console.log('🔍 Updated isActive:', updatedGPT.isActive);
          setGptModels(prev => prev.map(g =>
            g.id === id ? updatedGPT : g
          ));
          console.log('✅ GPT status updated in Supabase');
        } catch (supabaseError) {
          console.log('⚠️ Supabase not available, using localStorage fallback');
          // Fallback to localStorage
          const updatedGPTs = gptModels.map(gpt =>
            gpt.id === id ? { ...gpt, isActive: !gpt.isActive } : gpt
          );
          setGptModels(updatedGPTs);
          localStorage.setItem('gpt-models', JSON.stringify(updatedGPTs));
          console.log('✅ GPT status updated in localStorage');
        }
      } catch (err: any) {
        console.error('Error toggling GPT active status:', err);
      }
    };
    toggleActive();
  };

  const handleCreateNew = () => {
    const newGPT: GPTModel = {
      id: Date.now().toString(),
      name: 'New GPT Model',
      description: 'Description for new model',
      contentType: 'destination',
      systemPrompt: 'Je bent een professionele reisschrijver. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers. {ROUTE_TYPE_INSTRUCTION}',
      temperature: 0.7,
      maxTokens: 1500,
      model: 'gpt-3.5-turbo',
      isActive: false,
      usageCount: 0,
      lastUsed: 'Never'
    };
    setEditingGPT(newGPT);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GPT Model Management</h2>
          <p className="text-gray-600">
            Configure and manage custom GPT models for different content types
            {!supabase && (
              <span className="text-orange-600 ml-2">
                (Using localStorage - 
                <button 
                  onClick={() => setShowSupabaseSetup(true)}
                  className="underline hover:text-orange-700 ml-1"
                >
                  setup Supabase for multi-user support
                </button>
                )
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={16} />
            <span>Export Config</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Upload size={16} />
            <span>Import Config</span>
          </button>
          <button 
            onClick={loadGPTModels}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleCreateNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>New GPT Model</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Models</p>
              <p className="text-2xl font-bold text-gray-900">{gptModels.length}</p>
            </div>
            <Bot className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Models</p>
              <p className="text-2xl font-bold text-gray-900">{gptModels.filter(g => g.isActive).length}</p>
            </div>
            <Settings className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900">{gptModels.reduce((sum, g) => sum + g.usageCount, 0)}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Models Created</p>
              <p className="text-2xl font-bold text-gray-900">{gptModels.length}</p>
            </div>
            <Bot className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* GPT Models Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">GPT Models</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your custom GPT configurations - shared across all users
            {!supabase && <span className="text-orange-600 ml-2">(Currently using localStorage - GPTs are only saved locally)</span>}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading GPT models...</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engine</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gptModels.map((gpt) => (
                <tr key={gpt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                        gpt.isActive ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Bot className={`w-4 h-4 ${gpt.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{gpt.name}</div>
                        <div className="text-sm text-gray-500">{gpt.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {contentTypes.find(ct => ct.id === gpt.content_type || ct.id === gpt.contentType)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{gpt.model}</div>
                    <div className="text-xs text-gray-500">
                      Temp: {gpt.temperature} | Max: {gpt.maxTokens}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{gpt.usageCount} calls</div>
                    <div className="text-xs text-gray-500">Last: {gpt.lastUsed}</div>
                  </td>
                  <td className="px-6 py-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gpt.isActive}
                        onChange={() => handleToggleActive(gpt.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowPrompt(showPrompt === gpt.id ? null : gpt.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View Prompt"
                      >
                        {showPrompt === gpt.id ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => handleEditGPT(gpt)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(gpt, null, 2))}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Copy Config"
                      >
                        <Copy size={16} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteGPT(gpt.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Expanded Prompt View */}
        {showPrompt && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">System Prompt</h4>
              <button
                onClick={() => setShowPrompt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bg-white p-4 rounded-lg border font-mono text-sm text-gray-700">
              {gptModels.find(g => g.id === showPrompt)?.system_prompt || gptModels.find(g => g.id === showPrompt)?.systemPrompt}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingGPT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingGPT.id === Date.now().toString() ? 'Create New GPT Model' : 'Edit GPT Model'}
              </h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Model Name</label>
                  <input
                    type="text"
                    value={editingGPT.name}
                    onChange={(e) => setEditingGPT({...editingGPT, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                  <select
                   value={editingGPT.contentType || editingGPT.content_type}
                   onChange={(e) => setEditingGPT({...editingGPT, contentType: e.target.value, content_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {contentTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={editingGPT.description}
                  onChange={(e) => setEditingGPT({...editingGPT, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Model Settings */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI Model</label>
                  <select
                    value={editingGPT.model}
                    onChange={(e) => setEditingGPT({...editingGPT, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.label} ({model.cost})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature ({editingGPT.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={editingGPT.temperature}
                    onChange={(e) => setEditingGPT({...editingGPT, temperature: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={editingGPT.maxTokens}
                    onChange={(e) => setEditingGPT({...editingGPT, maxTokens: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt</label>
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Beschikbare Variabelen:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-blue-100 px-1 rounded">{'{WRITING_STYLE}'}</code> - Schrijfstijl</div>
                    <div><code className="bg-blue-100 px-1 rounded">{'{VACATION_TYPE}'}</code> - Reistype</div>
                    <div><code className="bg-blue-100 px-1 rounded">{'{ROUTE_TYPE}'}</code> - Route type</div>
                    <div><code className="bg-blue-100 px-1 rounded">{'{ROUTE_TYPE_INSTRUCTION}'}</code> - Route instructie</div>
                    <div><code className="bg-blue-100 px-1 rounded">{'{DESTINATION}'}</code> - Bestemming</div>
                    <div><code className="bg-blue-100 px-1 rounded">{'{DAYS}'}</code> - Aantal dagen</div>
                  </div>
                </div>
                <textarea
                 value={editingGPT.systemPrompt || editingGPT.system_prompt}
                 onChange={(e) => setEditingGPT({...editingGPT, systemPrompt: e.target.value, system_prompt: e.target.value})}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Bijvoorbeeld: Je bent een {WRITING_STYLE} reisschrijver die {VACATION_TYPE} content maakt voor {DESTINATION}. {ROUTE_TYPE_INSTRUCTION}"
                />
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Voorbeeld prompts:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• <strong>Bestemmingen:</strong> "Je bent een {'{WRITING_STYLE}'} reisschrijver die {'{VACATION_TYPE}'} content schrijft over {'{DESTINATION}'}."</li>
                    <li>• <strong>Routes:</strong> "Je bent een routeplanner die {'{ROUTE_TYPE_INSTRUCTION}'} routes maakt in {'{WRITING_STYLE}'} stijl."</li>
                    <li>• <strong>Planning:</strong> "Maak een {'{DAYS}'} dagplanning voor {'{VACATION_TYPE}'} reizigers in {'{WRITING_STYLE}'} stijl."</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end space-x-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGPT}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>Save GPT Model</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Setup Modal */}
      {showSupabaseSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Setup Supabase Database</h2>
              <button 
                onClick={() => setShowSupabaseSetup(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SupabaseSetup />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}