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

// ── Basket cushion ───────────────────────────────────────────────────────────
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
        gap: 6,
        cursor: isTarget ? 'pointer' : 'default',
        transition: 'transform 0.15s',
        transform: active ? 'scale(1.06)' : 'scale(1)',
      }}
    >
      <div style={{
        position: 'relative',
        width: 90,
        height: 72,
        borderRadius: 14,
        background: `radial-gradient(ellipse at 50% 40%, ${group.cushionGlow}, ${group.cushionColor} 70%)`,
        border: `2px solid ${active ? group.borderColor : 'rgba(255,255,255,0.08)'}`,
        boxShadow: active
          ? `0 0 20px ${group.cushionGlow}, 0 0 8px ${group.borderColor}`
          : `0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Cushion stitch lines */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden', pointerEvents: 'none' }}>
          {[0.3, 0.5, 0.7].map(y => (
            <div key={y} style={{
              position: 'absolute', left: '10%', right: '10%',
              top: `${y * 100}%`, height: 1,
              background: 'rgba(255,255,255,0.06)',
            }} />
          ))}
        </div>
        {/* Pip progress */}
        <div style={{ display: 'flex', gap: 4, position: 'relative', zIndex: 1 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < placedCount ? group.borderColor : 'rgba(255,255,255,0.12)',
              boxShadow: i < placedCount ? `0 0 6px ${group.cushionGlow}` : 'none',
              transition: 'background 0.3s, box-shadow 0.3s',
            }} />
          ))}
        </div>
      </div>
      <span style={{
        fontSize: 11,
        fontFamily: "'Outfit', sans-serif",
        color: active ? group.borderColor : 'rgba(255,255,255,0.45)',
        letterSpacing: '0.08em',
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
