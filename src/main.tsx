import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {TeamsConfig} from './components/TeamsConfig.tsx';
import './index.css';

// /?teams=config es la pantalla que Teams abre al agregar el juego a una reunión
const isTeamsConfig = new URLSearchParams(window.location.search).get('teams') === 'config';

// Dentro de Teams la app corre en un marco: se le avisa a Teams que ya cargó.
// En un navegador normal este bloque no hace nada.
if (window.self !== window.top && !isTeamsConfig) {
  import('@microsoft/teams-js')
    .then(({app}) => app.initialize().then(() => app.notifySuccess()))
    .catch(() => {
      // marco que no es de Teams: se ignora
    });
}

createRoot(document.getElementById('root')!).render(isTeamsConfig ? <TeamsConfig /> : <App />);
