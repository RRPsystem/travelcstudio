import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Clock, Mic, Radio, Music, FolderOpen, ArrowUp, ArrowDown, Trash2, Edit2, PlayCircle, Coffee, Volume2 } from 'lucide-react';

interface Segment {
  id: string;
  segment_type: string;
  title: string;
  duration_minutes: number | null;
  order_index: number;
  is_recorded: boolean;
  topic_id: string | null;
  notes: string | null;
  background_music_url: string | null;
}

interface Topic {
  id: string;
  title: string;
  duration_minutes: number | null;
  is_recorded: boolean;
}

interface EpisodeTimelineProps {
  episodeId: string;
  totalDuration: number;
  onDurationChange: (minutes: number) => void;
  onStatsUpdate: () => void;
}

export default function EpisodeTimeline({ episodeId, totalDuration, onDurationChange, onStatsUpdate }: EpisodeTimelineProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [newSegment, setNewSegment] = useState({
    segment_type: 'topic',
    title: '',
    duration_minutes: 10,
    topic_id: null as string | null,
    notes: '',
    background_music_url: ''
  });

  useEffect(() => {
    loadSegments();
    loadTopics();
  }, [episodeId]);

  useEffect(() => {
    const total = segments.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    onDurationChange(total);
  }, [segments]);

  const loadSegments = async () => {
    const { data } = await supabase
      .from('podcast_segments')
      .select('*')
      .eq('episode_planning_id', episodeId)
      .order('order_index', { ascending: true });

    setSegments(data || []);
  };

  const loadTopics = async () => {
    const { data } = await supabase
      .from('podcast_topics')
      .select('id, title, duration_minutes, is_recorded')
      .eq('episode_planning_id', episodeId)
      .order('order_index', { ascending: true });

    setTopics(data || []);
  };

  const addSegment = async () => {
    if (newSegment.segment_type === 'topic' && !newSegment.topic_id) {
      alert('Selecteer een onderwerp');
      return;
    }

    if (newSegment.segment_type !== 'topic' && !newSegment.title.trim()) {
      alert('Voer een titel in');
      return;
    }

    const finalTitle = newSegment.segment_type === 'topic' && newSegment.topic_id
      ? (topics.find(t => t.id === newSegment.topic_id)?.title || newSegment.title)
      : newSegment.title;

    if (!finalTitle.trim()) {
      alert('Titel mag niet leeg zijn');
      return;
    }

    try {
      const maxOrder = Math.max(...segments.map(s => s.order_index), 0);

      if (editingSegmentId) {
        const { error } = await supabase
          .from('podcast_segments')
          .update({
            segment_type: newSegment.segment_type,
            title: finalTitle.trim(),
            duration_minutes: newSegment.duration_minutes,
            topic_id: newSegment.topic_id,
            notes: newSegment.notes?.trim() || null,
            background_music_url: newSegment.background_music_url?.trim() || null
          })
          .eq('id', editingSegmentId);

        if (error) {
          console.error('Database error:', error);
          alert(`Fout bij opslaan: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('podcast_segments')
          .insert({
            episode_planning_id: episodeId,
            segment_type: newSegment.segment_type,
            title: finalTitle.trim(),
            duration_minutes: newSegment.duration_minutes,
            topic_id: newSegment.topic_id,
            notes: newSegment.notes?.trim() || null,
            background_music_url: newSegment.background_music_url?.trim() || null,
            order_index: maxOrder + 1,
            is_recorded: false
          });

        if (error) {
          console.error('Database error:', error);
          alert(`Fout bij opslaan: ${error.message}`);
          return;
        }
      }

      setNewSegment({ segment_type: 'topic', title: '', duration_minutes: 10, topic_id: null, notes: '', background_music_url: '' });
      setShowAddForm(false);
      setEditingSegmentId(null);
      loadSegments();
      onStatsUpdate();
    } catch (error: any) {
      console.error('Error saving segment:', error);
      alert(`Fout bij opslaan segment: ${error?.message || 'Onbekende fout'}`);
    }
  };

  const editSegment = (segment: Segment) => {
    setNewSegment({
      segment_type: segment.segment_type,
      title: segment.title,
      duration_minutes: segment.duration_minutes || 10,
      topic_id: segment.topic_id,
      notes: segment.notes || '',
      background_music_url: segment.background_music_url || ''
    });
    setEditingSegmentId(segment.id);
    setShowAddForm(true);
  };

  const deleteSegment = async (segmentId: string) => {
    if (!confirm('Weet je zeker dat je dit segment wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('podcast_segments')
        .delete()
        .eq('id', segmentId);

      if (error) throw error;

      await reorderSegments();
      loadSegments();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting segment:', error);
      alert('Fout bij verwijderen segment');
    }
  };

  const moveSegment = async (segmentId: string, direction: 'up' | 'down') => {
    const currentIndex = segments.findIndex(s => s.id === segmentId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === segments.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newSegments = [...segments];
    [newSegments[currentIndex], newSegments[newIndex]] = [newSegments[newIndex], newSegments[currentIndex]];

    try {
      const updates = newSegments.map((seg, idx) => ({
        id: seg.id,
        order_index: idx
      }));

      for (const update of updates) {
        await supabase
          .from('podcast_segments')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      loadSegments();
    } catch (error) {
      console.error('Error moving segment:', error);
      alert('Fout bij verplaatsen segment');
    }
  };

  const reorderSegments = async () => {
    const updates = segments.map((seg, idx) => ({
      id: seg.id,
      order_index: idx
    }));

    for (const update of updates) {
      await supabase
        .from('podcast_segments')
        .update({ order_index: update.order_index })
        .eq('id', update.id);
    }
  };

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case 'intro': return <Music size={18} className="text-blue-600" />;
      case 'topic': return <FolderOpen size={18} className="text-orange-600" />;
      case 'music': return <Volume2 size={18} className="text-purple-600" />;
      case 'ad_break': return <Radio size={18} className="text-green-600" />;
      case 'break': return <Coffee size={18} className="text-yellow-600" />;
      case 'outro': return <Music size={18} className="text-blue-600" />;
      default: return <Clock size={18} className="text-gray-600" />;
    }
  };

  const getSegmentColor = (type: string) => {
    switch (type) {
      case 'intro': return 'bg-blue-50 border-blue-200';
      case 'topic': return 'bg-orange-50 border-orange-200';
      case 'music': return 'bg-purple-50 border-purple-200';
      case 'ad_break': return 'bg-green-50 border-green-200';
      case 'break': return 'bg-yellow-50 border-yellow-200';
      case 'outro': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getTopicTitle = (topicId: string | null) => {
    if (!topicId) return null;
    const topic = topics.find(t => t.id === topicId);
    return topic?.title || 'Onbekend onderwerp';
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingSegmentId(null);
    setNewSegment({ segment_type: 'topic', title: '', duration_minutes: 10, topic_id: null, notes: '', background_music_url: '' });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Episode Timeline</h2>
          <p className="text-gray-600">Totale duur: {totalDuration} minuten</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Plus size={18} />
          <span>Segment Toevoegen</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingSegmentId ? 'Segment Bewerken' : 'Nieuw Segment'}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type Segment</label>
                <select
                  value={newSegment.segment_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setNewSegment({
                      ...newSegment,
                      segment_type: type,
                      topic_id: type === 'topic' ? newSegment.topic_id : null,
                      title: type === 'topic' ? '' : newSegment.title
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="intro">🎵 Intro</option>
                  <option value="topic">📁 Onderwerp</option>
                  <option value="music">🎵 Muziek</option>
                  <option value="ad_break">📻 Reclameblok</option>
                  <option value="break">☕ Pauze</option>
                  <option value="outro">🎵 Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duur (minuten)</label>
                <input
                  type="number"
                  value={newSegment.duration_minutes}
                  onChange={(e) => setNewSegment({ ...newSegment, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="1"
                />
              </div>
            </div>

            {newSegment.segment_type === 'topic' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecteer Onderwerp</label>
                <select
                  value={newSegment.topic_id || ''}
                  onChange={(e) => {
                    const topicId = e.target.value || null;
                    const topic = topics.find(t => t.id === topicId);
                    setNewSegment({
                      ...newSegment,
                      topic_id: topicId,
                      title: topic?.title || '',
                      duration_minutes: topic?.duration_minutes || 10
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Kies een onderwerp --</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title} {topic.is_recorded ? '✓ Opgenomen' : ''}
                    </option>
                  ))}
                </select>
                {newSegment.topic_id && (
                  <p className="mt-2 text-sm text-gray-600">
                    Gekozen: <strong>{topics.find(t => t.id === newSegment.topic_id)?.title}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                <input
                  type="text"
                  value={newSegment.title}
                  onChange={(e) => setNewSegment({ ...newSegment, title: e.target.value })}
                  placeholder="Bijv. 'Openingsmuziek', 'Sponsor bericht', etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            {(newSegment.segment_type === 'music' || newSegment.segment_type === 'intro' || newSegment.segment_type === 'outro') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Muziek URL (optioneel)</label>
                <input
                  type="url"
                  value={newSegment.background_music_url}
                  onChange={(e) => setNewSegment({ ...newSegment, background_music_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notities (optioneel)</label>
              <textarea
                value={newSegment.notes}
                onChange={(e) => setNewSegment({ ...newSegment, notes: e.target.value })}
                placeholder="Extra notities voor dit segment..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="mt-4 flex space-x-2">
            <button
              onClick={addSegment}
              disabled={
                (newSegment.segment_type === 'topic' && !newSegment.topic_id) ||
                (newSegment.segment_type !== 'topic' && !newSegment.title.trim())
              }
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {editingSegmentId ? 'Opslaan' : 'Segment Toevoegen'}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {segments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <PlayCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nog geen segmenten toegevoegd</p>
            <p className="text-sm mt-2">Start met het toevoegen van onderwerpen en andere segmenten om je episode op te bouwen</p>
          </div>
        ) : (
          <div>
            {/* Timeline Progress Bar */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Episode Opbouw</span>
                <span className="text-sm text-gray-600">{totalDuration} minuten totaal</span>
              </div>
              <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                {segments.map((segment, index) => {
                  const percentage = ((segment.duration_minutes || 0) / totalDuration) * 100;
                  const colorClass = segment.segment_type === 'topic' ? 'bg-orange-500' :
                                    segment.segment_type === 'ad_break' ? 'bg-green-500' :
                                    segment.segment_type === 'music' ? 'bg-purple-500' :
                                    segment.segment_type === 'break' ? 'bg-yellow-500' :
                                    'bg-blue-500';

                  return (
                    <div
                      key={segment.id}
                      className={`${colorClass} flex items-center justify-center text-white text-xs font-medium border-r border-white`}
                      style={{ width: `${percentage}%` }}
                      title={`${segment.title} - ${segment.duration_minutes} min`}
                    >
                      {percentage > 5 && `${segment.duration_minutes}m`}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Segment List */}
            <div className="divide-y divide-gray-200">
              {segments.map((segment, index) => {
                const topicTitle = segment.topic_id ? getTopicTitle(segment.topic_id) : null;
                const cumulativeTime = segments.slice(0, index).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

                return (
                  <div
                    key={segment.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${getSegmentColor(segment.segment_type)} border-l-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Time indicator */}
                        <div className="flex flex-col items-center min-w-[60px]">
                          <span className="text-xs text-gray-500 font-mono">{String(Math.floor(cumulativeTime / 60)).padStart(2, '0')}:{String(cumulativeTime % 60).padStart(2, '0')}</span>
                          <div className="my-2">{getSegmentIcon(segment.segment_type)}</div>
                          <span className="text-xs text-gray-500">{segment.duration_minutes}m</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                            <h4 className="font-semibold text-gray-900">
                              {topicTitle || segment.title}
                            </h4>
                            {segment.is_recorded && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                ✓ Opgenomen
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 capitalize mb-1">
                            {segment.segment_type === 'topic' ? '📁 Onderwerp' :
                             segment.segment_type === 'ad_break' ? '📻 Reclameblok' :
                             segment.segment_type === 'music' ? '🎵 Muziek' :
                             segment.segment_type === 'break' ? '☕ Pauze' :
                             segment.segment_type === 'intro' ? '🎵 Intro' :
                             segment.segment_type === 'outro' ? '🎵 Outro' :
                             segment.segment_type}
                          </p>

                          {segment.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              📝 {segment.notes}
                            </p>
                          )}

                          {segment.background_music_url && (
                            <p className="text-xs text-gray-500 mt-1">
                              🎵 {segment.background_music_url}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 ml-4">
                        <button
                          onClick={() => moveSegment(segment.id, 'up')}
                          disabled={index === 0}
                          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                            index === 0 ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          title="Omhoog verplaatsen"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => moveSegment(segment.id, 'down')}
                          disabled={index === segments.length - 1}
                          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                            index === segments.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          title="Omlaag verplaatsen"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          onClick={() => editSegment(segment)}
                          className="p-2 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteSegment(segment.id)}
                          className="p-2 rounded hover:bg-red-100 text-red-600 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
