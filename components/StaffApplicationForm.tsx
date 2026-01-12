
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

    const application = {
      id: `app-${Date.now()}`,
      username: formData.username,
      discord_id: discordUser.name,
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
      
      // Enviar Webhook de Postulación
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
                { name: "Nombre PJ", value: formData.username, inline: true },
                { name: "Puesto", value: formData.position, inline: true },
                { name: "Motivación", value: formData.motivation }
              ],
              footer: { text: "Revisar en Panel de Administración NOVA" }
            }]
          })
        });
      }

      setStatus('success');
    } catch (e) {
      setStatus('error');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto glass-panel p-16 rounded-[3rem] text-center border-[#d4af37]/30 shadow-2xl">
        <h2 className="text-4xl font-shaiya text-white mb-6 uppercase tracking-widest">Academia de Etain</h2>
        <p className="text-gray-400 text-sm mb-10 uppercase tracking-[4px]">Únete a las filas del Staff de NOVA. Identifícate para continuar.</p>
        <button onClick={handleLogin} className="w-full bg-[#5865F2] hover:bg-white hover:text-[#5865F2] text-white font-black py-5 rounded-2xl transition-all uppercase tracking-[4px]">Entrar con Discord</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto glass-panel p-12 rounded-[3rem] border-[#d4af37]/40 shadow-2xl animate-fade-in">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-shaiya text-[#d4af37] mb-2 uppercase tracking-[8px]">Formulario de Aplicación</h2>
        <p className="text-gray-500 text-[10px] uppercase tracking-[5px]">Responde con sabiduría y honestidad</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest">Nombre del Personaje</label>
            <input required className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest">Puesto Deseado</label>
            <select className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-white outline-none" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value as any})}>
              <option value="Game Sage">Game Sage (GS)</option>
              <option value="Lider Game Sage">Líder Game Sage</option>
              <option value="GM">Game Master (GM)</option>
            </select>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">1. ¿Qué experiencia tienes en Shaiya y en puestos similares?</label>
            <textarea required className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none min-h-[100px]" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">2. ¿Por qué quieres formar parte del Staff de NOVA?</label>
            <textarea required className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none min-h-[100px]" value={formData.motivation} onChange={e => setFormData({...formData, motivation: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">3. ¿Cómo resolverías una discusión acalorada entre dos facciones?</label>
            <textarea required className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none min-h-[100px]" value={formData.conflict} onChange={e => setFormData({...formData, conflict: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">4. ¿Cuántas horas diarias puedes dedicar al servidor?</label>
            <input required className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">5. ¿Qué podrías aportar tú que nadie más pueda?</label>
            <textarea required className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none min-h-[100px]" value={formData.contribution} onChange={e => setFormData({...formData, contribution: e.target.value})} />
          </div>
        </div>

        <button disabled={status === 'sending'} className="w-full bg-[#d4af37] text-black font-black py-6 rounded-[2rem] uppercase tracking-[8px] hover:bg-white transition-all shadow-2xl">
          {status === 'sending' ? 'Enviando Pergamino...' : 'Enviar Postulación'}
        </button>

        {status === 'success' && <p className="text-green-500 text-center font-black animate-bounce">¡Postulación recibida! El Consejo te contactará.</p>}
      </form>
    </div>
  );
};

export default StaffApplicationForm;
