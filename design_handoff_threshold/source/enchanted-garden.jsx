// enchanted-garden.jsx — Cat & Co · The Threshold
// Moonlit threshold page. Hanging Moroccan lanterns drop on fine gold chains
// from the gold rules either side of the date bar; cats sit on a fence below,
// gazing up at the moon.

const ROOMS = [
  { id: 'almanac',  name: 'Energy Tracker', sub: 'today\u2019s weather for your nervous system', glow: '#3a78d8', glow2: '#86b6ff', svg: 'assets/lantern-01.svg' },
  { id: 'sparks',   name: 'Sparks',         sub: 'a box for small bright things',                glow: '#e35a4a', glow2: '#ffb098', svg: 'assets/lantern-07.svg' },
  { id: 'neural',   name: 'First Aid',      sub: 'practices that settle the body',               glow: '#a8132a', glow2: '#ff7888', svg: 'assets/lantern-02.svg' },
  { id: 'games',    name: 'Games',          sub: 'a soft place to drift',                        glow: '#2a8a5a', glow2: '#88e2b4', svg: 'assets/lantern-04.svg' },
  { id: 'threads',  name: 'More Lights',    sub: 'lit windows of the people you love',           glow: '#7a4ad8', glow2: '#c8a8ff', svg: 'assets/lantern-03.svg' },
];

