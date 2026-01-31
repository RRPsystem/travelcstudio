import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock, User, MessageSquare, Lightbulb, AlertCircle } from 'lucide-react';

interface Proposal {
  id: string;
  proposal_type: string;
  title: string;
  description: string;
  proposed_by: string;
  proposer_name: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

interface PendingQuestion {
  id: string;
  episode_planning_id: string;
  topic_id: string;
  question: string;
  source_type: string;
  submitted_by: string;
  submitter_name: string;
  status: string;
  created_at: string;
  episode_title?: string;
  topic_title?: string;
}

export default function ProposalApproval() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'questions'>('proposals');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadProposals();
    loadPendingQuestions();
  }, []);

  const loadProposals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('podcast_proposals')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setProposals(data);
    }
    setLoading(false);
  };

  const loadPendingQuestions = async () => {
    const { data } = await supabase
      .from('podcast_questions')
      .select(`
        *,
        podcast_episodes_planning!inner(title),
        podcast_topics!inner(title)
      `)
      .eq('source_type', 'agent')
      .order('created_at', { ascending: false });

    if (data) {
      setPendingQuestions(data.map(q => ({
        ...q,
        episode_title: q.podcast_episodes_planning?.title,
        topic_title: q.podcast_topics?.title
      })));
    }
  };

  const updateProposalStatus = async (proposalId: string, status: string, notes: string = '') => {
    const { error } = await supabase
      .from('podcast_proposals')
      .update({
        status,
        admin_notes: notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    if (error) {
      alert('Fout bij updaten status: ' + error.message);
    } else {
      alert(`Voorstel ${status === 'approved' ? 'goedgekeurd' : status === 'rejected' ? 'afgewezen' : 'gemarkeerd als in behandeling'}!`);
      setSelectedProposal(null);
      setAdminNotes('');
      loadProposals();
    }
  };

  const updateQuestionStatus = async (questionId: string, status: string) => {
    const { error } = await supabase
      .from('podcast_questions')
      .update({ status })
      .eq('id', questionId);

    if (error) {
      alert('Fout bij updaten vraag: ' + error.message);
    } else {
      alert(`Vraag ${status === 'approved' ? 'goedgekeurd' : 'afgewezen'}!`);
      loadPendingQuestions();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      in_review: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      pending: 'In afwachting',
      approved: 'Goedgekeurd',
      rejected: 'Afgewezen',
      in_review: 'In behandeling'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const reviewedProposals = proposals.filter(p => p.status !== 'pending');
  const pendingQuestionsFiltered = pendingQuestions.filter(q => q.status === 'pending');
  const reviewedQuestions = pendingQuestions.filter(q => q.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Goedkeuringen</h2>
          <p className="text-gray-600">Beheer voorstellen en vragen van agents en brands</p>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('proposals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'proposals'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Lightbulb className="inline-block w-4 h-4 mr-2" />
              Voorstellen ({pendingProposals.length} nieuw)
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'questions'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="inline-block w-4 h-4 mr-2" />
              Vragen ({pendingQuestionsFiltered.length} nieuw)
            </button>
          </nav>
        </div>

        {activeTab === 'proposals' && (
          <div className="space-y-6">
            {pendingProposals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                  Nieuwe Voorstellen
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingProposals.map((proposal) => (
                    <div key={proposal.id} className="bg-white rounded-lg border-2 border-yellow-300 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              {proposal.proposal_type === 'topic' ? 'Onderwerp' : 'Gast'}
                            </span>
                            {getStatusBadge(proposal.status)}
                          </div>
                          <h4 className="font-semibold text-gray-900">{proposal.title}</h4>
                          {proposal.description && (
                            <p className="text-sm text-gray-600 mt-1">{proposal.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <User className="w-3 h-3 mr-1" />
                        {proposal.proposer_name} • {new Date(proposal.created_at).toLocaleDateString('nl-NL')}
                      </div>

                      {selectedProposal?.id === proposal.id ? (
                        <div className="space-y-3 pt-3 border-t border-gray-200">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Admin notities (optioneel)
                            </label>
                            <textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Voeg een notitie toe..."
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateProposalStatus(proposal.id, 'approved', adminNotes)}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Goedkeuren
                            </button>
                            <button
                              onClick={() => updateProposalStatus(proposal.id, 'in_review', adminNotes)}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              In behandeling
                            </button>
                            <button
                              onClick={() => updateProposalStatus(proposal.id, 'rejected', adminNotes)}
                              className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Afwijzen
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedProposal(null);
                              setAdminNotes('');
                            }}
                            className="w-full text-gray-600 text-sm hover:text-gray-800"
                          >
                            Annuleren
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedProposal(proposal)}
                          className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          Beoordelen
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewedProposals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Beoordeelde Voorstellen</h3>
                <div className="space-y-3">
                  {reviewedProposals.map((proposal) => (
                    <div key={proposal.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              {proposal.proposal_type === 'topic' ? 'Onderwerp' : 'Gast'}
                            </span>
                            {getStatusBadge(proposal.status)}
                          </div>
                          <h4 className="font-medium text-gray-900">{proposal.title}</h4>
                          {proposal.description && (
                            <p className="text-sm text-gray-600 mt-1">{proposal.description}</p>
                          )}
                          {proposal.admin_notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <div className="font-medium text-gray-700">Admin notitie:</div>
                              <div className="text-gray-600">{proposal.admin_notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-2">
                        <User className="w-3 h-3 mr-1" />
                        {proposal.proposer_name} • {new Date(proposal.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-6">
            {pendingQuestionsFiltered.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                  Nieuwe Vragen
                </h3>
                <div className="space-y-3">
                  {pendingQuestionsFiltered.map((question) => (
                    <div key={question.id} className="bg-white rounded-lg border-2 border-yellow-300 p-4">
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            {question.episode_title} • {question.topic_title}
                          </span>
                          {getStatusBadge(question.status)}
                        </div>
                        <div className="font-medium text-gray-900">{question.question}</div>
                      </div>

                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <User className="w-3 h-3 mr-1" />
                        {question.submitter_name} • {new Date(question.created_at).toLocaleDateString('nl-NL')}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateQuestionStatus(question.id, 'approved')}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Goedkeuren
                        </button>
                        <button
                          onClick={() => updateQuestionStatus(question.id, 'rejected')}
                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Afwijzen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewedQuestions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Beoordeelde Vragen</h3>
                <div className="space-y-3">
                  {reviewedQuestions.map((question) => (
                    <div key={question.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">
                              {question.episode_title} • {question.topic_title}
                            </span>
                            {getStatusBadge(question.status)}
                          </div>
                          <div className="font-medium text-gray-900">{question.question}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="w-3 h-3 mr-1" />
                        {question.submitter_name} • {new Date(question.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
