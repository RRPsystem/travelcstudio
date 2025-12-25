import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Image, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';

interface WordPressTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  example_site_url: string | null;
}

interface TemplateSelection {
  id: string;
  template_id: string;
  status: 'pending_setup' | 'in_progress' | 'active' | 'cancelled';
  selected_at: string;
  operator_notes: string | null;
  template: {
    name: string;
  };
}

export default function WordPressTemplateChooser() {
  const { brandId } = useAuth();
  const [templates, setTemplates] = useState<WordPressTemplate[]>([]);
  const [currentSelection, setCurrentSelection] = useState<TemplateSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brandId) {
      loadData();
    }
  }, [brandId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadTemplates(), loadCurrentSelection()]);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('wordpress_site_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const loadCurrentSelection = async () => {
    if (!brandId) return;

    const { data, error } = await supabase
      .from('wordpress_template_selections')
      .select(`
        *,
        template:wordpress_site_templates(name)
      `)
      .eq('brand_id', brandId)
      .maybeSingle();

    if (error) {
      console.error('Error loading selection:', error);
      return;
    }

    setCurrentSelection(data);
  };

  const selectTemplate = async (templateId: string) => {
    if (!brandId) return;

    setSaving(true);

    if (currentSelection) {
      if (currentSelection.status === 'pending_setup') {
        const { error } = await supabase
          .from('wordpress_template_selections')
          .update({
            template_id: templateId,
            selected_at: new Date().toISOString(),
          })
          .eq('id', currentSelection.id);

        if (error) {
          console.error('Error updating selection:', error);
          alert('Fout bij wijzigen template keuze');
          setSaving(false);
          return;
        }
      } else {
        alert('Je template is al in behandeling. Neem contact op met de operator om deze te wijzigen.');
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('wordpress_template_selections')
        .insert({
          brand_id: brandId,
          template_id: templateId,
          status: 'pending_setup',
        });

      if (error) {
        console.error('Error creating selection:', error);
        alert('Fout bij selecteren template');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    loadCurrentSelection();
    alert('Template geselecteerd! De operator zal deze binnenkort voor je instellen.');
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending_setup: {
        label: 'Wacht op Setup',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock
      },
      in_progress: {
        label: 'Setup Bezig',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock
      },
      active: {
        label: 'Actief',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle
      },
      cancelled: {
        label: 'Geannuleerd',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle
      },
    };

    const { label, color, icon: Icon } = config[status as keyof typeof config] || config.pending_setup;

    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="font-medium">{label}</span>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WordPress Template Kiezen</h1>
        <p className="text-gray-600">Kies een professionele WordPress template voor jouw website</p>
      </div>

      {currentSelection && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Jouw Huidige Keuze</h3>
              <p className="text-gray-700 mb-3">
                Template: <span className="font-medium">{currentSelection.template.name}</span>
              </p>
              <div className="mb-3">
                {getStatusBadge(currentSelection.status)}
              </div>
              {currentSelection.operator_notes && (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Notities van operator:</p>
                  <p className="text-sm text-gray-600">{currentSelection.operator_notes}</p>
                </div>
              )}
            </div>
          </div>

          {currentSelection.status === 'pending_setup' && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600">
                Je kunt je template keuze wijzigen zolang de setup nog niet is begonnen.
              </p>
            </div>
          )}

          {currentSelection.status === 'in_progress' && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600">
                De operator is bezig met het instellen van je template. Dit kan enkele werkdagen duren.
              </p>
            </div>
          )}

          {currentSelection.status === 'active' && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600">
                Je WordPress website is succesvol ingesteld! Je kunt nu beginnen met het beheren van je content.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const isSelected = currentSelection?.template_id === template.id;
          const canSelect = !currentSelection || currentSelection.status === 'pending_setup';

          return (
            <div
              key={template.id}
              className={`bg-white rounded-lg border-2 overflow-hidden transition-all ${
                isSelected
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {template.preview_image_url ? (
                <img
                  src={template.preview_image_url}
                  alt={template.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-400" />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-xl">{template.name}</h3>
                  {isSelected && (
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  )}
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                )}

                <div className="space-y-3">
                  {template.example_site_url && (
                    <a
                      href={template.example_site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Bekijk Voorbeeld
                    </a>
                  )}

                  {canSelect && (
                    <button
                      onClick={() => selectTemplate(template.id)}
                      disabled={saving || isSelected}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 cursor-default'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-50`}
                    >
                      {saving ? 'Bezig...' : isSelected ? 'Geselecteerd' : 'Kies Deze Template'}
                    </button>
                  )}

                  {!canSelect && !isSelected && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      Je hebt al een template in behandeling
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen Templates Beschikbaar</h3>
          <p className="text-gray-600">
            Er zijn momenteel geen WordPress templates beschikbaar. Neem contact op met de operator.
          </p>
        </div>
      )}
    </div>
  );
}