// ────────────────────────────────────────────────────────────
// Moon
// ────────────────────────────────────────────────────────────
function Moon() {
  return (
    <div style={{
      position: 'fixed',
      top: 'clamp(380px, 56vh, 720px)',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'clamp(360px, 42vw, 620px)',
      height: 'clamp(360px, 42vw, 620px)',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgba(225,238,252,0.6)" />
            <stop offset="22%" stopColor="rgba(195,220,242,0.32)" />
            <stop offset="45%" stopColor="rgba(170,200,230,0.14)" />
            <stop offset="75%" stopColor="rgba(160,190,220,0.05)" />
            <stop offset="100%" stopColor="rgba(160,190,220,0)" />
          </radialGradient>
          <radialGradient id="moon-body" cx="42%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#f8f4e8" />
            <stop offset="40%" stopColor="#e4e6e8" />
            <stop offset="70%" stopColor="#c8cfd8" />
            <stop offset="100%" stopColor="#8ea0b0" />
          </radialGradient>
          <radialGradient id="moon-texture" cx="60%" cy="55%" r="40%">
            <stop offset="0%" stopColor="rgba(150,170,190,0)" />
            <stop offset="100%" stopColor="rgba(110,130,160,0.32)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#moon-halo)" />
        <circle cx="50" cy="50" r="24" fill="url(#moon-body)" />
        <circle cx="50" cy="50" r="24" fill="url(#moon-texture)" opacity="0.55" />
        <circle cx="46" cy="46" r="1.7" fill="rgba(130,150,175,0.25)" />
        <circle cx="55" cy="53" r="2.1" fill="rgba(130,150,175,0.3)" />
        <circle cx="51" cy="44" r="1.0" fill="rgba(130,150,175,0.22)" />
        <circle cx="44" cy="55" r="1.3" fill="rgba(130,150,175,0.2)" />
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Star field
// ────────────────────────────────────────────────────────────
function StarField() {
  const stars = React.useMemo(() => {
    let s = 1337;
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const arr = [];
    for (let i = 0; i < 220; i++) {
      arr.push({
        x: rn() * 100,
        y: rn() * 55,
        r: 0.3 + rn() * 1.1,
        o: 0.3 + rn() * 0.6,
        dur: 2.5 + rn() * 5,
        delay: rn() * 5,
        hue: rn() < 0.25 ? 'warm' : rn() < 0.35 ? 'blue' : 'cream',
      });
    }
    for (let i = 0; i < 14; i++) {
      arr.push({
        x: rn() * 96 + 2,
        y: rn() * 50 + 2,
        r: 1.6 + rn() * 1.2,
        o: 0.85 + rn() * 0.15,
        dur: 4 + rn() * 3,
        delay: rn() * 3,
        hue: 'warm',
        big: true,
      });
    }
    return arr;
  }, []);
  const color = (h) => h === 'warm' ? '#ffd58a' : h === 'blue' ? '#bfd3f0' : '#f2f0e6';
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((s, i) => (
        <circle key={i}
          cx={s.x} cy={s.y} r={s.r * 0.16}
          fill={color(s.hue)}
          className="star"
          style={{
            '--dur': `${s.dur}s`,
            '--op-max': s.o,
            '--op-min': s.o * 0.25,
            '--delay': `-${s.delay}s`,
            filter: s.big
              ? `drop-shadow(0 0 ${s.r * 0.3}px ${color(s.hue)}) drop-shadow(0 0 ${s.r * 0.8}px ${color(s.hue)})`
              : undefined,
          }} />
      ))}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Forest framing — soft side hazes, ground fog, faint blooms
// ────────────────────────────────────────────────────────────
function ForestFrame() {
  const grassTufts = React.useMemo(() => {
    let s = 314;
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: 70 }).map(() => ({
      x: rn() * 1600,
      y: 880 + rn() * 110,
      h: 12 + rn() * 26,
      sway: (rn() - 0.5) * 4,
      o: 0.35 + rn() * 0.45,
    }));
  }, []);
  const flowerBlooms = React.useMemo(() => {
    let s = 1729;
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const palette = ['#e8d8f0', '#f4e0e6', '#dfe8f4', '#f0e6c8', '#e0d4ec'];
    return Array.from({ length: 46 }).map(() => ({
      x: rn() * 1600,
      y: 860 + rn() * 130,
      r: 3 + rn() * 5,
      color: palette[Math.floor(rn() * palette.length)],
      o: 0.55 + rn() * 0.4,
    }));
  }, []);
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      <defs>
        <radialGradient id="leftHaze" cx="0%" cy="60%" r="55%">
          <stop offset="0%" stopColor="rgba(20,28,48,0.85)" />
          <stop offset="55%" stopColor="rgba(18,24,42,0.55)" />
          <stop offset="100%" stopColor="rgba(8,12,28,0)" />
        </radialGradient>
        <radialGradient id="rightHaze" cx="100%" cy="60%" r="55%">
          <stop offset="0%" stopColor="rgba(20,28,48,0.85)" />
          <stop offset="55%" stopColor="rgba(18,24,42,0.55)" />
          <stop offset="100%" stopColor="rgba(8,12,28,0)" />
        </radialGradient>
        <linearGradient id="groundFog" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%"  stopColor="rgba(140,170,200,0.35)" />
          <stop offset="40%" stopColor="rgba(150,175,205,0.18)" />
          <stop offset="100%" stopColor="rgba(150,175,205,0)" />
        </linearGradient>
        <linearGradient id="floorFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(10,15,32,0)" />
          <stop offset="60%" stopColor="rgba(8,12,28,0.6)" />
          <stop offset="100%" stopColor="rgba(6,10,22,0.95)" />
        </linearGradient>
        <radialGradient id="flowerPatch" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="rgba(38,28,55,0.6)" />
          <stop offset="100%" stopColor="rgba(20,18,40,0)" />
        </radialGradient>
        <filter id="softblur"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="lightblur"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>
      <rect x="0" y="0" width="520" height="1000" fill="url(#leftHaze)" />
      <rect x="1080" y="0" width="520" height="1000" fill="url(#rightHaze)" />
      <ellipse cx="800" cy="960" rx="1100" ry="280" fill="url(#floorFade)" />
      <g filter="url(#softblur)" opacity="0.85">
        <ellipse cx="180" cy="940" rx="320" ry="120" fill="url(#flowerPatch)" />
        <ellipse cx="1420" cy="940" rx="320" ry="120" fill="url(#flowerPatch)" />
        <ellipse cx="800" cy="980" rx="500" ry="80" fill="url(#flowerPatch)" />
      </g>
      <g opacity="0.9">
        {grassTufts.map((g, i) => (
          <path key={i}
            d={`M ${g.x} ${g.y} Q ${g.x + g.sway} ${g.y - g.h * 0.6} ${g.x + g.sway * 1.5} ${g.y - g.h}`}
            stroke="rgba(60,80,90,0.7)" strokeWidth="0.7" fill="none" opacity={g.o} />
        ))}
      </g>
      <g filter="url(#lightblur)">
        {flowerBlooms.map((f, i) => (
          <g key={i} opacity={f.o} transform={`translate(${f.x}, ${f.y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy={-f.r * 0.8} rx={f.r * 0.4} ry={f.r * 0.7}
                transform={`rotate(${a})`} fill={f.color} />
            ))}
            <circle cx="0" cy="0" r={f.r * 0.3} fill="#fff7d0" opacity="0.9" />
          </g>
        ))}
      </g>
      <rect x="0" y="640" width="1600" height="360" fill="url(#groundFog)" opacity="0.85" />
      <g filter="url(#softblur)" opacity="0.45">
        <ellipse cx="350" cy="820" rx="280" ry="40" fill="rgba(180,200,220,0.5)" />
        <ellipse cx="1150" cy="850" rx="320" ry="42" fill="rgba(180,200,220,0.5)" />
        <ellipse cx="780" cy="880" rx="380" ry="40" fill="rgba(180,200,220,0.5)" />
      </g>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Blossom branches across top
// ────────────────────────────────────────────────────────────
function BlossomBranches() {
  const blossomsL = React.useMemo(() => {
    let s = 99;
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const pts = [];
    for (let i = 0; i < 80; i++) {
      const t = rn();
      const bx = t * 44;
      const by = 4 + t * 30 + (rn() - 0.5) * 8;
      pts.push({ x: bx + (rn() - 0.5) * 5, y: by + (rn() - 0.5) * 4, r: 0.5 + rn() * 1.4, warm: rn() < 0.18 });
    }
    return pts;
  }, []);
  const blossomsR = React.useMemo(() => {
    let s = 77;
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const pts = [];
    for (let i = 0; i < 80; i++) {
      const t = rn();
      const bx = 100 - t * 44;
      const by = 4 + t * 30 + (rn() - 0.5) * 8;
      pts.push({ x: bx + (rn() - 0.5) * 5, y: by + (rn() - 0.5) * 4, r: 0.5 + rn() * 1.4, warm: rn() < 0.18 });
    }
    return pts;
  }, []);
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      <defs>
        <radialGradient id="bl-cool">
          <stop offset="0%" stopColor="#fbf6ff" stopOpacity="0.98" />
          <stop offset="40%" stopColor="#dccef0" stopOpacity="0.85" />
          <stop offset="80%" stopColor="#a3b4d8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8aa0c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bl-warm">
          <stop offset="0%" stopColor="#fff2d6" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#f4c890" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#d09858" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="branch" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(20,18,28,0.45)" />
          <stop offset="100%" stopColor="rgba(40,30,40,0.15)" />
        </linearGradient>
      </defs>
      <g stroke="url(#branch)" strokeWidth="0.22" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M 0 6 Q 10 10, 18 14 Q 26 18, 32 24 Q 36 28, 40 32" />
        <path d="M 18 14 Q 22 20, 20 28" />
        <path d="M 26 18 Q 30 24, 28 32" />
        <path d="M 0 20 Q 6 22, 12 26 Q 18 30, 22 36" />
      </g>
      <g stroke="url(#branch)" strokeWidth="0.22" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M 100 6 Q 90 10, 82 14 Q 74 18, 68 24 Q 64 28, 60 32" />
        <path d="M 82 14 Q 78 20, 80 28" />
        <path d="M 74 18 Q 70 24, 72 32" />
        <path d="M 100 20 Q 94 22, 88 26 Q 82 30, 78 36" />
      </g>
      {blossomsL.map((b, i) => (
        <circle key={`l${i}`} cx={b.x} cy={b.y} r={b.r * 0.16}
          fill={b.warm ? "url(#bl-warm)" : "url(#bl-cool)"}
          opacity={b.warm ? 0.85 : 0.92} />
      ))}
      {blossomsR.map((b, i) => (
        <circle key={`r${i}`} cx={b.x} cy={b.y} r={b.r * 0.16}
          fill={b.warm ? "url(#bl-warm)" : "url(#bl-cool)"}
          opacity={b.warm ? 0.85 : 0.92} />
      ))}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Fireflies
// ────────────────────────────────────────────────────────────
function Fireflies() {
  const flies = React.useMemo(() => {
    let s = 2024;
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: 38 }).map(() => ({
      x: rn() * 100,
      y: 25 + rn() * 70,
      size: 2 + rn() * 3,
      dur: 7 + rn() * 9,
      delay: rn() * 10,
      fx: (rn() - 0.5) * 120,
      fy: -(20 + rn() * 60),
      hue: rn() < 0.15 ? '#fff4c0' : '#fdd874',
    }));
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      {flies.map((f, i) => (
        <div key={i} className="firefly" style={{
          position: 'absolute',
          left: `${f.x}%`, top: `${f.y}%`,
          width: f.size, height: f.size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${f.hue}, ${f.hue}88 40%, transparent 70%)`,
          boxShadow: `0 0 ${f.size * 3}px ${f.hue}, 0 0 ${f.size * 6}px ${f.hue}66`,
          '--dur': `${f.dur}s`,
          '--fx': `${f.fx}px`,
          '--fy': `${f.fy}px`,
          animationDelay: `-${f.delay}s`,
        }} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Ambient bokeh
// ────────────────────────────────────────────────────────────
function AmbientBokeh() {
  const orbs = React.useMemo(() => {
    let s = 555;
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const colors = ['#5FAFA7', '#E8B87C', '#E39AAA', '#B29AD8', '#7CB78E', '#F0D080', '#a6d6ff'];
    return Array.from({ length: 22 }).map(() => ({
      x: rn() * 100,
      y: rn() * 100,
      size: 30 + rn() * 90,
      color: colors[Math.floor(rn() * colors.length)],
      opacity: 0.15 + rn() * 0.22,
      dur: 10 + rn() * 14,
      dx: (rn() - 0.5) * 30,
      dy: (rn() - 0.5) * 30,
      delay: rn() * 8,
    }));
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}>
      {orbs.map((o, i) => (
        <div key={i} className="orb-float" style={{
          position: 'absolute',
          left: `${o.x}%`, top: `${o.y}%`,
          width: o.size, height: o.size,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle at 38% 38%, ${o.color}ee, ${o.color}66 35%, ${o.color}22 65%, transparent 78%)`,
          borderRadius: '50%',
          opacity: o.opacity,
          filter: `blur(${o.size * 0.05}px)`,
          animationDuration: `${o.dur}s`,
          animationDelay: `-${o.delay}s`,
          '--dx': `${o.dx}px`, '--dy': `${o.dy}px`,
        }} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// HangingLantern — chain + colored radial glow + black SVG metalwork
// `chainTopY` is in vh and `xPct` is the horizontal position; chain goes
// from the top of the viewport down to the lantern. Each lantern sways.
// ────────────────────────────────────────────────────────────
function HangingLantern({ room, xPct, chainVh, size, sway, delay, onHover }) {
  const [hover, setHover] = React.useState(false);
  // The wrapper sits at top:0 of the lantern layer, which is anchored
  // a few pixels above the gold rule line. Chain extends DOWN by `chainVh`vh
  // to the lantern itself. Sway pivots from the chain's anchor.
  return (
    <div
      onMouseEnter={() => { setHover(true); onHover && onHover(room.id); }}
      onMouseLeave={() => { setHover(false); onHover && onHover(null); }}
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: 0,
        transform: 'translateX(-50%)',
        width: size,
        pointerEvents: 'auto',
        cursor: 'default',
        animation: `lanternSway ${10 + sway}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformOrigin: 'top center',
      }}>
      {/* fine gold chain — rises FROM the lantern UP TO the gold rule (top:0) */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
        width: 1.2,
        height: `${chainVh}vh`,
        background: 'linear-gradient(180deg, rgba(244,212,158,0.95) 0%, rgba(244,212,158,0.85) 40%, rgba(232,184,124,0.7) 100%)',
        boxShadow: '0 0 4px rgba(244,212,158,0.5)',
      }} />
      {/* tiny chain link at the lantern attachment point */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: `calc(${chainVh}vh - 8px)`,
        transform: 'translateX(-50%)',
        width: 5, height: 10,
        background: 'linear-gradient(180deg, rgba(232,184,124,0.7), rgba(244,212,158,1))',
        borderRadius: 2,
        boxShadow: '0 0 6px rgba(244,212,158,0.7)',
      }} />
      {/* tiny ring where the chain meets the gold rule */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: -3,
        transform: 'translateX(-50%)',
        width: 6, height: 6,
        borderRadius: '50%',
        border: '1px solid rgba(244,212,158,0.95)',
        boxShadow: '0 0 6px rgba(244,212,158,0.7)',
      }} />

      {/* Lantern container */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: `${chainVh}vh`,
        transform: `translate(-50%, 0) scale(${hover ? 1.06 : 1})`,
        width: size,
        height: size * 1.3,
        transition: 'transform 380ms cubic-bezier(.2,.9,.2,1)',
      }}>
        {/* coloured radial glow behind the lantern */}
        <div style={{
          position: 'absolute',
          inset: '-30%',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 52%, ${room.glow2} 0%, ${room.glow}cc 18%, ${room.glow}55 40%, ${room.glow}00 75%)`,
          filter: `blur(${hover ? 10 : 14}px)`,
          opacity: hover ? 1 : 0.85,
          transition: 'opacity 300ms, filter 300ms',
          mixBlendMode: 'screen',
          animation: 'lanternBreathe 4s ease-in-out infinite',
          animationDelay: `${delay}s`,
        }} />
        {/* inner bright candle core */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '54%',
          transform: 'translate(-50%, -50%)',
          width: '40%', height: '40%',
          borderRadius: '50%',
          background: `radial-gradient(circle, #fff8d4 0%, ${room.glow2} 40%, ${room.glow}aa 70%, transparent 90%)`,
          mixBlendMode: 'screen',
          filter: 'blur(2px)',
          animation: 'lanternFlicker 3.2s ease-in-out infinite',
          animationDelay: `${delay * 0.7}s`,
        }} />
        {/* the lantern metalwork SVG, on top — black/transparent cutouts */}
        <img src={room.svg} alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            // The provided SVGs are black artwork on transparent.
            // Tint them slightly warm so they read as aged brass against the glow.
            filter: 'brightness(0.18) drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Hover tooltip — room name + subtitle */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: `calc(${chainVh}vh + ${size * 1.3 + 14}px)`,
        transform: `translate(-50%, ${hover ? '0' : '-4px'})`,
        opacity: hover ? 1 : 0,
        transition: 'opacity 280ms, transform 280ms',
        pointerEvents: 'none',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          fontFamily: 'Italiana, serif',
          fontSize: 22,
          color: '#fff8e8',
          letterSpacing: 2,
          textShadow: `0 0 16px ${room.glow}, 0 0 30px ${room.glow}aa, 0 1px 2px rgba(0,0,0,0.7)`,
        }}>{room.name}</div>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 14,
          color: '#d6c8b5',
          marginTop: 4,
          letterSpacing: 0.3,
          textShadow: '0 1px 2px rgba(0,0,0,0.7)',
        }}>{room.sub}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Date / time bar — gold rules either side, soft date string in middle
// ────────────────────────────────────────────────────────────
function DateBar() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);
  const dayName = now.toLocaleDateString(undefined, { weekday: 'long' });
  const dateStr = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return (
    <div id="date-bar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'clamp(16px, 3vw, 36px)',
      margin: '24px auto 0',
      maxWidth: 760,
      padding: '0 24px',
    }}>
      <div className="goldrule" style={{ flex: 1, height: 1, maxWidth: 240,
        background: 'linear-gradient(90deg, rgba(232,184,124,0) 0%, rgba(232,184,124,0.6) 40%, rgba(244,212,158,0.95) 100%)',
        boxShadow: '0 0 8px rgba(244,212,158,0.4)',
      }} />
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 'clamp(13px, 1.5vw, 16px)',
        letterSpacing: 3,
        color: '#e9d8b9',
        textTransform: 'lowercase',
        textShadow: '0 0 12px rgba(232,184,124,0.4)',
        whiteSpace: 'nowrap',
      }}>
        {dayName.toLowerCase()} · {dateStr.toLowerCase()} · {timeStr}
      </div>
      <div className="goldrule" style={{ flex: 1, height: 1, maxWidth: 240,
        background: 'linear-gradient(90deg, rgba(244,212,158,0.95) 0%, rgba(232,184,124,0.6) 60%, rgba(232,184,124,0) 100%)',
        boxShadow: '0 0 8px rgba(244,212,158,0.4)',
      }} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Cats on a fence — bottom of the page, screen-blend so the
