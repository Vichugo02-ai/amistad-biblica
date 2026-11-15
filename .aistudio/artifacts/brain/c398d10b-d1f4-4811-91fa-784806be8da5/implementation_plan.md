# Conexión Amistad Bíblica: Desafío Teams (Puzzle 24 & Sin Caer al Abismo)

Plataforma interactiva multijugador en tiempo real diseñada para grupos de hasta 20 personas en Microsoft Teams durante celebraciones del Día del Amigo en comunidades cristianas pentecostales/evangélicas. Los participantes compiten en rondas secuenciales: primero armando un rompecabezas de 24 piezas de escenas bíblicas de amistad y fe, y luego enfrentando el tablero interactivo de letras y pasajes "Sin Caer al Abismo" con puntuación automática y podio en vivo.

> [!IMPORTANT]
> **Decisiones Clave Confirmadas en la Fase de Clarificación:**
> - **Modo de conexión:** Multijugador en vivo en tiempo real donde el anfitrión crea la sala y genera un código de 6 caracteres (ej. `AMIGO7`) y un enlace directo; los hasta 20 participantes se unen desde sus computadoras o teléfonos mientras comparten la llamada en Teams.
> - **Estructura de la competencia:** Circuito de rondas combinadas (Ronda de Rompecabezas de 24 piezas contra reloj con pistas desbloqueadas + Ronda del Tablero del Abismo donde cada error acerca al personaje al precipicio).
> - **Temática bíblica:** Escenas e historias de amistad entrañable y fe en las Escrituras: David y Jonatán (1 Samuel 18-20), Rut y Noemí (Rut 1), Jesús y sus 12 amigos/discípulos (Juan 15:13-15), Pablo y Bernabé / Silas, y Daniel con sus tres amigos en Babilonia.

---

## 1. Visión General y Concepto Central

- **Propósito:** Brindar una experiencia dinámica, edificante, divertida y sin fricciones técnicas para celebrar el Día del Amigo en reuniones juveniles o congregacionales en Microsoft Teams.
- **Audiencia:** Jóvenes y familias de iglesias cristianas pentecostales y evangélicas, con interfaz 100% en español, vocabulario bíblico respetuoso y citas bíblicas inspiradoras.
- **Valor Principal:** Elimina la necesidad de contar puntos a mano o usar diapositivas estáticas: el sistema sincroniza el reloj, valida cada pieza del rompecabezas, controla los pasos en el puente del abismo, suma los puntos por velocidad y precisión, y corona al ganador en un podio festivo.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujo de Usuario Paso a Paso

1. **Recepción y Entrada (Lobby):**
   - El anfitrión crea la sesión ("Crear Sala del Día del Amigo"), define número de rondas (ej. 3 a 5 rondas) y tiempo límite.
   - Los participantes ingresan su nombre/alias y el código de sala o entran mediante enlace directo. Se visualiza la lista de amigos conectados en tiempo real con avatares temáticos.
2. **Fase 1: Rompecabezas Bíblico de 24 Piezas (Grid 6x4):**
   - Se muestra un lienzo de cuadrícula con 24 casillas numeradas y un banco de fichas desordenadas con recortes de la escena bíblica.
   - Los jugadores arrastran (drag-and-drop o click-to-place optimizado para mouse y móvil) las piezas para reconstruir la imagen.
   - Puntuación automática basada en velocidad de armado y piezas correctas colocadas. Al completarlo, se revela el versículo y escena secreta.
3. **Fase 2: Tablero Interactivo "Sin Caer al Abismo":**
   - Dinámica de suspenso bíblico: un puente colgante sobre el abismo con un simpático personaje explorador bíblico.
   - Hay una frase o personaje oculto ("EL AMIGO VERDADERO", "DAVID Y JONATAN", "RUT Y NOEMI").
   - Tablero virtual de letras: cada letra incorrecta quiebra una tabla del puente y hace avanzar al personaje un paso más cerca del abismo (máximo 6 fallos antes de caer).
   - Aciertos suman puntos; adivinar la escena completa o versículo otorga bonificación especial.
4. **Fase 3: Tabla de Clasificación y Podio:**
   - Animación de celebración con confeti y sonido festivo.
   - Podio de 1°, 2° y 3° lugar con medallas y desglose de puntos por ronda. Opción de exportar resumen o reiniciar la partida.

### Identidad Visual y Paleta de Colores

- **Estética:** Cálida, festiva y bíblica contemporánea, evitando el aspecto genérico de plantillas y prescindiendo de insignias en píldora o adornos mecánicos.
- **Paleta de Colores (60-30-10):**
  - **60% Lienzo Neutro:** Fondos en pizarra suave (`#0B132B` / `#1C2541` en modo oscuro para contraste en llamadas de Teams, o crema pergamino luminoso `#F8FAFC` en modo claro).
  - **30% Estructura y Superficies:** Paneles con bordes sutiles en tono oro antiguo (`#D4AF37` / `#B8860B`) y maderas cálidas del puente (`#78350F`).
  - **10% Acentos Vivos:** Ámbar dorado celestial (`#F59E0B`) para botones de acción y victorias, esmeralda (`#10B981`) para letras y piezas correctas, y rojo rubí suave (`#EF4444`) para advertencias de peligro en el abismo.
