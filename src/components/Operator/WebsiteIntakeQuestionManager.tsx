import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Save, X, AlertCircle, CheckCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react';

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
  is_active: boolean;
}

type QuestionFormData = Omit<Question, 'id'>;

export default function WebsiteIntakeQuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<QuestionFormData>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [optionsInput, setOptionsInput] = useState('');

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_intake_questions')
        .select('*')
        .order('display_order');

      if (error) throw error;

      // Ensure options is always an array
      const processedData = (data || []).map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : []
      }));

      setQuestions(processedData);
    } catch (error: any) {
      console.error('Error loading questions:', error);
      showMessage('error', `Fout bij laden van vragen: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startNewQuestion = () => {
    const maxOrder = Math.max(...questions.map((q) => q.display_order), 0);
    const maxSection = Math.max(...questions.map((q) => q.section_number), 0);

    setFormData({
      section_number: maxSection,
      section_title: '',
      question_number: '',
      question_text: '',
      question_type: 'short_text',
      options: [],
      is_required: false,
      help_text: null,
      display_order: maxOrder + 10,
      is_active: true,
    });
    setOptionsInput('');
    setEditingId(null);
    setShowForm(true);
  };

  const editQuestion = (question: Question) => {
    setFormData(question);
    setOptionsInput(question.options.join('\n'));
    setEditingId(question.id);
    setShowForm(true);
  };

  const saveQuestion = async () => {
    if (!formData.question_text || !formData.section_title) {
      showMessage('error', 'Vul minimaal sectie titel en vraag tekst in');
      return;
    }

    try {
      setSaving(true);

      const options = optionsInput
        .split('\n')
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0);

      const questionData = {
        ...formData,
        options: ['single_choice', 'multiple_choice'].includes(formData.question_type || '')
          ? options
          : [],
      };

      if (editingId) {
        const { error } = await supabase
          .from('website_intake_questions')
          .update(questionData)
          .eq('id', editingId);

        if (error) throw error;
        showMessage('success', 'Vraag bijgewerkt');
      } else {
        const { error } = await supabase
          .from('website_intake_questions')
          .insert([questionData]);

        if (error) throw error;
        showMessage('success', 'Vraag toegevoegd');
      }

      setShowForm(false);
      setFormData({});
      setOptionsInput('');
      setEditingId(null);
      await loadQuestions();
    } catch (error: any) {
      console.error('Error saving question:', error);
      showMessage('error', `Fout bij opslaan vraag: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze vraag wilt verwijderen?')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('website_intake_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showMessage('success', 'Vraag verwijderd');
      await loadQuestions();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      showMessage('error', `Fout bij verwijderen vraag: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('website_intake_questions')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      showMessage('success', currentActive ? 'Vraag gedeactiveerd' : 'Vraag geactiveerd');
      await loadQuestions();
    } catch (error: any) {
      console.error('Error toggling active:', error);
      showMessage('error', `Fout bij wijzigen status: ${error.message}`);
    }
  };

  const moveQuestion = async (id: string, direction: 'up' | 'down') => {
    const index = questions.findIndex((q) => q.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const currentQuestion = questions[index];
    const swapQuestion = questions[direction === 'up' ? index - 1 : index + 1];

    try {
      const { error: error1 } = await supabase
        .from('website_intake_questions')
        .update({ display_order: swapQuestion.display_order })
        .eq('id', currentQuestion.id);

      const { error: error2 } = await supabase
        .from('website_intake_questions')
        .update({ display_order: currentQuestion.display_order })
        .eq('id', swapQuestion.id);

      if (error1 || error2) throw error1 || error2;

      await loadQuestions();
    } catch (error: any) {
      console.error('Error moving question:', error);
      showMessage('error', `Fout bij verplaatsen vraag: ${error.message}`);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Website Intake Vragen Beheer</h2>
          <p className="text-gray-600 mt-1">Beheer de vragen voor het website intake formulier</p>
        </div>
        <button
          onClick={startNewQuestion}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe vraag</span>
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

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Vraag bewerken' : 'Nieuwe vraag'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sectie nummer
              </label>
              <input
                type="number"
                value={formData.section_number || ''}
                onChange={(e) => setFormData({ ...formData, section_number: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vraag nummer (bijv. 1.1)
              </label>
              <input
                type="text"
                value={formData.question_number || ''}
                onChange={(e) => setFormData({ ...formData, question_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sectie titel
            </label>
            <input
              type="text"
              value={formData.section_title || ''}
              onChange={(e) => setFormData({ ...formData, section_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vraag tekst
            </label>
            <input
              type="text"
              value={formData.question_text || ''}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vraag type
            </label>
            <select
              value={formData.question_type || 'short_text'}
              onChange={(e) => setFormData({ ...formData, question_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="short_text">Kort tekstveld</option>
              <option value="textarea">Lang tekstveld</option>
              <option value="single_choice">Enkele keuze (radio)</option>
              <option value="multiple_choice">Meerdere keuzes (checkbox)</option>
            </select>
          </div>

          {['single_choice', 'multiple_choice'].includes(formData.question_type || '') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opties (1 per regel)
              </label>
              <textarea
                value={optionsInput}
                onChange={(e) => setOptionsInput(e.target.value)}
                rows={5}
                placeholder="Optie 1&#10;Optie 2&#10;Optie 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help tekst (optioneel)
            </label>
            <input
              type="text"
              value={formData.help_text || ''}
              onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volgorde
              </label>
              <input
                type="number"
                value={formData.display_order || 0}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_required || false}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Verplicht veld</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={saveQuestion}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>Opslaan</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groupedQuestions).map(([sectionNumber, section]) => (
          <div key={sectionNumber} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {sectionNumber}. {section.title}
              </h3>
            </div>

            <div className="divide-y">
              {section.questions.map((question, index) => (
                <div key={question.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {question.question_number}
                        </span>
                        <span className="text-sm text-gray-700">{question.question_text}</span>
                        {question.is_required && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Verplicht
                          </span>
                        )}
                        {!question.is_active && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            Inactief
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {question.question_type}
                        </span>
                        {question.options.length > 0 && (
                          <span>{question.options.length} opties</span>
                        )}
                      </div>

                      {question.help_text && (
                        <p className="text-sm text-gray-500 mt-1">{question.help_text}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 ml-4">
                      <button
                        onClick={() => moveQuestion(question.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Omhoog"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestion(question.id, 'down')}
                        disabled={index === section.questions.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Omlaag"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(question.id, question.is_active)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={question.is_active ? 'Deactiveren' : 'Activeren'}
                      >
                        {question.is_active ? '👁️' : '🚫'}
                      </button>
                      <button
                        onClick={() => editQuestion(question)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Bewerken"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
