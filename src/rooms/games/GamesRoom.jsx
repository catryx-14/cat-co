import { useState, useEffect, useRef } from 'react'

// ── Cat asset imports ────────────────────────────────────────────────────────
import blackCat1   from '../../assets/cats/black Cat 1.png'
import blackCat2   from '../../assets/cats/black cat 2.png'
import blackCat3   from '../../assets/cats/black cat 3.png'
import blackCat4   from '../../assets/cats/black cat 4.png'
import blackCat5   from '../../assets/cats/black cat 5.png'

import grayCat1    from '../../assets/cats/gray cat 1.png'
import grayCat2    from '../../assets/cats/gray cat 2.png'
import grayCat3    from '../../assets/cats/gray cat 3.png'
import grayCat4    from '../../assets/cats/gray cat 4.png'
import grayCat5    from '../../assets/cats/gray cat 5.png'
import grayCat6    from '../../assets/cats/gray cat 6.png'
import grayCat7    from '../../assets/cats/gray cat 7.png'
import grayCat8    from '../../assets/cats/gray cat 8.png'
import grayCat9    from '../../assets/cats/gray cat 9.png'
import grayCat10   from '../../assets/cats/gray cat 10.png'

import orangeCat1  from '../../assets/cats/orange Cat 1.png'
import orangeCat2  from '../../assets/cats/orange cat 2.png'
import orangeCat3  from '../../assets/cats/orange cat 3.png'
import orangeCat4  from '../../assets/cats/orange cat 4.png'
import orangeCat5  from '../../assets/cats/orange cat 5.png'
import orangeCat6  from '../../assets/cats/orange cat 6.png'
import orangeCat7  from '../../assets/cats/orange cat 7.png'
import orangeCat8  from '../../assets/cats/orange cat 8.png'
import orangeCat9  from '../../assets/cats/orange cat 9.png'
import orangeCat10 from '../../assets/cats/orange cat 10.png'
import orangeCat11 from '../../assets/cats/orange cat 11.png'
import orangeCat12 from '../../assets/cats/orange cat 12.png'
import orangeCat13 from '../../assets/cats/orange cat 13.png'
import orangeCat14 from '../../assets/cats/orange cat 14.png'
import orangeCat15 from '../../assets/cats/orange cat 15.png'

import calicoCat1  from '../../assets/cats/calico cat 1.png'
import calicoCat2  from '../../assets/cats/calico cat 2.png'
import calicoCat3  from '../../assets/cats/calico cat 3.png'
import calicoCat4  from '../../assets/cats/calico cat 4.png'
import calicoCat5  from '../../assets/cats/calico cat 5.png'
import calicoCat6  from '../../assets/cats/calico cat 6.png'
import calicoCat7  from '../../assets/cats/calico cat 7.png'

import siameseCat1 from '../../assets/cats/siamese cat 1.png'
import siameseCat2 from '../../assets/cats/siamese cat 2.png'
import siameseCat3 from '../../assets/cats/siamese cat 3.png'
import siameseCat4 from '../../assets/cats/siamese cat 4.png'
import siameseCat5 from '../../assets/cats/siamese cat 5.png'

import spottedCat1 from '../../assets/cats/spotted cat 1.png'
import spottedCat2 from '../../assets/cats/spotted cat 2.png'
import spottedCat3 from '../../assets/cats/spotted cat 3.png'
import spottedCat4 from '../../assets/cats/spotted cat 4.png'
import spottedCat5 from '../../assets/cats/spotted cat 5.png'
import spottedCat6 from '../../assets/cats/spotted cat 6.png'
import spottedCat7 from '../../assets/cats/spotted cat 7.png'

