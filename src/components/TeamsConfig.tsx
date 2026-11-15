import React, { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';

/**
 * Pantalla que Microsoft Teams muestra una sola vez, al agregar el juego a una
 * reunión. Le dice a Teams qué página debe abrir (la app normal) y habilita el
 * botón "Guardar". Se abre con la dirección /?teams=config
 */
export const TeamsConfig: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import('@microsoft/teams-js')
      .then(async ({ app, pages }) => {
        await app.initialize();
        const appUrl = `${window.location.origin}/`;

        pages.config.registerOnSaveHandler((saveEvent) => {
          pages.config
            .setConfig({
              entityId: 'amistad-biblica',
              contentUrl: appUrl,
              websiteUrl: appUrl,
              suggestedDisplayName: 'Amistad Bíblica'
            })
            .then(() => saveEvent.notifySuccess())
            .catch(() => saveEvent.notifyFailure('No se pudo guardar la configuración.'));
        });

        pages.config.setValidityState(true);
        app.notifySuccess();
        setReady(true);
      })
      .catch(() => {
        // Abierta fuera de Teams: solo se muestra el texto informativo
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-sm text-center">
        <span className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center">
          <HeartHandshake className="w-7 h-7" />
        </span>
        <h1 className="text-2xl font-bold font-cinzel text-amber-300 mb-2">Conexión Amistad Bíblica</h1>
        <p className="text-sm text-slate-300">
          {ready
            ? 'Todo listo. Pulsa «Guardar» para agregar el juego a esta reunión.'
            : 'Esta pantalla se usa al agregar el juego a una reunión de Microsoft Teams.'}
        </p>
      </div>
    </div>
  );
};
