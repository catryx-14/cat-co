export function initAtmosphere() {
  window.__warmth = 0.7;
  initStars();
  buildBokeh(0.7);
  window.__rebuildBokeh = buildBokeh;
}

function initStars() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, stars = [];

  function resize() {
    W = canvas.width = window.innerWidth * devicePixelRatio;
    H = canvas.height = window.innerHeight * devicePixelRatio;
    const N = Math.round((W * H) / 12000);
    stars = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.4 + Math.random() * 1.4,
      base: 0.25 + Math.random() * 0.55,
      tw: Math.random() * Math.PI * 2,
      spd: 0.6 + Math.random() * 1.4,
      warmRoll: Math.random(),
    }));
  }

  function tick(t) {
    ctx.clearRect(0, 0, W, H);
    const w = window.__warmth ?? 0.7;
    const warmThresh = 0.05 + Math.min(1.5, w) * 0.17;
    for (const s of stars) {
      const a = s.base + Math.sin(t * 0.001 * s.spd + s.tw) * 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = (s.warmRoll < warmThresh)
        ? `rgba(232, 201, 140, ${a})`
        : `rgba(200, 210, 240, ${a * 0.85})`;
      ctx.fill();
    }

    if (!window.__shootingStars) window.__shootingStars = [];
    if (!window.__nextShoot) window.__nextShoot = t + 4000 + Math.random() * 8000;
    if (t >= window.__nextShoot) {
      const angle = (Math.random() < 0.5)
        ? (Math.random() * 0.4 + 0.15) * Math.PI
        : (Math.random() * 0.4 + 0.55) * Math.PI;
      const startEdge = Math.random();
      const sx = startEdge < 0.5
        ? Math.random() * W
        : (Math.cos(angle) > 0 ? 0 : W);
      const sy = Math.random() * H * 0.4;
      const speed = (520 + Math.random() * 380) * devicePixelRatio;
      window.__shootingStars.push({
        x: sx, y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: t,
        life: 900 + Math.random() * 500,
        len: 110 + Math.random() * 90,
      });
      window.__nextShoot = t + 8000 + Math.random() * 16000;
    }

    const live = [];
    for (const ss of window.__shootingStars) {
      const age = t - ss.born;
      if (age > ss.life) continue;
      const dt = 1 / 60;
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      const k = age / ss.life;
      const alpha = k < 0.15 ? (k / 0.15) : (k > 0.7 ? (1 - (k - 0.7) / 0.3) : 1);
      const len = ss.len * devicePixelRatio;
      const mag = Math.hypot(ss.vx, ss.vy) || 1;
      const tx = ss.x - (ss.vx / mag) * len;
      const ty = ss.y - (ss.vy / mag) * len;
      const grad = ctx.createLinearGradient(ss.x, ss.y, tx, ty);
      grad.addColorStop(0, `rgba(255, 250, 230, ${0.95 * alpha})`);
      grad.addColorStop(0.25, `rgba(220, 230, 255, ${0.55 * alpha})`);
      grad.addColorStop(1, `rgba(180, 200, 255, 0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6 * devicePixelRatio;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(ss.x, ss.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 1.6 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 250, 230, ${alpha})`;
      ctx.fill();
      live.push(ss);
    }
    window.__shootingStars = live;
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
}

export function buildBokeh(warmth) {
  const layer = document.getElementById('bokeh-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const blues = [
    'rgba(110, 150, 230, 0.55)', 'rgba(80, 130, 220, 0.50)',
    'rgba(140, 175, 240, 0.50)', 'rgba(70, 110, 200, 0.55)',
    'rgba(120, 165, 235, 0.45)', 'rgba(95, 140, 215, 0.55)',
    'rgba(155, 185, 245, 0.45)', 'rgba(85, 125, 205, 0.50)',
  ];
  const purples = [
    'rgba(168, 144, 212, 0.55)', 'rgba(140, 110, 200, 0.50)',
    'rgba(190, 160, 225, 0.45)', 'rgba(125, 100, 195, 0.55)',
  ];
  const roses = [
    'rgba(201, 138, 160, 0.50)', 'rgba(220, 155, 175, 0.45)', 'rgba(190, 125, 150, 0.50)',
  ];
  const golds = ['rgba(232, 201, 140, 0.55)', 'rgba(220, 180, 120, 0.50)'];

  function pickColor() {
    const r = Math.random();
    if (r < 0.60) return blues[Math.floor(Math.random() * blues.length)];
    if (r < 0.80) return purples[Math.floor(Math.random() * purples.length)];
    if (r < 0.95) return roses[Math.floor(Math.random() * roses.length)];
    return golds[Math.floor(Math.random() * golds.length)];
  }

  for (let i = 0; i < 32; i++) {
    const d = document.createElement('div');
    d.className = 'bokeh-dot';
    const sz = 18 + Math.pow(Math.random(), 1.6) * 130;
    d.style.width = sz + 'px';
    d.style.height = sz + 'px';
    d.style.left = (Math.random() * 100) + '%';
    d.style.top = (Math.random() * 100) + '%';
    d.style.setProperty('--c', pickColor());
    d.style.opacity = 0.45 + Math.random() * 0.45;
    const angle = Math.random() * Math.PI * 2;
    const dist = 180 + Math.random() * 340;
    d.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    d.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    d.style.animationDuration = (12 + Math.random() * 11) + 's';
    d.style.animationDelay = -(Math.random() * 20) + 's';
    d.style.animationDirection = Math.random() < 0.5 ? 'alternate' : 'alternate-reverse';
    layer.appendChild(d);
  }
}