import kitten1     from '../../assets/cats/kitten 1.png'
import kitten2     from '../../assets/cats/kitten 2.png'
import kitten3     from '../../assets/cats/kitten 3.png'
import kitten4     from '../../assets/cats/kitten 4.png'
import kitten5     from '../../assets/cats/kitten 5.png'
import kitten6     from '../../assets/cats/kitten 6.png'
import kitten7     from '../../assets/cats/kitten 7.png'
import kitten8     from '../../assets/cats/kitten 8.png'
import kitten9     from '../../assets/cats/kitten 9.png'
import kitten10    from '../../assets/cats/kitten 10.png'
import kitten11    from '../../assets/cats/kitten 11.png'
import kitten12    from '../../assets/cats/kitten 12.png'
import kitten13    from '../../assets/cats/kitten 13.png'
import kitten14    from '../../assets/cats/kitten 14.png'
import kitten15    from '../../assets/cats/kitten 15.png'

// ── Group definitions ────────────────────────────────────────────────────────
const ALL_GROUPS = [
  {
    id: 'black',
    label: 'black',
    cushionColor: '#1a1a2e',
    cushionGlow: 'rgba(120,120,180,0.45)',
    borderColor: '#6060a0',
    images: [blackCat1, blackCat2, blackCat3, blackCat4, blackCat5],
  },
  {
    id: 'gray',
    label: 'gray',
    cushionColor: '#3a3f5c',
    cushionGlow: 'rgba(160,170,200,0.45)',
    borderColor: '#8090b8',
    images: [grayCat1, grayCat2, grayCat3, grayCat4, grayCat5, grayCat6, grayCat7, grayCat8, grayCat9, grayCat10],
  },
  {
    id: 'orange',
    label: 'orange',
    cushionColor: '#4a2800',
    cushionGlow: 'rgba(220,130,40,0.55)',
    borderColor: '#e07820',
    images: [orangeCat1, orangeCat2, orangeCat3, orangeCat4, orangeCat5, orangeCat6, orangeCat7, orangeCat8, orangeCat9, orangeCat10, orangeCat11, orangeCat12, orangeCat13, orangeCat14, orangeCat15],
  },
  {
    id: 'calico',
    label: 'calico',
    cushionColor: '#3d1f10',
    cushionGlow: 'rgba(200,140,80,0.50)',
    borderColor: '#c87840',
    images: [calicoCat1, calicoCat2, calicoCat3, calicoCat4, calicoCat5, calicoCat6, calicoCat7],
  },
  {
    id: 'siamese',
    label: 'siamese',
    cushionColor: '#2e2820',
    cushionGlow: 'rgba(240,220,180,0.45)',
    borderColor: '#d4b880',
    images: [siameseCat1, siameseCat2, siameseCat3, siameseCat4, siameseCat5],
  },
  {
    id: 'spotted',
    label: 'spotted',
    cushionColor: '#2a2010',
    cushionGlow: 'rgba(200,170,100,0.50)',
    borderColor: '#b89050',
    images: [spottedCat1, spottedCat2, spottedCat3, spottedCat4, spottedCat5, spottedCat6, spottedCat7],
  },
  {
    id: 'kitten',
    label: 'kitten',
    cushionColor: '#2a1830',
    cushionGlow: 'rgba(200,150,220,0.50)',
    borderColor: '#c090d8',
    images: [kitten1, kitten2, kitten3, kitten4, kitten5, kitten6, kitten7, kitten8, kitten9, kitten10, kitten11, kitten12, kitten13, kitten14, kitten15],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n)
}

function buildRound() {
  const groups = pickRandom(ALL_GROUPS, 5)
  const cats = []
  groups.forEach(group => {
    const imgs = pickRandom(group.images, 3)
    imgs.forEach((src, i) => {
      cats.push({ id: `${group.id}-${i}-${Math.random()}`, groupId: group.id, src })
    })
  })
  return { groups, cats: shuffle(cats) }
}

