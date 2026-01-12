
import React, { useState } from 'react';
import { GameItem, Category, Faction, Gender } from '../types';
import { getLoreForItem } from '../services/geminiService';

interface ItemCardProps {
  item: GameItem;
}

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const [lore, setLore] = useState<string | null>(null);
  const [isLoadingLore, setIsLoadingLore] = useState(false);

  const handleRevealLore = async () => {
    if (lore) return;
    if (item.hidden_history) {
      setLore(item.hidden_history);
      return;
    }
    setIsLoadingLore(true);
    const text = await getLoreForItem(item.name, item.category);
    setLore(text);
    setIsLoadingLore(false);
  };

  const factionColor = item.faction === Faction.LIGHT ? 'text-blue-400 border-blue-400/30' : 
                       item.faction === Faction.FURY ? 'text-red-500 border-red-500/30' : 'text-yellow-500 border-yellow-500/30';

  const isPromo = item.category === Category.PROMOTION;

  return (
    <div className={`glass-panel border ${isPromo ? 'border-[#d4af37] animate-glow' : 'border-white/10'} hover:border-[#d4af37]/60 rounded-xl overflow-hidden transition-all duration-500 group shadow-lg`}>
      <div className="relative h-56 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 group-hover:opacity-100"
        />
        {isPromo && (
          <div className="absolute top-0 left-0 bg-red-600 text-white font-black text-[10px] px-4 py-1 uppercase tracking-widest shadow-xl transform -rotate-12 translate-x-[-10px] translate-y-[10px]">
            OFERTA
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80"></div>
        <div className="absolute top-3 right-3 px-3 py-1 bg-black/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-[#d4af37] border border-[#d4af37]/30 rounded-lg">
          {item.category}
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-shaiya text-white group-hover:text-[#d4af37] transition-colors drop-shadow-md">
              {item.name}
            </h3>
            {isPromo && item.price && (
              <p className="text-xl font-black text-green-400 tracking-tighter drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]">
                {item.price}
              </p>
            )}
          </div>
        </div>
        
        <p className="text-gray-300 text-sm leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity line-clamp-3">
          {item.description}
        </p>

        {item.stats && (
          <div className="bg-black/60 p-3 rounded-lg border border-white/5 group-hover:border-[#d4af37]/20 transition-colors">
            <p className="text-[#d4af37] text-xs font-mono font-bold tracking-tight">{item.stats}</p>
          </div>
        )}

        {!isPromo && (
          <div className="pt-4 border-t border-white/10">
            {lore ? (
              <div className="animate-fade-in">
                <p className="text-amber-100 text-[11px] leading-relaxed italic bg-amber-900/10 p-2 rounded border border-amber-900/20">
                  "{lore}"
                </p>
              </div>
            ) : (
              <button 
                onClick={handleRevealLore}
                disabled={isLoadingLore}
                className="w-full text-center py-2 text-[#d4af37] text-[10px] uppercase tracking-[3px] font-bold border border-transparent hover:border-[#d4af37]/30 hover:bg-[#d4af37]/5 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                {isLoadingLore ? 'Descifrando runas...' : 'Revelar Historia Oculta'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
