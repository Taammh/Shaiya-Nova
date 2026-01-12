
import React, { useState } from 'react';
import { GameItem, Category } from '../types';
import { getLoreForItem } from '../services/geminiService';

interface ItemCardProps {
  item: GameItem;
}

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const [lore, setLore] = useState<string | null>(null);
  const [isLoadingLore, setIsLoadingLore] = useState(false);

  const handleRevealLore = async () => {
    if (lore) return;
    setIsLoadingLore(true);
    const text = await getLoreForItem(item.name, item.category);
    setLore(text);
    setIsLoadingLore(false);
  };

  const factionColor = item.faction === 'Alliance of Light' ? 'text-blue-400' : 
                       item.faction === 'Union of Fury' ? 'text-red-500' : 'text-yellow-500';

  return (
    <div className="glass-panel border border-white/10 hover:border-[#d4af37]/60 rounded-xl overflow-hidden transition-all duration-500 group shadow-lg hover:shadow-[#d4af37]/10">
      <div className="relative h-56 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-3 right-3 px-3 py-1 bg-black/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-[#d4af37] border border-[#d4af37]/30 rounded-lg">
          {item.category}
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-2xl font-shaiya text-white group-hover:text-[#d4af37] transition-colors drop-shadow-md">
            {item.name}
          </h3>
          <span className={`text-[10px] font-bold uppercase tracking-tighter p-1 border rounded border-white/10 ${factionColor}`}>
            {item.faction}
          </span>
        </div>
        
        <p className="text-gray-300 text-sm leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity">
          {item.description}
        </p>

        {item.stats && (
          <div className="bg-black/60 p-3 rounded-lg border border-white/5 group-hover:border-[#d4af37]/20 transition-colors">
            <p className="text-[#d4af37] text-xs font-mono font-bold tracking-tight">{item.stats}</p>
          </div>
        )}

        {(item.classes || item.gender) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {item.gender && (
              <span className="bg-gray-800/80 text-gray-300 text-[9px] px-2 py-1 rounded border border-white/5 uppercase font-bold">
                {item.gender}
              </span>
            )}
            {item.classes?.map(c => (
              <span key={c} className="bg-indigo-900/40 text-indigo-200 text-[9px] px-2 py-1 rounded border border-indigo-500/20 uppercase font-bold">
                {c}
              </span>
            ))}
          </div>
        )}

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
      </div>
    </div>
  );
};

export default ItemCard;
