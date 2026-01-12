
import React, { useState, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import ItemCard from './components/ItemCard';
import BugReportForm from './components/BugReportForm';
import AdminPanel from './components/AdminPanel';
import { getItemsFromDB } from './services/supabaseClient';
import { Category, Faction, CLASSES_BY_FACTION, GameItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mounts');
  const [selectedFaction, setSelectedFaction] = useState<Faction>(Faction.LIGHT);
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [cloudItems, setCloudItems] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const items = await getItemsFromDB();
        setCloudItems(items as GameItem[]);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return cloudItems.filter(item => {
      const matchesTab = 
        (activeTab === 'mounts' && item.category === Category.MOUNT) ||
        (activeTab === 'costumes' && item.category === Category.COSTUME) ||
        (activeTab === 'transformations' && item.category === Category.TRANSFORMATION);
      
      if (!matchesTab) return false;

      if (activeTab === 'costumes') {
        const matchesFaction = item.faction === selectedFaction;
        // Cambiado itemClass por item_class para coincidir con DB
        const matchesClass = selectedClass === 'All' || 
          item.item_class === selectedClass || 
          (item.classes && item.classes.includes(selectedClass));
        return matchesFaction && matchesClass;
      }

      return true;
    });
  }, [activeTab, selectedFaction, selectedClass, cloudItems]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Nova2296') {
      setIsAdminAuthenticated(true);
    } else {
      alert('Contraseña incorrecta, forastero.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-shaiya-nova">
      <div className="fixed inset-0 bg-black/70 pointer-events-none"></div>

      <Navbar activeTab={activeTab} onTabChange={(tab) => {
        setActiveTab(tab);
        setSelectedClass('All');
      }} />

      <main className="flex-grow container mx-auto px-4 py-12 relative z-10">
        
        {activeTab !== 'report' && activeTab !== 'admin' && (
          <>
            <header className="text-center mb-16 animate-fade-in">
              <h1 className="text-6xl md:text-8xl font-shaiya text-white mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">
                {activeTab === 'mounts' ? 'LEGENDARIAS' : activeTab === 'costumes' ? 'VESTIMENTAS' : 'ESENCIAS'} <span className="text-[#d4af37]">NOVA</span>
              </h1>
              <p className="text-[#d4af37] max-w-2xl mx-auto uppercase tracking-[6px] text-xs font-bold opacity-80">
                {activeTab === 'mounts' ? 'Bestias sagradas de Teos' : activeTab === 'costumes' ? 'Poder forjado en armaduras' : 'Transformaciones prohibidas'}
              </p>
            </header>

            {activeTab === 'costumes' && (
              <div className="mb-12 glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl animate-fade-in">
                <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Reino</span>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {setSelectedFaction(Faction.LIGHT); setSelectedClass('All');}}
                        className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all ${selectedFaction === Faction.LIGHT ? 'bg-blue-600/30 border border-blue-400 text-blue-100 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-black/40 border border-white/5 text-gray-500'}`}
                      >
                        Luz
                      </button>
                      <button 
                        onClick={() => {setSelectedFaction(Faction.FURY); setSelectedClass('All');}}
                        className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all ${selectedFaction === Faction.FURY ? 'bg-red-600/30 border border-red-400 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-black/40 border border-white/5 text-gray-500'}`}
                      >
                        Furia
                      </button>
                    </div>
                  </div>
                  <div className="w-px h-12 bg-white/10 hidden md:block"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Especialización (Clase)</span>
                    <select 
                      className="bg-black/60 border border-white/10 text-gray-200 p-3 rounded-xl outline-none cursor-pointer hover:border-[#d4af37] transition-all min-w-[220px] font-bold uppercase tracking-widest text-center"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                    >
                      <option value="All">Todas las Clases</option>
                      {CLASSES_BY_FACTION[selectedFaction].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]"></div>
                <p className="mt-4 text-[#d4af37] font-shaiya tracking-widest">Invocando reliquias...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {filteredItems.map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32 glass-panel rounded-[40px] border border-dashed border-white/5">
                <p className="text-[#d4af37] font-shaiya text-3xl mb-4 opacity-70 uppercase tracking-widest">Reino Desolado</p>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Aún no se han descubierto reliquias en esta sección.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'report' && <BugReportForm />}

        {activeTab === 'admin' && (
          <div className="py-10">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto glass-panel p-10 rounded-3xl border border-[#d4af37]/40 shadow-2xl shadow-[#d4af37]/10 animate-fade-in text-center">
                <div className="text-[#d4af37] text-4xl mb-6">🔒</div>
                <h2 className="text-2xl font-shaiya text-white mb-8">Cámara del Administrador</h2>
                <form onSubmit={handleAdminAuth} className="space-y-6">
                  <input 
                    type="password"
                    placeholder="Contraseña Maestra"
                    className="w-full bg-black/80 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37] text-center text-xl tracking-widest"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                  />
                  <button className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl uppercase tracking-[4px] hover:bg-white transition-all">
                    Acceder
                  </button>
                </form>
              </div>
            ) : (
              <AdminPanel />
            )}
          </div>
        )}
      </main>

      <footer className="bg-black/95 py-12 border-t border-[#d4af37]/30 mt-20 relative z-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[#d4af37] font-shaiya text-3xl mb-4 tracking-widest drop-shadow-md">SHAIYA NOVA</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-[6px]">© 2026 Shaiya NOVA Team - Forging Legends</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
