import { BiblicalStory } from '../types/game';

// Los distintivos (avatares) y las reacciones viven en ./theme.ts

export const BIBLICAL_STORIES: BiblicalStory[] = [
  // 1. Abraham y las estrellas (Amigo de Dios)
  {
    id: 'abraham_estrellas',
    title: 'Abraham y las Estrellas: El Amigo de Dios',
    passage: 'Génesis 15:5 & Santiago 2:23',
    verseText: 'Mira ahora los cielos, y cuenta las estrellas, si las puedes contar. Y le dijo: Así será tu descendencia. Y fue llamado amigo de Dios.',
    theme: 'Fe inquebrantable, pacto de amistad con Dios y promesa cumplida',
    character: 'Abraham',
    phrase: 'ABRAHAM',
    hints: [
      'Salió de su tierra y su parentela confiando plenamente en Dios.',
      'Contó las estrellas del cielo bajo la promesa de una gran descendencia.',
      'En la Biblia es recordado con honor como el «Amigo de Dios».'
    ],
    imageUrl: '/assets/aistudio/abraham-stars-v1_9a2b10e1.webp',
    artColor1: '#0F172A',
    artColor2: '#1E1B4B',
    artAccent: '#FDE68A'
  },
  // 2. Daniel en el foso de los leones
  {
    id: 'daniel_leones',
    title: 'Daniel en el Foso de los Leones',
    passage: 'Daniel 6:21-22',
    verseText: 'Mi Dios envió su ángel, el cual cerró la boca de los leones, para que no me hiciesen daño.',
    theme: 'Fidelidad inquebrantable, oración continua y auxilio divino',
    character: 'Daniel',
    phrase: 'DANIEL',
    hints: [
      'Un profeta condenado a las fieras por orar a Dios tres veces al día.',
      'El rey Darío pasó la noche en ayuno esperando su liberación.',
      'A la mañana siguiente fue hallado con vida porque confió en su Dios.'
    ],
    imageUrl: '/assets/aistudio/daniel-lions-v1_a75ccc9a.webp',
    artColor1: '#1E293B',
    artColor2: '#78350F',
    artAccent: '#F59E0B'
  },
  // 3. José perdona a sus hermanos
  {
    id: 'jose_perdona',
    title: 'José Perdona a sus Hermanos: Amor Fraternal',
    passage: 'Génesis 45:3-5 & 50:20',
    verseText: 'Vosotros pensasteis mal contra mí, mas Dios lo encaminó a bien, para hacer lo que vemos hoy.',
    theme: 'Perdón fraternal sincero, sanidad del corazón y reconciliación familiar',
    character: 'José',
    phrase: 'JOSE',
    hints: [
      'Tenía una túnica de muchos colores regalada por su padre Jacob.',
      'Llegó a ser gobernador de Egipto durante los siete años de escasez.',
      'Abrazó a sus hermanos con lágrimas perdonando todo rencor pasado.'
    ],
    imageUrl: '/assets/aistudio/joseph-forgives-v1_e6b750a2.webp',
    artColor1: '#78350F',
    artColor2: '#B45309',
    artAccent: '#38BDF8'
  },
  // 4. El Arca de Noé
  {
    id: 'noah_arca',
    title: 'El Arca de Noé y el Pacto del Arcoíris',
    passage: 'Génesis 9:13 & 8:11',
    verseText: 'Mi arco he puesto en las nubes, el cual será por señal del pacto entre mí y la tierra.',
    theme: 'Salvación, fidelidad de la familia de fe y nuevo comienzo',
    character: 'Noé',
    phrase: 'NOE',
    hints: [
      'Construyó un arca colosal cuando aún no había llovido sobre la tierra.',
      'Entraron parejas de animales de dos en dos según su especie.',
      'El arcoíris en el cielo selló el pacto eterno de la misericordia de Dios.'
    ],
    imageUrl: '/assets/aistudio/noah-ark-v1_092b597e.webp',
    artColor1: '#14532D',
    artColor2: '#15803D',
    artAccent: '#F59E0B'
  },
  // 5. La Resurrección de Jesús
  {
    id: 'resurreccion_jesus',
    title: 'La Resurrección de Jesús: ¡La Tumba Vacía!',
    passage: 'Mateo 28:5-6 & Juan 20:19',
    verseText: 'No temáis vosotras; porque yo sé que buscáis a Jesús, el que fue crucificado. No está aquí, pues ha resucitado.',
    theme: 'Victoria suprema, vida eterna y esperanza viva en Cristo',
    character: 'Jesús',
    phrase: 'JESUS',
    hints: [
      'Las santas mujeres llegaron al amanecer con perfumes y especias.',
      'Un ángel descendió del cielo y removió la gran piedra redonda.',
      'El Señor venció a la muerte y se apareció vivo a sus amados discípulos.'
    ],
    imageUrl: '/assets/aistudio/resurrection-v1_3a60d63f.webp',
    artColor1: '#431407',
    artColor2: '#78350F',
    artAccent: '#FBBF24'
  },
  // 6. Jonás y la tempestad
  {
    id: 'jonas_tempestad',
    title: 'Jonás y la Tempestad en el Mar',
    passage: 'Jonás 1:15 & 2:9',
    verseText: 'Tomaron a Jonás, y lo echaron al mar; y el mar se aquietó de su furor. La salvación es de Jehová.',
    theme: 'Obediencia a la voz de Dios y rescate de las profundidades',
    character: 'Jonás',
    phrase: 'JONAS',
    hints: [
      'Huyó en un barco hacia Tarsis para no obedecer el llamado a Nínive.',
      'Reconoció su error y pidió a los marineros que lo lanzaran al mar embravecido.',
      'Un gran pez preparado por Dios lo rescató de morir ahogado.'
    ],
    imageUrl: '/assets/aistudio/jonah-storm-v1_77066df6.webp',
    artColor1: '#0C4A6E',
    artColor2: '#0369A1',
    artAccent: '#F59E0B'
  },
  // 7. La Caída de los Muros de Jericó
  {
    id: 'muros_jerico',
    title: 'Los Muros de Jericó: Victoria con Trompetas de Alabanza',
    passage: 'Josué 6:20',
    verseText: 'El pueblo gritó, y los sacerdotes tocaron las bocinas; y el muro cayó sobre sí.',
    theme: 'Unidad del pueblo, obediencia y el poder de la alabanza',
    character: 'Josué',
    phrase: 'JOSUE',
    hints: [
      'El Arca del Pacto iba delante de toda la congregación de Israel.',
      'Rodearon los muros fortificados durante siete días en santa reverencia.',
      'Al toque de las bocinas y al grito unánime de victoria, los muros cayeron.'
    ],
    imageUrl: '/assets/aistudio/jericho-v1_46cd9d67.webp',
    artColor1: '#713F12',
    artColor2: '#A16207',
    artAccent: '#38BDF8'
  },
  // 8. El Paso del Mar Rojo
  {
    id: 'mar_rojo',
    title: 'El Paso del Mar Rojo: Dios Abre Camino en las Aguas',
    passage: 'Éxodo 14:21-22',
    verseText: 'Y extendió Moisés su mano sobre el mar... y los hijos de Israel fueron por en medio del mar en seco.',
    theme: 'Liberación prodigiosa y confianza en el brazo fuerte del Señor',
    character: 'Moisés',
    phrase: 'MOISES',
    hints: [
      'El faraón y sus carros venían detrás y el mar bloqueaba el frente.',
      'Moisés alzó su vara y un viento recio dividió las aguas como muros.',
      'Todo el pueblo cruzó en tierra seca y cantó alabanzas a Jehová.'
    ],
    imageUrl: '/assets/aistudio/red-sea-v1_70d21ec9.webp',
    artColor1: '#075985',
    artColor2: '#0284C7',
    artAccent: '#FDE68A'
  },
  // Historias clásicas de Amistad y Comunión
  {
    id: 'david_jonatan',
    title: 'David y Jonatán: Un Pacto de Amistad Verdadera',
    passage: '1 Samuel 18:1-3 & 20:17',
    verseText: 'Aconteció que el alma de Jonatán quedó ligada con la de David, y lo amó Jonatán como a sí mismo.',
    theme: 'Lealtad, sacrificio mutuo y pacto en Dios',
    character: 'David y Jonatán',
    phrase: 'DAVID Y JONATAN',
    hints: [
      'Un príncipe heredero y un futuro rey ungido.',
      'El príncipe entregó su manto, su espada y su arco en señal de pacto.',
      'Protegieron la vida del otro arriesgando su propia seguridad ante el rey Saúl.'
    ],
    artColor1: '#1E1B4B',
    artColor2: '#78350F',
    artAccent: '#F59E0B',
    svgSceneId: 'david_jonatan'
  },
  {
    id: 'rut_noemi',
    title: 'Rut y Noemí: Fidelidad en el Camino',
    passage: 'Rut 1:16-17',
    verseText: 'Dondequiera que tú vayas, iré yo; y dondequiera que vivas, viviré. Tu pueblo será mi pueblo, y tu Dios mi Dios.',
    theme: 'Acompañamiento en el dolor y devoción incondicional',
    character: 'Rut y Noemí',
    phrase: 'RUT Y NOEMI',
    hints: [
      'Una suegra y una nuera en un viaje hacia Belén de Judá.',
      'Espigaron juntas en los campos de trigo y cebada.',
      'Un ejemplo universal de amor sacrificial entre familiares y amigas.'
    ],
    artColor1: '#431407',
    artColor2: '#9A3412',
    artAccent: '#FBBF24',
    svgSceneId: 'rut_noemi'
  },
  {
    id: 'jesus_amigos',
    title: 'Jesús y sus Discípulos: Nadie Tiene Mayor Amor',
    passage: 'Juan 15:13-15',
    verseText: 'Nadie tiene mayor amor que este, que uno ponga su vida por sus amigos. Vosotros sois mis amigos si hacéis lo que yo os mando.',
    theme: 'El amor supremo de Cristo y la comunión fraternal',
    character: 'Jesús y sus Amigos',
    phrase: 'VOSOTROS SOIS MIS AMIGOS',
    hints: [
      'Palabras del Maestro en el Aposento Alto durante la última cena.',
      'Ya no nos llama siervos, sino que nos llama amigos.',
      'Entregó Su vida en la cruz para reconciliarnos con el Padre.'
    ],
    artColor1: '#172554',
    artColor2: '#1E3A8A',
    artAccent: '#38BDF8',
    svgSceneId: 'jesus_amigos'
  },
  {
    id: 'daniel_amigos',
    title: 'Daniel y sus Tres Amigos: Firmes en Babilonia',
    passage: 'Daniel 1:17 & 3:17-18',
    verseText: 'A estos cuatro muchachos Dios les dio conocimiento e inteligencia en todas las letras y ciencias.',
    theme: 'Amistad que sostiene la fe frente a la presión del mundo',
    character: 'Daniel, Ananías, Misael y Azarías',
    phrase: 'VALIENTES EN LA FE',
    hints: [
      'Cuatro jóvenes hebreos cautivos en la corte de Nabucodonosor.',
      'Rehusaron contaminarse con la comida del rey y se apoyaron en oración.',
      'Tres de ellos caminaron en medio del horno de fuego con el Hijo de Dios.'
    ],
    artColor1: '#2E1065',
    artColor2: '#581C87',
    artAccent: '#C084FC',
    svgSceneId: 'daniel_amigos'
  },
  {
    id: 'pablo_silas',
    title: 'Pablo y Silas: Alabanza a Medianoche',
    passage: 'Hechos 16:25-26',
    verseText: 'A medianoche, orando Pablo y Silas, cantaban himnos a Dios; y los presos los oían.',
    theme: 'Hermanos que alaban a Dios juntos en medio de la adversidad',
    character: 'Pablo y Silas',
    phrase: 'CANTANDO EN PRISION',
    hints: [
      'Dos misioneros encadenados en el calabozo más profundo de Filipos.',
      'Sus pies estaban en el cepo, pero su espíritu levantó alabanzas.',
      'Un gran terremoto abrió las puertas y desató las cadenas de todos.'
    ],
    artColor1: '#0F172A',
    artColor2: '#1E293B',
    artAccent: '#10B981',
    svgSceneId: 'pablo_silas'
  }
];
