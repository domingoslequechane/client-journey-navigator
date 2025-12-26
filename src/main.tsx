import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
