import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Send, Check, MoreVertical, Trash2, Edit } from 'lucide-react';

interface Discussion {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  parent_id: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface DiscussionPanelProps {
  episodeId: string;
  questionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DiscussionPanel({ episodeId, questionId, onClose, onUpdate }: DiscussionPanelProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    if (questionId) {
      loadQuestion();
    }
    loadDiscussions();

    const subscription = supabase
      .channel(`discussions_${episodeId}_${questionId || 'general'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'podcast_discussions',
        filter: questionId
          ? `question_id=eq.${questionId}`
          : `episode_planning_id=eq.${episodeId}`
      }, () => {
        loadDiscussions();
        onUpdate();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [episodeId, questionId]);

  useEffect(() => {
    scrollToBottom();
  }, [discussions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(data);
    }
  };

  const loadQuestion = async () => {
    if (!questionId) return;
    try {
      const { data, error } = await supabase
        .from('podcast_questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error) throw error;
      setQuestion(data);
    } catch (error) {
      console.error('Error loading question:', error);
    }
  };

  const loadDiscussions = async () => {
    try {
      let query = supabase
        .from('podcast_discussions')
        .select('*')
        .eq('episode_planning_id', episodeId)
        .order('created_at', { ascending: true });

      if (questionId) {
        query = query.eq('question_id', questionId);
      } else {
        query = query.is('question_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDiscussions(data || []);
    } catch (error) {
      console.error('Error loading discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      const { error } = await supabase
        .from('podcast_discussions')
        .insert({
          episode_planning_id: episodeId,
          question_id: questionId,
          parent_id: replyTo,
          author_id: currentUser.id,
          author_name: currentUser.full_name || currentUser.email,
          content: newMessage.trim(),
          is_resolved: false
        });

      if (error) throw error;

      setNewMessage('');
      setReplyTo(null);

      if (questionId && discussions.length === 0) {
        await supabase
          .from('podcast_questions')
          .update({ status: 'under_discussion' })
          .eq('id', questionId);
      }

      onUpdate();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Fout bij verzenden bericht');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('podcast_discussions')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const markResolved = async () => {
    if (!questionId) return;

    try {
      await Promise.all([
        supabase
          .from('podcast_discussions')
          .update({ is_resolved: true })
          .eq('question_id', questionId),
        supabase
          .from('podcast_questions')
          .update({ status: 'approved' })
          .eq('id', questionId)
      ]);

      onUpdate();
    } catch (error) {
      console.error('Error marking resolved:', error);
    }
  };

  const organizeThreads = () => {
    const threads: Array<Discussion & { replies: Discussion[] }> = [];
    const topLevel = discussions.filter(d => !d.parent_id);

    topLevel.forEach(parent => {
      const replies = discussions.filter(d => d.parent_id === parent.id);
      threads.push({ ...parent, replies });
    });

    return threads;
  };

  const threads = organizeThreads();
  const isResolved = discussions.some(d => d.is_resolved);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-40">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Discussie</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {question ? (
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm text-blue-100 mb-1">Vraag:</p>
            <p className="text-white text-sm">{question.question}</p>
          </div>
        ) : (
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm text-blue-100">Algemene Episode Discussie</p>
          </div>
        )}

        {question && !isResolved && discussions.length > 0 && (
          <button
            onClick={markResolved}
            className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Check size={16} />
            <span>Markeer als Opgelost & Goedkeuren</span>
          </button>
        )}

        {isResolved && (
          <div className="mt-3 bg-green-500/20 border border-green-400 rounded-lg p-2 text-center text-sm">
            <Check size={16} className="inline mr-1" />
            Discussie Afgerond
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-2">Nog geen discussies</p>
            <p className="text-gray-400 text-xs">Start de discussie door een bericht te sturen</p>
          </div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="space-y-2">
              {/* Parent Message */}
              <div className={`rounded-lg p-3 ${
                thread.author_id === currentUser?.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {thread.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{thread.author_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(thread.created_at).toLocaleString('nl-NL', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {thread.author_id === currentUser?.id && (
                    <button
                      onClick={() => deleteMessage(thread.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <p className="text-gray-900 text-sm whitespace-pre-wrap">{thread.content}</p>

                <button
                  onClick={() => setReplyTo(thread.id)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  Reageer
                </button>
              </div>

              {/* Replies */}
              {thread.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`ml-8 rounded-lg p-3 ${
                    reply.author_id === currentUser?.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                        {reply.author_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">{reply.author_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(reply.created_at).toLocaleString('nl-NL', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {reply.author_id === currentUser?.id && (
                      <button
                        onClick={() => deleteMessage(reply.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <p className="text-gray-900 text-sm whitespace-pre-wrap">{reply.content}</p>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        {replyTo && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-xs text-blue-700">Reageren op bericht</span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-blue-600 hover:text-blue-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Typ een bericht... (Enter = verzenden, Shift+Enter = nieuwe regel)"
            rows={3}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {currentUser ? `Ingelogd als ${currentUser.full_name || currentUser.email}` : 'Niet ingelogd'}
        </p>
      </div>
    </div>
  );
}
