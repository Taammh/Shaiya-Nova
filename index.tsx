
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Reino de NOVA manifestado.");
  } catch (error) {
    console.error("Error crítico de montaje:", error);
    rootElement.innerHTML = `<div style="color:white;text-align:center;padding:50px;">Fallo al renderizar el reino.</div>`;
  }
} else {
  console.error("No se encontró el portal sagrado (root element).");
}
