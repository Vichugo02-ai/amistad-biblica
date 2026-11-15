/**
 * Procedural Biblical Art Renderer
 * Generates rich, high-resolution 900x600 (3:2) sacred art scenes
 * optimized for 24-piece (6x4 grid) puzzles.
 *
 * Las escenas NO llevan título ni cita pintados: el rompecabezas se usa para
 * adivinar el personaje, así que el nombre no puede aparecer en la imagen.
 */

export function renderBiblicalSceneToCanvas(
  canvas: HTMLCanvasElement,
  sceneId: string,
  width: number = 900,
  height: number = 600
): void {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  switch (sceneId) {
    case 'david_jonatan':
      renderDavidJonatan(ctx, width, height);
      break;
    case 'rut_noemi':
      renderRutNoemi(ctx, width, height);
      break;
    case 'jesus_amigos':
      renderJesusAmigos(ctx, width, height);
      break;
    case 'daniel_amigos':
      renderDanielAmigos(ctx, width, height);
      break;
    case 'pablo_silas':
      renderPabloSilas(ctx, width, height);
      break;
    default:
      renderDavidJonatan(ctx, width, height);
  }
}

function renderDavidJonatan(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sunset sky gradient over Judea
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#1E1B4B');
  skyGrad.addColorStop(0.35, '#581C87');
  skyGrad.addColorStop(0.65, '#B45309');
  skyGrad.addColorStop(1, '#FDE68A');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Glowing radiant Sun / Divine light
  const sunGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.45, 180);
  sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
  sunGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.6)');
  sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.45, 180, 0, Math.PI * 2);
  ctx.fill();

  // Distant Judean Hills
  ctx.fillStyle = '#451A03';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.65);
  ctx.bezierCurveTo(w * 0.2, h * 0.55, w * 0.35, h * 0.68, w * 0.5, h * 0.58);
  ctx.bezierCurveTo(w * 0.7, h * 0.48, w * 0.85, h * 0.62, w, h * 0.56);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Foreground Palace terrace
  const floorGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
  floorGrad.addColorStop(0, '#78350F');
  floorGrad.addColorStop(1, '#292524');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);

  // Ancient Pillars on the sides
  ctx.fillStyle = '#92400E';
  ctx.fillRect(w * 0.04, h * 0.15, w * 0.08, h * 0.75);
  ctx.fillRect(w * 0.88, h * 0.15, w * 0.08, h * 0.75);
  // Pillar capitals
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(w * 0.02, h * 0.12, w * 0.12, h * 0.05);
  ctx.fillRect(w * 0.86, h * 0.12, w * 0.12, h * 0.05);

  // Olive Tree on terrace
  drawStylizedTree(ctx, w * 0.18, h * 0.78, w * 0.22, h * 0.4);

  // David and Jonathan figures embracing
  // Jonathan (Right, royal robes)
  ctx.fillStyle = '#1D4ED8'; // Royal blue cloak
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.42);
  ctx.bezierCurveTo(w * 0.56, h * 0.42, w * 0.62, h * 0.55, w * 0.64, h * 0.82);
  ctx.lineTo(w * 0.48, h * 0.82);
  ctx.closePath();
  ctx.fill();

  // Jonathan head
  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.arc(w * 0.54, h * 0.38, w * 0.035, 0, Math.PI * 2);
  ctx.fill();
  // Golden prince headband
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(w * 0.51, h * 0.36, w * 0.06, 6);

  // David (Left, shepherd/hero tunic & mantle)
  ctx.fillStyle = '#9A3412'; // Rust red mantle
  ctx.beginPath();
  ctx.moveTo(w * 0.44, h * 0.44);
  ctx.bezierCurveTo(w * 0.38, h * 0.52, w * 0.36, h * 0.65, w * 0.38, h * 0.82);
  ctx.lineTo(w * 0.52, h * 0.82);
  ctx.closePath();
  ctx.fill();

  // David head
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(w * 0.44, h * 0.40, w * 0.033, 0, Math.PI * 2);
  ctx.fill();

  // Joined Hands / Covenant gesture in center
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.46, h * 0.52);
  ctx.lineTo(w * 0.52, h * 0.52);
  ctx.stroke();

  // Golden Harp resting on terrace
  drawGoldenHarp(ctx, w * 0.76, h * 0.78, w * 0.1, h * 0.22);
}

