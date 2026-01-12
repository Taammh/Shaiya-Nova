
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [webhook, setWebhook] = useState('');
  const [clientId, setClientId] = useState('');
  const [sUrl, setSUrl] = useState('');
  const [sKey, setSKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
    
    if (wh) setWebhook(wh);
    if (cid) setClientId(cid);
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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await saveSetting('NOVA_WEBHOOK_URL', webhook);
    await saveSetting('DISCORD_CLIENT_ID', clientId);
    localStorage.setItem('nova_setting_SUPABASE_URL', sUrl);
    localStorage.setItem('nova_setting_SUPABASE_ANON_KEY', sKey);
    setIsSaving(false);
    alert('¡Configuración Maestra actualizada! Sincronizando el flujo de datos...');
    window.location.reload();
  };

  const generateSyncLink = () => {
    const config = { webhook, clientId, sUrl, sKey };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    navigator.clipboard.writeText(url);
    alert('¡ENLACE MAESTRO GENERADO! Comparte este link para sincronizar tu Base de Datos Ligera.');
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image || !newItem.description) {
      alert('Debes completar el nombre, el enlace de la imagen y la descripción.');
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
      alert('Error al forjar objeto.');
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
    if (window.confirm('¿Borrar permanentemente de la base de datos real?')) {
      await deleteItemFromDB(id);
      loadAll();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* CABECERA DE SINCRONIZACIÓN */}
      <div className="glass-panel p-8 rounded-3xl border border-[#d4af37]/40 bg-gradient-to-r from-[#d4af37]/5 to-transparent flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`w-4 h-4 rounded-full ${sUrl ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-red-500 shadow-[0_0_15px_#ef4444]'}`}></div>
          <div>
            <h3 className="text-white font-shaiya text-2xl tracking-widest uppercase">Núcleo NOVA Ligero</h3>
            <p className="text-[#d4af37] text-[10px] uppercase tracking-widest font-black">
              {sUrl ? 'CONECTADO AL REINO NUBE (SOLO TEXTO/URLS)' : 'MODO LOCAL - CONFIGURA SUPABASE'}
            </p>
          </div>
        </div>
        <button 
          onClick={generateSyncLink}
          className="bg-white hover:bg-[#d4af37] text-black font-black px-10 py-4 rounded-xl uppercase tracking-widest transition-all shadow-xl text-xs"
        >
          Generar Enlace Maestro
        </button>
      </div>

      {/* FORMULARIO DE OBJETOS */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
        <div className="absolute top-5 right-5 flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-[8px] text-green-400 font-black uppercase tracking-widest">Almacenamiento Optimizado</span>
        </div>

        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-10 uppercase tracking-[10px] text-center">
          {editingId ? 'Reforjar Reliquia' : 'Forjar Nueva Reliquia'}
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Nombre de la Reliquia</label>
              <input placeholder="Ej: Dragón de Etain" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Categoría de Objeto</label>
              <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {newItem.category === Category.COSTUME && (
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as Faction})}>
                  <option value={Faction.LIGHT}>Luz</option>
                  <option value={Faction.FURY}>Furia</option>
                </select>
                <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                  <option value="All">Todas las Clases</option>
                  {CLASSES_BY_FACTION[newItem.faction as Faction || Faction.LIGHT].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div className="relative">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Enlace de Imagen (Discord/Web)</label>
              <input placeholder="https://media.discordapp.net/..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
              <p className="mt-2 text-[8px] text-gray-500 italic">** Solo se guarda el link para no saturar la base de datos.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col h-full">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Vista Previa de la Reliquia</label>
              <div className="flex-grow bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative min-h-[200px]">
                {newItem.image ? (
                  <img src={newItem.image} className="w-full h-full object-contain" alt="Preview" onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/initials/svg?seed=ERROR')} />
                ) : (
                  <div className="text-center p-10 opacity-30">
                    <p className="text-white text-[10px] font-shaiya tracking-widest uppercase">Esperando Enlace de Imagen...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <textarea placeholder="Descripción pública de la reliquia..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none min-h-[120px] text-sm" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
          <textarea placeholder="Historia oculta (Runa secreta)..." className="w-full bg-black/60 border border-[#d4af37]/20 p-5 rounded-2xl text-amber-100 outline-none min-h-[120px] text-sm italic" value={newItem.hidden_history} onChange={e => setNewItem({...newItem, hidden_history: e.target.value})} />
        </div>

        <button onClick={handleAddItem} disabled={isSaving} className="w-full mt-10 bg-white text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] hover:bg-[#d4af37] transition-all">
          {isSaving ? 'Forjando en la Nube...' : editingId ? 'Actualizar Reliquia' : 'Publicar Reliquia Ligera'}
        </button>
      </div>

      {/* LISTA DE GESTIÓN */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10">
        <h2 className="text-3xl font-shaiya text-white mb-8 uppercase tracking-[8px] text-center">Crónicas de Teos</h2>
        <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin">
          {itemsList.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-[#d4af37]/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#d4af37]/20">
                  <img src={item.image} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-white font-shaiya text-lg tracking-wider">{item.name}</h4>
                  <div className="flex gap-2">
                    <span className="text-[#d4af37] text-[8px] uppercase font-black px-2 bg-[#d4af37]/10 rounded">{item.category}</span>
                    <span className="text-gray-500 text-[8px] uppercase font-bold truncate max-w-[150px]">{item.image}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(item)} className="px-5 py-2 bg-blue-900/10 text-blue-400 border border-blue-900/30 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Reforjar</button>
                <button onClick={() => handleDelete(item.id)} className="px-5 py-2 bg-red-900/10 text-red-500 border border-red-900/30 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONFIGURACIÓN CRÍTICA */}
      <div className="glass-panel p-10 rounded-[2.5rem] border-2 border-amber-900/20 shadow-2xl bg-gradient-to-b from-amber-950/10 to-transparent">
        <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-[10px] text-center">Configuración del Reino</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Supabase URL (Núcleo de Datos)</label>
              <input type="text" value={sUrl} onChange={e => setSUrl(e.target.value)} placeholder="https://tu-id.supabase.co" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Supabase Anon Key (Llave Mágica)</label>
              <input type="password" value={sKey} onChange={e => setSKey(e.target.value)} placeholder="Tu llave secreta de Supabase" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Discord Webhook</label>
              <input type="password" value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="URL del Webhook de Soporte" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Discord Client ID</label>
              <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="ID para Login de Usuarios" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" />
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={isSaving} className="w-full bg-[#d4af37] hover:bg-white text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest shadow-2xl">
            Sincronizar Portal Maestro
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
