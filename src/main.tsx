import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ApplyView from './components/ApplyView.tsx';
import './index.css';

// Pas de librairie de routage dans ce projet : on distingue simplement la
// page publique de candidature (/postuler) de l'application principale.
const isPublicApplyPage = window.location.pathname === '/postuler';

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
    {isPublicApplyPage ? <ApplyView /> : <App />}
  </StrictMode>,
);