function renderRutNoemi(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Golden hour sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#78350F');
  skyGrad.addColorStop(0.4, '#C2410C');
  skyGrad.addColorStop(0.7, '#FBBF24');
  skyGrad.addColorStop(1, '#FEF08A');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Sun
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(w * 0.75, h * 0.3, w * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountains of Moab
  ctx.fillStyle = '#7C2D12';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w * 0.3, h * 0.4);
  ctx.lineTo(w * 0.6, h * 0.52);
  ctx.lineTo(w, h * 0.42);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Golden wheat fields
  const fieldGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  fieldGrad.addColorStop(0, '#B45309');
  fieldGrad.addColorStop(0.5, '#D97706');
  fieldGrad.addColorStop(1, '#78350F');
  ctx.fillStyle = fieldGrad;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  // Path through wheat fields
  ctx.fillStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.moveTo(w * 0.45, h * 0.55);
  ctx.lineTo(w * 0.55, h * 0.55);
  ctx.lineTo(w * 0.7, h);
  ctx.lineTo(w * 0.3, h);
  ctx.closePath();
  ctx.fill();

  // Ruth & Naomi walking together
  // Naomi (Elder, leaning gently)
  ctx.fillStyle = '#4B5563'; // Grey-blue mantle
  ctx.beginPath();
  ctx.arc(w * 0.45, h * 0.54, w * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#374151';
  ctx.fillRect(w * 0.42, h * 0.57, w * 0.06, h * 0.24);

  // Ruth (Younger, holding arm of Naomi, sheaf of wheat)
  ctx.fillStyle = '#D97706'; // Terracotta dress
  ctx.beginPath();
  ctx.arc(w * 0.52, h * 0.53, w * 0.027, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#B45309';
  ctx.fillRect(w * 0.49, h * 0.56, w * 0.065, h * 0.25);

  // Sheaf of wheat in Ruth's hands
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.56, h * 0.65);
  ctx.lineTo(w * 0.62, h * 0.58);
  ctx.stroke();

  // Wheat stalks in foreground
  drawWheatStalks(ctx, w, h);
}

function renderJesusAmigos(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // The Upper Room / Cenacle with blue starry night through arches
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);

  // 3 Roman/Judean Arches in background
  const archW = w * 0.22;
  const archGap = w * 0.08;
  const startX = w * 0.12;

  for (let i = 0; i < 3; i++) {
    const ax = startX + i * (archW + archGap);
    // Sky through window
    const winGrad = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.5);
    winGrad.addColorStop(0, '#1E1B4B');
    winGrad.addColorStop(1, '#3B82F6');
    ctx.fillStyle = winGrad;
    ctx.beginPath();
    ctx.arc(ax + archW / 2, h * 0.25, archW / 2, Math.PI, 0);
    ctx.lineTo(ax + archW, h * 0.55);
    ctx.lineTo(ax, h * 0.55);
    ctx.closePath();
    ctx.fill();

    // Arch outline
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  // Warm candlelight ambience inside room
  const candleGrad = ctx.createRadialGradient(w * 0.5, h * 0.6, 20, w * 0.5, h * 0.6, 320);
  candleGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
  candleGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = candleGrad;
  ctx.fillRect(0, h * 0.2, w, h * 0.8);

  // Banquet Table
  ctx.fillStyle = '#78350F';
  ctx.fillRect(w * 0.15, h * 0.68, w * 0.7, h * 0.16);
  // Tablecloth
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(w * 0.18, h * 0.67, w * 0.64, h * 0.05);

  // Bread and Chalice on table
  ctx.fillStyle = '#F59E0B'; // Golden Chalice
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.64, 14, 0, Math.PI);
  ctx.lineTo(w * 0.49, h * 0.67);
  ctx.lineTo(w * 0.51, h * 0.67);
  ctx.closePath();
  ctx.fill();

  // Bread loaf
  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.ellipse(w * 0.44, h * 0.66, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jesus in the center (White and Crimson mantle, open arms)
  const jesusX = w * 0.5;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(jesusX, h * 0.38);
  ctx.lineTo(jesusX - w * 0.08, h * 0.68);
  ctx.lineTo(jesusX + w * 0.08, h * 0.68);
  ctx.closePath();
  ctx.fill();

  // Red mantle over shoulder
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.moveTo(jesusX, h * 0.44);
  ctx.lineTo(jesusX - w * 0.07, h * 0.68);
  ctx.lineTo(jesusX + w * 0.02, h * 0.68);
  ctx.closePath();
  ctx.fill();

  // Jesus Halo / Golden Aura
  const haloGrad = ctx.createRadialGradient(jesusX, h * 0.34, 5, jesusX, h * 0.34, 45);
  haloGrad.addColorStop(0, '#FEF08A');
  haloGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(jesusX, h * 0.34, 45, 0, Math.PI * 2);
  ctx.fill();

  // Jesus Head
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(jesusX, h * 0.34, w * 0.034, 0, Math.PI * 2);
  ctx.fill();

  // Disciples surrounding in communion (3 on left, 3 on right)
  const discipleColors = ['#2563EB', '#16A34A', '#9333EA', '#059669', '#D97706', '#0284C7'];
  const discipleXPositions = [w * 0.22, w * 0.30, w * 0.38, w * 0.62, w * 0.70, w * 0.78];

  discipleXPositions.forEach((dx, idx) => {
    ctx.fillStyle = discipleColors[idx];
    ctx.beginPath();
    ctx.moveTo(dx, h * 0.46);
    ctx.lineTo(dx - w * 0.045, h * 0.68);
    ctx.lineTo(dx + w * 0.045, h * 0.68);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(dx, h * 0.42, w * 0.028, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderDanielAmigos(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Midnight blue Mesopotamian palace
  ctx.fillStyle = '#1E1B4B';
  ctx.fillRect(0, 0, w, h);

  // Babylonian glazed brick walls with gold borders
  ctx.fillStyle = '#312E81';
  ctx.fillRect(0, h * 0.25, w, h * 0.75);

  // Golden frieze pattern
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, h * 0.24, w, 12);
  ctx.fillRect(0, h * 0.76, w, 12);

  // Divine celestial beam of light pouring from heaven on the four youths
  const beamGrad = ctx.createLinearGradient(w * 0.5, 0, w * 0.5, h * 0.8);
  beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
  beamGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.4)');
  beamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, 0);
  ctx.lineTo(w * 0.6, 0);
  ctx.lineTo(w * 0.78, h * 0.85);
  ctx.lineTo(w * 0.22, h * 0.85);
  ctx.closePath();
  ctx.fill();

  // Four young men standing in prayer and unity
  const menColors = ['#0284C7', '#B91C1C', '#15803D', '#7C3AED'];
  const menX = [w * 0.34, w * 0.44, w * 0.56, w * 0.66];

  menX.forEach((mx, idx) => {
    ctx.fillStyle = menColors[idx];
    ctx.beginPath();
    ctx.moveTo(mx, h * 0.45);
    ctx.lineTo(mx - w * 0.045, h * 0.82);
    ctx.lineTo(mx + w * 0.045, h * 0.82);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(mx, h * 0.40, w * 0.03, 0, Math.PI * 2);
    ctx.fill();

    // Raised hands in prayer and solidarity
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mx, h * 0.48);
    ctx.lineTo(mx - 10, h * 0.38);
    ctx.moveTo(mx, h * 0.48);
    ctx.lineTo(mx + 10, h * 0.38);
    ctx.stroke();
  });
}

