
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

  const url = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || '';
  const key = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || '';

  // Verificamos si las credenciales existen y si la URL tiene el formato correcto de Supabase
  if (!url || !key || !isValidSupabaseUrl(url) || url.includes('placeholder')) {
    console.warn("Supabase: El Reino está operando en modo Offline (Datos Locales).");
    isPlaceholder = true;
    // Client placeholder para evitar errores de referencia, pero no se usará para peticiones reales
    supabaseInstance = createClient('https://placeholder-project.supabase.co', 'no-key-provided');
  } else {
    isPlaceholder = false;
    supabaseInstance = createClient(url, key);
  }
  
  return supabaseInstance;
};

export const getItemsFromDB = async () => {
  // En modo placeholder no iniciamos ninguna petición de red
  if (isPlaceholder) return [];
  
  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    // Capturamos específicamente errores de red de forma silenciosa
    const errorMessage = err?.message || String(err);
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('Load failed')) {
      console.warn('Supabase: Fallo de conexión (Verifica DNS/URL). Usando solo datos locales.');
      return [];
    }
    
    // Otros errores (como tablas inexistentes) se informan pero no bloquean la app
    console.warn('Supabase: No se pudieron obtener datos remotos:', errorMessage);
    return [];
  }
};

export const addItemToDB = async (item: any) => {
  if (isPlaceholder) {
    throw new Error("Conexión con el Reino no establecida. Configura las variables de entorno.");
  }
  const client = getSupabase();
  const { data, error } = await client
    .from('items')
    .insert([item]);
  
  if (error) throw error;
  return data;
};

export const getSetting = async (key: string) => {
  if (isPlaceholder) return null;
  const client = getSupabase();
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
  if (isPlaceholder) {
    throw new Error("No se puede guardar configuración en modo offline.");
  }
  const client = getSupabase();
  const { error } = await client
    .from('settings')
    .upsert({ key, value });
  
  if (error) throw error;
};
