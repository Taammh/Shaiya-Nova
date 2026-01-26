
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
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  
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
    faction: Faction.LIGHT, item_class: 'Luchador/Defensor', gender: Gender.BOTH, price: '', stats: '', rarity: 'Common'
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
    roleGs: '',
    roleLgs: '',
    roleGm: '',
    siteLogo: '',
    siteBg: '',
    mapPortalBg: '',
    bossPortalBg: '',
    supabaseUrl: '',
    supabaseKey: ''
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
      roleGs: await getSetting('ROLE_ID_GS') || '',
      roleLgs: await getSetting('ROLE_ID_LGS') || '',
      roleGm: await getSetting('ROLE_ID_GM') || '',
      siteLogo: await getSetting('SITE_LOGO_URL') || '',
      siteBg: await getSetting('SITE_BG_URL') || '',
      mapPortalBg: await getSetting('MAP_PORTAL_BG') || '',
      bossPortalBg: await getSetting('BOSS_PORTAL_BG') || '',
      supabaseUrl: await getSetting('SUPABASE_URL') || '',
      supabaseKey: await getSetting('SUPABASE_ANON_KEY') || ''
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
      alert("Imagen vinculada con éxito.");
    } catch (err: any) { alert(err.message); }
    finally { setIsUploading(false); }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMobIdx === null) return;
    e.preventDefault(); 
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (drawMode === 'point') { 
      addPointToMob(x, y, 0, 'point'); 
    } else { 
      setIsDrawing(true); 
      setDrawingStart({ x, y }); 
      setTempRadius(0); 
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawingStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const dx = x - drawingStart.x;
    const dy = y - drawingStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    setTempRadius(dist);
  };

  const handleMouseUp = () => {
    if (isDrawing && drawingStart) {
      addPointToMob(drawingStart.x, drawingStart.y, tempRadius, 'area');
      setIsDrawing(false); 
      setDrawingStart(null); 
      setTempRadius(0);
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

  const clearMobPoints = (mIdx: number) => {
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      mobs[mIdx] = { ...mobs[mIdx], points: [] };
      return { ...prev, mobs };
    });
  };

  const removeMobFromCreation = (mIdx: number) => {
    if (!confirm('¿Deseas eliminar esta entidad por completo?')) return;
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      mobs.splice(mIdx, 1);
      return { ...prev, mobs };
    });
    setActiveMobIdx(null);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image) return alert("Faltan datos.");
    setIsSaving(true);
    try {
      if (editingId) await updateItemInDB({ ...newItem, id: editingId } as GameItem);
      else await addItemToDB(newItem);
      setNewItem({ name: '', category: Category.MOUNT, image: '', description: '', faction: Faction.LIGHT, item_class: 'Luchador/Defensor', gender: Gender.BOTH, price: '', stats: '', rarity: 'Common' });
      setEditingId(null); loadData();
    } catch { alert('Error.'); }
    finally { setIsSaving(false); }
  };

  const handleAddDrop = async () => {
    if (!newDrop.name || !newDrop.image) return alert("Faltan datos del mapa.");
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

  const duplicateMob = (mIdx: number) => {
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      const sourceMob = mobs[mIdx];
      const clonedMob: MobEntry = {
        ...sourceMob,
        id: `mob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        drops: sourceMob.drops.map(d => ({ ...d })),
        points: sourceMob.points ? sourceMob.points.map(p => ({ ...p })) : []
      };
      const updatedMobs = [...mobs, clonedMob];
      return { ...prev, mobs: updatedMobs };
    });
    setTimeout(() => setActiveMobIdx((newDrop.mobs?.length || 0)), 10);
  };

  const addDropToMob = (mIdx: number) => {
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      const mob = { ...mobs[mIdx] };
      mob.drops = [...mob.drops, { itemName: 'Nuevo Item', itemImage: '', rate: '1%', rarity: 'Common' }];
      mobs[mIdx] = mob;
      return { ...prev, mobs };
    });
    setActiveMobIdx(mIdx);
  };

  const generateMasterLink = () => {
    // REQUISITO TÉCNICO: Sincronización total de localItems y localDrops (Historial incluido)
    const localItemsStr = localStorage.getItem('nova_local_items');
    const localDropsStr = localStorage.getItem('nova_local_drops');
    
    const dataToSync = { 
      ...config,
      localItems: localItemsStr ? JSON.parse(localItemsStr) : [],
      localDrops: localDropsStr ? JSON.parse(localDropsStr) : []
    };
    
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dataToSync))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    
    navigator.clipboard.writeText(url);
    alert("¡LINK MAESTRO GENERADO! Incluye Reliquias, Mapas, Jefes y toda su configuración.");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        {['items', 'drops', 'apps', 'settings'].map(t => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`px-10 py-3 rounded-full font-black uppercase text-xs transition-all tracking-widest ${activeSubTab === t ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-black/60 text-gray-500 border border-white/5'}`}>
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
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Infraestructura Real</h3>
              <input placeholder="Supabase URL" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseUrl} onChange={e => saveConfigField('supabaseUrl', e.target.value, 'SUPABASE_URL')} />
              <input placeholder="Supabase Anon Key" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseKey} onChange={e => saveConfigField('supabaseKey', e.target.value, 'SUPABASE_ANON_KEY')} />
              <input placeholder="Discord Client ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.clientId} onChange={e => saveConfigField('clientId', e.target.value, 'DISCORD_CLIENT_ID')} />
            </div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 md:col-span-2">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Identidad Visual & Portales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <div className="flex gap-4">
                        <input placeholder="URL Logo Principal" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.siteLogo} onChange={e => saveConfigField('siteLogo', e.target.value, 'SITE_LOGO_URL')} />
                        <button onClick={() => logoFileRef.current?.click()} className="bg-white/10 px-4 rounded-xl text-white">📁</button>
                    </div>
                    {config.siteLogo && <div className="p-2 border border-white/5 rounded-xl bg-black/20"><img src={config.siteLogo} loading="lazy" className="h-20 w-auto mx-auto object-contain" alt="Vista previa logo" /></div>}
                 </div>
                 <div className="space-y-2">
                    <div className="flex gap-4">
                        <input placeholder="URL Fondo General" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.siteBg} onChange={e => saveConfigField('siteBg', e.target.value, 'SITE_BG_URL')} />
                        <button onClick={() => bgFileRef.current?.click()} className="bg-white/10 px-4 rounded-xl text-white">📁</button>
                    </div>
                    {config.siteBg && <div className="p-2 border border-white/5 rounded-xl bg-black/20 overflow-hidden"><img src={config.siteBg} loading="lazy" className="h-20 w-full object-cover" alt="Vista previa fondo" /></div>}
                 </div>
                 <div className="space-y-2">
                    <div className="flex gap-4">
                        <input placeholder="URL Portal Mapas" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.mapPortalBg} onChange={e => saveConfigField('mapPortalBg', e.target.value, 'MAP_PORTAL_BG')} />
                        <button onClick={() => mapPortalFileRef.current?.click()} className="bg-white/10 px-4 rounded-xl text-white">📁</button>
                    </div>
                    {config.mapPortalBg && <div className="p-2 border border-white/5 rounded-xl bg-black/20 overflow-hidden"><img src={config.mapPortalBg} loading="lazy" className="h-20 w-full object-cover" alt="Vista previa portal mapas" /></div>}
                 </div>
                 <div className="space-y-2">
                    <div className="flex gap-4">
                        <input placeholder="URL Portal Jefes" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.bossPortalBg} onChange={e => saveConfigField('bossPortalBg', e.target.value, 'BOSS_PORTAL_BG')} />
                        <button onClick={() => bossPortalFileRef.current?.click()} className="bg-white/10 px-4 rounded-xl text-white">📁</button>
                    </div>
                    {config.bossPortalBg && <div className="p-2 border border-white/5 rounded-xl bg-black/20 overflow-hidden"><img src={config.bossPortalBg} loading="lazy" className="h-20 w-full object-cover" alt="Vista previa portal bosses" /></div>}
                 </div>
              </div>
            </div>
          </div>
          <button onClick={generateMasterLink} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black py-6 rounded-[2rem] uppercase tracking-[5px] shadow-2xl">Generar Link Maestro de Sincronización</button>
        </div>
      ) : activeSubTab === 'drops' ? (
        <div className="space-y-12 animate-fade-in">
           <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/30 shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-10 text-center uppercase tracking-widest">{editingId ? 'Reforjar Pergamino' : 'Edición de Drops'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-white text-[10px] font-black uppercase tracking-[4px]">Configuración de Mapa</h3>
                <input placeholder="Nombre" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newDrop.name} onChange={e => setNewDrop({...newDrop, name: e.target.value})} />
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
                  <input placeholder="URL Imagen Mapa" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                  <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-2xl font-black uppercase text-[10px]">UP</button>
                  <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'drop')} />
                </div>
                {newDrop.image && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                       <button onClick={() => setDrawMode('point')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black border ${drawMode === 'point' ? 'bg-[#d4af37] text-black' : 'bg-black/40 text-gray-500 border-white/5'}`}>Punto</button>
                       <button onClick={() => setDrawMode('area')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black border ${drawMode === 'area' ? 'bg-[#d4af37] text-black' : 'bg-black/40 text-gray-500 border-white/5'}`}>Zona</button>
                    </div>
                    <div 
                      className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-black cursor-crosshair select-none" 
                      onMouseDown={handleMouseDown} 
                      onMouseMove={handleMouseMove} 
                      onMouseUp={handleMouseUp}
                    >
                      <img src={newDrop.image} loading="lazy" className="w-full h-auto opacity-70 pointer-events-none" />
                      
                      {isDrawing && drawingStart && (
                        <div 
                          className="absolute border-2 border-white rounded-full bg-white/20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                          style={{ 
                            left: `${drawingStart.x}%`, 
                            top: `${drawingStart.y}%`, 
                            width: `${tempRadius * 2}%`, 
                            height: `${tempRadius * 2}%`, 
                            aspectRatio: '1/1' 
                          }}
                        ></div>
                      )}

                      {newDrop.mobs?.map((mob, mIdx) => mob.points?.map((p, pIdx) => (
                        <div key={`${mIdx}-${pIdx}`} className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${p.type === 'area' ? 'border-2 rounded-full' : 'w-3 h-3 rounded-full border border-white'}`}
                             style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.type === 'area' ? `${p.color}33` : p.color, borderColor: p.color, width: p.type === 'area' ? `${p.radius! * 2}%` : '12px', height: p.type === 'area' ? `${p.radius! * 2}%` : '12px', aspectRatio: '1/1' }}></div>
                      )))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-white text-[10px] font-black uppercase">Bestiario</h3>
                  <button onClick={addMob} className="bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">+ Entidad</button>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${activeMobIdx === mIdx ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-black/60 border-white/5'}`} onClick={() => setActiveMobIdx(mIdx)}>
                       <div className="flex gap-4 items-center">
                         <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 group">
                           <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} loading="lazy" className="w-full h-full object-cover" />
                           <button onClick={(e) => { e.stopPropagation(); setUploadTarget({ mobIdx: mIdx }); mobFileRef.current?.click(); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black">UP</button>
                         </div>
                         <div className="flex-grow">
                            <input className="bg-transparent border-none text-white font-shaiya text-lg outline-none w-full" value={mob.name} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].name = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                            <div className="flex items-center gap-2">
                               <input className="bg-transparent border-none text-gray-500 text-[10px] w-20 outline-none" value={`LV ${mob.level}`} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].level = e.target.value.replace('LV ', ''); setNewDrop({...newDrop, mobs: ms}); }} />
                            </div>
                         </div>
                         <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                               <button onClick={e => { e.stopPropagation(); duplicateMob(mIdx); }} title="Duplicar Entidad" className="bg-blue-600/20 text-blue-400 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all">👯</button>
                               <button onClick={e => { e.stopPropagation(); clearMobPoints(mIdx); }} title="Limpiar Zona/Puntos" className="bg-orange-600/20 text-orange-400 p-2 rounded-lg hover:bg-orange-600 hover:text-white transition-all">🧹</button>
                               {/* BOTÓN SOLICITADO: Eliminar Entidad (Mob/Boss) */}
                               <button onClick={e => { e.stopPropagation(); removeMobFromCreation(mIdx); }} title="Eliminar Entidad" className="bg-red-600/20 text-red-400 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                               <input type="color" className="w-8 h-8 cursor-pointer rounded overflow-hidden" value={mob.mapColor} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].mapColor = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                            </div>
                            <button onClick={e => { e.stopPropagation(); addDropToMob(mIdx); }} className="bg-green-600/20 text-green-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase hover:bg-green-600 hover:text-white transition-all">DROP +</button>
                         </div>
                       </div>
                       {activeMobIdx === mIdx && (
                         <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                            {mob.drops.map((drop, dIdx) => (
                              <div key={dIdx} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl group/drop border border-white/5">
                                 <div className="relative w-10 h-10 shrink-0 bg-black rounded-lg overflow-hidden">
                                    <img src={drop.itemImage || "https://api.dicebear.com/7.x/pixel-art/svg?seed=item"} loading="lazy" className="w-full h-full object-contain" />
                                    <button onClick={(e) => { e.stopPropagation(); setUploadTarget({ mobIdx: mIdx, dropIdx: dIdx }); dropItemFileRef.current?.click(); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover/drop:opacity-100 flex items-center justify-center text-white text-[7px] font-black">UP</button>
                                 </div>
                                 <div className="flex-grow space-y-1">
                                    <input className="bg-transparent border-none text-white text-xs font-bold w-full outline-none" value={drop.itemName} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].itemName = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                                    <div className="flex justify-between items-center">
                                       <select className="bg-transparent text-[#d4af37] text-[8px] font-black uppercase outline-none" value={drop.rarity} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].rarity = e.target.value as any; setNewDrop({...newDrop, mobs: ms}); }}>
                                          {['Common', 'Noble', 'Atroz', 'Legendary', 'Diosa', 'Special', 'Unique'].map(r => <option key={r} value={r} className="bg-black">{r}</option>)}
                                       </select>
                                       <input className="bg-transparent border-none text-[#d4af37] text-[10px] w-14 text-right outline-none font-mono font-black" value={drop.rate} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].rate = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                                    </div>
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.splice(dIdx, 1); setNewDrop({...newDrop, mobs: ms}); }} className="text-red-500 opacity-0 group-hover/drop:opacity-100 transition-opacity">✖</button>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px] hover:bg-[#d4af37] transition-all shadow-2xl">
               {editingId ? 'Confirmar Reforja de Pergamino' : 'Sellar Guía de Drop'}
            </button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10 overflow-hidden">
              <h3 className="text-[#d4af37] font-black uppercase tracking-[5px] text-xs p-6 border-b border-white/5">Historial de Drops</h3>
              <table className="w-full text-left">
                <thead className="text-[#d4af37] text-[10px] uppercase font-black bg-black/40">
                  <tr><th className="p-6">Mapa / Jefe</th><th className="p-6">Categoría</th><th className="p-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dropsList.map(drop => (
                    <tr key={drop.id} className="text-white hover:bg-white/5 transition-colors">
                      <td className="p-6 font-shaiya text-2xl">{drop.name}</td>
                      <td className="p-6 uppercase text-[10px] text-gray-500 font-black">{drop.category} ({drop.faction})</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewDrop(drop); setEditingId(drop.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="text-[#d4af37] mr-4 hover:scale-125 transition-transform">✏️</button>
                        <button onClick={() => { if(confirm('¿Borrar registro?')) deleteDropListFromDB(drop.id).then(loadData) }} className="text-red-500 hover:scale-125 transition-transform">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>
      ) : activeSubTab === 'items' ? (
        <div className="space-y-10 animate-fade-in">
          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 text-center shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-widest">{editingId ? 'Reforjar Reliquia' : 'Nueva Reliquia'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <input placeholder="Nombre de la Reliquia" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.faction} onChange={e => {
                const newFact = e.target.value as Faction;
                setNewItem({...newItem, faction: newFact, item_class: CLASSES_BY_FACTION[newFact][0]});
              }}>
                <option value={Faction.LIGHT}>Fación: Luz</option>
                <option value={Faction.FURY}>Fación: Furia</option>
                <option value={Faction.NEUTRAL}>Fación: Neutral</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                {newItem.category === Category.COSTUME ? (
                  <>
                    {(CLASSES_BY_FACTION[newItem.faction as Faction] || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </>
                ) : (
                  <>
                    <option value="All">Todas las Clases</option>
                    <option value="Luchador">Luchador / Guerrero</option>
                    <option value="Guardián">Guardián</option>
                    <option value="Explorador">Explorador / Cazador</option>
                    <option value="Tirador">Tirador / Animista</option>
                    <option value="Mago">Mago / Pagano</option>
                    <option value="Oráculo">Oráculo</option>
                    <option value="Oraculo/Pagano">Oráculo / Pagano</option>
                  </>
                )}
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as any})}>
                <option value={Gender.BOTH}>Género: Ambos</option>
                <option value={Gender.MALE}>Género: Masculino</option>
                <option value={Gender.FEMALE}>Género: Femenino</option>
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.rarity} onChange={e => setNewItem({...newItem, rarity: e.target.value as any})}>
                {['Common', 'Noble', 'Atroz', 'Legendary', 'Diosa', 'Special', 'Unique'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-4 mb-6">
                <div className="flex gap-4">
                   <input placeholder="URL Imagen Reliquia" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none text-xs" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                   <button onClick={() => itemFileRef.current?.click()} className="bg-[#d4af37] text-black px-10 rounded-2xl font-black uppercase text-xs">SUBIR</button>
                </div>
                {newItem.image && <div className="p-4 bg-black/40 border border-white/10 rounded-2xl w-40 h-40 mx-auto overflow-hidden shadow-inner"><img src={newItem.image} loading="lazy" className="w-full h-full object-contain" alt="Preview item" /></div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               <input placeholder="Estadísticas (Ej: STR +20)" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.stats} onChange={e => setNewItem({...newItem, stats: e.target.value})} />
               <input placeholder="Valor / Precio" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            </div>
            <textarea placeholder="Descripción detallada..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none mb-8 min-h-[100px]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full bg-white text-black font-black py-6 rounded-[2.5rem] uppercase tracking-[8px] hover:bg-[#d4af37] transition-all shadow-xl">
               {editingId ? 'Confirmar Reforja' : 'Manifestar Reliquia'}
            </button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10 overflow-hidden">
             <h3 className="text-[#d4af37] font-black uppercase tracking-[5px] text-xs p-6 border-b border-white/5">Historial de Reliquias</h3>
             <table className="w-full text-left">
                <thead className="text-[#d4af37] text-[10px] uppercase font-black bg-black/40">
                  <tr><th className="p-6">Reliquia</th><th className="p-6">Categoría / Facción / Clase</th><th className="p-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemsList.map(item => (
                    <tr key={item.id} className="text-white hover:bg-white/5 transition-colors">
                      <td className="p-6 flex items-center gap-4">
                          <div className="w-12 h-12 bg-black rounded-xl overflow-hidden border border-white/10 shrink-0"><img src={item.image} loading="lazy" className="w-full h-full object-contain" /></div>
                          <span className="font-shaiya text-2xl">{item.name}</span>
                      </td>
                      <td className="p-6 text-[10px] uppercase font-black text-gray-500">{item.category} • {item.faction} • {item.item_class}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="text-[#d4af37] mr-4 hover:scale-125 transition-transform">✏️</button>
                        <button onClick={() => { if(confirm('¿Destruir reliquia?')) deleteItemFromDB(item.id).then(loadData) }} className="text-red-500 hover:scale-125 transition-transform">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : activeSubTab === 'apps' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 animate-fade-in">
           <h2 className="text-4xl font-shaiya text-white uppercase mb-12 text-center tracking-widest">Postulaciones del Staff</h2>
           <div className="space-y-6">
             {appsList.map(app => (
               <div key={app.id} className="bg-black/60 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-6 group hover:border-[#d4af37]/40 transition-all">
                 <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                   <div className="flex gap-6 items-center">
                     <img src={app.avatar_url} loading="lazy" className="w-20 h-20 rounded-2xl border-2 border-[#d4af37]/30 shadow-lg" />
                     <div>
                       <p className="text-white font-shaiya text-3xl">{app.username}</p>
                       <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[4px]">{app.position} • {app.status}</p>
                     </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)} className="bg-white/10 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all">
                        {expandedAppId === app.id ? 'Ocultar Respuestas' : 'Ver Respuestas'}
                      </button>
                      <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600/20 text-green-500 px-8 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 transition-all shadow-lg">Aceptar</button>
                      <button onClick={() => deleteStaffApplicationFromDB(app.id).then(loadData)} className="bg-red-600/20 text-red-500 px-8 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all shadow-lg">Borrar</button>
                   </div>
                 </div>
                 
                 {expandedAppId === app.id && (
                   <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px]">
                         <div className="space-y-2"><p className="text-[#d4af37] font-black uppercase tracking-widest">Experiencia:</p><p className="text-gray-300 italic">"{app.answers.experience}"</p></div>
                         <div className="space-y-2"><p className="text-[#d4af37] font-black uppercase tracking-widest">Motivación:</p><p className="text-gray-300 italic">"{app.answers.motivation}"</p></div>
                         <div className="space-y-2"><p className="text-[#d4af37] font-black uppercase tracking-widest">Conflictos:</p><p className="text-gray-300 italic">"{app.answers.conflict}"</p></div>
                         <div className="space-y-2"><p className="text-[#d4af37] font-black uppercase tracking-widest">Disponibilidad:</p><p className="text-gray-300 italic">{app.answers.availability}</p></div>
                         <div className="md:col-span-2 space-y-2"><p className="text-[#d4af37] font-black uppercase tracking-widest">Aporte Único:</p><p className="text-gray-300 italic">"{app.answers.contribution}"</p></div>
                      </div>
                   </div>
                 )}
               </div>
             ))}
             {appsList.length === 0 && (
               <div className="text-center py-20">
                 <p className="text-gray-500 font-shaiya text-2xl uppercase opacity-30 italic">No hay postulaciones registradas...</p>
               </div>
             )}
           </div>
        </div>
      ) : null}

      {/* Hidden File Inputs */}
      <input type="file" ref={itemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'item')} />
      <input type="file" ref={mobFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mob')} />
      <input type="file" ref={dropItemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'dropItem')} />
      <input type="file" ref={logoFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
      <input type="file" ref={bgFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
      <input type="file" ref={mapPortalFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mapPortal')} />
      <input type="file" ref={bossPortalFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bossPortal')} />
    </div>
  );
};

export default AdminPanel;
