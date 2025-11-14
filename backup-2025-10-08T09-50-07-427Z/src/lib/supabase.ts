import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasValidSupabaseConfig = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  supabaseUrl !== 'your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnonKey.startsWith('eyJ')
);

export const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper functions for database operations
export const db = {
  // Brands
  async getBrands() {
    console.log('📊 getBrands called, supabase available:', !!supabase);
    if (!supabase) {
      console.log('⚠️ No supabase, throwing error');
      throw new Error('Supabase not configured - check environment variables');
    }
    console.log('🔄 Making supabase request...');
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('📥 Supabase response:', { data, error });
    if (error) {
      console.error('🚨 Supabase query error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
    return data;
  },

  async createBrand(brand: Partial<any>) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('brands')
      .insert([brand])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateBrand(id: string, updates: Partial<any>) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteBrand(id: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    console.log('🔄 Attempting to delete brand with ID:', id);
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('🚨 Supabase delete error:', error);
      throw new Error(`Database delete failed: ${error.message}`);
    }
    console.log('✅ Brand successfully deleted from database');
  },

  // Companies
  async getCompanies() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Users
  async getUsers() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        brands (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Websites
  async getWebsites(brandId?: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    let query = supabase
      .from('websites')
      .select(`
        *,
        brands (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // News Articles
  async getNewsArticles(brandId?: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    let query = supabase
      .from('news_articles')
      .select(`
        *,
        brands!news_articles_brand_id_fkey (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Builder Projects
  async getBuilderProjects(brandId?: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    let query = supabase
      .from('builder_projects')
      .select(`
        *,
        brands (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Agents
  async getAgents(brandId?: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    let query = supabase
      .from('agents')
      .select(`
        *,
        brands (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // GPT Models
  async getGPTModels() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('gpt_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(gpt => ({
      ...gpt,
      isActive: gpt.is_active,
      contentType: gpt.content_type,
      systemPrompt: gpt.system_prompt,
      maxTokens: gpt.max_tokens,
      usageCount: gpt.usage_count,
      lastUsed: gpt.last_used || 'Never'
    }));
  },

  async createGPTModel(gptModel: Partial<any>) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('gpt_models')
      .insert([{ ...gptModel, created_by: (await supabase.auth.getUser()).data.user?.id }])
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      isActive: data.is_active,
      contentType: data.content_type,
      systemPrompt: data.system_prompt,
      maxTokens: data.max_tokens,
      usageCount: data.usage_count,
      lastUsed: data.last_used || 'Never'
    };
  },

  async updateGPTModel(id: string, updates: Partial<any>) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('gpt_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      isActive: data.is_active,
      contentType: data.content_type,
      systemPrompt: data.system_prompt,
      maxTokens: data.max_tokens,
      usageCount: data.usage_count,
      lastUsed: data.last_used || 'Never'
    };
  },

  async deleteGPTModel(id: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { error } = await supabase
      .from('gpt_models')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async incrementGPTUsage(id: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { error } = await supabase
      .from('gpt_models')
      .update({
        usage_count: supabase.raw('usage_count + 1'),
        last_used: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // API Settings
  async getAPISettings() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('api_settings')
      .select('*')
      .order('provider', { ascending: true });

    if (error) throw error;
    return data;
  },

  async updateAPISettings(id: string, updates: Partial<any>) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('api_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async testAPIConnection(id: string, provider: string, apiKey: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    let testResult = { success: false, message: '' };

    try {
      if (provider === 'OpenAI') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        testResult.success = response.ok;
        testResult.message = response.ok ? 'Connection successful' : 'Invalid API key';
      } else if (provider === 'Supabase') {
        testResult.success = apiKey.length > 0;
        testResult.message = testResult.success ? 'Configuration saved' : 'Empty value';
      } else if (provider === 'Google') {
        testResult.success = apiKey.startsWith('AIza');
        testResult.message = testResult.success ? 'Key format valid' : 'Invalid key format';
      } else if (provider === 'Unsplash') {
        const response = await fetch(`https://api.unsplash.com/photos/random?count=1`, {
          headers: { 'Authorization': `Client-ID ${apiKey}` }
        });
        testResult.success = response.ok;
        testResult.message = response.ok ? 'Connection successful' : 'Invalid access key';
      }
    } catch (error) {
      testResult.success = false;
      testResult.message = 'Connection failed';
    }

    const { error } = await supabase
      .from('api_settings')
      .update({
        test_status: testResult.success ? 'success' : 'failed',
        last_tested: new Date().toISOString(),
        is_active: testResult.success,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return testResult;
  },

  async incrementAPIUsage(id: string, cost: number = 0) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { error } = await supabase.rpc('increment_api_usage', {
      api_id: id,
      cost_increment: cost
    });

    if (error) {
      console.warn('Could not increment API usage:', error);
    }
  }
};