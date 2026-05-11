# Handoff: First Aid · State Selection Screen

Cat & Co Hub · First Aid room · Underwater state-picker

---

## Overview

The **First Aid** room is one of five spaces inside the Cat & Co personal-regulation hub. The screen documented here is the **state selection screen** — the page someone arrives at, after a brief breathing moment, when they need to choose which emotional / nervous-system state they are currently in.

It needs to feel beautiful, calm, and immediately navigable even when the person arriving is depleted. The visual metaphor is **being underwater** — held, quiet, enclosed, with light still finding you from above. Five state cards are arranged in a die-pip pattern, each glowing softly from within.

---

## About the design files

The files in this bundle are **design references created in HTML** — a working prototype that shows the intended look, motion, and behavior. They are **not production code to ship directly**.

Your task is to **recreate this design in the target codebase's existing environment** (React, Vue, SwiftUI, native iOS/Android, etc.) using its established components, design tokens, and patterns. If no environment exists yet, choose the most appropriate framework for the project and implement there.

Treat the HTML CSS as a reference for *what it should look and feel like*, not a literal source-of-truth for class names or markup structure.

## Fidelity

**High-fidelity (hi-fi).** Final colors, typography, layout, motion and interactions are all settled. Recreate pixel-fidelity using the codebase's existing primitives.

The user noted that final font, card-corner, and color-blending tweaks will be handled in code — match the spirit of the values listed below, but feel free to adjust to the codebase's design tokens.

---

## Screen: First Aid · State Selection

### Purpose

Let a depleted user pick which of five emotional/nervous-system states they're currently in, so the app can route them to the matching practice.

### Layout (desktop)

- Full-viewport (100vw × 100vh), **no scrolling**.
- Fixed underwater photo background, full-bleed, with multiple animated overlays.
- Fixed left-side rail (80 px wide) with the five Cat & Co rooms + "back to the threshold" link at the bottom — matches the Energy Tracker page convention.
- Main content sits in a CSS grid with two rows:
  1. Heading ("breathe. / where do we start?")
  2. Five-card die-pip grid, vertically centered in the remaining space.
- Heading and grid both center-justified.
- Page padding: `56px 56px 40px 110px` (top / right / bottom / left). The extra left padding clears the side rail.

### Die-pip card grid

Five equal-sized cards laid out in a 3×3 grid, occupying corners and center:

```
  [ Frazzled ]   .   [ Buzzy ]
       .     [SHUTDOWN]    .
  [ Too Much ]   .   [ Heavy ]
```

Grid spec:
- 3 columns × 3 rows
- Card width: `clamp(180px, 18.5vw, 250px)`
- Card height: `clamp(96px, 9.5vh, 130px)`
- Gap between cells: `clamp(22px, 3.4vw, 50px)`
- Empty middle-edge cells (top-center, middle-left, middle-right, bottom-center) stay blank — the cards just sit in the four corners + center.

### State cards

| Position | Class | Label | Glow color | Inner glow corner |
|---|---|---|---|---|
| top-left | `frazzled` | *Frazzled,* don't know why | warm yellow-sage `rgb(215, 220, 110)` | bottom-right (78%, 78%) |
| top-right | `buzzy` | Something difficult — *buzzy* | warm orange-amber `rgb(255, 130, 30)` | bottom-left (22%, 78%) |
| center | `shutdown` | i've shut down | velvety indigo `rgb(88, 70, 200)` | center (50%, 50%) |
| bottom-left | `toomuch` | *Everything* is too much | soft lavender `rgb(220, 180, 255)` | top-right (78%, 22%) |
| bottom-right | `heavy` | Something difficult — *heavy* | soft rose `rgb(250, 158, 188)` | top-left (22%, 22%) |

The italicized words above use `<span class="em">` styling.

#### Card visual structure

Each card is a stack of layered elements:

1. **Aura** — outer halo, `inset: -28px`, blurred 14px, mix-blend `screen`. A soft color spill into the surrounding water.
2. **Card base** — rounded rectangle, `border-radius: 22px`, near-black radial gradient (slightly tinted by the glow color at the inner-corner anchor):
   ```
   radial-gradient(ellipse 120% 100% at <gx> <gy>,
     rgba(<c>, 0.12) 0%,
     rgba(8, 12, 20, 0.96) 60%,
     rgba(2, 5, 10, 1) 100%)
   ```
