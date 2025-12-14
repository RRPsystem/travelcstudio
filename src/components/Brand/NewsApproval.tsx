import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { WordPressNewsManager } from './News/WordPressNewsManager';
import { ExternalBuilderNews } from './News/ExternalBuilderNews';
import { InternalNewsManager } from './News/InternalNewsManager';

export function NewsApproval() {
  const { effectiveBrandId } = useAuth();
  const [newsManager, setNewsManager] = useState<'wordpress' | 'external' | 'internal'>('internal');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (effectiveBrandId) {
      loadWebsiteInfo();
    } else {
      setLoading(false);
    }
  }, [effectiveBrandId]);

  const loadWebsiteInfo = async () => {
    if (!effectiveBrandId) return;

    try {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('website_type')
        .eq('id', effectiveBrandId)
        .maybeSingle();

      if (brandError) throw brandError;

      if (brandData?.website_type === 'wordpress') {
        setNewsManager('wordpress');
        setLoading(false);
        return;
      }

      const { data: websiteData, error: websiteError } = await supabase
        .from('websites')
        .select('external_builder_id, template_source_type')
        .eq('brand_id', effectiveBrandId)
        .maybeSingle();

      if (!websiteError && websiteData) {
        if (websiteData.external_builder_id || websiteData.template_source_type === 'quickstart') {
          setNewsManager('external');
        } else {
          setNewsManager('internal');
        }
      } else {
        setNewsManager('internal');
      }
    } catch (error) {
      console.error('Error loading website info:', error);
      setNewsManager('internal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (newsManager === 'wordpress') {
    return <WordPressNewsManager />;
  }

  if (newsManager === 'external') {
    return <ExternalBuilderNews />;
  }

  return <InternalNewsManager />;
}
