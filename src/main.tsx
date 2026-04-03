import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const hideSplashScreen = () => {
  const splash = document.getElementById('splash-screen');
  const root = document.getElementById('root');
  
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 400);
  }
  
  if (root) {
    root.classList.add('content-ready');
  }
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

setTimeout(() => {
  hideSplashScreen();
}, 800);