// ── Keyframe styles ──────────────────────────────────────────────────────────
const css = `
@keyframes catShake {
  0%,100% { transform: scale(1) translateX(0) rotate(0deg); }
  15%      { transform: scale(1) translateX(-8px) rotate(-3deg); }
  30%      { transform: scale(1) translateX(8px)  rotate(3deg); }
  45%      { transform: scale(1) translateX(-5px) rotate(-2deg); }
  60%      { transform: scale(1) translateX(5px)  rotate(2deg); }
  75%      { transform: scale(1) translateX(-2px) rotate(-1deg); }
}
@keyframes catPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.12); }
  70%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}
@keyframes scoreFlash {
  0%   { transform: scale(1);    color: #e8c98c; }
  40%  { transform: scale(1.35); color: #fff; }
  100% { transform: scale(1);    color: #e8c98c; }
}
@keyframes roundIn {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes catSlideLeft {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes catSlideRight {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}
`

// ── Basket icons (SVG) ──────────────────────────────────────────────────────
function IconYarn({ color, bg }) {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
      <ellipse cx="32" cy="58" rx="15" ry="4" fill="rgba(0,0,0,0.3)"/>
      <circle cx="32" cy="31" r="22" fill={bg}/>
      <circle cx="32" cy="31" r="22" fill={color} fillOpacity="0.85"/>
      <path d="M11 23 Q32 7 53 23" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 31 Q32 15 55 31" stroke="rgba(255,255,255,0.22)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M11 39 Q32 23 53 39" stroke="rgba(255,255,255,0.18)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M17 48 Q34 36 51 46" stroke="rgba(255,255,255,0.12)" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M25 10 Q21 31 25 52" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="22" cy="20" r="6" fill="rgba(255,255,255,0.2)"/>
      <path d="M51 15 Q58 7 55 2" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="51" cy="16" r="2.5" fill="rgba(255,255,255,0.4)"/>
    </svg>
  )
}

function IconCatBed({ color, bg, dark = false }) {
  const base = dark ? '#0e0e20' : '#1c2038'
  const cushion = dark ? '#181828' : '#252a48'
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
      <ellipse cx="32" cy="61" rx="20" ry="4" fill="rgba(0,0,0,0.3)"/>
      {/* walls */}
      <path d="M10 46 Q10 60 32 60 Q54 60 54 46Z" fill={base}/>
      {/* rim */}
      <ellipse cx="32" cy="46" rx="22" ry="9" fill={base} stroke={color} strokeWidth="1.5" strokeOpacity="0.55"/>
      {/* cushion */}
      <ellipse cx="32" cy="44" rx="16" ry="6" fill={cushion} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      {[22,32,42].map(x => <circle key={x} cx={x} cy={44} r={1.5} fill={color} fillOpacity="0.45"/>)}
      {/* ear bumps */}
      {[14,50].map(x => (
        <g key={x}>
          <ellipse cx={x} cy={35} rx={7} ry={9} fill={base} stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
          <ellipse cx={x} cy={35} rx={3.5} ry={5} fill={color} fillOpacity="0.28"/>
        </g>
      ))}
      {dark && (
        <>
          <path d="M25 46 Q27 44 29 46" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.55"/>
          <path d="M35 46 Q37 44 39 46" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.55"/>
        </>
      )}
    </svg>
  )
}

function IconFeather({ color, bg }) {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
      {/* wand stick */}
      <line x1="44" y1="60" x2="24" y2="20" stroke="#7a5c30" strokeWidth="3" strokeLinecap="round"/>
      {/* bead */}
      <circle cx="24" cy="20" r="4.5" fill={bg} stroke={color} strokeWidth="1.5"/>
      {/* string */}
      <path d="M24 24 Q20 32 22 42" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
      {/* feathers hanging */}
      <path d="M22 26 Q10 32 8 44" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" strokeOpacity="0.9"/>
      <path d="M22 26 Q8 34 10 46 Q14 44 18 36 Q20 30 22 26Z" fill={color} fillOpacity="0.25"/>
      <path d="M22 28 Q16 36 18 48" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.75"/>
      <path d="M22 28 Q14 38 18 50 Q22 48 24 40 Q24 33 22 28Z" fill={color} fillOpacity="0.2"/>
      <path d="M22 30 Q24 40 22 52" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.65"/>
      <path d="M22 30 Q24 42 22 54 Q26 52 28 44 Q28 36 22 30Z" fill={color} fillOpacity="0.2"/>
      <path d="M22 28 Q30 36 32 48" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.7"/>
      <path d="M22 28 Q30 38 32 50 Q28 50 24 42 Q22 35 22 28Z" fill={color} fillOpacity="0.2"/>
      {/* highlight on bead */}
      <circle cx="22" cy="18" r="2" fill="rgba(255,255,255,0.4)"/>
    </svg>
  )
}

