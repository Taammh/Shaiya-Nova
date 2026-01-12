
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, pushLocalItemsToCloud } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [webhook, setWebhook] = useState('');
  const [clientId, setClientId] = useState('');
  const [sUrl, setSUrl] = useState('');
  const [sKey, setSKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSyncingItems, setIsSyncingItems] = useState(false);
  
  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '',
    category: Category.MOUNT,
    image: '',
    description: '',
    hidden_history: '',
    faction: Faction.LIGHT,
    item_class: 'All',
    gender: Gender.BOTH,
    stats: ''
  });

  const loadAll = async () => {
    const wh = await getSetting('NOVA_WEBHOOK_URL');
    const cid = await getSetting('DISCORD_CLIENT_ID');
    const dbUrl = localStorage.getItem('nova_setting_SUPABASE_URL') || '';
    const dbKey = localStorage.getItem('nova_setting_SUPABASE_ANON_KEY') || '';
    
    setWebhook(wh || '');
    setClientId(cid || '');
    setSUrl(dbUrl);
    setSKey(dbKey);
    
    const items = await getItemsFromDB();
    setItemsList(items);
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncLocalData = async () => {
    if (!sUrl || !sKey) {
      alert("Error: Configura Supabase antes de subir los datos.");
      return;
    }
    setIsSyncingItems(true);
    try {
      const result = await pushLocalItemsToCloud();
      alert(`¡Éxito! Se han subido ${result.count} reliquias a la nube. Ahora son visibles para todos los que usen tu enlace.`);
      loadAll();
    } catch (e: any) {
      alert("Error al sincronizar: " + e.message + "\n\n¿Has creado la tabla 'items' en Supabase?");
    } finally {
      setIsSyncingItems(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await saveSetting('NOVA_WEBHOOK_URL', webhook);
    await saveSetting('DISCORD_CLIENT_ID', clientId);
    localStorage.setItem('nova_setting_SUPABASE_URL', sUrl);
    localStorage.setItem('nova_setting_SUPABASE_ANON_KEY', sKey);
    setIsSaving(false);
    alert('¡Configuración Maestra actualizada!');
    window.location.reload();
  };

  const generateSyncLink = () => {
    if (!sUrl || !sKey) {
      alert("Advertencia: No has configurado Supabase. El enlace solo sincronizará el Webhook.");
    }
    const config = { webhook, clientId, sUrl, sKey };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    navigator.clipboard.writeText(url);
    alert('¡ENLACE MAESTRO GENERADO! Envíalo para que otros vean tus reliquias en tiempo real.');
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image || !newItem.description) {
      alert('Faltan campos obligatorios.');
      return;
    }

    setIsSaving(true);
    try {
      const itemToSave = { ...newItem };
      if (itemToSave.category !== Category.COSTUME) {
        delete itemToSave.faction;
        delete itemToSave.item_class;
        delete itemToSave.gender;
      }

      if (editingId) {
        await updateItemInDB({ ...itemToSave, id: editingId });
      } else {
        await addItemToDB(itemToSave);
      }
      
      resetForm();
      loadAll();
    } catch (error) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewItem({
      name: '',
      category: Category.MOUNT,
      image: '',
      description: '',
      hidden_history: '',
      faction: Faction.LIGHT,
      item_class: 'All',
      gender: Gender.BOTH,
      stats: ''
    });
    setEditingId(null);
  };

  const handleEdit = (item: GameItem) => {
    setNewItem({ ...item });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Borrar permanentemente?')) {
      await deleteItemFromDB(id);
      loadAll();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* BOTONES DE PODER */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow glass-panel p-6 rounded-3xl border border-[#d4af37]/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${sUrl ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <div>
              <p className="text-white font-shaiya text-lg tracking-widest uppercase">Portal NOVA</p>
              <p className="text-[#d4af37] text-[8px] uppercase tracking-widest font-black">Sincronización de Reino activa</p>
            </div>
          </div>
          <button onClick={generateSyncLink} className="bg-white hover:bg-[#d4af37] text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase transition-all shadow-lg">Copiar Enlace Maestro</button>
        </div>

        <button 
          onClick={handleSyncLocalData}
          disabled={isSyncingItems || !sUrl}
          className={`glass-panel p-6 rounded-3xl border ${isSyncingItems ? 'border-gray-500 opacity-50' : 'border-[#d4af37] animate-glow'} flex items-center gap-4 transition-all hover:bg-[#d4af37]/10`}
        >
          <div className="w-8 h-8 flex items-center justify-center bg-[#d4af37] rounded-lg text-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-xs uppercase tracking-widest">Subir Historial a Nube</p>
            <p className="text-[#d4af37] text-[7px] uppercase font-black">Haz visibles tus objetos anteriores</p>
          </div>
        </button>
      </div>

      {/* FORMULARIO */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-10 uppercase tracking-[10px] text-center">
          {editingId ? 'Reforjar Reliquia' : 'Forjar Nueva Reliquia'}
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <input placeholder="Nombre" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="URL de Imagen" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
          </div>
          <div className="space-y-6">
            <textarea placeholder="Descripción..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none min-h-[120px]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            <textarea placeholder="Historia oculta (Para el botón)..." className="w-full bg-black/60 border border-[#d4af37]/20 p-5 rounded-2xl text-amber-100 outline-none min-h-[120px]" value={newItem.hidden_history} onChange={e => setNewItem({...newItem, hidden_history: e.target.value})} />
          </div>
        </div>
        <button onClick={handleAddItem} disabled={isSaving} className="w-full mt-10 bg-white text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] hover:bg-[#d4af37] transition-all">
          {isSaving ? 'Guardando...' : 'Publicar Reliquia'}
        </button>
      </div>

      {/* GESTIÓN */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10">
        <h2 className="text-3xl font-shaiya text-white mb-8 uppercase tracking-[8px] text-center">Gestión del Reino</h2>
        <div className="space-y-4">
          {itemsList.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-[#d4af37]/20">
              <div className="flex items-center gap-4">
                <img src={item.image} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                <div>
                  <h4 className="text-white font-shaiya text-lg">{item.name}</h4>
                  <p className="text-[#d4af37] text-[8px] uppercase font-black">{item.category} | {item.id.includes('item-') ? 'SOLO LOCAL (Subir a nube!)' : 'EN LA NUBE ✓'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(item)} className="px-4 py-2 bg-blue-900/20 text-blue-400 border border-blue-900/40 rounded-xl text-[9px] font-black uppercase">Editar</button>
                <button onClick={() => handleDelete(item.id)} className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900/40 rounded-xl text-[9px] font-black uppercase">Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONFIGURACIÓN */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl bg-gradient-to-b from-amber-950/5 to-transparent">
        <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-[10px] text-center">Núcleo de Sincronización</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Supabase URL</label>
            <input type="text" value={sUrl} onChange={e => setSUrl(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white" />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Supabase Anon Key</label>
            <input type="password" value={sKey} onChange={e => setSKey(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white" />
          </div>
        </div>
        <button onClick={handleSaveSettings} className="w-full mt-10 bg-[#d4af37] text-black font-black py-5 rounded-2xl uppercase tracking-widest">Guardar Configuración Maestra</button>
      </div>
    </div>
  );
};

export default AdminPanel;
