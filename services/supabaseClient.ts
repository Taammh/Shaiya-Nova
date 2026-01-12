
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
    // URL dummy para evitar errores de inicialización
    supabaseInstance = createClient('https://xyz.supabase.co', 'dummy-key');
  } else {
    isPlaceholder = false;
    supabaseInstance = createClient(url, key);
  }
  
  return supabaseInstance;
};

export const getItemsFromDB = async () => {
  // Siempre cargar ítems locales primero
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];

  if (isPlaceholder) return localItems;

  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return [...localItems, ...(data || [])];
  } catch (err) {
    return localItems;
  }
};

export const addItemToDB = async (item: any) => {
  const newItem = {
    ...item,
    id: item.id || `local-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  // Guardar en local siempre
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  localStorage.setItem('nova_local_items', JSON.stringify([newItem, ...localItems]));

  if (!isPlaceholder) {
    const client = getSupabase();
    try {
      await client.from('items').insert([newItem]);
    } catch (e) {
      console.warn("No se pudo sincronizar con la nube, guardado solo localmente.");
    }
  }
  
  return newItem;
};

export const getSetting = async (key: string) => {
  const localVal = localStorage.getItem(`nova_setting_${key}`);
  if (localVal) return localVal;

  if (isPlaceholder) return null;
  const client = getSupabase();
  try {
    const { data } = await client
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
  localStorage.setItem(`nova_setting_${key}`, value);
  if (!isPlaceholder) {
    const client = getSupabase();
    try {
      await client.from('settings').upsert({ key, value });
    } catch(e) {}
  }
};