function IconBowl({ color, bg }) {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
      <ellipse cx="32" cy="60" rx="18" ry="4" fill="rgba(0,0,0,0.3)"/>
      {/* bowl body */}
      <path d="M10 32 Q10 56 32 56 Q54 56 54 32Z" fill={bg}/>
      <path d="M10 32 Q10 56 32 56 Q54 56 54 32Z" fill={color} fillOpacity="0.25"/>
      {/* rim ellipse */}
      <ellipse cx="32" cy="32" rx="22" ry="8" fill={bg}/>
      <ellipse cx="32" cy="32" rx="22" ry="8" fill={color} fillOpacity="0.55"/>
      <ellipse cx="32" cy="32" rx="22" ry="8" stroke={color} strokeWidth="1.5" fill="none"/>
      {/* food surface */}
      <ellipse cx="32" cy="32" rx="16" ry="5" fill={color} fillOpacity="0.7"/>
      {/* paw print on bowl face */}
      <circle cx="32" cy="46" r="3.5" fill={color} fillOpacity="0.38"/>
      <circle cx="26" cy="43" r="2" fill={color} fillOpacity="0.32"/>
      <circle cx="38" cy="43" r="2" fill={color} fillOpacity="0.32"/>
      <circle cx="29" cy="41" r="1.6" fill={color} fillOpacity="0.28"/>
      <circle cx="35" cy="41" r="1.6" fill={color} fillOpacity="0.28"/>
      {/* bowl shine */}
      <ellipse cx="42" cy="38" rx="4" ry="2" fill="rgba(255,255,255,0.12)" transform="rotate(-30 42 38)"/>
    </svg>
  )
}

function IconFish({ color, bg }) {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
      {/* tail */}
      <path d="M46 32 L58 20 L60 32 L58 44Z" fill={color} fillOpacity="0.85"/>
      {/* body */}
      <ellipse cx="28" cy="32" rx="20" ry="14" fill={bg}/>
      <ellipse cx="28" cy="32" rx="20" ry="14" fill={color} fillOpacity="0.8"/>
      {/* dorsal fin */}
      <path d="M20 19 Q28 11 36 19" fill={color} fillOpacity="0.6"/>
      {/* scales */}
      {[[18,28],[26,24],[18,36],[26,38],[34,30]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx={4} ry={3} stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none"/>
      ))}
      {/* belly shimmer */}
      <ellipse cx="26" cy="37" rx="12" ry="5" fill="rgba(255,255,255,0.1)" transform="rotate(-10 26 37)"/>
      {/* eye */}
      <circle cx="10" cy="28" r="4.5" fill="rgba(0,0,0,0.5)"/>
      <circle cx="10" cy="28" r="2.8" fill="rgba(255,255,255,0.85)"/>
      <circle cx="9" cy="27" r="1.2" fill="rgba(0,0,0,0.9)"/>
      <circle cx="9.5" cy="26.5" r="0.5" fill="rgba(255,255,255,0.7)"/>
      {/* highlight */}
      <ellipse cx="20" cy="24" rx="6" ry="3.5" fill="rgba(255,255,255,0.18)" transform="rotate(-20 20 24)"/>
    </svg>
  )
}

