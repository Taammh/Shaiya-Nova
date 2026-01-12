
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Shaiya NOVA Bootstrapping...");

const startApp = () => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error("Critical Error: No root element found.");
    return;
  }

  try {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("App mounted successfully.");
  } catch (error) {
    console.error("Critical mounting error:", error);
    rootElement.innerHTML = `
      <div style="color: white; padding: 40px; text-align: center; font-family: 'MedievalSharp', cursive; background: #050507; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h1 style="color: #d4af37; font-size: 32px; margin-bottom: 20px;">ERROR DE INVOCACIÓN</h1>
        <p style="color: #888; margin-bottom: 20px;">El Reino ha rechazado la conexión.</p>
        <div style="background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); padding: 15px; border-radius: 8px; font-family: monospace; font-size: 14px; max-width: 80%; overflow-x: auto;">
          ${error instanceof Error ? error.stack || error.message : String(error)}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 30px; background: #d4af37; color: black; padding: 10px 20px; border: none; font-weight: bold; cursor: pointer;">REINTENTAR</button>
      </div>
    `;
  }
};

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
