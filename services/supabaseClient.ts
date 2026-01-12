
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let isPlaceholder = false;

/**
 * Valida si una cadena es una URL de Supabase válida
 */
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

  // Acceso seguro a variables de entorno
  const env = (window as any).process?.env || {};
  const url = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';

  if (!url || !key || !isValidSupabaseUrl(url)) {
    console.warn("Supabase: El Reino está operando en modo Offline.");
    isPlaceholder = true;
    supabaseInstance = createClient('https://placeholder-project.supabase.co', 'no-key-provided');
  } else {
    isPlaceholder = false;
    supabaseInstance = createClient(url, key);
  }
  
  return supabaseInstance;
};

export const getItemsFromDB = async () => {
  const client = getSupabase();
  if (isPlaceholder) return [];
  
  try {
    const { data, error } = await client
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.warn('Supabase: Fallo al obtener datos remotos:', err?.message || err);
    return [];
  }
};

export const addItemToDB = async (item: any) => {
  const client = getSupabase();
  if (isPlaceholder) {
    throw new Error("Conexión con el Reino no establecida.");
  }
  const { data, error } = await client
    .from('items')
    .insert([item]);
  
  if (error) throw error;
  return data;
};

export const getSetting = async (key: string) => {
  const client = getSupabase();
  if (isPlaceholder) return null;
  try {
    const { data, error } = await client
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) return null;
    return data?.value;
  } catch {
    return null;
  }
};

export const saveSetting = async (key: string, value: string) => {
  const client = getSupabase();
  if (isPlaceholder) {
    throw new Error("No se puede guardar configuración en modo offline.");
  }
  const { error } = await client
    .from('settings')
    .upsert({ key, value });
  
  if (error) throw error;
};
