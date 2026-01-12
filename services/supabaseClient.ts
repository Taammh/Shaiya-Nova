
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const isValidSupabaseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

export const getSupabase = (): { client: SupabaseClient, isPlaceholder: boolean } => {
  // Intentamos obtener las llaves de localStorage primero (sincronización dinámica)
  const dynamicUrl = localStorage.getItem('nova_setting_SUPABASE_URL');
  const dynamicKey = localStorage.getItem('nova_setting_SUPABASE_ANON_KEY');
  
  // Si no, usamos las de process.env (configuración inicial)
  const env = (window as any).process?.env || {};
  const url = dynamicUrl || env.SUPABASE_URL || '';
  const key = dynamicKey || env.SUPABASE_ANON_KEY || '';

  if (!url || !key || !isValidSupabaseUrl(url)) {
    // Si no hay nada, devolvemos un cliente placeholder
    if (!supabaseInstance) {
      supabaseInstance = createClient('https://xyz.supabase.co', 'dummy-key');
    }
    return { client: supabaseInstance, isPlaceholder: true };
  }

  // Si las llaves cambiaron o no hay instancia, creamos una nueva
  if (!supabaseInstance || (supabaseInstance as any).supabaseUrl !== url) {
    supabaseInstance = createClient(url, key);
  }
  
  return { client: supabaseInstance, isPlaceholder: false };
};

export const getItemsFromDB = async () => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];

  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return localItems;

  try {
    const { data, error } = await client
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Unificamos datos locales (por si acaso) con los de la nube
    const dbIds = new Set((data || []).map(i => i.id));
    const uniqueLocal = localItems.filter((i: any) => !dbIds.has(i.id));
    
    return [...uniqueLocal, ...(data || [])];
  } catch (err) {
    console.error("Error al obtener datos de la nube:", err);
    return localItems;
  }
};

export const addItemToDB = async (item: any) => {
  const newItem = {
    ...item,
    id: item.id || `item-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  localStorage.setItem('nova_local_items', JSON.stringify([newItem, ...localItems]));

  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    try {
      await client.from('items').insert([newItem]);
    } catch (e) {
      console.warn("No se pudo subir a la nube.");
    }
  }
  
  return newItem;
};

export const updateItemInDB = async (item: any) => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  let localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  
  localItems = localItems.map((i: any) => i.id === item.id ? item : i);
  localStorage.setItem('nova_local_items', JSON.stringify(localItems));

  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    try {
      await client.from('items').update(item).eq('id', item.id);
    } catch (e) {
      console.error("Error actualizando en la nube:", e);
    }
  }
  return item;
};

export const deleteItemFromDB = async (id: string) => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  let localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  
  localItems = localItems.filter((i: any) => i.id !== id);
  localStorage.setItem('nova_local_items', JSON.stringify(localItems));

  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    try {
      await client.from('items').delete().eq('id', id);
    } catch (e) {
      console.error("Error eliminando en la nube:", e);
    }
  }
};

export const getSetting = async (key: string) => {
  const localVal = localStorage.getItem(`nova_setting_${key}`);
  if (localVal) return localVal;

  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return null;
  
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
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    try {
      await client.from('settings').upsert({ key, value });
    } catch(e) {}
  }
};
