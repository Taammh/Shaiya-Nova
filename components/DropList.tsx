
import React, { useState, useEffect } from 'react';
import { DropMap, MobEntry, DropEntry, Faction } from '../types';
import { getDropListsFromDB, getSetting } from '../services/supabaseClient';

const DropList: React.FC = () => {
  const [drops, setDrops] = useState<DropMap[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<DropMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainView, setMainView] = useState<'selection' | 'list'>('selection');
  const [filterType, setFilterType] = useState<'Mapa' | 'Boss'>('Mapa');
  const [selectedFaction, setSelectedFaction] = useState<Faction>(Faction.LIGHT); // Default filter for maps
  
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
        setPortalBgs({
          map: mBg || portalBgs.map,
          boss: bBg || portalBgs.boss
        });
      }
      
      setIsLoading(false);
    };
    fetchDropsAndBgs();
  }, []);

  const handleModeSelection = (type: 'Mapa' | 'Boss') => {
    setFilterType(type);
    setMainView('list');
  };

  // Improved filtering logic for Faction
  const filteredDrops = drops.filter(d => {
    if (d.category !== filterType) return false;
    
    // Only apply faction filter for "Mapa" category
    if (filterType === 'Mapa') {
      // Show map if it's the specific faction OR if it's Neutral/Both
      return d.faction === selectedFaction || d.faction === Faction.NEUTRAL;
    }
    
    return true; // Bosses are usually neutral/accessible to all in this context
  });

  if (selectedEntity) {
    return (
      <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-24">
        <button 
          onClick={() => setSelectedEntity(null)} 
          className="text-[#d4af37] font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:translate-x-[-5px] transition-all bg-black/40 px-6 py-3 rounded-full border border-white/5"
        >
          ← Regresar a la selección
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-[2.5rem] overflow-hidden border-2 border-[#d4af37]/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black">
              <img src={selectedEntity.image} className="w-full h-auto block opacity-80" alt={selectedEntity.name} />
              {selectedEntity.mobs.map((mob) => 
                mob.points?.map((point, pIdx) => (
                  <div 
                    key={`${mob.id}-${pIdx}`}
                    className="absolute w-5 h-5 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.6)] transform -translate-x-1/2 -translate-y-1/2 cursor-help group/point animate-pulse"
                    style={{ left: `${point.x}%`, top: `${point.y}%`, backgroundColor: mob.mapColor }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1 bg-black/90 text-white text-[9px] font-black uppercase rounded-lg whitespace-nowrap opacity-0 group-hover/point:opacity-100 transition-opacity border border-[#d4af37]/30">
                      {mob.name}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="glass-panel p-8 rounded-[2rem]">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-4xl font-shaiya text-[#d4af37]">{selectedEntity.name}</h2>
                {selectedEntity.faction && (
                   <span className={`px-4 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                     selectedEntity.faction === Faction.LIGHT ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' :
                     selectedEntity.faction === Faction.FURY ? 'bg-red-600/20 border-red-500/30 text-red-400' : 'bg-gray-600/20 border-white/10 text-gray-400'
                   }`}>
                     {selectedEntity.faction === Faction.NEUTRAL ? 'Neutral / PVP' : `Facción: ${selectedEntity.faction}`}
                   </span>
                )}
              </div>
              <p className="text-gray-400 text-sm italic leading-relaxed">{selectedEntity.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[#d4af37] font-black uppercase text-xs tracking-[4px] px-2 border-l-2 border-[#d4af37] ml-2">Leyenda de zona</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scroll">
              {selectedEntity.mobs.map((mob) => (
                <div key={mob.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-[#d4af37]/30 transition-all group">
                  <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: mob.mapColor }}></div>
                  <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                  <div>
                    <h4 className="text-white font-shaiya text-lg">{mob.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Nivel {mob.level}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-10 pt-10 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {selectedEntity.mobs.map((mob) => (
              <div key={mob.id} className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/10">
                <div className="flex p-6 gap-6 bg-white/5 border-b border-white/5">
                  <div className="relative">
                     <img src={mob.image} className="w-28 h-28 rounded-2xl object-cover border-2 border-white/10 shadow-2xl" />
                     <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: mob.mapColor }}></div>
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <h3 className="text-3xl font-shaiya text-white">{mob.name}</h3>
                    <span className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest mt-1">Nivel {mob.level}</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-3">
                    {mob.drops.map((drop, dIdx) => (
                      <div key={dIdx} className="flex items-center gap-4 bg-black/60 p-3 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-black/80 flex items-center justify-center p-1 border border-white/10 group-hover:border-[#d4af37]/50 transition-colors">
                           <img src={drop.itemImage || "https://api.dicebear.com/7.x/pixel-art/svg?seed=item"} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-grow">
                          <p className="text-gray-200 text-sm font-bold">{drop.itemName}</p>
                          <p className="text-gray-500 text-[8px] font-black uppercase tracking-tighter">{drop.rarity}</p>
                        </div>
                        <div className="px-4 py-1 bg-[#d4af37]/10 rounded-lg border border-[#d4af37]/20">
                           <span className="text-[#d4af37] font-mono font-black text-xs">{drop.rate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mainView === 'selection') {
    return (
      <div className="max-w-6xl mx-auto py-24 space-y-12 animate-fade-in">
        <header className="text-center space-y-6">
          <h2 className="text-7xl font-shaiya text-white tracking-tighter drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]">BIBLIOTECA DE <span className="text-[#d4af37]">DROP</span></h2>
          <p className="text-[#d4af37] uppercase tracking-[15px] text-xs font-bold opacity-60">Selecciona el método de búsqueda</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10">
          <button 
            onClick={() => handleModeSelection('Mapa')}
            className="group relative h-[450px] rounded-[3.5rem] overflow-hidden border-2 border-white/5 hover:border-[#d4af37]/50 transition-all duration-700 shadow-2xl"
          >
            <img src={portalBgs.map} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-110 group-hover:opacity-50 transition-all duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-[#d4af37]/10 rounded-full flex items-center justify-center border border-[#d4af37]/40 group-hover:bg-[#d4af37] group-hover:rotate-[360deg] transition-all duration-700">
                <span className="text-5xl">🗺️</span>
              </div>
              <div>
                <h3 className="text-5xl font-shaiya text-white mb-2 uppercase tracking-widest">BUSCAR POR MAPA</h3>
                <p className="text-gray-400 text-[10px] uppercase tracking-[5px]">Explora las regiones de Teos</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => handleModeSelection('Boss')}
            className="group relative h-[450px] rounded-[3.5rem] overflow-hidden border-2 border-white/5 hover:border-[#d4af37]/50 transition-all duration-700 shadow-2xl"
          >
            <img src={portalBgs.boss} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-110 group-hover:opacity-50 transition-all duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/40 group-hover:bg-red-600 group-hover:scale-110 transition-all duration-700">
                <span className="text-5xl">👹</span>
              </div>
              <div>
                <h3 className="text-5xl font-shaiya text-white mb-2 uppercase tracking-widest">BUSCAR POR BOSS</h3>
                <p className="text-gray-400 text-[10px] uppercase tracking-[5px]">Caza a los guardianes supremos</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/10 pb-10 gap-6">
        <div className="text-center md:text-left">
          <button onClick={() => setMainView('selection')} className="text-[#d4af37] text-[10px] font-black uppercase mb-3 hover:opacity-70 flex items-center gap-2 justify-center md:justify-start">← Volver a Modos</button>
          <h1 className="text-6xl font-shaiya text-white uppercase tracking-tighter">ARCHIVOS DE {filterType === 'Mapa' ? 'TEOS' : 'JEFES'}</h1>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-4">
          <div className="bg-black/60 p-2 rounded-2xl border border-white/10 flex shadow-xl">
            <button onClick={() => setFilterType('Mapa')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${filterType === 'Mapa' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'text-gray-500 hover:text-white'}`}>Mapas</button>
            <button onClick={() => setFilterType('Boss')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${filterType === 'Boss' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'text-gray-500 hover:text-white'}`}>Bosses</button>
          </div>

          {filterType === 'Mapa' && (
            <div className="flex gap-4 animate-fade-in">
              <button 
                onClick={() => setSelectedFaction(Faction.LIGHT)} 
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  selectedFaction === Faction.LIGHT ? 'bg-blue-600/40 border-blue-400 text-blue-100 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-black/40 border-white/5 text-gray-500 hover:text-blue-400'
                }`}
              >
                Luz
              </button>
              <button 
                onClick={() => setSelectedFaction(Faction.FURY)} 
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  selectedFaction === Faction.FURY ? 'bg-red-600/40 border-red-400 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-black/40 border-white/5 text-gray-500 hover:text-red-400'
                }`}
              >
                Furia
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-40 animate-pulse text-[#d4af37] font-shaiya text-3xl uppercase tracking-widest">Consultando pergaminos antiguos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredDrops.map(drop => (
            <div 
              key={drop.id} 
              onClick={() => setSelectedEntity(drop)}
              className="group cursor-pointer glass-panel rounded-[3rem] overflow-hidden border border-white/10 hover:border-[#d4af37]/50 transition-all duration-500 shadow-2xl"
            >
              <div className="relative h-80">
                <img src={drop.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/30 to-transparent"></div>
                <div className="absolute bottom-10 left-10">
                  <div className="flex gap-2 items-center mb-2">
                    <span className="text-[#d4af37] text-[10px] font-black uppercase tracking-[6px] opacity-70">{drop.category}</span>
                    {drop.category === 'Mapa' && drop.faction === Faction.NEUTRAL && (
                      <span className="text-gray-400 text-[8px] font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">Neutral</span>
                    )}
                  </div>
                  <h3 className="text-4xl font-shaiya text-white leading-none tracking-wide">{drop.name}</h3>
                </div>
              </div>
              <div className="p-10">
                <p className="text-gray-500 text-sm italic line-clamp-2 mb-8 leading-relaxed">{drop.description}</p>
                <div className="flex justify-between items-center border-t border-white/5 pt-8">
                  <div className="flex -space-x-3 items-center">
                    {drop.mobs.slice(0, 3).map((m, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-gray-900 overflow-hidden" style={{ borderColor: m.mapColor }}>
                        <img src={m.image} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {drop.mobs.length > 3 && (
                      <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-gray-800 flex items-center justify-center text-[9px] font-bold text-white">+{drop.mobs.length - 3}</div>
                    )}
                  </div>
                  <span className="text-[#d4af37] text-[10px] font-black uppercase tracking-[4px] group-hover:translate-x-3 transition-transform">Ver Mapa →</span>
                </div>
              </div>
            </div>
          ))}
          {filteredDrops.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-600 font-shaiya text-2xl uppercase italic">
              Aún no se han descubierto registros para esta facción...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DropList;
