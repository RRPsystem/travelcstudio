import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_action_type: actionType,
      p_description: description,
      p_metadata: metadata || {}
    });

    if (error) {
      if (error.message.includes('Insufficient credits')) {
        return { success: false, error: 'Onvoldoende credits. Koop nieuwe credits om door te gaan.' };
      }
      if (error.message.includes('Action type not found')) {
        return { success: false, error: 'Deze actie vereist geen credits.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return { success: false, error: 'Er is een fout opgetreden bij het aftrekken van credits.' };
  }
}

export async function checkCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<{ hasEnough: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_credits', {
      p_user_id: userId,
      p_amount: amount
    });

    if (error) {
      return { hasEnough: false, error: error.message };
    }

    return { hasEnough: data === true };
  } catch (error) {
    console.error('Error checking credits:', error);
    return { hasEnough: false, error: 'Er is een fout opgetreden bij het checken van credits.' };
  }
}

export async function getCreditPrice(
  supabase: SupabaseClient,
  actionType: string
): Promise<{ cost: number | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('credit_prices')
      .select('cost_credits')
      .eq('action_type', actionType)
      .eq('enabled', true)
      .single();

    if (error) {
      return { cost: null, error: error.message };
    }

    return { cost: data?.cost_credits || null };
  } catch (error) {
    console.error('Error getting credit price:', error);
    return { cost: null, error: 'Er is een fout opgetreden bij het ophalen van de prijs.' };
  }
}