
import React, { useState, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import ItemCard from './components/ItemCard';
import BugReportForm from './components/BugReportForm';
import AdminPanel from './components/AdminPanel';
import { getItemsFromDB } from './services/supabaseClient';
import { ITEMS as STATIC_ITEMS } from './constants';
import { Category, Faction, CLASSES_BY_FACTION, GameItem, Gender } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mounts');
  const [selectedFaction, setSelectedFaction] = useState<Faction>(Faction.LIGHT);
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [cloudItems, setCloudItems] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

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

  useEffect(() => {
    // 1. Lógica de Sincronización de Portal (Solo Configuración)
    const urlParams = new URLSearchParams(window.location.search);
    const syncData = urlParams.get('sync');
    
    if (syncData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(syncData))));
        if (decoded.webhook) localStorage.setItem('nova_setting_NOVA_WEBHOOK_URL', decoded.webhook);
        if (decoded.clientId) localStorage.setItem('nova_setting_DISCORD_CLIENT_ID', decoded.clientId);
        
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("¡Reino Sincronizado! Ahora verás los datos oficiales del portal en tiempo real.");
        window.location.reload(); 
      } catch (e) {
        console.error("Fallo en la sincronización:", e);
      }
    }

    // 2. Manejo de Retorno de Discord OAuth2
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (accessToken) {
      setIsLoading(true);
      fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      .then(res => res.json())
      .then(user => {
        const userData = {
          name: `${user.username}${user.discriminator !== '0' ? '#' + user.discriminator : ''}`,
          id: user.id,
          avatar: user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`
        };
        localStorage.setItem('nova_session', JSON.stringify(userData));
        window.location.hash = ''; 
        setActiveTab('report');
      })
      .catch(err => console.error("Error en login real de Discord:", err))
      .finally(() => setIsLoading(false));
    }

    fetchItems();
    // Refresco automático de objetos cada minuto para usuarios
    const interval = setInterval(fetchItems, 60000);
    return () => clearInterval(interval);
  }, []);

  const allItems = useMemo(() => {
    return [...STATIC_ITEMS, ...cloudItems];
  }, [cloudItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchesTab = 
        (activeTab === 'mounts' && item.category === Category.MOUNT) ||
        (activeTab === 'costumes' && item.category === Category.COSTUME) ||
        (activeTab === 'transformations' && item.category === Category.TRANSFORMATION);
      
      if (!matchesTab) return false;

      if (activeTab === 'costumes') {
        const matchesFaction = item.faction === selectedFaction;
        const matchesClass = selectedClass === 'All' || 
          item.item_class === selectedClass || 
          (item.classes && item.classes.includes(selectedClass));
        
        const matchesGender = selectedGender === 'All' || 
          item.gender === Gender.BOTH || 
          item.gender === selectedGender;

        return matchesFaction && matchesClass && matchesGender;
      }
      return true;
    });
  }, [activeTab, selectedFaction, selectedClass, selectedGender, allItems]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Nova2296') {
      setIsAdminAuthenticated(true);
    } else {
      alert('Contraseña de Administrador incorrecta.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-grow container mx-auto px-4 py-12 relative z-10">
        {activeTab !== 'report' && activeTab !== 'admin' && (
          <>
            <header className="text-center mb-16 animate-fade-in">
              <h1 className="text-6xl md:text-8xl font-shaiya text-white mb-2 tracking-tighter drop-shadow-[0_0_25px_rgba(212,175,55,0.5)]">
                {activeTab === 'mounts' ? 'MONTURAS' : activeTab === 'costumes' ? 'TRAJES' : 'TRANSFORMS'} <span className="text-[#d4af37]">NOVA</span>
              </h1>
              <p className="text-[#d4af37] max-w-2xl mx-auto uppercase tracking-[8px] text-[10px] font-bold opacity-70">
                La base de datos definitiva de Teos
              </p>
            </header>

            {activeTab === 'costumes' && (
              <div className="mb-12 glass-panel p-8 rounded-[2rem] border border-white/10 shadow-2xl animate-fade-in flex flex-col md:flex-row gap-8 items-center justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Facción</span>
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedFaction(Faction.LIGHT)} className={`px-6 py-2 rounded-lg font-bold uppercase text-xs transition-all ${selectedFaction === Faction.LIGHT ? 'bg-blue-600/40 border border-blue-400 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/40 border border-white/5 text-gray-500'}`}>Luz</button>
                    <button onClick={() => setSelectedFaction(Faction.FURY)} className={`px-6 py-2 rounded-lg font-bold uppercase text-xs transition-all ${selectedFaction === Faction.FURY ? 'bg-red-600/40 border border-red-400 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-black/40 border border-white/5 text-gray-500'}`}>Furia</button>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Clase</span>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="bg-black/60 border border-white/10 text-gray-200 p-2 rounded-lg outline-none font-bold uppercase text-[10px] tracking-widest w-48 hover:border-[#d4af37]/40 transition-all">
                    <option value="All">Todas</option>
                    {CLASSES_BY_FACTION[selectedFaction].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-2 font-black">Sexo</span>
                  <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                    <button onClick={() => setSelectedGender('All')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedGender === 'All' ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-white'}`}>Todos</button>
                    <button onClick={() => setSelectedGender(Gender.MALE)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedGender === Gender.MALE ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-white'}`}>Masc</button>
                    <button onClick={() => setSelectedGender(Gender.FEMALE)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedGender === Gender.FEMALE ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-white'}`}>Fem</button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-20 animate-pulse"><p className="text-[#d4af37] font-shaiya text-2xl">Abriendo los archivos de Etain...</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fade-in">
                {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'report' && <BugReportForm />}
        {activeTab === 'admin' && (
          <div className="py-10">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto glass-panel p-10 rounded-3xl border border-[#d4af37]/40 text-center animate-fade-in">
                <h2 className="text-2xl font-shaiya text-white mb-8 uppercase tracking-widest">Panel del Consejo</h2>
                <form onSubmit={handleAdminAuth} className="space-y-6">
                  <input type="password" placeholder="Contraseña de Maestro" className="w-full bg-black/80 border border-white/10 p-4 rounded-xl text-white text-center outline-none focus:border-[#d4af37]" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
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
          <p className="text-gray-600 text-[10px] uppercase tracking-[5px]">Portal de Sincronización Real v2.5</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
