
import React, { useState, useEffect } from 'react';
import { DropMap, MobEntry, DropEntry, Faction, ItemRarity } from '../types';
import { getDropListsFromDB, getSetting } from '../services/supabaseClient';

const DropList: React.FC = () => {
  const [drops, setDrops] = useState<DropMap[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<DropMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainView, setMainView] = useState<'selection' | 'list'>('selection');
  const [filterType, setFilterType] = useState<'Mapa' | 'Boss'>('Mapa');
  const [selectedFaction, setSelectedFaction] = useState<Faction>(Faction.LIGHT); 
  
  const [portalBgs, setPortalBgs] = useState({
    map: 'https://media.discordapp.net/attachments/1460068773175492641/1460108918108852366/img_81.jpg',
    boss: 'https://media.discordapp.net/attachments/1460068773175492641/1460108917639217152/img_80.jpg'
  });

  useEffect(() => {
    const fetchDropsAndBgs = async () => {
      const data = await getDropListsFromDB();
      setDrops(data);
      const mBg = await getSetting('MAP_PORTAL_BG');
      const bBg = await getSetting('BOSS_PORTAL_BG');
      if (mBg || bBg) {
        setPortalBgs({ map: mBg || portalBgs.map, boss: bBg || portalBgs.boss });
      }
      setIsLoading(false);
    };
    fetchDropsAndBgs();
  }, []);

  const handleModeSelection = (type: 'Mapa' | 'Boss') => {
    setFilterType(type);
    setMainView('list');
  };

  const filteredDrops = drops.filter(d => {
    if (d.category !== filterType) return false;
    return d.faction === selectedFaction || d.faction === Faction.NEUTRAL;
  });

  const getRarityBorder = (rarity: ItemRarity) => {
    const baseStyle = "border-[3px] rounded-2xl overflow-hidden shadow-2xl transition-all group-hover:scale-105";
    switch (rarity) {
      case 'Noble': return `${baseStyle} border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]`;
      case 'Atroz': return `${baseStyle} border-blue-700 shadow-[0_0_15px_rgba(29,78,216,0.4)]`;
      case 'Legendary': return `${baseStyle} border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.4)]`;
      case 'Diosa': return `${baseStyle} border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.4)]`;
      case 'Special': return `${baseStyle} border-purple-900 shadow-[0_0_15px_rgba(88,28,135,0.5)]`;
      case 'Unique': return `${baseStyle} border-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.5)]`; 
      default: return `${baseStyle} border-white/60 shadow-none`; 
    }
  };

  if (selectedEntity) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-24 px-4">
        <div className="flex justify-start">
          <button onClick={() => setSelectedEntity(null)} className="text-[#d4af37] font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:translate-x-[-5px] transition-all bg-black/40 px-6 py-3 rounded-full border border-white/5">← REGRESAR A LA SELECCIÓN</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="relative rounded-[1.5rem] overflow-hidden border-2 border-[#d4af37]/30 shadow-[0_0_40px_rgba(0,0,0,0.6)] bg-black/40 max-w-[320px] mx-auto lg:mx-0">
              <img src={selectedEntity.image} className="w-full h-auto block opacity-100 brightness-110" />
              {selectedEntity.mobs.map((mob) => mob.points?.map((point, pIdx) => (
                <div key={`${mob.id}-${pIdx}`} className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-help group/point z-20 ${point.type === 'area' ? 'border-2 rounded-full' : 'w-2.5 h-2.5 rounded-full border border-white animate-pulse'}`}
                     style={{ left: `${point.x}%`, top: `${point.y}%`, backgroundColor: point.type === 'area' ? `${point.color}33` : point.color, borderColor: point.type === 'area' ? point.color : 'white', width: point.type === 'area' ? `${point.radius! * 2}%` : '10px', height: point.type === 'area' ? `${point.radius! * 2}%` : '10px', aspectRatio: '1/1' }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/95 text-white text-[7px] font-black uppercase rounded border border-[#d4af37]/50 pointer-events-none opacity-0 group-hover/point:opacity-100 transition-opacity whitespace-nowrap">{mob.name}</div>
                </div>
              )))}
            </div>
            <div className="glass-panel p-5 rounded-[1.5rem] border border-white/5 max-w-[320px] mx-auto lg:mx-0">
               <h2 className="text-xl font-shaiya text-[#d4af37] tracking-tight">{selectedEntity.name}</h2>
               <p className="text-gray-400 text-[10px] italic leading-relaxed opacity-70 mt-2">{selectedEntity.description}</p>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-[#d4af37] font-black uppercase text-[10px] tracking-[4px] px-3 border-l-2 border-[#d4af37] mb-2">REGISTRO DE ENTIDADES</h3>
            {selectedEntity.mobs.map((mob) => (
              <div key={mob.id} className="bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3 hover:border-[#d4af37]/40 transition-all group mb-2 shadow-lg">
                <div className="relative shrink-0">
                   <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-12 h-12 rounded-xl object-cover border-2 shadow-inner" style={{ borderColor: mob.mapColor }} />
                </div>
                <div><h4 className="text-white font-shaiya text-base leading-none mb-1">{mob.name}</h4><p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">NIVEL {mob.level}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
          {selectedEntity.mobs.map(mob => (
            <div key={mob.id} className="glass-panel rounded-[2rem] overflow-hidden border border-white/5 shadow-lg group hover:border-[#d4af37]/40 transition-colors">
              <div className="p-5 flex gap-4 items-center border-b border-white/5 bg-white/5">
                <img src={mob.image} className="w-16 h-16 rounded-xl border-2 shadow-lg" style={{ borderColor: mob.mapColor }} />
                <div><h3 className="text-xl font-shaiya text-white">{mob.name}</h3><p className="text-[#d4af37] text-[8px] font-black uppercase">NIVEL {mob.level}</p></div>
              </div>
              <div className="p-4 space-y-2">
                 {mob.drops.map((drop, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-3 bg-black/60 p-2 rounded-xl border border-white/5">
                       <div className={`w-10 h-10 shrink-0 ${getRarityBorder(drop.rarity)}`}><img src={drop.itemImage} className="w-full h-full object-contain" /></div>
                       <div className="flex-grow"><p className="text-white text-[10px] font-bold truncate">{drop.itemName}</p><p className="text-gray-500 text-[6px] uppercase">{drop.rarity}</p></div>
                       <div className="text-[#d4af37] font-black text-[9px] px-2">{drop.rate}</div>
                    </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mainView === 'selection') {
    return (
      <div className="max-w-6xl mx-auto py-24 space-y-12 animate-fade-in px-4">
        <header className="text-center space-y-6">
          <h2 className="text-5xl md:text-7xl font-shaiya text-white tracking-tighter drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]">BIBLIOTECA DE <span className="text-[#d4af37]">DROP</span></h2>
          <p className="text-[#d4af37] uppercase tracking-[10px] md:tracking-[15px] text-[10px] md:text-xs font-bold opacity-60">Selecciona el método de búsqueda</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pt-10">
          <button onClick={() => handleModeSelection('Mapa')} className="group relative h-[350px] md:h-[450px] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border-2 border-white/5 hover:border-[#d4af37]/50 transition-all duration-700 shadow-2xl">
            <img src={portalBgs.map} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-110 group-hover:opacity-50 transition-all duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12 text-center space-y-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#d4af37]/10 rounded-full flex items-center justify-center border border-[#d4af37]/40 group-hover:bg-[#d4af37] transition-all duration-700"><span className="text-4xl md:text-5xl">🗺️</span></div>
              <h3 className="text-4xl md:text-5xl font-shaiya text-white uppercase tracking-widest">MAPAS</h3>
            </div>
          </button>
          <button onClick={() => handleModeSelection('Boss')} className="group relative h-[350px] md:h-[450px] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border-2 border-white/5 hover:border-[#d4af37]/50 transition-all duration-700 shadow-2xl">
            <img src={portalBgs.boss} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-110 group-hover:opacity-50 transition-all duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12 text-center space-y-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/40 group-hover:bg-red-600 transition-all duration-700"><span className="text-4xl md:text-5xl">👹</span></div>
              <h3 className="text-4xl md:text-5xl font-shaiya text-white uppercase tracking-widest">BOSSES</h3>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-16 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/10 pb-10 gap-6">
        <div className="text-center md:text-left">
          <button onClick={() => setMainView('selection')} className="text-[#d4af37] text-[10px] font-black uppercase mb-3 hover:opacity-70 flex items-center gap-2">← Volver a Modos</button>
          <h1 className="text-5xl md:text-6xl font-shaiya text-white uppercase tracking-tighter">REGISTROS DE {filterType === 'Mapa' ? 'TEOS' : 'JEFES'}</h1>
        </div>
        <div className="flex flex-col items-center md:items-end gap-4">
          <div className="bg-black/60 p-2 rounded-2xl border border-white/10 flex shadow-xl">
            <button onClick={() => setFilterType('Mapa')} className={`px-6 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all ${filterType === 'Mapa' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'text-gray-500 hover:text-white'}`}>Mapas</button>
            <button onClick={() => setFilterType('Boss')} className={`px-6 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all ${filterType === 'Boss' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'text-gray-500 hover:text-white'}`}>Bosses</button>
          </div>
          <div className="flex gap-3 animate-fade-in">
            <button onClick={() => setSelectedFaction(Faction.LIGHT)} className={`px-4 md:px-6 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase border transition-all ${selectedFaction === Faction.LIGHT ? 'bg-blue-600/40 border-blue-400 text-blue-100 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-black/40 border-white/5 text-gray-500 hover:text-blue-400'}`}>Luz</button>
            <button onClick={() => setSelectedFaction(Faction.FURY)} className={`px-4 md:px-6 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase border transition-all ${selectedFaction === Faction.FURY ? 'bg-red-600/40 border-red-400 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-black/40 border-white/5 text-gray-500 hover:text-red-400'}`}>Furia</button>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="text-center py-40 animate-pulse text-[#d4af37] font-shaiya text-3xl uppercase tracking-widest">Consultando pergaminos antiguos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {filteredDrops.map(drop => (
            <div key={drop.id} onClick={() => setSelectedEntity(drop)} className="group cursor-pointer glass-panel rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border border-white/10 hover:border-[#d4af37]/50 transition-all duration-500 shadow-2xl relative">
              <div className="relative h-64 md:h-80">
                <img src={drop.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-8"><h3 className="text-3xl md:text-4xl font-shaiya text-white leading-none tracking-wide">{drop.name}</h3></div>
                
                {/* Entidades Miniatura */}
                <div className="absolute top-6 right-6 flex -space-x-3">
                   {drop.mobs.slice(0, 4).map((mob, idx) => (
                     <div key={mob.id} className="w-10 h-10 rounded-full border-2 shadow-2xl overflow-hidden bg-black flex-shrink-0" style={{ borderColor: mob.mapColor, zIndex: 10 - idx }}>
                        <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                     </div>
                   ))}
                   {drop.mobs.length > 4 && (
                     <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-black/80 flex items-center justify-center text-white text-[10px] font-black z-0">
                        +{drop.mobs.length - 4}
                     </div>
                   )}
                </div>
              </div>
              <div className="p-8 md:p-10">
                <p className="text-gray-500 text-xs md:text-sm italic line-clamp-2 mb-6 md:mb-8">{drop.description}</p>
                <div className="flex justify-between items-center border-t border-white/5 pt-6">
                  <span className="text-[#d4af37] text-[8px] md:text-[10px] font-black uppercase tracking-[3px] group-hover:translate-x-2 transition-transform">EXPLORAR REGISTROS →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropList;
