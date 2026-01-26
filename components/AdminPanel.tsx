
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
  const [importJson, setImportJson] = useState('');
  
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

  // UNIFICACIÓN DE LLAVES A MAYÚSCULAS
  const [config, setConfig] = useState({
    NOVA_WEBHOOK_URL: '',
    NOVA_STAFF_APP_WEBHOOK: '',
    DISCORD_CLIENT_ID: '',
    SITE_LOGO_URL: '',
    SITE_BG_URL: '',
    MAP_PORTAL_BG: '',
    BOSS_PORTAL_BG: '',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    API_KEY: ''
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
      NOVA_WEBHOOK_URL: await getSetting('NOVA_WEBHOOK_URL') || '',
      NOVA_STAFF_APP_WEBHOOK: await getSetting('NOVA_STAFF_APP_WEBHOOK') || '',
      DISCORD_CLIENT_ID: await getSetting('DISCORD_CLIENT_ID') || '',
      SITE_LOGO_URL: await getSetting('SITE_LOGO_URL') || '',
      SITE_BG_URL: await getSetting('SITE_BG_URL') || '',
      MAP_PORTAL_BG: await getSetting('MAP_PORTAL_BG') || '',
      BOSS_PORTAL_BG: await getSetting('BOSS_PORTAL_BG') || '',
      SUPABASE_URL: await getSetting('SUPABASE_URL') || '',
      SUPABASE_ANON_KEY: await getSetting('SUPABASE_ANON_KEY') || '',
      API_KEY: await getSetting('API_KEY') || ''
    });
  };

  useEffect(() => { loadData(); loadConfig(); }, [activeSubTab]);

  const saveConfigField = async (key: keyof typeof config, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    await saveSetting(key, value);
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
      else if (type === 'logo') { await saveConfigField('SITE_LOGO_URL', publicUrl); }
      else if (type === 'bg') { await saveConfigField('SITE_BG_URL', publicUrl); }
      else if (type === 'mapPortal') { await saveConfigField('MAP_PORTAL_BG', publicUrl); }
      else if (type === 'bossPortal') { await saveConfigField('BOSS_PORTAL_BG', publicUrl); }
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

  // Fix: Added missing handleMouseDown for map point drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMobIdx === null || !newDrop.mobs) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (drawMode === 'point') {
      const newPoint: MapPoint = { 
        x, 
        y, 
        color: newDrop.mobs[activeMobIdx].mapColor, 
        label: newDrop.mobs[activeMobIdx].name, 
        type: 'point' 
      };
      setNewDrop(prev => {
        const mobs = [...(prev.mobs || [])];
        mobs[activeMobIdx] = { ...mobs[activeMobIdx], points: [...(mobs[activeMobIdx].points || []), newPoint] };
        return { ...prev, mobs };
      });
    } else {
      setIsDrawing(true);
      setDrawingStart({ x, y });
    }
  };

  // Fix: Added missing handleMouseMove for map point drawing
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawingStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const dx = x - drawingStart.x;
    const dy = y - drawingStart.y;
    setTempRadius(Math.sqrt(dx * dx + dy * dy));
  };

  // Fix: Added missing handleMouseUp for map point drawing
  const handleMouseUp = () => {
    if (isDrawing && drawingStart && activeMobIdx !== null && newDrop.mobs) {
      const newPoint: MapPoint = { 
        x: drawingStart.x, 
        y: drawingStart.y, 
        color: newDrop.mobs[activeMobIdx].mapColor, 
        label: newDrop.mobs[activeMobIdx].name, 
        type: 'area', 
        radius: tempRadius 
      };
      setNewDrop(prev => {
        const mobs = [...(prev.mobs || [])];
        mobs[activeMobIdx] = { ...mobs[activeMobIdx], points: [...(mobs[activeMobIdx].points || []), newPoint] };
        return { ...prev, mobs };
      });
    }
    setIsDrawing(false);
    setDrawingStart(null);
    setTempRadius(0);
  };

  const generateMasterLink = () => {
    // Sincronización masiva de CONFIGURACIÓN
    const syncObj = { config: config };
    const jsonStr = JSON.stringify(syncObj);
    const safeBase64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    const url = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(safeBase64)}&v=5`;
    navigator.clipboard.writeText(url);
    alert("¡LINK MAESTRO GENERADO! Al abrirlo en otro navegador, se conectará automáticamente a tu base de datos.");
  };

  const exportAllData = () => {
    const li = localStorage.getItem('nova_local_items');
    const ld = localStorage.getItem('nova_local_drops');
    const exportObj = {
      config,
      localItems: li ? JSON.parse(li) : [],
      localDrops: ld ? JSON.parse(ld) : []
    };
    navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2));
    alert("¡COPIA DE SEGURIDAD GENERADA!");
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importJson);
      if (data.config) {
        Object.entries(data.config).forEach(([k, v]) => {
          if (v) localStorage.setItem(`nova_setting_${k}`, String(v));
        });
      }
      if (data.localItems) localStorage.setItem('nova_local_items', JSON.stringify(data.localItems));
      if (data.localDrops) localStorage.setItem('nova_local_drops', JSON.stringify(data.localDrops));
      alert("¡IMPORTACIÓN EXITOSA!");
      window.location.reload();
    } catch {
      alert("ERROR: JSON inválido.");
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Sincronización de Poder</h3>
              <button onClick={generateMasterLink} className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:brightness-110 transition-all">Generar Link Maestro (Keys)</button>
              <button onClick={exportAllData} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:brightness-110 transition-all">Exportar Base de Datos (JSON)</button>
              <div className="pt-4 border-t border-white/5 space-y-4">
                <textarea placeholder="Pegar código de importación..." className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-[10px] h-24" value={importJson} onChange={e => setImportJson(e.target.value)} />
                <button onClick={handleImport} className="w-full bg-green-600 text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-widest">Importar Manualmente</button>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Supabase Connect</h3>
              <input placeholder="Supabase URL" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.SUPABASE_URL} onChange={e => saveConfigField('SUPABASE_URL', e.target.value)} />
              <input placeholder="Supabase Key" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.SUPABASE_ANON_KEY} onChange={e => saveConfigField('SUPABASE_ANON_KEY', e.target.value)} />
              <input placeholder="Gemini API Key" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.API_KEY} onChange={e => saveConfigField('API_KEY', e.target.value)} />
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 md:col-span-2">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Webhooks & Discord</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Webhook Soporte" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.NOVA_WEBHOOK_URL} onChange={e => saveConfigField('NOVA_WEBHOOK_URL', e.target.value)} />
                <input placeholder="Webhook Postulaciones" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.NOVA_STAFF_APP_WEBHOOK} onChange={e => saveConfigField('NOVA_STAFF_APP_WEBHOOK', e.target.value)} />
                <input placeholder="Discord Client ID" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.DISCORD_CLIENT_ID} onChange={e => saveConfigField('DISCORD_CLIENT_ID', e.target.value)} />
              </div>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 md:col-span-2">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Branding Visual</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <input placeholder="URL Logo" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.SITE_LOGO_URL} onChange={e => saveConfigField('SITE_LOGO_URL', e.target.value)} />
                  <button onClick={() => logoFileRef.current?.click()} className="text-[9px] text-[#d4af37] font-black uppercase">Subir Imagen</button>
                </div>
                <div className="space-y-2">
                  <input placeholder="URL Fondo" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.SITE_BG_URL} onChange={e => saveConfigField('SITE_BG_URL', e.target.value)} />
                  <button onClick={() => bgFileRef.current?.click()} className="text-[9px] text-[#d4af37] font-black uppercase">Subir Imagen</button>
                </div>
              </div>
            </div>
        </div>
      ) : activeSubTab === 'drops' ? (
        <div className="space-y-12 animate-fade-in">
           {/* Formulario de Drops similar al anterior pero con guardado directo */}
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
                <div className="flex gap-2">
                  <button onClick={() => setDrawMode('point')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${drawMode === 'point' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-black/40 text-gray-500 border-white/5'}`}>Modo Punto</button>
                  <button onClick={() => setDrawMode('area')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${drawMode === 'area' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-black/40 text-gray-500 border-white/5'}`}>Modo Área</button>
                </div>
                {newDrop.image && (
                  <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-black cursor-crosshair group/map shadow-2xl" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                    <img src={newDrop.image} className="w-full h-auto opacity-70 pointer-events-none" />
                    {newDrop.mobs?.map((mob, mIdx) => mob.points?.map((p, pIdx) => (
                      <div key={`${mIdx}-${pIdx}`} className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${p.type === 'area' ? 'border-2 rounded-full' : 'w-3 h-3 rounded-full'}`} style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.type === 'area' ? `${p.color}33` : p.color, borderColor: p.color, width: p.type === 'area' ? `${p.radius! * 2}%` : '12px', height: p.type === 'area' ? `${p.radius! * 2}%` : '12px', aspectRatio: '1/1' }}></div>
                    )))}
                    {isDrawing && drawingStart && (
                      <div className="absolute border-2 border-white/50 rounded-full bg-white/10 pointer-events-none transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${drawingStart.x}%`, top: `${drawingStart.y}%`, width: `${tempRadius * 2}%`, height: `${tempRadius * 2}%` }}></div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <button onClick={() => { const m: MobEntry = { id: `mob-${Date.now()}`, name: 'Nueva Entidad', level: '1', image: '', mapColor: '#d4af37', drops: [], points: [] }; setNewDrop(p => ({ ...p, mobs: [...(p.mobs || []), m] })); }} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase shadow-lg hover:brightness-110 transition-all">+ Nueva Entidad</button>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeMobIdx === mIdx ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/5 bg-black/40'}`} onClick={() => setActiveMobIdx(mIdx)}>
                       <div className="flex justify-between items-center mb-3">
                          <input className="bg-transparent text-white font-shaiya text-lg outline-none" value={mob.name} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].name = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                          <button onClick={() => { const ms = [...(newDrop.mobs || [])]; ms.splice(mIdx, 1); setNewDrop({...newDrop, mobs: ms}); }} className="text-red-500">🗑️</button>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} className="w-full mt-12 bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-[10px] shadow-2xl hover:brightness-125 transition-all">Confirmar Registro</button>
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
              <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={newItem.rarity} onChange={e => setNewItem({...newItem, rarity: e.target.value as any})}>
                {['Common', 'Noble', 'Atroz', 'Legendary', 'Diosa', 'Special', 'Unique'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-4 mb-8">
               <input placeholder="URL Imagen" className="flex-grow bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none text-xs" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
               <button onClick={() => itemFileRef.current?.click()} className="bg-[#d4af37] text-black px-10 rounded-2xl font-black uppercase text-xs">SUBIR</button>
            </div>
            <button onClick={handleAddItem} disabled={isSaving || isUploading} className="w-full bg-white text-black font-black py-6 rounded-[2.5rem] uppercase tracking-[8px] shadow-2xl hover:brightness-125 transition-all">Guardar Reliquia</button>
          </div>
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 mt-10 shadow-2xl">
             <table className="w-full text-left">
                <tbody className="divide-y divide-white/5">
                  {itemsList.map(item => (
                    <tr key={item.id} className="text-white hover:bg-white/5 transition-colors">
                      <td className="p-6 flex items-center gap-6">
                          <img src={item.image} className="w-14 h-14 rounded-xl object-contain bg-black border border-white/5" />
                          <span className="font-shaiya text-2xl">{item.name}</span>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-[#d4af37] mr-6 font-black uppercase text-[10px] tracking-widest hover:underline">✏️ Editar</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteItemFromDB(item.id).then(loadData); }} className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:underline">🗑️ Borrar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : activeSubTab === 'apps' ? (
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 animate-fade-in shadow-2xl">
           <h2 className="text-4xl font-shaiya text-white uppercase mb-8 text-center tracking-[10px]">Postulaciones Staff</h2>
           <div className="space-y-6">
             {appsList.map(app => (
               <div key={app.id} className="bg-black/60 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-6">
                    <div className="flex items-center gap-6">
                      <img src={app.avatar_url} className="w-20 h-20 rounded-2xl border-2 border-[#d4af37]" />
                      <div className="text-left">
                         <p className="text-white font-shaiya text-4xl">{app.username}</p>
                         <p className="text-[#d4af37] text-xs font-black uppercase tracking-[4px]">{app.position} • {app.status}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)} className="bg-white/5 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10">EXPEDIENTE</button>
                       <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-125">ACEPTAR</button>
                       <button onClick={() => deleteStaffApplicationFromDB(app.id).then(loadData)} className="bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-125">BORRAR</button>
                    </div>
                 </div>
                 {expandedAppId === app.id && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] text-gray-300 bg-black/40 p-10 rounded-[2rem] animate-fade-in border border-white/5 leading-relaxed">
                       <p><b className="text-[#d4af37] uppercase tracking-widest block mb-1">Experiencia:</b> {app.answers.experience}</p>
                       <p><b className="text-[#d4af37] uppercase tracking-widest block mb-1">Motivación:</b> {app.answers.motivation}</p>
                       <p><b className="text-[#d4af37] uppercase tracking-widest block mb-1">Conflictos:</b> {app.answers.conflict}</p>
                       <p><b className="text-[#d4af37] uppercase tracking-widest block mb-1">Disponibilidad:</b> {app.answers.availability}</p>
                       <p className="md:col-span-2"><b className="text-[#d4af37] uppercase tracking-widest block mb-1">Aporte Único:</b> {app.answers.contribution}</p>
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
