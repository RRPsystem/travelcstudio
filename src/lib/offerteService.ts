import { supabase } from './supabase';
import { Offerte } from '../types/offerte';

// Convert frontend Offerte to database row
function toDbRow(offerte: Offerte) {
  return {
    id: offerte.id,
    brand_id: offerte.brand_id || null,
    agent_id: offerte.agent_id || null,
    travel_compositor_id: offerte.travel_compositor_id || null,
    client_name: offerte.client_name,
    client_email: offerte.client_email || null,
    client_phone: offerte.client_phone || null,
    title: offerte.title,
    subtitle: offerte.subtitle || null,
    intro_text: offerte.intro_text || null,
    hero_image_url: offerte.hero_image_url || null,
    hero_video_url: offerte.hero_video_url || null,
    destinations: offerte.destinations || [],
    items: offerte.items || [],
    extra_costs: offerte.extra_costs || [],
    total_price: offerte.total_price || 0,
    price_per_person: offerte.price_per_person || 0,
    number_of_travelers: offerte.number_of_travelers || 2,
    currency: offerte.currency || 'EUR',
    price_display: offerte.price_display || 'both',
    status: offerte.status || 'draft',
    sent_at: offerte.sent_at || null,
    viewed_at: offerte.viewed_at || null,
    accepted_at: offerte.accepted_at || null,
    valid_until: offerte.valid_until || null,
    internal_notes: offerte.internal_notes || null,
    terms_conditions: offerte.terms_conditions || null,
  };
}

// Convert database row to frontend Offerte
function fromDbRow(row: any): Offerte {
  return {
    id: row.id,
    brand_id: row.brand_id,
    agent_id: row.agent_id,
    travel_compositor_id: row.travel_compositor_id,
    client_name: row.client_name || '',
    client_email: row.client_email,
    client_phone: row.client_phone,
    title: row.title || 'Nieuwe Offerte',
    subtitle: row.subtitle,
    intro_text: row.intro_text,
    hero_image_url: row.hero_image_url,
    hero_video_url: row.hero_video_url,
    destinations: row.destinations || [],
    items: row.items || [],
    extra_costs: row.extra_costs || [],
    total_price: parseFloat(row.total_price) || 0,
    price_per_person: parseFloat(row.price_per_person) || 0,
    number_of_travelers: row.number_of_travelers || 2,
    currency: row.currency || 'EUR',
    price_display: row.price_display || 'both',
    status: row.status || 'draft',
    sent_at: row.sent_at,
    viewed_at: row.viewed_at,
    accepted_at: row.accepted_at,
    valid_until: row.valid_until,
    internal_notes: row.internal_notes,
    terms_conditions: row.terms_conditions,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const offerteService = {
  async list(brandId?: string, agentId?: string): Promise<Offerte[]> {
    if (!supabase) throw new Error('Supabase not configured');

    let query = supabase
      .from('travel_offertes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(fromDbRow);
  },

  async get(id: string): Promise<Offerte | null> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('travel_offertes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw error;
    }
    return fromDbRow(data);
  },

  async save(offerte: Offerte): Promise<Offerte> {
    if (!supabase) throw new Error('Supabase not configured');

    const row = toDbRow(offerte);

    const { data, error } = await supabase
      .from('travel_offertes')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return fromDbRow(data);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('travel_offertes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async duplicate(offerte: Offerte): Promise<Offerte> {
    const duplicate: Offerte = {
      ...offerte,
      id: crypto.randomUUID(),
      title: `${offerte.title} (kopie)`,
      status: 'draft',
      sent_at: undefined,
      viewed_at: undefined,
      accepted_at: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.save(duplicate);
  },
};
