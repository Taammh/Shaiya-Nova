
import React, { useState, useEffect, useRef } from 'react';
// Added GameItem to the imports below to fix "Cannot find name 'GameItem'" errors
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
    
    // Nueva Estructura Segura (Sin compresión binaria para evitar caracteres raros en GitHub)
    const syncObj = {
      config: config,
      localItems: li ? JSON.parse(li) : [],
      localDrops: ld ? JSON.parse(ld) : []
    };
    
    const jsonStr = JSON.stringify(syncObj);
    // Codificación Base64 segura para UTF-8
    const safeBase64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(safeBase64)}&v=4`;
    
    navigator.clipboard.writeText(url);
    alert("¡LINK MAESTRO GENERADO! Compatible con GitHub y acortadores.");
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
            </div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Infraestructura</h3>
              <input placeholder="Supabase URL" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseUrl} onChange={e => saveConfigField('supabaseUrl', e.target.value, 'SUPABASE_URL')} />
              <input placeholder="Supabase Key" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.supabaseKey} onChange={e => saveConfigField('supabaseKey', e.target.value, 'SUPABASE_ANON_KEY')} />
              <input placeholder="Discord ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.clientId} onChange={e => saveConfigField('clientId', e.target.value, 'DISCORD_CLIENT_ID')} />
            </div>
          </div>
          <button onClick={generateMasterLink} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black py-6 rounded-[2rem] uppercase tracking-[5px] shadow-2xl">Generar Link Maestro Definitivo</button>
        </div>
      ) : activeSubTab === 'drops' ? (
        <div className="space-y-12 animate-fade-in">
           <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/30 shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-10 text-center uppercase tracking-widest">Reliquias del Mundo</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <input placeholder="Nombre Mapa" className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newDrop.name} onChange={e => setNewDrop({...newDrop, name: e.target.value})} />
                <div className="flex gap-4">
                  <input placeholder="URL Imagen Mapa" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                  <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-2xl font-black uppercase text-[10px]">UP</button>
                  <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'drop')} />
                </div>
              </div>
              <div className="space-y-6">
                <button onClick={() => { const m: MobEntry = { id: `mob-${Date.now()}`, name: 'Nueva Entidad', level: '1', image: '', mapColor: '#d4af37', drops: [], points: [] }; setNewDrop(p => ({ ...p, mobs: [...(p.mobs || []), m] })); }} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase">+ Entidad</button>
              </div>
            </div>
            <button onClick={handleAddDrop} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px]">Confirmar Registro</button>
          </div>
        </div>
      ) : activeSubTab === 'items' ? (
        <div className="space-y-10 animate-fade-in">
          <div className="glass-panel p-10 rounded-[3rem] border border-[#d4af37]/20 text-center shadow-2xl">
            <h2 className="text-3xl font-shaiya text-[#d4af37] mb-8 uppercase tracking-widest">Crear Nueva Reliquia</h2>
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
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full bg-white text-black font-black py-6 rounded-[2.5rem] uppercase tracking-[8px]">Guardar Reliquia</button>
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
