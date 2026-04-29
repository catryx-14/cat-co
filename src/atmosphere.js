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

export function buildBokeh(_warmth) {
  const layer = document.getElementById('bokeh-layer');
  if (!layer) return;
  layer.innerHTML = '';

  const jewels = [
    [180, 40,  220],  // deep purple
    [220, 60,  160],  // magenta
    [40,  100, 220],  // sapphire
    [160, 30,  200],  // deep violet
    [60,  180, 200],  // teal
    [220, 100, 40],   // amber
    [200, 40,  120],  // ruby
  ];

  for (let i = 0; i < 32; i++) {
    const d = document.createElement('div');
    d.className = 'bokeh-dot';
    const sz = 100 + Math.random() * 80; // 100–180 px diameter (50–90 px radius)
    d.style.width = sz + 'px';
    d.style.height = sz + 'px';
    d.style.left = (Math.random() * 105 - 2.5) + '%';
    d.style.top  = (Math.random() * 105 - 2.5) + '%';
    const [r, g, b] = jewels[Math.floor(Math.random() * jewels.length)];
    const alpha = (0.22 + Math.random() * 0.06).toFixed(3);
    d.style.setProperty('--c', `rgba(${r},${g},${b},${alpha})`);
    d.style.filter = `blur(${Math.round(sz * 0.17)}px)`;
    d.style.opacity = '1';
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    d.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    d.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    d.style.animationDuration = (50 + Math.random() * 30) + 's';
    d.style.animationDelay = -(Math.random() * 60) + 's';
    d.style.animationDirection = Math.random() < 0.5 ? 'alternate' : 'alternate-reverse';
    layer.appendChild(d);
  }
}
