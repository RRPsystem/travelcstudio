import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, DollarSign, Settings, Save, AlertCircle, CheckCircle, Euro } from 'lucide-react';

interface CreditPrice {
  id: string;
  action_type: string;
  action_label: string;
  cost_credits: number;
  enabled: boolean;
}

interface SystemSettings {
  id: string;
  enabled: boolean;
  mollie_api_key: string | null;
  credits_per_euro: number;
  minimum_purchase_eur: number;
}

export default function CreditSystemManagement() {
  const [prices, setPrices] = useState<CreditPrice[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editedPrices, setEditedPrices] = useState<{ [key: string]: number }>({});
  const [editedSettings, setEditedSettings] = useState<Partial<SystemSettings>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pricesRes, settingsRes] = await Promise.all([
        supabase.from('credit_prices').select('*').order('action_label'),
        supabase.from('credit_system_settings').select('*').single()
      ]);

      if (pricesRes.error) throw pricesRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setPrices(pricesRes.data || []);
      setSettings(settingsRes.data);
      setEditedSettings(settingsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Fout bij laden van gegevens' });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (actionType: string, value: number) => {
    setEditedPrices(prev => ({ ...prev, [actionType]: value }));
  };

  const handleToggleEnabled = async (actionType: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('credit_prices')
        .update({ enabled: !currentEnabled })
        .eq('action_type', actionType);

      if (error) throw error;

      setPrices(prev => prev.map(p =>
        p.action_type === actionType ? { ...p, enabled: !currentEnabled } : p
      ));

      setMessage({ type: 'success', text: 'Status bijgewerkt' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling enabled:', error);
      setMessage({ type: 'error', text: 'Fout bij wijzigen status' });
    }
  };

  const handleSavePrices = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedPrices).map(([action_type, cost_credits]) =>
        supabase
          .from('credit_prices')
          .update({ cost_credits })
          .eq('action_type', action_type)
      );

      await Promise.all(updates);

      await loadData();
      setEditedPrices({});
      setMessage({ type: 'success', text: 'Prijzen succesvol opgeslagen' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving prices:', error);
      setMessage({ type: 'error', text: 'Fout bij opslaan prijzen' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('credit_system_settings')
        .update({
          ...editedSettings,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings!.id);

      if (error) throw error;

      await loadData();
      setMessage({ type: 'success', text: 'Instellingen succesvol opgeslagen' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Fout bij opslaan instellingen' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSystem = async () => {
    if (!settings) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newEnabled = !settings.enabled;

      const { error } = await supabase
        .from('credit_system_settings')
        .update({
          enabled: newEnabled,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, enabled: newEnabled } : null);
      setEditedSettings(prev => ({ ...prev, enabled: newEnabled }));

      setMessage({
        type: 'success',
        text: newEnabled ? 'Credit systeem ingeschakeld' : 'Credit systeem uitgeschakeld'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling system:', error);
      setMessage({ type: 'error', text: 'Fout bij wijzigen systeem status' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  const hasUnsavedPrices = Object.keys(editedPrices).length > 0;
  const hasUnsavedSettings = settings && (
    editedSettings.mollie_api_key !== settings.mollie_api_key ||
    editedSettings.credits_per_euro !== settings.credits_per_euro ||
    editedSettings.minimum_purchase_eur !== settings.minimum_purchase_eur
  );

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Credit Systeem</h2>
          </div>
          <button
            onClick={handleToggleSystem}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              settings?.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {settings?.enabled ? 'Systeem Uitschakelen' : 'Systeem Inschakelen'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mollie API Key
            </label>
            <input
              type="password"
              value={editedSettings.mollie_api_key || ''}
              onChange={(e) => setEditedSettings(prev => ({ ...prev, mollie_api_key: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="live_..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Je kunt je API key vinden in je Mollie dashboard
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credits per Euro
              </label>
              <input
                type="number"
                value={editedSettings.credits_per_euro || 10}
                onChange={(e) => setEditedSettings(prev => ({ ...prev, credits_per_euro: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
              <p className="mt-1 text-sm text-gray-500">
                Hoeveel credits krijgt men per €1
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Aankoop (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={editedSettings.minimum_purchase_eur || 10}
                onChange={(e) => setEditedSettings(prev => ({ ...prev, minimum_purchase_eur: parseFloat(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0.01"
              />
              <p className="mt-1 text-sm text-gray-500">
                Minimum bedrag per aankoop
              </p>
            </div>
          </div>

          {hasUnsavedSettings && (
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Credit Prijzen</h2>
        </div>

        <div className="space-y-4">
          {prices.map((price) => {
            const currentValue = editedPrices[price.action_type] ?? price.cost_credits;

            return (
              <div key={price.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => handleToggleEnabled(price.action_type, price.enabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      price.enabled ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      price.enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>

                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{price.action_label}</div>
                    <div className="text-sm text-gray-500">{price.action_type}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) => handlePriceChange(price.action_type, parseInt(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                      min="0"
                    />
                    <span className="text-gray-600">credits</span>
                  </div>

                  <div className="text-sm text-gray-500 w-20 text-right">
                    ≈ €{((currentValue / (settings?.credits_per_euro || 10)) || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasUnsavedPrices && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSavePrices}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Opslaan...' : 'Prijzen Opslaan'}
            </button>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Let op:</p>
              <p>Het credit systeem is momenteel <strong>{settings?.enabled ? 'ingeschakeld' : 'uitgeschakeld'}</strong>.
              {!settings?.enabled && ' Schakel het in om betalingen te kunnen ontvangen.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