function IconBottle({ color, bg }) {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
      <ellipse cx="32" cy="62" rx="11" ry="3" fill="rgba(0,0,0,0.3)"/>
      {/* nipple tip */}
      <rect x="29" y="6" width="6" height="9" rx="3" fill={bg}/>
      <rect x="29" y="6" width="6" height="9" rx="3" fill={color} fillOpacity="0.75"/>
      {/* neck ring */}
      <rect x="25" y="14" width="14" height="5" rx="2" fill={bg}/>
      <rect x="25" y="14" width="14" height="5" rx="2" fill={color} fillOpacity="0.9"/>
      {/* neck */}
      <rect x="26" y="18" width="12" height="10" rx="2" fill={bg}/>
      <rect x="26" y="18" width="12" height="10" rx="2" fill={color} fillOpacity="0.45"/>
      {/* body */}
      <rect x="18" y="27" width="28" height="30" rx="10" fill={bg}/>
      <rect x="18" y="27" width="28" height="30" rx="10" fill={color} fillOpacity="0.45"/>
      <rect x="18" y="27" width="28" height="30" rx="10" stroke={color} strokeWidth="1.5" fill="none" strokeOpacity="0.6"/>
      {/* measure lines */}
      {[36, 42, 48].map(y => (
        <line key={y} x1="21" y1={y} x2="27" y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      ))}
      {/* bow loops */}
      <path d="M26 22 Q20 17 22 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M38 22 Q44 17 42 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* bow knot */}
      <circle cx="32" cy="22" r="3.5" fill={color}/>
      <circle cx="32" cy="22" r="2" fill="rgba(255,255,255,0.3)"/>
      {/* body shine */}
      <rect x="36" y="31" width="5" height="18" rx="2.5" fill="rgba(255,255,255,0.14)"/>
    </svg>
  )
}

function BasketIcon({ groupId, color, bg }) {
  switch (groupId) {
    case 'orange': return <IconYarn    color={color} bg={bg}/>
    case 'gray':   return <IconCatBed  color={color} bg={bg} dark={false}/>
    case 'black':  return <IconCatBed  color={color} bg={bg} dark={true}/>
    case 'siamese':return <IconFeather color={color} bg={bg}/>
    case 'calico': return <IconBowl    color={color} bg={bg}/>
    case 'spotted':return <IconFish    color={color} bg={bg}/>
    case 'kitten': return <IconBottle  color={color} bg={bg}/>
    default:       return null
  }
}

// ── Game menu tile ───────────────────────────────────────────────────────────
const GAME_TILES = [
  {
    id: 'cat-sort',
    title: 'Cat Sorting Game',
    description: 'sort the cats into their colour groups',
    icon: '🐱',
  },
]

function GamesMenu({ onSelect }) {
  return (
    <div style={{
      padding: '24px 32px 40px',
      animation: 'fadeSlideIn 0.4s ease',
    }}>
      <p style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 18,
        color: 'rgba(255,255,255,0.45)',
        margin: '0 0 28px',
        fontStyle: 'italic',
      }}>
        choose a game
      </p>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        {GAME_TILES.map(tile => (
          <button
            key={tile.id}
            onClick={() => onSelect(tile.id)}
            style={{
              width: 220,
              padding: '20px 24px',
              borderRadius: 16,
              border: '1.5px solid rgba(232,201,140,0.2)',
              background: 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(232,201,140,0.08)'
              e.currentTarget.style.borderColor = 'rgba(232,201,140,0.45)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(232,201,140,0.2)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{ fontSize: 28 }}>{tile.icon}</span>
            <span style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: 20,
              color: '#e8c98c',
              lineHeight: 1.2,
            }}>
              {tile.title}
            </span>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.5,
            }}>
              {tile.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Basket ───────────────────────────────────────────────────────────────────
function Basket({ group, isTarget, placedCount, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const active = isTarget && hovered

  return (
    <div
      onClick={isTarget ? onSelect : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        cursor: isTarget ? 'pointer' : 'default',
        transition: 'transform 0.15s, filter 0.15s',
        transform: active ? 'scale(1.1) translateY(-3px)' : 'scale(1)',
        filter: active
          ? `drop-shadow(0 0 10px ${group.cushionGlow}) drop-shadow(0 0 4px ${group.borderColor})`
          : isTarget
          ? 'none'
          : 'none',
        opacity: isTarget ? 1 : 1,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 64, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <BasketIcon groupId={group.id} color={group.borderColor} bg={group.cushionColor}/>
        {/* Glow ring underneath on hover */}
        {active && (
          <div style={{
            position: 'absolute',
            bottom: -4, left: '50%', transform: 'translateX(-50%)',
            width: 40, height: 8,
            borderRadius: '50%',
            background: group.cushionGlow,
            filter: 'blur(6px)',
            pointerEvents: 'none',
          }}/>
        )}
      </div>

      {/* Pip progress dots */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i < placedCount ? group.borderColor : 'rgba(255,255,255,0.12)',
            boxShadow: i < placedCount ? `0 0 5px ${group.cushionGlow}` : 'none',
            transition: 'background 0.3s, box-shadow 0.3s',
          }}/>
        ))}
      </div>

      {/* Label */}
      <span style={{
        fontSize: 10,
        fontFamily: "'Outfit', sans-serif",
        color: active ? group.borderColor : 'rgba(255,255,255,0.4)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        transition: 'color 0.15s',
        fontWeight: active ? 600 : 400,
      }}>
        {group.label}
      </span>
    </div>
  )
}

