
import React, { useState, useEffect, useRef } from 'react';
import { Category, Faction, GameItem, CLASSES_BY_FACTION, Gender, StaffApplication, DropMap, MobEntry, DropEntry, MapPoint } from '../types';
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
      else if (type === 'logo') {
        await saveSetting('SITE_LOGO_URL', publicUrl);
        setConfig(prev => ({ ...prev, siteLogo: publicUrl }));
      }
      else if (type === 'bg') {
        await saveSetting('SITE_BG_URL', publicUrl);
        setConfig(prev => ({ ...prev, siteBg: publicUrl }));
      }
      else if (type === 'mapPortal') {
        await saveSetting('MAP_PORTAL_BG', publicUrl);
        setConfig(prev => ({ ...prev, mapPortalBg: publicUrl }));
      }
      else if (type === 'bossPortal') {
        await saveSetting('BOSS_PORTAL_BG', publicUrl);
        setConfig(prev => ({ ...prev, bossPortalBg: publicUrl }));
      }
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

  const generateMasterLink = () => {
    const payload = {
      ...config,
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const link = `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
    navigator.clipboard.writeText(link).then(() => alert("¡LINK MAESTRO GENERADO Y COPIADO!"));
  };

  const saveConfigField = async (key: string, value: string, settingKey: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    await saveSetting(settingKey, value);
  };

  const handleAddItem = async () => {
    if (!newItem.name) return alert("Falta el nombre.");
    setIsSaving(true);
    try {
      if (editingId) await updateItemInDB({ ...newItem, id: editingId } as GameItem);
      else await addItemToDB(newItem);
      setNewItem({ name: '', category: Category.MOUNT, image: '', description: '', faction: Faction.LIGHT, item_class: 'All', gender: Gender.BOTH, price: '', stats: '' });
      setEditingId(null);
      loadData();
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
      setEditingId(null);
      loadData();
    } catch { alert('Error.'); }
    finally { setIsSaving(false); }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMobIdx === null) return alert("Selecciona una entidad del bestiario primero.");
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      const mob = { ...mobs[activeMobIdx] };
      const newPoint: MapPoint = { x, y, color: mob.mapColor || '#d4af37', label: mob.name };
      mob.points = [...(mob.points || []), newPoint];
      mobs[activeMobIdx] = mob;
      return { ...prev, mobs };
    });
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
    setNewDrop(prev => ({
      ...prev,
      mobs: [...(prev.mobs || []), mob]
    }));
    setActiveMobIdx((newDrop.mobs?.length || 0));
  };

  const addDropToMob = (mIdx: number) => {
    setNewDrop(prev => {
      const mobs = [...(prev.mobs || [])];
      const newDropEntry: DropEntry = {
        itemName: 'Nuevo Item',
        itemImage: '',
        rate: '1%',
        rarity: 'Common'
      };
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
          <div className="glass-panel p-16 rounded-[3rem] border border-[#d4af37]/40 text-center space-y-8 shadow-[0_0_60px_rgba(0,0,0,0.5)] relative overflow-hidden">
             <div className="absolute inset-0 border-[2px] border-dashed border-[#d4af37]/20 rounded-[3rem] m-2 pointer-events-none"></div>
             <h2 className="text-4xl font-shaiya text-[#d4af37] uppercase tracking-[8px]">Sincronización Total</h2>
             <p className="text-gray-400 text-[10px] uppercase tracking-[4px] max-w-2xl mx-auto">Genera un enlace único con tus ajustes.</p>
             <button onClick={generateMasterLink} className="bg-white text-black font-black px-12 py-5 rounded-2xl uppercase tracking-[6px] hover:bg-[#d4af37] transition-all shadow-2xl flex items-center gap-3 mx-auto">
                <span className="text-xl">🔗</span> GENERAR LINK MAESTRO
             </button>
          </div>

          <h2 className="text-3xl font-shaiya text-white text-center uppercase tracking-[10px]">Branding del Reino</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Logo Principal</h3>
                <div className="flex gap-4 items-center">
                   <div className="w-20 h-20 bg-black/60 rounded-xl border border-white/10 p-2 shrink-0 overflow-hidden">
                      <img src={config.siteLogo || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-full h-full object-contain" />
                   </div>
                   <button onClick={() => logoFileRef.current?.click()} className="flex-grow bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all">Subir Logo</button>
                </div>
                <input type="file" ref={logoFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
             </div>
             <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Fondo Épico</h3>
                <div className="flex gap-4 items-center">
                   <div className="w-20 h-20 bg-black/60 rounded-xl border border-white/10 overflow-hidden shrink-0">
                      <img src={config.siteBg || "https://api.dicebear.com/7.x/pixel-art/svg?seed=bg"} className="w-full h-full object-cover" />
                   </div>
                   <button onClick={() => bgFileRef.current?.click()} className="flex-grow bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all">Subir Fondo</button>
                </div>
                <input type="file" ref={bgFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
             </div>
             <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Imagen Portal "Por Mapa"</h3>
                <div className="flex gap-4 items-center">
                   <div className="w-20 h-20 bg-black/60 rounded-xl border border-white/10 overflow-hidden shrink-0">
                      <img src={config.mapPortalBg || "https://api.dicebear.com/7.x/pixel-art/svg?seed=map"} className="w-full h-full object-cover" />
                   </div>
                   <button onClick={() => mapPortalFileRef.current?.click()} className="flex-grow bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all">Subir Portal</button>
                </div>
                <input type="file" ref={mapPortalFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mapPortal')} />
             </div>
             <div className="glass-panel p-10 rounded-[2.5rem] border border-white/10 space-y-6">
                <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Imagen Portal "Por Boss"</h3>
                <div className="flex gap-4 items-center">
                   <div className="w-20 h-20 bg-black/60 rounded-xl border border-white/10 overflow-hidden shrink-0">
                      <img src={config.bossPortalBg || "https://api.dicebear.com/7.x/pixel-art/svg?seed=boss"} className="w-full h-full object-cover" />
                   </div>
                   <button onClick={() => bossPortalFileRef.current?.click()} className="flex-grow bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all">Subir Portal</button>
                </div>
                <input type="file" ref={bossPortalFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bossPortal')} />
             </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div className="glass-panel p-10 rounded-[3rem] border border-white/10 space-y-6">
                <h3 className="text-white text-lg font-shaiya uppercase border-b border-white/10 pb-4">Webhooks y Discord</h3>
                <div className="space-y-4">
                   <input placeholder="Webhook Soporte" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookSupport} onChange={e => saveConfigField('webhookSupport', e.target.value, 'NOVA_WEBHOOK_URL')} />
                   <input placeholder="Webhook Postulaciones" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookApps} onChange={e => saveConfigField('webhookApps', e.target.value, 'NOVA_STAFF_APP_WEBHOOK')} />
                   <input placeholder="Webhook Bienvenida" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.webhookWelcome} onChange={e => saveConfigField('webhookWelcome', e.target.value, 'NOVA_STAFF_WELCOME_WEBHOOK')} />
                   <div className="grid grid-cols-1 gap-4">
                      <input placeholder="Discord Client ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.clientId} onChange={e => saveConfigField('clientId', e.target.value, 'DISCORD_CLIENT_ID')} />
                      <input placeholder="Discord Bot Token" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.botToken} onChange={e => saveConfigField('botToken', e.target.value, 'DISCORD_BOT_TOKEN')} />
                      <input placeholder="Discord Guild ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.guildId} onChange={e => saveConfigField('guildId', e.target.value, 'DISCORD_GUILD_ID')} />
                   </div>
                </div>
             </div>
             <div className="glass-panel p-10 rounded-[3rem] border border-white/10 space-y-6">
                <h3 className="text-white text-lg font-shaiya uppercase border-b border-white/10 pb-4">Supabase y Roles</h3>
                <div className="space-y-4">
                   <input placeholder="Supabase Project URL" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseUrl} onChange={e => { setConfig({...config, supabaseUrl: e.target.value}); localStorage.setItem('nova_setting_SUPABASE_URL', e.target.value); }} />
                   <input placeholder="Supabase Anon Key" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseKey} onChange={e => { setConfig({...config, supabaseKey: e.target.value}); localStorage.setItem('nova_setting_SUPABASE_ANON_KEY', e.target.value); }} />
                   <div className="grid grid-cols-1 gap-4">
                      <input placeholder="ID Rol GS" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.roleGs} onChange={e => saveConfigField('roleGs', e.target.value, 'ROLE_ID_GS')} />
                      <div className="grid grid-cols-2 gap-4">
                         <input placeholder="ID Rol LGS" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.roleLgs} onChange={e => saveConfigField('roleLgs', e.target.value, 'ROLE_ID_LGS')} />
                         <input placeholder="ID Rol GM" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.roleGm} onChange={e => saveConfigField('roleGm', e.target.value, 'ROLE_ID_GM')} />
                      </div>
                   </div>
                </div>
             </div>
          </div>
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
                    {newDrop.category === 'Mapa' && (
                      <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none cursor-pointer" value={newDrop.faction} onChange={e => setNewDrop({...newDrop, faction: e.target.value as any})}>
                        <option value={Faction.LIGHT}>Fación: Luz</option>
                        <option value={Faction.FURY}>Fación: Furia</option>
                        <option value={Faction.NEUTRAL}>Fación: Ambas (Neutral)</option>
                      </select>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <input placeholder="Imagen URL del Mapa" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                    <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-2xl font-black uppercase text-[10px] hover:bg-white transition-all shadow-lg">Subir</button>
                    <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'drop')} />
                  </div>
                  <textarea placeholder="Descripción táctica..." className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white h-32 resize-none outline-none focus:border-[#d4af37]" value={newDrop.description} onChange={e => setNewDrop({...newDrop, description: e.target.value})} />
                </div>
                {newDrop.image && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-end px-2">
                       <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-[4px]">Marcado de GPS</h3>
                       <p className="text-gray-500 text-[9px] uppercase font-bold italic">Haz clic en el mapa para marcar</p>
                    </div>
                    <div className="relative rounded-[2rem] overflow-hidden border border-white/10 cursor-crosshair bg-black group" onClick={handleMapClick}>
                      <img src={newDrop.image} className="w-full h-auto opacity-70 group-hover:opacity-90 transition-opacity" />
                      {newDrop.mobs?.map((mob, mIdx) => 
                        mob.points?.map((p, pIdx) => (
                          <div 
                            key={`${mIdx}-${pIdx}`} 
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-2xl transform -translate-x-1/2 -translate-y-1/2" 
                            style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: mob.mapColor }}
                          ></div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-8">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-white text-[10px] font-black uppercase tracking-[4px]">Bestiario del Mapa</h3>
                  <button onClick={addMob} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all">+ Nueva Entidad</button>
                </div>
                <div className="space-y-6 max-h-[800px] overflow-y-auto pr-3 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-6 rounded-[2.5rem] border-2 transition-all ${activeMobIdx === mIdx ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-black/60 border-white/5'}`} onClick={() => setActiveMobIdx(mIdx)}>
                       <div className="flex gap-4 items-center mb-4">
                         <div className="relative group/mobimg w-16 h-16 shrink-0 bg-black/80 rounded-xl border border-white/10 overflow-hidden cursor-pointer" onClick={(e) => { e.stopPropagation(); setUploadTarget({mobIdx: mIdx}); mobFileRef.current?.click(); }}>
                            {mob.image ? <img src={mob.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 uppercase font-black">Subir</div>}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/mobimg:opacity-100 flex items-center justify-center text-[6px] text-white font-black">CAMBIAR</div>
                         </div>
                         <div className="flex-grow space-y-2">
                            <input placeholder="Nombre de la Entidad" className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white text-sm outline-none focus:border-[#d4af37]" value={mob.name} onChange={e => {
                                const mobs = [...(newDrop.mobs || [])];
                                mobs[mIdx].name = e.target.value;
                                setNewDrop({...newDrop, mobs});
                            }} />
                            <div className="flex items-center gap-3">
                               <input placeholder="Nivel" className="w-20 bg-black/40 border border-white/5 p-2 rounded-xl text-white text-xs outline-none" value={mob.level} onChange={e => {
                                  const mobs = [...(newDrop.mobs || [])];
                                  mobs[mIdx].level = e.target.value;
                                  setNewDrop({...newDrop, mobs});
                               }} />
                               <input type="color" className="w-full h-8 bg-transparent rounded-lg cursor-pointer" value={mob.mapColor} onChange={e => {
                                  const mobs = [...(newDrop.mobs || [])];
                                  mobs[mIdx].mapColor = e.target.value;
                                  setNewDrop({...newDrop, mobs});
                               }} />
                            </div>
                         </div>
                       </div>
                       <div className="space-y-3 pt-4 border-t border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Objetos de Botín</span>
                            <button onClick={(e) => { e.stopPropagation(); addDropToMob(mIdx); }} className="text-green-500 text-[9px] font-black uppercase hover:underline">+ Añadir Item Drop</button>
                          </div>
                          <div className="space-y-2">
                            {mob.drops.map((drop, dIdx) => (
                              <div key={dIdx} className="bg-black/60 p-3 rounded-2xl border border-white/5 flex items-center gap-3 group/dropentry">
                                <div className="w-10 h-10 bg-black/80 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer relative group/dropimg" onClick={(e) => { e.stopPropagation(); setUploadTarget({mobIdx: mIdx, dropIdx: dIdx}); dropItemFileRef.current?.click(); }}>
                                  {drop.itemImage ? <img src={drop.itemImage} className="w-full h-full object-contain" /> : <span className="text-[6px] text-gray-700">FOTO</span>}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/dropimg:opacity-100 flex items-center justify-center text-[6px] text-white">SUBIR</div>
                                </div>
                                <input placeholder="Nombre Item" className="flex-grow bg-transparent border-none text-white text-xs outline-none font-bold" value={drop.itemName} onChange={e => {
                                   const mobs = [...(newDrop.mobs || [])];
                                   mobs[mIdx].drops[dIdx].itemName = e.target.value;
                                   setNewDrop({...newDrop, mobs});
                                }} />
                                <input placeholder="%" className="w-16 bg-black/40 border border-white/5 rounded-lg p-2 text-[#d4af37] text-[10px] text-center" value={drop.rate} onChange={e => {
                                   const mobs = [...(newDrop.mobs || [])];
                                   mobs[mIdx].drops[dIdx].rate = e.target.value;
                                   setNewDrop({...newDrop, mobs});
                                }} />
                                <button onClick={(e) => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.splice(dIdx, 1); setNewDrop({...newDrop, mobs: ms}); }} className="text-red-500/30 hover:text-red-500 text-[10px]">✕</button>
                              </div>
                            ))}
                          </div>
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar mob?')) { const ms = [...(newDrop.mobs || [])]; ms.splice(mIdx, 1); setNewDrop({...newDrop, mobs: ms}); } }} className="w-full mt-4 text-red-500/50 text-[8px] font-black uppercase hover:text-red-500 transition-colors">Eliminar Entidad</button>
                    </div>
                  ))}
                  {(!newDrop.mobs || newDrop.mobs.length === 0) && <div className="text-center py-20 bg-black/40 border border-dashed border-white/10 rounded-[2rem] text-gray-700 font-shaiya text-xl uppercase italic">Territorio sin habitantes</div>}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} disabled={isSaving || isUploading} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px] hover:bg-[#d4af37] transition-all shadow-2xl disabled:opacity-50">
               {editingId ? 'Confirmar Actualización' : 'Sellar Guía de Drop'}
            </button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black uppercase text-[#d4af37]">
                  <tr><th className="p-6">Mapa / Boss</th><th className="p-6">Categoría</th><th className="p-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dropsList.map(drop => (
                    <tr key={drop.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-6"><div className="flex items-center gap-5"><img src={drop.image} className="w-12 h-12 rounded-xl object-cover border border-white/10" /><span className="font-shaiya text-white text-2xl">{drop.name}</span></div></td>
                      <td className="p-6 text-[10px] text-gray-500 uppercase font-black">{drop.category} {drop.faction && `(${drop.faction})`}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewDrop(drop); setEditingId(drop.id); window.scrollTo({top:0, behavior:'smooth'}) }} className="p-3 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-xl mr-3">✏️</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteDropListFromDB(drop.id).then(loadData) }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'items' ? (
        <div className="space-y-12 animate-fade-in">
          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 shadow-2xl relative text-center">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-widest">{editingId ? 'Reforjar Reliquia' : 'Nueva Reliquia de NOVA'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <input placeholder="Nombre" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none cursor-pointer" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-4">
                <input placeholder="URL de Imagen" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-[10px]" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                <button onClick={() => itemFileRef.current?.click()} className="bg-white/10 border border-white/20 text-white px-6 rounded-2xl text-[10px] font-black uppercase hover:bg-[#d4af37] hover:text-black">Subir</button>
                <input type="file" ref={itemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'item')} />
              </div>
              <input placeholder="Stats" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.stats} onChange={e => setNewItem({...newItem, stats: e.target.value})} />
            </div>
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full mt-10 bg-white text-black font-black py-5 rounded-[2rem] uppercase tracking-widest hover:bg-[#d4af37] transition-all">
              Manifestar en el Reino
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 min-h-[400px]">
           <h2 className="text-3xl font-shaiya text-white uppercase tracking-widest mb-10 text-center">Aspirantes al Staff</h2>
           <div className="space-y-6">
             {appsList.map(app => (
               <div key={app.id} className="bg-black/40 p-8 rounded-[2.5rem] border border-white/10 flex justify-between items-center group">
                 <div className="flex gap-6 items-center">
                   <img src={app.avatar_url} className="w-16 h-16 rounded-2xl border-2 border-[#d4af37]" />
                   <div>
                     <p className="text-white text-2xl font-shaiya">{app.username}</p>
                     <p className="text-[#d4af37] text-[10px] uppercase font-black">{app.position}</p>
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600/20 text-green-500 border border-green-500/30 px-8 py-3 rounded-2xl text-[10px] font-black uppercase">Aprobar</button>
                   <button onClick={() => updateStaffApplicationStatus(app.id, 'rejected').then(loadData)} className="bg-red-600/20 text-red-500 border border-red-500/30 px-8 py-3 rounded-2xl text-[10px] font-black uppercase">Rechazar</button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <input type="file" ref={mobFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mob')} />
      <input type="file" ref={dropItemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'dropItem')} />
      <input type="file" ref={bossPortalFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bossPortal')} />
      <input type="file" ref={mapPortalFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mapPortal')} />
    </div>
  );
};

export default AdminPanel;
