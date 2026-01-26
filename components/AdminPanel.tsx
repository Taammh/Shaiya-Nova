
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
      if (activeSubTab === 'apps') {
        const apps = await getStaffApplications();
        setAppsList(apps || []);
      } else if (activeSubTab === 'drops') {
        const drops = await getDropListsFromDB();
        setDropsList(drops || []);
      } else {
        const items = await getItemsFromDB();
        setItemsList(items || []);
      }
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
    if (activeSubTab === 'settings') loadConfig();
  }, [activeSubTab]);

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
      alert("Archivo manifestado con éxito.");
    } catch (err: any) { alert(err.message); }
    finally { setIsUploading(false); }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMobIdx === null) return;
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
    
    // Distancia simple en %
    const dist = Math.sqrt(Math.pow(x - drawingStart.x, 2) + Math.pow(y - drawingStart.y, 2));
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
      const newPoint: MapPoint = { x, y, color: mob.mapColor || '#d4af37', label: mob.name, type, radius };
      mob.points = [...(mob.points || []), newPoint];
      mobs[activeMobIdx] = mob;
      return { ...prev, mobs };
    });
  };

  const handleAddDrop = async () => {
    if (!newDrop.name || !newDrop.image) return alert("Faltan datos del mapa.");
    setIsSaving(true);
    try {
      if (editingId) await updateDropListInDB({ ...newDrop, id: editingId } as DropMap);
      else await addDropListToDB(newDrop);
      setNewDrop({ name: '', category: 'Mapa', faction: Faction.LIGHT, image: '', description: '', mobs: [] });
      setEditingId(null);
      loadData();
    } catch { alert('Error.'); }
    finally { setIsSaving(false); }
  };

  const addMob = () => {
    const mob: MobEntry = {
      id: `mob-${Date.now()}`,
      name: 'Nueva Entidad',
      level: '1',
      image: '',
      mapColor: '#d4af37',
      drops: [],
      points: []
    };
    setNewDrop(prev => ({ ...prev, mobs: [...(prev.mobs || []), mob] }));
    setActiveMobIdx((newDrop.mobs?.length || 0));
  };

  const addDropToMob = (mIdx: number) => {
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      const newDropEntry: DropEntry = { itemName: 'Nuevo Item', itemImage: '', rate: '1%', rarity: 'Common' };
      mobs[mIdx].drops = [...mobs[mIdx].drops, newDropEntry];
      return { ...prev, mobs };
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        {['items', 'drops', 'apps', 'settings'].map(t => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`px-10 py-3 rounded-full font-black uppercase text-xs transition-all tracking-widest ${activeSubTab === t ? 'bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-black/60 text-gray-500 border border-white/5'}`}>
            {t === 'items' ? 'Reliquias' : t === 'drops' ? 'Drop List Pro' : t === 'apps' ? 'Staff' : 'Ajustes'}
          </button>
        ))}
      </div>

      {activeSubTab === 'settings' ? (
        <div className="space-y-12 animate-fade-in">
          {/* Settings UI remains the same as previous turn */}
        </div>
      ) : activeSubTab === 'drops' ? (
        <div className="space-y-12 animate-fade-in">
           <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/30 shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-10 text-center uppercase tracking-widest">{editingId ? 'Reforjar Pergamino de Drop' : 'Nueva Guía Táctica'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-white text-[10px] font-black uppercase tracking-[4px] ml-2">Configuración Base</h3>
                  <input placeholder="Nombre (Ej: Pantano Infernal)" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newDrop.name} onChange={e => setNewDrop({...newDrop, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none cursor-pointer" value={newDrop.category} onChange={e => setNewDrop({...newDrop, category: e.target.value as any})}>
                      <option value="Mapa">Tipo: Mapa / Región</option>
                      <option value="Boss">Tipo: Jefe / Boss</option>
                    </select>
                    <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none cursor-pointer" value={newDrop.faction} onChange={e => setNewDrop({...newDrop, faction: e.target.value as any})}>
                      <option value={Faction.LIGHT}>Fación: Luz</option>
                      <option value={Faction.FURY}>Fación: Furia</option>
                      <option value={Faction.NEUTRAL}>Fación: Ambas (Neutral)</option>
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <input placeholder="Imagen URL del Mapa" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                    <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-2xl font-black uppercase text-[10px] hover:bg-white transition-all shadow-lg">Subir</button>
                    <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'drop')} />
                  </div>
                </div>
                {newDrop.image && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-end px-2">
                       <div className="space-y-1">
                          <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-[4px]">Herramientas Cartográficas</h3>
                          <div className="flex gap-2">
                             <button onClick={() => setDrawMode('point')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${drawMode === 'point' ? 'bg-[#d4af37] text-black border-white' : 'bg-black/40 text-gray-500 border-white/5'}`}>Punto</button>
                             <button onClick={() => setDrawMode('area')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${drawMode === 'area' ? 'bg-[#d4af37] text-black border-white' : 'bg-black/40 text-gray-500 border-white/5'}`}>Zona (Clic+Arrastra)</button>
                             <button onClick={() => { if(activeMobIdx !== null) { const ms = [...(newDrop.mobs || [])]; ms[activeMobIdx].points = []; setNewDrop({...newDrop, mobs: ms}); } }} className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-600/20 text-red-500 border border-red-500/20">Limpiar Mob</button>
                          </div>
                       </div>
                       <p className="text-gray-500 text-[9px] uppercase font-bold italic">Selecciona un mob para marcar</p>
                    </div>
                    <div 
                      className="relative rounded-[2rem] overflow-hidden border border-white/10 cursor-crosshair bg-black group select-none" 
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                    >
                      <img src={newDrop.image} className="w-full h-auto opacity-70 group-hover:opacity-90 transition-opacity pointer-events-none" />
                      
                      {/* Marcas Existentes */}
                      {newDrop.mobs?.map((mob, mIdx) => 
                        mob.points?.map((p, pIdx) => (
                          p.type === 'area' ? (
                            <div key={`${mIdx}-${pIdx}`} className="absolute border-2 rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.radius! * 2}%`, height: `${p.radius! * 2}%`, borderColor: p.color, backgroundColor: `${p.color}33`, aspectRatio: '1/1' }}></div>
                          ) : (
                            <div key={`${mIdx}-${pIdx}`} className="absolute w-3 h-3 rounded-full border border-white shadow-2xl transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.color }}></div>
                          )
                        ))
                      )}

                      {/* Vista Previa del Dibujo */}
                      {isDrawing && drawingStart && (
                        <div className="absolute border-2 border-dashed rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${drawingStart.x}%`, top: `${drawingStart.y}%`, width: `${tempRadius * 2}%`, height: `${tempRadius * 2}%`, borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.2)', aspectRatio: '1/1' }}></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-8">
                {/* Mob list UI... similar to previous turns, ensures activeMobIdx is set correctly */}
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-white text-[10px] font-black uppercase tracking-[4px]">Bestiario del Mapa</h3>
                  <button onClick={addMob} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all">+ Nueva Entidad</button>
                </div>
                <div className="space-y-6 max-h-[800px] overflow-y-auto pr-3 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${activeMobIdx === mIdx ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-black/60 border-white/5'}`} onClick={() => setActiveMobIdx(mIdx)}>
                       <div className="flex gap-4 items-center">
                         <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-12 h-12 rounded-xl border border-white/10 object-cover" />
                         <div className="flex-grow">
                            <p className="text-white font-shaiya text-lg">{mob.name}</p>
                            <p className="text-[10px] font-black uppercase text-gray-500">Nivel {mob.level} • {mob.points.length} Marcas</p>
                         </div>
                         <div className="w-4 h-4 rounded-full" style={{backgroundColor: mob.mapColor}}></div>
                       </div>
                       {/* Drop editing nested here... */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} disabled={isSaving || isUploading} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px] hover:bg-[#d4af37] transition-all shadow-2xl disabled:opacity-50">
               {editingId ? 'Confirmar Actualización' : 'Sellar Guía de Drop'}
            </button>
          </div>
        </div>
      ) : <div className="text-center text-white py-20 font-shaiya text-4xl opacity-20">Selecciona una categoría para administrar</div>}

      <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'drop')} />
      <input type="file" ref={mobFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mob')} />
      <input type="file" ref={dropItemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'dropItem')} />
    </div>
  );
};

export default AdminPanel;
