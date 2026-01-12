
import { SupportRequest } from '../types';
import { getSetting } from './supabaseClient';

export const sendDiscordReport = async (report: SupportRequest): Promise<boolean> => {
  const WEBHOOK_URL = await getSetting('NOVA_WEBHOOK_URL');

  if (!WEBHOOK_URL) {
    alert("Error: Webhook de Discord no configurado en el Panel de Administración.");
    return false;
  }

  const color = 
    report.type === 'Bug' ? 0xff4444 : 
    report.type === 'Reportar Usuario' ? 0xffa500 : 
    report.type === 'Donación' ? 0x00ff00 : 0x3498db;

  const embed = {
    title: `🛡️ Nuevo Ticket de Soporte en NOVA`,
    description: `Se ha recibido un mensaje de un héroe del reino.`,
    color: color,
    thumbnail: { url: report.avatarUrl || "https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback" },
    author: {
      name: report.discordId,
      icon_url: report.avatarUrl
    },
    fields: [
      { name: '🔖 Categoría', value: `\`${report.type}\``, inline: true },
      { name: '👤 Nombre PJ', value: `**${report.username}**`, inline: true },
      { name: '📝 Mensaje', value: `>>> ${report.description}` }
    ],
    footer: { text: "NOVA Database Security System" },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: "Portal de NOVA",
        avatar_url: "https://media.discordapp.net/attachments/1460068773175492641/1460108067541614672/LOGONOVA.png",
        embeds: [embed] 
      })
    });
    return response.ok;
  } catch (error) {
    console.error("Discord Error:", error);
    return false;
  }
};
