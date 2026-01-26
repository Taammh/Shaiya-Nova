
import React, { useState, useEffect, useRef } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication, DropMap, MobEntry, DropEntry, MapPoint, ItemRarity } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getStaffApplications, updateStaffApplicationStatus, deleteStaffApplicationFromDB, uploadFile, getDropListsFromDB, addDropListToDB, updateDropListInDB, deleteDropListFromDB } from '../services/supabaseClient';
import { zlibSync, strToU8 } from 'fflate';

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
    webhookSupport: '', webhookApps: '', webhookWelcome: '', clientId: '',
    botToken: '', guildId: '', roleGs: '', roleLgs: '', roleGm: '',
    siteLogo: '', siteBg: '', mapPortalBg: '', bossPortalBg: '',
    supabaseUrl: '', supabaseKey: ''
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

  useEffect(() => { loadData(); loadConfig(); }, [activeSubTab]);

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
      alert("Imagen vinculada.");
    } catch (err: any) { alert(err.message); }
    finally { setIsUploading(false); }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMobIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (drawMode === 'point') addPointToMob(x, y, 0, 'point');
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

  const removeMobFromCreation = (mIdx: number) => {
    if (!confirm('¿Eliminar entidad?')) return;
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      mobs.splice(mIdx, 1);
      return { ...prev, mobs };
    });
    setActiveMobIdx(null);
  };

  const uint8ToBase64 = (u8: Uint8Array): string => {
    let bin = '';
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
      bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CHUNK_SIZE)));
    }
    return btoa(bin);
  };

  const generateMasterLink = () => {
    const li = localStorage.getItem('nova_local_items');
    const ld = localStorage.getItem('nova_local_drops');
    
    // Mapeo Compacto V3 (Solo enviamos lo que tiene valor)
    const rawData: any = { 
      w1: config.webhookSupport, w2: config.webhookApps, w3: config.webhookWelcome,
      ci: config.clientId, bt: config.botToken, gi: config.guildId,
      r1: config.roleGs, r2: config.roleLgs, r3: config.roleGm,
      sl: config.siteLogo, sb: config.siteBg, mp: config.mapPortalBg,
      bp: config.bossPortalBg, su: config.supabaseUrl, sk: config.supabaseKey,
      li: li ? JSON.parse(li) : [], ld: ld ? JSON.parse(ld) : []
    };
    
    // Limpieza de campos vacíos para ahorrar espacio
    const compactData = Object.fromEntries(Object.entries(rawData).filter(([_, v]) => v !== '' && v !== null && (Array.isArray(v) ? v.length > 0 : true)));
    
    try {
      const compressed = zlibSync(strToU8(JSON.stringify(compactData)), { level: 9 });
      const base64 = uint8ToBase64(compressed);
      const url = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(base64)}&z=3`;
      
      navigator.clipboard.writeText(url);
      alert("¡LINK MAESTRO ULTRA-OPTIMIZADO! Ahora es mucho más corto y compatible con GitHub.");
    } catch (e) {
      console.error(e);
      alert("Error en el ritual de compresión.");
    }
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
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Infraestructura</h3>
              <input placeholder="Supabase URL" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseUrl} onChange={e => saveConfigField('supabaseUrl', e.target.value, 'SUPABASE_URL')} />
              <input placeholder="Supabase Key" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseKey} onChange={e => saveConfigField('supabaseKey', e.target.value, 'SUPABASE_ANON_KEY')} />
              <input placeholder="Discord ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.clientId} onChange={e => saveConfigField('clientId', e.target.value, 'DISCORD_CLIENT_ID')} />
            </div>
          </div>
          <button onClick={generateMasterLink} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black py-6 rounded-[2rem] uppercase tracking-[5px] shadow-2xl">Generar Link Maestro Seguro</button>
        </div>
      ) : activeSubTab === 'drops' ? (
        <div className="space-y-12 animate-fade-in">
           <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/30 shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-10 text-center uppercase tracking-widest">{editingId ? 'Reforjar' : 'Edición de Drops'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-white text-[10px] font-black uppercase tracking-[4px]">Configuración Mapa</h3>
                <input placeholder="Nombre" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newDrop.name} onChange={e => setNewDrop({...newDrop, name: e.target.value})} />
                <div className="flex gap-4">
                  <input placeholder="URL Imagen Mapa" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                  <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-2xl font-black uppercase text-[10px]">UP</button>
                  <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'drop')} />
                </div>
                {newDrop.image && (
                  <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-black cursor-crosshair select-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                    <img src={newDrop.image} loading="lazy" className="w-full h-auto opacity-70 pointer-events-none" />
                    {isDrawing && drawingStart && (
                      <div className="absolute border-2 border-white rounded-full bg-white/20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${drawingStart.x}%`, top: `${drawingStart.y}%`, width: `${tempRadius * 2}%`, height: `${tempRadius * 2}%`, aspectRatio: '1/1' }}></div>
                    )}
                    {newDrop.mobs?.map((mob, mIdx) => mob.points?.map((p, pIdx) => (
                      <div key={`${mIdx}-${pIdx}`} className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${p.type === 'area' ? 'border-2 rounded-full' : 'w-3 h-3 rounded-full border border-white'}`} style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.type === 'area' ? `${p.color}33` : p.color, borderColor: p.color, width: p.type === 'area' ? `${p.radius! * 2}%` : '12px', height: p.type === 'area' ? `${p.radius! * 2}%` : '12px', aspectRatio: '1/1' }}></div>
                    )))}
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-white text-[10px] font-black uppercase">Bestiario</h3>
                  <button onClick={() => { const m: MobEntry = { id: `mob-${Date.now()}`, name: 'Nueva Entidad', level: '1', image: '', mapColor: '#d4af37', drops: [], points: [] }; setNewDrop(p => ({ ...p, mobs: [...(p.mobs || []), m] })); }} className="bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">+ Entidad</button>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${activeMobIdx === mIdx ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-black/60 border-white/5'}`} onClick={() => setActiveMobIdx(mIdx)}>
                       <div className="flex gap-4 items-center">
                         <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0">
                           <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} loading="lazy" className="w-full h-full object-cover" />
                           <button onClick={(e) => { e.stopPropagation(); setUploadTarget({ mobIdx: mIdx }); mobFileRef.current?.click(); }} className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[8px] font-black opacity-0 hover:opacity-100">UP</button>
                         </div>
                         <div className="flex-grow">
                            <input className="bg-transparent border-none text-white font-shaiya text-lg outline-none w-full" value={mob.name} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].name = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                         </div>
                         <div className="flex gap-2">
                            <button onClick={e => { e.stopPropagation(); removeMobFromCreation(mIdx); }} className="bg-red-600/20 text-red-400 p-2 rounded-lg">🗑️</button>
                            <input type="color" className="w-8 h-8 cursor-pointer" value={mob.mapColor} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].mapColor = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                         </div>
                       </div>
                       {activeMobIdx === mIdx && (
                         <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                            <button onClick={e => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.push({ itemName: 'Nuevo', itemImage: '', rate: '1%', rarity: 'Common' }); setNewDrop({...newDrop, mobs: ms}); }} className="w-full bg-green-600/10 text-green-500 py-2 rounded-lg text-[8px] font-black uppercase">+ Añadir Drop</button>
                            {mob.drops.map((drop, dIdx) => (
                              <div key={dIdx} className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5">
                                 <input className="bg-transparent text-white text-[10px] flex-grow outline-none" value={drop.itemName} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].itemName = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                                 <button onClick={e => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.splice(dIdx, 1); setNewDrop({...newDrop, mobs: ms}); }} className="text-red-500">✖</button>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px] shadow-2xl">Confirmar Registro</button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10 overflow-hidden">
              <h3 className="text-[#d4af37] font-black uppercase text-xs p-6 border-b border-white/5">Historial Registrado</h3>
              <table className="w-full text-left">
                <tbody className="divide-y divide-white/5">
                  {dropsList.map(drop => (
                    <tr key={drop.id} className="text-white hover:bg-white/5 transition-colors">
                      <td className="p-6 font-shaiya text-2xl">{drop.name}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewDrop(drop); setEditingId(drop.id); }} className="text-[#d4af37] mr-4">✏️</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteDropListFromDB(drop.id).then(loadData) }} className="text-red-500">🗑️</button>
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
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-widest">Reliquias Sagradas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <input placeholder="Nombre" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as Faction})}>
                <option value={Faction.LIGHT}>Luz</option>
                <option value={Faction.FURY}>Furia</option>
                <option value={Faction.NEUTRAL}>Neutral</option>
              </select>
            </div>
            <div className="flex gap-4 mb-8">
               <input placeholder="URL Imagen" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none text-xs" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
               <button onClick={() => itemFileRef.current?.click()} className="bg-[#d4af37] text-black px-10 rounded-2xl font-black uppercase text-xs">UP</button>
            </div>
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full bg-white text-black font-black py-6 rounded-[2.5rem] uppercase tracking-[8px] shadow-xl">Guardar Reliquia</button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10">
             <table className="w-full text-left">
                <tbody className="divide-y divide-white/5">
                  {itemsList.map(item => (
                    <tr key={item.id} className="text-white hover:bg-white/5 transition-colors">
                      <td className="p-6 flex items-center gap-4">
                          <img src={item.image} loading="lazy" className="w-12 h-12 rounded-xl object-contain bg-black" />
                          <span className="font-shaiya text-2xl">{item.name}</span>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); }} className="text-[#d4af37] mr-4">✏️</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteItemFromDB(item.id).then(loadData) }} className="text-red-500">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : activeSubTab === 'apps' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 animate-fade-in text-center">
           <h2 className="text-4xl font-shaiya text-white uppercase mb-8">Postulaciones Staff</h2>
           <div className="space-y-4">
             {appsList.map(app => (
               <div key={app.id} className="bg-black/60 p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <img src={app.avatar_url} loading="lazy" className="w-16 h-16 rounded-xl border border-[#d4af37]" />
                    <div className="text-left">
                       <p className="text-white font-shaiya text-2xl">{app.username}</p>
                       <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">{app.position}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600/20 text-green-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Aceptar</button>
                     <button onClick={() => deleteStaffApplicationFromDB(app.id).then(loadData)} className="bg-red-600/20 text-red-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Borrar</button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      ) : null}

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
