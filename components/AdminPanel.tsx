
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
    alert('Configuración del Reino guardada correctamente.');
  };

  const generateMasterLink = () => {
    const localItems = localStorage.getItem('nova_local_items') || '[]';
    
    const config = {
      items: JSON.parse(localItems),
      webhook: webhook,
      clientId: clientId
    };
    
    // Generar link comprimido
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = `${window.location.origin}${window.location.pathname}?master=${encoded}`;
    setMasterLink(url);
    
    navigator.clipboard.writeText(url);
    alert('¡Link Maestro generado! Quien use este link verá EXACTAMENTE lo que tú ves (objetos, webhook y login).');
  };

  // Added missing handleAddItem function to handle item creation and form validation
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image || !newItem.description) {
      alert('Por favor, completa todos los campos (Nombre, Imagen y Descripción) para forjar la reliquia.');
      return;
    }

    setIsSaving(true);
    try {
      await addItemToDB(newItem);
      // Reset form fields after successful creation
      setNewItem({
        name: '',
        category: Category.MOUNT,
        image: '',
        description: '',
        faction: Faction.LIGHT,
        item_class: ''
      });
      alert('¡Reliquia forjada con éxito!');
    } catch (error) {
      console.error("Error adding item:", error);
      alert('Error al forjar la reliquia en el reino.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      {/* SECCIÓN LINK MAESTRO */}
      <div className="glass-panel p-10 rounded-[2.5rem] border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/10 to-transparent">
        <h2 className="text-4xl font-shaiya text-amber-500 mb-2 uppercase tracking-[10px] text-center">Sincronización Maestra</h2>
        <p className="text-gray-400 text-[10px] uppercase tracking-widest text-center mb-8">Exporta todo el estado actual de tu página a un enlace</p>
        <button 
          onClick={generateMasterLink}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-5 rounded-2xl uppercase tracking-[4px] transition-all shadow-xl shadow-amber-900/20"
        >
          Generar y Copiar Enlace de Sincronización
        </button>
        {masterLink && (
          <div className="mt-4 p-4 bg-black/60 border border-amber-500/20 rounded-xl">
            <p className="text-[9px] text-amber-200/40 break-all font-mono italic">{masterLink}</p>
          </div>
        )}
      </div>

      {/* SECCIÓN CONFIGURACIÓN TÉCNICA */}
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-[10px] text-center">Configuración del Reino</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px] mb-2">Webhook de Discord (Soporte)</label>
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
              placeholder="Ej: 123456789012345678"
              className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]"
            />
            <p className="text-[9px] text-gray-600 mt-2 italic uppercase">Obtenlo en Discord Developer Portal (OAuth2 -> Client ID)</p>
          </div>
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full bg-[#d4af37] text-black font-black py-5 rounded-2xl hover:bg-white transition-all uppercase tracking-widest"
          >
            Guardar Configuración
          </button>
        </div>
      </div>

      {/* SECCIÓN FORJA DE OBJETOS */}
      <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-10 uppercase tracking-[10px] text-center">Forjar Nueva Reliquia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <input placeholder="Nombre de la Reliquia" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none cursor-pointer" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="URL Imagen (Discord/Imgur)" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
          </div>
          <textarea placeholder="Descripción épica..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none resize-none min-h-[220px] focus:border-[#d4af37]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
        </div>
        <button 
          onClick={handleAddItem} 
          disabled={isSaving}
          className="w-full mt-10 bg-white hover:bg-[#d4af37] text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] transition-all"
        >
          {isSaving ? 'Forjando...' : 'Publicar Objeto'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
