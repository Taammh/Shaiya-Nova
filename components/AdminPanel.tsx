
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
      
      if (type === 'item') {
        setNewItem(prev => ({ ...prev, image: publicUrl }));
      } else if (type === 'drop') {
        setNewDrop(prev => ({ ...prev, image: publicUrl }));
      } else if (type === 'logo') {
        await saveSetting('SITE_LOGO_URL', publicUrl);
        setConfig(prev => ({ ...prev, siteLogo: publicUrl }));
      } else if (type === 'bg') {
        await saveSetting('SITE_BG_URL', publicUrl);
        setConfig(prev => ({ ...prev, siteBg: publicUrl }));
      } else if (type === 'mob' && uploadTarget !== null) {
        setNewDrop(prev => {
          const mobs = [...(prev.mobs || [])];
          if (mobs[uploadTarget.mobIdx]) {
            mobs[uploadTarget.mobIdx] = { ...mobs[uploadTarget.mobIdx], image: publicUrl };
          }
          return { ...prev, mobs };
        });
      } else if (type === 'dropItem' && uploadTarget !== null && uploadTarget.dropIdx !== undefined) {
        setNewDrop(prev => {
          const mobs = [...(prev.mobs || [])];
          const drops = [...mobs[uploadTarget.mobIdx].drops];
          drops[uploadTarget.dropIdx!] = { ...drops[uploadTarget.dropIdx!], itemImage: publicUrl };
          mobs[uploadTarget.mobIdx] = { ...mobs[uploadTarget.mobIdx], drops };
          return { ...prev, mobs };
        });
      }
      alert("Archivo manifestado con éxito.");
    } catch (err: any) { alert(err.message); }
    finally { setIsUploading(false); }
  };

  const generateMasterLink = () => {
    const dataToSync = { ...config };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dataToSync))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    navigator.clipboard.writeText(url);
    alert("¡Link Maestro copiado! Compártelo para sincronizar ajustes, roles y el reino entero.");
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
    if (!newItem.name || !newItem.image) return alert("Nombre e imagen requeridos.");
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
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">IDs de Roles (Staff)</h3>
              <input placeholder="ID Rol Game Sage" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.roleGs} onChange={e => saveConfigField('roleGs', e.target.value, 'ROLE_ID_GS')} />
              <input placeholder="ID Rol Líder GS" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.roleLgs} onChange={e => saveConfigField('roleLgs', e.target.value, 'ROLE_ID_LGS')} />
              <input placeholder="ID Rol GM" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.roleGm} onChange={e => saveConfigField('roleGm', e.target.value, 'ROLE_ID_GM')} />
            </div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Discord Auth</h3>
              <input placeholder="Client ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.clientId} onChange={e => saveConfigField('clientId', e.target.value, 'DISCORD_CLIENT_ID')} />
              <input placeholder="Bot Token" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.botToken} onChange={e => saveConfigField('botToken', e.target.value, 'DISCORD_BOT_TOKEN')} />
              <input placeholder="Guild ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.guildId} onChange={e => saveConfigField('guildId', e.target.value, 'DISCORD_GUILD_ID')} />
            </div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Branding Visual</h3>
              <div className="flex gap-4 items-center">
                <input placeholder="URL Logo" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.siteLogo} onChange={e => saveConfigField('siteLogo', e.target.value, 'SITE_LOGO_URL')} />
                <button onClick={() => logoFileRef.current?.click()} className="bg-white/10 p-4 rounded-xl text-white">📁</button>
              </div>
              <div className="flex gap-4 items-center">
                <input placeholder="URL Fondo General" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.siteBg} onChange={e => saveConfigField('siteBg', e.target.value, 'SITE_BG_URL')} />
                <button onClick={() => bgFileRef.current?.click()} className="bg-white/10 p-4 rounded-xl text-white">📁</button>
              </div>
            </div>
          </div>
          <button onClick={generateMasterLink} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black py-6 rounded-[2rem] uppercase tracking-[5px] shadow-2xl hover:brightness-125 transition-all">Generar Link Maestro de Sincronización</button>
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
                         <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 group bg-black shrink-0">
                           <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-full h-full object-cover" />
                           <button onClick={(e) => { e.stopPropagation(); setUploadTarget({ mobIdx: mIdx }); mobFileRef.current?.click(); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black">SUBIR</button>
                         </div>
                         <div className="flex-grow">
                            <input className="bg-transparent border-none text-white font-shaiya text-lg outline-none w-full" value={mob.name} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].name = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                            <div className="flex items-center gap-2">
                               <input type="text" className="bg-transparent border-none text-gray-500 text-[10px] font-black w-20 outline-none" value={`NIVEL ${mob.level}`} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].level = e.target.value.replace('NIVEL ', ''); setNewDrop({...newDrop, mobs: ms}); }} />
                               <span className="text-gray-700 mx-1">•</span>
                               <p className="text-[10px] font-black uppercase text-gray-500">{mob.points.length} Marcas</p>
                            </div>
                         </div>
                         <div className="flex flex-col gap-2">
                            <input type="color" className="w-8 h-8 bg-transparent border-none cursor-pointer" value={mob.mapColor} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].mapColor = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                            <button onClick={e => { e.stopPropagation(); addDropToMob(mIdx); }} className="bg-green-600/20 text-green-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase hover:bg-green-600 hover:text-white transition-all">DROP +</button>
                         </div>
                       </div>
                       {activeMobIdx === mIdx && (
                         <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                            {mob.drops.map((drop, dIdx) => (
                              <div key={dIdx} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 group/drop">
                                 <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black">
                                    <img src={drop.itemImage || "https://api.dicebear.com/7.x/pixel-art/svg?seed=item"} className="w-full h-full object-contain" />
                                    <button onClick={(e) => { e.stopPropagation(); setUploadTarget({ mobIdx: mIdx, dropIdx: dIdx }); dropItemFileRef.current?.click(); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover/drop:opacity-100 flex items-center justify-center text-white text-[7px] font-black">SUBIR</button>
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
                                 <button onClick={() => { if(confirm('¿Quitar drop?')){ const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.splice(dIdx, 1); setNewDrop({...newDrop, mobs: ms}); } }} className="text-red-500 opacity-0 group-hover/drop:opacity-100 transition-opacity">✖</button>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} disabled={isSaving || isUploading} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px] hover:bg-[#d4af37] transition-all shadow-2xl">
               {editingId ? 'Confirmar Reforja de Pergamino' : 'Sellar Guía de Drop'}
            </button>
          </div>
          
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10">
             <h3 className="text-white font-shaiya text-2xl uppercase mb-6">Registros Almacenados</h3>
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black uppercase text-[#d4af37]">
                  <tr><th className="p-6">Mapa / Jefe</th><th className="p-6">Categoría</th><th className="p-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dropsList.map(drop => (
                    <tr key={drop.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-6"><div className="flex items-center gap-5 font-shaiya text-white text-2xl">{drop.name}</div></td>
                      <td className="p-6 text-[10px] text-gray-500 uppercase font-black">{drop.category} ({drop.faction})</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewDrop(drop); setEditingId(drop.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="text-[#d4af37] hover:scale-125 transition-transform mr-4">✏️</button>
                        <button onClick={() => { if(confirm('¿Destruir registro?')) deleteDropListFromDB(drop.id).then(loadData) }} className="text-red-500 hover:scale-125 transition-transform">🗑️</button>
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
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-widest">{editingId ? 'Reforjar Reliquia' : 'Nueva Reliquia'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <input placeholder="Nombre del Objeto" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as any})}>
                <option value={Faction.LIGHT}>Facción: Luz</option>
                <option value={Faction.FURY}>Facción: Furia</option>
                <option value={Faction.NEUTRAL}>Facción: Neutral</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                <option value="All">Todas las Clases</option>
                <option value="Luchador">Luchador / Guerrero</option>
                <option value="Guardián">Guardián</option>
                <option value="Explorador">Explorador / Cazador</option>
                <option value="Tirador">Tirador / Animista</option>
                <option value="Mago">Mago / Pagano</option>
                <option value="Oráculo">Oráculo</option>
                <option value="Oraculo/Pagano">Oráculo / Pagano</option>
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as any})}>
                <option value={Gender.BOTH}>Género: Ambos</option>
                <option value={Gender.MALE}>Género: Masculino</option>
                <option value={Gender.FEMALE}>Género: Femenino</option>
              </select>
            </div>
            <div className="flex gap-4 mb-6">
               <input placeholder="URL de Imagen" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
               <button onClick={() => itemFileRef.current?.click()} className="bg-[#d4af37] text-black px-8 rounded-2xl font-black uppercase text-xs">Subir</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               <input placeholder="Estadísticas (Ej: STR +20)" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.stats} onChange={e => setNewItem({...newItem, stats: e.target.value})} />
               <input placeholder="Precio / Valor" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            </div>
            <textarea placeholder="Descripción del Objeto" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none mb-8 min-h-[100px]" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full bg-white text-black font-black py-5 rounded-[2rem] uppercase tracking-[5px] hover:bg-[#d4af37] transition-all shadow-xl">
               {editingId ? 'Confirmar Reforja de Reliquia' : 'Manifestar en el Reino'}
            </button>
          </div>
          
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
             <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black uppercase text-[#d4af37]">
                  <tr><th className="p-6">Reliquia</th><th className="p-6">Categoría / Facción</th><th className="p-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemsList.map(item => (
                    <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-6 text-white font-shaiya text-xl">{item.name}</td>
                      <td className="p-6 text-[10px] text-gray-500 uppercase font-black">{item.category} • {item.faction} • {item.item_class}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="text-[#d4af37] mr-4">✏️</button>
                        <button onClick={() => { if(confirm('¿Borrar reliquia?')) deleteItemFromDB(item.id).then(loadData) }} className="text-red-500">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10">
           <h2 className="text-3xl font-shaiya text-white uppercase mb-10 text-center tracking-widest">Postulaciones del Staff</h2>
           <div className="space-y-4">
             {appsList.map(app => (
               <div key={app.id} className="bg-black/40 p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex gap-4 items-center">
                   <img src={app.avatar_url} className="w-16 h-16 rounded-2xl border border-[#d4af37]/30" />
                   <div><p className="text-white font-shaiya text-2xl">{app.username}</p><p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[3px]">{app.position} ({app.status})</p></div>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600/20 text-green-500 px-6 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-green-600 hover:text-white transition-all">Aprobar</button>
                    <button onClick={() => deleteStaffApplicationFromDB(app.id).then(loadData)} className="bg-red-600/20 text-red-500 px-6 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Borrar</button>
                 </div>
               </div>
             ))}
             {appsList.length === 0 && <p className="text-center py-10 text-gray-500 font-shaiya text-xl opacity-30 italic">No hay postulaciones en espera...</p>}
           </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input type="file" ref={itemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'item')} />
      <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'drop')} />
      <input type="file" ref={mobFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mob')} />
      <input type="file" ref={dropItemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'dropItem')} />
    </div>
  );
};

export default AdminPanel;
