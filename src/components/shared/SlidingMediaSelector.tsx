import React, { useState, useEffect } from 'react';
import { X, Upload, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SlidingMediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  onSelectMultiple?: (imageUrls: string[]) => void;
  title?: string;
  allowMultiple?: boolean;
}

const imageCollections: Record<string, string[]> = {
  travel: [
    'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422915/pexels-photo-2422915.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1659438/pexels-photo-1659438.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1430677/pexels-photo-1430677.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2526105/pexels-photo-2526105.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2377432/pexels-photo-2377432.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1051075/pexels-photo-1051075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  ],
  barcelona: [
    'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/819764/pexels-photo-819764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1796505/pexels-photo-1796505.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1308940/pexels-photo-1308940.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2868242/pexels-photo-2868242.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2413613/pexels-photo-2413613.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2412609/pexels-photo-2412609.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422915/pexels-photo-2422915.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3243090/pexels-photo-3243090.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1388032/pexels-photo-1388032.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3889854/pexels-photo-3889854.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422287/pexels-photo-2422287.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1534560/pexels-photo-1534560.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  ],
  nature: [
    'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/709552/pexels-photo-709552.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1549336/pexels-photo-1549336.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1402850/pexels-photo-1402850.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1574857/pexels-photo-1574857.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/462024/pexels-photo-462024.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/258109/pexels-photo-258109.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/371633/pexels-photo-371633.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1054218/pexels-photo-1054218.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/556669/pexels-photo-556669.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/326055/pexels-photo-326055.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  ],
  beach: [
    'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1007657/pexels-photo-1007657.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1007426/pexels-photo-1007426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/221451/pexels-photo-221451.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1007426/pexels-photo-1007426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2404370/pexels-photo-2404370.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/358482/pexels-photo-358482.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1007422/pexels-photo-1007422.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/373912/pexels-photo-373912.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  ],
  city: [
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/450597/pexels-photo-450597.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/374870/pexels-photo-374870.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422915/pexels-photo-2422915.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/161963/eiffel-tower-paris-france-tower-161963.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/302769/pexels-photo-302769.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/326705/pexels-photo-326705.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/280173/pexels-photo-280173.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2363/france-landmark-lights-night.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/415998/pexels-photo-415998.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/460376/pexels-photo-460376.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  ],
  tiaki: [
    'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/709552/pexels-photo-709552.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1574857/pexels-photo-1574857.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1007657/pexels-photo-1007657.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422915/pexels-photo-2422915.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    'https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
  ]
};

export function SlidingMediaSelector({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  title = "Media Selector",
  allowMultiple = false
}: SlidingMediaSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('travel');
  const [displayedImages, setDisplayedImages] = useState<string[]>(imageCollections.travel);
  const [activeTab, setActiveTab] = useState<'upload' | 'unsplash' | 'youtube'>('unsplash');
  const [visibleCount, setVisibleCount] = useState(9);
  const [isSearching, setIsSearching] = useState(false);
  const [useRealAPI, setUseRealAPI] = useState(false);
  const [youtubeSearchTerm, setYoutubeSearchTerm] = useState('travel vlog');
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [unsplashKey, setUnsplashKey] = useState<string | null>(null);
  const [youtubeKey, setYoutubeKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Load previously uploaded images from Supabase Storage
  const loadUploadedImages = async () => {
    try {
      const { data, error } = await supabase!.storage
        .from('destination-images')
        .list('uploads', {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error loading uploaded images:', error);
        return;
      }

      if (data && data.length > 0) {
        const urls = data
          .filter(file => file.name !== '.emptyFolderPlaceholder')
          .map(file => {
            const { data: urlData } = supabase!.storage
              .from('destination-images')
              .getPublicUrl(`uploads/${file.name}`);
            return urlData.publicUrl;
          });
        setUploadedImages(urls);
      }
    } catch (error) {
      console.error('Error loading uploaded images:', error);
    }
  };

  // Handle file upload to Supabase Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setUploadError('Alleen afbeeldingen zijn toegestaan');
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError('Bestand is te groot (max 10MB)');
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase!.storage
          .from('destination-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setUploadError(`Upload mislukt: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase!.storage
          .from('destination-images')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Add to uploaded images list
        setUploadedImages(prev => [publicUrl, ...prev]);

        // If single select, immediately select the uploaded image
        if (!allowMultiple) {
          onSelect(publicUrl);
          return;
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Er ging iets mis bij het uploaden');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'upload') {
      loadUploadedImages();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const loadAPIKeys = async () => {
      try {
        console.log('🔍 Loading API keys from database...');
        const { data: settings, error } = await supabase
          .from('api_settings')
          .select('provider, service_name, api_key')
          .eq('is_active', true);

        if (error) {
          console.error('❌ Error loading API keys:', error);
          return;
        }

        console.log('📊 Database settings found:', settings?.length || 0);
        console.log('📊 Settings:', settings?.map(s => ({ provider: s.provider, service_name: s.service_name })));

        if (settings) {
          // Look for Unsplash by provider OR service_name
          const unsplash = settings.find(s => 
            s.provider === 'Unsplash' || 
            s.service_name?.toLowerCase().includes('unsplash')
          );
          // Look for YouTube by provider OR service_name
          const youtube = settings.find(s => 
            s.provider === 'YouTube' || 
            s.service_name?.toLowerCase().includes('youtube')
          );

          if (unsplash?.api_key) {
            setUnsplashKey(unsplash.api_key);
            console.log('✅ Unsplash API key geladen vanuit database');
          } else {
            console.log('⚠️ Geen Unsplash API key in database');
          }

          if (youtube?.api_key) {
            setYoutubeKey(youtube.api_key);
            console.log('✅ YouTube API key geladen vanuit database');
          } else {
            console.log('⚠️ Geen YouTube API key in database');
          }
        }
      } catch (error) {
        console.error('❌ Error loading API keys from database:', error);
      }
    };

    loadAPIKeys();
  }, []);

  const searchUnsplash = async (query: string) => {
    console.log('🔍 Searching Unsplash for:', query);

    try {
      setIsSearching(true);
      
      // Use edge function - it fetches the API key from database using service role
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-unsplash`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ query, perPage: 30 })
        }
      );

      const data = await response.json();

      if (data.success && data.images) {
        console.log('✅ Unsplash results:', data.images.length, 'photos found');
        return data.images.map((img: any) => img.url);
      } else {
        console.error('❌ Unsplash API error:', data.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Unsplash search error:', error);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const searchYouTube = async (query: string) => {
    // SECURITY: Only use API key from database
    const apiKey = youtubeKey;

    if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY' || apiKey.trim() === '') {
      console.log('⚠️ No YouTube API key configured in database');
      return null;
    }

    console.log('🔑 Using YouTube key from database');
    console.log('🔍 Searching YouTube for:', query);

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ YouTube results:', data.items?.length || 0, 'videos found');
      return data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`
      }));
    } catch (error) {
      console.error('❌ YouTube search error:', error);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const handleYouTubeSearch = async () => {
    const results = await searchYouTube(youtubeSearchTerm);
    if (results) {
      setYoutubeVideos(results);
    }
  };

  const handleSearch = async () => {
    const term = searchTerm.toLowerCase().trim();

    console.log('🔍 Starting search with term:', term);

    const unsplashResults = await searchUnsplash(term);

    if (unsplashResults && unsplashResults.length > 0) {
      console.log('✅ Using Unsplash results, count:', unsplashResults.length);
      setDisplayedImages(unsplashResults);
      setUseRealAPI(true);
    } else {
      console.log('⚠️ No Unsplash results, using fallback');
      if (imageCollections[term]) {
        setDisplayedImages(imageCollections[term]);
      } else {
        const keywords = ['travel', 'nature', 'beach', 'city'];
        const matchedKeyword = keywords.find(keyword => term.includes(keyword));
        setDisplayedImages(imageCollections[matchedKeyword || 'travel']);
      }
      setUseRealAPI(false);
    }
    setVisibleCount(9);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + 9, displayedImages.length));
  };

  useEffect(() => {
    if (activeTab === 'unsplash' && displayedImages.length === 0) {
      handleSearch();
    } else if (activeTab === 'youtube' && youtubeVideos.length === 0) {
      handleYouTubeSearch();
    }
  }, [activeTab]);

  return (
    <>
      <div className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📤 Upload
            </button>
            <button
              onClick={() => setActiveTab('unsplash')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'unsplash'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🖼️ Unsplash
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'youtube'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📺 YouTube
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'upload' && (
              <div className="space-y-6">
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                    ❌ {uploadError}
                  </div>
                )}

                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  uploading ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-400'
                }`}>
                  {uploading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                      <p className="text-orange-600 font-medium">Bezig met uploaden...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">Sleep bestanden hierheen of klik om te uploaden</p>
                      <p className="text-xs text-gray-500 mb-4">JPG, PNG, GIF tot 10MB • {allowMultiple ? 'Meerdere bestanden mogelijk' : 'Eén bestand'}</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple={allowMultiple}
                        className="hidden"
                        id="file-upload"
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="file-upload"
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer inline-block font-medium"
                      >
                        📁 Bestanden Kiezen
                      </label>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Geüploade Afbeeldingen ({uploadedImages.length})</h4>
                  {uploadedImages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Nog geen afbeeldingen geüpload</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedImages.map((url, index) => {
                        const isSelected = selectedImages.includes(url);
                        return (
                          <div
                            key={index}
                            onClick={() => {
                              if (allowMultiple) {
                                setSelectedImages(prev => 
                                  isSelected 
                                    ? prev.filter(img => img !== url)
                                    : [...prev, url]
                                );
                              } else {
                                onSelect(url);
                              }
                            }}
                            className={`aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer transition-all transform hover:scale-105 relative ${
                              isSelected ? 'ring-2 ring-orange-500' : 'hover:ring-2 hover:ring-orange-300'
                            }`}
                          >
                            <img
                              src={url}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'unsplash' && (
              <div className="space-y-4">
                {useRealAPI && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    ✅ Unsplash API key geladen vanuit database
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Zoek foto's op Unsplash... (bijv: barcelona, mountains, ocean)"
                    disabled={isSearching}
                    className="w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-orange-600 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-700 transition-colors disabled:bg-gray-400"
                  >
                    {isSearching ? '⏳' : '🔍'}
                  </button>
                </div>

                {isSearching && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    <p className="text-gray-600 mt-2">Zoeken op Unsplash...</p>
                  </div>
                )}

                {!isSearching && (
                  <div>
                    {useRealAPI && (
                      <div className="mb-3 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        ✅ Resultaten van Unsplash API
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                  {displayedImages.slice(0, visibleCount).map((image, index) => {
                    const isSelected = selectedImages.includes(image);
                    return (
                      <div
                        key={`${image}-${index}`}
                        onClick={() => {
                          if (allowMultiple) {
                            setSelectedImages(prev => 
                              isSelected 
                                ? prev.filter(img => img !== image)
                                : [...prev, image]
                            );
                          } else {
                            onSelect(image);
                          }
                        }}
                        className={`aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer transition-all transform hover:scale-105 relative ${
                          isSelected ? 'ring-2 ring-orange-500' : 'hover:ring-2 hover:ring-orange-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${searchTerm} photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: '-webkit-optimize-contrast' }}
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                    {visibleCount < displayedImages.length && (
                      <div className="text-center mt-4">
                        <button
                          onClick={handleLoadMore}
                          className="text-orange-600 hover:text-orange-700 font-medium py-2 px-4 rounded-lg hover:bg-orange-50 transition-colors"
                        >
                          📸 Laad meer afbeeldingen ({displayedImages.length - visibleCount} beschikbaar)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'youtube' && (
              <div className="space-y-4">
                {!youtubeKey && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    ⚠️ YouTube API key niet geconfigureerd in database. Zoeken werkt niet. Configureer via Operator Dashboard → API Settings.
                  </div>
                )}
                {youtubeKey && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    ✅ YouTube API key geladen vanuit database
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={youtubeSearchTerm}
                    onChange={(e) => setYoutubeSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleYouTubeSearch()}
                    placeholder="Zoek YouTube video's... (bijv: barcelona travel vlog)"
                    disabled={isSearching}
                    className="w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleYouTubeSearch}
                    disabled={isSearching}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 transition-colors disabled:bg-gray-400"
                  >
                    {isSearching ? '⏳' : '🔍'}
                  </button>
                </div>

                {isSearching && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <p className="text-gray-600 mt-2">Zoeken op YouTube...</p>
                  </div>
                )}

                {!isSearching && youtubeVideos.length > 0 && (
                  <div>
                    <div className="mb-3 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                      ✅ {youtubeVideos.length} video's gevonden
                    </div>
                    <div className="space-y-3">
                      {youtubeVideos.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => onSelect(video.embedUrl)}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 cursor-pointer transition-all hover:shadow-md"
                        >
                          <div className="flex space-x-3">
                            <div className="relative w-32 h-20 flex-shrink-0">
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-lg ml-1">▶</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 py-2 pr-3 min-w-0">
                              <div className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                                {video.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {video.channelTitle}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isSearching && youtubeVideos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-3">📺</div>
                    <p>Zoek naar YouTube video's om toe te voegen</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Multi-select confirmation footer */}
          {allowMultiple && selectedImages.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedImages.length} foto{selectedImages.length !== 1 ? "'s" : ''} geselecteerd
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedImages([])}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Wissen
                  </button>
                  <button
                    onClick={() => {
                      if (onSelectMultiple) {
                        onSelectMultiple(selectedImages);
                      }
                      setSelectedImages([]);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                  >
                    ✓ Toevoegen ({selectedImages.length})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
    </>
  );
}
