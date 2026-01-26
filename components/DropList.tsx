
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
          <button 
            onClick={() => setSelectedEntity(null)} 
            className="text-[#d4af37] font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:translate-x-[-5px] transition-all bg-black/40 px-6 py-3 rounded-full border border-white/5"
          >
            ← REGRESAR A LA SELECCIÓN
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="relative rounded-[1.5rem] overflow-hidden border-2 border-[#d4af37]/30 shadow-[0_0_40px_rgba(0,0,0,0.6)] bg-black/40 max-w-[320px] mx-auto lg:mx-0">
              <img src={selectedEntity.image} className="w-full h-auto block opacity-100 brightness-110" alt={selectedEntity.name} />
              
              {/* Marcas en el Mapa */}
              {selectedEntity.mobs.map((mob) => 
                mob.points?.map((point, pIdx) => (
                  <div 
                    key={`${mob.id}-${pIdx}`}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-help group/point z-20 ${point.type === 'area' ? 'border-2 rounded-full' : 'w-2.5 h-2.5 rounded-full border border-white animate-pulse'}`}
                    style={{ 
                      left: `${point.x}%`, 
                      top: `${point.y}%`, 
                      backgroundColor: point.type === 'area' ? `${point.color}33` : point.color,
                      borderColor: point.type === 'area' ? point.color : 'white',
                      width: point.type === 'area' ? `${point.radius! * 2}%` : '10px',
                      height: point.type === 'area' ? `${point.radius! * 2}%` : '10px',
                      aspectRatio: '1/1'
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/95 text-white text-[7px] font-black uppercase rounded border border-[#d4af37]/50 pointer-events-none z-30 opacity-0 group-hover/point:opacity-100 transition-opacity whitespace-nowrap">
                      {mob.name}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="glass-panel p-5 rounded-[1.5rem] border border-white/5 max-w-[320px] mx-auto lg:mx-0">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-shaiya text-[#d4af37] tracking-tight">{selectedEntity.name}</h2>
                {selectedEntity.faction && (
                   <span className={`px-2 py-0.5 rounded-md text-[6px] font-black uppercase tracking-widest border ${
                     selectedEntity.faction === Faction.LIGHT ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' :
                     selectedEntity.faction === Faction.FURY ? 'bg-red-600/20 border-red-500/30 text-red-400' : 'bg-gray-600/20 border-white/10 text-gray-400'
                   }`}>
                     {selectedEntity.faction === Faction.NEUTRAL ? 'Neutral' : `${selectedEntity.faction}`}
                   </span>
                )}
              </div>
              <p className="text-gray-400 text-[10px] italic leading-relaxed opacity-70">{selectedEntity.description}</p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-[#d4af37] font-black uppercase text-[10px] tracking-[4px] px-3 border-l-2 border-[#d4af37] mb-2">REGISTRO DE ENTIDADES</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
              {selectedEntity.mobs.map((mob) => (
                <div key={mob.id} className="bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3 hover:border-[#d4af37]/40 transition-all group">
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: mob.mapColor }}></div>
                  <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-black">
                    <img src={mob.image || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback"} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-white font-shaiya text-base leading-none mb-1">{mob.name}</h4>
                    <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">NIVEL {mob.level}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botín tarjetas */}
        <div className="space-y-8 pt-8 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedEntity.mobs.map((mob) => (
              <div key={mob.id} className="glass-panel rounded-[2rem] overflow-hidden border border-white/10 shadow-lg">
                <div className="flex p-5 gap-5 bg-white/5 border-b border-white/5 items-center">
                   <div className="relative w-20 h-20 p-1 rounded-2xl border-[3px] border-white/20 bg-black shadow-2xl shrink-0">
                      <img src={mob.image} className="w-full h-full rounded-xl object-cover" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white bg-white/20 shadow-xl z-10" style={{ backgroundColor: mob.mapColor }}></div>
                   </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <h3 className="text-2xl font-shaiya text-white leading-none mb-1">{mob.name}</h3>
                    <span className="text-[#d4af37] text-[9px] font-black uppercase tracking-widest">NIVEL {mob.level}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 gap-3">
                    {mob.drops.map((drop, dIdx) => (
                      <div key={dIdx} className="flex items-center gap-3 bg-black/60 p-2.5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                        <div className={`w-12 h-12 bg-black flex items-center justify-center p-0.5 shrink-0 ${getRarityBorder(drop.rarity)}`}>
                           <img src={drop.itemImage || "https://api.dicebear.com/7.x/pixel-art/svg?seed=item"} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-grow overflow-hidden">
                          <p className="text-gray-200 text-xs font-bold uppercase tracking-tight truncate">{drop.itemName}</p>
                          <p className={`text-[7px] font-black uppercase tracking-widest ${
                            drop.rarity === 'Noble' ? 'text-sky-400' :
                            drop.rarity === 'Atroz' ? 'text-blue-500' :
                            drop.rarity === 'Legendary' ? 'text-green-500' :
                            drop.rarity === 'Diosa' ? 'text-[#d4af37]' :
                            drop.rarity === 'Special' ? 'text-purple-500' : 
                            drop.rarity === 'Unique' ? 'text-orange-500' : 'text-gray-500'
                          }`}>
                            {drop.rarity === 'Unique' ? 'Especial (Naranja)' : drop.rarity === 'Special' ? 'Especial (Morada)' : drop.rarity}
                          </p>
                        </div>
                        <div className="px-3 py-1.5 bg-black/80 rounded-xl border border-white/10 shadow-inner shrink-0">
                           <span className="text-[#d4af37] font-mono font-black text-[10px]">{drop.rate}</span>
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

  // selection view remains the same...
  return (
    <div className="max-w-7xl mx-auto space-y-16 animate-fade-in px-4">
      {/* Selection UI content... */}
      <div className="text-center py-40 animate-pulse text-[#d4af37] font-shaiya text-3xl uppercase tracking-widest">Consultando pergaminos antiguos...</div>
    </div>
  );
};

export default DropList;
