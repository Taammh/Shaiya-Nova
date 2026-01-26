
import React, { useState } from 'react';
import { GameItem, Category, Faction, Gender, ItemRarity } from '../types';
import { getLoreForItem } from '../services/geminiService';

interface ItemCardProps {
  item: GameItem;
}

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const [lore, setLore] = useState<string | null>(null);
  const [isLoadingLore, setIsLoadingLore] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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

  const getRarityStyle = (rarity?: ItemRarity) => {
    if (!rarity) return 'border-white/10';
    switch (rarity) {
      case 'Noble': return 'border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]';
      case 'Atroz': return 'border-blue-700 shadow-[0_0_20px_rgba(29,78,216,0.3)]';
      case 'Legendary': return 'border-green-600 shadow-[0_0_20px_rgba(22,163,74,0.3)]';
      case 'Diosa': return 'border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.4)] animate-glow';
      case 'Special': return 'border-purple-900 shadow-[0_0_20px_rgba(88,28,135,0.4)]';
      case 'Unique': return 'border-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.4)]';
      default: return 'border-white/20';
    }
  };

  const isPromo = item.category === Category.PROMOTION;
  const rarityStyle = getRarityStyle(item.rarity);

  return (
    <div className={`glass-panel border-2 ${rarityStyle} hover:scale-105 transition-all duration-500 group rounded-[2rem] overflow-hidden shadow-xl animate-fade-in`}>
      <div className="relative h-64 overflow-hidden bg-black/40">
        {/* Placeholder mientras carga */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Invocando...</span>
          </div>
        )}
        <img 
          src={item.image} 
          alt={item.name} 
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 ${imageLoaded ? 'opacity-90' : 'opacity-0'} group-hover:opacity-100`}
        />
        {isPromo && (
          <div className="absolute top-0 left-0 bg-red-600 text-white font-black text-[10px] px-5 py-1.5 uppercase tracking-widest shadow-2xl transform -rotate-12 translate-x-[-12px] translate-y-[12px] z-10">
            OFERTA LIMITADA
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80"></div>
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 backdrop-blur-md text-[9px] font-black uppercase tracking-[2px] text-[#d4af37] border border-[#d4af37]/30 rounded-lg">
          {item.category}
        </div>
      </div>
      <div className="p-7 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-3xl font-shaiya text-white group-hover:text-[#d4af37] transition-colors drop-shadow-lg leading-tight">
              {item.name}
            </h3>
            {item.price && (
              <p className={`text-xl font-black tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] ${isPromo ? 'text-green-400' : 'text-[#d4af37]'}`}>
                {item.price}
              </p>
            )}
          </div>
        </div>
        
        <p className="text-gray-400 text-xs leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity line-clamp-3 font-medium">
          {item.description}
        </p>

        {item.stats && (
          <div className="bg-black/80 p-4 rounded-2xl border border-white/5 group-hover:border-[#d4af37]/30 transition-colors">
            <p className="text-[#d4af37] text-[10px] font-black tracking-widest uppercase">{item.stats}</p>
          </div>
        )}

        {!isPromo && (
          <div className="pt-4 border-t border-white/5">
            {lore ? (
              <div className="animate-fade-in">
                <p className="text-amber-100 text-[10px] leading-relaxed italic bg-amber-900/10 p-3 rounded-2xl border border-amber-900/20 shadow-inner">
                  "{lore}"
                </p>
              </div>
            ) : (
              <button 
                onClick={handleRevealLore}
                disabled={isLoadingLore}
                className="w-full text-center py-3 text-[#d4af37] text-[9px] uppercase tracking-[4px] font-black border border-white/5 hover:border-[#d4af37]/40 hover:bg-[#d4af37]/10 rounded-xl transition-all duration-300 disabled:opacity-50"
              >
                {isLoadingLore ? 'Descifrando runas...' : 'Revelar Historia'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
