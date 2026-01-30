
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
  const [siteBg, setSiteBg] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const items = await getItemsFromDB();
      setCloudItems(items as GameItem[]);
    } catch (e) { 
      console.error("Fallo al invocar ítems:", e); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const fetchSettings = async () => {
    const bg = await getSetting('SITE_BG_URL');
    if (bg) setSiteBg(bg);
  };

  useEffect(() => {
    // CAPTURADOR DE SESIÓN DISCORD (Implicit Grant Flow)
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setIsLoading(true);
        fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(user => {
          if (user.id) {
            const session = {
              name: user.username,
              id: user.id,
              avatar: user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`
            };
            localStorage.setItem('nova_session', JSON.stringify(session));
            
            // Recuperar la pestaña en la que estaba el usuario
            const lastTab = localStorage.getItem('nova_last_active_tab');
            if (lastTab) {
              setActiveTab(lastTab);
              localStorage.removeItem('nova_last_active_tab');
            }

            // Limpiar el hash de la URL para seguridad y estética
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            // Pequeña pausa para asegurar que el storage se asiente antes de la carga
            setTimeout(() => setIsLoading(false), 500);
          }
        })
        .catch(e => {
          console.error("Error identificando con Discord:", e);
          setIsLoading(false);
        });
        return;
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sync = urlParams.get('sync');
    
    if (sync) {
      try {
        const binary = atob(decodeURIComponent(sync));
        const jsonStr = decodeURIComponent(binary.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const decoded = JSON.parse(jsonStr);
        
        // Sincronización Ultra-Corta: Solo guardamos la configuración de conexión
        if (decoded.config) {
          Object.entries(decoded.config).forEach(([k, v]) => {
            if (v) {
              localStorage.setItem(`nova_setting_${k}`, String(v));
            }
          });
          
          // Limpiamos la URL y recargamos para que el cliente Supabase inicie fresco y descargue todo
          window.history.replaceState({}, document.title, window.location.pathname);
          alert("¡REINO VINCULADO! Sincronizando datos con el Trono de Supabase...");
          window.location.reload(); 
          return;
        }
      } catch (e) { 
        console.error("Fallo de sincronización:", e);
      }
    }
    fetchItems();
    fetchSettings();
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

  const dynamicBg = siteBg ? { backgroundImage: `linear-gradient(to bottom, rgba(5,5,7,0.8), rgba(5,5,7,0.6)), url('${siteBg}')` } : {};

  return (
    <div className={`min-h-screen flex flex-col relative ${siteBg ? '' : 'bg-shaiya-epic'}`} style={dynamicBg}>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-grow container mx-auto px-4 py-12 relative z-10">
        {isLoading && activeTab !== 'admin' ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-20 h-20 border-t-2 border-b-2 border-[#d4af37] rounded-full animate-spin mb-6"></div>
            <p className="text-[#d4af37] font-shaiya text-2xl uppercase tracking-widest">Invocando el Reino de NOVA...</p>
          </div>
        ) : (
          <>
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
              <div className="space-y-12">
                {activeTab === 'costumes' && (
                  <div className="max-w-4xl mx-auto glass-panel p-8 rounded-[2.5rem] flex flex-wrap gap-6 justify-center animate-fade-in">
                    <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs font-black uppercase" value={selectedFaction} onChange={e => setSelectedFaction(e.target.value as Faction)}>
                      <option value={Faction.LIGHT}>Luz</option>
                      <option value={Faction.FURY}>Furia</option>
                    </select>
                    <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs font-black uppercase" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                      <option value="All">Todas las Clases</option>
                      {(CLASSES_BY_FACTION[selectedFaction] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="bg-black/60 border border-white/10 p-4 rounded-xl text-white text-xs font-black uppercase" value={selectedGender} onChange={e => setSelectedGender(e.target.value)}>
                      <option value="All">Ambos Sexos</option>
                      <option value={Gender.MALE}>Hombres</option>
                      <option value={Gender.FEMALE}>Mujeres</option>
                    </select>
                  </div>
                )}
                
                {filteredItems.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-gray-500 font-shaiya text-xl uppercase tracking-widest">Aún no hay reliquias en esta categoría.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <footer className="py-12 text-center text-gray-500 border-t border-white/5 bg-black/40">
        <p className="font-shaiya text-xl tracking-widest text-white/40 mb-2">SHAIYA NOVA</p>
        <p className="text-[9px] uppercase tracking-[5px] font-black opacity-30">© 2025 • El destino del reino está en tus manos</p>
      </footer>
    </div>
  );
};

export default App;