// dark PNG background drops out and only the cats/fence remain.
// ────────────────────────────────────────────────────────────
function CatsOnFence() {
  return (
    <div style={{
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      // Cats + fence live in the bottom ~20vh band only — fixed height
      // with overflow:hidden so the whitespace above the cats in the
      // square source PNG never pushes into the lantern zone.
      height: '20vh',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 5,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
    }}>
      <img src="assets/cats-on-fence.png" alt=""
        draggable={false}
        style={{
          // Source is 3000×3000 with cats+fence in roughly the lower
          // 60% of the canvas. Sizing by HEIGHT keeps the band fixed;
          // letting the image be larger than the band + clipped by the
          // wrapper's overflow:hidden lets the cats sit at full size
          // anchored to the bottom edge.
          height: '32vh',
          width: 'auto',
          maxWidth: '96vw',
          objectFit: 'contain',
          objectPosition: 'center bottom',
          mixBlendMode: 'screen',
          filter: 'brightness(0.92) contrast(1.05) saturate(0.9)',
          marginBottom: -4,
          userSelect: 'none',
        }} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// useIsMobile
// ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  React.useEffect(() => {
    const on = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return m;
}

// ────────────────────────────────────────────────────────────
// Lantern layout — five lanterns scattered organically across the page,
// hanging at different heights. Heights and horizontal positions are
// chosen to feel handhung — not symmetric, not regular, but balanced.
// ────────────────────────────────────────────────────────────
//
// Coordinates:
//   xPct  — horizontal % across viewport (centre-of-lantern)
//   drop  — vh distance from top of viewport down to lantern top edge
//
// Order in ROOMS: almanac (Energy Tracker, blue),
//                 sparks   (Sparks, coral),
//                 neural   (First Aid, crimson),
//                 games    (Games, green),
//                 threads  (More Lights, purple)
//
function lanternLayout(isMobile) {
  if (isMobile) {
    // Mobile: shorter chains so all five fit between bar (~38vh) and fence (~76vh)
    return [
      { id: 'almanac', xPct: 14, chainVh: 4,  size: 60, sway: 1.2, delay: 0.0 },
      { id: 'sparks',  xPct: 36, chainVh: 12, size: 64, sway: 0.8, delay: 1.4 },
      { id: 'neural',  xPct: 58, chainVh: 8,  size: 60, sway: 1.6, delay: 0.7 },
      { id: 'games',   xPct: 80, chainVh: 14, size: 62, sway: 1.0, delay: 2.1 },
      { id: 'threads', xPct: 26, chainVh: 18, size: 56, sway: 1.4, delay: 2.8 },
    ];
  }
  // Desktop: lanterns hang in the SKY between the date bar (~38–40vh)
  // and the fence top (~76vh). With lanterns ~25vh tall, chain lengths
  // 4–12vh keep all five comfortably above the fence.
  return [
    { id: 'almanac', xPct: 12, chainVh: 6,  size: 100, sway: 1.4, delay: 0.0 }, // sapphire — short chain
    { id: 'sparks',  xPct: 30, chainVh: 12, size: 92,  sway: 0.9, delay: 1.6 }, // coral — deeper drop
    { id: 'neural',  xPct: 50, chainVh: 9,  size: 96,  sway: 1.7, delay: 0.6 }, // crimson — mid drop, in front of moon
    { id: 'games',   xPct: 70, chainVh: 11, size: 94,  sway: 1.0, delay: 2.4 }, // emerald — mid-deep
    { id: 'threads', xPct: 88, chainVh: 5,  size: 90,  sway: 1.3, delay: 3.1 }, // amethyst — short chain
  ];
}

// ────────────────────────────────────────────────────────────
// App
// ────────────────────────────────────────────────────────────
function App() {
  const isMobile = useIsMobile();
  const layout = React.useMemo(() => lanternLayout(isMobile), [isMobile]);
  const [, setHovered] = React.useState(null);

  return (
    <>
      <Moon />
      <StarField />
      <ForestFrame />
      <AmbientBokeh />
      <Fireflies />

      {/* Hero block — sits in the top ~40vh. Tightened so the date bar
          lands at ~38–40vh, leaving room for lanterns to hang in the
          middle zone above the fence. */}
      <div style={{
        position: 'relative',
        zIndex: 4,
        textAlign: 'center',
        padding: isMobile ? '20px 18px 0' : '28px 24px 0',
      }}>
        {/* threshold header */}
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 'clamp(11px, 1.1vw, 13px)',
          letterSpacing: 6,
          textTransform: 'lowercase',
          color: '#c9b48a',
          textShadow: '0 0 14px rgba(232,184,124,0.35)',
        }}>
          · the threshold ·
        </div>

        {/* Cat & Co title — with the uploaded logo as the ampersand */}
        <div style={{
          fontFamily: 'Italiana, serif',
          fontSize: 'clamp(52px, 7.5vw, 110px)',
          margin: '8px 0 2px', letterSpacing: 2, lineHeight: 1,
          background: 'linear-gradient(180deg, #fff4c9 0%, #f3d98f 18%, #e8b87c 38%, #b8832e 56%, #8a5d28 72%, #d9a655 88%, #f3d98f 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent', color: 'transparent',
          filter: 'drop-shadow(0 1px 0 rgba(90,58,24,0.55)) drop-shadow(0 0 36px rgba(242,205,140,0.34))',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.18em',
          width: '100%',
        }}>
          <span>Cat</span>
          <img src="assets/logo.png" alt="&"
            draggable={false}
            style={{
              // height to roughly the cap height; logo's natural aspect (~2:3) is preserved
              height: '0.92em',
              width: 'auto',
              display: 'inline-block',
              verticalAlign: 'middle',
              // pull it slightly into the line so it sits like an ampersand
              transform: 'translateY(-0.04em)',
              filter: 'drop-shadow(0 0 18px rgba(242,205,140,0.45))',
              userSelect: 'none',
            }}
          />
          <span>Co</span>
        </div>

        {/* hero text — sits in front of the moon; we add a stronger
            text shadow + a tight darker scrim so it stays readable. */}
        <div style={{
          margin: '10px auto 0',
          maxWidth: 580,
          padding: '0 24px',
          fontStyle: 'italic',
          fontSize: isMobile ? 17 : 21,
          color: '#efe1cc',
          lineHeight: 1.55,
          textWrap: 'pretty',
          textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 24px rgba(8,12,28,0.85), 0 0 48px rgba(8,12,28,0.6)',
          position: 'relative',
          zIndex: 1,
        }}>
          The hour when the light softens —
          a small lit place to set your day down,
          and a lantern for the way ahead.
        </div>

        {/* date / time bar with gold rules */}
        <DateBar />

        {/* Lantern hanging layer — anchored at the date bar's gold-rule line.
            Each lantern hangs by a chain UP to top:0 of this container.
            height:0 + overflow:visible so it doesn't push other content. */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          height: 0,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          {layout.map((L) => {
            const room = ROOMS.find(r => r.id === L.id);
            return (
              <HangingLantern
                key={L.id}
                room={room}
                xPct={L.xPct}
                chainVh={L.chainVh}
                size={L.size}
                sway={L.sway}
                delay={L.delay}
                onHover={setHovered}
              />
            );
          })}
        </div>
      </div>

      {/* Cats on fence */}
      <CatsOnFence />

      {/* Bottom invitation text */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: isMobile ? 14 : 22,
        textAlign: 'center',
        zIndex: 7,
        pointerEvents: 'none',
        padding: '0 24px',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: isMobile ? 13 : 15,
          letterSpacing: 1.2,
          color: '#cdb89c',
          textShadow: '0 1px 8px rgba(0,0,0,0.7), 0 0 14px rgba(232,184,124,0.18)',
        }}>
          Take a breath. Nothing here is urgent.
        </div>
      </div>

      {/* Corner navigation to other versions */}
      <div style={{
        position: 'fixed', top: 16, right: 20, zIndex: 60,
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end',
      }}>
        <a href="Cat and Co.html" style={{
          fontStyle: 'italic', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase',
          color: '#b7a89a', textDecoration: 'none',
          padding: '6px 14px', border: '1px solid rgba(232,184,124,0.2)', borderRadius: 20,
          background: 'rgba(5,8,23,0.55)', backdropFilter: 'blur(6px)',
        }}>lantern →</a>
        <a href="Cat and Co — Night Garden.html" style={{
          fontStyle: 'italic', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase',
          color: '#b7a89a', textDecoration: 'none',
          padding: '6px 14px', border: '1px solid rgba(232,184,124,0.2)', borderRadius: 20,
          background: 'rgba(5,8,23,0.55)', backdropFilter: 'blur(6px)',
        }}>gemstones →</a>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
