
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

  const [activeMobIdx, setActiveMobIdx] = useState<number | null>(null);
  const [drawMode, setDrawMode] = useState<'point' | 'area'>('point');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{x: number, y: number} | null>(null);
  const [tempRadius, setTempRadius] = useState<number>(0);
  const [uploadTarget, setUploadTarget] = useState<{ mobIdx: number, dropIdx?: number } | null>(null);

  const initialItem: Partial<GameItem> = {
    name: '', category: Category.MOUNT, image: '', description: '', 
    faction: Faction.LIGHT, item_class: 'Luchador/Defensor', gender: Gender.BOTH, price: '', stats: '', rarity: 'Common'
  };

  const initialDrop: Partial<DropMap> = {
    name: '', category: 'Mapa', faction: Faction.LIGHT, image: '', description: '', mobs: []
  };

  const [newItem, setNewItem] = useState<Partial<GameItem>>(initialItem);
  const [newDrop, setNewDrop] = useState<Partial<DropMap>>(initialDrop);

  const [config, setConfig] = useState({
    SUPABASE_URL: '', SUPABASE_ANON_KEY: '', API_KEY: '',
    SITE_LOGO_URL: '', SITE_BG_URL: '',
    NOVA_WEBHOOK_URL: '', NOVA_STAFF_APP_WEBHOOK: '', NOVA_PROMO_WEBHOOK: '',
    ROLE_ID_GS: '', ROLE_ID_GM: '', ROLE_ID_ADMIN: '',
    DISCORD_CLIENT_ID: '',
    DISCORD_GUILD_ID: ''
  });

  const loadData = async () => {
    setIsSaving(true);
    try {
      setItemsList(await getItemsFromDB() || []);
      setDropsList(await getDropListsFromDB() || []);
      setAppsList(await getStaffApplications() || []);
    } finally { setIsSaving(false); }
  };

  const loadConfig = async () => {
    setConfig({
      SUPABASE_URL: await getSetting('SUPABASE_URL') || '',
      SUPABASE_ANON_KEY: await getSetting('SUPABASE_ANON_KEY') || '',
      API_KEY: await getSetting('API_KEY') || '',
      SITE_LOGO_URL: await getSetting('SITE_LOGO_URL') || '',
      SITE_BG_URL: await getSetting('SITE_BG_URL') || '',
      NOVA_WEBHOOK_URL: await getSetting('NOVA_WEBHOOK_URL') || '',
      NOVA_STAFF_APP_WEBHOOK: await getSetting('NOVA_STAFF_APP_WEBHOOK') || '',
      NOVA_PROMO_WEBHOOK: await getSetting('NOVA_PROMO_WEBHOOK') || '',
      ROLE_ID_GS: await getSetting('ROLE_ID_GS') || '',
      ROLE_ID_GM: await getSetting('ROLE_ID_GM') || '',
      ROLE_ID_ADMIN: await getSetting('ROLE_ID_ADMIN') || '',
      DISCORD_CLIENT_ID: await getSetting('DISCORD_CLIENT_ID') || '',
      DISCORD_GUILD_ID: await getSetting('DISCORD_GUILD_ID') || ''
    });
  };

  useEffect(() => { loadData(); loadConfig(); }, [activeSubTab]);

  const generateMasterLink = () => {
    const syncObj = { config, items: itemsList, drops: dropsList };
    const jsonStr = JSON.stringify(syncObj);
    const safeBase64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    
    // CORRECCIÓN: Se fuerza el uso del dominio principal shaiya-nova.vercel.app
    const url = `https://shaiya-nova.vercel.app/?sync=${encodeURIComponent(safeBase64)}`;
    
    navigator.clipboard.writeText(url);
    alert("¡LINK MAESTRO GENERADO! Se han incluido todos los ajustes, roles, webhooks e historial.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadFile(file, 'assets');
      if (type === 'item') setNewItem(prev => ({ ...prev, image: url }));
      else if (type === 'map') setNewDrop(prev => ({ ...prev, image: url }));
      else if (type === 'logo') { setConfig(p => ({ ...p, SITE_LOGO_URL: url })); await saveSetting('SITE_LOGO_URL', url); }
      else if (type === 'bg') { setConfig(p => ({ ...p, SITE_BG_URL: url })); await saveSetting('SITE_BG_URL', url); }
      else if (type === 'mob' && uploadTarget) {
        setNewDrop(prev => {
          const mobs = [...(prev.mobs || [])];
          mobs[uploadTarget.mobIdx] = { ...mobs[uploadTarget.mobIdx], image: url };
          return { ...prev, mobs };
        });
      }
      else if (type === 'drop' && uploadTarget && uploadTarget.dropIdx !== undefined) {
        setNewDrop(prev => {
          const mobs = [...(prev.mobs || [])];
          const drops = [...mobs[uploadTarget.mobIdx].drops];
          drops[uploadTarget.dropIdx!] = { ...drops[uploadTarget.dropIdx!], itemImage: url };
          mobs[uploadTarget.mobIdx] = { ...mobs[uploadTarget.mobIdx], drops };
          return { ...prev, mobs };
        });
      }
      alert("Imagen vinculada.");
    } catch (err: any) { alert(err.message); }
    finally { setIsUploading(false); }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMobIdx === null || !newDrop.mobs) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (drawMode === 'point') {
      const newPoint: MapPoint = { x, y, color: newDrop.mobs[activeMobIdx].mapColor, label: newDrop.mobs[activeMobIdx].name, type: 'point' };
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawingStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const dx = x - drawingStart.x;
    const dy = y - drawingStart.y;
    setTempRadius(Math.sqrt(dx * dx + dy * dy));
  };

  const handleMouseUp = () => {
    if (isDrawing && drawingStart && activeMobIdx !== null && newDrop.mobs) {
      const newPoint: MapPoint = { x: drawingStart.x, y: drawingStart.y, color: newDrop.mobs[activeMobIdx].mapColor, label: newDrop.mobs[activeMobIdx].name, type: 'area', radius: tempRadius };
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

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.image) return alert("Faltan datos.");
    setIsSaving(true);
    try {
      if (editingId) await updateItemInDB({ ...newItem, id: editingId } as GameItem);
      else await addItemToDB(newItem);
      setNewItem(initialItem); setEditingId(null); loadData();
    } finally { setIsSaving(false); }
  };

  const handleAddDrop = async () => {
    if (!newDrop.name || !newDrop.image) return alert("Faltan datos.");
    setIsSaving(true);
    try {
      if (editingId) await updateDropListInDB({ ...newDrop, id: editingId } as DropMap);
      else await addDropListToDB(newDrop);
      setNewDrop(initialDrop); setEditingId(null); setActiveMobIdx(null); loadData();
    } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4">
      <div className="flex flex-wrap gap-3 justify-center mb-10">
        {['items', 'drops', 'apps', 'settings'].map(t => (
          <button key={t} onClick={() => { setActiveSubTab(t as any); setEditingId(null); }} className={`px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSubTab === t ? 'bg-[#d4af37] text-black shadow-lg' : 'bg-black/60 text-gray-500 border border-white/5'}`}>
            {t === 'items' ? 'Contenido' : t === 'drops' ? 'Drop List' : t === 'apps' ? 'Staff' : 'Ajustes'}
          </button>
        ))}
      </div>

      {activeSubTab === 'items' && (
        <div className="space-y-10 animate-fade-in">
          <div className="glass-panel p-8 rounded-[2.5rem] border-[#d4af37]/20 shadow-2xl">
            <h2 className="text-2xl font-shaiya text-[#d4af37] mb-8 text-center uppercase">
               {newItem.category === Category.PROMOTION ? '📢 Paquete de Donación' : (editingId ? 'Reforjar Reliquia' : 'Nueva Reliquia')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <input placeholder={newItem.category === Category.PROMOTION ? "Nombre Paquete" : "Nombre"} className="bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                {Object.values(Category).map(c => <option key={c} value={c}>{c === Category.PROMOTION ? 'PAQUETE DONACIÓN' : c}</option>)}
              </select>
              {newItem.category === Category.PROMOTION ? (
                <input placeholder="Valor Donación" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              ) : (
                <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newItem.rarity} onChange={e => setNewItem({...newItem, rarity: e.target.value as any})}>
                  {['Common', 'Noble', 'Atroz', 'Legendary', 'Diosa', 'Special', 'Unique'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <input placeholder="URL Imagen" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                <button onClick={() => itemFileRef.current?.click()} className="bg-[#d4af37] text-black px-4 rounded-xl font-black text-[10px]">UP</button>
              </div>
            </div>
            <textarea placeholder={newItem.category === Category.PROMOTION ? "Contenido del paquete..." : "Descripción / Stats"} className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white mb-6 h-20" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            <button onClick={handleAddItem} disabled={isSaving} className="w-full bg-[#d4af37] text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:brightness-110">
              {isSaving ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </div>
          <div className="glass-panel p-6 rounded-[2rem] border-white/5">
            <h3 className="text-[#d4af37] font-shaiya text-xl mb-6 uppercase">Historial de Contenido</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-gray-500 uppercase font-black border-b border-white/5">
                  <tr><th className="p-4">Item</th><th className="p-4">Categoría</th><th className="p-4">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemsList.map(item => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 flex items-center gap-4"><img src={item.image} className="w-10 h-10 rounded-lg bg-black object-contain" /> <span className="text-white font-bold">{item.name}</span></td>
                      <td className="p-4 text-gray-400">{item.category}</td>
                      <td className="p-4">
                        <button onClick={() => { setNewItem(item); setEditingId(item.id); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-[#d4af37] font-black mr-4">EDITAR</button>
                        <button onClick={() => { if(confirm('¿Eliminar?')) deleteItemFromDB(item.id).then(loadData); }} className="text-red-500 font-black">BORRAR</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'drops' && (
        <div className="space-y-10 animate-fade-in">
          <div className="glass-panel p-8 rounded-[2.5rem] border-[#d4af37]/20 shadow-2xl">
            <h2 className="text-2xl font-shaiya text-[#d4af37] mb-8 text-center uppercase">Configuración de Drop List</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Nombre Mapa" className="bg-black/60 border border-white/10 p-4 rounded-xl text-white outline-none" value={newDrop.name} onChange={e => setNewDrop({...newDrop, name: e.target.value})} />
                  <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white" value={newDrop.category} onChange={e => setNewDrop({...newDrop, category: e.target.value as any})}>
                    <option value="Mapa">Categoría: Mapa</option><option value="Boss">Categoría: Boss</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input placeholder="Imagen Fondo" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={newDrop.image} onChange={e => setNewDrop({...newDrop, image: e.target.value})} />
                  <button onClick={() => dropFileRef.current?.click()} className="bg-[#d4af37] text-black px-6 rounded-xl font-black text-[10px]">SUBIR MAPA</button>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setDrawMode('point')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${drawMode === 'point' ? 'bg-[#d4af37] text-black' : 'bg-black/40 text-gray-500'}`}>Punto</button>
                   <button onClick={() => setDrawMode('area')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${drawMode === 'area' ? 'bg-[#d4af37] text-black' : 'bg-black/40 text-gray-500'}`}>Área</button>
                </div>
                {newDrop.image && (
                  <div className="relative rounded-[2rem] overflow-hidden border bg-black cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                    <img src={newDrop.image} className="w-full h-auto opacity-70 pointer-events-none" />
                    {newDrop.mobs?.map((mob, mIdx) => mob.points?.map((p, pIdx) => (
                      <div key={`${mIdx}-${pIdx}`} className="absolute transform -translate-x-1/2 -translate-y-1/2 border rounded-full" style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.type === 'area' ? `${p.color}44` : p.color, borderColor: p.color, width: p.type === 'area' ? `${p.radius! * 2}%` : '12px', height: p.type === 'area' ? `${p.radius! * 2}%` : '12px', aspectRatio: '1/1' }}></div>
                    )))}
                    {isDrawing && drawingStart && <div className="absolute border-2 border-white/50 rounded-full bg-white/20 transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${drawingStart.x}%`, top: `${drawingStart.y}%`, width: `${tempRadius * 2}%`, height: `${tempRadius * 2}%` }}></div>}
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center"><h3 className="text-white font-shaiya text-lg uppercase">Entidades</h3><button onClick={() => { const m: MobEntry = { id: `mob-${Date.now()}`, name: 'Nueva Entidad', level: '1', image: '', mapColor: '#d4af37', drops: [], points: [] }; setNewDrop(p => ({ ...p, mobs: [...(p.mobs || []), m] })); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">+ AGREGAR ENTIDAD</button></div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scroll">
                  {newDrop.mobs?.map((mob, mIdx) => (
                    <div key={mob.id} className={`p-5 rounded-3xl border transition-all ${activeMobIdx === mIdx ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/5 bg-black/40'}`} onClick={() => setActiveMobIdx(mIdx)}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative group shrink-0">
                          <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-14 h-14 rounded-2xl border-2 border-[#d4af37]/30 bg-black" />
                          <button onClick={(e) => { e.stopPropagation(); setUploadTarget({ mobIdx: mIdx }); mobFileRef.current?.click(); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[7px] font-black text-white rounded-2xl">UP</button>
                        </div>
                        <div className="flex-grow">
                           <input placeholder="Nombre" className="bg-transparent border-b border-white/10 text-white text-sm w-full font-bold outline-none" value={mob.name} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].name = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                           <div className="flex items-center gap-2 mt-2">
                             <input placeholder="Nvl" className="w-10 bg-transparent border-b border-white/10 text-gray-400 text-xs text-center outline-none" value={mob.level} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].level = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                             <input type="color" className="w-5 h-5 rounded-full cursor-pointer" value={mob.mapColor} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].mapColor = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                           </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; ms.splice(mIdx, 1); setNewDrop({...newDrop, mobs: ms}); }} className="text-red-900 opacity-40 hover:opacity-100">🗑️</button>
                      </div>
                      {activeMobIdx === mIdx && (
                        <div className="space-y-3 pt-3 border-t border-white/5">
                          {mob.drops?.map((drop, dIdx) => (
                            <div key={dIdx} className="bg-black/60 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                               <div className="relative group shrink-0">
                                 <img src={drop.itemImage || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-8 h-8 rounded-lg bg-black" />
                                 <button onClick={(e) => { e.stopPropagation(); setUploadTarget({ mobIdx: mIdx, dropIdx: dIdx }); dropItemFileRef.current?.click(); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[6px] font-black text-white">UP</button>
                               </div>
                               <input placeholder="Item" className="flex-grow bg-transparent text-white text-[9px] outline-none" value={drop.itemName} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].itemName = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                               <select className="bg-black/40 text-[#d4af37] text-[8px] font-black rounded border border-white/5 px-1 outline-none" value={drop.rarity} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].rarity = e.target.value as ItemRarity; setNewDrop({...newDrop, mobs: ms}); }}>
                                 {['Common', 'Noble', 'Atroz', 'Legendary', 'Diosa', 'Special', 'Unique'].map(r => <option key={r} value={r}>{r}</option>)}
                               </select>
                               <input placeholder="%" className="w-10 bg-transparent text-blue-400 text-[9px] outline-none text-center" value={drop.rate} onClick={e => e.stopPropagation()} onChange={e => { const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops[dIdx].rate = e.target.value; setNewDrop({...newDrop, mobs: ms}); }} />
                               <button onClick={(e) => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; ms[mIdx].drops.splice(dIdx, 1); setNewDrop({...newDrop, mobs: ms}); }} className="text-red-800 text-xs">×</button>
                            </div>
                          ))}
                          <button onClick={(e) => { e.stopPropagation(); const ms = [...(newDrop.mobs || [])]; const d: DropEntry = { itemName: 'Item', itemImage: '', rate: '10%', rarity: 'Common' }; ms[mIdx].drops = [...(ms[mIdx].drops || []), d]; setNewDrop({...newDrop, mobs: ms}); }} className="w-full bg-white/5 py-2 rounded-xl text-[8px] font-black uppercase border border-white/5">+ NUEVO DROP</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDrop} disabled={isSaving} className="w-full mt-10 bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest">{isSaving ? 'Registrando...' : 'Confirmar Registro Total'}</button>
          </div>
          <div className="glass-panel p-6 rounded-[2rem] border-white/5">
            <h3 className="text-[#d4af37] font-shaiya text-xl mb-6 uppercase">Historial de Drop Lists</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dropsList.map(drop => (
                <div key={drop.id} className="bg-black/60 border border-white/5 rounded-[1.5rem] overflow-hidden">
                  <img src={drop.image} className="w-full h-32 object-cover opacity-60 hover:opacity-100 transition-opacity" />
                  <div className="p-4 flex justify-between items-center">
                    <div><h4 className="text-white font-shaiya text-lg">{drop.name}</h4><p className="text-[8px] text-gray-500 uppercase">{drop.category}</p></div>
                    <div className="flex gap-2">
                       <button onClick={() => { setNewDrop(drop); setEditingId(drop.id); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-[#d4af37] font-black text-[10px]">EDITAR</button>
                       <button onClick={() => { if(confirm('¿Eliminar?')) deleteDropListFromDB(drop.id).then(loadData); }} className="text-red-500 font-black text-[10px]">BORRAR</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'apps' && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-3xl font-shaiya text-white uppercase text-center tracking-[8px] mb-10">Postulaciones del Reino</h2>
          {appsList.length === 0 ? (
            <p className="text-center text-gray-500 uppercase text-xs">No hay postulaciones registradas.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {appsList.map(app => (
                <div key={app.id} className="glass-panel p-6 rounded-[2rem] border-white/5 shadow-xl transition-all">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 text-left">
                      <img src={app.avatar_url} className="w-16 h-16 rounded-xl border-2 border-[#d4af37] shadow-lg" />
                      <div>
                        <h4 className="text-white font-shaiya text-2xl">{app.username}</h4>
                        <p className="text-[#d4af37] text-[9px] font-black uppercase tracking-widest">{app.position} • {app.status}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${expandedAppId === app.id ? 'bg-[#d4af37] text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}>EXPEDIENTE</button>
                      <button onClick={() => updateStaffApplicationStatus(app.id, 'accepted').then(loadData)} className="bg-green-600/20 text-green-400 border border-green-600/40 px-6 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-green-600 hover:text-white">ACEPTAR</button>
                      <button onClick={() => { if(confirm('¿Borrar expediente?')) deleteStaffApplicationFromDB(app.id).then(loadData); }} className="bg-red-600/20 text-red-400 border border-red-600/40 px-6 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white">BORRAR</button>
                    </div>
                  </div>
                  {expandedAppId === app.id && (
                    <div className="mt-8 p-6 bg-black/40 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-[11px] leading-relaxed">
                       <p className="text-gray-300"><span className="text-[#d4af37] block font-black mb-1 uppercase tracking-widest text-[9px]">Experiencia</span> {app.answers.experience}</p>
                       <p className="text-gray-300"><span className="text-[#d4af37] block font-black mb-1 uppercase tracking-widest text-[9px]">Motivación</span> {app.answers.motivation}</p>
                       <p className="text-gray-300"><span className="text-[#d4af37] block font-black mb-1 uppercase tracking-widest text-[9px]">Conflictos</span> {app.answers.conflict}</p>
                       <p className="text-gray-300"><span className="text-[#d4af37] block font-black mb-1 uppercase tracking-widest text-[9px]">Disponibilidad</span> {app.answers.availability}</p>
                       <p className="text-gray-300 md:col-span-2"><span className="text-[#d4af37] block font-black mb-1 uppercase tracking-widest text-[9px]">Aporte Único</span> {app.answers.contribution}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="space-y-10 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Sincronización de Reino</h3>
              <button onClick={generateMasterLink} className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg">Generar Link Maestro Completo</button>
            </div>
            <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-4">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Conexión Supabase</h3>
              <input placeholder="URL" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.SUPABASE_URL} onChange={e => { setConfig({...config, SUPABASE_URL: e.target.value}); saveSetting('SUPABASE_URL', e.target.value); }} />
              <input placeholder="Key" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.SUPABASE_ANON_KEY} onChange={e => { setConfig({...config, SUPABASE_ANON_KEY: e.target.value}); saveSetting('SUPABASE_ANON_KEY', e.target.value); }} />
            </div>
            <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Webhooks Discord</h3>
              <div className="space-y-4">
                <input placeholder="Soporte" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.NOVA_WEBHOOK_URL} onChange={e => { setConfig({...config, NOVA_WEBHOOK_URL: e.target.value}); saveSetting('NOVA_WEBHOOK_URL', e.target.value); }} />
                <input placeholder="Staff" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.NOVA_STAFF_APP_WEBHOOK} onChange={e => { setConfig({...config, NOVA_STAFF_APP_WEBHOOK: e.target.value}); saveSetting('NOVA_STAFF_APP_WEBHOOK', e.target.value); }} />
                <input placeholder="Promociones" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.NOVA_PROMO_WEBHOOK} onChange={e => { setConfig({...config, NOVA_PROMO_WEBHOOK: e.target.value}); saveSetting('NOVA_PROMO_WEBHOOK', e.target.value); }} />
              </div>
            </div>
            <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-6">
              <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">IDs de Discord</h3>
              <div className="space-y-4">
                <input placeholder="ID del Servidor (Guild ID)" className="w-full bg-black/60 border border-[#d4af37]/30 p-3 rounded-xl text-white text-[10px]" value={config.DISCORD_GUILD_ID} onChange={e => { setConfig({...config, DISCORD_GUILD_ID: e.target.value}); saveSetting('DISCORD_GUILD_ID', e.target.value); }} />
                <input placeholder="Role ID GS" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.ROLE_ID_GS} onChange={e => { setConfig({...config, ROLE_ID_GS: e.target.value}); saveSetting('ROLE_ID_GS', e.target.value); }} />
                <input placeholder="Role ID GM" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.ROLE_ID_GM} onChange={e => { setConfig({...config, ROLE_ID_GM: e.target.value}); saveSetting('ROLE_ID_GM', e.target.value); }} />
                <input placeholder="Role ID Admin" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-[10px]" value={config.ROLE_ID_ADMIN} onChange={e => { setConfig({...config, ROLE_ID_ADMIN: e.target.value}); saveSetting('ROLE_ID_ADMIN', e.target.value); }} />
                <input placeholder="Discord Client ID (Login)" className="w-full bg-black/40 border border-[#5865f2]/20 p-3 rounded-xl text-white text-[10px]" value={config.DISCORD_CLIENT_ID} onChange={e => { setConfig({...config, DISCORD_CLIENT_ID: e.target.value}); saveSetting('DISCORD_CLIENT_ID', e.target.value); }} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-6">
            <h3 className="text-white font-shaiya text-xl uppercase border-b border-white/5 pb-3">Identidad Visual & Branding</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest block">Logo Principal</label>
                <div className="flex gap-2">
                  <input placeholder="URL Logo" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.SITE_LOGO_URL} onChange={e => { setConfig({...config, SITE_LOGO_URL: e.target.value}); saveSetting('SITE_LOGO_URL', e.target.value); }} />
                  <button onClick={() => logoFileRef.current?.click()} className="bg-white/10 text-white px-4 rounded-xl font-black text-[10px] border border-white/5">SUBIR</button>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest block">Fondo del Reino</label>
                <div className="flex gap-2">
                  <input placeholder="URL Fondo" className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs" value={config.SITE_BG_URL} onChange={e => { setConfig({...config, SITE_BG_URL: e.target.value}); saveSetting('SITE_BG_URL', e.target.value); }} />
                  <button onClick={() => bgFileRef.current?.click()} className="bg-white/10 text-white px-4 rounded-xl font-black text-[10px] border border-white/5">SUBIR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inputs Ocultos */}
      <input type="file" ref={itemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'item')} />
      <input type="file" ref={dropFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'map')} />
      <input type="file" ref={mobFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mob')} />
      <input type="file" ref={dropItemFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'drop')} />
      <input type="file" ref={logoFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
      <input type="file" ref={bgFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
    </div>
  );
};

export default AdminPanel;
