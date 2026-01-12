
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getStaffApplications, updateStaffApplicationStatus, pushLocalItemsToCloud } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'promos' | 'apps' | 'settings'>('items');
  const [isSaving, setIsSaving] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [appsList, setAppsList] = useState<StaffApplication[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const loadData = async () => {
    try {
      if (activeSubTab === 'apps') {
        const apps = await getStaffApplications();
        setAppsList(apps);
      } else if (activeSubTab === 'items' || activeSubTab === 'promos') {
        const items = await getItemsFromDB();
        setItemsList(items);
      }
    } catch (e) {
      console.error("Error loading subtab data:", e);
    }
  };

  const loadConfig = async () => {
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
  };

  useEffect(() => {
    loadConfig();
    loadData();
  }, [activeSubTab]);

  const handleCloudSync = async () => {
    if (!window.confirm("¿Quieres subir todos los items locales a la nube para que sean visibles globalmente?")) return;
    setIsSaving(true);
    try {
      const result = await pushLocalItemsToCloud();
      alert(`¡Éxito! Se han sincronizado ${result.count} items con la nube.`);
      loadData();
    } catch (e: any) {
      alert("Error de Sincronización: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

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
      loadData();
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
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-wrap gap-4 justify-center">
        {['items', 'promos', 'apps', 'settings'].map(t => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`px-8 py-3 rounded-xl font-black uppercase text-xs transition-all ${activeSubTab === t ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-black/40 text-gray-500 border border-white/5'}`}>
            {t === 'items' ? 'Reliquias' : t === 'promos' ? 'Promos' : t === 'apps' ? 'Staff' : 'Ajustes'}
          </button>
        ))}
      </div>

      {activeSubTab === 'items' || activeSubTab === 'promos' ? (
        <div className="space-y-12">
          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 shadow-2xl relative overflow-hidden">
             <div className="absolute top-4 right-4">
                <button onClick={handleCloudSync} disabled={isSaving} className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                  {isSaving ? 'Sincronizando...' : 'Sincronizar a la Nube'}
                </button>
             </div>
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
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteItemFromDB(item.id).then(loadData) }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {itemsList.length === 0 && <p className="text-center py-10 text-gray-600 font-shaiya">No hay reliquias en este archivo.</p>}
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
            <input placeholder="Discord Bot Token" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.botToken} onChange={e => setConfig({...config, botToken: e.target.value})} />
            <input placeholder="Discord Server ID" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.guildId} onChange={e => setConfig({...config, guildId: e.target.value})} />
            <input placeholder="ID Rol GS" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleGs} onChange={e => setConfig({...config, roleGs: e.target.value})} />
            <input placeholder="ID Rol Lider GS" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleLgs} onChange={e => setConfig({...config, roleLgs: e.target.value})} />
            <input placeholder="ID Rol GM" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleGm} onChange={e => setConfig({...config, roleGm: e.target.value})} />
            <input placeholder="Supabase URL" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.supabaseUrl} onChange={e => setConfig({...config, supabaseUrl: e.target.value})} />
            <input placeholder="Supabase Key" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.supabaseKey} onChange={e => setConfig({...config, supabaseKey: e.target.value})} />
          </div>
          <div className="flex gap-4">
            <button onClick={handleSaveSettings} className="flex-grow bg-[#d4af37] text-black font-black py-4 rounded-2xl uppercase">Guardar Ajustes</button>
            <button onClick={generateMasterLink} className="flex-grow bg-white text-black font-black py-4 rounded-2xl uppercase">Link Maestro</button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 min-h-[400px]">
           <h2 className="text-3xl font-shaiya text-white mb-10 text-center uppercase tracking-widest">Candidatos al Staff</h2>
           <div className="space-y-6">
             {appsList.length === 0 && (
               <div className="text-center py-20">
                 <p className="text-gray-600 font-shaiya text-xl">No hay pergaminos de aplicación por ahora...</p>
                 <button onClick={loadData} className="mt-4 text-[#d4af37] text-[10px] uppercase font-black">Refrescar Pergaminos</button>
               </div>
             )}
             {appsList.map(app => (
               <div key={app.id} className="bg-black/40 p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-[#d4af37]/40 transition-all">
                 <div className="flex gap-6 items-center">
                   <img src={app.avatar_url} className="w-16 h-16 rounded-2xl border-2 border-[#d4af37] shadow-lg" />
                   <div>
                     <p className="text-white text-xl font-shaiya">{app.username}</p>
                     <p className="text-[#d4af37] text-[10px] uppercase font-black tracking-widest">{app.position} • {app.discord_id}</p>
                   </div>
                 </div>
                 <div className="flex gap-3 w-full md:w-auto">
                   {app.status === 'pending' ? (
                     <>
                      <button onClick={() => handleAppStatus(app, 'accepted')} className="flex-grow md:flex-none bg-green-600/20 text-green-500 border border-green-500/30 px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-green-600 hover:text-white transition-all">Aceptar</button>
                      <button onClick={() => handleAppStatus(app, 'rejected')} className="flex-grow md:flex-none bg-red-600/20 text-red-500 border border-red-500/30 px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">Rechazar</button>
                     </>
                   ) : (
                     <span className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] border ${app.status === 'accepted' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>
                       {app.status === 'accepted' ? 'ACEPTADO' : 'RECHAZADO'}
                     </span>
                   )}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