- **Tipografía:**
  - *Titulares y Citas:* `Cinzel` o `Fraunces` para un toque bíblico solemne y elegante.
  - *Interfaz y Tableros:* `Plus Jakarta Sans` y números tabulares (`font-mono tabular-nums`) para máxima legibilidad durante la llamada.
- **Efectos de Audio Sintetizados (Web Audio API):**
  - Efecto de encaje suave al colocar una pieza correcta del puzzle.
  - Efecto de cuerda/madera al errar en el abismo y fanfarria triunfal al ganar la ronda o adivinar el personaje.

---

## 3. Decisiones de Producto y Arquitectura de Estado

- **Arquitectura de Servidor en Tiempo Real (Express + WebSockets / SSE):**
  - Se integra un servidor en Node.js/Express con soporte de WebSockets (`ws`) en el puerto 3000 para sincronización instantánea de salas, estados de jugadores, cronómetros y puntuación autoritativa del servidor.
  - El anfitrión puede proyectar la pantalla principal en Teams mientras cada participante interactúa en su móvil o navegador secundario.
- **Mecánica del Puzzle de 24 Piezas (6 columnas x 4 filas):**
  - Generación geométrica procedural de las 24 piezas en un canvas de alta definición utilizando imágenes bíblicas nítidas generadas para este propósito.
  - Sistema dual de interacción: arrastrar y soltar (drag & drop) o selección táctil ("tocar pieza -> tocar casilla destino") para compatibilidad perfecta con pantallas táctiles y ratón.
- **Dinámica "Sin Caer al Abismo":**
  - Representación visual interactiva en SVG / Canvas del puente sobre el cañón con niebla inferior, tablones interactivos y el explorador bíblico.
  - Teclado virtual en pantalla con letras del abecedario en español (incluyendo `Ñ`), bloqueo de letras ya utilizadas y campo para arriesgar la respuesta completa.

---

## 4. Arquitectura Técnica y Modelo de Datos

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MICROSOFT TEAMS CALL                           │
│  [Anfitrión comparte pantalla]  ◄────────►  [Participantes en vivo]    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        WebSocket / HTTP :3000
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (server.ts - Express + WS)                │
│  - Gestor de Salas (RoomManager: códigos únicos de 6 caracteres)       │
│  - Temporizador autoritativo sincronizado                             │
│  - Validador de aciertos de Puzzle y Letras del Abismo                 │
│  - Motor de Puntuación en Vivo y Ranking de Jugadores                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Broadcast de eventos en vivo
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND REACT (SPA Modular)                         │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │ LobbyView             │  │ GameController (State Machine)        │  │
│  │ - Unirse / Crear Sala │  │ - WAITING_ROOM -> PUZZLE -> ABYSS     │  │
│  │ - Lista de Jugadores  │  │   -> ROUND_SUMMARY -> PODIUM           │  │
│  └───────────────────────┘  └───────────────────────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │ Puzzle24Board         │  │ AbyssBridgeBoard                      │  │
│  │ - Grid 6x4 (24 piezas)│  │ - Escena de puente y abismo en SVG    │  │
│  │ - Snap & verificación │  │ - Tablero letras con teclado español  │  │
│  │ - Pistas bíblicas     │  │ - Contador de caídas y vidas (6 max)  │  │
│  └───────────────────────┘  └───────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Scoreboard & Leaderboard (Tabular nums, podio animado, sonidos)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Catálogo de Escenas Bíblicas Integradas

1. **David y Jonatán (Pacto de Hermandad):** Cita 1 Samuel 18:1-3. "El alma de Jonatán quedó ligada con la de David, y lo amó como a sí mismo".
2. **Rut y Noemí (Fidelidad Inquebrantable):** Cita Rut 1:16. "A dondequiera que tú vayas, yo iré; y dondequiera que vivas, viviré. Tu pueblo será mi pueblo".
3. **Jesús y los Discípulos (Amor Mayor):** Cita Juan 15:13-14. "Nadie tiene mayor amor que este, que uno ponga su vida por sus amigos. Vosotros sois mis amigos".
4. **Pablo y Silas (Alabanza en la Prueba):** Cita Hechos 16:25. "A medianoche, orando Pablo y Silas, cantaban himnos a Dios; y los presos los oían".
5. **Daniel, Ananías, Misael y Azarías (Compañeros de Fe):** Cita Daniel 1:17. "A estos cuatro muchachos Dios les dio conocimiento e inteligencia".

### Fases de Implementación una vez Aprobado

1. **Infraestructura Full-Stack:** Configurar `server.ts` con Express y WebSockets (`ws`), manejo de salas con código, broadcast de eventos y sincronización de temporizador.
2. **Generación de Activos Visuales Bíblicos:** Crear las ilustraciones maestras de las historias bíblicas de amistad con `generate_image` en proporciones exactas para el rompecabezas.
3. **Módulo del Rompecabezas 24 Piezas:** Algoritmo de fragmentación matricial 6x4, banco de piezas revueltas, soporte de interacción drag & drop / clic táctil y cálculo de aciertos.
4. **Módulo "Sin Caer al Abismo":** Gráficos SVG del puente sobre el abismo, progresión visual de caída con 6 fallos permitidos, teclado en español, frases enmascaradas y efectos de tensión.
5. **Sistema de Puntuación y Podio:** Motor de puntos por velocidad y precisión, pantalla de resultados intermedios y coronación final con fanfarria y confeti.
6. **Verificación y Compilación:** Pruebas de concurrencia y verificación con `compile_applet`.
