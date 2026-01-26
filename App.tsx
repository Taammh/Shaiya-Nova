
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
      const items = await getItemsFromDB();
      setCloudItems(items as GameItem[]);
    } catch (e) {
      console.error("Error cargando reliquias:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranding = async () => {
    const bg = await getSetting('SITE_BG_URL');
    if (bg) setSiteBg(bg);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const syncData = urlParams.get('sync');
    
    if (syncData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(syncData))));
        
        // Sincronizar Ajustes Críticos
        if (decoded.webhookSupport) localStorage.setItem('nova_setting_NOVA_WEBHOOK_URL', decoded.webhookSupport);
        if (decoded.webhookApps) localStorage.setItem('nova_setting_NOVA_STAFF_APP_WEBHOOK', decoded.webhookApps);
        if (decoded.webhookWelcome) localStorage.setItem('nova_setting_NOVA_STAFF_WELCOME_WEBHOOK', decoded.webhookWelcome);
        if (decoded.clientId) localStorage.setItem('nova_setting_DISCORD_CLIENT_ID', decoded.clientId);
        if (decoded.botToken) localStorage.setItem('nova_setting_DISCORD_BOT_TOKEN', decoded.botToken);
        if (decoded.guildId) localStorage.setItem('nova_setting_DISCORD_GUILD_ID', decoded.guildId);
        if (decoded.roleGs) localStorage.setItem('nova_setting_ROLE_ID_GS', decoded.roleGs);
        if (decoded.roleLgs) localStorage.setItem('nova_setting_ROLE_ID_LGS', decoded.roleLgs);
        if (decoded.roleGm) localStorage.setItem('nova_setting_ROLE_ID_GM', decoded.roleGm);
        if (decoded.supabaseUrl) localStorage.setItem('nova_setting_SUPABASE_URL', decoded.supabaseUrl);
        if (decoded.supabaseKey) localStorage.setItem('nova_setting_SUPABASE_ANON_KEY', decoded.supabaseKey);
        if (decoded.siteLogo) localStorage.setItem('nova_setting_SITE_LOGO_URL', decoded.siteLogo);
        if (decoded.siteBg) localStorage.setItem('nova_setting_SITE_BG_URL', decoded.siteBg);
        if (decoded.mapPortalBg) localStorage.setItem('nova_setting_MAP_PORTAL_BG', decoded.mapPortalBg);
        if (decoded.bossPortalBg) localStorage.setItem('nova_setting_BOSS_PORTAL_BG', decoded.bossPortalBg);

        // Sincronizar Base de Datos Local (Reliquias y Historial de Drops solicitado)
        if (decoded.localItems && Array.isArray(decoded.localItems)) {
          localStorage.setItem('nova_local_items', JSON.stringify(decoded.localItems));
        }
        if (decoded.localDrops && Array.isArray(decoded.localDrops)) {
          localStorage.setItem('nova_local_drops', JSON.stringify(decoded.localDrops));
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        alert("¡EL REINO HA SIDO SINCRONIZADO! Historial de reliquias y drops restaurado.");
        window.location.reload(); 
      } catch (e) {
        console.error("Fallo en el ritual de sincronización:", e);
      }
    }

    fetchItems();
    fetchBranding();
    const interval = setInterval(() => {
      fetchItems();
      fetchBranding();
    }, 30000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    if (activeTab === 'costumes') {
      const validClasses = CLASSES_BY_FACTION[selectedFaction] || [];
      if (validClasses.length > 0) {
        setSelectedClass(validClasses[0]);
      }
    } else {
      setSelectedClass('All');
    }
  }, [selectedFaction, activeTab]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Nova2296') setIsAdminAuthenticated(true);
    else alert('Contraseña incorrecta.');
  };

  const dynamicBgStyle = siteBg ? {
    backgroundImage: `linear-gradient(to bottom, rgba(5, 5, 7, 0.8), rgba(5, 5, 7, 0.6)), url('${siteBg}')`,
    backgroundAttachment: 'fixed' as const,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
    minHeight: '100vh'
  } : {};

  return (
    <div className={`min-h-screen flex flex-col relative transition-all duration-1000 ${siteBg ? '' : 'bg-shaiya-epic'}`} style={dynamicBgStyle}>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-grow container mx-auto px-4 py-12 relative z-10">
        {activeTab === 'droplist' && <DropList />}
        
        {activeTab !== 'report' && activeTab !== 'admin' && activeTab !== 'staff_app' && activeTab !== 'droplist' && (
          <>
            <header className="text-center mb-16 animate-fade-in">
              <h1 className="text-6xl md:text-8xl font-shaiya text-white mb-2 tracking-tighter drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]">
                {activeTab === 'promotions' ? 'PROMOCIONES' : 
                 activeTab === 'mounts' ? 'MONTURAS' : 
                 activeTab === 'costumes' ? 'TRAJES' : 'TRANSFORMACIONES'}
              </h1>
              <p className="text-[#d4af37] font-bold uppercase tracking-[8px] text-xs opacity-60">Biblioteca Sagrada de Etain</p>
            </header>

            {activeTab === 'costumes' && (
              <div className="max-w-4xl mx-auto glass-panel p-8 rounded-[2.5rem] mb-12 flex flex-wrap gap-6 justify-center animate-fade-in border-[#d4af37]/30">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest ml-1">Facción</label>
                  <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    <button onClick={() => setSelectedFaction(Faction.LIGHT)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedFaction === Faction.LIGHT ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'text-gray-500 hover:text-white'}`}>Luz</button>
                    <button onClick={() => setSelectedFaction(Faction.FURY)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedFaction === Faction.FURY ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-white'}`}>Furia</button>
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest ml-1">Clase</label>
                   <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-black/40 border border-white/5 p-3 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#d4af37] transition-colors cursor-pointer w-48">
                    <option value="All">Todas</option>
                    {(CLASSES_BY_FACTION[selectedFaction] || []).map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest ml-1">Género</label>
                   <select value={selectedGender} onChange={e => setSelectedGender(e.target.value)} className="bg-black/40 border border-white/5 p-3 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#d4af37] transition-colors cursor-pointer w-32">
                    <option value="All">Ambos</option>
                    <option value={Gender.MALE}>Hombres</option>
                    <option value={Gender.FEMALE}>Mujeres</option>
                   </select>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40 animate-pulse">
                <div className="w-20 h-20 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-8"></div>
                <p className="text-[#d4af37] font-shaiya text-3xl uppercase tracking-widest">Invocando reliquias...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10">
                {filteredItems.map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
                {filteredItems.length === 0 && (
                  <div className="col-span-full text-center py-32 opacity-30">
                    <p className="text-gray-500 font-shaiya text-4xl uppercase tracking-widest">Ninguna reliquia encontrada en este registro...</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'report' && (
          <div className="py-12"><BugReportForm /></div>
        )}

        {activeTab === 'staff_app' && (
          <div className="py-12"><StaffApplicationForm /></div>
        )}

        {activeTab === 'admin' && (
          <div className="py-12">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto glass-panel p-12 rounded-[3rem] text-center border-[#d4af37]/30 shadow-2xl">
                <h2 className="text-4xl font-shaiya text-white mb-8 uppercase tracking-widest">Portal Maestro</h2>
                <form onSubmit={handleAdminAuth} className="space-y-6">
                  <input type="password" placeholder="Runa Secreta" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37] text-center text-xl tracking-widest" />
                  <button className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all shadow-lg">Abrir Portal</button>
                </form>
              </div>
            ) : (
              <AdminPanel />
            )}
          </div>
        )}
      </main>

      <footer className="py-12 text-center text-gray-500 relative z-10 border-t border-white/5 bg-black/40">
        <p className="font-shaiya text-xl tracking-widest text-white/40 mb-2">SHAIYA NOVA</p>
        <p className="text-[9px] uppercase tracking-[5px] font-black opacity-30">El destino del reino está en tus manos • 2025</p>
      </footer>
    </div>
  );
};

export default App;
