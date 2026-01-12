
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getStaffApplications, updateStaffApplicationStatus, pushLocalItemsToCloud } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'promos' | 'apps' | 'settings'>('items');
  const [isSaving, setIsSaving] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [appsList, setAppsList] = useState<StaffApplication[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSqlHelp, setShowSqlHelp] = useState(false);

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

  const sqlSchema = `-- REPARACIÓN COMPLETA DE TABLAS NOVA

-- Agregar columnas faltantes a Items
ALTER TABLE items ADD COLUMN IF NOT EXISTS faction TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_class TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS stats TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS price TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS hidden_history TEXT;

-- Reparar tabla de Postulaciones (Staff)
CREATE TABLE IF NOT EXISTS staff_applications (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  discord_id TEXT,
  discord_user_id TEXT,
  position TEXT,
  answers JSONB,
  status TEXT DEFAULT 'pending',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forzar la columna discord_user_id si la tabla ya existía
ALTER TABLE staff_applications ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- Recargar esquema de Supabase (Importante para el error de cache)
NOTIFY pgrst, 'reload schema';`;

  const loadData = async () => {
    try {
      if (activeSubTab === 'apps') {
        const apps = await getStaffApplications();
        setAppsList(apps || []);
      } else {
        const items = await getItemsFromDB();
        setItemsList(items || []);
      }
    } catch (e) {
      console.error("Error loading data:", e);
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
    if (!window.confirm("¿Quieres subir todos los items locales a la nube?")) return;
    setIsSaving(true);
    try {
      const result = await pushLocalItemsToCloud();
      alert(`¡Éxito! Se han sincronizado ${result.count} items.`);
      loadData();
    } catch (e: any) {
      alert(e.message);
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
    alert('Configuración Nucleares Guardada.');
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
      setNewItem({ name: '', category: Category.MOUNT, image: '', description: '', faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: '', stats: '' });
      setEditingId(null);
      loadData();
    } catch { alert('Error de sincronización. Ejecuta el SQL de reparación en Supabase.'); }
    finally { setIsSaving(false); }
  };

  const handleAppStatus = async (app: StaffApplication, status: 'accepted' | 'rejected') => {
    if (!window.confirm(`¿Deseas ${status === 'accepted' ? 'ACEPTAR' : 'RECHAZAR'} a ${app.username}?`)) return;
    setIsSaving(true);
    try {
      await updateStaffApplicationStatus(app.id, status);
      if (status === 'accepted' && config.webhookWelcome) {
        await fetch(config.webhookWelcome, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: "🛡️ ¡Nuevo Guardián en NOVA! 🛡️",
              description: `¡Bienvenido **${app.username}** como **${app.position}**!`,
              color: 0x00ff00,
              thumbnail: { url: app.avatar_url }
            }]
          })
        });
      }
      loadData();
    } catch { alert("Error al actualizar."); }
    finally { setIsSaving(false); }
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
          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 shadow-2xl relative">
             <div className="absolute top-4 right-4">
                <button onClick={handleCloudSync} disabled={isSaving} className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                  {isSaving ? 'Sincronizando...' : 'Subir a la Nube'}
                </button>
             </div>
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 text-center uppercase tracking-widest">{editingId ? 'Reforjar' : 'Nueva Forja'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input placeholder="Nombre" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {newItem.category === Category.PROMOTION && (
                <input placeholder="Precio AP" className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl text-white md:col-span-2" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              )}

              {newItem.category === Category.COSTUME && (
                <>
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as any})}>
                    <option value={Faction.LIGHT}>Facción Luz</option>
                    <option value={Faction.FURY}>Facción Furia</option>
                  </select>
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                    <option value="All">Todas las Clases</option>
                    {newItem.faction && CLASSES_BY_FACTION[newItem.faction as Faction].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white md:col-span-2" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as any})}>
                    <option value={Gender.BOTH}>Ambos Sexos</option>
                    <option value={Gender.MALE}>Masculino</option>
                    <option value={Gender.FEMALE}>Femenino</option>
                  </select>
                </>
              )}

              <input placeholder="Imagen URL" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
              <input placeholder="Stats (Ej: +15 Str)" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.stats} onChange={e => setNewItem({...newItem, stats: e.target.value})} />
              <textarea placeholder="Descripción" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white md:col-span-2 h-24" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            </div>
            <button onClick={handleAddItem} className="w-full mt-8 bg-white text-black font-black py-4 rounded-2xl uppercase hover:bg-[#d4af37] transition-all">
              {editingId ? 'Actualizar' : 'Publicar'}
            </button>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
            <h3 className="text-xl font-shaiya text-white mb-6 uppercase text-center">Gestión de Archivo</h3>
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
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="p-2 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-lg mr-2">✏️</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteItemFromDB(item.id).then(loadData) }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'settings' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 space-y-8 shadow-2xl">
          <h2 className="text-3xl font-shaiya text-[#d4af37] text-center uppercase tracking-widest">Ajustes Nucleares</h2>
          
          <div className="bg-yellow-600/10 border border-yellow-500/30 p-6 rounded-2xl">
            <h3 className="text-[#d4af37] font-black text-xs uppercase mb-4 flex justify-between items-center">
              ⚠️ Reparación de Base de Datos
              <button onClick={() => setShowSqlHelp(!showSqlHelp)} className="underline text-[9px]">{showSqlHelp ? 'Ocultar' : 'Mostrar Ayuda SQL'}</button>
            </h3>
            {showSqlHelp && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-[10px] text-gray-400 uppercase mb-2">Copia y pega esto en Supabase SQL Editor si tienes errores de esquema:</p>
                <textarea readOnly className="w-full bg-black/80 text-green-500 font-mono text-[10px] p-4 rounded-lg h-48 border border-white/10" value={sqlSchema}></textarea>
                <button onClick={() => { navigator.clipboard.writeText(sqlSchema); alert("SQL Copiado."); }} className="bg-white/10 text-white px-4 py-2 rounded text-[9px] font-black uppercase">Copiar SQL</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Webhooks de Discord</label>
              <input placeholder="Webhook Soporte" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.webhookSupport} onChange={e => setConfig({...config, webhookSupport: e.target.value})} />
              <input placeholder="Webhook Postulaciones" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.webhookApps} onChange={e => setConfig({...config, webhookApps: e.target.value})} />
              <input placeholder="Webhook Bienvenida Staff" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.webhookWelcome} onChange={e => setConfig({...config, webhookWelcome: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Credenciales de Aplicación</label>
              <input placeholder="Discord Client ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value})} />
              <input placeholder="Discord Bot Token" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.botToken} onChange={e => setConfig({...config, botToken: e.target.value})} />
              <input placeholder="Discord Server (Guild) ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.guildId} onChange={e => setConfig({...config, guildId: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase ml-2">IDs de Roles Staff</label>
              <input placeholder="ID Rol Game Sage (GS)" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleGs} onChange={e => setConfig({...config, roleGs: e.target.value})} />
              <input placeholder="ID Rol Líder GS" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleLgs} onChange={e => setConfig({...config, roleLgs: e.target.value})} />
              <input placeholder="ID Rol GM" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.roleGm} onChange={e => setConfig({...config, roleGm: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Base de Datos (Supabase)</label>
              <input placeholder="Supabase URL" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.supabaseUrl} onChange={e => setConfig({...config, supabaseUrl: e.target.value})} />
              <input placeholder="Supabase Key (Anon Key)" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={config.supabaseKey} onChange={e => setConfig({...config, supabaseKey: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={handleSaveSettings} className="flex-grow bg-[#d4af37] text-black font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl hover:bg-white transition-all">Guardar Cambios</button>
            <button onClick={generateMasterLink} className="flex-grow bg-white text-black font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl hover:bg-[#d4af37] transition-all">Link Maestro</button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] min-h-[400px] border border-white/10">
           <div className="flex justify-between items-center mb-10">
             <h2 className="text-3xl font-shaiya text-white uppercase tracking-widest">Candidatos al Staff</h2>
             <button onClick={loadData} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase text-[#d4af37] hover:bg-white/10">Refrescar Lista</button>
           </div>
           
           <div className="space-y-6">
             {!appsList || appsList.length === 0 ? (
               <div className="text-center py-20">
                 <p className="text-gray-600 font-shaiya text-xl uppercase mb-4">No hay pergaminos en el archivo</p>
                 <p className="text-[10px] text-gray-500 uppercase">Asegúrate de haber ejecutado el SQL para reparar la columna 'discord_user_id'</p>
               </div>
             ) : (
               appsList.map(app => (
                 <div key={app.id} className="bg-black/40 p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-[#d4af37]/40 transition-all">
                   <div className="flex gap-6 items-center flex-grow">
                     <img src={app.avatar_url} className="w-16 h-16 rounded-2xl border-2 border-[#d4af37] shadow-lg" />
                     <div>
                       <p className="text-white text-xl font-shaiya">{app.username}</p>
                       <p className="text-[#d4af37] text-[10px] uppercase font-black tracking-widest">{app.position} • {app.discord_id}</p>
                     </div>
                   </div>
                   <div className="flex gap-3">
                     {app.status === 'pending' ? (
                       <>
                        <button onClick={() => handleAppStatus(app, 'accepted')} className="bg-green-600/20 text-green-500 border border-green-500/30 px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-green-600 hover:text-white transition-all">Aceptar</button>
                        <button onClick={() => handleAppStatus(app, 'rejected')} className="bg-red-600/20 text-red-500 border border-red-500/30 px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">Rechazar</button>
                       </>
                     ) : <span className={`px-6 py-2 rounded-xl font-black uppercase text-[10px] border ${app.status === 'accepted' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>{app.status}</span>}
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
