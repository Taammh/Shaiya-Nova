
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
      alert(`¡Éxito! Se han subido ${result.count} reliquias. Ahora son inmortales en la nube.`);
      loadAll();
    } catch (e: any) {
      alert("Error al sincronizar: " + e.message);
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
    alert('¡Sincronización de Portal exitosa!');
    window.location.reload();
  };

  const generateSyncLink = () => {
    const config = { webhook, clientId, sUrl, sKey };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    navigator.clipboard.writeText(url);
    alert('¡ENLACE MAESTRO GENERADO! Úsalo para que otros vean tus cambios.');
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image || !newItem.description) {
      alert('Nombre, imagen y descripción son obligatorios.');
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
      alert('Fallo al forjar.');
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
    if (window.confirm('¿Borrar esta reliquia para siempre?')) {
      await deleteItemFromDB(id);
      loadAll();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* CABECERA DE CONTROL */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow glass-panel p-6 rounded-3xl border border-[#d4af37]/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${sUrl ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
            <div>
              <p className="text-white font-shaiya text-lg tracking-widest uppercase">Portal NOVA</p>
              <p className="text-[#d4af37] text-[8px] uppercase tracking-widest font-black">{sUrl ? 'NÚCLEO NUBE CONECTADO' : 'MODO LOCAL (DATOS EN PC)'}</p>
            </div>
          </div>
          <button onClick={generateSyncLink} className="bg-white hover:bg-[#d4af37] text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase transition-all shadow-lg">Copiar Link Maestro</button>
        </div>

        <button 
          onClick={handleSyncLocalData}
          disabled={isSyncingItems || !sUrl}
          className={`glass-panel p-6 rounded-3xl border ${isSyncingItems ? 'border-gray-500' : 'border-[#d4af37] animate-glow'} flex items-center gap-4 transition-all hover:bg-[#d4af37]/10 disabled:opacity-30`}
        >
          <div className="w-8 h-8 flex items-center justify-center bg-[#d4af37] rounded-lg text-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-xs uppercase tracking-widest">Sincronizar Todo</p>
            <p className="text-[#d4af37] text-[7px] uppercase font-black">Subir historial a la nube</p>
          </div>
        </button>
      </div>

      {/* FORMULARIO DE FORJA */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-10 uppercase tracking-[10px] text-center">
          {editingId ? 'Reforjar Reliquia' : 'Forjar Nueva Reliquia'}
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Nombre</label>
              <input placeholder="Ej: Dragón Infernal" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Categoría</label>
              <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* CAMPOS DINÁMICOS PARA TRAJES */}
            {newItem.category === Category.COSTUME && (
              <div className="space-y-6 animate-fade-in p-6 bg-[#d4af37]/5 rounded-2xl border border-[#d4af37]/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest mb-1 block">Facción</label>
                    <select className="w-full bg-black/60 border border-[#d4af37]/20 p-4 rounded-xl text-white outline-none" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as Faction})}>
                      <option value={Faction.LIGHT}>Luz</option>
                      <option value={Faction.FURY}>Furia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest mb-1 block">Sexo</label>
                    <select className="w-full bg-black/60 border border-[#d4af37]/20 p-4 rounded-xl text-white outline-none" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as Gender})}>
                      <option value={Gender.BOTH}>Ambos</option>
                      <option value={Gender.MALE}>Masculino</option>
                      <option value={Gender.FEMALE}>Femenino</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest mb-1 block">Clase Destinataria</label>
                  <select className="w-full bg-black/60 border border-[#d4af37]/20 p-4 rounded-xl text-white outline-none" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                    <option value="All">Todas las Clases</option>
                    {CLASSES_BY_FACTION[newItem.faction as Faction || Faction.LIGHT].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Enlace de la Imagen</label>
              <input placeholder="https://..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
            </div>
          </div>

          <div className="space-y-6">
             {/* VISTA PREVIA */}
             <div className="flex flex-col h-full">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Espejo de Etain (Previsualización)</label>
              <div className="flex-grow bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative min-h-[200px]">
                {newItem.image ? (
                  <img src={newItem.image} className="w-full h-full object-contain p-4" alt="Preview" onError={(e) => e.currentTarget.src = 'https://api.dicebear.com/7.x/initials/svg?seed=ERROR'} />
                ) : (
                  <p className="text-gray-600 font-shaiya text-xs uppercase tracking-widest opacity-30">Invocando imagen...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Descripción Pública</label>
            <textarea placeholder="Cuenta la leyenda..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none min-h-[120px]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest mb-1 block">Historia Oculta (Manual)</label>
            <textarea placeholder="Esta runa aparecerá al descifrar..." className="w-full bg-black/60 border border-[#d4af37]/20 p-5 rounded-2xl text-amber-100 outline-none min-h-[120px]" value={newItem.hidden_history} onChange={e => setNewItem({...newItem, hidden_history: e.target.value})} />
          </div>
        </div>

        <button onClick={handleAddItem} disabled={isSaving} className="w-full mt-10 bg-white text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] hover:bg-[#d4af37] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]">
          {isSaving ? 'Forjando...' : editingId ? 'Actualizar en el Registro' : 'Publicar en el Reino'}
        </button>
      </div>

      {/* GESTIÓN DE RELIQUIAS */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10">
        <h2 className="text-3xl font-shaiya text-white mb-8 uppercase tracking-[8px] text-center">Cronología de Objetos</h2>
        <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
          {itemsList.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-2xl hover:border-[#d4af37]/30 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                  <img src={item.image} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-white font-shaiya text-xl tracking-wider group-hover:text-[#d4af37]">{item.name}</h4>
                  <div className="flex gap-2 items-center">
                    <span className="text-[#d4af37] text-[9px] uppercase font-black px-2 bg-[#d4af37]/10 rounded border border-[#d4af37]/20">{item.category}</span>
                    <span className={`text-[8px] uppercase font-bold ${item.id.includes('item-') ? 'text-amber-500' : 'text-green-500'}`}>
                      {item.id.includes('item-') ? '⚠ LOCAL' : '✓ NUBE'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleEdit(item)} className="px-5 py-2 bg-blue-900/20 text-blue-400 border border-blue-900/40 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Reforjar</button>
                <button onClick={() => handleDelete(item.id)} className="px-5 py-2 bg-red-900/20 text-red-500 border border-red-900/40 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Destruir</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONFIGURACIÓN MAESTRA */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-[#d4af37]/20 shadow-2xl bg-gradient-to-b from-amber-950/10 to-transparent">
        <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-[10px] text-center">Configuración del Portal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Supabase URL</label>
            <input type="text" value={sUrl} onChange={e => setSUrl(e.target.value)} placeholder="https://..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Supabase Anon Key</label>
            <input type="password" value={sKey} onChange={e => setSKey(e.target.value)} placeholder="Llave de acceso..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" />
          </div>
        </div>
        <button onClick={handleSaveSettings} disabled={isSaving} className="w-full mt-10 bg-[#d4af37] hover:bg-white text-black font-black py-5 rounded-2xl transition-all uppercase tracking-[4px]">
          Guardar y Sincronizar Núcleo
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
