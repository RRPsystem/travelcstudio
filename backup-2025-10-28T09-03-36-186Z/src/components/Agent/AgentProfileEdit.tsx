import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  Calendar,
  Star,
  Upload,
  Save,
  Eye,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  X,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import type { CustomLink, AgentReview } from '../../types/database';

interface AgentProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  slug: string;
  bio: string;
  profile_image_url: string;
  city: string;
  province: string;
  recommended_trip_1: string;
  recommended_trip_2: string;
  recommended_trip_3: string;
  custom_links: CustomLink[];
  specializations: string[];
  years_experience: number;
  rating: number;
  review_count: number;
  is_top_advisor: boolean;
  specialist_since: string;
  certifications: string[];
  phone_visible: boolean;
  whatsapp_enabled: boolean;
  is_published: boolean;
}

export default function AgentProfileEdit() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState<AgentProfile>({
    name: '',
    email: user?.email || '',
    phone: '',
    slug: '',
    bio: '',
    profile_image_url: '',
    city: '',
    province: '',
    recommended_trip_1: '',
    recommended_trip_2: '',
    recommended_trip_3: '',
    custom_links: [],
    specializations: [],
    years_experience: 0,
    rating: 0,
    review_count: 0,
    is_top_advisor: false,
    specialist_since: new Date().getFullYear().toString(),
    certifications: [],
    phone_visible: true,
    whatsapp_enabled: false,
    is_published: false
  });
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newLink, setNewLink] = useState<CustomLink>({ label: '', url: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    reviewer_name: '',
    reviewer_location: '',
    rating: 5,
    review_text: '',
    trip_title: '',
    travel_date: '',
    is_verified: false,
    is_published: true
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          ...data,
          specializations: data.specializations || [],
          certifications: data.certifications || [],
          custom_links: data.custom_links || []
        });

        await loadReviews(data.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage({ type: 'error', text: 'Fout bij laden van profiel' });
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Alleen afbeeldingen zijn toegestaan' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Afbeelding is te groot (max 5MB)' });
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'agent'}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agent-photos')
        .getPublicUrl(filePath);

      setProfile({ ...profile, profile_image_url: publicUrl });
      setMessage({ type: 'success', text: 'Foto succesvol geüpload!' });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: error.message || 'Fout bij uploaden' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      if (!profile.slug || profile.slug.trim() === '') {
        setMessage({ type: 'error', text: 'URL slug is verplicht' });
        return;
      }

      const profileData = {
        ...profile,
        email: user?.email,
        brand_id: user?.brand_id,
        updated_at: new Date().toISOString()
      };

      if (profile.id) {
        const { error } = await supabase
          .from('agents')
          .update(profileData)
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agents')
          .insert([profileData]);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Profiel succesvol opgeslagen!' });
      await loadProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: error.message || 'Fout bij opslaan van profiel' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddReview = async () => {
    if (!profile.id) {
      setMessage({ type: 'error', text: 'Sla eerst je profiel op' });
      return;
    }

    try {
      const { error } = await supabase
        .from('agent_reviews')
        .insert([{
          agent_id: profile.id,
          ...newReview
        }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Review toegevoegd!' });
      setShowReviewForm(false);
      setNewReview({
        reviewer_name: '',
        reviewer_location: '',
        rating: 5,
        review_text: '',
        trip_title: '',
        travel_date: '',
        is_verified: false,
        is_published: true
      });
      await loadReviews(profile.id);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fout bij toevoegen review' });
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Review verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('agent_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Review verwijderd' });
      if (profile.id) await loadReviews(profile.id);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fout bij verwijderen' });
    }
  };

  const toggleReviewPublished = async (reviewId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('agent_reviews')
        .update({ is_published: !currentStatus })
        .eq('id', reviewId);

      if (error) throw error;

      if (profile.id) await loadReviews(profile.id);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fout bij updaten' });
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !profile.specializations.includes(newSpecialization.trim())) {
      setProfile({
        ...profile,
        specializations: [...profile.specializations, newSpecialization.trim()]
      });
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setProfile({
      ...profile,
      specializations: profile.specializations.filter(s => s !== spec)
    });
  };

  const addCertification = () => {
    if (newCertification.trim() && !profile.certifications.includes(newCertification.trim())) {
      setProfile({
        ...profile,
        certifications: [...profile.certifications, newCertification.trim()]
      });
      setNewCertification('');
    }
  };

  const removeCertification = (cert: string) => {
    setProfile({
      ...profile,
      certifications: profile.certifications.filter(c => c !== cert)
    });
  };

  const addLink = () => {
    if (newLink.label.trim() && newLink.url.trim()) {
      setProfile({
        ...profile,
        custom_links: [...profile.custom_links, { ...newLink }]
      });
      setNewLink({ label: '', url: '' });
    }
  };

  const removeLink = (index: number) => {
    setProfile({
      ...profile,
      custom_links: profile.custom_links.filter((_, i) => i !== index)
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Basis Informatie</h2>
          {profile.slug && (
            <a
              href={`/agents/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Bekijk publiek profiel
            </a>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ImageIcon className="w-4 h-4 inline mr-1" />
            Profielfoto
          </label>
          <div className="flex items-center gap-4">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                {profile.name.charAt(0) || 'A'}
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="profile-photo"
                disabled={uploading}
              />
              <label
                htmlFor="profile-photo"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploaden...' : 'Upload Foto'}
              </label>
              <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Naam *
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => {
                const name = e.target.value;
                setProfile({
                  ...profile,
                  name,
                  slug: profile.slug || generateSlug(name)
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Je volledige naam"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Telefoon *
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+31 6 12345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Stad *
            </label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Zwolle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provincie *
            </label>
            <input
              type="text"
              value={profile.province}
              onChange={(e) => setProfile({ ...profile, province: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Overijssel"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Slug * (gebruikt voor profiel URL)
            </label>
            <input
              type="text"
              value={profile.slug}
              onChange={(e) => setProfile({ ...profile, slug: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="provincie/stad/je-naam"
            />
            <p className="text-xs text-gray-500 mt-1">Bijv: overijssel/zwolle/jan-jansen - Profiel wordt: /agents/{profile.slug}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio / Over mij
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Vertel wat over jezelf, je ervaring en passie voor reizen..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Ervaring & Expertise</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Jaren ervaring
            </label>
            <input
              type="number"
              value={profile.years_experience}
              onChange={(e) => setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialist sinds
            </label>
            <input
              type="text"
              value={profile.specialist_since}
              onChange={(e) => setProfile({ ...profile, specialist_since: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="2016"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Star className="w-4 h-4 inline mr-1" />
              Top Adviseur
            </label>
            <label className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                checked={profile.is_top_advisor}
                onChange={(e) => setProfile({ ...profile, is_top_advisor: e.target.checked })}
                className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Toon TOP ADVISEUR badge</span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specialisaties (bijv. Azië, Cultuurreizen)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newSpecialization}
              onChange={(e) => setNewSpecialization(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Voeg specialisatie toe"
            />
            <button
              type="button"
              onClick={addSpecialization}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Toevoegen
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.specializations.map((spec, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {spec}
                <button
                  type="button"
                  onClick={() => removeSpecialization(spec)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Award className="w-4 h-4 inline mr-1" />
            Certificaten
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCertification}
              onChange={(e) => setNewCertification(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Thailand Specialist Certificaat"
            />
            <button
              type="button"
              onClick={addCertification}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Toevoegen
            </button>
          </div>
          <div className="space-y-2">
            {profile.certifications.map((cert, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <span className="text-sm text-gray-700">{cert}</span>
                <button
                  type="button"
                  onClick={() => removeCertification(cert)}
                  className="text-red-600 hover:text-red-800"
                >
                  Verwijder
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Aanbevolen Reizen</h2>
        <p className="text-sm text-gray-600 mb-4">
          Voeg tot 3 reis ID's toe die op je publieke profiel getoond worden.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reis ID 1
            </label>
            <input
              type="text"
              value={profile.recommended_trip_1}
              onChange={(e) => setProfile({ ...profile, recommended_trip_1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Bijv: thailand-15-dagen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reis ID 2
            </label>
            <input
              type="text"
              value={profile.recommended_trip_2}
              onChange={(e) => setProfile({ ...profile, recommended_trip_2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Bijv: japan-rondreis"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reis ID 3
            </label>
            <input
              type="text"
              value={profile.recommended_trip_3}
              onChange={(e) => setProfile({ ...profile, recommended_trip_3: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Bijv: bali-vakantie"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          <LinkIcon className="w-5 h-5 inline mr-2" />
          Custom Links (voor sidebar menu)
        </h2>

        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={newLink.label}
              onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Label (bijv. Mijn Reizen)"
            />
            <div className="flex gap-2">
              <input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="URL (bijv. https://...)"
              />
              <button
                type="button"
                onClick={addLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {profile.custom_links.map((link, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900">{link.label}</div>
                <div className="text-sm text-gray-600">{link.url}</div>
              </div>
              <button
                type="button"
                onClick={() => removeLink(index)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
          {profile.custom_links.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Nog geen links toegevoegd</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            <MessageSquare className="w-5 h-5 inline mr-2" />
            Reviews ({reviews.length})
          </h2>
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showReviewForm ? 'Annuleren' : 'Review Toevoegen'}
          </button>
        </div>

        {showReviewForm && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Nieuwe Review</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={newReview.reviewer_name}
                onChange={(e) => setNewReview({ ...newReview, reviewer_name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Naam reviewer *"
              />
              <input
                type="text"
                value={newReview.reviewer_location}
                onChange={(e) => setNewReview({ ...newReview, reviewer_location: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Locatie reviewer"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <select
                  value={newReview.rating}
                  onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={5}>5 sterren</option>
                  <option value={4}>4 sterren</option>
                  <option value={3}>3 sterren</option>
                  <option value={2}>2 sterren</option>
                  <option value={1}>1 ster</option>
                </select>
              </div>
              <input
                type="text"
                value={newReview.trip_title}
                onChange={(e) => setNewReview({ ...newReview, trip_title: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Reis titel"
              />
              <input
                type="text"
                value={newReview.travel_date}
                onChange={(e) => setNewReview({ ...newReview, travel_date: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Reisdatum (bijv. Maart 2024)"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newReview.is_verified}
                    onChange={(e) => setNewReview({ ...newReview, is_verified: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Geverifieerd</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newReview.is_published}
                    onChange={(e) => setNewReview({ ...newReview, is_published: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Publiceren</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <textarea
                  value={newReview.review_text}
                  onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Review tekst *"
                />
              </div>
            </div>
            <button
              onClick={handleAddReview}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Review Opslaan
            </button>
          </div>
        )}

        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-900">{review.reviewer_name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {review.reviewer_location && <span>• {review.reviewer_location}</span>}
                    {review.is_verified && <span className="text-green-600">• Geverifieerd</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleReviewPublished(review.id, review.is_published)}
                    className={`px-3 py-1 rounded text-sm ${
                      review.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {review.is_published ? 'Gepubliceerd' : 'Concept'}
                  </button>
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {review.trip_title && (
                <div className="text-sm font-medium text-gray-700 mb-1">{review.trip_title}</div>
              )}
              <p className="text-gray-700 text-sm">{review.review_text}</p>
              {review.travel_date && (
                <div className="text-xs text-gray-500 mt-2">{review.travel_date}</div>
              )}
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">Nog geen reviews</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy & Zichtbaarheid</h2>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={profile.phone_visible}
              onChange={(e) => setProfile({ ...profile, phone_visible: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-900">Telefoon zichtbaar</div>
              <div className="text-sm text-gray-600">Toon je telefoonnummer op je publieke profiel</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={profile.whatsapp_enabled}
              onChange={(e) => setProfile({ ...profile, whatsapp_enabled: e.target.checked })}
              className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
            />
            <div>
              <div className="font-medium text-gray-900">WhatsApp inschakelen</div>
              <div className="text-sm text-gray-600">Toon WhatsApp contact knop op je profiel</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={profile.is_published}
              onChange={(e) => setProfile({ ...profile, is_published: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-900">Profiel publiceren</div>
              <div className="text-sm text-gray-600">Maak je profiel publiek zichtbaar op /agents/{profile.slug}</div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Opslaan...' : 'Profiel Opslaan'}
        </button>
      </div>
    </div>
  );
}
