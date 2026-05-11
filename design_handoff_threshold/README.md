# Handoff: The Threshold (Cat & Co)

## Overview

**The Threshold** is the entry/landing page for Cat & Co — a moonlit, contemplative "soft place to set your day down." It serves as a calm room-picker that leads into the app's five sub-spaces (Energy Tracker, Sparks, First Aid, Games, More Lights). The visual metaphor: walking up to a garden at twilight, where lanterns hang in the open sky above a fence of cats, each lantern a doorway into a different room.

The page is intentionally non-utilitarian. There are no calls-to-action, no progress bars, no urgency. The line at the bottom — "Take a breath. Nothing here is urgent." — is the brief.

## About the Design Files

The files in `source/` are **design references created in HTML/JSX as a single-page prototype**. They are not production code to copy directly. Your task is to recreate this design inside the existing Cat & Co React codebase (`catryx-14/cat-co` on GitHub, deployed on Vercel), using its established component patterns, routing, and styling approach.

The prototype runs as a single HTML file that loads React + Babel from CDN and renders the JSX file at runtime. In production, you'll port the JSX to whatever your app's stack uses (likely a regular React component file with proper imports, possibly Tailwind/CSS-modules/styled-components — match the existing codebase).

## Fidelity

**High fidelity.** Recreate the design as closely as possible:
- Exact hex colors and gradient stops
- Exact font families (Italiana, Cormorant Garamond) and the specified sizes/weights/letter-spacing
- The same SVG lantern artwork (in `source/assets/lantern-0*.svg`)
- The same cats-on-fence and ampersand-cat logo (in `source/assets/cats-on-fence.png`, `source/assets/logo.png`)
- The atmospheric layers (twinkling stars, fireflies, moon halo, ground fog) — these are essential to the mood, not decoration
- The lantern sway / candle flicker / glow-breathe animations

If you must drop something to ship, the priority order from MOST important to least:
1. The lantern arrangement and chain hanging from the date bar
2. The moon and night sky atmosphere
3. The cats-on-fence at the bottom
4. The twinkling stars
5. The fireflies
6. The ground fog and side hazes

---

## Layout — Three Vertical Zones

The page is built as a single full-viewport scene with **three stacked zones** measured in `vh`:

```
┌─────────────────────────────────────┐  0vh
│                                      │
│  TOP ZONE (0–40vh)                  │
│   • "· the threshold ·"              │
│   • Cat & Co (large gold title)      │
│   • Hero subtitle (italic, 3 lines)  │
│   • Date / time bar with gold rules  │  <-- gold rules at ~38vh
│                                      │
├─────────────────────────────────────┤  40vh
│                                      │
│  MIDDLE ZONE (40–78vh)              │
│   • Moon (centered ~56vh)            │
│   • Five lanterns hanging on chains  │
│     from the gold rules above        │
│                                      │
├─────────────────────────────────────┤  78vh
│  BOTTOM ZONE (78–100vh)             │
│   • Cats sitting on a fence          │
│   • "Take a breath…" line at bottom  │
└─────────────────────────────────────┘  100vh
```

**Hard rules:**
1. The date bar's gold rules are the chain anchor. Lanterns must hang from those rules — chains rise UP from each lantern to a ring on a gold rule.
2. Lanterns must NEVER overlap the cats/fence band.
3. The cats wrapper must NEVER extend up into the lantern zone or cover the hero text.
4. The moon sits in the middle zone behind the lanterns — it must NOT sit behind the hero subtitle.

These are non-negotiable; getting them wrong was the primary defect during prototyping.

---

## Atmospheric Layers (z-index stack, back to front)

| z-index | Layer | Purpose |
|---|---|---|
| 0 | `.sky` (CSS gradient) | Deep blue-purple night base |
| 0 | `<Moon />` | Moon disc + halo (`position: fixed`) |
| 1 | `<StarField />` (SVG) | ~120 twinkling stars, varied hue/size/duration |
| 1 | `<ForestFrame />` (SVG) | Side hazes, ground fog, blurred flower patches, grass tufts |
| 2 | `<AmbientBokeh />` | Soft floating colored orbs |
| 3 | `<Fireflies />` | ~16 yellow firefly dots drifting in arcs |
| 4 | Hero block | Threshold header, title, subtitle, date bar |
| 5 | Lantern layer | Five hanging lanterns, anchored to date bar |
| 5 | Cats-on-fence | Bottom-anchored, clipped to 20vh |
| 7 | "Take a breath…" line | Bottom invitation text |
| 60 | Top-right nav links | Optional — can be omitted in production |

