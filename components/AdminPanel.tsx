
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getStaffApplications, updateStaffApplicationStatus } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'promos' | 'apps' | 'settings'>('items');
  const [isSaving, setIsSaving] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [appsList, setAppsList] = useState<StaffApplication[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados de Configuración
  const [config, setConfig] = useState({
    webhookSupport: '',
    webhookApps: '',
    webhookWelcome: '',
    clientId: '',
    supabaseUrl: '',
    supabaseKey: '',
    botToken: '',
    guildId: '',
    roleGs: '',
    roleLgs: '',
    roleGm: ''
  });

  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '', category: Category.MOUNT, image: '', description: '', 
    faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: '', stats: ''
  });

  const loadAll = async () => {
    const loadedConfig = {
      webhookSupport: await getSetting('NOVA_WEBHOOK_URL') || '',
      webhookApps: await getSetting('NOVA_STAFF_APP_WEBHOOK') || '',
      webhookWelcome: await getSetting('NOVA_STAFF_WELCOME_WEBHOOK') || '',
      clientId: await getSetting('DISCORD_CLIENT_ID') || '',
      supabaseUrl: localStorage.getItem('nova_setting_SUPABASE_URL') || '',
      supabaseKey: localStorage.getItem('nova_setting_SUPABASE_ANON_KEY') || '',
      botToken: await getSetting('DISCORD_BOT_TOKEN') || '',
      guildId: await getSetting('DISCORD_GUILD_ID') || '',
      roleGs: await getSetting('ROLE_ID_GS') || '',
      roleLgs: await getSetting('ROLE_ID_LGS') || '',
      roleGm: await getSetting('ROLE_ID_GM') || ''
    };
    setConfig(loadedConfig);
    
    const dbItems = await getItemsFromDB();
    setItemsList(dbItems);
    setAppsList(await getStaffApplications());
  };

  useEffect(() => { loadAll(); }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await saveSetting('NOVA_WEBHOOK_URL', config.webhookSupport);
    await saveSetting('NOVA_STAFF_APP_WEBHOOK', config.webhookApps);
    await saveSetting('NOVA_STAFF_WELCOME_WEBHOOK', config.webhookWelcome);
    await saveSetting('DISCORD_CLIENT_ID', config.clientId);
    await saveSetting('DISCORD_BOT_TOKEN', config.botToken);
    await saveSetting('DISCORD_GUILD_ID', config.guildId);
    await saveSetting('ROLE_ID_GS', config.roleGs);
    await saveSetting('ROLE_ID_LGS', config.roleLgs);
    await saveSetting('ROLE_ID_GM', config.roleGm);
    localStorage.setItem('nova_setting_SUPABASE_URL', config.supabaseUrl);
    localStorage.setItem('nova_setting_SUPABASE_ANON_KEY', config.supabaseKey);
    setIsSaving(false);
    alert('Configuración Ancestral Guardada.');
  };

  const generateMasterLink = () => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const link = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    navigator.clipboard.writeText(link);
    alert("¡Link Maestro copiado!");
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image) return alert("Faltan datos.");
    setIsSaving(true);
    try {
      if (editingId) await updateItemInDB({ ...newItem, id: editingId });
      else await addItemToDB(newItem);
      setNewItem({ name: '', category: Category.MOUNT, image: '', description: '', faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH });
      setEditingId(null);
      loadAll();
    } catch { alert('Error.'); }
    finally { setIsSaving(false); }
  };

  const handleEdit = (item: GameItem) => {
    setNewItem(item);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAppStatus = async (app: StaffApplication, newStatus: 'accepted' | 'rejected') => {
    if (!window.confirm(`¿${newStatus === 'accepted' ? 'ACEPTAR' : 'RECHAZAR'} a ${app.username}?`)) return;
    
    await updateStaffApplicationStatus(app.id, newStatus);
    
    if (newStatus === 'accepted') {
      // 1. Enviar Bienvenida
      if (config.webhookWelcome) {
        await fetch(config.webhookWelcome, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: "🌟 NUEVO STAFF NOVA 🌟",
              description: `¡Bienvenido **${app.username}** como **${app.position}**!`,
              color: 0x00ff00,
              thumbnail: { url: app.avatar_url }
            }]
          })
        });
      }

      // 2. Auto-Rol (Requiere Bot Token)
      if (config.botToken && config.guildId && app.discord_user_id) {
        const roleId = app.position === 'Game Sage' ? config.roleGs : 
                       app.position === 'Lider Game Sage' ? config.roleLgs : config.roleGm;
        
        if (roleId) {
          try {
            await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/members/${app.discord_user_id}/roles/${roleId}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bot ${config.botToken}` }
            });
          } catch (e) { console.error("Error auto-rol:", e); }
        }
      }
    }
    loadAll();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      {/* Tabs */}
      <div className="flex flex-wrap gap-4 justify-center">
        {['items', 'promos', 'apps', 'settings'].map(t => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`px-8 py-3 rounded-xl font-black uppercase text-xs transition-all ${activeSubTab === t ? 'bg-[#d4af37] text-black shadow-lg' : 'bg-black/40 text-gray-500 border border-white/5'}`}>
            {t === 'items' ? 'Reliquias' : t === 'promos' ? 'Promos' : t === 'apps' ? 'Staff' : 'Ajustes'}
          </button>
        ))}
      </div>

      {activeSubTab === 'items' || activeSubTab === 'promos' ? (
        <div className="space-y-12">
          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 text-center uppercase tracking-widest">{editingId ? 'Reforjar' : 'Nueva Forja'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input placeholder="Nombre" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {newItem.category === Category.COSTUME && (
                <>
                  <select className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl text-white" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as any})}>
                    <option value={Faction.LIGHT}>Luz</option>
                    <option value={Faction.FURY}>Furia</option>
                  </select>
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                    <option value="All">Todas las Clases</option>
                    {newItem.faction && CLASSES_BY_FACTION[newItem.faction as Faction].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as any})}>
                    <option value={Gender.BOTH}>Ambos Sexos</option>
                    <option value={Gender.MALE}>Masculino</option>
                    <option value={Gender.FEMALE}>Femenino</option>
                  </select>
                </>
              )}
              {newItem.category === Category.PROMOTION && (
                <input placeholder="Precio AP" className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl text-white" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              )}
              <input placeholder="Imagen URL" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
              <input placeholder="Stats (Ej: +15 Str)" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white md:col-span-2" value={newItem.stats} onChange={e => setNewItem({...newItem, stats: e.target.value})} />
              <textarea placeholder="Descripción" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white md:col-span-2 h-24" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            </div>
            <button onClick={handleAddItem} className="w-full mt-8 bg-white text-black font-black py-4 rounded-2xl uppercase hover:bg-[#d4af37] transition-all">
              {editingId ? 'Actualizar' : 'Publicar'}
            </button>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-white/5 overflow-hidden">
            <h3 className="text-xl font-shaiya text-white mb-6 uppercase tracking-widest text-center">Gestión de Archivo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black uppercase text-[#d4af37]">
                  <tr><th className="p-4">Item</th><th className="p-4">Categoría</th><th className="p-4 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemsList.filter(i => activeSubTab === 'items' ? i.category !== Category.PROMOTION : i.category === Category.PROMOTION).map(item => (
                    <tr key={item.id} className="group hover:bg-white/5">
                      <td className="p-4"><div className="flex items-center gap-3"><img src={item.image} className="w-10 h-10 rounded object-cover" />{item.name}</div></td>
                      <td className="p-4 text-[10px] text-gray-500">{item.category}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleEdit(item)} className="p-2 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-lg mr-2">✏️</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteItemFromDB(item.id).then(loadAll) }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'settings' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 shadow-2xl space-y-8">
          <h2 className="text-3xl font-shaiya text-[#d4af37] text-center uppercase">Núcleo NOVA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input placeholder="Webhook Soporte" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.webhookSupport} onChange={e => setConfig({...config, webhookSupport: e.target.value})} />
            <input placeholder="Webhook Postulaciones" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.webhookApps} onChange={e => setConfig({...config, webhookApps: e.target.value})} />
            <input placeholder="Webhook Bienvenida Staff" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.webhookWelcome} onChange={e => setConfig({...config, webhookWelcome: e.target.value})} />
            <input placeholder="Discord Bot Token (Para Auto-Rol)" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.botToken} onChange={e => setConfig({...config, botToken: e.target.value})} />
            <input placeholder="Discord Server ID (Guild ID)" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.guildId} onChange={e => setConfig({...config, guildId: e.target.value})} />
            <input placeholder="ID Rol GS" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleGs} onChange={e => setConfig({...config, roleGs: e.target.value})} />
            <input placeholder="ID Rol Lider GS" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleLgs} onChange={e => setConfig({...config, roleLgs: e.target.value})} />
            <input placeholder="ID Rol GM" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleGm} onChange={e => setConfig({...config, roleGm: e.target.value})} />
          </div>
          <div className="flex gap-4">
            <button onClick={handleSaveSettings} className="flex-grow bg-[#d4af37] text-black font-black py-4 rounded-2xl uppercase">Guardar</button>
            <button onClick={generateMasterLink} className="flex-grow bg-white text-black font-black py-4 rounded-2xl uppercase">Link Maestro</button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] space-y-6">
           {appsList.map(app => (
             <div key={app.id} className="bg-black/40 p-6 rounded-2xl border border-white/10 flex justify-between items-center">
               <div className="flex gap-4 items-center">
                 <img src={app.avatar_url} className="w-12 h-12 rounded-full border border-[#d4af37]" />
                 <div><p className="text-white font-shaiya">{app.username}</p><p className="text-[#d4af37] text-[10px] uppercase">{app.position}</p></div>
               </div>
               <div className="flex gap-3">
                 {app.status === 'pending' ? (
                   <>
                    <button onClick={() => handleAppStatus(app, 'accepted')} className="bg-green-600 px-4 py-2 rounded-lg text-white font-black text-[10px] uppercase">Aceptar</button>
                    <button onClick={() => handleAppStatus(app, 'rejected')} className="bg-red-600 px-4 py-2 rounded-lg text-white font-black text-[10px] uppercase">Rechazar</button>
                   </>
                 ) : <span className="text-gray-500 font-black uppercase text-[10px]">{app.status}</span>}
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
