
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem } from '../types';
import { addItemToDB, saveSetting, getSetting } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [webhook, setWebhook] = useState('');
  const [clientId, setClientId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [masterLink, setMasterLink] = useState('');
  
  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '',
    category: Category.MOUNT,
    image: '',
    description: '',
    faction: Faction.LIGHT,
    item_class: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      const wh = await getSetting('NOVA_WEBHOOK_URL');
      const cid = await getSetting('DISCORD_CLIENT_ID');
      if (wh) setWebhook(wh);
      if (cid) setClientId(cid);
    };
    loadSettings();
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
    
    // El objeto de configuración llevará TODO: ítems y ajustes técnicos
    const config = {
      items: JSON.parse(localItems),
      webhook: webhook,
      clientId: clientId
    };
    
    // Generamos una cadena Base64 comprimida
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = `${window.location.origin}${window.location.pathname}?master=${encoded}`;
    setMasterLink(url);
    
    navigator.clipboard.writeText(url);
    alert('¡Link de Sincronización Maestra copiado! Pásaselo a cualquier persona para que vea tus monturas y use tu configuración.');
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image || !newItem.description) {
      alert('Debes completar el nombre, la imagen y la descripción.');
      return;
    }

    setIsSaving(true);
    try {
      await addItemToDB(newItem);
      setNewItem({
        name: '',
        category: Category.MOUNT,
        image: '',
        description: '',
        faction: Faction.LIGHT,
        item_class: ''
      });
      alert('¡Reliquia forjada! Ahora aparece en tu catálogo.');
    } catch (error) {
      alert('Error al forjar objeto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* EXPORTAR ESTADO (LINK MAESTRO) */}
      <div className="glass-panel p-10 rounded-[2.5rem] border-2 border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-transparent">
        <h2 className="text-3xl font-shaiya text-amber-500 mb-4 uppercase tracking-[8px] text-center">Exportar mi Reino (Sincronización)</h2>
        <p className="text-gray-400 text-[10px] uppercase tracking-widest text-center mb-8">Crea un enlace para que otros vean tus objetos cargados y configuración</p>
        <button 
          onClick={generateFullSyncLink}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-black py-5 rounded-2xl uppercase tracking-[4px] transition-all shadow-xl"
        >
          Generar Link Maestro de Sincronización
        </button>
        {masterLink && (
          <div className="mt-4 p-4 bg-black/60 border border-amber-500/20 rounded-xl overflow-hidden">
            <p className="text-[8px] text-amber-200/40 break-all font-mono italic">{masterLink}</p>
          </div>
        )}
      </div>

      {/* CONFIGURACIÓN TÉCNICA */}
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
            <p className="text-[8px] text-gray-600 mt-2 uppercase italic tracking-widest">Requerido para que el login en soporte funcione de verdad</p>
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

      {/* FORJAR OBJETOS */}
      <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-10 uppercase tracking-[10px] text-center">Forjar Nueva Reliquia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <input placeholder="Nombre del Objeto" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Enlace de la Imagen" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
          </div>
          <textarea placeholder="Narra la historia de esta reliquia..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none resize-none min-h-[200px] focus:border-[#d4af37]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
        </div>
        <button 
          onClick={handleAddItem} 
          disabled={isSaving}
          className="w-full mt-10 bg-white hover:bg-[#d4af37] text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] transition-all"
        >
          {isSaving ? 'Invocando...' : 'Publicar en el Catálogo'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