All atmospheric layers are `pointer-events: none`. Only the lanterns themselves accept hover (each lantern reveals its room name + subtitle on hover).

---

## Design Tokens

### Colors

| Role | Hex | Notes |
|---|---|---|
| Page background | `#050817` | Deepest night |
| Sky gradient stops | `#08102a → #0f1a3a → #16204a → #14233f → #0a1530` | Vertical 0% → 100% |
| Moon halo (teal) | `rgba(140,175,195,0.32)` | Top haze |
| Bottom blue haze | `rgba(20,35,55,0.85)` | Anchors fence zone |
| Gold (lightest) | `#fff4c9` | Top of title gradient |
| Gold (mid-light) | `#f3d98f` | |
| Gold (warm) | `#e8b87c` | |
| Gold (deep) | `#b8832e` → `#8a5d28` | Title shadow tones |
| Gold rule (bright) | `rgba(244,212,158,0.95)` | Chains, date-bar rules |
| Gold rule (mid) | `rgba(232,184,124,0.6)` | Rule fade |
| Cream text | `#efe1cc` | Hero subtitle |
| Warm body text | `#d6c8b5` / `#cdb89c` | Tooltips, "take a breath" |
| Threshold lavender | `#c9b48a` | "· the threshold ·" |
| Date-bar text | `#e9d8b9` | Italic date string |

### Lantern (room) glow palette

Each room has a `glow` (deep) and `glow2` (highlight) color used for radial halos behind the lantern:

| Room id | Display name | `glow` | `glow2` | SVG |
|---|---|---|---|---|
| `almanac` | Energy Tracker | `#3a78d8` (sapphire) | `#86b6ff` | `lantern-01.svg` |
| `sparks` | Sparks | `#e35a4a` (coral) | `#ffb098` | `lantern-07.svg` |
| `neural` | First Aid | `#a8132a` (crimson) | `#ff7888` | `lantern-02.svg` |
| `games` | Games | `#2a8a5a` (emerald) | `#88e2b4` | `lantern-04.svg` |
| `threads` | More Lights | `#7a4ad8` (amethyst) | `#c8a8ff` | `lantern-03.svg` |

Subtitles (lowercase, italic, shown on hover):
- Energy Tracker: *today's weather for your nervous system*
- Sparks: *a box for small bright things*
- First Aid: *practices that settle the body*
- Games: *a soft place to drift*
- More Lights: *lit windows of the people you love*

### Typography

Two Google Fonts. Preconnect + load via:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Italiana&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=swap" rel="stylesheet" />
```

| Element | Font | Weight | Size | Style |
|---|---|---|---|---|
| `· the threshold ·` | Cormorant Garamond | 400 | `clamp(11px, 1.1vw, 13px)` | italic, lowercase, letter-spacing 6 |
| `Cat & Co` (title) | Italiana | 400 | `clamp(52px, 7.5vw, 110px)` | letter-spacing 2, line-height 1, gold gradient |
| Hero subtitle | Cormorant Garamond | 400 | 21px (desktop), 17px (mobile) | italic, line-height 1.55, color `#efe1cc` |
| Date bar | Cormorant Garamond | 400 | `clamp(13px, 1.5vw, 16px)` | italic, lowercase, letter-spacing 3 |
| Lantern tooltip name | Italiana | 400 | 22px | letter-spacing 2 |
| Lantern tooltip sub | Cormorant Garamond | 400 | 14px | italic, letter-spacing 0.3 |
| Bottom invitation | Cormorant Garamond | 400 | 15px (desktop), 13px (mobile) | italic, letter-spacing 1.2 |

Body default: `font-family: 'Cormorant Garamond', Georgia, serif`.

### Title gradient

The "Cat & Co" wordmark uses an 8-stop vertical gradient clipped to text:

```css
background: linear-gradient(180deg,
  #fff4c9 0%, #f3d98f 18%, #e8b87c 38%,
  #b8832e 56%, #8a5d28 72%, #d9a655 88%, #f3d98f 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
filter: drop-shadow(0 1px 0 rgba(90,58,24,0.55))
        drop-shadow(0 0 36px rgba(242,205,140,0.34));
```

The `&` between "Cat" and "Co" is **not a typed glyph** — it's `assets/logo.png` (a small gold cat shaped like an ampersand, transparent PNG). Render it as `<img>` inside the title flex row, sized to roughly the cap height. See "Title with image ampersand" in the Components section.