function renderPabloSilas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Dark stone dungeon
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, 0, w, h);

  // Stone brick texture
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Heavenly earthquake / breakthrough golden rays cracking the prison
  const rayGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, 300);
  rayGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
  rayGrad.addColorStop(0.3, 'rgba(52, 211, 153, 0.5)'); // Miraculous emerald glow
  rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rayGrad;
  ctx.fillRect(0, 0, w, h);

  // Paul and Silas singing
  const psX = [w * 0.42, w * 0.58];
  const psColor = ['#9A3412', '#1E3A8A'];

  psX.forEach((px, i) => {
    ctx.fillStyle = psColor[i];
    ctx.beginPath();
    ctx.moveTo(px, h * 0.46);
    ctx.lineTo(px - w * 0.05, h * 0.82);
    ctx.lineTo(px + w * 0.05, h * 0.82);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(px, h * 0.40, w * 0.032, 0, Math.PI * 2);
    ctx.fill();
  });

  // Broken chains falling apart on the floor
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w * 0.36, h * 0.8, 12, 0, Math.PI * 1.5);
  ctx.arc(w * 0.64, h * 0.8, 12, 0, Math.PI * 1.5);
  ctx.stroke();
}

function drawStylizedTree(ctx: CanvasRenderingContext2D, x: number, y: number, tw: number, th: number) {
  ctx.fillStyle = '#451A03'; // Trunk
  ctx.fillRect(x - 8, y - th, 16, th);

  // Foliage
  ctx.fillStyle = '#15803D';
  ctx.beginPath();
  ctx.arc(x, y - th - 20, tw * 0.45, 0, Math.PI * 2);
  ctx.arc(x - 20, y - th, tw * 0.35, 0, Math.PI * 2);
  ctx.arc(x + 20, y - th, tw * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoldenHarp(ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, hh: number) {
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + hw * 0.8, y - hh * 0.9, x + hw, y - hh);
  ctx.lineTo(x + hw * 0.2, y - hh * 0.8);
  ctx.lineTo(x, y);
  ctx.stroke();

  // Harp Strings
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (hw * i) / 6, y - (hh * 0.2 * i) / 5);
    ctx.lineTo(x + (hw * i * 0.8) / 6, y - (hh * 0.8 * i) / 5);
    ctx.stroke();
  }
}

function drawWheatStalks(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 3;
  for (let i = 0; i < 25; i++) {
    const wx = (w * i) / 25 + (Math.sin(i) * 10);
    const wy = h * 0.85 + (Math.cos(i) * 15);
    ctx.beginPath();
    ctx.moveTo(wx, h);
    ctx.quadraticCurveTo(wx + 8, wy, wx + 15, wy - 30);
    ctx.stroke();
  }
}