// ── Large single-cat viewer ──────────────────────────────────────────────────
function CatViewer({ cats, viewIndex, placed, selected, catAnim, onPrev, onNext, onSelect }) {
  const cat = cats[viewIndex]
  const isPlaced = !!placed[cat.id]
  const isSelected = selected === cat.id
  const total = cats.length

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      flex: 1,
      justifyContent: 'center',
      padding: '8px 24px 24px',
    }}>
      {/* Counter */}
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.08em',
      }}>
        cat {viewIndex + 1} of {total}
      </div>

      {/* Cat image + nav row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>
        {/* Prev arrow */}
        <button
          onClick={onPrev}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        >
          ‹
        </button>

        {/* Cat image */}
        <div
          onClick={() => !isPlaced && onSelect(cat.id)}
          style={{
            position: 'relative',
            width: 'clamp(180px, 28vw, 240px)',
            height: 'clamp(180px, 28vw, 240px)',
            borderRadius: 20,
            overflow: 'hidden',
            border: isSelected
              ? '3px solid #e8c98c'
              : isPlaced
              ? '3px solid rgba(136,226,180,0.4)'
              : '3px solid rgba(255,255,255,0.08)',
            boxShadow: isSelected
              ? '0 0 28px rgba(232,201,140,0.45), 0 8px 32px rgba(0,0,0,0.6)'
              : isPlaced
              ? '0 0 16px rgba(136,226,180,0.15), 0 8px 24px rgba(0,0,0,0.5)'
              : '0 8px 32px rgba(0,0,0,0.6)',
            cursor: isPlaced ? 'default' : 'pointer',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            animation: catAnim === 'shake' ? 'catShake 0.45s ease'
                     : catAnim === 'pop'   ? 'catPop 0.35s ease'
                     : catAnim === 'left'  ? 'catSlideLeft 0.22s ease'
                     : catAnim === 'right' ? 'catSlideRight 0.22s ease'
                     : 'none',
            flexShrink: 0,
          }}
        >
          <img
            src={cat.src}
            alt="cat"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            draggable={false}
          />
          {/* Gold selection overlay */}
          {isSelected && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(232,201,140,0.1)',
              pointerEvents: 'none',
            }} />
          )}
          {/* Placed overlay */}
          {isPlaced && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(8,16,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 32, opacity: 0.8 }}>✓</span>
            </div>
          )}
        </div>

        {/* Next arrow */}
        <button
          onClick={onNext}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        >
          ›
        </button>
      </div>

      {/* Dot strip */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280 }}>
        {cats.map((c, i) => (
          <div
            key={c.id}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: placed[c.id]
                ? 'rgba(136,226,180,0.6)'
                : i === viewIndex
                ? '#e8c98c'
                : 'rgba(255,255,255,0.15)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {/* Instruction */}
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 12,
        color: 'rgba(255,255,255,0.28)',
        letterSpacing: '0.06em',
        textAlign: 'center',
      }}>
        {isPlaced
          ? 'already placed — browse with arrows'
          : isSelected
          ? 'tap the matching basket above'
          : 'tap the cat to select it'}
      </div>
    </div>
  )
}

