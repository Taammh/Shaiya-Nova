
import React, { useState, useEffect } from 'react';
import { getSetting } from '../services/supabaseClient';

interface NavbarProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
}

const Navbar: React.FC<NavbarProps> = ({ onTabChange, activeTab }) => {
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      const logo = await getSetting('SITE_LOGO_URL');
      if (logo) setSiteLogo(logo);
    };
    fetchLogo();
    const interval = setInterval(fetchLogo, 10000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'promotions', label: 'Promociones' },
    { id: 'mounts', label: 'Monturas' },
    { id: 'costumes', label: 'Trajes' },
    { id: 'transformations', label: 'Transformaciones' },
    { id: 'droplist', label: 'Drop List' },
    { id: 'report', label: 'Soporte' },
    { id: 'staff_app', label: 'Postulación' },
    { id: 'admin', label: 'Administración' }
  ];

  const DEFAULT_LOGO = "https://media.discordapp.net/attachments/1460068773175492641/1460108067541614672/LOGONOVA.png?ex=6965b71a&is=6964659a&hm=e93b9b33dbe74f5b1fb24ed1370181206f078f5ef2fd9aceabdbe1e9f4e44268&=&format=webp&quality=lossless&width=927&height=465";

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-[#d4af37]/30 shadow-2xl shadow-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onTabChange('mounts')}>
            <img 
              src={siteLogo || DEFAULT_LOGO} 
              alt="Shaiya NOVA Logo" 
              className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.4)] group-hover:scale-110 transition-transform duration-500"
            />
            <span className="text-2xl font-shaiya tracking-widest text-[#d4af37] hidden lg:block">
              SHAIYA <span className="text-white">NOVA</span>
            </span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-1 sm:px-3 py-2 text-[8px] sm:text-[10px] md:text-xs font-bold transition-all duration-300 hover:text-[#d4af37] uppercase tracking-widest border-b-2 ${
                  activeTab === tab.id ? 'text-[#d4af37] border-[#d4af37]' : 'text-gray-400 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