### Spacing / Layout values

| Property | Value |
|---|---|
| Top zone | 0 → ~40vh |
| Middle zone | ~40 → ~78vh |
| Bottom zone (cats wrapper) | bottom-anchored, height `20vh`, `overflow: hidden` |
| Hero block padding (desktop) | `28px 24px 0` |
| Hero block padding (mobile) | `20px 18px 0` |
| Date bar max-width | 760px |
| Date bar gold rule max-width | 240px each side |
| Date bar gap | `clamp(16px, 3vw, 36px)` |
| Hero subtitle max-width | 580px |
| Lantern chain width | 1.2px |
| Lantern chain anchor ring | 6×6px, 1px gold border |

---

## Components

### `<Moon />`

A circular moon disc with multi-layer halo, fixed-positioned in the middle zone.

```jsx
position: fixed;
top: clamp(380px, 56vh, 720px);   /* center vertically */
left: 50%;
transform: translate(-50%, -50%);
width: clamp(360px, 42vw, 620px);
height: same as width;
z-index: 0;
pointer-events: none;
```

The moon is a single `<svg viewBox="0 0 100 100">` containing:
1. `<circle r="50" fill="url(#moon-halo)" />` — radial halo, fades to transparent
2. `<circle r="24" fill="url(#moon-body)" />` — main disc, off-white → grey-blue
3. `<circle r="24" fill="url(#moon-texture)" />` — subtle darker shading on lower-right

Halo gradient stops: `rgba(225,238,252,0.6) → rgba(195,220,242,0.32) at 22% → … → 0 at 100%`.
Body gradient: `#f8f4e8 → #e4e6e8 → #c8cfd8 → #8ea0b0`.

### `<StarField />`

`<svg style="position: fixed; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none">` filling the viewport with ~120 twinkling stars. Each star:
- Random position, hue, size (mix of 1.2px small stars and a few 2.5px "big" stars with drop-shadow glow)
- Independent twinkle duration (3–7s) and delay
- CSS `@keyframes twinkle` animates opacity from `--op-max` to `--op-min` (a quarter of max)

### `<ForestFrame />`

A 1600×1000 SVG with `preserveAspectRatio="xMidYMid slice"` overlay. Contains:
- Left & right side hazes (radial gradients fading in from the edges)
- A bottom floor fade (vertical gradient darkening)
- 3 blurred flower-patch ellipses
- 70 procedural grass-tuft paths (deterministic via seeded RNG, seed 314)
- 46 procedural flower blooms (seed 1729)
- A bottom ground fog gradient

Use a seeded RNG (`s = (s * 9301 + 49297) % 233280; rn = s / 233280`) so the layout is stable across reloads.

### `<AmbientBokeh />` and `<Fireflies />`

Floating soft-colored circles (bokeh) and yellow drifting dots (fireflies). Both use procedural placement and CSS `@keyframes float` / `firefly`. See `enchanted-garden.jsx` for exact counts and animation curves.

### Hero block

Centered column. In order, top to bottom:

1. **Threshold header**: `· the threshold ·` in lowercase Cormorant italic, 11–13px, color `#c9b48a`, letter-spacing 6, with a faint gold text-shadow.

2. **Title with image ampersand**:
```jsx
<div style={{
  fontFamily: 'Italiana, serif',
  fontSize: 'clamp(52px, 7.5vw, 110px)',
  margin: '8px 0 2px', letterSpacing: 2, lineHeight: 1,
  background: '<the gold gradient above>',
  WebkitBackgroundClip: 'text', backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 1px 0 rgba(90,58,24,0.55)) drop-shadow(0 0 36px rgba(242,205,140,0.34))',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: '0.18em', width: '100%',
}}>
  <span>Cat</span>
  <img src="/assets/logo.png" alt="&" style={{
    height: '0.92em', width: 'auto',
    transform: 'translateY(-0.04em)',
    filter: 'drop-shadow(0 0 18px rgba(242,205,140,0.45))',
  }} />
  <span>Co</span>
</div>
```

3. **Hero subtitle** (3 lines):
> *The hour when the light softens —
> a small lit place to set your day down,
> and a lantern for the way ahead.*

Color `#efe1cc`, 21px italic, max-width 580px, line-height 1.55. Apply a heavy text-shadow stack so the text stays readable when the moon halo is behind it:
```css
text-shadow:
  0 1px 2px rgba(0,0,0,0.85),
  0 0 24px rgba(8,12,28,0.85),
  0 0 48px rgba(8,12,28,0.6);
```

