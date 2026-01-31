import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Loader2, AlertCircle, CheckCircle, FileText, Calendar, User, Building2 } from 'lucide-react';

interface Submission {
  id: string;
  brand_id: string;
  submitted_by: string | null;
  status: 'concept' | 'ingediend' | 'in_behandeling' | 'afgerond' | 'geannuleerd';
  submission_name: string | null;
  notes: string | null;
  created_at: string;
  submitted_at: string | null;
  brands: {
    name: string;
  };
  users: {
    email: string;
  } | null;
}

interface Question {
  id: string;
  section_number: number;
  section_title: string;
  question_number: string;
  question_text: string;
  question_type: string;
}

interface Answer {
  question_id: string;
  answer_text: string | null;
  answer_options: string[];
}

export default function WebsiteIntakeSubmissionManager() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadSubmissions();
    loadQuestions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_intake_submissions')
        .select(`
          *,
          brands (name),
          users (email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      showMessage('error', 'Fout bij laden van aanvragen');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('website_intake_questions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error loading questions:', error);
    }
  };

  const loadAnswers = async (submissionId: string) => {
    try {
      const { data, error } = await supabase
        .from('website_intake_answers')
        .select('*')
        .eq('submission_id', submissionId);

      if (error) throw error;

      const answersMap: Record<string, Answer> = {};
      data?.forEach((answer) => {
        answersMap[answer.question_id] = {
          question_id: answer.question_id,
          answer_text: answer.answer_text,
          answer_options: answer.answer_options || [],
        };
      });

      setAnswers(answersMap);
    } catch (error: any) {
      console.error('Error loading answers:', error);
      showMessage('error', 'Fout bij laden van antwoorden');
    }
  };

  const viewSubmission = async (submission: Submission) => {
    setSelectedSubmission(submission);
    await loadAnswers(submission.id);
  };

  const updateStatus = async (submissionId: string, newStatus: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('website_intake_submissions')
        .update({ status: newStatus })
        .eq('id', submissionId);

      if (error) throw error;

      showMessage('success', 'Status bijgewerkt');
      await loadSubmissions();

      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus as any });
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      showMessage('error', 'Fout bij bijwerken status');
    } finally {
      setSaving(false);
    }
  };

  const updateNotes = async (submissionId: string, notes: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('website_intake_submissions')
        .update({ notes })
        .eq('id', submissionId);

      if (error) throw error;

      showMessage('success', 'Notities opgeslagen');
    } catch (error: any) {
      console.error('Error updating notes:', error);
      showMessage('error', 'Fout bij opslaan notities');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      concept: 'bg-gray-100 text-gray-800',
      ingediend: 'bg-blue-100 text-blue-800',
      in_behandeling: 'bg-yellow-100 text-yellow-800',
      afgerond: 'bg-green-100 text-green-800',
      geannuleerd: 'bg-red-100 text-red-800',
    };
    const labels = {
      concept: 'Concept',
      ingediend: 'Ingediend',
      in_behandeling: 'In behandeling',
      afgerond: 'Afgerond',
      geannuleerd: 'Geannuleerd',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const groupedQuestions = questions.reduce((acc, question) => {
    if (!acc[question.section_number]) {
      acc[question.section_number] = {
        title: question.section_title,
        questions: [],
      };
    }
    acc[question.section_number].questions.push(question);
    return acc;
  }, {} as Record<number, { title: string; questions: Question[] }>);

  const filteredSubmissions = filterStatus === 'all'
    ? submissions
    : submissions.filter((s) => s.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (selectedSubmission) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => {
              setSelectedSubmission(null);
              setAnswers({});
            }}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Terug naar overzicht
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedSubmission.submission_name || 'Naamloos'}
              </h2>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Building2 className="w-4 h-4" />
                  <span>{selectedSubmission.brands.name}</span>
                </div>
                {selectedSubmission.users && (
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{selectedSubmission.users.email}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedSubmission.created_at).toLocaleDateString('nl-NL')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(selectedSubmission.status)}
              <select
                value={selectedSubmission.status}
                onChange={(e) => updateStatus(selectedSubmission.id, e.target.value)}
                disabled={saving}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="concept">Concept</option>
                <option value="ingediend">Ingediend</option>
                <option value="in_behandeling">In behandeling</option>
                <option value="afgerond">Afgerond</option>
                <option value="geannuleerd">Geannuleerd</option>
              </select>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`flex items-center space-x-2 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operator notities</h3>
          <textarea
            defaultValue={selectedSubmission.notes || ''}
            onBlur={(e) => updateNotes(selectedSubmission.id, e.target.value)}
            rows={3}
            placeholder="Voeg notities toe..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-8">
          <h3 className="text-lg font-semibold text-gray-900">Antwoorden</h3>

          {Object.entries(groupedQuestions).map(([sectionNumber, section]) => (
            <div key={sectionNumber} className="space-y-4">
              <h4 className="text-base font-semibold text-gray-900 border-b pb-2">
                {sectionNumber}. {section.title}
              </h4>

              {section.questions.map((question) => {
                const answer = answers[question.id];
                let displayValue = '-';

                if (answer) {
                  if (question.question_type === 'multiple_choice') {
                    displayValue = answer.answer_options?.length > 0
                      ? answer.answer_options.join(', ')
                      : '-';
                  } else {
                    displayValue = answer.answer_text || '-';
                  }
                }

                return (
                  <div key={question.id} className="grid grid-cols-2 gap-4">
                    <div className="text-sm font-medium text-gray-700">
                      {question.question_number} {question.question_text}
                    </div>
                    <div className="text-sm text-gray-900">
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Website Intake Aanvragen</h2>
        <p className="text-gray-600 mt-1">Overzicht van alle website aanvragen van brands</p>
      </div>

      {message && (
        <div
          className={`flex items-center space-x-2 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">Filter:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle statussen</option>
          <option value="concept">Concept</option>
          <option value="ingediend">Ingediend</option>
          <option value="in_behandeling">In behandeling</option>
          <option value="afgerond">Afgerond</option>
          <option value="geannuleerd">Geannuleerd</option>
        </select>
        <span className="text-sm text-gray-500">
          ({filteredSubmissions.length} aanvra{filteredSubmissions.length === 1 ? 'ag' : 'gen'})
        </span>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Geen aanvragen gevonden</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Naam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aangemaakt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingediend
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.brands.name}
                    </div>
                    {submission.users && (
                      <div className="text-xs text-gray-500">{submission.users.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {submission.submission_name || 'Naamloos'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(submission.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.submitted_at
                      ? new Date(submission.submitted_at).toLocaleDateString('nl-NL')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => viewSubmission(submission)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Bekijken"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
