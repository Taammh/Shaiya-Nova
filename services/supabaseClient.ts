
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let isPlaceholder = false;

const isValidSupabaseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  const env = (window as any).process?.env || {};
  const url = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';

  if (!url || !key || !isValidSupabaseUrl(url)) {
    isPlaceholder = true;
    supabaseInstance = createClient('https://placeholder-project.supabase.co', 'no-key-provided');
  } else {
    isPlaceholder = false;
    supabaseInstance = createClient(url, key);
  }
  
  return supabaseInstance;
};

export const getItemsFromDB = async () => {
  if (isPlaceholder) return [];
  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
};

export const addItemToDB = async (item: any) => {
  if (isPlaceholder) throw new Error("Cloud no configurado.");
  const client = getSupabase();
  const { data, error } = await client.from('items').insert([item]);
  if (error) throw error;
  return data;
};

export const getSetting = async (key: string) => {
  // Primero intentar LocalStorage (Modo manual/offline)
  const localVal = localStorage.getItem(`nova_setting_${key}`);
  if (localVal) return localVal;

  if (isPlaceholder) return null;
  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value || null;
  } catch {
    return null;
  }
};

export const saveSetting = async (key: string, value: string) => {
  // Guardar siempre en LocalStorage como respaldo
  localStorage.setItem(`nova_setting_${key}`, value);

  if (!isPlaceholder) {
    const client = getSupabase();
    await client.from('settings').upsert({ key, value });
  }
};
