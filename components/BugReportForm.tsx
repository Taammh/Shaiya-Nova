
import React, { useState, useEffect } from 'react';
import { SupportRequest } from '../types';
import { sendDiscordReport } from '../services/discordService';

const BugReportForm: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [discordUser, setDiscordUser] = useState<{name: string, id: string, avatar: string} | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
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
  }, []);

  const handleDiscordAuth = () => {
    setIsLoggingIn(true);
    
    // Simulamos la apertura de una ventana de Discord OAuth2
    const width = 500;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const authWindow = window.open(
      'about:blank',
      'DiscordAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (authWindow) {
      authWindow.document.write(`
        <html>
          <head>
            <title>Autorizar Shaiya NOVA</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>@import url('https://fonts.googleapis.com/css2?family=GG+Sans:wght@400;700&display=swap'); body { font-family: 'GG Sans', sans-serif; background: #313338; color: white; }</style>
          </head>
          <body class="flex flex-col items-center justify-center h-screen p-8 text-center">
            <div class="mb-8 animate-bounce">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.003 14.003 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/></svg>
            </div>
            <h1 class="text-2xl font-bold mb-4">¿Quieres conectar tu cuenta?</h1>
            <p class="text-gray-400 mb-8 px-4">Shaiya NOVA recibirá tu nombre de usuario y avatar para los tickets de soporte.</p>
            <div class="bg-[#2b2d31] w-full rounded-lg p-4 mb-8 text-left space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-sm">Acceder a tu nombre de usuario</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-sm">Acceder a tu avatar</span>
              </div>
            </div>
            <button id="authBtn" class="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded transition-colors mb-4">Autorizar</button>
            <button onclick="window.close()" class="text-sm text-gray-400 hover:underline">Cancelar</button>
            <script>
              document.getElementById('authBtn').onclick = () => {
                const name = "NovaUser_" + Math.floor(1000 + Math.random() * 9000);
                const result = {
                  name: name,
                  id: Math.random().toString(36).substr(2, 9),
                  avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + name
                };
                window.opener.postMessage(result, "*");
                window.close();
              };
            </script>
          </body>
        </html>
      `);
    }

    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.name && event.data.avatar) {
        const userData = event.data;
        localStorage.setItem('nova_session', JSON.stringify(userData));
        setDiscordUser(userData);
        setFormData(prev => ({ ...prev, discordId: userData.name }));
        setIsLoggedIn(true);
        setIsLoggingIn(false);
        window.removeEventListener('message', messageHandler);
      }
    };

    window.addEventListener('message', messageHandler);
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
      <div className="max-w-xl mx-auto glass-panel p-16 rounded-[3rem] text-center space-y-10 animate-fade-in shadow-[0_0_50px_rgba(88,101,242,0.15)] border-[#5865F2]/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#5865F2] to-transparent"></div>
        
        <div className="w-32 h-32 bg-[#5865F2] rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-[#5865F2]/40 animate-pulse cursor-pointer hover:scale-105 transition-transform" onClick={handleDiscordAuth}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.003 14.003 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
          </svg>
        </div>

        <div>
          <h2 className="text-4xl font-shaiya text-white mb-4 uppercase tracking-[8px]">Soporte Obligatorio</h2>
          <p className="text-gray-400 text-xs uppercase tracking-[4px] leading-relaxed">Debes iniciar sesión con Discord para que los Maestros de NOVA puedan identificarte.</p>
        </div>

        <button 
          onClick={handleDiscordAuth}
          disabled={isLoggingIn}
          className="w-full bg-[#5865F2] hover:bg-white hover:text-[#5865F2] text-white font-black py-6 rounded-[1.5rem] transition-all uppercase tracking-[3px] shadow-xl disabled:opacity-50"
        >
          {isLoggingIn ? 'Invocando Ventana...' : 'Iniciar Sesión con Discord'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto glass-panel p-10 rounded-[3rem] border-[#d4af37]/40 shadow-2xl relative animate-fade-in">
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="relative">
            <img src={discordUser?.avatar} className="w-16 h-16 rounded-2xl border-2 border-[#d4af37] shadow-lg shadow-[#d4af37]/20" alt="Avatar" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-[#0a0a0c] rounded-full"></div>
          </div>
          <div>
            <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[4px]">Héroe Identificado</p>
            <p className="text-white text-2xl font-shaiya">{discordUser?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-gray-500 text-xs hover:text-red-400 font-bold uppercase tracking-tighter transition-colors">Cerrar Sesión</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Identidad del Personaje</label>
            <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37] transition-all" placeholder="Nombre en el juego" />
          </div>
          <div className="space-y-2">
            <label className="block text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Tipo de Petición</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37] cursor-pointer">
              <option value="Bug">Reportar Error Crítico</option>
              <option value="Reportar Usuario">Reportar Conducta</option>
              <option value="Donación">Petición de Ofrenda</option>
              <option value="Otro">Consulta a los Sabios</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Mensaje para el Consejo</label>
          <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={5} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-[#d4af37] resize-none transition-all" placeholder="Detalla los eventos ocurridos..."></textarea>
        </div>
        <button disabled={status === 'sending'} className="w-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[6px] hover:brightness-125 transition-all disabled:opacity-50 shadow-xl shadow-[#d4af37]/10">
          {status === 'sending' ? 'Transmitiendo...' : 'Entregar Pergamino'}
        </button>
        {status === 'success' && <p className="text-green-400 text-center font-black animate-bounce mt-4 tracking-widest uppercase text-sm">¡El pergamino ha sido entregado!</p>}
        {status === 'error' && <p className="text-red-400 text-center font-black mt-4 tracking-widest uppercase text-xs">Error de transmisión. Revisa el Webhook.</p>}
      </form>
    </div>
  );
};

export default BugReportForm;
