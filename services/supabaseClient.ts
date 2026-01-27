
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
  const env = (window as any).process?.env || {};
  const url = env.SUPABASE_URL || localStorage.getItem('nova_setting_SUPABASE_URL') || '';
  const key = env.SUPABASE_ANON_KEY || localStorage.getItem('nova_setting_SUPABASE_ANON_KEY') || '';

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

export const uploadFile = async (file: File, folder: string = 'items'): Promise<string> => {
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) throw new Error("Portal no conectado a Supabase.");

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await client.storage
    .from('nova-assets')
    .upload(filePath, file);

  if (error) {
    console.error("Upload error:", error);
    throw new Error("Error al subir archivo.");
  }

  const { data: { publicUrl } } = client.storage
    .from('nova-assets')
    .getPublicUrl(filePath);

  return publicUrl;
};

const mapItemForDB = (item: any) => {
  return {
    id: item.id?.toString() || `item-${Date.now()}`,
    name: item.name || '',
    category: item.category || 'Montura',
    image: item.image || '',
    description: item.description || '',
    hidden_history: item.hidden_history || '',
    faction: item.faction || null,
    item_class: item.item_class || 'All',
    gender: item.gender || 'Ambos',
    stats: item.stats || '',
    price: item.price || '',
    rarity: item.rarity || 'Common',
    created_at: item.created_at || new Date().toISOString()
  };
};

const updateLocalItems = (items: any[]) => {
  localStorage.setItem('nova_local_items', JSON.stringify(items));
};

const updateLocalDrops = (drops: any[]) => {
  localStorage.setItem('nova_local_drops', JSON.stringify(drops));
};

export const getItemsFromDB = async () => {
  const { client, isPlaceholder } = getSupabase();
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];

  if (isPlaceholder) return localItems;
  
  try {
    const { data, error } = await client.from('items').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) {
      updateLocalItems(data);
      return data;
    }
    return localItems;
  } catch (err) { 
    return localItems; 
  }
};

export const getDropListsFromDB = async () => {
  const { client, isPlaceholder } = getSupabase();
  const localDropsRaw = localStorage.getItem('nova_local_drops');
  const localDrops = localDropsRaw ? JSON.parse(localDropsRaw) : [];

  if (isPlaceholder) return localDrops;
  
  try {
    const { data, error } = await client.from('drop_lists').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) {
      updateLocalDrops(data);
      return data;
    }
    return localDrops;
  } catch (err) { 
    return localDrops; 
  }
};

// Función para cargar todo lo local a la nube de golpe
export const massSyncLocalToCloud = async () => {
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) throw new Error("Debes configurar Supabase primero.");

  const localItems = JSON.parse(localStorage.getItem('nova_local_items') || '[]');
  const localDrops = JSON.parse(localStorage.getItem('nova_local_drops') || '[]');

  if (localItems.length > 0) {
    const mappedItems = localItems.map(mapItemForDB);
    await client.from('items').upsert(mappedItems);
  }

  if (localDrops.length > 0) {
    await client.from('drop_lists').upsert(localDrops);
  }

  return { itemsCount: localItems.length, dropsCount: localDrops.length };
};

export const addDropListToDB = async (drop: any) => {
  const newDrop = { ...drop, id: drop.id || `drop-${Date.now()}`, created_at: new Date().toISOString() };
  const { client, isPlaceholder } = getSupabase();
  
  const currentLocal = JSON.parse(localStorage.getItem('nova_local_drops') || '[]');
  updateLocalDrops([newDrop, ...currentLocal]);

  if (!isPlaceholder) {
    await client.from('drop_lists').upsert([newDrop]);
  }
  return newDrop;
};

export const updateDropListInDB = async (drop: any) => {
  const { client, isPlaceholder } = getSupabase();
  
  const currentLocal = JSON.parse(localStorage.getItem('nova_local_drops') || '[]');
  updateLocalDrops(currentLocal.map((d: any) => d.id === drop.id ? drop : d));

  if (!isPlaceholder) {
    await client.from('drop_lists').upsert([drop]);
  }
  return drop;
};

export const deleteDropListFromDB = async (id: string) => {
  const { client, isPlaceholder } = getSupabase();
  
  const currentLocal = JSON.parse(localStorage.getItem('nova_local_drops') || '[]');
  updateLocalDrops(currentLocal.filter((d: any) => d.id !== id));

  if (!isPlaceholder) {
    await client.from('drop_lists').delete().eq('id', id);
  }
};

export const addItemToDB = async (item: any) => {
  const newItem = { ...item, id: item.id || `item-${Date.now()}`, created_at: new Date().toISOString() };
  const { client, isPlaceholder } = getSupabase();
  
  const currentLocal = JSON.parse(localStorage.getItem('nova_local_items') || '[]');
  updateLocalItems([newItem, ...currentLocal]);

  if (!isPlaceholder) {
    await client.from('items').upsert([mapItemForDB(newItem)]);
  }
  return newItem;
};

export const updateItemInDB = async (item: any) => {
  const { client, isPlaceholder } = getSupabase();
  
  const currentLocal = JSON.parse(localStorage.getItem('nova_local_items') || '[]');
  updateLocalItems(currentLocal.map((i: any) => i.id === item.id ? item : i));

  if (!isPlaceholder) {
    await client.from('items').upsert([mapItemForDB(item)]);
  }
  return item;
};

export const deleteItemFromDB = async (id: string) => {
  const { client, isPlaceholder } = getSupabase();
  
  const currentLocal = JSON.parse(localStorage.getItem('nova_local_items') || '[]');
  updateLocalItems(currentLocal.filter((i: any) => i.id !== id));

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
    if (error) return [];
    return data || [];
  } catch { return []; }
};

export const updateStaffApplicationStatus = async (id: string, status: string) => {
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return;
  return await client.from('staff_applications').update({ status }).eq('id', id);
};

export const deleteStaffApplicationFromDB = async (id: string) => {
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) return;
  return await client.from('staff_applications').delete().eq('id', id);
};

export const getSetting = async (key: string) => {
  const env = (window as any).process?.env || {};
  if (key === 'SUPABASE_URL' && env.SUPABASE_URL) return env.SUPABASE_URL;
  if (key === 'SUPABASE_ANON_KEY' && env.SUPABASE_ANON_KEY) return env.SUPABASE_ANON_KEY;
  if (key === 'API_KEY' && env.API_KEY) return env.API_KEY;

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
