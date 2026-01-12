
import React, { useState, useEffect } from 'react';
import { SupportRequest } from '../types';
import { sendDiscordReport } from '../services/discordService';
import { getSetting } from '../services/supabaseClient';

const BugReportForm: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [discordUser, setDiscordUser] = useState<{name: string, id: string, avatar: string} | null>(null);
  const [clientId, setClientId] = useState('');
  
  const [formData, setFormData] = useState<SupportRequest>({
    username: '',
    type: 'Bug',
    description: '',
    discordId: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const savedUser = localStorage.getItem('nova_session');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setDiscordUser(user);
      setIsLoggedIn(true);
      setFormData(prev => ({ ...prev, discordId: user.name }));
    }

    const loadClientId = async () => {
      const cid = await getSetting('DISCORD_CLIENT_ID');
      if (cid) setClientId(cid);
    };
    loadClientId();
  }, []);

  const handleDiscordLogin = () => {
    if (!clientId) {
      alert("Error: El Administrador debe configurar el Discord Client ID para habilitar el login real.");
      return;
    }

    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    const scope = encodeURIComponent('identify');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    
    // Redirección real al portal de Discord
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_session');
    setIsLoggedIn(false);
    setDiscordUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) return;
    setStatus('sending');
    const success = await sendDiscordReport({
      ...formData,
      discordId: discordUser.name,
      avatarUrl: discordUser.avatar
    });
    if (success) {
      setStatus('success');
      setFormData(prev => ({ ...prev, username: '', description: '' }));
      setTimeout(() => setStatus('idle'), 5000);
    } else {
      setStatus('error');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-16 rounded-[3rem] text-center space-y-10 animate-fade-in shadow-[0_0_60px_rgba(88,101,242,0.2)] border-[#5865F2]/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#5865F2]"></div>
        
        <div className="w-32 h-32 bg-[#5865F2] rounded-full mx-auto flex items-center justify-center shadow-2xl animate-glow">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.003 14.003 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
          </svg>
        </div>

        <div>
          <h2 className="text-4xl font-shaiya text-white mb-4 uppercase tracking-[8px]">Acceso Requerido</h2>
          <p className="text-gray-400 text-xs uppercase tracking-[4px]">Debes iniciar sesión con tu cuenta real de Discord para contactar con los Maestros.</p>
        </div>

        <button 
          onClick={handleDiscordLogin}
          className="w-full bg-[#5865F2] hover:bg-white hover:text-[#5865F2] text-white font-black py-6 rounded-2xl transition-all uppercase tracking-[3px] shadow-xl"
        >
          Ir a Discord (Login Real)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto glass-panel p-10 rounded-[3rem] border-[#d4af37]/40 shadow-2xl relative animate-fade-in">
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <img src={discordUser?.avatar} className="w-16 h-16 rounded-2xl border-2 border-[#d4af37] shadow-lg" alt="Avatar" />
          <div>
            <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[4px]">Sesión Activa</p>
            <p className="text-white text-2xl font-shaiya">{discordUser?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-gray-500 text-xs hover:text-red-400 font-bold uppercase transition-colors">Cerrar Sesión</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Nombre In-game</label>
            <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]" placeholder="Ej: NovaKnight" />
          </div>
          <div className="space-y-2">
            <label className="block text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Categoría</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37]">
              <option value="Bug">Error del Juego</option>
              <option value="Reportar Usuario">Denuncia</option>
              <option value="Donación">Ofrenda / Donación</option>
              <option value="Otro">Otros Asuntos</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Descripción</label>
          <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={5} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37] resize-none" placeholder="Escribe tu mensaje aquí..."></textarea>
        </div>
        <button disabled={status === 'sending'} className="w-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] hover:brightness-125 transition-all shadow-xl">
          {status === 'sending' ? 'Enviando...' : 'Entregar Ticket'}
        </button>
        {status === 'success' && <p className="text-green-400 text-center font-black animate-bounce mt-4 tracking-widest uppercase">¡Mensaje enviado con éxito!</p>}
        {status === 'error' && <p className="text-red-400 text-center font-black mt-4 tracking-widest uppercase text-xs">Error: Webhook no configurado o inválido.</p>}
      </form>
    </div>
  );
};

export default BugReportForm;