4. **`<DateBar id="date-bar" />`**: a flex row with two gold rules and a centered italic date/time string. Localizes via `Date.prototype.toLocaleDateString/toLocaleTimeString`. Updates every 30 seconds.

```
─────────────  sunday · may 3 · 7:46 pm  ─────────────
```

Both rules are 1px tall, gradient from transparent → bright gold (left rule fades IN, right rule fades OUT), with a `box-shadow: 0 0 8px rgba(244,212,158,0.4)` for a faint bloom.

### `<HangingLantern />`

The five lanterns are absolutely positioned inside a `position: relative; height: 0; overflow: visible` container that sits **immediately after `<DateBar />` in DOM order**, so its `top: 0` is at the gold-rule level.

Each lantern wrapper:
```jsx
{
  position: 'absolute',
  left: `${xPct}%`,
  top: 0,
  transform: 'translateX(-50%)',
  width: size,
  pointerEvents: 'auto',
  animation: `lanternSway ${10 + sway}s ease-in-out infinite`,
  animationDelay: `${delay}s`,
  transformOrigin: 'top center',  // sway pivots from the chain anchor
}
```

Inside the wrapper:
- **Chain**: `<div>` 1.2px wide, `height: ${chainVh}vh`, gradient `linear-gradient(180deg, rgba(244,212,158,0.95), rgba(244,212,158,0.85), rgba(232,184,124,0.7))`, with subtle `box-shadow: 0 0 4px rgba(244,212,158,0.5)`.
- **Anchor ring** at `top: -3px`: 6×6 1px-bordered circle (where chain meets the gold rule).
- **Tiny bottom link** at `top: chainVh*1vh - 8px`: 5×10 gold rectangle (chain → lantern attachment).
- **Lantern body** at `top: ${chainVh}vh`:
  - Behind: a coloured radial-gradient halo using the room's `glow`/`glow2`, mix-blend-mode `screen`, `lanternBreathe` animation (4s).
  - Behind that: an inner candle core (40% × 40%, white-yellow → glow color radial), `lanternFlicker` animation (3.2s).
  - On top: the lantern SVG (`assets/lantern-0X.svg`) — black metalwork on transparent. Tint with `filter: brightness(0.18) drop-shadow(0 6px 14px rgba(0,0,0,0.55))` so it reads as aged brass against the glow.
- **Tooltip** below the lantern (positioned at `top: chainVh*1vh + size*1.3 + 14px`), `opacity: 0` by default, `1` on hover, with name + subtitle stacked.

#### Lantern layout (desktop)

| id | xPct | chainVh | size (px) | sway delta | animation delay |
|---|---|---|---|---|---|
| `almanac` | 12 | 6 | 110 | 1.4 | 0.0s |
| `sparks` | 30 | 12 | 92 | 0.9 | 1.6s |
| `neural` | 50 | 9 | 96 | 1.7 | 0.6s |
| `games` | 70 | 11 | 94 | 1.0 | 2.4s |
| `threads` | 88 | 5 | 90 | 1.3 | 3.1s |

#### Lantern layout (mobile, `< 768px`)

| id | xPct | chainVh | size (px) | sway delta | animation delay |
|---|---|---|---|---|---|
| `almanac` | 14 | 4 | 60 | 1.2 | 0.0s |
| `sparks` | 36 | 12 | 64 | 0.8 | 1.4s |
| `neural` | 58 | 8 | 60 | 1.6 | 0.7s |
| `games` | 80 | 14 | 62 | 1.0 | 2.1s |
| `threads` | 26 | 18 | 56 | 1.4 | 2.8s |

The mobile layout intentionally drops `threads` lower (longer chain) so the five lanterns don't all collide horizontally on a narrow screen.

### `<CatsOnFence />`

```jsx
<div style={{
  position: 'fixed',
  left: 0, right: 0, bottom: 0,
  height: '20vh',
  overflow: 'hidden',     // critical — clips the empty top of the source PNG
  pointerEvents: 'none',
  zIndex: 5,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
}}>
  <img src="/assets/cats-on-fence.png" style={{
    height: '32vh',       // larger than the wrapper → image is clipped at top
    width: 'auto',
    maxWidth: '96vw',
    objectFit: 'contain',
    objectPosition: 'center bottom',
    mixBlendMode: 'screen',  // drops the dark/transparent surround
    filter: 'brightness(0.92) contrast(1.05) saturate(0.9)',
    marginBottom: -4,
  }} />
</div>
```

