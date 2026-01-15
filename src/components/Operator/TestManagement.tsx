import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircle, XCircle, AlertCircle, Clock, ThumbsUp, Users,
  RefreshCw, Play, Pause, ChevronDown, ChevronRight, MessageSquare,
  Star, Save
} from 'lucide-react';

interface TestFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  order_index: number;
}

interface TestRound {
  id: string;
  round_number: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

interface TestFeedback {
  id: string;
  user_id: string;
  feature_id: string;
  test_status: 'works' | 'broken' | 'partial' | null;
  rating: number | null;
  comments: string;
  created_at: string;
  user: {
    email: string;
  };
}

interface FeatureStatus {
  id?: string;
  feature_id: string;
  round_id: string;
  operator_status: 'in_test' | 'needs_fix' | 'fixed' | 'approved';
  operator_notes: string;
}

export default function TestManagement() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<TestRound[]>([]);
  const [activeRound, setActiveRound] = useState<TestRound | null>(null);
  const BUILD_VERSION = '2026-01-15-23:59';
  const [features, setFeatures] = useState<TestFeature[]>([]);
  const [feedbackByFeature, setFeedbackByFeature] = useState<Map<string, TestFeedback[]>>(new Map());
  const [statusByFeature, setStatusByFeature] = useState<Map<string, FeatureStatus>>(new Map());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    try {
      setLoading(true);

      const { data: roundsData } = await supabase
        .from('test_rounds')
        .select('*')
        .order('round_number', { ascending: true });

      setRounds(roundsData || []);

      const activeRoundData = roundsData?.find(r => r.status === 'active') || roundsData?.[0];
      setActiveRound(activeRoundData || null);

      if (!activeRoundData) {
        setLoading(false);
        return;
      }

      const { data: featuresData } = await supabase
        .from('test_features')
        .select('*')
        .order('order_index', { ascending: true });

      setFeatures(featuresData || []);

      const { data: feedbackData } = await supabase
        .from('test_feedback')
        .select('*')
        .eq('round_id', activeRoundData.id);

      if (feedbackData && feedbackData.length > 0) {
        const userIds = [...new Set(feedbackData.map(fb => fb.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);

        const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

        const feedbackMap = new Map<string, TestFeedback[]>();
        feedbackData.forEach(fb => {
          const user = userMap.get(fb.user_id);
          const feedbackWithUser = { ...fb, user: user ? { email: user.email } : null };
          const existing = feedbackMap.get(fb.feature_id) || [];
          feedbackMap.set(fb.feature_id, [...existing, feedbackWithUser]);
        });
        setFeedbackByFeature(feedbackMap);
      } else {
        setFeedbackByFeature(new Map());
      }

      const { data: statusData } = await supabase
        .from('test_feature_status')
        .select('*')
        .eq('round_id', activeRoundData.id);

      const statusMap = new Map<string, FeatureStatus>();
      statusData?.forEach(status => {
        statusMap.set(status.feature_id, status);
      });
      setStatusByFeature(statusMap);

    } catch (error) {
      console.error('Error loading test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRound = async (roundId: string) => {
    try {
      await supabase
        .from('test_rounds')
        .update({ status: 'pending' })
        .neq('id', roundId);

      await supabase
        .from('test_rounds')
        .update({
          status: 'active',
          start_date: new Date().toISOString()
        })
        .eq('id', roundId);

      await loadTestData();
    } catch (error) {
      console.error('Error starting round:', error);
      alert('Er ging iets mis bij het starten van de ronde');
    }
  };

  const completeRound = async (roundId: string) => {
    try {
      await supabase
        .from('test_rounds')
        .update({
          status: 'completed',
          end_date: new Date().toISOString()
        })
        .eq('id', roundId);

      await loadTestData();
    } catch (error) {
      console.error('Error completing round:', error);
      alert('Er ging iets mis bij het afronden van de ronde');
    }
  };

  const updateFeatureStatus = async (featureId: string, status: FeatureStatus) => {
    if (!activeRound || !user) return;

    setSaving(featureId);

    try {
      const existingStatus = statusByFeature.get(featureId);
      const statusData = {
        feature_id: featureId,
        round_id: activeRound.id,
        operator_status: status.operator_status,
        operator_notes: status.operator_notes,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (existingStatus?.id) {
        const { error } = await supabase
          .from('test_feature_status')
          .update(statusData)
          .eq('id', existingStatus.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('test_feature_status')
          .insert(statusData);

        if (error) throw error;
      }

      await loadTestData();
    } catch (error) {
      console.error('Error updating feature status:', error);
      alert('Er ging iets mis bij het opslaan');
    } finally {
      setSaving(null);
    }
  };

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const getFeatureStats = (featureId: string) => {
    const feedback = feedbackByFeature.get(featureId) || [];
    const works = feedback.filter(f => f.test_status === 'works').length;
    const broken = feedback.filter(f => f.test_status === 'broken').length;
    const partial = feedback.filter(f => f.test_status === 'partial').length;
    const avgRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length
      : 0;

    return { works, broken, partial, total: feedback.length, avgRating };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'fixed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'needs_fix':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Goedgekeurd';
      case 'fixed':
        return 'Gefixed';
      case 'needs_fix':
        return 'Moet gefixed';
      case 'in_test':
        return 'In test';
      default:
        return status;
    }
  };

  const sharedFeatures = features.filter(f => f.category === 'shared');
  const brandFeatures = features.filter(f => f.category === 'brand');
  const agentFeatures = features.filter(f => f.category === 'agent');

  const getTotalStats = () => {
    let approved = 0;
    let needsFix = 0;
    let inTest = 0;

    features.forEach(feature => {
      const status = statusByFeature.get(feature.id);
      if (status?.operator_status === 'approved') approved++;
      else if (status?.operator_status === 'needs_fix') needsFix++;
      else inTest++;
    });

    return { approved, needsFix, inTest, total: features.length };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Management</h1>
            <p className="text-gray-600 mt-1">Overzicht van alle test rondes en feedback</p>
          </div>
          <button
            onClick={loadTestData}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Vernieuwen
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Goedgekeurd</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Moet gefixed</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.needsFix}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">In test</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.inTest}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Totaal</span>
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Test Rondes</h3>
          <div className="flex gap-3">
            {rounds.map(round => (
              <div
                key={round.id}
                className={`flex-1 p-4 rounded-lg border-2 ${
                  round.status === 'active'
                    ? 'border-blue-500 bg-blue-50'
                    : round.status === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Ronde {round.round_number}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    round.status === 'active'
                      ? 'bg-blue-100 text-blue-700'
                      : round.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {round.status === 'active' ? 'Actief' : round.status === 'completed' ? 'Afgerond' : 'Gepland'}
                  </span>
                </div>
                {round.status === 'pending' && (
                  <button
                    onClick={() => startRound(round.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start Ronde
                  </button>
                )}
                {round.status === 'active' && (
                  <button
                    onClick={() => completeRound(round.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    <Pause className="w-4 h-4" />
                    Rond Af
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeRound && (
        <>
          {sharedFeatures.length > 0 && (
            <FeatureSection
              title="Algemene Features"
              description="Features die door iedereen getest worden"
              features={sharedFeatures}
              feedbackByFeature={feedbackByFeature}
              statusByFeature={statusByFeature}
              expandedFeatures={expandedFeatures}
              saving={saving}
              onToggle={toggleFeature}
              onUpdateStatus={updateFeatureStatus}
              getFeatureStats={getFeatureStats}
            />
          )}

          {brandFeatures.length > 0 && (
            <FeatureSection
              title="Brand Features"
              description="Website management tools"
              features={brandFeatures}
              feedbackByFeature={feedbackByFeature}
              statusByFeature={statusByFeature}
              expandedFeatures={expandedFeatures}
              saving={saving}
              onToggle={toggleFeature}
              onUpdateStatus={updateFeatureStatus}
              getFeatureStats={getFeatureStats}
            />
          )}

          {agentFeatures.length > 0 && (
            <FeatureSection
              title="Agent Features"
              description="AI-powered agent tools"
              features={agentFeatures}
              feedbackByFeature={feedbackByFeature}
              statusByFeature={statusByFeature}
              expandedFeatures={expandedFeatures}
              saving={saving}
              onToggle={toggleFeature}
              onUpdateStatus={updateFeatureStatus}
              getFeatureStats={getFeatureStats}
            />
          )}
        </>
      )}
    </div>
  );
}

interface FeatureSectionProps {
  title: string;
  description: string;
  features: TestFeature[];
  feedbackByFeature: Map<string, TestFeedback[]>;
  statusByFeature: Map<string, FeatureStatus>;
  expandedFeatures: Set<string>;
  saving: string | null;
  onToggle: (featureId: string) => void;
  onUpdateStatus: (featureId: string, status: FeatureStatus) => void;
  getFeatureStats: (featureId: string) => any;
}

function FeatureSection({
  title,
  description,
  features,
  feedbackByFeature,
  statusByFeature,
  expandedFeatures,
  saving,
  onToggle,
  onUpdateStatus,
  getFeatureStats
}: FeatureSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <div className="divide-y">
        {features.map(feature => (
          <FeatureRow
            key={feature.id}
            feature={feature}
            feedback={feedbackByFeature.get(feature.id) || []}
            status={statusByFeature.get(feature.id)}
            isExpanded={expandedFeatures.has(feature.id)}
            saving={saving === feature.id}
            stats={getFeatureStats(feature.id)}
            onToggle={() => onToggle(feature.id)}
            onUpdateStatus={(status) => onUpdateStatus(feature.id, status)}
          />
        ))}
      </div>
    </div>
  );
}

interface FeatureRowProps {
  feature: TestFeature;
  feedback: TestFeedback[];
  status?: FeatureStatus;
  isExpanded: boolean;
  saving: boolean;
  stats: any;
  onToggle: () => void;
  onUpdateStatus: (status: FeatureStatus) => void;
}

function FeatureRow({
  feature,
  feedback,
  status,
  isExpanded,
  saving,
  stats,
  onToggle,
  onUpdateStatus
}: FeatureRowProps) {
  const [operatorStatus, setOperatorStatus] = useState(status?.operator_status || 'in_test');
  const [operatorNotes, setOperatorNotes] = useState(status?.operator_notes || '');

  useEffect(() => {
    setOperatorStatus(status?.operator_status || 'in_test');
    setOperatorNotes(status?.operator_notes || '');
  }, [status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'fixed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'needs_fix':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Goedgekeurd';
      case 'fixed':
        return 'Gefixed';
      case 'needs_fix':
        return 'Moet gefixed';
      case 'in_test':
        return 'In test';
      default:
        return status;
    }
  };

  return (
    <div>
      <div
        className="p-4 hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{feature.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{stats.works}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{stats.partial}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">{stats.broken}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{stats.avgRating.toFixed(1)}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(operatorStatus)}`}>
              {getStatusLabel(operatorStatus)}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 bg-gray-50 border-t">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Tester Feedback ({feedback.length})</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedback.map(fb => (
                  <div key={fb.id} className="bg-white rounded-lg p-4 border">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{fb.user?.email}</span>
                      <div className="flex items-center gap-2">
                        {fb.test_status === 'works' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {fb.test_status === 'partial' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                        {fb.test_status === 'broken' && <XCircle className="w-5 h-5 text-red-500" />}
                        {fb.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm">{fb.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {fb.comments && (
                      <p className="text-sm text-gray-600">{fb.comments}</p>
                    )}
                  </div>
                ))}
                {feedback.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Nog geen feedback ontvangen</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Operator Acties</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={operatorStatus}
                    onChange={(e) => setOperatorStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="in_test">In test</option>
                    <option value="needs_fix">Moet gefixed</option>
                    <option value="fixed">Gefixed</option>
                    <option value="approved">Goedgekeurd</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notities
                  </label>
                  <textarea
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="Notities voor het dev team..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                  />
                </div>

                <button
                  onClick={() => onUpdateStatus({
                    feature_id: feature.id,
                    round_id: status?.round_id || '',
                    operator_status: operatorStatus,
                    operator_notes: operatorNotes
                  })}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Opslaan...' : 'Status Opslaan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