3. **Inner glow** (`.glow`) — two layered radial gradients with `mix-blend: screen`:
   - **Body**: `radial-gradient(ellipse 95% 95% at <gx> <gy>, rgba(c,1) 0%, rgba(c,0.85) 8%, rgba(c,0.6) 20%, rgba(c,0.32) 38%, rgba(c,0.12) 60%, transparent 85%)`
   - **Hot core**: `radial-gradient(circle 38% at <gx> <gy>, rgba(255,250,240,0.85) 0%, rgba(c,0.7) 18%, rgba(c,0.25) 45%, transparent 70%)` — this is the bright near-white "ember" highlight at the corner.
4. **Pillowed top highlight** (`::before`) — subtle 180° gradient from `rgba(255,255,255,0.10)` at the top edge, fading at 35%, plus a small radial bloom at top-center.
5. **Edge stroke** (`::after`) — `inset 0 1px 0 rgba(255,255,255,0.10)`, `inset 0 -2px 4px rgba(0,0,0,0.4)`, `inset 0 0 0 1px rgba(255,255,255,0.05)`.
6. **Label** — centered, Cormorant Garamond, mix of regular and italic styling; full text shadow:
   ```
   text-shadow: 0 1px 2px rgba(0,0,0,0.7), 0 0 18px rgba(<c>, 0.45);
   ```

The shutdown card has a **stronger** glow body and **larger** aura (`inset: -36px`, blur 18px) because it is the conceptual "source" of light radiating outward to the others. Its label is uppercase-rendered as lowercase with `letter-spacing: 0.05em`.

#### Drop shadow (the floating effect — essential)

```
box-shadow:
  0 26px 48px -8px rgba(0, 0, 0, 0.75),
  0 14px 26px rgba(0, 0, 0, 0.55),
  0 2px 6px rgba(0, 0, 0, 0.4);
```

#### Hover

```
transform: translateY(-4px) scale(1.018);
transition: transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
```

### Heading

```
breathe.
where do we start?
```

- "breathe." — Cormorant Garamond, italic, weight 300, **42px**, color `#f8fafb`.
- "where do we start?" — same family/style, **26px**, `rgba(232,244,248,0.88)`.
- Centered, with a layered text shadow for legibility against the bright surface pool:
  ```
  text-shadow:
    0 1px 2px rgba(0, 16, 24, 0.6),
    0 2px 18px rgba(0, 16, 24, 0.55),
    0 0 32px rgba(2, 16, 24, 0.45);
  ```
- A soft dark vignette `::before` sits behind the heading text only — `radial-gradient` 60%×70%, `rgba(0,14,22,0.45)` at center, 8px blur. This gives the text a quiet "halo of dimness" against the bright water.

### Side rail

Vertical 80 px column, fixed left, full-height. Centered in the column:

| Item | Dot color | Glow |
|---|---|---|
| Energy Tracker | `#e8c87c` | `rgba(232,200,124,0.55)` |
| Sparks | `#e35a4a` | `rgba(227,90,74,0.55)` |
| First Aid (active) | `#9ed5dc` | `rgba(158,213,220,0.85)` |
| Games | `#76c79a` | `rgba(118,199,154,0.55)` |
| Library | `#b69aea` | `rgba(182,154,234,0.55)` |
| More Lights | `#a89cb8` | `rgba(168,156,184,0.5)` |

- Each item: a small 7px colored dot above an italic 12px label (Cormorant Garamond italic).
- Active item is brighter (`#f4f8fa`) and the dot is 1.5× scale with stronger glow.
- Inactive items: `rgba(220,232,238,0.55)`.
- Hover: text fades to `#f4f8fa`.
- Bottom of rail: a small `↑ back to the threshold` link in 11px italic — links back to the threshold/hub page.

---

## Background scene (the underwater feel)

This is the heart of the page. Multiple layered elements compose the depth:

### 1. Photo (`.water` inside `.water-wrap`)

- The reference photo (`assets/underwater.png`) used as `background-size: cover`, `background-position: center 18%`. The 18% Y-position pushes the sandy floor below the viewport so you only see mid-water and surface.
- `.water-wrap` is positioned `inset: -8% -6%` (overflow into screen edges) so the displaced edges of the filtered image never reveal a hard border.
- Animation `waterApproach` (9s ease-in-out infinite): scales `1.045 → 1.085`, `translateY 0 → 0.6%`, transform-origin `50% 22%`. This reads as **a wave rolling forward toward the viewer** — radial growth, no lateral motion.