// ── Round complete overlay ────────────────────────────────────────────────────
function RoundComplete({ score, roundNumber, onNext, onMenu }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'rgba(8,16,42,0.93)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
      animation: 'roundIn 0.5s ease',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontSize: 38, letterSpacing: 10 }}>✦ ✦ ✦</div>
      <div style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 'clamp(24px, 5vw, 38px)',
        color: '#e8c98c', textAlign: 'center', lineHeight: 1.2,
      }}>
        round {roundNumber} complete
      </div>
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em',
      }}>
        score so far
      </div>
      <div style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 'clamp(52px, 10vw, 76px)',
        color: '#fff', lineHeight: 1,
      }}>
        {score}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onNext}
          style={btnStyle('#e8c98c')}
          onMouseEnter={e => btnHover(e, '#e8c98c')}
          onMouseLeave={e => btnLeave(e, '#e8c98c')}
        >
          next round
        </button>
        <button
          onClick={onMenu}
          style={btnStyle('rgba(255,255,255,0.35)')}
          onMouseEnter={e => btnHover(e, 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => btnLeave(e, 'rgba(255,255,255,0.35)')}
        >
          games menu
        </button>
      </div>
    </div>
  )
}

function btnStyle(col) {
  return {
    padding: '12px 32px', borderRadius: 999,
    border: `1.5px solid ${col}40`,
    background: `${col}12`,
    color: col, fontFamily: "'Outfit', sans-serif",
    fontSize: 14, letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
  }
}
function btnHover(e, col) {
  e.currentTarget.style.background = `${col}22`
  e.currentTarget.style.borderColor = `${col}99`
}
function btnLeave(e, col) {
  e.currentTarget.style.background = `${col}12`
  e.currentTarget.style.borderColor = `${col}40`
}

