
import { SupportRequest } from '../types';
import { getSetting } from './supabaseClient';

export const sendDiscordReport = async (report: SupportRequest): Promise<boolean> => {
  const WEBHOOK_URL = await getSetting('NOVA_WEBHOOK_URL');

  if (!WEBHOOK_URL) {
    alert("Error: Webhook de Discord no configurado. Contacta al administrador.");
    return false;
  }

  const color = 
    report.type === 'Bug' ? 0xff0000 : 
    report.type === 'Reportar Usuario' ? 0xffa500 : 
    report.type === 'Donación' ? 0x00ff00 : 0x3498db;

  const embed = {
    title: `🛡️ Nuevo Ticket de Soporte - ${report.type}`,
    color: color,
    thumbnail: { url: report.avatarUrl || "" },
    fields: [
      { name: '👤 Personaje', value: report.username, inline: true },
      { name: '🆔 Discord ID', value: report.discordId, inline: true },
      { name: '📝 Descripción', value: report.description }
    ],
    footer: { text: "Sistema de Soporte Shaiya NOVA" },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    return response.ok;
  } catch (error) {
    console.error("Discord Error:", error);
    return false;
  }
};