### 2. SVG `feDisplacementMap` filter on the photo

```svg
<filter id="waterRipple">
  <feTurbulence type="fractalNoise" baseFrequency="0.014 0.024" numOctaves="2" seed="4" result="noise">
    <animate attributeName="baseFrequency" dur="14s"
             values="0.014 0.024;0.018 0.030;0.014 0.024" repeatCount="indefinite"/>
  </feTurbulence>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="14">
    <animate attributeName="scale" dur="9s"
             values="8;22;8" repeatCount="indefinite"/>
  </feDisplacementMap>
</filter>
```

The displacement *scale itself* swells and recedes — gives the photo a real, perceptible water-ripple distortion that pulses (waves coming toward you) rather than scrolling past.

### 3. Surface ripple layer (`.surface-ripple`)

Same photo, scoped to the top 50% of the screen, masked to fade out by 100%. Uses a stronger filter (`#surfaceRipple`, scale `18 → 42 → 18`, baseFrequency around `0.020 / 0.048`). `mix-blend-mode: lighten`, `brightness(1.05)`. Emphasizes the visible surface ripple right where the user's eye lands.

Surface animation `surfaceApproach` (7s, offset from main 9s so they organically stagger).

### 4. Caustic shimmer (`.shimmer`)

Full-viewport SVG with a `feTurbulence` color matrix overlay rendered with `mix-blend-mode: screen`, opacity `0.55`. Animation `shimmerApproach` (8s) scales 1.0 → 1.10 from origin `50% 15%`.

### 5. Light rays (`.rays`)

Five overlapping vertical wedges (SVG polygons) using a top-light gradient (`#e6f8fa` → transparent), Gaussian-blurred 10px, `mix-blend-mode: screen`, opacity 0.55. Animation `raysApproach` (10s) scales 1.0 → 1.06, transform-origin `50% 0%`.

### 6. Suspended motes (`.motes`)

Ten small (4px) glowing dots positioned around the lower 70-95% of the screen, animated to drift upward over 18-30s with slight horizontal sway. Each fades in/out across the cycle. Looks like dust/plankton suspended in still water.

### 7. Dark blend at bottom

A `linear-gradient` on `.water-wrap::after` that fades the lower 40% to `rgba(3, 12, 20, 0.92)` — eliminates the photo's natural floor horizon and lets cards sit cleanly without a visible seam.

---

## Animation summary

All loops are set to **synchronized breathing** in spirit (slow, organic, calm), but the cycle lengths are intentionally co-prime so they don't lock visually:

| Element | Duration | Type |
|---|---|---|
| `.water` (photo scale) | 9s | radial scale 1.045 → 1.085 |
| `.water` displacement scale | 9s | 8 → 22 → 8 |
| `.water` displacement frequency | 14s | drift |
| `.surface-ripple` photo scale | 7s | 1.02 → 1.06 |
| `.surface-ripple` displacement scale | 7s | 18 → 42 → 18 |
| `.surface-ripple` displacement frequency | 10s | drift |
| `.rays` | 10s | scale 1.0 → 1.06 |
| `.shimmer` | 8s | scale 1.0 → 1.10 |
| `.motes` | 18-30s each | linear rise |
| `.glow`, `.aura` (card breath) | 5.5s | opacity 0.78 → 1.05, scale 1 → 1.02 |

**All five card glows breathe in sync** — same cycle length, same offset (zero) — like one shared heartbeat. This is essential to the brief.

**No element has lateral (left-right) motion.** The motion language is all radial/vertical pulse, evoking submersion rather than scrolling.

---

## Interactions & behavior

- **Hover** on any card: lift 4px with a slight scale, 360ms ease-out.
- **Click**: navigates to the matching state-specific practice screen. Wire to your routes (e.g. `/first-aid/frazzled`, `/first-aid/shutdown`, etc.) — the destinations are out of scope for this design.
- **Keyboard**: cards are `<button>` elements; default focus styles should be replaced with a soft ring matching the card's glow color (not implemented in the prototype).
- **Side rail links**: navigate to the threshold/hub or a sibling room.
- **Back to the threshold**: navigates to the hub page.

No form validation, no async loading, no error states — this screen is a navigator only.

---

