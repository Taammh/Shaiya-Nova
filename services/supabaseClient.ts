
import { createClient } from '@supabase/supabase-js';

// Intentar obtener de process.env de forma segura
const getEnv = (key: string) => {
  try {
    return (process?.env && process.env[key]) || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getItemsFromDB = async () => {
  if (supabaseUrl.includes('placeholder')) return [];
  
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error Supabase:', err);
    return [];
  }
};

export const addItemToDB = async (item: any) => {
  const { data, error } = await supabase
    .from('items')
    .insert([item]);
  
  if (error) throw error;
  return data;
};

export const getSetting = async (key: string) => {
  try {
    const { data, error } = await supabase
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
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value });
  
  if (error) throw error;
};
