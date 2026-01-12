
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
  const dynamicUrl = localStorage.getItem('nova_setting_SUPABASE_URL');
  const dynamicKey = localStorage.getItem('nova_setting_SUPABASE_ANON_KEY');
  
  const env = (window as any).process?.env || {};
  const url = dynamicUrl || env.SUPABASE_URL || '';
  const key = dynamicKey || env.SUPABASE_ANON_KEY || '';

  if (!url || !key || !isValidSupabaseUrl(url)) {
    if (!supabaseInstance) {
      supabaseInstance = createClient('https://xyz.supabase.co', 'dummy-key');
    }
    return { client: supabaseInstance, isPlaceholder: true };
  }

  if (!supabaseInstance || (supabaseInstance as any).supabaseUrl !== url) {
    supabaseInstance = createClient(url, key);
  }
  
  return { client: supabaseInstance, isPlaceholder: false };
};

export const pushLocalItemsToCloud = async () => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  if (!localItemsRaw) return { success: true, count: 0 };
  
  const localItems = JSON.parse(localItemsRaw);
  const { client, isPlaceholder } = getSupabase();
  
  if (isPlaceholder) throw new Error("Configura Supabase antes de sincronizar.");

  // Insertamos o actualizamos todos los items locales en la nube
  const { error } = await client
    .from('items')
    .upsert(localItems.map((item: any) => ({
      ...item,
      id: item.id.toString(), // Asegurar ID string
      created_at: item.created_at || new Date().toISOString()
    })));

  if (error) throw error;
  return { success: true, count: localItems.length };
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
    
    // Si hay datos en la nube, los usamos como fuente principal
    return data || localItems;
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
      console.warn("Error subiendo a la nube.");
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
    await client.from('items').update(item).eq('id', item.id);
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
    await client.from('items').delete().eq('id', id);
  }
};

export const getSetting = async (key: string) => {
  const localVal = localStorage.getItem(`nova_setting_${key}`);
  if (localVal) return localVal;

  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return null;
  
  try {
    const { data } = await client.from('settings').select('value').eq('key', key).single();
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
