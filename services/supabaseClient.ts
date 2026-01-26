
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
    throw new Error("Error al subir archivo. ¿Creaste el bucket 'nova-assets' en Supabase y lo pusiste público?");
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
    created_at: item.created_at || new Date().toISOString()
  };
};

export const pushLocalItemsToCloud = async () => {
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localDropsRaw = localStorage.getItem('nova_local_drops');
  
  const { client, isPlaceholder } = getSupabase();
  if (isPlaceholder) throw new Error("Portal no conectado a la nube.");

  let count = 0;

  if (localItemsRaw) {
    const localItems = JSON.parse(localItemsRaw);
    const itemsToUpload = localItems.map(mapItemForDB);
    await client.from('items').upsert(itemsToUpload, { onConflict: 'id' });
    count += localItems.length;
  }

  if (localDropsRaw) {
    const localDrops = JSON.parse(localDropsRaw);
    await client.from('drop_lists').upsert(localDrops, { onConflict: 'id' });
    count += localDrops.length;
  }

  return { success: true, count };
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

export const getDropListsFromDB = async () => {
  const localDropsRaw = localStorage.getItem('nova_local_drops');
  const localDrops = localDropsRaw ? JSON.parse(localDropsRaw) : [];
  const { client, isPlaceholder } = getSupabase();
  
  if (isPlaceholder) return localDrops;
  
  try {
    const { data, error } = await client.from('drop_lists').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data && data.length > 0 ? data : localDrops;
  } catch (err) { 
    return localDrops; 
  }
};

export const addDropListToDB = async (drop: any) => {
  const newDrop = { ...drop, id: drop.id || `drop-${Date.now()}`, created_at: new Date().toISOString() };
  const localDropsRaw = localStorage.getItem('nova_local_drops');
  const localDrops = localDropsRaw ? JSON.parse(localDropsRaw) : [];
  localStorage.setItem('nova_local_drops', JSON.stringify([newDrop, ...localDrops]));
  
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    await client.from('drop_lists').insert([newDrop]);
  }
  return newDrop;
};

export const updateDropListInDB = async (drop: any) => {
  const localDropsRaw = localStorage.getItem('nova_local_drops');
  let localDrops = localDropsRaw ? JSON.parse(localDropsRaw) : [];
  localDrops = localDrops.map((i: any) => i.id === drop.id ? drop : i);
  localStorage.setItem('nova_local_drops', JSON.stringify(localDrops));
  
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    await client.from('drop_lists').update(drop).eq('id', drop.id);
  }
  return drop;
};

export const deleteDropListFromDB = async (id: string) => {
  const localDropsRaw = localStorage.getItem('nova_local_drops');
  let localDrops = localDropsRaw ? JSON.parse(localDropsRaw) : [];
  localStorage.setItem('nova_local_drops', JSON.stringify(localDrops.filter((i: any) => i.id !== id)));
  
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    await client.from('drop_lists').delete().eq('id', id);
  }
};

export const addItemToDB = async (item: any) => {
  const newItem = { ...item, id: item.id || `item-${Date.now()}`, created_at: new Date().toISOString() };
  const localItemsRaw = localStorage.getItem('nova_local_items');
  const localItems = localItemsRaw ? JSON.parse(localItemsRaw) : [];
  localStorage.setItem('nova_local_items', JSON.stringify([newItem, ...localItems]));
  
  const { client, isPlaceholder } = getSupabase();
  if (!isPlaceholder) {
    await client.from('items').insert([mapItemForDB(newItem)]);
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
