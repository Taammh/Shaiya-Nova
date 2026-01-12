
import React, { useState, useEffect } from 'react';
import { Category, Faction, CLASSES_BY_FACTION, GameItem } from '../types';
import { addItemToDB, saveSetting, getSetting } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [webhook, setWebhook] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '',
    category: Category.MOUNT,
    image: '',
    description: '',
    faction: Faction.LIGHT,
    item_class: ''
  });

  useEffect(() => {
    const loadWebhook = async () => {
      const val = await getSetting('NOVA_WEBHOOK_URL');
      if (val) setWebhook(val);
    };
    loadWebhook();
  }, []);

  const handleSaveWebhook = async () => {
    if (!webhook.startsWith('https://discord.com/api/webhooks/')) {
      alert("La URL del Webhook debe empezar con https://discord.com/api/webhooks/");
      return;
    }
    setIsSaving(true);
    try {
      await saveSetting('NOVA_WEBHOOK_URL', webhook);
      alert('Configuración guardada localmente y en nube (si está activa).');
    } catch (e) {
      alert('Error al guardar. Se intentó guardar localmente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image) {
      alert('Faltan datos obligatorios.');
      return;
    }
    setIsSaving(true);
    try {
      await addItemToDB(newItem);
      alert('Objeto forjado exitosamente.');
      window.location.reload();
    } catch (e) {
      alert('Error al forjar objeto. Cloud no detectada.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="glass-panel p-8 rounded-3xl border-[#d4af37]/30">
        <h2 className="text-3xl font-shaiya text-[#d4af37] mb-6 uppercase tracking-widest">Ajustes de Soporte</h2>
        <div className="space-y-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Webhook de Discord (Tickets)</label>
          <div className="flex gap-4">
            <input 
              type="password"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]"
            />
            <button 
              onClick={handleSaveWebhook}
              className="bg-[#d4af37] text-black font-black px-8 py-2 rounded-xl hover:bg-white transition-all uppercase text-xs tracking-widest"
            >
              Vincular
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border-[#d4af37]/30">
        <h2 className="text-3xl font-shaiya text-[#d4af37] mb-6 uppercase tracking-widest">Crear Nueva Reliquia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <input placeholder="Nombre" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <select className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="URL Imagen" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
          </div>
          <textarea placeholder="Descripción épica..." className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none resize-none h-[184px]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
        </div>
        <button onClick={handleAddItem} className="w-full mt-8 bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-[#d4af37] transition-all">
          Publicar Objeto
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
