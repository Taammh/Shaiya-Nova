
import React, { useState, useEffect } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getSupabase, getStaffApplications, updateStaffApplicationStatus } from '../services/supabaseClient';

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
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '', 
    category: Category.MOUNT, 
    image: '', 
    description: '', 
    faction: Faction.LIGHT, 
    item_class: 'All', 
    gender: Gender.BOTH, 
    price: '',
    stats: ''
  });

  const loadAll = async () => {
    setWebhook(await getSetting('NOVA_WEBHOOK_URL') || '');
    setAppWebhook(await getSetting('NOVA_STAFF_APP_WEBHOOK') || '');
    setWelcomeWebhook(await getSetting('NOVA_STAFF_WELCOME_WEBHOOK') || '');
    setClientId(await getSetting('DISCORD_CLIENT_ID') || '');
    setSUrl(localStorage.getItem('nova_setting_SUPABASE_URL') || '');
    setSKey(localStorage.getItem('nova_setting_SUPABASE_ANON_KEY') || '');
    
    const dbItems = await getItemsFromDB();
    setItemsList(dbItems);
    setAppsList(await getStaffApplications());
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
    alert('Configuración guardada en el Reino.');
  };

  const generateMasterLink = () => {
    const config = {
      webhook: webhook,
      clientId: clientId,
      sUrl: sUrl,
      sKey: sKey
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const link = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    navigator.clipboard.writeText(link);
    alert("¡Link Maestro copiado al portapapeles! Úsalo para sincronizar otros dispositivos instantáneamente.");
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image) return alert("Nombre e Imagen son obligatorios.");
    setIsSaving(true);
    try {
      if (editingId) {
        await updateItemInDB({ ...newItem, id: editingId });
      } else {
        await addItemToDB(newItem);
      }
      setNewItem({ 
        name: '', category: Category.MOUNT, image: '', description: '', 
        faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: '', stats: '' 
      });
      setEditingId(null);
      loadAll();
    } catch (e) { 
      console.error(e);
      alert('Error al forjar el item.'); 
    }
    finally { setIsSaving(false); }
  };

  const handleEdit = (item: GameItem) => {
    setNewItem(item);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Deseas destruir esta reliquia para siempre?")) {
      await deleteItemFromDB(id);
      loadAll();
    }
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
      {/* Navegación Sub-Panel */}
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        {[
          { id: 'items', label: 'Reliquias' },
          { id: 'promos', label: 'Promociones' },
          { id: 'apps', label: 'Postulaciones' },
          { id: 'settings', label: 'Ajustes Portal' }
        ].map((t) => (
          <button 
            key={t.id} 
            onClick={() => { setActiveSubTab(t.id as any); setEditingId(null); }} 
            className={`px-8 py-3 rounded-xl font-black uppercase text-xs transition-all ${activeSubTab === t.id ? 'bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-black/40 text-gray-500 border border-white/5 hover:border-[#d4af37]/40'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Secciones de Items y Promos */}
      {(activeSubTab === 'items' || activeSubTab === 'promos') && (
        <div className="space-y-12">
          {/* Formulario */}
          <div className="glass-panel p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <img src="https://media.discordapp.net/attachments/1460068773175492641/1460108067541614672/LOGONOVA.png" className="w-32 h-32" />
             </div>
             
             <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 text-center uppercase tracking-widest">
               {editingId ? 'Reforjar Reliquia' : 'Nueva Forja'}
             </h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest ml-2">Nombre</label>
                 <input placeholder="Ej: Dragón de Fuego" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest ml-2">Categoría</label>
                 <select className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none cursor-pointer" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                   {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>

               {/* Campos Específicos para TRAJES */}
               {newItem.category === Category.COSTUME && (
                 <>
                   <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black text-[#3b82f6] tracking-widest ml-2">Facción</label>
                     <select className="w-full bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl text-white outline-none" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as any})}>
                       <option value={Faction.LIGHT}>Luz</option>
                       <option value={Faction.FURY}>Furia</option>
                     </select>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black text-[#d4af37] tracking-widest ml-2">Clase</label>
                     <select className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                       <option value="All">Todas las Clases</option>
                       {newItem.faction && CLASSES_BY_FACTION[newItem.faction as Faction].map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest ml-2">Género</label>
                     <select className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as any})}>
                       <option value={Gender.BOTH}>Ambos</option>
                       <option value={Gender.MALE}>Masculino</option>
                       <option value={Gender.FEMALE}>Femenino</option>
                     </select>
                   </div>
                 </>
               )}

               {newItem.category === Category.PROMOTION && (
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-black text-green-500 tracking-widest ml-2">Precio / AP</label>
                   <input placeholder="Ej: 5000 AP" className="w-full bg-green-900/10 border border-green-500/20 p-4 rounded-xl text-white" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                 </div>
               )}

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest ml-2">Imagen URL</label>
                 <input placeholder="URL de la imagen" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
               </div>

               <div className="space-y-2 md:col-span-2">
                 <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest ml-2">Stats o Atributos</label>
                 <input placeholder="Ej: +15 STR, +10 DEX" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.stats} onChange={e => setNewItem({...newItem, stats: e.target.value})} />
               </div>

               <div className="space-y-2 md:col-span-2">
                 <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest ml-2">Descripción</label>
                 <textarea placeholder="Descripción del item..." className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white h-24 outline-none resize-none" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
               </div>
             </div>

             <div className="flex gap-4 mt-8">
               <button onClick={handleAddItem} disabled={isSaving} className="flex-grow bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-[#d4af37] transition-all disabled:opacity-50">
                 {editingId ? 'Guardar Cambios' : 'Publicar en el Reino'}
               </button>
               {editingId && (
                 <button onClick={() => { setEditingId(null); setNewItem({ name: '', category: Category.MOUNT }); }} className="px-8 bg-red-600/20 text-red-500 border border-red-500/40 font-black rounded-2xl uppercase text-xs">Cancelar</button>
               )}
             </div>
          </div>

          {/* Historial de Gestión */}
          <div className="glass-panel p-8 rounded-[2rem] border border-white/5 overflow-hidden">
            <h3 className="text-xl font-shaiya text-white mb-6 uppercase tracking-widest text-center">Archivo de Reliquias</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black uppercase text-[#d4af37] tracking-widest">
                    <th className="pb-4 px-4">Item</th>
                    <th className="pb-4 px-4">Categoría</th>
                    <th className="pb-4 px-4">Detalles</th>
                    <th className="pb-4 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemsList.filter(i => activeSubTab === 'items' ? i.category !== Category.PROMOTION : i.category === Category.PROMOTION).map(item => (
                    <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          <img src={item.image} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                          <span className="text-white font-bold text-sm">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-black/40 rounded-md text-[9px] uppercase font-black text-gray-400 border border-white/5">{item.category}</span>
                      </td>
                      <td className="py-4 px-4 text-[10px] text-gray-500">
                        {item.category === Category.COSTUME ? `${item.faction} | ${item.item_class}` : item.price || 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-lg transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
              <input value={sUrl} onChange={e => setSUrl(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Supabase Key</label>
              <input type="password" value={sKey} onChange={e => setSKey(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Webhook Soporte (Webhook #1)</label>
              <input value={webhook} onChange={e => setWebhook(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Webhook Postulaciones (Webhook #2)</label>
              <input value={appWebhook} onChange={e => setAppWebhook(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Webhook Bienvenidas (Webhook #3)</label>
              <input value={welcomeWebhook} onChange={e => setWelcomeWebhook(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase">Discord Client ID</label>
              <input value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-10">
            <button onClick={handleSaveSettings} disabled={isSaving} className="flex-grow bg-[#d4af37] text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-white transition-all shadow-xl">
              {isSaving ? 'Guardando...' : 'Guardar Configuración Maestra'}
            </button>
            <button onClick={generateMasterLink} className="flex-grow bg-black/60 text-[#d4af37] border border-[#d4af37] font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all">
              Generar Link Maestro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
