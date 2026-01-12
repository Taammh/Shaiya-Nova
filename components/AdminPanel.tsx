
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
    setIsSaving(true);
    try {
      await saveSetting('NOVA_WEBHOOK_URL', webhook);
      alert('Webhook guardado en la nube.');
    } catch (e) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image) {
      alert('Nombre e Imagen son obligatorios.');
      return;
    }
    setIsSaving(true);
    try {
      await addItemToDB({
        name: newItem.name,
        category: newItem.category,
        image: newItem.image,
        description: newItem.description,
        faction: newItem.faction,
        item_class: newItem.item_class, // Usando item_class alineado con SQL
      });
      setNewItem({
        name: '',
        category: Category.MOUNT,
        image: '',
        description: '',
        faction: Faction.LIGHT,
        item_class: ''
      });
      alert('Objeto forjado en la base de datos eterna.');
      window.location.reload();
    } catch (e) {
      alert('Error al forjar el objeto. Verifica la conexión con Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="glass-panel p-8 rounded-2xl border border-[#d4af37]/30">
        <h2 className="text-2xl font-shaiya text-[#d4af37] mb-6 uppercase tracking-widest">Configuración del Reino (Cloud)</h2>
        <div className="space-y-4">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">URL del Webhook de Discord</label>
          <div className="flex gap-4">
            <input 
              type="password"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-grow bg-black/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#d4af37]"
            />
            <button 
              onClick={handleSaveWebhook}
              disabled={isSaving}
              className="bg-[#d4af37] text-black font-bold px-6 py-2 rounded-lg hover:bg-white transition-all uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {isSaving ? 'Sincronizando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-[#d4af37]/30">
        <h2 className="text-2xl font-shaiya text-[#d4af37] mb-6 uppercase tracking-widest">Agregar Nueva Reliquia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <input 
              placeholder="Nombre del Objeto"
              className="w-full bg-black/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#d4af37]"
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
            <select 
              className="w-full bg-black/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#d4af37]"
              value={newItem.category}
              onChange={e => setNewItem({...newItem, category: e.target.value as Category})}
            >
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input 
              placeholder="URL de la Imagen"
              className="w-full bg-black/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#d4af37]"
              value={newItem.image}
              onChange={e => setNewItem({...newItem, image: e.target.value})}
            />
          </div>
          <div className="space-y-4">
            <textarea 
              placeholder="Descripción épica..."
              className="w-full h-[142px] bg-black/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#d4af37] resize-none"
              value={newItem.description}
              onChange={e => setNewItem({...newItem, description: e.target.value})}
            />
          </div>
        </div>

        {newItem.category === Category.COSTUME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <select 
              className="w-full bg-black/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#d4af37]"
              value={newItem.faction}
              onChange={e => setNewItem({...newItem, faction: e.target.value as Faction, item_class: ''})}
            >
              <option value={Faction.LIGHT}>Luz</option>
              <option value={Faction.FURY}>Furia</option>
            </select>
            <select 
              className="w-full bg-black/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#d4af37]"
              value={newItem.item_class}
              onChange={e => setNewItem({...newItem, item_class: e.target.value})}
            >
              <option value="">Seleccionar Clase</option>
              {newItem.faction && CLASSES_BY_FACTION[newItem.faction as Faction].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <button 
          onClick={handleAddItem}
          disabled={isSaving}
          className="w-full mt-8 bg-gradient-to-r from-[#d4af37] to-[#8a6d3b] text-black font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all uppercase tracking-[4px] disabled:opacity-50"
        >
          {isSaving ? 'Invocando datos...' : 'Forjar Objeto en la Base de Datos'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
