/**
 * SetTheDayBox — the "Set the Day" box on the Capacity Tracker sky view, under
 * the three rings (engine room id=154). Four layers, top to bottom:
 *   1. greeting    — time-of-day welcome (clock-driven, unconditional)
 *   2. band line   — fixed orientation for today's band (italic, band-coloured)
 *   3. quote       — rotating warmth for today's band (serif)
 *   4. "today might want" — the chosen quote's matched suggestions, as soft chips
 *
 * The band is carried by COLOUR only (the accent + the small orb beside the band
 * line) — never named in the copy. The greeting comes from the clock; layers 2–4
 * from the opening-balance band. Copy is pulled live from the seeded std_* tables.
 * Suggestions are offered invitations shown BEFORE Cat chooses — display only.
 */

import { useEffect, useState } from 'react'
import { loadSetTheDay } from '../../shared/lib/setTheDay.js'

// Box accent per band — matched to the SHIPPED lived-experience ring colours so
// the box never shows a different orange/gold than the ring right above it.
// (red never reaches here — the opening band maps the red range to orange.)
const BAND_ACCENT = {
  green:  '#2FBE86',
  yellow: '#D6A520',
  orange: '#FF8419',
  purple: '#A673E4',
}

export default function SetTheDayBox({ userId, band, window, dateStr }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!userId || !band || !window || !dateStr) return
    let alive = true
    loadSetTheDay({ userId, band, window, dateStr })
      .then(d => { if (alive) setData(d) })
      .catch(err => console.error('failed to load set-the-day', err))
    return () => { alive = false }
  }, [userId, band, window, dateStr])

  // Until something loads, render nothing — the sky view stays calm, no flicker.
  if (!data || (!data.greeting && !data.bandLine && !data.quote)) return null

  const accent = BAND_ACCENT[band] || BAND_ACCENT.green

  return (
    <div className="std-box" style={{ '--std-accent': accent }}>
      <style>{STD_STYLES}</style>

      {data.greeting && <div className="std-greeting">{data.greeting}</div>}

      {data.bandLine && (
        <div className="std-bandline">
          <span className="std-orb" />
          <span className="std-bandtext">{data.bandLine}</span>
        </div>
      )}

      {data.quote && <div className="std-quote">{data.quote}</div>}

      {data.suggestions?.length > 0 && (
        <div className="std-suggests">
          <div className="std-suglabel">today might want</div>
          <div className="std-chips">
            {data.suggestions.map((s, i) => (
              <span className="std-chip" key={i}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STD_STYLES = `
.std-box{
  --std-ink:#e9edf8; --std-dim:#aeb8d4; --std-faint:#7986a6;
  max-width:560px; margin:6px auto 0; padding:20px 24px 22px; text-align:center;
  border:1px solid rgba(120,134,170,.16); border-top:2px solid var(--std-accent);
  border-radius:16px;
  background:radial-gradient(120% 140% at 50% 0%, color-mix(in srgb, var(--std-accent) 9%, transparent) 0%, rgba(13,18,34,.34) 60%, rgba(13,18,34,.20) 100%);
  font-family:"Cormorant Garamond",Georgia,serif;
}
/* 1 — greeting: warm serif welcome, the host at the door */
.std-box .std-greeting{font-size:25px; line-height:1.3; color:var(--std-ink); letter-spacing:.005em;}
/* 2 — band line: its own register (italic, band-coloured, 500) so the eye reads
   three distinct voices rather than two similar serifs */
.std-box .std-bandline{display:flex; align-items:center; justify-content:center; gap:9px; margin-top:13px;}
.std-box .std-orb{width:10px; height:10px; border-radius:50%; flex:none;
  background:var(--std-accent); box-shadow:0 0 9px 1px color-mix(in srgb, var(--std-accent) 60%, transparent);}
/* band line text reads in the site's creamy gold (matches the header), while the
   band is still carried by colour via the orb + the pills */
.std-box .std-bandtext{font-style:italic; font-weight:500; font-size:17.5px; line-height:1.45; color:var(--candle-soft,#f0d9a8);}
/* 3 — quote: rotating warmth, free to just be human */
.std-box .std-quote{font-size:18px; line-height:1.5; color:var(--std-dim); margin-top:13px;
  max-width:480px; margin-left:auto; margin-right:auto;}
/* 4 — suggestions: a quiet row of invitations, never a checklist */
.std-box .std-suggests{margin-top:17px;}
.std-box .std-suglabel{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--std-faint); margin-bottom:9px;}
.std-box .std-chips{display:flex; flex-wrap:wrap; gap:7px; justify-content:center;}
.std-box .std-chip{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  font-size:12.5px; color:var(--std-dim); padding:6px 13px; border-radius:999px;
  border:1px solid color-mix(in srgb, var(--std-accent) 26%, rgba(120,134,170,.22));
  background:color-mix(in srgb, var(--std-accent) 7%, transparent);}
@media(max-width:560px){
  .std-box{margin-left:12px; margin-right:12px; padding:17px 18px 19px;}
  .std-box .std-greeting{font-size:22px;}
  .std-box .std-bandtext{font-size:16px;}
  .std-box .std-quote{font-size:16.5px;}
}
`
