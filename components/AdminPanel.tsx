
import React, { useState, useEffect, useRef } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication, DropMap, MobEntry, DropEntry, MapPoint, ItemRarity } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getStaffApplications, updateStaffApplicationStatus, pushLocalItemsToCloud, deleteStaffApplicationFromDB, uploadFile, getDropListsFromDB, addDropListToDB, updateDropListInDB, deleteDropListFromDB } from '../services/supabaseClient';

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'drops' | 'apps' | 'settings'>('items');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [itemsList, setItemsList] = useState<GameItem[]>([]);
  const [dropsList, setDropsList] = useState<DropMap[]>([]);
  const [appsList, setAppsList] = useState<StaffApplication[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const itemFileRef = useRef<HTMLInputElement>(null);
  const dropFileRef = useRef<HTMLInputElement>(null);
  const mobFileRef = useRef<HTMLInputElement>(null);
  const dropItemFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const mapPortalFileRef = useRef<HTMLInputElement>(null);
  const bossPortalFileRef = useRef<HTMLInputElement>(null);

  const [activeMobIdx, setActiveMobIdx] = useState<number | null>(null);
  const [drawMode, setDrawMode] = useState<'point' | 'area'>('point');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{x: number, y: number} | null>(null);
  const [tempRadius, setTempRadius] = useState<number>(0);
  const [uploadTarget, setUploadTarget] = useState<{ mobIdx: number, dropIdx?: number } | null>(null);

  const [newItem, setNewItem] = useState<Partial<GameItem>>({
    name: '', category: Category.MOUNT, image: '', description: '', 
    faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: '', stats: ''
  });

  const [newDrop, setNewDrop] = useState<Partial<DropMap>>({
    name: '', category: 'Mapa', faction: Faction.LIGHT, image: '', description: '', mobs: []
  });

  const [config, setConfig] = useState({
    webhookSupport: '',
    webhookApps: '',
    webhookWelcome: '',
    clientId: '',
    botToken: '',
    guildId: '',
    supabaseUrl: '',
    supabaseKey: '',
    roleGs: '',
    roleLgs: '',
    roleGm: '',
    siteLogo: '',
    siteBg: '',
    mapPortalBg: '',
    bossPortalBg: ''
  });

  const loadData = async () => {
    try {
      const items = await getItemsFromDB();
      setItemsList(items || []);
      const drops = await getDropListsFromDB();
      setDropsList(drops || []);
      const apps = await getStaffApplications();
      setAppsList(apps || []);
    } catch (e) { console.error(e); }
  };

  const loadConfig = async () => {
    setConfig({
      webhookSupport: await getSetting('NOVA_WEBHOOK_URL') || '',
      webhookApps: await getSetting('NOVA_STAFF_APP_WEBHOOK') || '',
      webhookWelcome: await getSetting('NOVA_STAFF_WELCOME_WEBHOOK') || '',
      clientId: await getSetting('DISCORD_CLIENT_ID') || '',
      botToken: await getSetting('DISCORD_BOT_TOKEN') || '',
      guildId: await getSetting('DISCORD_GUILD_ID') || '',
      supabaseUrl: localStorage.getItem('nova_setting_SUPABASE_URL') || '',
      supabaseKey: localStorage.getItem('nova_setting_SUPABASE_ANON_KEY') || '',
      roleGs: await getSetting('ROLE_ID_GS') || '',
      roleLgs: await getSetting('ROLE_ID_LGS') || '',
      roleGm: await getSetting('ROLE_ID_GM') || '',
      siteLogo: await getSetting('SITE_LOGO_URL') || '',
      siteBg: await getSetting('SITE_BG_URL') || '',
      mapPortalBg: await getSetting('MAP_PORTAL_BG') || '',
      bossPortalBg: await getSetting('BOSS_PORTAL_BG') || ''
    });
  };

  useEffect(() => { 
    loadData();
    loadConfig();
  }, [activeSubTab]);

  const saveConfigField = async (key: string, value: string, settingKey: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    await saveSetting(settingKey, value);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const folder = type.includes('Portal') || type === 'logo' || type === 'bg' ? 'branding' : 'drops';
      const publicUrl = await uploadFile(file, folder);
      
      if (type === 'item') setNewItem(prev => ({ ...prev, image: publicUrl }));
      else if (type === 'drop') setNewDrop(prev => ({ ...prev, image: publicUrl }));
      else if (type === 'logo') { await saveSetting('SITE_LOGO_URL', publicUrl); setConfig(prev => ({ ...prev, siteLogo: publicUrl })); }
      else if (type === 'bg') { await saveSetting('SITE_BG_URL', publicUrl); setConfig(prev => ({ ...prev, siteBg: publicUrl })); }
      else if (type === 'mapPortal') { await saveSetting('MAP_PORTAL_BG', publicUrl); setConfig(prev => ({ ...prev, mapPortalBg: publicUrl })); }
      else if (type === 'bossPortal') { await saveSetting('BOSS_PORTAL_BG', publicUrl); setConfig(prev => ({ ...prev, bossPortalBg: publicUrl })); }
      else if (type === 'mob' && uploadTarget) {
        setNewDrop(prev => {
          const mobs = [...(prev.mobs || [])];
          mobs[uploadTarget.mobIdx] = { ...mobs[uploadTarget.mobIdx], image: publicUrl };
          return { ...prev, mobs };
        });
      }
      else if (type === 'dropItem' && uploadTarget && uploadTarget.dropIdx !== undefined) {
        setNewDrop(prev => {
          const mobs = [...(prev.mobs || [])];
          const drops = [...mobs[uploadTarget.mobIdx].drops];
          drops[uploadTarget.dropIdx!] = { ...drops[uploadTarget.dropIdx!], itemImage: publicUrl };
          mobs[uploadTarget.mobIdx] = { ...mobs[uploadTarget.mobIdx], drops };
          return { ...prev, mobs };
        });
      }
      alert("Archivo manifestado.");
    } catch (err: any) { alert(err.message); }
    finally { setIsUploading(false); }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMobIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (drawMode === 'point') { addPointToMob(x, y, 0, 'point'); } 
    else { setIsDrawing(true); setDrawingStart({ x, y }); setTempRadius(0); }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawingStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const dist = Math.sqrt(Math.pow(x - drawingStart.x, 2) + Math.pow(y - drawingStart.y, 2));
    setTempRadius(dist);
  };

  const handleMouseUp = () => {
    if (isDrawing && drawingStart) {
      addPointToMob(drawingStart.x, drawingStart.y, tempRadius, 'area');
      setIsDrawing(false); setDrawingStart(null); setTempRadius(0);
    }
  };

  const addPointToMob = (x: number, y: number, radius: number, type: 'point' | 'area') => {
    if (activeMobIdx === null) return;
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      const mob = { ...mobs[activeMobIdx] };
      mob.points = [...(mob.points || []), { x, y, color: mob.mapColor, label: mob.name, type, radius }];
      mobs[activeMobIdx] = mob;
      return { ...prev, mobs };
    });
  };

  const handleAddItem = async () => {
    setIsSaving(true);
    try {
      if (editingId) await updateItemInDB({ ...newItem, id: editingId } as GameItem);
      else await addItemToDB(newItem);
      setNewItem({ name: '', category: Category.MOUNT, image: '', description: '', faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: '', stats: '' });
      setEditingId(null); loadData();
    } catch { alert('Error.'); }
    finally { setIsSaving(false); }
  };

  const handleAddDrop = async () => {
    if (!newDrop.name || !newDrop.image) return alert("Faltan datos.");
    setIsSaving(true);
    try {
      if (editingId) await updateDropListInDB({ ...newDrop, id: editingId } as DropMap);
      else await addDropListToDB(newDrop);
      setNewDrop({ name: '', category: 'Mapa', faction: Faction.LIGHT, image: '', description: '', mobs: [] });
      setEditingId(null); loadData();
    } catch { alert('Error.'); }
    finally { setIsSaving(false); }
  };

  const addMob = () => {
    const mob: MobEntry = { id: `mob-${Date.now()}`, name: 'Nueva Entidad', level: '1', image: '', mapColor: '#d4af37', drops: [], points: [] };
    setNewDrop(prev => ({ ...prev, mobs: [...(prev.mobs || []), mob] }));
    setActiveMobIdx((newDrop.mobs?.length || 0));
  };

  const addDropToMob = (mIdx: number) => {
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      mobs[mIdx].drops = [...mobs[mIdx].drops, { itemName: 'Nuevo Item', itemImage: '', rate: '1%', rarity: 'Common' }];
      return { ...prev, mobs };
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        {['items', 'drops', 'apps', 'settings'].map(t => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`px-10 py-3 rounded-full font-black uppercase text-xs transition-all tracking-widest ${activeSubTab === t ? 'bg-[#d4af37] text-black' : 'bg-black/60 text-gray-500 border border-white/5'}`}>
            {t === 'items' ? 'Reliquias' : t === 'drops' ? 'Drop List' : t === 'apps' ? 'Staff' : 'Ajustes'}
          </button>
        ))}
      </div>

      {activeSubTab === 'settings' ? (
        <div className="space-y-10 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Discord Webhooks</h3>
              <input placeholder="Webhook Soporte" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookSupport} onChange={e => saveConfigField('webhookSupport', e.target.value, 'NOVA_WEBHOOK_URL')} />
              <input placeholder="Webhook Postulaciones" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookApps} onChange={e => saveConfigField('webhookApps', e.target.value, 'NOVA_STAFF_APP_WEBHOOK')} />
              <input placeholder="Webhook Bienvenida" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookWelcome} onChange={e => saveConfigField('webhookWelcome', e.target.value, 'NOVA_STAFF_WELCOME_WEBHOOK')} />
            </div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Branding Visual</h3>
              <div className="flex gap-4 items-center">
                <input placeholder="URL Logo" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.siteLogo} onChange={e => saveConfigField('siteLogo', e.target.value, 'SITE_LOGO_URL')} />
                <button onClick={() => logoFileRef.current?.click()} className="bg-white/10 p-4 rounded-xl text-white">📁</button>
              </div>
              <div className="flex gap-4 items-center">
                <input placeholder="URL Fondo" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.siteBg} onChange={e => saveConfigField('siteBg', e.target.value, 'SITE_BG_URL')} />
                <button onClick={() => bgFileRef.current?.click()} className="bg-white/10 p-4 rounded-xl text-white">📁</button>
              </div>
            </div>
          </div>
          <input type="file" ref={logoFileRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} />
          <input type="file" ref={bgFileRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'bg')} />
        </div>
      ) : activeSubTab === 'drops' ? (
        <div className="space-y-12 animate-fade-in">
           <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/30 shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-10 text-center uppercase tracking-widest">{editingId ? 'Reforjar Pergamino' : 'Nueva Guía Táctica'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-white text-[10px] font-black uppercase tracking-[4px]">Configuración Base</h3>
                  <input placeholder="Nombre (Ej: Pantano Infernal)" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newDrop.name} onChange={e => setNewDrop({...newDrop, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newDrop.category} onChange={e => setNewDrop({...newDrop, category: e.target.value as any})}>
                      <option value="Mapa">Tipo: Mapa</option>
                      <option value="Boss">Tipo: Boss</option>
                    </select>
                    <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newDrop.faction} onChange={e => setNewDrop({...newDrop, faction: e.target.value as any})}>
                      <option value={Faction.LIGHT}>Fación: Luz</option>
                      <option value={Faction.FURY}>Fación: Furia</option>
                      <option value={Faction.NEUTRAL}>Fación: Neutral</option>
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <input placeholder="Imagen URL del Mapa" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                    <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-2xl font-black uppercase text-[10px]">Subir</button>
                    <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'drop')} />
                  </div>
                </div>
                {newDrop.image && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                       <div className="flex gap-2">
                          <button onClick={() => setDrawMode('point')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase border ${drawMode === 'point' ? 'bg-[#d4af37] text-black' : 'bg-black/40 text-gray-500 border-white/5'}`}>Punto</button>
                          <button onClick={() => setDrawMode('area')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase border ${drawMode === 'area' ? 'bg-[#d4af37] text-black' : 'bg-black/40 text-gray-500 border-white/5'}`}>Zona</button>
                          <button onClick={() => { if(activeMobIdx !== null) { const ms = [...(newDrop.mobs || [])]; ms[activeMobIdx].points = []; setNewDrop({...newDrop, mobs: ms}); } }} className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-600/20 text-red-500">Limpiar</button>
                       </div>
                       <p className="text-gray-500 text-[9px] uppercase font-bold italic">Selecciona un mob abajo antes de marcar</p>
                    </div>
                    <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-black select-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                      <img src={newDrop.image} className="w-full h-auto opacity-70 pointer-events-none" />
                      {newDrop.mobs?.map((mob, mIdx) => mob.points?.map((p, pIdx) => (
                        p.type === 'area' ? (
                          <div key={`${mIdx}-${pIdx}`} className="absolute border-2 rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.radius! * 2}%`, height: `${p.radius! * 2}%`, borderColor: p.color, backgroundColor: `${p.color}33`, aspectRatio: '1/1' }}></div>
                        ) : (
                          <div key={`${mIdx}-${pIdx}`} className="absolute w-3 h-3 rounded-full border border-white transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.color }}></div>
                        )
                      )))}
                      {isDrawing && drawingStart && <div className="absolute border-2 border-dashed rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${drawingStart.x}%`, top: `${drawingStart.y}%`, width: `${tempRadius * 2}%`, height: `${tempRadius * 2}%`, borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.2)', aspectRatio: '1/1' }}></div>}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-8">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-white text-[10px] font-black uppercase tracking-[4px]">Bestiario</h3>
                  <button onClick={addMob} className="bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">+ Nueva Entidad</button>
                </div>
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-3 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${activeMobIdx === mIdx ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-black/60 border-white/5'}`} onClick={() => setActiveMobIdx(mIdx)}>
                       <div className="flex gap-4 items-center">
                         <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-12 h-12 rounded-xl border border-white/10 object-cover" />
                         <div className="flex-grow">
                            <input className="bg-transparent border-none text-white font-shaiya text-lg outline-none w-full" value={mob.name} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].name = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                            <p className="text-[10px] font-black uppercase text-gray-500">Nivel {mob.level} • {mob.points.length} Marcas</p>
                         </div>
                         <div className="flex flex-col gap-2">
                            <input type="color" className="w-6 h-6 bg-transparent" value={mob.mapColor} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].mapColor = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                            <button onClick={e => { e.stopPropagation(); addDropToMob(mIdx); }} className="text-green-500 text-[8px] font-black">DROP +</button>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} disabled={isSaving} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px] hover:bg-[#d4af37] transition-all shadow-2xl">
               {editingId ? 'Confirmar Reforja' : 'Sellar Guía de Drop'}
            </button>
          </div>
          
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10">
             <h3 className="text-white font-shaiya text-2xl uppercase mb-6">Pergaminos Guardados</h3>
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black uppercase text-[#d4af37]">
                  <tr><th className="p-6">Mapa / Boss</th><th className="p-6">Categoría</th><th className="p-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dropsList.map(drop => (
                    <tr key={drop.id} className="group hover:bg-white/5">
                      <td className="p-6"><div className="flex items-center gap-5 font-shaiya text-white text-2xl">{drop.name}</div></td>
                      <td className="p-6 text-[10px] text-gray-500 uppercase font-black">{drop.category} ({drop.faction})</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewDrop(drop); setEditingId(drop.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="text-[#d4af37] mr-4">✏️</button>
                        <button onClick={() => { if(confirm('¿Borrar?')) deleteDropListFromDB(drop.id).then(loadData) }} className="text-red-500">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'items' ? (
        <div className="space-y-10">
          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 text-center">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase">{editingId ? 'Reforjar Reliquia' : 'Nueva Reliquia'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <input placeholder="Nombre" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={handleAddItem} className="w-full bg-white text-black font-black py-5 rounded-[2rem] uppercase tracking-widest hover:bg-[#d4af37] transition-all">Manifestar en el Reino</button>
          </div>
          
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
             <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black uppercase text-[#d4af37]">
                  <tr><th className="p-6">Nombre</th><th className="p-6">Categoría</th><th className="p-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemsList.map(item => (
                    <tr key={item.id} className="group hover:bg-white/5">
                      <td className="p-6 text-white font-shaiya text-xl">{item.name}</td>
                      <td className="p-6 text-[10px] text-gray-500 uppercase">{item.category}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="text-[#d4af37] mr-4">✏️</button>
                        <button onClick={() => { if(confirm('¿Borrar?')) deleteItemFromDB(item.id).then(loadData) }} className="text-red-500">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10">
           <h2 className="text-3xl font-shaiya text-white uppercase mb-10 text-center">Staff Applications</h2>
           {appsList.map(app => (
             <div key={app.id} className="bg-black/40 p-6 rounded-[2rem] border border-white/5 mb-4 flex justify-between items-center">
               <div className="flex gap-4 items-center">
                 <img src={app.avatar_url} className="w-12 h-12 rounded-xl" />
                 <div><p className="text-white font-shaiya text-xl">{app.username}</p><p className="text-[#d4af37] text-[10px] font-black uppercase">{app.position}</p></div>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600/20 text-green-500 px-6 py-2 rounded-xl text-[9px] font-black uppercase">Aprobar</button>
                  <button onClick={() => deleteStaffApplicationFromDB(app.id).then(loadData)} className="text-red-500 text-[9px] font-black">BORRAR</button>
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
