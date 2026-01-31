import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle, Loader2, Plus, Eye, Edit2, Trash2, Send } from 'lucide-react';

interface Question {
  id: string;
  section_number: number;
  section_title: string;
  question_number: string;
  question_text: string;
  question_type: 'text' | 'short_text' | 'single_choice' | 'multiple_choice' | 'textarea';
  options: string[];
  is_required: boolean;
  help_text: string | null;
  display_order: number;
}

interface Submission {
  id: string;
  submission_name: string | null;
  status: 'concept' | 'ingediend' | 'in_behandeling' | 'afgerond' | 'geannuleerd';
  created_at: string;
  submitted_at: string | null;
}

interface Answer {
  question_id: string;
  answer_text: string | null;
  answer_options: string[];
}

export default function WebsiteIntakeForm() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');

  useEffect(() => {
    loadQuestions();
    loadSubmissions();
  }, []);

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
      showMessage('error', 'Fout bij laden van vragen');
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_intake_submissions')
        .select('*')
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

  const startNewSubmission = async () => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('website_intake_submissions')
        .insert({
          brand_id: user?.brand_id,
          submitted_by: user?.id,
          status: 'concept',
          submission_name: `Aanvraag ${new Date().toLocaleDateString('nl-NL')}`,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSubmission(data.id);
      setAnswers({});
      setView('form');
      showMessage('success', 'Nieuwe aanvraag gestart');
      await loadSubmissions();
    } catch (error: any) {
      console.error('Error creating submission:', error);
      showMessage('error', 'Fout bij aanmaken aanvraag');
    } finally {
      setSaving(false);
    }
  };

  const editSubmission = async (submissionId: string) => {
    setCurrentSubmission(submissionId);
    await loadAnswers(submissionId);
    setView('form');
  };

  const viewSubmission = async (submissionId: string) => {
    setCurrentSubmission(submissionId);
    await loadAnswers(submissionId);
    setView('form');
  };

  const deleteSubmission = async (submissionId: string) => {
    if (!confirm('Weet je zeker dat je deze aanvraag wilt verwijderen?')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('website_intake_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;

      showMessage('success', 'Aanvraag verwijderd');
      await loadSubmissions();

      if (currentSubmission === submissionId) {
        setCurrentSubmission(null);
        setAnswers({});
        setView('list');
      }
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      showMessage('error', 'Fout bij verwijderen aanvraag');
    } finally {
      setSaving(false);
    }
  };

  const saveAnswer = async (questionId: string, answer: Answer) => {
    if (!currentSubmission) return;

    try {
      const { error } = await supabase
        .from('website_intake_answers')
        .upsert({
          submission_id: currentSubmission,
          question_id: questionId,
          answer_text: answer.answer_text,
          answer_options: answer.answer_options,
        });

      if (error) throw error;

      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }));
    } catch (error: any) {
      console.error('Error saving answer:', error);
      showMessage('error', 'Fout bij opslaan antwoord');
    }
  };

  const handleInputChange = (question: Question, value: string | string[]) => {
    const answer: Answer = {
      question_id: question.id,
      answer_text: typeof value === 'string' ? value : null,
      answer_options: Array.isArray(value) ? value : [],
    };

    saveAnswer(question.id, answer);
  };

  const submitForm = async () => {
    if (!currentSubmission) return;

    // Check required fields
    const missingRequired = questions
      .filter((q) => q.is_required)
      .filter((q) => {
        const answer = answers[q.id];
        if (!answer) return true;
        if (q.question_type === 'multiple_choice') {
          return !answer.answer_options || answer.answer_options.length === 0;
        }
        return !answer.answer_text;
      });

    if (missingRequired.length > 0) {
      showMessage('error', `Vul alle verplichte velden in (${missingRequired.length} ontbreken)`);
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('website_intake_submissions')
        .update({
          status: 'ingediend',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', currentSubmission);

      if (error) throw error;

      showMessage('success', 'Aanvraag ingediend! We nemen contact met je op.');
      await loadSubmissions();
      setCurrentSubmission(null);
      setAnswers({});
      setView('list');
    } catch (error: any) {
      console.error('Error submitting form:', error);
      showMessage('error', 'Fout bij indienen aanvraag');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    showMessage('success', 'Concept opgeslagen');
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

  const currentSubmissionData = submissions.find((s) => s.id === currentSubmission);
  const isReadOnly = currentSubmissionData?.status !== 'concept';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Website Intake Formulieren</h2>
            <p className="text-gray-600 mt-1">Vraag een nieuwe website aan of bekijk eerdere aanvragen</p>
          </div>
          <button
            onClick={startNewSubmission}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>Nieuwe aanvraag</span>
          </button>
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

        {submissions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Nog geen aanvragen. Start je eerste website aanvraag!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
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
                      <div className="flex items-center justify-end space-x-2">
                        {submission.status === 'concept' ? (
                          <button
                            onClick={() => editSubmission(submission.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Bewerken"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => viewSubmission(submission.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Bekijken"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {submission.status === 'concept' && (
                          <button
                            onClick={() => deleteSubmission(submission.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => {
              setView('list');
              setCurrentSubmission(null);
              setAnswers({});
            }}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Terug naar overzicht
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {isReadOnly ? 'Aanvraag bekijken' : 'Website Intake Formulier'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isReadOnly
              ? 'Bekijk je ingediende aanvraag'
              : 'Vul het formulier in om een website aan te vragen'}
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex items-center space-x-2">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Opslaan als concept
            </button>
            <button
              onClick={submitForm}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>Indienen</span>
            </button>
          </div>
        )}
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

      <div className="bg-white rounded-lg shadow p-6 space-y-8">
        {Object.entries(groupedQuestions).map(([sectionNumber, section]) => (
          <div key={sectionNumber} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              {sectionNumber}. {section.title}
            </h3>

            {section.questions.map((question) => {
              const answer = answers[question.id];

              return (
                <div key={question.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {question.question_number} {question.question_text}
                    {question.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {question.help_text && (
                    <p className="text-sm text-gray-500">{question.help_text}</p>
                  )}

                  {question.question_type === 'short_text' && (
                    <input
                      type="text"
                      value={answer?.answer_text || ''}
                      onChange={(e) => handleInputChange(question, e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  )}

                  {question.question_type === 'textarea' && (
                    <textarea
                      value={answer?.answer_text || ''}
                      onChange={(e) => handleInputChange(question, e.target.value)}
                      disabled={isReadOnly}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  )}

                  {question.question_type === 'single_choice' && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label key={option} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answer?.answer_text === option}
                            onChange={(e) => handleInputChange(question, e.target.value)}
                            disabled={isReadOnly}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label key={option} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            value={option}
                            checked={answer?.answer_options?.includes(option) || false}
                            onChange={(e) => {
                              const currentOptions = answer?.answer_options || [];
                              const newOptions = e.target.checked
                                ? [...currentOptions, option]
                                : currentOptions.filter((o) => o !== option);
                              handleInputChange(question, newOptions);
                            }}
                            disabled={isReadOnly}
                            className="text-blue-600 focus:ring-blue-500 rounded"
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
