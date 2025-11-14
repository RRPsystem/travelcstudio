import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RoadmapItem, User } from '../../types/database';
import {
  Lightbulb,
  Bug,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Edit2,
  CheckCircle2,
  XCircle,
  Play,
  Plus,
  Sparkles,
  Globe,
  Plane,
  Layers,
  FileText,
  Search,
  Rocket,
  TestTube
} from 'lucide-react';

const categoryConfig = {
  ai_tools: { icon: Sparkles, label: 'AI Tools', color: 'bg-blue-100 text-blue-700' },
  website: { icon: Globe, label: 'Website', color: 'bg-green-100 text-green-700' },
  traveldingen: { icon: Plane, label: 'Traveldingen', color: 'bg-sky-100 text-sky-700' },
  uitbreiding: { icon: Layers, label: 'Uitbreiding', color: 'bg-amber-100 text-amber-700' },
  bug_probleem: { icon: Bug, label: 'Bug/Probleem', color: 'bg-red-100 text-red-700' },
  content: { icon: FileText, label: 'Content', color: 'bg-purple-100 text-purple-700' }
};

const statusConfig = {
  nieuw_idee: { icon: Lightbulb, label: 'Nieuw Idee', color: 'text-gray-500' },
  pre_flight_check: { icon: Search, label: 'Pre-Flight Check', color: 'text-blue-500' },
  take_off: { icon: Rocket, label: 'Take Off', color: 'text-yellow-500' },
  in_progress: { icon: Play, label: 'In Progress', color: 'text-orange-500' },
  test_fase: { icon: TestTube, label: 'Test Fase', color: 'text-indigo-500' },
  afgerond: { icon: CheckCircle2, label: 'Afgerond', color: 'text-green-500' },
  afgekeurd: { icon: XCircle, label: 'Afgekeurd', color: 'text-red-500' }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-200 text-gray-700', indicator: '⚪' },
  medium: { label: 'Medium', color: 'bg-blue-200 text-blue-700', indicator: '🔵' },
  high: { label: 'High', color: 'bg-yellow-200 text-yellow-700', indicator: '🟡' },
  critical: { label: 'Critical', color: 'bg-red-200 text-red-700', indicator: '🔴' }
};

export default function RoadmapManagement() {
  const { user } = useAuth();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  const [editForm, setEditForm] = useState<Partial<RoadmapItem>>({});
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: 'ai_tools' as RoadmapItem['category'],
    priority: 'medium' as RoadmapItem['priority'],
    status: 'take_off' as RoadmapItem['status']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsResult, operatorsResult] = await Promise.all([
        supabase
          .from('roadmap_items')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('*')
          .eq('role', 'operator')
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (operatorsResult.error) throw operatorsResult.error;

      setItems(itemsResult.data || []);
      setOperators(operatorsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const startEdit = (item: RoadmapItem) => {
    setEditingItem(item.id);
    setEditForm({
      status: item.status,
      priority: item.priority,
      assigned_to: item.assigned_to || undefined,
      estimated_release: item.estimated_release || undefined,
      operator_notes: item.operator_notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const saveEdit = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('roadmap_items')
        .update(editForm)
        .eq('id', itemId);

      if (error) throw error;

      setEditingItem(null);
      setEditForm({});
      await loadData();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('roadmap_items')
        .insert({
          title: newItem.title,
          description: newItem.description,
          category: newItem.category,
          priority: newItem.priority,
          status: newItem.status,
          created_by: user.id
        });

      if (error) throw error;

      setNewItem({
        title: '',
        description: '',
        category: 'feature',
        priority: 'medium',
        status: 'planned'
      });
      setShowNewForm(false);
      await loadData();
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading roadmap...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Roadmap Item
        </button>
      </div>

      {showNewForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Roadmap Item</h3>
          <form onSubmit={handleCreateItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feature title"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value as RoadmapItem['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ai_tools">AI Tools</option>
                  <option value="website">Website</option>
                  <option value="traveldingen">Traveldingen</option>
                  <option value="uitbreiding">Uitbreiding</option>
                  <option value="bug_probleem">Bug/Probleem</option>
                  <option value="content">Content</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newItem.priority}
                  onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as RoadmapItem['priority'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newItem.status}
                  onChange={(e) => setNewItem({ ...newItem, status: e.target.value as RoadmapItem['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="nieuw_idee">Nieuw Idee</option>
                  <option value="pre_flight_check">Pre-Flight Check</option>
                  <option value="take_off">Take Off</option>
                  <option value="in_progress">In Progress</option>
                  <option value="test_fase">Test Fase</option>
                  <option value="afgerond">Afgerond</option>
                  <option value="afgekeurd">Afgekeurd</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Detailed description..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Item
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Items</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{items.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {items.filter(i => i.status === 'in_progress').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {items.filter(i => i.status === 'completed').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Votes</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {items.reduce((sum, item) => sum + item.vote_count, 0)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => {
                const CategoryIcon = categoryConfig[item.category].icon;
                const StatusIcon = statusConfig[item.status].icon;
                const isExpanded = expandedRows.has(item.id);
                const isEditing = editingItem === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="text-left font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {item.title}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${categoryConfig[item.category].color}`}>
                          <CategoryIcon className="w-3.5 h-3.5" />
                          {categoryConfig[item.category].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editForm.status || item.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as RoadmapItem['status'] })}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="nieuw_idee">Nieuw Idee</option>
                            <option value="pre_flight_check">Pre-Flight Check</option>
                            <option value="take_off">Take Off</option>
                            <option value="in_progress">In Progress</option>
                            <option value="test_fase">Test Fase</option>
                            <option value="afgerond">Afgerond</option>
                            <option value="afgekeurd">Afgekeurd</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${statusConfig[item.status].color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusConfig[item.status].label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editForm.priority || item.priority}
                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as RoadmapItem['priority'] })}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        ) : (
                          <span className="text-sm">
                            {priorityConfig[item.priority].indicator} {priorityConfig[item.priority].label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="font-medium">{item.vote_count}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {item.description && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                                <p className="text-sm text-gray-600">{item.description}</p>
                              </div>
                            )}

                            {isEditing ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Assign To
                                  </label>
                                  <select
                                    value={editForm.assigned_to || ''}
                                    onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="">Unassigned</option>
                                    {operators.map(op => (
                                      <option key={op.id} value={op.id}>{op.email}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Estimated Release
                                  </label>
                                  <input
                                    type="date"
                                    value={editForm.estimated_release || ''}
                                    onChange={(e) => setEditForm({ ...editForm, estimated_release: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Operator Notes
                                  </label>
                                  <textarea
                                    value={editForm.operator_notes || ''}
                                    onChange={(e) => setEditForm({ ...editForm, operator_notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    rows={3}
                                    placeholder="Add updates or notes for users..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="font-semibold text-gray-700">Assigned To:</span>{' '}
                                    <span className="text-gray-600">
                                      {item.assigned_to
                                        ? operators.find(o => o.id === item.assigned_to)?.email || 'Unknown'
                                        : 'Unassigned'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-700">Created:</span>{' '}
                                    <span className="text-gray-600">
                                      {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-700">Est. Release:</span>{' '}
                                    <span className="text-gray-600">
                                      {item.estimated_release
                                        ? new Date(item.estimated_release).toLocaleDateString()
                                        : 'Not set'}
                                    </span>
                                  </div>
                                </div>
                                {item.operator_notes && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Updates from Team</h4>
                                    <p className="text-sm text-gray-600">{item.operator_notes}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No roadmap items yet.
          </div>
        )}
      </div>
    </div>
  );
}