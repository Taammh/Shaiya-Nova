
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem } from '../types';
import { addItemToDB, saveSetting, getSetting } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [webhook, setWebhook] = useState('');
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
    const loadWebhook = async () => {
      const val = await getSetting('NOVA_WEBHOOK_URL');
      if (val) setWebhook(val);
    };
    loadWebhook();
  }, []);

  const handleSaveWebhook = async () => {
    if (!webhook.startsWith('https://discord.com/api/webhooks/')) {
      alert("La URL del Webhook debe ser válida.");
      return;
    }
    setIsSaving(true);
    await saveSetting('NOVA_WEBHOOK_URL', webhook);
    setIsSaving(false);
    alert('Webhook vinculado correctamente.');
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image) {
      alert('Debes asignar un nombre y una imagen a la reliquia.');
      return;
    }
    setIsSaving(true);
    try {
      await addItemToDB(newItem);
      alert('¡Reliquia forjada con éxito! Aparecerá en el catálogo ahora.');
      window.location.reload();
    } catch (e) {
      alert('Error al forjar objeto.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateMasterLink = () => {
    const localItems = localStorage.getItem('nova_local_items') || '[]';
    const currentWebhook = localStorage.getItem('nova_setting_NOVA_WEBHOOK_URL') || '';
    
    const config = {
      items: JSON.parse(localItems),
      webhook: currentWebhook
    };
    
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = `${window.location.origin}${window.location.pathname}?master=${encoded}`;
    setMasterLink(url);
    
    navigator.clipboard.writeText(url);
    alert('¡Link Maestro copiado al portapapeles! Envíalo a otros para compartir tu configuración.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl border-[#d4af37]/30">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-4 uppercase tracking-[10px] text-center">Enlace Maestro</h2>
        <p className="text-gray-400 text-[10px] uppercase tracking-widest text-center mb-8">Comparte tu Webhook e ítems creados con otros usuarios</p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={generateMasterLink}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-black py-5 rounded-2xl uppercase tracking-[4px] hover:brightness-125 transition-all shadow-lg"
          >
            Generar y Copiar Link Maestro
          </button>
          {masterLink && (
            <div className="p-4 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
              <p className="text-[9px] text-amber-200/50 break-all font-mono">{masterLink}</p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl border-[#d4af37]/30">
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-[10px] text-center">Control de Soporte</h2>
        <div className="space-y-6">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Webhook de Discord</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="password"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37] transition-all"
            />
            <button 
              onClick={handleSaveWebhook}
              disabled={isSaving}
              className="bg-[#d4af37] text-black font-black px-10 py-5 rounded-2xl hover:bg-white transition-all uppercase text-xs tracking-widest disabled:opacity-50"
            >
              Vincular
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <span className="text-[10px] text-[#d4af37] font-bold uppercase bg-black/40 px-3 py-1 rounded-full border border-[#d4af37]/20">Modo Forja Activo</span>
        </div>
        <h2 className="text-4xl font-shaiya text-[#d4af37] mb-10 uppercase tracking-[10px] text-center">Crear Nueva Reliquia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-2 block">Nombre de la Reliquia</label>
              <input placeholder="Ej: Dragón Infernal" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-2 block">Esencia (Categoría)</label>
              <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none cursor-pointer" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as Category})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-2 block">Reflejo (URL Imagen)</label>
              <input placeholder="https://..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-2 block">Inscripción (Descripción)</label>
            <textarea placeholder="Narra los orígenes de este poder..." className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none resize-none min-h-[220px] focus:border-[#d4af37]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
          </div>
        </div>
        <button 
          onClick={handleAddItem} 
          disabled={isSaving}
          className="w-full mt-10 bg-white hover:bg-[#d4af37] text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] transition-all shadow-xl hover:shadow-[#d4af37]/20 disabled:opacity-50"
        >
          {isSaving ? 'Forjando...' : 'Publicar Objeto'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