## Responsive behavior

The prototype includes a `@media (max-width: 760px)` breakpoint:
- Side rail hidden.
- Page becomes scrollable (`overflow-y: auto`).
- Cards reflow into a 2-column grid; Shutdown spans both columns in row 2.

The user did not finalize mobile in this round — treat the prototype's mobile fallback as a starting point and confirm with the team before shipping.

---

## State management

This screen is presentational — no app state owned here. The only required output is "user chose state X" → router push.

If your codebase tracks emotional-state history, log the selection (state id, timestamp) when the user clicks a card.

---

## Design tokens

### Colors

```
--ink:           #f4e3c4   (warm cream, used elsewhere in the hub)
--ink-soft:      #e8f1f3   (cool off-white, body text)
--ink-faint:     #8aa8b3   (muted blue-grey)

/* Background tones */
deep-water bg:   #061824
abyss:           #02101a
seam blend:      rgba(3, 12, 20, 0.92)

/* State glow colors (rgb triplets — used as rgba(<c>, alpha) throughout) */
--glow-frazzled: 215, 220, 110   /* warm yellow-sage */
--glow-buzzy:    255, 130,  30   /* warm orange-amber, ember */
--glow-shutdown:  88,  70, 200   /* deep velvety indigo */
--glow-toomuch:  220, 180, 255   /* soft lavender */
--glow-heavy:    250, 158, 188   /* soft rose */

/* Side-rail dot colors */
energy-tracker:  #e8c87c
sparks:          #e35a4a
first-aid:       #9ed5dc   (active dot)
games:           #76c79a
library:         #b69aea
more-lights:     #a89cb8
```

### Typography

- **Family**: Cormorant Garamond (Google Fonts) — weights 300, 400, 500, 600, italic variants. Fallback `Georgia, serif`.
- **Heading "breathe."**: italic 300, 42px, line-height 1.2.
- **Heading "where do we start?"**: italic 300, 26px.
- **Card label**: regular 400, `clamp(15px, 1.3vw, 19px)`, line-height 1.25, letter-spacing 0.01em. Italic for the emphasized word in each label.
- **Side rail items**: italic 400, 12px, line-height 1.15.
- **Back link**: italic 400, 11px.

### Spacing & sizing

- Card border-radius: **22px**.
- Card aura outer-radius: **38px**.
- Page padding: `56 / 56 / 40 / 110` (top / right / bottom / left, in px).
- Heading-to-grid row gap: `clamp(28px, 5vh, 60px)`.
- Grid card width: `clamp(180px, 18.5vw, 250px)`.
- Grid card height: `clamp(96px, 9.5vh, 130px)`.
- Grid gap: `clamp(22px, 3.4vw, 50px)`.
- Side rail width: 80 px.

### Shadows

- **Card drop shadow** (the floating effect — keep this, do not flatten):
  ```
  0 26px 48px -8px rgba(0, 0, 0, 0.75),
  0 14px 26px rgba(0, 0, 0, 0.55),
  0 2px 6px rgba(0, 0, 0, 0.4);
  ```
- **Card hover**: same, lifted 4 px.
- **Card inner pillow** (`::after`):
  ```
  inset 0 1px 0 rgba(255, 255, 255, 0.10),
  inset 0 -2px 4px rgba(0, 0, 0, 0.4),
  inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  ```

---

## Assets

| File | Purpose | Source |
|---|---|---|
| `assets/underwater.png` | Background photo | User-supplied reference; the page is built around this exact image. Treat as canonical — don't substitute. |

If your codebase has an asset-pipeline / CDN, host this image there and update the URL. Do not regenerate or replace it.

No icons are used on this screen.

---

## Files in this bundle

- `Cat and Co - First Aid.html` — the design prototype. Open in a browser to see the working motion + glow. All CSS is inline in the `<style>` block at the top; SVG filters live just below `<body>`.
- `assets/underwater.png` — the underwater reference photo.

---

## What this should feel like

> Held. Quiet. Underwater but the light finds you. Someone left a light on for you down here. You could visit this page just to look at it and feel better — that's the goal.

What it should NOT feel like: clinical, busy, corporate, flat, harsh, cold.

Keep the motion **gently alive, never urgent**. Keep the glows **luminous, like embers or stained glass held up to light** — not flat washes of color. Keep the silences (the empty grid cells, the space around the heading) — they are part of the design.
