
import React, { useState, useEffect } from 'react';
import { SupportRequest } from '../types';
import { sendDiscordReport } from '../services/discordService';

const BugReportForm: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [discordUser, setDiscordUser] = useState<{name: string, id: string, avatar: string} | null>(null);
  const [formData, setFormData] = useState<SupportRequest>({
    username: '',
    type: 'Bug',
    description: '',
    discordId: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Simulated Discord Login
  const handleDiscordLogin = () => {
    // In a real app this would trigger OAuth
    const simulatedName = "NovaUser_" + Math.floor(Math.random() * 9999);
    const simulatedId = "48392" + Math.floor(Math.random() * 1000000);
    const simulatedAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${simulatedName}`;
    
    setDiscordUser({ name: simulatedName, id: simulatedId, avatar: simulatedAvatar });
    setFormData(prev => ({ ...prev, discordId: simulatedName }));
    setIsLoggedIn(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) return;
    setStatus('sending');
    const success = await sendDiscordReport({
      ...formData,
      discordId: `${discordUser.name} (${discordUser.id})`,
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
      <div className="max-w-xl mx-auto glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-8 animate-fade-in">
        <div className="w-24 h-24 bg-[#5865F2] rounded-full mx-auto flex items-center justify-center shadow-xl shadow-[#5865F2]/20">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.003 14.003 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-shaiya text-white mb-2">Portal de Soporte</h2>
          <p className="text-gray-400 text-sm uppercase tracking-widest leading-relaxed">Debes iniciar sesión con Discord para contactar con los administradores de NOVA.</p>
        </div>
        <button 
          onClick={handleDiscordLogin}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-[#5865F2]/20"
        >
          Iniciar sesión con Discord
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-[#d4af37]/20 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#d4af37] via-white to-[#d4af37]"></div>
      
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={discordUser?.avatar} className="w-12 h-12 rounded-full border border-[#d4af37]/50 shadow-md" alt="Discord Avatar" />
          <div>
            <p className="text-[#d4af37] text-xs font-bold uppercase">Sesión Iniciada</p>
            <p className="text-white font-bold">{discordUser?.name}</p>
          </div>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="text-gray-500 text-[10px] uppercase hover:text-white transition-colors">Cerrar Sesión</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase mb-2">Nombre Personaje (In-game)</label>
            <input 
              required
              type="text"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              className="w-full bg-black/50 border border-white/10 focus:border-[#d4af37] text-white p-3 rounded-xl transition-all outline-none"
              placeholder="Ej: LiderNova"
            />
          </div>
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase mb-2">Motivo</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
              className="w-full bg-black/50 border border-white/10 focus:border-[#d4af37] text-white p-3 rounded-xl transition-all outline-none"
            >
              <option value="Bug">Reportar Bug</option>
              <option value="Reportar Usuario">Reportar Usuario</option>
              <option value="Donación">Duda Donación</option>
              <option value="Otro">Otros</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[#d4af37] text-[10px] font-bold uppercase mb-2">Detalles del Requerimiento</label>
          <textarea 
            required
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            rows={5}
            className="w-full bg-black/50 border border-white/10 focus:border-[#d4af37] text-white p-3 rounded-xl transition-all outline-none resize-none"
            placeholder="Explica detalladamente tu caso..."
          ></textarea>
        </div>

        <button 
          disabled={status === 'sending'}
          className="w-full bg-gradient-to-r from-[#d4af37] to-[#8a6d3b] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-black font-black py-4 rounded-xl transition-all duration-300 uppercase tracking-[4px] disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando al Reino...' : 'Enviar Mensaje'}
        </button>

        {status === 'success' && (
          <div className="p-4 bg-green-900/40 border border-green-500 rounded-xl text-green-300 text-center text-xs font-bold uppercase animate-bounce">
            ¡Mensaje enviado con éxito!
          </div>
        )}
      </form>
    </div>
  );
};

export default BugReportForm;
