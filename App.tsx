
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

        window.history.replaceState({}, document.title, window.location.pathname);
        alert("¡REINO SINCRONIZADO!");
        window.location.reload(); 
      } catch (e) {
        console.error("Error en sincronización:", e);
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
        // Normalización para evitar fallos por espacios o mayúsculas/minúsculas
        const itemClassClean = (item.item_class || '').trim();
        const selectedClassClean = (selectedClass || '').trim();
        
        let matchesClass = selectedClass === 'All' ? true : itemClassClean === selectedClassClean;
        const matchesGender = selectedGender === 'All' || item.gender === Gender.BOTH || item.gender === selectedGender;
        return matchesFaction && matchesClass && matchesGender;
      }
      return true;
    });
  }, [activeTab, selectedFaction, selectedClass, selectedGender, allItems]);

  // Sincronizar clase seleccionada al cambiar facción en trajes
  useEffect(() => {
    if (activeTab === 'costumes') {
      setSelectedClass(CLASSES_BY_FACTION[selectedFaction][0]);
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
              <h1 className="text-6xl md:text-8xl font-shaiya text-white mb-2 tracking-tighter drop-shadow-[0_0_25px_rgba(212,175,55,0.5)] uppercase">
                {activeTab === 'promotions' ? 'OFERTAS' : activeTab === 'mounts' ? 'MONTURAS' : activeTab === 'costumes' ? 'TRAJES' : 'TRANSFORMS'} <span className="text-[#d4af37]">NOVA</span>
              </h1>
              <p className="text-[#d4af37] max-w-2xl mx-auto uppercase tracking-[8px] text-[10px] font-bold opacity-70">
                {activeTab === 'promotions' ? 'Promociones de AP Activas' : 'La base de datos definitiva de Teos'}
              </p>
            </header>

            {activeTab === 'costumes' && (
              <div className="mb-12 glass-panel p-8 rounded-[2rem] border border-white/10 shadow-2xl animate-fade-in flex flex-col md:flex-row gap-8 items-center justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Facción</span>
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedFaction(Faction.LIGHT)} className={`px-6 py-2 rounded-lg font-bold uppercase text-xs transition-all ${selectedFaction === Faction.LIGHT ? 'bg-blue-600/40 border border-blue-400 text-blue-100 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-black/40 text-gray-500'}`}>Luz</button>
                    <button onClick={() => setSelectedFaction(Faction.FURY)} className={`px-6 py-2 rounded-lg font-bold uppercase text-xs transition-all ${selectedFaction === Faction.FURY ? 'bg-red-600/40 border border-red-400 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-black/40 text-gray-500'}`}>Furia</button>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Clase</span>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="bg-black/60 border border-white/10 text-gray-200 p-2 rounded-lg outline-none font-bold uppercase text-[10px] w-48 h-10 cursor-pointer hover:border-[#d4af37]/50 transition-colors">
                    {(CLASSES_BY_FACTION[selectedFaction] || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Sexo</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedGender('All')} className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] transition-all border ${selectedGender === 'All' ? 'border-[#d4af37] bg-[#d4af37]/20 text-white' : 'border-white/5 bg-black/40 text-gray-500'}`}>Todos</button>
                    <button onClick={() => setSelectedGender(Gender.MALE)} className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] transition-all border ${selectedGender === Gender.MALE ? 'border-[#d4af37] bg-[#d4af37]/20 text-white' : 'border-white/5 bg-black/40 text-gray-500'}`}>Masculino</button>
                    <button onClick={() => setSelectedGender(Gender.FEMALE)} className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] transition-all border ${selectedGender === Gender.FEMALE ? 'border-[#d4af37] bg-[#d4af37]/20 text-white' : 'border-white/5 bg-black/40 text-gray-500'}`}>Femenino</button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-20 animate-pulse"><p className="text-[#d4af37] font-shaiya text-2xl">Cargando el Reino...</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fade-in">
                {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'report' && <BugReportForm />}
        {activeTab === 'staff_app' && <StaffApplicationForm />}
        {activeTab === 'admin' && (
          <div className="py-10">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto glass-panel p-10 rounded-3xl border border-[#d4af37]/40 text-center">
                <h2 className="text-2xl font-shaiya text-white mb-8 uppercase tracking-widest">Panel del Consejo</h2>
                <form onSubmit={handleAdminAuth} className="space-y-6">
                  <input type="password" placeholder="Contraseña de Maestro" className="w-full bg-black/80 border border-white/10 p-4 rounded-xl text-white text-center outline-none" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                  <button className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all">Acceder</button>
                </form>
              </div>
            ) : <AdminPanel />}
          </div>
        )}
      </main>
      <footer className="bg-black/95 py-12 border-t border-[#d4af37]/30 mt-20 relative z-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[#d4af37] font-shaiya text-2xl mb-2 tracking-widest">SHAIYA NOVA DATABASE</p>
          <p className="text-gray-600 text-[10px] uppercase tracking-[5px]">Portal de Sincronización Real v4.7</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
