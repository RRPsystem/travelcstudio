import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Star,
  Phone,
  MessageCircle,
  Award,
  Briefcase,
  Mail,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Agent, AgentReview, CustomLink } from '../../types/database';

interface AgentProfileProps {
  slug: string;
}

export default function AgentProfile({ slug }: AgentProfileProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'reviews' | 'contact'>('trips');

  useEffect(() => {
    loadAgent();
  }, [slug]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      setAgent(data);

      if (data?.id) {
        await loadReviews(data.id);
      }
    } catch (error) {
      console.error('Error loading agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_reviews')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const displayLocation = () => {
    if (agent?.city && agent?.province) {
      return `${agent.city}, ${agent.province}`;
    }
    return agent?.city || agent?.province || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Agent niet gevonden</h2>
          <p className="text-gray-600">Deze reisadviseur bestaat niet of is niet gepubliceerd.</p>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative h-80 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&h=400&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-800/80" />

        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-end pb-8">
          <div className="flex items-end gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-white p-1 shadow-xl">
                {agent.profile_image_url ? (
                  <img
                    src={agent.profile_image_url}
                    alt={agent.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                    {agent.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="pb-4 text-white">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{agent.name}</h1>
                {agent.is_top_advisor && (
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    TOP ADVISEUR
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6 text-white/90">
                {displayLocation() && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>{displayLocation()}</span>
                  </div>
                )}
                {avgRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{avgRating}</span>
                    <span className="text-sm">({reviews.length} reviews)</span>
                  </div>
                )}
              </div>

              {agent.specializations && agent.specializations.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {agent.specializations.map((spec, index) => (
                    <span
                      key={index}
                      className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <nav className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-8 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overzicht
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`px-8 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'trips'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Reizen
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-8 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-8 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'contact'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Contact
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Over {agent.name}</h2>
                {agent.bio ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{agent.bio}</p>
                ) : (
                  <p className="text-gray-500 italic">Geen informatie beschikbaar</p>
                )}
              </div>
            )}

            {activeTab === 'trips' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Aanbevolen Reizen</h2>
                {(agent.recommended_trip_1 || agent.recommended_trip_2 || agent.recommended_trip_3) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agent.recommended_trip_1 && (
                      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="text-sm text-gray-500 mb-1">Reis ID</div>
                        <div className="font-semibold text-blue-600">{agent.recommended_trip_1}</div>
                        <div className="text-xs text-gray-400 mt-2">Deze reis wordt binnenkort gekoppeld</div>
                      </div>
                    )}
                    {agent.recommended_trip_2 && (
                      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="text-sm text-gray-500 mb-1">Reis ID</div>
                        <div className="font-semibold text-blue-600">{agent.recommended_trip_2}</div>
                        <div className="text-xs text-gray-400 mt-2">Deze reis wordt binnenkort gekoppeld</div>
                      </div>
                    )}
                    {agent.recommended_trip_3 && (
                      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="text-sm text-gray-500 mb-1">Reis ID</div>
                        <div className="font-semibold text-blue-600">{agent.recommended_trip_3}</div>
                        <div className="text-xs text-gray-400 mt-2">Deze reis wordt binnenkort gekoppeld</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nog geen reizen toegevoegd.</p>
                    <p className="text-sm mt-2">De agent kan reizen toevoegen via het profiel dashboard.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-gray-900 text-lg">{review.reviewer_name}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              {review.reviewer_location && <span>{review.reviewer_location}</span>}
                              {review.is_verified && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600 font-medium">✓ Geverifieerd</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${
                                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.trip_title && (
                          <div className="text-sm font-medium text-blue-600 mb-2">{review.trip_title}</div>
                        )}
                        <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
                        {review.travel_date && (
                          <div className="text-sm text-gray-500 mt-3">{review.travel_date}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nog geen reviews beschikbaar.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Neem contact op</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Email</div>
                      <a href={`mailto:${agent.email}`} className="text-blue-600 hover:underline">
                        {agent.email}
                      </a>
                    </div>
                  </div>
                  {agent.phone_visible && agent.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Telefoon</div>
                        <a href={`tel:${agent.phone}`} className="text-blue-600 hover:underline">
                          {agent.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Plan je droomreis!</h3>
              <p className="mb-6 text-blue-50">
                Neem contact op voor een persoonlijk reisadvies
              </p>

              <div className="space-y-3">
                {agent.phone_visible && agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="block w-full bg-white text-blue-600 hover:bg-blue-50 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Bel Nu
                  </a>
                )}
                {agent.whatsapp_enabled && agent.phone && (
                  <a
                    href={`https://wa.me/${agent.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <Briefcase className="w-5 h-5" />
                <h3 className="font-bold text-gray-900">Ervaring</h3>
              </div>

              {agent.years_experience && agent.years_experience > 0 && (
                <div className="mb-4">
                  <div className="text-3xl font-bold text-blue-600">{agent.years_experience} jaar</div>
                  <div className="text-sm text-gray-600">in de reisbranche</div>
                </div>
              )}

              {agent.specialist_since && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-gray-700">Specialist sinds {agent.specialist_since}</div>
                </div>
              )}
            </div>

            {agent.certifications && agent.certifications.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 text-blue-600 mb-4">
                  <Award className="w-5 h-5" />
                  <h3 className="font-bold text-gray-900">Certificaten</h3>
                </div>

                <div className="space-y-3">
                  {agent.certifications.map((cert, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agent.custom_links && agent.custom_links.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Links</h3>
                <div className="space-y-2">
                  {agent.custom_links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <span className="text-sm font-medium text-gray-900">{link.label}</span>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
