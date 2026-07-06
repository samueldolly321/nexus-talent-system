import {StrictMode, type ReactElement} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ApplyView from './components/ApplyView.tsx';
import PrivacyView from './components/PrivacyView.tsx';
import SupportView from './components/SupportView.tsx';
import './index.css';

// Pas de librairie de routage dans ce projet : on associe simplement quelques
// chemins publics (sans auth) à leur vue ; tout le reste rend l'application.
const pageMap: Record<string, ReactElement> = {
  '/postuler': <ApplyView />,
  '/confidentialite': <PrivacyView />,
  '/support': <SupportView />,
};
const publicPage = pageMap[window.location.pathname];

// Le mode sombre est appliqué ici, au niveau racine, pour qu'il s'applique
// aussi bien à App (espace recruteur, avec l'interrupteur dans la sidebar)
// qu'à ApplyView (page publique /postuler, sans interrupteur) : les deux
// doivent respecter la préférence déjà choisie. App.tsx gère ensuite la
// bascule et la persistance quand l'utilisateur clique sur l'interrupteur.
const storedPreference = window.localStorage.getItem('nexus-dark-mode');
const prefersDark = storedPreference !== null
  ? storedPreference === 'true'
  : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
document.documentElement.classList.toggle('dark', prefersDark);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicPage ?? <App />}
  </StrictMode>,
);
