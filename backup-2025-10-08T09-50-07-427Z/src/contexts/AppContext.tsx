import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Site, Page, PageComponent } from '../types';
import { supabase, db } from '../lib/supabase';

interface AppContextType {
  user: User | null;
  currentSite: Site | null;
  currentPage: Page | null;
  sites: Site[];
  isPreviewMode: boolean;
  setUser: (user: User | null) => void;
  setCurrentSite: (site: Site | null) => void;
  setCurrentPage: (page: Page | null) => void;
  setSites: (sites: Site[]) => void;
  setPreviewMode: (isPreview: boolean) => void;
  updatePageComponents: (components: PageComponent[]) => void;
  createSite: (name: string, domain: string) => Promise<Site>;
  createPage: (siteId: string, name: string, slug: string) => Promise<Page>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isPreviewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load websites from Supabase on mount
  useEffect(() => {
    loadWebsites();
  }, []);

  const loadWebsites = async () => {
    if (!supabase) {
      console.log('⚠️ Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      const { data: websites, error } = await supabase
        .from('websites')
        .select(`
          *,
          website_pages (
            id,
            name,
            slug,
            content,
            meta_title,
            meta_description,
            is_homepage,
            sort_order
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert database format to app format
      const convertedSites: Site[] = (websites || []).map((site: any) => ({
        id: site.id,
        name: site.name,
        domain: site.domain || '',
        pages: (site.website_pages || []).map((page: any) => ({
          id: page.id,
          name: page.name,
          path: page.slug,
          components: Array.isArray(page.content) ? page.content : []
        }))
      }));

      setSites(convertedSites);
      console.log('✅ Loaded', convertedSites.length, 'websites from Supabase');
    } catch (error) {
      console.error('❌ Error loading websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSite = async (name: string, domain: string): Promise<Site> => {
    if (!supabase) throw new Error('Supabase not configured');
    if (!user) throw new Error('User not logged in');

    try {
      const { data: website, error } = await supabase
        .from('websites')
        .insert({
          brand_id: user.brandId || '00000000-0000-0000-0000-000000000000',
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          domain,
          created_by: user.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      const newSite: Site = {
        id: website.id,
        name: website.name,
        domain: website.domain || '',
        pages: []
      };

      setSites([...sites, newSite]);
      console.log('✅ Site created:', newSite);
      return newSite;
    } catch (error) {
      console.error('❌ Error creating site:', error);
      throw error;
    }
  };

  const createPage = async (siteId: string, name: string, slug: string): Promise<Page> => {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: page, error } = await supabase
        .from('website_pages')
        .insert({
          website_id: siteId,
          name,
          slug,
          content: [],
          is_homepage: false,
          sort_order: 0
        })
        .select()
        .single();

      if (error) throw error;

      const newPage: Page = {
        id: page.id,
        name: page.name,
        path: page.slug,
        components: []
      };

      console.log('✅ Page created:', newPage);
      return newPage;
    } catch (error) {
      console.error('❌ Error creating page:', error);
      throw error;
    }
  };

  const updatePageComponents = async (components: PageComponent[]) => {
    if (!currentPage || !currentSite || !supabase) return;

    try {
      // Save to Supabase
      const { error } = await supabase
        .from('website_pages')
        .update({
          content: components,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPage.id);

      if (error) throw error;

      console.log('✅ Page components saved to Supabase');

      // Update local state
      const updatedPage = { ...currentPage, components };
      const updatedPages = currentSite.pages.map(p =>
        p.id === currentPage.id ? updatedPage : p
      );
      const updatedSite = { ...currentSite, pages: updatedPages };

      setCurrentPage(updatedPage);
      setCurrentSite(updatedSite);
      setSites(sites.map(s => s.id === currentSite.id ? updatedSite : s));
    } catch (error) {
      console.error('❌ Error saving page components:', error);
      alert('Fout bij opslaan: ' + (error as Error).message);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      currentSite,
      currentPage,
      sites,
      isPreviewMode,
      setUser,
      setCurrentSite,
      setCurrentPage,
      setSites,
      setPreviewMode,
      updatePageComponents,
      createSite,
      createPage
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}