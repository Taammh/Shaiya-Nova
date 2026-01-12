
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, pushLocalItemsToCloud, getSupabase, getStaffApplications, updateStaffApplicationStatus } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'promos' | 'apps' | 'settings'>('items');
  const [webhook, setWebhook] = useState('');
  const [appWebhook, setAppWebhook] = useState('');
  const [welcomeWebhook, setWelcomeWebhook] = useState('');
  const [clientId, setClientId] = useState('');
  const [sUrl, setSUrl] = useState('');
  const [sKey, setSKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [appsList, setAppsList] = useState<StaffApplication[]>([]);
  const [cloudItemIds, setCloudItemIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '', category: Category.MOUNT, image: '', description: '', faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: ''
  });

  const loadAll = async () => {
    setWebhook(await getSetting('NOVA_WEBHOOK_URL') || '');
    setAppWebhook(await getSetting('NOVA_STAFF_APP_WEBHOOK') || '');
    setWelcomeWebhook(await getSetting('NOVA_STAFF_WELCOME_WEBHOOK') || '');
    setClientId(await getSetting('DISCORD_CLIENT_ID') || '');
    setSUrl(localStorage.getItem('nova_setting_SUPABASE_URL') || '');
    setSKey(localStorage.getItem('nova_setting_SUPABASE_ANON_KEY') || '');
    
    setItemsList(await getItemsFromDB());
    setAppsList(await getStaffApplications());

    const { client, isPlaceholder } = getSupabase();
    if (!isPlaceholder) {
      try {
        const { data } = await client.from('items').select('id');
        if (data) setCloudItemIds(new Set(data.map(d => d.id)));
      } catch {}
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await saveSetting('NOVA_WEBHOOK_URL', webhook);
    await saveSetting('NOVA_STAFF_APP_WEBHOOK', appWebhook);
    await saveSetting('NOVA_STAFF_WELCOME_WEBHOOK', welcomeWebhook);
    await saveSetting('DISCORD_CLIENT_ID', clientId);
    localStorage.setItem('nova_setting_SUPABASE_URL', sUrl);
    localStorage.setItem('nova_setting_SUPABASE_ANON_KEY', sKey);
    setIsSaving(false);
    alert('Configuración guardada.');
  };

  const handleAddItem = async () => {
    setIsSaving(true);
    try {
      if (editingId) await updateItemInDB({ ...newItem, id: editingId });
      else await addItemToDB(newItem);
      setNewItem({ name: '', category: Category.MOUNT, image: '', description: '', price: '' });
      setEditingId(null);
      loadAll();
    } catch { alert('Error.'); }
    finally { setIsSaving(false); }
  };

  const handleAppStatus = async (app: StaffApplication, newStatus: 'accepted' | 'rejected') => {
    if (!window.confirm(`¿Seguro que quieres ${newStatus === 'accepted' ? 'ACEPTAR' : 'RECHAZAR'} a ${app.username}?`)) return;
    
    await updateStaffApplicationStatus(app.id, newStatus);
    
    if (newStatus === 'accepted' && welcomeWebhook) {
      await fetch(welcomeWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: "🌟 NUEVO MIEMBRO DEL STAFF 🌟",
            description: `¡El Consejo de NOVA ha hablado! Demos la bienvenida a nuestro nuevo **${app.position}**.`,
            color: 0x00ff00,
            thumbnail: { url: app.avatar_url },
            fields: [
              { name: "Nombre", value: `**${app.username}**`, inline: true },
              { name: "Puesto", value: `\`${app.position}\``, inline: true }
            ],
            footer: { text: "Que Etain guíe tus pasos en este nuevo camino." }
          }]
        })
      });
    }
    loadAll();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        {['items', 'promos', 'apps', 'settings'].map((t) => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`px-8 py-3 rounded-xl font-black uppercase text-xs transition-all ${activeSubTab === t ? 'bg-[#d4af37] text-black shadow-[0_0_20px_#d4af37/30]' : 'bg-black/40 text-gray-500 border border-white/5'}`}>
            {t === 'items' ? 'Reliquias' : t === 'promos' ? 'Promociones' : t === 'apps' ? 'Postulaciones' : 'Ajustes Portal'}
          </button>
        ))}
      </div>

      {activeSubTab === 'items' || activeSubTab === 'promos' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10">
          <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 text-center uppercase tracking-widest">{editingId ? 'Reforjar' : 'Nueva Forja'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <input placeholder="Nombre" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {newItem.category === Category.PROMOTION && (
              <input placeholder="Precio (Ej: 5000 AP)" className="bg-[#d4af37]/10 border border-[#d4af37]/40 p-4 rounded-xl text-white" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            )}
            <input placeholder="Imagen URL" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
            <textarea placeholder="Descripción" className="md:col-span-2 bg-black/60 border border-white/10 p-4 rounded-xl text-white h-24" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
          </div>
          <button onClick={handleAddItem} className="w-full mt-8 bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-[#d4af37]">Publicar</button>
        </div>
      ) : activeSubTab === 'apps' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10">
          <h2 className="text-3xl font-shaiya text-white mb-10 text-center uppercase tracking-widest">Candidatos al Staff</h2>
          <div className="space-y-6">
            {appsList.length === 0 && <p className="text-center text-gray-600 font-shaiya">No hay pergaminos de aplicación por ahora...</p>}
            {appsList.map(app => (
              <div key={app.id} className="bg-black/40 border border-white/5 p-8 rounded-3xl group">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-6">
                    <img src={app.avatar_url} className="w-20 h-20 rounded-2xl border-2 border-[#d4af37]" />
                    <div>
                      <h4 className="text-white text-2xl font-shaiya">{app.username}</h4>
                      <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">{app.position} • {app.discord_id}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {app.status === 'pending' ? (
                      <>
                        <button onClick={() => handleAppStatus(app, 'accepted')} className="px-6 py-2 bg-green-900/40 text-green-400 border border-green-500/30 rounded-xl font-black uppercase text-[10px]">Aceptar</button>
                        <button onClick={() => handleAppStatus(app, 'rejected')} className="px-6 py-2 bg-red-900/40 text-red-400 border border-red-500/30 rounded-xl font-black uppercase text-[10px]">Rechazar</button>
                      </>
                    ) : (
                      <span className={`px-6 py-2 rounded-xl font-black uppercase text-[10px] ${app.status === 'accepted' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>{app.status}</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] bg-black/20 p-6 rounded-2xl">
                  {Object.entries(app.answers).map(([key, val]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-gray-500 uppercase font-black">{key}:</p>
                      <p className="text-gray-300 italic">"{val}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20">
          <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 text-center uppercase tracking-widest">Núcleo del Portal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Supabase URL</label>
              <input value={sUrl} onChange={e => setSUrl(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Supabase Key</label>
              <input type="password" value={sKey} onChange={e => setSKey(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Webhook Soporte (Webhook #1)</label>
              <input value={webhook} onChange={e => setWebhook(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Webhook Postulaciones (Webhook #2)</label>
              <input value={appWebhook} onChange={e => setAppWebhook(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Webhook Bienvenidas (Webhook #3)</label>
              <input value={welcomeWebhook} onChange={e => setWelcomeWebhook(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Discord Client ID</label>
              <input value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" />
            </div>
          </div>
          <button onClick={handleSaveSettings} className="w-full mt-10 bg-[#d4af37] text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-white transition-all">Guardar Configuración Maestra</button>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
