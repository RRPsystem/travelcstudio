import React, { useState, useEffect } from 'react';
import { X, Search, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FlickrPhotoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  title?: string;
}

interface FlickrPhoto {
  id: string;
  title: string;
  url_m: string;
  url_z?: string;
  url_l?: string;
  url_o?: string;
  description?: string;
  owner_name?: string;
  date_taken?: string;
}

export default function FlickrPhotoPicker({ isOpen, onClose, onSelect, title = 'Selecteer Flickr Foto' }: FlickrPhotoPickerProps) {
  const [photos, setPhotos] = useState<FlickrPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState('');
  const [photosetId, setPhotosetId] = useState('');
  const [selectedSize, setSelectedSize] = useState<'medium' | 'large' | 'xlarge' | 'original'>('large');

  useEffect(() => {
    if (isOpen) {
      loadFlickrSettings();
    }
  }, [isOpen]);

  const loadFlickrSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('api_settings')
        .select('api_key, metadata')
        .eq('provider', 'Flickr')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setApiKey(data.api_key || '');
        if (data.metadata?.user_id) {
          setUserId(data.metadata.user_id);
        }
        if (data.metadata?.photoset_id) {
          setPhotosetId(data.metadata.photoset_id);
        }
      }
    } catch (err) {
      console.error('Error loading Flickr settings:', err);
      setError('Kon Flickr instellingen niet laden');
    }
  };

  const searchPhotos = async () => {
    if (!apiKey) {
      setError('Geen Flickr API key geconfigureerd. Vraag de operator om deze in te stellen.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let method = 'flickr.photos.search';
      let params: Record<string, string> = {
        api_key: apiKey,
        format: 'json',
        nojsoncallback: '1',
        extras: 'url_m,url_z,url_l,url_o,description,date_taken,owner_name',
        per_page: '20',
        sort: 'date-posted-desc'
      };

      if (photosetId) {
        method = 'flickr.photosets.getPhotos';
        params.photoset_id = photosetId;
        params.user_id = userId;
      } else if (userId) {
        params.user_id = userId;
      }

      if (searchQuery && !photosetId) {
        params.text = searchQuery;
      }

      const queryString = new URLSearchParams(params).toString();
      const url = `https://api.flickr.com/services/rest/?method=${method}&${queryString}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Flickr API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.stat !== 'ok') {
        throw new Error(data.message || 'Flickr API fout');
      }

      const photoList = photosetId ? data.photoset?.photo || [] : data.photos?.photo || [];
      setPhotos(photoList);

      if (photoList.length === 0) {
        setError('Geen foto\'s gevonden');
      }
    } catch (err: any) {
      console.error('Error searching Flickr photos:', err);
      setError(err.message || 'Fout bij ophalen foto\'s van Flickr');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchPhotos();
  };

  const handlePhotoSelect = (photo: FlickrPhoto) => {
    let url = photo.url_m;

    switch (selectedSize) {
      case 'medium':
        url = photo.url_m;
        break;
      case 'large':
        url = photo.url_z || photo.url_m;
        break;
      case 'xlarge':
        url = photo.url_l || photo.url_z || photo.url_m;
        break;
      case 'original':
        url = photo.url_o || photo.url_l || photo.url_z || photo.url_m;
        break;
    }

    onSelect(url);
    onClose();
  };

  useEffect(() => {
    if (isOpen && apiKey && (userId || photosetId)) {
      searchPhotos();
    }
  }, [isOpen, apiKey, userId, photosetId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ImageIcon className="text-pink-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={photosetId ? "Zoeken is uitgeschakeld bij album selectie" : "Zoek foto's..."}
                  disabled={!!photosetId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !!photosetId}
                className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Search size={20} />
                <span>{loading ? 'Zoeken...' : 'Zoeken'}</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Foto grootte:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSize('medium')}
                  className={`px-3 py-1 rounded ${selectedSize === 'medium' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize('large')}
                  className={`px-3 py-1 rounded ${selectedSize === 'large' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Large
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize('xlarge')}
                  className={`px-3 py-1 rounded ${selectedSize === 'xlarge' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Extra Large
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize('original')}
                  className={`px-3 py-1 rounded ${selectedSize === 'original' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Origineel
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!apiKey && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Flickr niet geconfigureerd.</strong> Vraag de operator om:
              </p>
              <ol className="mt-2 ml-4 list-decimal text-sm text-yellow-700">
                <li>Een Flickr API Key in te stellen</li>
                <li>Je Flickr User ID toe te voegen (optioneel)</li>
                <li>Een Photoset/Album ID in te stellen voor snelle toegang (optioneel)</li>
              </ol>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square cursor-pointer rounded-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105"
                  onClick={() => handlePhotoSelect(photo)}
                >
                  <img
                    src={photo.url_m}
                    alt={photo.title || 'Flickr foto'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center p-4">
                      <p className="text-sm font-medium line-clamp-2">{photo.title || 'Geen titel'}</p>
                      {photo.owner_name && (
                        <p className="text-xs mt-1">door {photo.owner_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !error && apiKey ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ImageIcon size={64} className="mb-4 text-gray-300" />
              <p className="text-lg">
                {photosetId ? 'Foto\'s uit je Flickr album worden geladen...' : 'Zoek foto\'s in je Flickr Pro account'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {photos.length > 0 && `${photos.length} foto's gevonden`}
            </div>
            <a
              href="https://www.flickr.com/services/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1"
            >
              <ExternalLink size={14} />
              Flickr API Documentatie
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
