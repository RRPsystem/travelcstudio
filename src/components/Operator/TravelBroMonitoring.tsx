import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageCircle,
  Cpu,
  Ban,
  RefreshCw,
  Calendar,
  Clock
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BroStats {
  id: string;
  title: string;
  trip_start_date: string | null;
  trip_end_date: string | null;
  bro_status: 'active' | 'stopped' | 'expired';
  stopped_at: string | null;
  stopped_reason: string | null;
  stopped_by_email: string | null;
  auto_expire_days: number;
  expires_at: string | null;
  current_status: string;
  total_messages: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_openai_cost: number;
  revenue_eur: number;
  profit_eur: number;
  profit_margin_pct: number;
}

export function TravelBroMonitoring() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bros, setBros] = useState<BroStats[]>([]);
  const [stoppingBro, setStoppingBro] = useState<string | null>(null);

  useEffect(() => {
    loadBroStats();
  }, []);

  const loadBroStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.supabase
        .from('bro_monitoring_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBros(data || []);
    } catch (error) {
      console.error('Failed to load Bro stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopBro = async (broId: string, reason: string) => {
    if (!confirm(`Weet je zeker dat je deze Bro wilt stoppen?\n\nReden: ${reason}`)) {
      return;
    }

    try {
      setStoppingBro(broId);
      const { error } = await db.supabase
        .from('trips')
        .update({
          bro_status: 'stopped',
          stopped_at: new Date().toISOString(),
          stopped_by: user?.id,
          stopped_reason: reason
        })
        .eq('id', broId);

      if (error) throw error;
      await loadBroStats();
    } catch (error) {
      console.error('Failed to stop Bro:', error);
      alert('Fout bij stoppen van Bro');
    } finally {
      setStoppingBro(null);
    }
  };

  const reactivateBro = async (broId: string) => {
    if (!confirm('Weet je zeker dat je deze Bro wilt heractiveren?')) {
      return;
    }

    try {
      setStoppingBro(broId);
      const { error } = await db.supabase
        .from('trips')
        .update({
          bro_status: 'active',
          stopped_at: null,
          stopped_by: null,
          stopped_reason: null
        })
        .eq('id', broId);

      if (error) throw error;
      await loadBroStats();
    } catch (error) {
      console.error('Failed to reactivate Bro:', error);
      alert('Fout bij heractiveren van Bro');
    } finally {
      setStoppingBro(null);
    }
  };

  // Calculate overall stats
  const totalBros = bros.length;
  const activeBros = bros.filter(b => b.bro_status === 'active').length;
  const totalRevenue = bros.reduce((sum, b) => sum + b.revenue_eur, 0);
  const totalCosts = bros.reduce((sum, b) => sum + b.total_openai_cost, 0);
  const totalProfit = totalRevenue - totalCosts;
  const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 100;
  const profitableBros = bros.filter(b => b.profit_eur > 0).length;
  const profitablePercentage = totalBros > 0 ? (profitableBros / totalBros * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={loadBroStats}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          <span>Ververs</span>
        </button>
      </div>

      {/* Overall Statistics */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Overzicht</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Totaal Bros</div>
            <div className="text-2xl font-bold text-gray-900">{totalBros}</div>
            <div className="text-xs text-green-600 mt-1">{activeBros} actief</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Totale Omzet</div>
            <div className="text-2xl font-bold text-green-600">€{totalRevenue.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">{totalBros} × €10</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Totale Kosten</div>
            <div className="text-2xl font-bold text-red-600">€{totalCosts.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">OpenAI API</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Netto Winst</div>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{totalProfit.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{avgProfitMargin.toFixed(0)}% marge</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Winstgevend</div>
            <div className="text-2xl font-bold text-blue-600">{profitablePercentage.toFixed(0)}%</div>
            <div className="text-xs text-gray-500 mt-1">{profitableBros} van {totalBros}</div>
          </div>
        </div>

        {avgProfitMargin < 20 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-900">Lage winstmarge waarschuwing</div>
                <div className="text-sm text-yellow-800 mt-1">
                  De gemiddelde winstmarge is onder 20%. Overweeg:
                </div>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1 ml-4">
                  <li>• Prijs verhogen naar 150 credits (€15)</li>
                  <li>• Prompt optimaliseren om tokens te besparen</li>
                  <li>• Max berichten limiet instellen per trip</li>
                  <li>• GPT-4o-mini gebruiken voor simpele vragen (90% goedkoper)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Individual Bro Stats */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Per Bro Overzicht</h3>
          <p className="text-sm text-gray-600 mt-1">Details per TravelBro instantie</p>
        </div>

        <div className="divide-y divide-gray-200">
          {bros.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nog geen TravelBro instanties</p>
            </div>
          ) : (
            bros.map((bro) => {
              const isProfitable = bro.profit_eur > 0;
              const isExpiringSoon = bro.expires_at &&
                new Date(bro.expires_at) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

              return (
                <div key={bro.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{bro.title}</h4>
                        {bro.bro_status === 'active' && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Actief
                          </span>
                        )}
                        {bro.bro_status === 'stopped' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            Gestopt
                          </span>
                        )}
                        {bro.bro_status === 'expired' && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                            Verlopen
                          </span>
                        )}
                        {isProfitable ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </div>

                      {bro.trip_start_date && bro.trip_end_date && (
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(bro.trip_start_date).toLocaleDateString('nl-NL')} - {new Date(bro.trip_end_date).toLocaleDateString('nl-NL')}</span>
                          </div>
                          {bro.expires_at && (
                            <div className={`flex items-center space-x-1 ${isExpiringSoon ? 'text-orange-600' : ''}`}>
                              <Clock className="w-4 h-4" />
                              <span>Verloopt: {new Date(bro.expires_at).toLocaleDateString('nl-NL')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {bro.stopped_reason && (
                        <div className="text-sm text-red-600 mb-2">
                          <strong>Reden:</strong> {bro.stopped_reason}
                          {bro.stopped_by_email && ` (door ${bro.stopped_by_email})`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {bro.bro_status === 'active' ? (
                        <button
                          onClick={() => {
                            const reason = prompt('Reden voor stoppen:', 'Te hoge kosten / misbruik');
                            if (reason) stopBro(bro.id, reason);
                          }}
                          disabled={stoppingBro === bro.id}
                          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Stop Bro</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateBro(bro.id)}
                          disabled={stoppingBro === bro.id}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Heractiveer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Berichten</div>
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{bro.total_messages}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Tokens</div>
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{(bro.total_tokens / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {(bro.total_input_tokens / 1000).toFixed(1)}K in / {(bro.total_output_tokens / 1000).toFixed(1)}K uit
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Omzet</div>
                      <div className="font-medium text-green-600">€{bro.revenue_eur.toFixed(2)}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">OpenAI Kosten</div>
                      <div className="font-medium text-red-600">€{bro.total_openai_cost.toFixed(2)}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Winst</div>
                      <div className={`font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                        {isProfitable ? '+' : ''}€{bro.profit_eur.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Marge</div>
                      <div className="flex items-center space-x-1">
                        {bro.profit_margin_pct >= 50 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : bro.profit_margin_pct < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-orange-600" />
                        )}
                        <span className={`font-medium ${
                          bro.profit_margin_pct >= 50 ? 'text-green-600' :
                          bro.profit_margin_pct < 0 ? 'text-red-600' :
                          'text-orange-600'
                        }`}>
                          {bro.profit_margin_pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
