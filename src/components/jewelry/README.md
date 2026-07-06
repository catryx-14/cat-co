# Jewelry & Joy — component kit

Fine gold art-deco SVG components — the **constant identity** on every page
(the "jewelry"). Geometry is ported verbatim from Cat's approved sample files;
the locked design trail lives in Engine Room id=171.

Preview them all on the default background at **`/?kit=1`** (dev gallery).

```jsx
import { JewelFrame, JewelDivider, JewelPip, JewelDangle,
         JewelStatementOval, JewelRoomOval, WeekRing } from '@/components/jewelry'
```

## Components

| Component | Key props | Notes |
|-----------|-----------|-------|
| `JewelFrame` | `tier="quiet\|medium\|statement"`, `corners={2\|4}` (medium), `gem`, `gemColor` | Fixed-ratio decorative frame; set `width`, height follows. |
| `JewelDivider` | `kind="quiet\|medium\|diamonds\|curves"`, `gem` (curves), `gemColor` | Reflective gold; scales to `width`. |
| `JewelPip` | `color="jade\|gold\|amber\|garnet\|amethyst"`, `size` | Flat dot; facet highlight only at `size >= 12`. |
| `JewelDangle` | `length="whisper\|classic\|celestial"` | Statement tier. **One per page, max.** |
| `JewelStatementOval` | `variant="plain\|gem\|small"`, `gemColor` | Triple strand + lattice knots. |
| `JewelRoomOval` | `variant="quiet\|medium"`, `active`, `bg` | Wing room ovals (Step 6). |
| `WeekRing` | `band`, `today`, `num` | One WeekStrip day ring (Step 5). |

## Conventions — please keep

- **Tier rationing.** Statement pieces (full frame, `diamonds`/`curves`
  dividers, dangles, statement oval) are for the **Threshold, room headers, and
  celebration moments only**. Everyday surfaces wear **quiet / medium**.
- **One dangle per page**, maximum. It's the single loudest flourish.
- **One or two gems per frame**, never more. Gems are flat jewel-tone stones
  (the pip rule) and can take the page's mood colour.
- **Sparkles are round dots, never star shapes** — except the one four-point
  star that terminates a `celestial` dangle (the night garden's star allowance).

## Two things not to break

1. **Reflective gold on straight lines.** A perfectly horizontal/vertical line
   has a zero-area bounding box, so a default-units gradient collapses and the
   line renders **invisible**. Every reflective stroke uses
   `gradientUnits="userSpaceOnUse"` with explicit coordinates. Don't switch it.
2. **Woven-metal look.** Multi-strand pieces (ovals) light each strand from a
   slightly different gradient angle — that's what makes them read as woven
   metal rather than flat outlines. Keep the per-strand angles.

Gradient IDs are scoped per instance with `useId()`, so any number of these can
render on one page without colliding. All pieces are static SVG (no animation),
so they're inert under `prefers-reduced-motion` by nature.
