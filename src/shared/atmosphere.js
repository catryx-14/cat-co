// ── JEWELRY & JOY — the "joy" layer (drifting bokeh) ────────────────────────
// Replaces the old starfield canvas as the site's default background mood.
// Recipe is Cat-approved (Engine Room id=171): flat soft circles, pure drift,
// three size tiers with speed inversely proportional to size (small = fast =
// feels close; large = slow = feels far — depth from speed, not rendering).
// Colors are CSS mood tokens (--joy-*), so a future page mood is a palette
// swap, not a rebuild. The retired starfield lives in git history if the
// "night" mood ever wants it back.

export function initAtmosphere() {
  buildBokeh();
  window.__rebuildBokeh = buildBokeh;
}

// Exact orb set from the approved mockup, re-dressed in the default navy
// palette. Positions/sizes/blur/opacity/durations are ported verbatim; only
// the colors map to mood tokens. Each entry: [w, blur, opacity, css-position,
// drift-seconds, color-token].
const ORBS = [
  // Large washes — slowest (40–55s), live at the edges.
  { d: 170, blur: 20, op: 0.28, pos: { top: '58%',    left: '3%'   }, dur: 48, c: '--joy-dusk'      },
  { d: 130, blur: 16, op: 0.22, pos: { top: '70%',    left: '55%'  }, dur: 55, c: '--joy-gold'      },
  { d: 150, blur: 18, op: 0.24, pos: { bottom: '-30px', right: '5%' }, dur: 42, c: '--joy-amethyst'  },
  // Mid drifters — 24–30s.
  { d: 70, blur: 4, op: 0.40, pos: { top: '14%', left: '8%'   }, dur: 28, c: '--joy-gold'     },
  { d: 52, blur: 3, op: 0.40, pos: { top: '24%', right: '12%' }, dur: 25, c: '--joy-amethyst' },
  { d: 44, blur: 3, op: 0.30, pos: { top: '46%', left: '23%'  }, dur: 30, c: '--joy-dusk'     },
  { d: 36, blur: 3, op: 0.38, pos: { top: '66%', right: '24%' }, dur: 24, c: '--joy-amethyst' },
  // Glitter specks — fastest (14–18s).
  { d: 13, blur: 1,   op: 0.38, pos: { top: '20%', left: '30%'  }, dur: 15, c: '--joy-starlight' },
  { d: 10, blur: 1,   op: 0.45, pos: { top: '36%', right: '27%' }, dur: 14, c: '--joy-gold'      },
  { d: 8,  blur: 0.5, op: 0.32, pos: { top: '56%', right: '37%' }, dur: 17, c: '--joy-starlight' },
  { d: 11, blur: 1,   op: 0.40, pos: { top: '64%', left: '38%'  }, dur: 16, c: '--joy-gold'      },
  { d: 9,  blur: 1,   op: 0.42, pos: { top: '10%', right: '35%' }, dur: 18, c: '--joy-amethyst'  },
  { d: 12, blur: 1,   op: 0.40, pos: { top: '80%', left: '18%'  }, dur: 15, c: '--joy-gold'      },
];

export function buildBokeh() {
  const layer = document.getElementById('bokeh-layer');
  if (!layer) return;
  layer.innerHTML = '';

  for (const o of ORBS) {
    const el = document.createElement('div');
    el.className = 'orb';
    el.style.width = o.d + 'px';
    el.style.height = o.d + 'px';
    el.style.background = `var(${o.c})`;
    el.style.filter = `blur(${o.blur}px)`;
    el.style.opacity = String(o.op);
    el.style.animationDuration = o.dur + 's';
    for (const [k, v] of Object.entries(o.pos)) el.style[k] = v;
    layer.appendChild(el);
  }
}