The source image is a 3000×3000 PNG with the cats+fence in the lower 60% and transparent above. The `overflow: hidden` wrapper + image height greater than wrapper height means only the bottom of the image is visible, anchored to the bottom edge.

`mix-blend-mode: screen` is essential — it makes any near-black pixels transparent against the night sky, so the cats appear to sit on the night.

### "Take a breath…" line

```jsx
<div style={{
  position: 'fixed', left: 0, right: 0,
  bottom: isMobile ? 14 : 22,
  textAlign: 'center', zIndex: 7, pointerEvents: 'none',
}}>
  <span style={{
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontStyle: 'italic',
    fontSize: isMobile ? 13 : 15,
    letterSpacing: 1.2,
    color: '#cdb89c',
    textShadow: '0 1px 8px rgba(0,0,0,0.7), 0 0 14px rgba(232,184,124,0.18)',
  }}>
    Take a breath. Nothing here is urgent.
  </span>
</div>
```

---

## Animations & Interactions

All keyframes are defined in the `<style>` block of the host HTML (see `source/Cat and Co - Enchanted Garden.html` lines 36–80).

| Keyframe | Used by | Duration | Notes |
|---|---|---|---|
| `twinkle` | stars | 3–7s | opacity from `--op-max` → `--op-min` |
| `drift` | (helper) | varies | small translate loop |
| `float` | bokeh orbs | 12s | translate + scale 1 ↔ 1.04 |
| `orbBreathe` | bokeh orbs | 5s | brightness/saturate breathing |
| `flicker` | misc | 3s | opacity 0.85 ↔ 1 |
| `firefly` | fireflies | ~12s | translate from start to far + opacity 0→1→0 |
| `lanternSway` | lantern wrapper | 10–12s | rotate(-1.4deg) ↔ rotate(1.4deg) |
| `lanternBreathe` | lantern halo | 4s | opacity 0.85↔1 + blur 14px↔11px |
| `lanternFlicker` | candle core | 3.2s | scale + opacity wobble (4-stop, irregular) |

**Hover behavior**: Each lantern has `onMouseEnter` / `onMouseLeave` that toggles a local `hover` state. On hover:
- Lantern body scales to `1.06` over 380ms cubic-bezier(.2,.9,.2,1)
- Halo `opacity` increases (0.85 → 1) and blur decreases (14px → 10px)
- Tooltip below the lantern fades in (opacity 0 → 1, translateY -4px → 0) over 280ms

**Click behavior**: Currently the prototype doesn't navigate on click — only hover. In production, each lantern should `onClick` route to the corresponding room. Suggested mapping:
- `almanac` → `/energy-tracker` (or whatever the existing route is)
- `sparks` → `/sparks`
- `neural` → `/first-aid`
- `games` → `/games`
- `threads` → `/more-lights`

Use the codebase's existing routing solution (Next.js `<Link>`, React Router, etc.).

---

## State Management

This page is almost entirely stateless. The only state:

1. **`now: Date`** — held in `<DateBar />`, updated every 30 seconds via `setInterval`. Used to render localized weekday + month + day + time.
2. **`hover: bool`** — local to each `<HangingLantern />`. Drives scale, halo intensity, and tooltip visibility.
3. **`isMobile: bool`** — derived from `window.innerWidth < 768`, used to pick the mobile vs desktop lantern layout. Listens to `resize`.
4. **`hovered: string | null`** — held in `<App />`, set by each lantern's `onHover`. Currently unused beyond local effects but kept as a hook for future cross-lantern dimming/highlighting.

No server data, no auth dependencies, no async fetches.

---

## Responsive Behavior

The design is fluid — most type sizes use `clamp()` and zone heights are in `vh`. The breakpoint at `< 768px` swaps the lantern layout to a tighter, smaller arrangement (mobile table above).

The cats-on-fence wrapper stays at `20vh` on all sizes; the image inside scales by `height: 32vh; max-width: 96vw` so on very narrow screens the image becomes width-bound and shows fewer cats horizontally (the `objectPosition: center bottom` keeps it centered).

The bottom invitation drops from 15px to 13px on mobile.

---

## Assets

All in `source/assets/`:

