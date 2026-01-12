
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

const mapItemForDB = (item: any) => {
  const mapped: any = {
    id: item.id?.toString() || `item-${Date.now()}`,
    name: item.name || '',
    category: item.category || 'Montura',
    image: item.image || '',
    description: item.description || '',
    created_at: item.created_at || new Date().toISOString()
  };
  
  // Solo incluimos campos opcionales si tienen valor para evitar errores de columnas faltantes en lo posible
  if (item.hidden_history) mapped.hidden_history = item.hidden_history;
  if (item.faction) mapped.faction = item.faction;
  if (item.item_class) mapped.item_class = item.item_class;
  if (item.gender) mapped.gender = item.gender;
  if (item.stats) mapped.stats = item.stats;
  if (item.price) mapped.price = item.price;
  
  return mapped;
};

export const pushLocalItemsToCloud = async () => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  if (!localItemsRaw) return { success: true, count: 0 };
  
  const localItems = JSON.parse(localItemsRaw);
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) throw new Error("Portal no conectado a la nube. Configura Supabase en Ajustes.");

  const itemsToUpload = localItems.map(mapItemForDB);
  
  const { error } = await client.from('items').upsert(itemsToUpload, { onConflict: 'id' });
  if (error) {
    if (error.message.includes('column "price"')) {
      throw new Error("Falta la columna 'price' en tu tabla de Supabase. Ejecuta el SQL de Ajustes.");
    }
    throw error;
  }
  return { success: true, count: localItems.length };
};

export const getItemsFromDB = async () => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  const { client, isPlaceholder } = getSupabase();
  
  if (isPlaceholder) return localItems;
  
  try {
    const { data, error } = await client.from('items').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data && data.length > 0 ? data : localItems;
  } catch (err) { 
    return localItems; 
  }
};

export const addItemToDB = async (item: any) => {
  const newItem = { ...item, id: item.id || `item-${Date.now()}`, created_at: new Date().toISOString() };
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  localStorage.setItem('nova_local_items', JSON.stringify([newItem, ...localItems]));
  
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    try { 
      await client.from('items').insert([mapItemForDB(newItem)]); 
    } catch {}
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
    await client.from('items').update(mapItemForDB(item)).eq('id', item.id);
  }
  return item;
};

export const deleteItemFromDB = async (id: string) => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  let localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  localStorage.setItem('nova_local_items', JSON.stringify(localItems.filter((i: any) => i.id !== id)));
  
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    await client.from('items').delete().eq('id', id);
  }
};

export const submitStaffApplication = async (app: any) => {
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) throw new Error("Portal no configurado.");
  return await client.from('staff_applications').insert([app]);
};

export const getStaffApplications = async () => {
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return [];
  try {
    const { data, error } = await client.from('staff_applications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
};

export const updateStaffApplicationStatus = async (id: string, status: string) => {
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return;
  return await client.from('staff_applications').update({ status }).eq('id', id);
};

export const getSetting = async (key: string) => {
  const localVal = localStorage.getItem(`nova_setting_${key}`);
  if (localVal) return localVal;
  
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return null;
  
  try {
    const { data } = await client.from('settings').select('value').eq('key', key).single();
    return data?.value || null;
  } catch { return null; }
};

export const saveSetting = async (key: string, value: string) => {
  localStorage.setItem(`nova_setting_${key}`, value);
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    try { 
      await client.from('settings').upsert({ key, value }); 
    } catch {}
  }
};
