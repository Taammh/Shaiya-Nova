
import React, { useState, useEffect } from 'react';
import { SupportRequest } from '../types';
import { sendDiscordReport } from '../services/discordService';

const BugReportForm: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [discordUser, setDiscordUser] = useState<{name: string, id: string, avatar: string} | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [manualDiscordTag, setManualDiscordTag] = useState('');
  
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

  const handleFinishLogin = () => {
    if (!manualDiscordTag.includes('#') && manualDiscordTag.length < 3) {
      alert("Por favor, introduce un Discord Tag válido (Ej: Nova#1234)");
      return;
    }

    const userData = { 
      name: manualDiscordTag, 
      id: Math.random().toString(36).substr(2, 9), 
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${manualDiscordTag}` 
    };
    
    localStorage.setItem('nova_session', JSON.stringify(userData));
    setDiscordUser(userData);
    setFormData(prev => ({ ...prev, discordId: manualDiscordTag }));
    setIsLoggedIn(true);
    setShowLoginModal(false);
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
      <div className="max-w-xl mx-auto glass-panel p-12 rounded-3xl text-center space-y-8 animate-fade-in shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#5865F2]/10 rounded-full blur-3xl"></div>
        
        <div className="w-24 h-24 bg-[#5865F2] rounded-[2rem] mx-auto flex items-center justify-center shadow-xl shadow-[#5865F2]/30 animate-pulse">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.003 14.003 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
          </svg>
        </div>

        <div>
          <h2 className="text-4xl font-shaiya text-white mb-4 tracking-tighter">VINCULAR ALMA</h2>
          <p className="text-[#d4af37] text-xs uppercase tracking-[4px] opacity-70">Autoriza el acceso a tu esencia de Discord para continuar.</p>
        </div>

        {!showLoginModal ? (
          <button 
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-black py-5 rounded-2xl transition-all uppercase tracking-widest shadow-lg active:scale-95"
          >
            Conectar con Discord
          </button>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <input 
              type="text"
              placeholder="Tu Discord Tag (Ej: Nova#1234)"
              className="w-full bg-black/60 border border-white/20 p-4 rounded-xl text-white text-center outline-none focus:border-[#5865F2]"
              value={manualDiscordTag}
              onChange={e => setManualDiscordTag(e.target.value)}
            />
            <button 
              onClick={handleFinishLogin}
              className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest"
            >
              Confirmar Identidad
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-[#d4af37]/30 shadow-2xl relative animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <img src={discordUser?.avatar} className="w-14 h-14 rounded-full border-2 border-[#d4af37]" alt="Avatar" />
          <div>
            <p className="text-[#d4af37] text-[10px] font-bold uppercase tracking-widest">Identidad Verificada</p>
            <p className="text-white text-xl font-shaiya">{discordUser?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-gray-500 text-xs hover:text-red-400 font-bold uppercase tracking-tighter">Cerrar Sesión</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase mb-2 tracking-widest">Nombre del Héroe</label>
            <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]" placeholder="Tu PJ Principal" />
          </div>
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase mb-2 tracking-widest">Tipo de Reporte</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]">
              <option value="Bug">Reportar Error</option>
              <option value="Reportar Usuario">Reportar Usuario</option>
              <option value="Donación">Donación / Ofrenda</option>
              <option value="Otro">Consulta General</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[#d4af37] text-[10px] font-bold uppercase mb-2 tracking-widest">Descripción</label>
          <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#d4af37] resize-none" placeholder="Describe los detalles para los Administradores..."></textarea>
        </div>
        <button disabled={status === 'sending'} className="w-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black py-5 rounded-2xl uppercase tracking-[4px] hover:brightness-110 disabled:opacity-50">
          {status === 'sending' ? 'Enviando al Reino...' : 'Enviar Pergamino'}
        </button>
        {status === 'success' && <p className="text-green-400 text-center font-bold animate-bounce mt-4">¡Enviado con éxito!</p>}
        {status === 'error' && <p className="text-red-400 text-center font-bold mt-4">Error al enviar. Verifica el Webhook en el Panel Admin.</p>}
      </form>
    </div>
  );
};

export default BugReportForm;
