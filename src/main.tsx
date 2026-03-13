import { createRoot } from "react-dom/client";

// Redirect logic for domain transition
if (typeof window !== 'undefined' && window.location.hostname === 'qualify.onixagence.com') {
  window.location.replace(`https://qualify.marketing${window.location.pathname}${window.location.search}`);
}

import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Hide splash screen when app is ready
const hideSplashScreen = () => {
  const splash = document.getElementById('splash-screen');
  const root = document.getElementById('root');
  
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 400);
  }
  
  // Ativar animação de entrada do conteúdo
  if (root) {
    root.classList.add('content-ready');
  }
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Hide splash after minimum display time for branding
setTimeout(hideSplashScreen, 800);
