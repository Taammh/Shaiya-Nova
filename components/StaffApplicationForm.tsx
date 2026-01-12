
import React, { useState, useEffect } from 'react';
import { StaffApplication } from '../types';
import { submitStaffApplication, getSetting } from '../services/supabaseClient';

const StaffApplicationForm: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [discordUser, setDiscordUser] = useState<{name: string, id: string, avatar: string} | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  const [formData, setFormData] = useState({
    username: '',
    position: 'Game Sage' as any,
    experience: '',
    motivation: '',
    conflict: '',
    availability: '',
    contribution: ''
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('nova_session');
    if (savedUser) {
      setDiscordUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async () => {
    const clientId = await getSetting('DISCORD_CLIENT_ID');
    if (!clientId) return alert("Admin debe configurar Client ID.");
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=identify`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) return;
    setStatus('sending');

    const application: Partial<StaffApplication> = {
      id: `app-${Date.now()}`,
      username: formData.username,
      discord_id: discordUser.name,
      discord_user_id: discordUser.id, // ID numérico capturado de la sesión
      position: formData.position,
      answers: {
        experience: formData.experience,
        motivation: formData.motivation,
        conflict: formData.conflict,
        availability: formData.availability,
        contribution: formData.contribution
      },
      status: 'pending',
      avatar_url: discordUser.avatar,
      created_at: new Date().toISOString()
    };

    try {
      await submitStaffApplication(application);
      
      const webhookUrl = await getSetting('NOVA_STAFF_APP_WEBHOOK');
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: "⚖️ Nueva Postulación al Staff",
              color: 0xd4af37,
              thumbnail: { url: discordUser.avatar },
              fields: [
                { name: "Candidato", value: discordUser.name, inline: true },
                { name: "Puesto", value: formData.position, inline: true },
                { name: "PJ", value: formData.username, inline: true }
              ]
            }]
          })
        });
      }
      setStatus('success');
    } catch { setStatus('error'); }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-16 rounded-[3rem] text-center border-[#d4af37]/30 shadow-2xl">
        <h2 className="text-4xl font-shaiya text-white mb-6 uppercase">Academia de Etain</h2>
        <button onClick={handleLogin} className="w-full bg-[#5865F2] hover:bg-white hover:text-[#5865F2] text-white font-black py-5 rounded-2xl transition-all uppercase">Identifícate con Discord</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto glass-panel p-12 rounded-[3rem] border-[#d4af37]/40 shadow-2xl animate-fade-in">
      <h2 className="text-5xl font-shaiya text-[#d4af37] mb-12 text-center uppercase tracking-widest">Aplicación de Staff</h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <input required placeholder="Nombre Personaje" className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          <select className="bg-black/60 border border-white/10 p-5 rounded-2xl text-white" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value as any})}>
            <option value="Game Sage">Game Sage (GS)</option>
            <option value="Lider Game Sage">Líder Game Sage</option>
            <option value="GM">Game Master (GM)</option>
          </select>
        </div>
        <textarea required placeholder="Experiencia en Shaiya..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white min-h-[100px]" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} />
        <textarea required placeholder="¿Por qué NOVA?..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white min-h-[100px]" value={formData.motivation} onChange={e => setFormData({...formData, motivation: e.target.value})} />
        <textarea required placeholder="Resolución de conflictos..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white min-h-[100px]" value={formData.conflict} onChange={e => setFormData({...formData, conflict: e.target.value})} />
        <input required placeholder="Disponibilidad Horaria" className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white" value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} />
        <textarea required placeholder="Tu aporte único..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white min-h-[100px]" value={formData.contribution} onChange={e => setFormData({...formData, contribution: e.target.value})} />
        <button disabled={status === 'sending'} className="w-full bg-[#d4af37] text-black font-black py-6 rounded-[2rem] uppercase tracking-widest hover:bg-white transition-all">
          {status === 'sending' ? 'Enviando...' : 'Enviar Postulación'}
        </button>
        {status === 'success' && <p className="text-green-500 text-center font-black uppercase">¡Entregado con éxito!</p>}
      </form>
    </div>
  );
};

export default StaffApplicationForm;
