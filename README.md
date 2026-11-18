# Conexión Amistad Bíblica · Desafío Teams

Juego en vivo para el Día del Amigo, pensado para unas 20 personas en una reunión de Microsoft Teams.

- **Juego principal:** cada participante ordena las frases de 4 versículos. El menor tiempo final (tiempo real + castigo por errores) define la tabla oficial.
- **Rondas extra:** rompecabezas bíblico de 24 piezas y "¿Quién es el personaje?" (sin que el pastor caiga del puente).
- El líder puede cambiar los versículos y los tiempos desde la sala de espera.

## Probar en tu computador

Requisito: Node.js 20 o superior.

```
npm install --legacy-peer-deps
npm run dev
```

Abre http://localhost:3000

## Publicar en Render (gratis)

Servicio web conectado a este repositorio de GitHub:

| Campo | Valor |
| --- | --- |
| Build Command | `npm install --legacy-peer-deps && npm run build` |
| Start Command | `npm start` |
| Variable `HOST_KEY` (opcional) | la clave de líder para crear salas |

La clave de líder se escribe solo en Render (Environment). Nunca se sube a GitHub.

Si Render no publica solo después de un `git push`: **Manual Deploy → Deploy latest commit**.

## App para Teams

La carpeta `teams/` tiene el manifiesto y los íconos. Para subirla a Teams se comprimen esos 3 archivos (`manifest.json`, `color.png`, `outline.png`) en un .zip, sin carpeta adentro, y se carga en **Aplicaciones → Administrar sus aplicaciones → Cargar una aplicación**.

Si la organización no permite apps propias, se comparte el enlace de la sala en el chat de la reunión.
