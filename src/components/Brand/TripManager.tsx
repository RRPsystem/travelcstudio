import React, { useState, useEffect } from 'react';
import {
  BookOpen, FileText, Package, Globe, Plus, Eye, Copy,
  ExternalLink, Trash2, Edit, Share2, Filter, CheckCircle, XCircle, Video
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { openTripBuilder, openVideoGenerator } from '../../lib/jwtHelper';

type TripType = 'roadbook' | 'offerte' | 'catalog' | 'wordpress' | 'custom';

interface Trip {
  id: string;
  title: string;
  slug: string;
  trip_type: TripType;
  share_token: string;
  share_url: string;
  type_label: string;
  description: string;
  price: number;
  duration_days: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  share_settings: {
    password_protected: boolean;
    expires_at: string | null;
    view_count: number;
    show_price: boolean;
    custom_message: string | null;
  };
}

const tripTypeConfig = {
  roadbook: {
    icon: BookOpen,
    label: '📚 Roadbooks',
    color: 'orange',
    description: 'Persoonlijke reisroutes voor klanten'
  },
  offerte: {
    icon: FileText,
    label: '💰 Offertes',
    color: 'green',
    description: 'Prijsoffertes en quotes'
  },
  catalog: {
    icon: Package,
    label: '📖 Catalogus',
    color: 'blue',
    description: 'Standaard reizen'
  },
  wordpress: {
    icon: Globe,
    label: '📝 WordPress',
    color: 'purple',
    description: 'Geïmporteerde reizen'
  },
  custom: {
    icon: Package,
    label: '🎯 Custom',
    color: 'gray',
    description: 'Overige reizen'
  }
};

export function TripManager() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TripType>('roadbook');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (user?.brand_id) {
      loadTrips();
    }
  }, [activeTab, user?.brand_id]);

  const loadTrips = async () => {
    if (!user?.brand_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips_with_share_url')
        .select('*')
        .eq('brand_id', user.brand_id)
        .eq('trip_type', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error loading trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyShareUrl = async (shareUrl: string, token: string) => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const openShareUrl = (shareUrl: string) => {
    window.open(shareUrl, '_blank');
  };

  const togglePublishStatus = async (tripId: string, currentStatus: string, title: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const action = newStatus === 'published' ? 'publiceren' : 'depubliceren';

    if (!confirm(`Weet je zeker dat je "${title}" wilt ${action}?`)) return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: newStatus })
        .eq('id', tripId);

      if (error) throw error;

      alert(`✅ Reis ${newStatus === 'published' ? 'gepubliceerd' : 'gedepubliceerd'}`);
      loadTrips();
    } catch (err) {
      console.error('Error updating trip status:', err);
      alert('❌ Fout bij wijzigen status');
    }
  };

  const deleteTrip = async (tripId: string, title: string) => {
    if (!confirm(`Weet je zeker dat je "${title}" wilt verwijderen?`)) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      alert('✅ Reis verwijderd');
      loadTrips();
    } catch (err) {
      console.error('Error deleting trip:', err);
      alert('❌ Fout bij verwijderen');
    }
  };

  const config = tripTypeConfig[activeTab];
  const Icon = config.icon;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reizen Beheer</h1>
        <p className="text-gray-600">
          Beheer je roadbooks, offertes en andere reizen
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4">
          {(Object.keys(tripTypeConfig) as TripType[]).map((type) => {
            const tabConfig = tripTypeConfig[type];
            const TabIcon = tabConfig.icon;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === type
                    ? `border-${tabConfig.color}-500 text-${tabConfig.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon size={18} />
                <span>{tabConfig.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Header met info */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${config.color}-100`}>
              <Icon className={`w-6 h-6 text-${config.color}-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{config.label}</h2>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (!user?.brand_id || !user?.id) {
                alert('Geen gebruiker gevonden');
                return;
              }

              if (activeTab === 'roadbook' || activeTab === 'offerte' || activeTab === 'catalog' || activeTab === 'custom') {
                try {
                  const returnUrl = `${window.location.origin}#/brand/content/trips`;
                  const deeplink = await openTripBuilder(user.brand_id, user.id, {
                    tripType: activeTab,
                    returnUrl
                  });
                  window.open(deeplink, '_blank');
                } catch (error) {
                  console.error('Error opening trip builder:', error);
                  alert('Fout bij openen van de builder');
                }
              } else {
                alert('Deze functie komt binnenkort');
              }
            }}
            className={`flex items-center space-x-2 px-4 py-2 bg-${config.color}-600 hover:bg-${config.color}-700 text-white rounded-lg transition-colors`}
          >
            <Plus size={18} />
            <span>Nieuwe {activeTab === 'roadbook' ? 'Roadbook' : activeTab === 'offerte' ? 'Offerte' : 'Reis'}</span>
          </button>
        </div>
      </div>

      {/* Trips lijst */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nog geen {config.label.toLowerCase()}
          </h3>
          <p className="text-gray-600 mb-4">
            Begin met het aanmaken van je eerste {activeTab}
          </p>
          <button
            onClick={async () => {
              if (!user?.brand_id || !user?.id) {
                alert('Geen gebruiker gevonden');
                return;
              }

              if (activeTab === 'roadbook' || activeTab === 'offerte' || activeTab === 'catalog' || activeTab === 'custom') {
                try {
                  const returnUrl = `${window.location.origin}#/brand/content/trips`;
                  const deeplink = await openTripBuilder(user.brand_id, user.id, {
                    tripType: activeTab,
                    returnUrl
                  });
                  window.open(deeplink, '_blank');
                } catch (error) {
                  console.error('Error opening trip builder:', error);
                  alert('Fout bij openen van de builder');
                }
              }
            }}
            className={`inline-flex items-center space-x-2 px-4 py-2 bg-${config.color}-600 hover:bg-${config.color}-700 text-white rounded-lg transition-colors`}
          >
            <Plus size={18} />
            <span>Maak {activeTab === 'roadbook' ? 'Roadbook' : 'Offerte'} aan</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex-1">{trip.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      trip.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {trip.status === 'published' ? '✓ Live' : 'Concept'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {trip.type_label}
                    </span>
                  </div>
                </div>

                {trip.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {trip.description}
                  </p>
                )}

                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
                  {trip.duration_days && (
                    <span>{trip.duration_days} dagen</span>
                  )}
                  {trip.price && (
                    <>
                      <span>•</span>
                      <span>€{trip.price}</span>
                    </>
                  )}
                </div>

                {/* Share URL */}
                {trip.share_url && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Deel link
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={trip.share_url}
                        readOnly
                        className="flex-1 text-xs px-2 py-1 bg-white border border-gray-300 rounded"
                      />
                      <button
                        onClick={() => copyShareUrl(trip.share_url, trip.share_token)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Kopieer link"
                      >
                        {copiedToken === trip.share_token ? (
                          <span className="text-green-600 text-xs">✓</span>
                        ) : (
                          <Copy size={14} className="text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={() => openShareUrl(trip.share_url)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Open in nieuw tabblad"
                      >
                        <ExternalLink size={14} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Share stats */}
                {trip.share_settings?.view_count > 0 && (
                  <div className="text-xs text-gray-500 mb-3">
                    <Eye size={12} className="inline mr-1" />
                    {trip.share_settings.view_count} keer bekeken
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        if (!user?.brand_id || !user?.id) {
                          alert('Geen gebruiker gevonden');
                          return;
                        }

                        try {
                          const returnUrl = `${window.location.origin}#/brand/content/trips`;
                          const deeplink = await openTripBuilder(user.brand_id, user.id, {
                            tripType: activeTab,
                            tripId: trip.id,
                            returnUrl
                          });
                          window.open(deeplink, '_blank');
                        } catch (error) {
                          console.error('Error opening trip builder:', error);
                          alert('Fout bij openen van de builder');
                        }
                      }}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                    >
                      <Edit size={14} />
                      <span>Bewerk</span>
                    </button>
                    <button
                      onClick={() => deleteTrip(trip.id, trip.title)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Verwijder"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      if (!user?.brand_id || !user?.id) {
                        alert('Geen gebruiker gevonden');
                        return;
                      }

                      try {
                        const returnUrl = `${window.location.origin}#/brand/content/trips`;
                        const deeplink = await openVideoGenerator(user.brand_id, user.id, {
                          mode: 'trip',
                          tripId: trip.id,
                          tripTitle: trip.title,
                          returnUrl
                        });
                        window.open(deeplink, '_blank');
                      } catch (error) {
                        console.error('Error opening video generator:', error);
                        alert('Fout bij openen van de video generator');
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm transition-colors"
                    title="Maak video van deze reis"
                  >
                    <Video size={14} />
                    <span>Maak Video</span>
                  </button>
                  <button
                    onClick={() => togglePublishStatus(trip.id, trip.status, trip.title)}
                    className={`w-full flex items-center justify-center space-x-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      trip.status === 'published'
                        ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                        : 'bg-green-50 hover:bg-green-100 text-green-700'
                    }`}
                  >
                    {trip.status === 'published' ? (
                      <>
                        <XCircle size={14} />
                        <span>Depubliceer</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        <span>Publiceer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
