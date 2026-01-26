
import React, { useState, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import ItemCard from './components/ItemCard';
import BugReportForm from './components/BugReportForm';
import StaffApplicationForm from './components/StaffApplicationForm';
import AdminPanel from './components/AdminPanel';
import DropList from './components/DropList';
import { getItemsFromDB, getSetting } from './services/supabaseClient';
import { ITEMS as STATIC_ITEMS } from './constants';
import { Category, Faction, CLASSES_BY_FACTION, GameItem, Gender } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('promotions');
  const [selectedFaction, setSelectedFaction] = useState<Faction>(Faction.LIGHT);
  const [selectedClass, setSelectedClass] = useState<string>('Luchador/Defensor');
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [cloudItems, setCloudItems] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const fetchItems = async () => {
    try {
      const items = await getItemsFromDB();
      setCloudItems(items as GameItem[]);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sync = urlParams.get('sync');
    const version = urlParams.get('v');
    
    if (sync) {
      try {
        let decoded: any;
        if (version === '4') {
          // Motor de decodificación seguro UTF-8
          const binary = atob(decodeURIComponent(sync));
          const jsonStr = decodeURIComponent(binary.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          const obj = JSON.parse(jsonStr);
          
          decoded = {
            ...obj.config,
            localItems: obj.localItems,
            localDrops: obj.localDrops
          };
        } else {
          // Retrocompatibilidad Base64
          decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(sync)))));
        }
        
        // Persistencia Segura
        Object.entries(decoded).forEach(([k, v]) => {
          if (v && k !== 'localItems' && k !== 'localDrops') {
            localStorage.setItem(`nova_setting_${k}`, String(v));
          }
        });
        if (decoded.localItems) localStorage.setItem('nova_local_items', JSON.stringify(decoded.localItems));
        if (decoded.localDrops) localStorage.setItem('nova_local_drops', JSON.stringify(decoded.localDrops));

        window.history.replaceState({}, document.title, window.location.pathname);
        alert("¡REINO SINCRONIZADO CON ÉXITO!");
        window.location.reload(); 
      } catch (e) { console.error("Fallo de sincronización:", e); }
    }
    fetchItems();
  }, []);

  const allItems = useMemo(() => [...STATIC_ITEMS, ...cloudItems], [cloudItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchesTab = 
        (activeTab === 'promotions' && item.category === Category.PROMOTION) ||
        (activeTab === 'mounts' && item.category === Category.MOUNT) ||
        (activeTab === 'costumes' && item.category === Category.COSTUME) ||
        (activeTab === 'transformations' && item.category === Category.TRANSFORMATION);
      if (!matchesTab) return false;
      if (activeTab === 'costumes') {
        const matchesFaction = item.faction === selectedFaction;
        const itemClassClean = (item.item_class || '').trim().toUpperCase();
        const selectedClassClean = (selectedClass || '').trim().toUpperCase();
        let matchesClass = selectedClass === 'All' ? true : itemClassClean === selectedClassClean;
        const matchesGender = selectedGender === 'All' || item.gender === Gender.BOTH || item.gender === selectedGender;
        return matchesFaction && matchesClass && matchesGender;
      }
      return true;
    });
  }, [activeTab, selectedFaction, selectedClass, selectedGender, allItems]);

  return (
    <div className={`min-h-screen flex flex-col relative bg-shaiya-epic`}>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-grow container mx-auto px-4 py-12 relative z-10">
        {activeTab === 'droplist' && <DropList />}
        {activeTab === 'report' && <div className="py-12"><BugReportForm /></div>}
        {activeTab === 'staff_app' && <div className="py-12"><StaffApplicationForm /></div>}
        {activeTab === 'admin' && (
          <div className="py-12">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto glass-panel p-12 rounded-[3rem] text-center border-[#d4af37]/30 shadow-2xl">
                <h2 className="text-4xl font-shaiya text-white mb-8 uppercase tracking-widest">Portal Maestro</h2>
                <form onSubmit={(e) => { e.preventDefault(); if(adminPassword === 'Nova2296') setIsAdminAuthenticated(true); else alert('Denegado'); }} className="space-y-6">
                  <input type="password" placeholder="Runa Secreta" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none text-center tracking-widest" />
                  <button className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl uppercase tracking-widest">Acceder</button>
                </form>
              </div>
            ) : <AdminPanel />}
          </div>
        )}
        {activeTab !== 'report' && activeTab !== 'admin' && activeTab !== 'staff_app' && activeTab !== 'droplist' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </main>
      <footer className="py-12 text-center text-gray-500 border-t border-white/5 bg-black/40">
        <p className="font-shaiya text-xl tracking-widest text-white/40 mb-2">SHAIYA NOVA</p>
        <p className="text-[9px] uppercase tracking-[5px] font-black opacity-30">© 2025 • Shaiya NOVA</p>
      </footer>
    </div>
  );
};

export default App;