// ── Cat Sorting Game ─────────────────────────────────────────────────────────
function CatSortGame({ onBack }) {
  const [round, setRound]       = useState(() => buildRound())
  const [roundNumber, setRoundNumber] = useState(1)
  const [cats, setCats]         = useState(() => round.cats)
  const [placed, setPlaced]     = useState({})
  const [selected, setSelected] = useState(null)
  const [viewIndex, setViewIndex] = useState(0)
  const [catAnim, setCatAnim]   = useState(null)
  const [score, setScore]       = useState(0)
  const [streak, setStreak]     = useState(0)
  const [showComplete, setShowComplete] = useState(false)
  const [scoreFlash, setScoreFlash] = useState(false)
  const scoreRef = useRef(score)
  scoreRef.current = score
  const placedRef = useRef(placed)
  placedRef.current = placed

  useEffect(() => {
    setCats(round.cats)
    setPlaced({})
    setSelected(null)
    setViewIndex(0)
    setShowComplete(false)
    setCatAnim(null)
  }, [round])

  function triggerAnim(name, duration = 450) {
    setCatAnim(name)
    setTimeout(() => setCatAnim(null), duration)
  }

  function navigate(dir) {
    setSelected(null)
    setCatAnim(dir === 1 ? 'left' : 'right')
    setTimeout(() => {
      setViewIndex(i => (i + dir + cats.length) % cats.length)
      setCatAnim(null)
    }, 120)
  }

  function advanceToNextUnplaced(fromIndex, afterPlaced) {
    const total = cats.length
    for (let offset = 1; offset < total; offset++) {
      const idx = (fromIndex + offset) % total
      if (!afterPlaced[cats[idx].id]) {
        setCatAnim('left')
        setTimeout(() => {
          setViewIndex(idx)
          setCatAnim(null)
        }, 120)
        return
      }
    }
  }

  function handleCatSelect(catId) {
    if (placed[catId]) return
    setSelected(prev => prev === catId ? null : catId)
  }

  function handleBasketSelect(groupId) {
    if (!selected) return
    const cat = cats.find(c => c.id === selected)
    if (!cat) return

    if (cat.groupId === groupId) {
      const points = 10 + streak * 2
      setScore(scoreRef.current + points)
      setStreak(s => s + 1)
      setScoreFlash(true)
      setTimeout(() => setScoreFlash(false), 400)
      triggerAnim('pop', 350)
      const catId = selected
      setTimeout(() => {
        setPlaced(prev => {
          const newPlaced = { ...prev, [catId]: true }
          placedRef.current = newPlaced
          if (Object.keys(newPlaced).length === cats.length) {
            setTimeout(() => setShowComplete(true), 350)
          } else {
            advanceToNextUnplaced(viewIndex, newPlaced)
          }
          return newPlaced
        })
        setSelected(null)
      }, 350)
    } else {
      setStreak(0)
      triggerAnim('shake', 450)
    }
  }

  function startNextRound() {
    setRound(buildRound())
    setRoundNumber(n => n + 1)
    setScore(s => s) // keep cumulative score
  }

  const placedByGroup = {}
  round.groups.forEach(g => {
    placedByGroup[g.id] = cats.filter(c => c.groupId === g.id && placed[c.id]).length
  })

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative', fontFamily: "'Outfit', sans-serif",
    }}>
      {/* Top bar: score + streak + back */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 28px 4px',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', fontSize: 13,
            fontFamily: "'Outfit', sans-serif", letterSpacing: '0.05em',
            padding: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          ← games
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {streak >= 2 && (
            <div style={{
              fontSize: 12, color: '#88e2b4', letterSpacing: '0.06em',
              background: 'rgba(42,138,90,0.2)', border: '1px solid rgba(42,138,90,0.4)',
              borderRadius: 999, padding: '3px 12px',
            }}>
              ✦ ×{streak} streak
            </div>
          )}
          <div style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: 26, color: '#e8c98c',
            animation: scoreFlash ? 'scoreFlash 0.35s ease' : 'none',
            minWidth: 48, textAlign: 'right',
          }}>
            {score}
          </div>
        </div>
      </div>

      {/* Baskets */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: 'clamp(6px, 2vw, 18px)',
        padding: 'clamp(10px, 2vh, 20px) 20px 6px',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {round.groups.map(group => (
          <Basket
            key={group.id}
            group={group}
            isTarget={selected !== null}
            placedCount={placedByGroup[group.id] || 0}
            onSelect={() => handleBasketSelect(group.id)}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{
        height: 1, margin: '6px 32px',
        background: 'linear-gradient(90deg, transparent, rgba(232,201,140,0.18), transparent)',
        flexShrink: 0,
      }} />

      {/* Cat viewer */}
      <CatViewer
        cats={cats}
        viewIndex={viewIndex}
        placed={placed}
        selected={selected}
        catAnim={catAnim}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onSelect={handleCatSelect}
      />

      {/* Round complete */}
      {showComplete && (
        <RoundComplete
          score={score}
          roundNumber={roundNumber}
          onNext={startNextRound}
          onMenu={onBack}
        />
      )}
    </div>
  )
}

// ── Main GamesRoom ────────────────────────────────────────────────────────────
export default function GamesRoom({ roomName = 'Games' }) {
  const [activeGame, setActiveGame] = useState(null)

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight: '100%', display: 'flex', flexDirection: 'column',
        fontFamily: "'Outfit', sans-serif",
      }}>
        {/* Header */}
        <div className="room-header-wrap">
          <div className="room-head">
            <h2 className="room-title">{roomName}</h2>
          </div>
        </div>

        {activeGame === 'cat-sort'
          ? <CatSortGame onBack={() => setActiveGame(null)} />
          : <GamesMenu onSelect={setActiveGame} />
        }
      </div>
    </>
  )
}