| File | Use | Notes |
|---|---|---|
| `logo.png` | Ampersand in the "Cat & Co" title | 152×228 transparent PNG; gold cat shaped like `&` |
| `cats-on-fence.png` | Bottom band | 3000×3000 transparent PNG; cats in lower 60% of canvas |
| `lantern-01.svg` | Energy Tracker lantern | Black metalwork, transparent background |
| `lantern-02.svg` | First Aid lantern | Same |
| `lantern-03.svg` | More Lights lantern | Same |
| `lantern-04.svg` | Games lantern | Same |
| `lantern-07.svg` | Sparks lantern | Same |

Copy these directly into your codebase's static-asset directory (e.g. `public/assets/threshold/`). Don't redraw or vectorize them.

---

## Files in this Bundle

```
design_handoff_threshold/
├── README.md                                    ← you are here
├── screenshots/
│   ├── 01-threshold-desktop.png                 ← reference screenshot, full layout
│   └── 03-threshold-mobile.png                  ← reference screenshot, mobile layout
└── source/
    ├── Cat and Co - Enchanted Garden.html       ← host HTML with <style> + script tags
    ├── enchanted-garden.jsx                     ← all React components inline
    └── assets/
        ├── cats-on-fence.png
        ├── logo.png
        ├── lantern-01.svg
        ├── lantern-02.svg
        ├── lantern-03.svg
        ├── lantern-04.svg
        └── lantern-07.svg
```

To run the prototype locally for reference:
```bash
cd source/
python3 -m http.server 8000
# open http://localhost:8000/Cat%20and%20Co%20-%20Enchanted%20Garden.html
```

(The prototype loads React + Babel from CDN; you need an internet connection the first time.)

---

## Implementation Suggestions (React + Vercel codebase)

Since the existing app is React on Vercel, here's a pragmatic port plan:

1. **Component file**: Drop the page in as `app/threshold/page.tsx` (Next.js app router) or `pages/threshold.tsx` (pages router) — match what the rest of the codebase uses.

2. **Split into sub-components**:
   - `<Threshold />` (page-level)
   - `<NightSky />` (the moon + StarField + ForestFrame + AmbientBokeh + Fireflies, all in one)
   - `<Hero />` (threshold header + title + subtitle + DateBar)
   - `<LanternHub />` (the layer + 5 `<HangingLantern>` instances; reads room config from a constant)
   - `<HangingLantern room={…} xPct chainVh size sway delay onClick />`
   - `<CatsOnFence />`
   - `<DateBar />`

3. **Constants file**: Move the `ROOMS` array and `lanternLayout(isMobile)` function into `lib/threshold-rooms.ts` so they're a single source of truth.

4. **Styling approach**: Inline styles work fine for the prototype but you'll want to convert to whatever the codebase uses. The animations (`@keyframes twinkle`, `lanternSway`, etc.) need to live in a global CSS file or styled-components GlobalStyle — they're referenced by inline styles via `animation` shorthand.

5. **Fonts**: Add the Google Fonts `<link>` tags to your `_document.tsx` / root layout. Or use `next/font` if you're on Next 13+.

6. **Routing**: Wire each lantern's `onClick` to `router.push('/<room-slug>')` using whatever router is already in the app.

7. **Image handling**: Use `next/image` (or your equivalent) for `logo.png` and `cats-on-fence.png`. The lantern SVGs can be inlined as React components or loaded as `<img src>` — both work.

8. **Accessibility** (not present in the prototype, please add):
   - The five lanterns should be `<button>` elements (not `<div>` with onClick) for keyboard nav.
   - Add `aria-label` to each lantern: e.g. *"Enter Energy Tracker — today's weather for your nervous system"*.
   - The "Cat & Co" title `<img>` for the ampersand needs `alt="and"` (currently `alt="&"`).
   - Add `prefers-reduced-motion` media-query handling: disable `lanternSway`, firefly drift, twinkle, breathe, flicker. Keep the hover scale.
   - Ensure tab focus on lanterns is visible (currently no focus ring).

---

## Open Questions for the Engineer

These weren't pinned down during the design phase — please confirm with the designer before shipping:

1. **Click → navigate**: Does each lantern open the room page directly, or open a small modal/preview first? Prototype shows hover only.
2. **Auth/empty state**: What does the page show for a logged-out visitor vs. a logged-in user with no data yet? Currently identical for both.
3. **Time-of-day**: Should the scene change at all by time-of-day? (E.g. dawn variant, deep-night variant.) Prototype is always twilight.
4. **Sound**: A couple of designs ago there was talk of an ambient cricket loop. Is that still on the table?
5. **The two top-right nav buttons** ("LANTERN", "GEMSTONES") in the screenshot are leftovers from a multi-variant exploration. Drop them in production.

