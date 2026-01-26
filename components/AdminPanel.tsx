
import React, { useState, useEffect, useRef } from 'react';
import { Category, Faction, CLASSES_BY_FACTION, Gender, StaffApplication, DropMap, MobEntry, DropEntry, MapPoint, ItemRarity, GameItem } from '../types';
import { addItemToDB, updateItemInDB, deleteItemFromDB, getItemsFromDB, saveSetting, getSetting, getStaffApplications, updateStaffApplicationStatus, deleteStaffApplicationFromDB, uploadFile, getDropListsFromDB, addDropListToDB, updateDropListInDB, deleteDropListFromDB } from '../services/supabaseClient';

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

  const generateMasterLink = () => {
    const li = localStorage.getItem('nova_local_items');
    const ld = localStorage.getItem('nova_local_drops');
    const syncObj = {
      config: config,
      localItems: li ? JSON.parse(li) : [],
      localDrops: ld ? JSON.parse(ld) : []
    };
    const jsonStr = JSON.stringify(syncObj);
    const safeBase64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(safeBase64)}&v=4`;
    navigator.clipboard.writeText(url);
    alert("¡LINK MAESTRO GENERADO!");
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
            </div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 md:col-span-2">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Identidad del Reino</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <input placeholder="URL Logo Principal" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs mb-2" value={config.siteLogo} onChange={e => saveConfigField('siteLogo', e.target.value, 'SITE_LOGO_URL')} />
                    <button onClick={() => logoFileRef.current?.click()} className="text-[10px] text-[#d4af37] font-black uppercase">Subir Logo</button>
                 </div>
                 <div>
                    <input placeholder="URL Fondo General" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs mb-2" value={config.siteBg} onChange={e => saveConfigField('siteBg', e.target.value, 'SITE_BG_URL')} />
                    <button onClick={() => bgFileRef.current?.click()} className="text-[10px] text-[#d4af37] font-black uppercase">Subir Fondo</button>
                 </div>
                 <div>
                    <input placeholder="Fondo Portal Mapas" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs mb-2" value={config.mapPortalBg} onChange={e => saveConfigField('mapPortalBg', e.target.value, 'MAP_PORTAL_BG')} />
                    <button onClick={() => mapPortalFileRef.current?.click()} className="text-[10px] text-[#d4af37] font-black uppercase">Subir Portal Mapas</button>
                 </div>
                 <div>
                    <input placeholder="Fondo Portal Bosses" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs mb-2" value={config.bossPortalBg} onChange={e => saveConfigField('bossPortalBg', e.target.value, 'BOSS_PORTAL_BG')} />
                    <button onClick={() => bossPortalFileRef.current?.click()} className="text-[10px] text-[#d4af37] font-black uppercase">Subir Portal Bosses</button>
                 </div>
              </div>
            </div>
          </div>
          <button onClick={generateMasterLink} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black py-6 rounded-[2rem] uppercase tracking-[5px] shadow-2xl">Generar Link Maestro Definitivo</button>
        </div>
      ) : activeSubTab === 'drops' ? (
        <div className="space-y-12 animate-fade-in">
           <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/30 shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-10 text-center uppercase tracking-widest">{editingId ? 'Reforjar Pergamino' : 'Edición de Drops'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <input placeholder="Nombre Mapa" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newDrop.name} onChange={e => setNewDrop({...newDrop, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newDrop.category} onChange={e => setNewDrop({...newDrop, category: e.target.value as any})}>
                    <option value="Mapa">Mapa</option>
                    <option value="Boss">Boss</option>
                  </select>
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newDrop.faction} onChange={e => setNewDrop({...newDrop, faction: e.target.value as Faction})}>
                    <option value={Faction.LIGHT}>Luz</option>
                    <option value={Faction.FURY}>Furia</option>
                    <option value={Faction.NEUTRAL}>Neutral</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <input placeholder="URL Imagen Mapa" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                  <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-2xl font-black uppercase text-[10px]">UP</button>
                </div>
                {newDrop.image && (
                  <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-black cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                    <img src={newDrop.image} className="w-full h-auto opacity-70 pointer-events-none" />
                    {newDrop.mobs?.map((mob, mIdx) => mob.points?.map((p, pIdx) => (
                      <div key={`${mIdx}-${pIdx}`} className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${p.type === 'area' ? 'border-2 rounded-full' : 'w-3 h-3 rounded-full border border-white'}`} style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.type === 'area' ? `${p.color}33` : p.color, borderColor: p.color, width: p.type === 'area' ? `${p.radius! * 2}%` : '12px', height: p.type === 'area' ? `${p.radius! * 2}%` : '12px', aspectRatio: '1/1' }}></div>
                    )))}
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <button onClick={() => { const m: MobEntry = { id: `mob-${Date.now()}`, name: 'Nueva Entidad', level: '1', image: '', mapColor: '#d4af37', drops: [], points: [] }; setNewDrop(p => ({ ...p, mobs: [...(p.mobs || []), m] })); }} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase">+ Entidad</button>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-4 rounded-2xl border ${activeMobIdx === mIdx ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/5 bg-black/40'}`} onClick={() => setActiveMobIdx(mIdx)}>
                       <div className="flex justify-between items-center mb-2">
                          <input className="bg-transparent text-white font-shaiya text-lg" value={mob.name} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].name = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                          <input type="color" value={mob.mapColor} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].mapColor = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                       </div>
                       <button onClick={e => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.push({ itemName: '', itemImage: '', rate: '1%', rarity: 'Common' }); setNewDrop({...newDrop, mobs: ms}); }} className="text-[10px] text-green-500 uppercase">+ Drop</button>
                       {activeMobIdx === mIdx && (
                         <div className="mt-2 space-y-2">
                            {mob.drops.map((drop, dIdx) => (
                              <div key={dIdx} className="flex gap-2 items-center">
                                <input placeholder="Item" className="bg-black/60 text-white text-[10px] p-2 rounded flex-grow" value={drop.itemName} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].itemName = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                                <button onClick={() => { setUploadTarget({mobIdx: mIdx, dropIdx: dIdx}); dropItemFileRef.current?.click(); }} className="text-[10px]">📁</button>
                                <button onClick={() => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.splice(dIdx, 1); setNewDrop({...newDrop, mobs: ms}); }} className="text-red-500">✖</button>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px]">Confirmar Registro</button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10 overflow-hidden">
              <h3 className="text-[#d4af37] font-black uppercase text-xs p-6 border-b border-white/5">Historial de Drops</h3>
              <table className="w-full text-left">
                <tbody className="divide-y divide-white/5">
                  {dropsList.map(drop => (
                    <tr key={drop.id} className="text-white hover:bg-white/5 transition-colors">
                      <td className="p-6 font-shaiya text-2xl">{drop.name} ({drop.category})</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewDrop(drop); setEditingId(drop.id); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-[#d4af37] mr-4">✏️ Editar</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteDropListFromDB(drop.id).then(loadData); }} className="text-red-500">🗑️ Borrar</button>
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
              <input placeholder="Nombre" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.faction} onChange={e => setNewItem({...newItem, faction: e.target.value as Faction})}>
                <option value={Faction.LIGHT}>Fación: Luz</option>
                <option value={Faction.FURY}>Fación: Furia</option>
                <option value={Faction.NEUTRAL}>Fación: Neutral</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.item_class} onChange={e => setNewItem({...newItem, item_class: e.target.value})}>
                {(CLASSES_BY_FACTION[newItem.faction as Faction] || []).map(c => <option key={c} value={c}>{c}</option>)}
                <option value="All">Todas las Clases</option>
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as Gender})}>
                <option value={Gender.BOTH}>Género: Ambos</option>
                <option value={Gender.MALE}>Género: Masculino</option>
                <option value={Gender.FEMALE}>Género: Femenino</option>
              </select>
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.rarity} onChange={e => setNewItem({...newItem, rarity: e.target.value as any})}>
                {['Common', 'Noble', 'Atroz', 'Legendary', 'Diosa', 'Special', 'Unique'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-4 mb-8">
               <input placeholder="URL Imagen" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none text-xs" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
               <button onClick={() => itemFileRef.current?.click()} className="bg-[#d4af37] text-black px-10 rounded-2xl font-black uppercase text-xs">SUBIR</button>
            </div>
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full bg-white text-black font-black py-6 rounded-[2.5rem] uppercase tracking-[8px]">Guardar Reliquia</button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10">
             <table className="w-full text-left">
                <tbody className="divide-y divide-white/5">
                  {itemsList.map(item => (
                    <tr key={item.id} className="text-white hover:bg-white/5 transition-colors">
                      <td className="p-6 flex items-center gap-4">
                          <img src={item.image} className="w-12 h-12 rounded-xl object-contain bg-black" />
                          <span className="font-shaiya text-2xl">{item.name} ({item.category})</span>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-[#d4af37] mr-4">✏️ Editar</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteItemFromDB(item.id).then(loadData); }} className="text-red-500">🗑️ Borrar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : activeSubTab === 'apps' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 animate-fade-in">
           <h2 className="text-4xl font-shaiya text-white uppercase mb-8 text-center">Postulaciones Staff</h2>
           <div className="space-y-6">
             {appsList.map(app => (
               <div key={app.id} className="bg-black/60 p-8 rounded-[2.5rem] border border-white/5">
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <img src={app.avatar_url} className="w-16 h-16 rounded-xl border border-[#d4af37]" />
                      <div className="text-left">
                         <p className="text-white font-shaiya text-3xl">{app.username}</p>
                         <p className="text-[#d4af37] text-[10px] font-black uppercase">{app.position} • {app.status}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)} className="bg-white/10 text-white px-4 py-2 rounded-lg text-[10px]">VER MÁS</button>
                       <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-[10px]">ACEPTAR</button>
                       <button onClick={() => deleteStaffApplicationFromDB(app.id).then(loadData)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px]">BORRAR</button>
                    </div>
                 </div>
                 {expandedAppId === app.id && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300 bg-black/40 p-6 rounded-2xl animate-fade-in">
                       <p><b>Experiencia:</b> {app.answers.experience}</p>
                       <p><b>Motivación:</b> {app.answers.motivation}</p>
                       <p><b>Conflictos:</b> {app.answers.conflict}</p>
                       <p><b>Disponibilidad:</b> {app.answers.availability}</p>
                       <p className="md:col-span-2"><b>Aporte:</b> {app.answers.contribution}</p>
                    </div>
                 )}
               </div>
             ))}
           </div>
        </div>
      ) : null}

      <input type="file" ref={itemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'item')} />
      <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'drop')} />
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
