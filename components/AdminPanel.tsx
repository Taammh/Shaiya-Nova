
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [webhook, setWebhook] = useState('');
  const [clientId, setClientId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [masterLink, setMasterLink] = useState('');
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
    if (wh) setWebhook(wh);
    if (cid) setClientId(cid);
    
    const items = await getItemsFromDB();
    setItemsList(items);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await saveSetting('NOVA_WEBHOOK_URL', webhook);
    await saveSetting('DISCORD_CLIENT_ID', clientId);
    setIsSaving(false);
    alert('Configuración Maestra guardada en este dispositivo.');
  };

  const generateFullSyncLink = () => {
    const localItems = localStorage.getItem('nova_local_items') || '[]';
    const config = {
      items: JSON.parse(localItems),
      webhook: webhook,
      clientId: clientId
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = `${window.location.origin}${window.location.pathname}?master=${encoded}`;
    setMasterLink(url);
    navigator.clipboard.writeText(url);
    alert('¡Link de Sincronización Maestra copiado!');
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image || !newItem.description) {
      alert('Debes completar el nombre, la imagen y la descripción mínima.');
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
        alert('¡Reliquia actualizada!');
      } else {
        await addItemToDB(itemToSave);
        alert('¡Reliquia forjada!');
      }
      
      resetForm();
      loadAll();
    } catch (error) {
      alert('Error al procesar objeto.');
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
    setNewItem({
      ...item,
      faction: item.faction || Faction.LIGHT,
      item_class: item.item_class || 'All',
      gender: item.gender || Gender.BOTH,
      hidden_history: item.hidden_history || ''
    });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de querer destruir esta reliquia para siempre?')) {
      await deleteItemFromDB(id);
      loadAll();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* FORJAR / EDITAR OBJETOS */}
      <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-10 uppercase tracking-[10px] text-center">
          {editingId ? 'Editar Reliquia' : 'Forjar Nueva Reliquia'}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Nombre</label>
              <input placeholder="Nombre del Objeto" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Categoría</label>
              <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {newItem.category === Category.COSTUME && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Facción</label>
                    <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as Faction, item_class: 'All'})}>
                      <option value={Faction.LIGHT}>Luz</option>
                      <option value={Faction.FURY}>Furia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Clase</label>
                    <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                      <option value="All">Todas</option>
                      {CLASSES_BY_FACTION[newItem.faction as Faction || Faction.LIGHT].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Sexo / Género</label>
                  <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as Gender})}>
                    {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Imagen (URL)</label>
              <input placeholder="Enlace de la Imagen" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Descripción Pública</label>
              <textarea placeholder="Descripción visible para todos los héroes..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none resize-none min-h-[150px] focus:border-[#d4af37]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-[#d4af37] uppercase tracking-[4px] mb-2">Historia Oculta (Secreta)</label>
              <textarea placeholder="Esta historia solo se revelará al pulsar el botón mágico. Si se deja vacío, la IA generará una historia." className="w-full bg-black/60 border border-[#d4af37]/20 p-5 rounded-2xl text-amber-100 outline-none resize-none min-h-[150px] focus:border-[#d4af37]" value={newItem.hidden_history} onChange={e => setNewItem({...newItem, hidden_history: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-10">
          <button 
            onClick={handleAddItem} 
            disabled={isSaving}
            className="flex-grow bg-white hover:bg-[#d4af37] text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] transition-all"
          >
            {isSaving ? 'Procesando...' : editingId ? 'Guardar Cambios' : 'Publicar en el Catálogo'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-8 bg-gray-800 text-white font-bold rounded-[1.5rem] uppercase tracking-widest hover:bg-gray-700 transition-all">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* GESTIÓN DE RELIQUIAS EXISTENTES */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <h2 className="text-3xl font-shaiya text-white mb-8 uppercase tracking-[8px] text-center">Cámara de Gestión</h2>
        <div className="space-y-4">
          {itemsList.length === 0 ? (
            <p className="text-gray-500 text-center italic">No hay reliquias personalizadas en este reino.</p>
          ) : (
            itemsList.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-[#d4af37]/30 transition-all">
                <div className="flex items-center gap-4">
                  <img src={item.image} className="w-12 h-12 rounded-lg object-cover border border-[#d4af37]/20" alt={item.name} />
                  <div>
                    <h4 className="text-white font-shaiya text-lg">{item.name}</h4>
                    <p className="text-[#d4af37] text-[10px] uppercase tracking-widest">
                      {item.category} {item.faction ? `| ${item.faction}` : ''} {item.item_class && item.item_class !== 'All' ? `| ${item.item_class}` : ''} {item.gender ? `| ${item.gender}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all">Editar</button>
                  <button onClick={() => handleDelete(item.id)} className="px-4 py-2 bg-red-900/10 text-red-500 border border-red-900/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Destruir</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AJUSTES DEL REINO */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-[10px] text-center">Ajustes del Reino</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Webhook de Soporte (Discord)</label>
            <input 
              type="password"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Discord Client ID (Login Real)</label>
            <input 
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="ID de tu App en Discord Developer Portal"
              className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]"
            />
          </div>
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full bg-[#d4af37] text-black font-black py-5 rounded-2xl hover:bg-white transition-all uppercase tracking-widest"
          >
            Guardar Ajustes Locales
          </button>
        </div>
      </div>

      {/* EXPORTAR ESTADO */}
      <div className="glass-panel p-10 rounded-[2.5rem] border-2 border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-transparent">
        <h2 className="text-3xl font-shaiya text-amber-500 mb-4 uppercase tracking-[8px] text-center">Exportar mi Reino</h2>
        <button 
          onClick={generateFullSyncLink}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-black py-5 rounded-2xl uppercase tracking-[4px] transition-all shadow-xl"
        >
          Generar Link Maestro
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
