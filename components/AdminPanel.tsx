
import React, { useState, useEffect, useRef } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getStaffApplications, updateStaffApplicationStatus, pushLocalItemsToCloud, deleteStaffApplicationFromDB, uploadFile } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'promos' | 'apps' | 'settings'>('items');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [appsList, setAppsList] = useState<StaffApplication[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingApp, setViewingApp] = useState<StaffApplication | null>(null);
  
  const itemFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

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
    roleGm: '',
    siteLogo: '',
    siteBg: ''
  });

  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '', category: Category.MOUNT, image: '', description: '', 
    faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: '', stats: ''
  });

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
      roleGm: await getSetting('ROLE_ID_GM') || '',
      siteLogo: await getSetting('SITE_LOGO_URL') || '',
      siteBg: await getSetting('SITE_BG_URL') || ''
    };
    setConfig(loadedConfig);
  };

  useEffect(() => {
    loadConfig();
    loadData();
  }, [activeSubTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'logo' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const folder = type === 'item' ? 'items' : 'branding';
      const publicUrl = await uploadFile(file, folder);
      
      if (type === 'item') {
        setNewItem(prev => ({ ...prev, image: publicUrl }));
      } else if (type === 'logo') {
        setConfig(prev => ({ ...prev, siteLogo: publicUrl }));
      } else if (type === 'bg') {
        setConfig(prev => ({ ...prev, siteBg: publicUrl }));
      }
      alert("¡Imagen cargada exitosamente!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloudSync = async () => {
    if (!window.confirm("¿Sincronizar todos los items con la nube?")) return;
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
    await saveSetting('SITE_LOGO_URL', config.siteLogo);
    await saveSetting('SITE_BG_URL', config.siteBg);
    localStorage.setItem('nova_setting_SUPABASE_URL', config.supabaseUrl);
    localStorage.setItem('nova_setting_SUPABASE_ANON_KEY', config.supabaseKey);
    setIsSaving(false);
    alert('Configuración Nucleares Guardada.');
    loadConfig();
  };

  const generateMasterLink = () => {
    const payload = {
      ...config,
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const link = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    
    navigator.clipboard.writeText(link).then(() => {
      alert("¡LINK MAESTRO GENERADO! Incluye fondo épico, logo y toda la configuración del reino.");
    });
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
    } catch { alert('Error de sincronización.'); }
    finally { setIsSaving(false); }
  };

  const assignDiscordRole = async (userId: string, position: string) => {
    const botTokenRaw = (await getSetting('DISCORD_BOT_TOKEN') || '').trim();
    const guildId = (await getSetting('DISCORD_GUILD_ID') || '').trim();
    const roleGs = (await getSetting('ROLE_ID_GS') || '').trim();
    const roleLgs = (await getSetting('ROLE_ID_LGS') || '').trim();
    const roleGm = (await getSetting('ROLE_ID_GM') || '').trim();

    if (!botTokenRaw || !guildId) return false;

    let cleanToken = botTokenRaw.startsWith('Bot ') ? botTokenRaw.replace('Bot ', '').trim() : botTokenRaw.trim();

    let roleId = '';
    const pos = position.toLowerCase();
    if (pos.includes('sage') && !pos.includes('lider')) roleId = roleGs;
    else if (pos.includes('lider')) roleId = roleLgs;
    else if (pos.includes('gm')) roleId = roleGm;

    if (!roleId) return false;

    try {
      const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId.trim()}/roles/${roleId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      return response.ok;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleAppStatus = async (app: StaffApplication, status: 'accepted' | 'rejected') => {
    if (!window.confirm(`¿Deseas ${status === 'accepted' ? 'ACEPTAR' : 'RECHAZAR'} a ${app.username}?`)) return;
    setIsSaving(true);
    try {
      await updateStaffApplicationStatus(app.id, status);
      if (status === 'accepted') {
        const roleSuccess = await assignDiscordRole(app.discord_user_id, app.position);
        const webhookWelcome = await getSetting('NOVA_STAFF_WELCOME_WEBHOOK');
        if (webhookWelcome) {
          await fetch(webhookWelcome, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: "🛡️ ¡Nuevo Guardián en NOVA! 🛡️",
                description: `¡Bienvenido **${app.username}** como **${app.position}**!\n\n${roleSuccess ? '✅ **Rol asignado.**' : '⚠️ **Revisar Jerarquía de Roles en Discord.**'}`,
                color: 0xd4af37,
                thumbnail: { url: app.avatar_url },
                footer: { text: "Sistema de Auto-Gestión de NOVA" },
                timestamp: new Date().toISOString()
              }]
            })
          });
        }
      }
      loadData();
      setViewingApp(null);
    } catch (err) { alert("Error al procesar."); }
    finally { setIsSaving(false); }
  };

  const handleDeleteApp = async (id: string) => {
    if (!window.confirm("¿Eliminar para siempre?")) return;
    setIsSaving(true);
    try {
      await deleteStaffApplicationFromDB(id);
      loadData();
    } catch { alert("Error al eliminar."); }
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
              <div className="flex gap-2">
                <input placeholder="Imagen URL" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-[10px]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                <button onClick={() => itemFileRef.current?.click()} className="bg-white/10 border border-white/20 text-white px-4 rounded-xl text-[10px] font-black uppercase hover:bg-[#d4af37] hover:text-black transition-all">
                  {isUploading ? '⌛' : 'Subir'}
                </button>
                <input type="file" ref={itemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'item')} />
              </div>
              <input placeholder="Stats (Ej: +15 Str)" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.stats} onChange={e => setNewItem({...newItem, stats: e.target.value})} />
              <textarea placeholder="Descripción" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white md:col-span-2 h-24" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            </div>
            {newItem.image && (
              <div className="mt-4 flex justify-center">
                <img src={newItem.image} className="h-32 rounded-xl border border-[#d4af37]/40 shadow-xl" alt="Preview" />
              </div>
            )}
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full mt-8 bg-white text-black font-black py-4 rounded-2xl uppercase hover:bg-[#d4af37] transition-all disabled:opacity-50">
              {editingId ? 'Actualizar Reliquia' : 'Publicar en el Reino'}
            </button>
          </div>
          {/* LISTADO DE ITEMS ABAJO */}
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
        <div className="space-y-10 animate-fade-in">
          {/* SECCIÓN LINK MAESTRO DESTACADA */}
          <div className="glass-panel p-10 rounded-[3rem] border-2 border-dashed border-[#d4af37] bg-[#d4af37]/5 space-y-6 shadow-2xl relative overflow-hidden">
             <div className="text-center relative z-10">
                <h2 className="text-3xl font-shaiya text-[#d4af37] uppercase tracking-widest mb-2">Sincronización Total</h2>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-[4px] max-w-xl mx-auto">Genera un enlace único con tus 13 ajustes (Logo, Fondo, Webhooks y Supabase).</p>
             </div>
             <div className="flex justify-center pt-4">
                <button onClick={generateMasterLink} className="px-12 py-5 bg-white text-black font-black rounded-2xl uppercase tracking-[6px] hover:bg-[#d4af37] transition-all shadow-xl">
                  🔗 GENERAR LINK MAESTRO
                </button>
             </div>
          </div>

          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-shaiya text-white text-center uppercase tracking-widest">Branding del Reino</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* CONFIGURACIÓN DE LOGO */}
               <div className="bg-black/60 p-6 rounded-3xl border border-white/5 space-y-4">
                 <h3 className="text-[#d4af37] font-black text-[10px] uppercase tracking-widest">Logo Principal</h3>
                 <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-black/40 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                      {config.siteLogo ? <img src={config.siteLogo} className="w-full h-full object-contain" /> : <span className="text-[9px] text-gray-700">VACÍO</span>}
                    </div>
                    <div className="flex-grow">
                      <button onClick={() => logoFileRef.current?.click()} className="w-full bg-white/5 border border-white/10 text-white text-[10px] font-black py-2 rounded-lg uppercase hover:bg-[#d4af37] hover:text-black transition-all">Subir Logo</button>
                      <input type="file" ref={logoFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                    </div>
                 </div>
               </div>

               {/* CONFIGURACIÓN DE FONDO */}
               <div className="bg-black/60 p-6 rounded-3xl border border-white/5 space-y-4">
                 <h3 className="text-[#d4af37] font-black text-[10px] uppercase tracking-widest">Fondo Épico</h3>
                 <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                      {config.siteBg ? <img src={config.siteBg} className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-700 p-2 block">DEFAULT</span>}
                    </div>
                    <div className="flex-grow">
                      <button onClick={() => bgFileRef.current?.click()} className="w-full bg-white/5 border border-white/10 text-white text-[10px] font-black py-2 rounded-lg uppercase hover:bg-[#d4af37] hover:text-black transition-all">Subir Fondo</button>
                      <input type="file" ref={bgFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
                    </div>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div className="space-y-4">
                <h3 className="text-white text-[10px] font-black uppercase tracking-widest ml-2">Webhooks y Discord</h3>
                <input placeholder="Webhook Soporte" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookSupport} onChange={e => setConfig({...config, webhookSupport: e.target.value})} />
                <input placeholder="Webhook Postulaciones" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookApps} onChange={e => setConfig({...config, webhookApps: e.target.value})} />
                <input placeholder="Webhook Bienvenida" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookWelcome} onChange={e => setConfig({...config, webhookWelcome: e.target.value})} />
                <input placeholder="Discord Client ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.clientId} onChange={e => setConfig({...config, clientId: e.target.value})} />
                <input placeholder="Bot Token" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.botToken} onChange={e => setConfig({...config, botToken: e.target.value})} />
              </div>

              <div className="space-y-4">
                <h3 className="text-white text-[10px] font-black uppercase tracking-widest ml-2">Supabase y Roles</h3>
                <input placeholder="Supabase URL" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseUrl} onChange={e => setConfig({...config, supabaseUrl: e.target.value})} />
                <input placeholder="Supabase Key" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseKey} onChange={e => setConfig({...config, supabaseKey: e.target.value})} />
                <input placeholder="Guild ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.guildId} onChange={e => setConfig({...config, guildId: e.target.value})} />
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="GS" className="bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.roleGs} onChange={e => setConfig({...config, roleGs: e.target.value})} />
                  <input placeholder="L-GS" className="bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.roleLgs} onChange={e => setConfig({...config, roleLgs: e.target.value})} />
                  <input placeholder="GM" className="bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.roleGm} onChange={e => setConfig({...config, roleGm: e.target.value})} />
                </div>
              </div>
            </div>

            <button onClick={handleSaveSettings} disabled={isSaving || isUploading} className="w-full bg-[#d4af37] text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-white transition-all shadow-xl disabled:opacity-50">
              {isSaving ? 'Guardando Destino...' : 'Confirmar Ajustes del Reino'}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] min-h-[400px] border border-white/10 relative">
           <div className="flex justify-between items-center mb-10">
             <h2 className="text-3xl font-shaiya text-white uppercase tracking-widest">Candidatos al Staff</h2>
             <button onClick={loadData} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase text-[#d4af37] hover:bg-white/10">Refrescar</button>
           </div>
           <div className="space-y-6">
             {appsList.length === 0 ? (
               <div className="text-center py-20 text-gray-600 font-shaiya text-xl uppercase">Sin pergaminos pendientes</div>
             ) : (
               appsList.map(app => (
                 <div key={app.id} className="bg-black/40 p-6 rounded-3xl border border-white/10 flex justify-between items-center group">
                   <div className="flex gap-6 items-center flex-grow cursor-pointer" onClick={() => setViewingApp(app)}>
                     <img src={app.avatar_url} className="w-16 h-16 rounded-2xl border-2 border-[#d4af37]" />
                     <div>
                       <p className="text-white text-xl font-shaiya group-hover:text-[#d4af37]">{app.username}</p>
                       <p className="text-[#d4af37] text-[10px] uppercase font-black">{app.position}</p>
                     </div>
                   </div>
                   <div className="flex gap-3">
                     <button onClick={() => setViewingApp(app)} className="p-3 bg-white/5 text-[#d4af37] border border-[#d4af37]/20 rounded-xl">👁️</button>
                     {app.status === 'pending' ? (
                       <>
                        <button onClick={() => handleAppStatus(app, 'accepted')} className="bg-green-600/20 text-green-500 border border-green-500/30 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Aceptar</button>
                        <button onClick={() => handleAppStatus(app, 'rejected')} className="bg-red-600/20 text-red-500 border border-red-500/30 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Rechazar</button>
                       </>
                     ) : <span className={`px-6 py-2 rounded-xl font-black uppercase text-[10px] border ${app.status === 'accepted' ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'}`}>{app.status}</span>}
                     <button onClick={() => handleDeleteApp(app.id)} className="p-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl">🗑️</button>
                   </div>
                 </div>
               ))
             )}
           </div>
           {viewingApp && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
               <div className="max-w-2xl w-full glass-panel p-10 rounded-[3rem] border-[#d4af37] shadow-2xl relative">
                 <button onClick={() => setViewingApp(null)} className="absolute top-6 right-8 text-white/50 hover:text-white">✕</button>
                 <div className="flex items-center gap-6 mb-10 border-b border-white/10 pb-8">
                   <img src={viewingApp.avatar_url} className="w-24 h-24 rounded-3xl border-2 border-[#d4af37]" />
                   <div>
                     <h3 className="text-4xl font-shaiya text-white uppercase">{viewingApp.username}</h3>
                     <p className="text-[#d4af37] text-xs font-black uppercase">{viewingApp.position}</p>
                   </div>
                 </div>
                 <div className="space-y-6">
                   <div className="bg-black/40 p-4 rounded-xl"><h4 className="text-[#d4af37] text-[10px] font-black uppercase mb-2">Experiencia</h4><p className="text-gray-300 text-sm italic">{viewingApp.answers.experience}</p></div>
                   <div className="bg-black/40 p-4 rounded-xl"><h4 className="text-[#d4af37] text-[10px] font-black uppercase mb-2">Motivación</h4><p className="text-gray-300 text-sm italic">{viewingApp.answers.motivation}</p></div>
                 </div>
                 <div className="mt-10 flex gap-4">
                   {viewingApp.status === 'pending' && <button onClick={() => handleAppStatus(viewingApp, 'accepted')} className="flex-grow bg-green-600 text-white font-black py-4 rounded-2xl uppercase text-xs">Aprobar</button>}
                   <button onClick={() => { handleDeleteApp(viewingApp.id); setViewingApp(null); }} className="px-8 bg-red-600/10 text-red-500 border border-red-500/20 font-black py-4 rounded-2xl uppercase text-xs">Eliminar</button>
                 </div>
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
