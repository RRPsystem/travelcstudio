import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, AlertCircle, Star, MessageSquare, Save, RefreshCw } from 'lucide-react';

interface TestFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  order_index: number;
}

interface TestAssignment {
  id: string;
  feature_id: string;
  status: string;
  feature: TestFeature;
}

interface TestFeedback {
  id?: string;
  assignment_id: string;
  user_id: string;
  feature_id: string;
  round_id: string;
  test_status: 'works' | 'broken' | 'partial' | null;
  rating: number | null;
  comments: string;
}

interface TestRound {
  id: string;
  round_number: number;
  status: string;
}

export default function TestDashboard() {
  const { user, isAdmin, isBrand } = useAuth();
  const [activeRound, setActiveRound] = useState<TestRound | null>(null);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Map<string, TestFeedback>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTestData();
    }
  }, [user]);

  const loadTestData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: roundData } = await supabase
        .from('test_rounds')
        .select('*')
        .eq('status', 'active')
        .order('round_number', { ascending: true })
        .maybeSingle();

      if (!roundData) {
        setLoading(false);
        return;
      }

      setActiveRound(roundData);

      // isAdmin comes from useAuth hook

      if (isAdmin) {
        // Admin sees ALL test features, not just assigned ones
        const { data: featuresData, error: featuresError } = await supabase
          .from('test_features')
          .select('*')
          .order('order_index', { ascending: true });

        if (featuresError) throw featuresError;

        // Convert features to assignment-like format for Admin
        const adminAssignments = (featuresData || []).map(feature => ({
          id: `admin-${feature.id}`,
          feature_id: feature.id,
          status: 'pending',
          feature: feature
        }));

        setAssignments(adminAssignments);
      } else {
        // Brand/Agent sees only their assigned features
        let query = supabase
          .from('test_assignments')
          .select(`
            id,
            feature_id,
            status,
            feature:test_features(*)
          `)
          .eq('user_id', user.id)
          .eq('round_id', roundData.id);

        const { data: assignmentsData, error: assignmentsError } = await query;

        if (assignmentsError) throw assignmentsError;

        setAssignments(assignmentsData || []);
      }

      const { data: feedbackData } = await supabase
        .from('test_feedback')
        .select('*')
        .eq('user_id', user.id)
        .eq('round_id', roundData.id);

      const feedbackByFeature = new Map();
      feedbackData?.forEach(fb => {
        feedbackByFeature.set(fb.feature_id, fb);
      });
      setFeedbackMap(feedbackByFeature);

    } catch (error) {
      console.error('Error loading test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFeedback = async (featureId: string, assignmentId: string, feedback: Partial<TestFeedback>) => {
    if (!user || !activeRound) return;

    setSaving(featureId);

    try {
      const existingFeedback = feedbackMap.get(featureId);
      const feedbackData = {
        assignment_id: assignmentId,
        user_id: user.id,
        feature_id: featureId,
        round_id: activeRound.id,
        test_status: feedback.test_status || null,
        rating: feedback.rating || null,
        comments: feedback.comments || '',
        updated_at: new Date().toISOString()
      };

      if (existingFeedback?.id) {
        const { error } = await supabase
          .from('test_feedback')
          .update(feedbackData)
          .eq('id', existingFeedback.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('test_feedback')
          .insert(feedbackData);

        if (error) throw error;
      }

      await supabase
        .from('test_assignments')
        .update({
          status: feedback.test_status ? 'completed' : 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      await loadTestData();
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Er ging iets mis bij het opslaan');
    } finally {
      setSaving(null);
    }
  };

  const updateFeedbackField = (featureId: string, field: keyof TestFeedback, value: any) => {
    const existing = feedbackMap.get(featureId) || {};
    const updated = { ...existing, [field]: value } as TestFeedback;
    const newMap = new Map(feedbackMap);
    newMap.set(featureId, updated);
    setFeedbackMap(newMap);
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'works':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'broken':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'partial':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'works':
        return 'bg-green-50 border-green-200';
      case 'broken':
        return 'bg-red-50 border-red-200';
      case 'partial':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Geen actieve test ronde</h2>
        <p className="text-gray-500">Er is momenteel geen actieve test ronde. Neem contact op met de operator.</p>
      </div>
    );
  }

  const sharedFeatures = assignments.filter(a => a.feature?.category === 'shared');
  const categoryFeatures = assignments.filter(a =>
    a.feature?.category === (isBrand ? 'brand' : 'agent')
  );

  const completedCount = assignments.filter(a => a.status === 'completed').length;
  const totalCount = assignments.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Dashboard</h1>
            <p className="text-gray-600 mt-1">Test Ronde {activeRound.round_number}</p>
          </div>
          <button
            onClick={loadTestData}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Vernieuwen
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Voortgang</span>
            <span className="text-sm font-medium text-gray-700">{completedCount} / {totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {sharedFeatures.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Algemene Features</h2>
            <p className="text-sm text-gray-600 mt-1">Features die door iedereen getest worden</p>
          </div>
          <div className="p-6 space-y-4">
            {sharedFeatures.map(assignment => {
              const feedback = feedbackMap.get(assignment.feature_id) || {};
              return (
                <FeatureTestCard
                  key={assignment.id}
                  assignment={assignment}
                  feedback={feedback}
                  saving={saving === assignment.feature_id}
                  onUpdate={(field, value) => updateFeedbackField(assignment.feature_id, field, value)}
                  onSave={(fb) => saveFeedback(assignment.feature_id, assignment.id, fb)}
                />
              );
            })}
          </div>
        </div>
      )}

      {categoryFeatures.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isBrand ? 'Website Management' : 'AI Tools'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isBrand
                ? 'Test de website management tools'
                : 'Test de AI-powered agent tools'
              }
            </p>
          </div>
          <div className="p-6 space-y-4">
            {categoryFeatures.map(assignment => {
              const feedback = feedbackMap.get(assignment.feature_id) || {};
              return (
                <FeatureTestCard
                  key={assignment.id}
                  assignment={assignment}
                  feedback={feedback}
                  saving={saving === assignment.feature_id}
                  onUpdate={(field, value) => updateFeedbackField(assignment.feature_id, field, value)}
                  onSave={(fb) => saveFeedback(assignment.feature_id, assignment.id, fb)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface FeatureTestCardProps {
  assignment: TestAssignment;
  feedback: Partial<TestFeedback>;
  saving: boolean;
  onUpdate: (field: keyof TestFeedback, value: any) => void;
  onSave: (feedback: Partial<TestFeedback>) => void;
}

function FeatureTestCard({ assignment, feedback, saving, onUpdate, onSave }: FeatureTestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'works':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'broken':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'partial':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'works':
        return 'bg-green-50 border-green-200';
      case 'broken':
        return 'bg-red-50 border-red-200';
      case 'partial':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className={`border-2 rounded-lg transition-all ${getStatusColor(feedback.test_status)}`}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          {getStatusIcon(feedback.test_status)}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{assignment.feature.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{assignment.feature.description}</p>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-white">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onUpdate('test_status', 'works')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    feedback.test_status === 'works'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <CheckCircle className={`w-6 h-6 mx-auto ${
                    feedback.test_status === 'works' ? 'text-green-500' : 'text-gray-400'
                  }`} />
                  <span className="block text-xs mt-1">Werkt</span>
                </button>
                <button
                  onClick={() => onUpdate('test_status', 'partial')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    feedback.test_status === 'partial'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                >
                  <AlertCircle className={`w-6 h-6 mx-auto ${
                    feedback.test_status === 'partial' ? 'text-yellow-500' : 'text-gray-400'
                  }`} />
                  <span className="block text-xs mt-1">Gedeeltelijk</span>
                </button>
                <button
                  onClick={() => onUpdate('test_status', 'broken')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    feedback.test_status === 'broken'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <XCircle className={`w-6 h-6 mx-auto ${
                    feedback.test_status === 'broken' ? 'text-red-500' : 'text-gray-400'
                  }`} />
                  <span className="block text-xs mt-1">Werkt niet</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gebruiksvriendelijkheid
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => onUpdate('rating', rating)}
                    className="p-2"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        (feedback.rating || 0) >= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opmerkingen
              </label>
              <textarea
                value={feedback.comments || ''}
                onChange={(e) => onUpdate('comments', e.target.value)}
                placeholder="Beschrijf wat je hebt getest en wat er werkt of niet werkt..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <button
              onClick={() => onSave(feedback)}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Opslaan...' : 'Feedback Opslaan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
