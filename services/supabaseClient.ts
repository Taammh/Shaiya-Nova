
import { createClient } from '@supabase/supabase-js';

// Estas variables se configurarán en Vercel como Environment Variables
// Agregamos una validación para evitar que el script falle si aún no se han configurado
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

// Solo inicializamos si tenemos valores que no sean los de marcador de posición (placeholder)
// de lo contrario, creamos una instancia que al menos no rompa la carga inicial de la página
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helpers para la base de datos con manejo de errores mejorado
export const getItemsFromDB = async () => {
  if (supabaseUrl.includes('placeholder')) return [];
  
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching items:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Database connection error:', err);
    return [];
  }
};

export const addItemToDB = async (item: any) => {
  if (supabaseUrl.includes('placeholder')) {
    throw new Error('Supabase no está configurado. Revisa las variables de entorno.');
  }
  const { data, error } = await supabase
    .from('items')
    .insert([item]);
  
  if (error) throw error;
  return data;
};

export const getSetting = async (key: string) => {
  if (supabaseUrl.includes('placeholder')) return null;
  
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) return null;
    return data?.value;
  } catch (err) {
    return null;
  }
};

export const saveSetting = async (key: string, value: string) => {
  if (supabaseUrl.includes('placeholder')) {
    throw new Error('Supabase no está configurado.');
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value });
  
  if (error) throw error;
};
