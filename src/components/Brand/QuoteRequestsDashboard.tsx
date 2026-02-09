import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Mail, Phone, Calendar, Users, MapPin, Clock,
  CheckCircle, MessageSquare, Eye, X, Loader2, RefreshCw,
  AlertCircle, Send
} from 'lucide-react';

interface QuoteRequest {
  id: string;
  brand_id: string;
  travel_id: string | null;
  travel_title: string | null;
  travel_url: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  departure_date: string | null;
  number_of_persons: number;
  request_type: 'quote' | 'info' | 'contact';
  message: string | null;
  status: 'new' | 'read' | 'contacted' | 'quoted' | 'booked' | 'cancelled';
  notes: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'Nieuw', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  read: { label: 'Gelezen', color: 'bg-blue-100 text-blue-800', icon: Eye },
  contacted: { label: 'Contact opgenomen', color: 'bg-yellow-100 text-yellow-800', icon: Phone },
  quoted: { label: 'Offerte verstuurd', color: 'bg-purple-100 text-purple-800', icon: Send },
  booked: { label: 'Geboekt', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Geannuleerd', color: 'bg-gray-100 text-gray-800', icon: X },
};

export function QuoteRequestsDashboard() {
  const { effectiveBrandId } = useAuth();
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (effectiveBrandId) loadRequests();
  }, [effectiveBrandId, filterStatus]);

  async function loadRequests() {
    setLoading(true);
    try {
      let query = supabase!
        .from('travel_quote_requests')
        .select('*')
        .eq('brand_id', effectiveBrandId)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading quote requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(requestId: string, newStatus: string) {
    setSaving(true);
    try {
      const { error } = await supabase!
        .from('travel_quote_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      // Auto-mark as read when opening
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus as any } : r));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes(requestId: string) {
    setSaving(true);
    try {
      const { error } = await supabase!
        .from('travel_quote_requests')
        .update({ notes })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, notes } : r));
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, notes });
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSaving(false);
    }
  }

  function openRequest(request: QuoteRequest) {
    setSelectedRequest(request);
    setNotes(request.notes || '');
    // Auto-mark as read
    if (request.status === 'new') {
      updateStatus(request.id, 'read');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('nl-NL', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function getStatusBadge(status: string) {
    const config = statusConfig[status] || statusConfig.new;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  const newCount = requests.filter(r => r.status === 'new').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Aanvragen
            {newCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{newCount} nieuw</span>
            )}
          </h1>
          <p className="text-gray-600 text-sm mt-1">Bekijk en beheer offerte-, info- en contactaanvragen van je website bezoekers.</p>
        </div>
        <button onClick={loadRequests} className="p-2 hover:bg-gray-100 rounded-lg" title="Vernieuwen">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'new', label: 'Nieuw' },
            { key: 'read', label: 'Gelezen' },
            { key: 'contacted', label: 'Contact' },
            { key: 'quoted', label: 'Offerte' },
            { key: 'booked', label: 'Geboekt' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === f.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f.label}
              {f.key === 'new' && newCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{newCount}</span>
              )}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">{requests.length} aanvragen</span>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nog geen aanvragen ontvangen</p>
          <p className="text-sm text-gray-400 mt-1">Offerte-, info- en contactaanvragen van je WordPress website verschijnen hier</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Request List */}
          <div className={`${selectedRequest ? 'w-1/2' : 'w-full'} transition-all`}>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reis</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map(req => (
                    <tr key={req.id}
                      onClick={() => openRequest(req)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedRequest?.id === req.id ? 'bg-orange-50' : ''
                      } ${req.status === 'new' ? 'font-semibold' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{req.customer_name}</div>
                        <div className="text-xs text-gray-500">{req.customer_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700 max-w-[200px] truncate">
                          {req.travel_title || req.travel_id || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          req.request_type === 'quote' ? 'bg-orange-100 text-orange-700' 
                          : req.request_type === 'contact' ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                        }`}>
                          {req.request_type === 'quote' ? 'Offerte' : req.request_type === 'contact' ? 'Contact' : 'Info'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(req.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {selectedRequest && (
            <div className="w-1/2">
              <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Aanvraag Details</h3>
                  <button onClick={() => setSelectedRequest(null)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <button key={key}
                        onClick={() => updateStatus(selectedRequest.id, key)}
                        disabled={saving}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedRequest.status === key
                            ? config.color + ' ring-2 ring-offset-1 ring-gray-300'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{selectedRequest.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${selectedRequest.customer_email}`} className="text-blue-600 hover:underline">
                      {selectedRequest.customer_email}
                    </a>
                  </div>
                  {selectedRequest.customer_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${selectedRequest.customer_phone}`} className="text-blue-600 hover:underline">
                        {selectedRequest.customer_phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Travel Info */}
                <div className="space-y-3 mb-4">
                  {selectedRequest.travel_title && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">Reis</label>
                      <div className="text-sm font-medium text-gray-900">{selectedRequest.travel_title}</div>
                      {selectedRequest.travel_url && (
                        <a href={selectedRequest.travel_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">Bekijk op website</a>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRequest.departure_date && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-0.5">Vertrekdatum</label>
                        <div className="text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(selectedRequest.departure_date).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">Personen</label>
                      <div className="text-sm flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        {selectedRequest.number_of_persons}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Type aanvraag</label>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      selectedRequest.request_type === 'quote' ? 'bg-orange-100 text-orange-700' 
                      : selectedRequest.request_type === 'contact' ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedRequest.request_type === 'quote' ? 'Offerte Aanvraag' : selectedRequest.request_type === 'contact' ? 'Contact Aanvraag' : 'Info Aanvraag'}
                    </span>
                  </div>
                </div>

                {/* Message */}
                {selectedRequest.message && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Bericht van klant</label>
                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedRequest.message}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Interne notities</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Voeg notities toe..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => saveNotes(selectedRequest.id)}
                    disabled={saving}
                    className="mt-2 px-4 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:bg-gray-400 flex items-center gap-1">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                    Notitie opslaan
                  </button>
                </div>

                {/* Meta */}
                <div className="text-xs text-gray-400 space-y-1 border-t pt-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ontvangen: {formatDate(selectedRequest.created_at)}
                  </div>
                  {selectedRequest.source_url && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Bron: {selectedRequest.source_url}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
