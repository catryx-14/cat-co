import { useState, useEffect, useCallback, useRef } from 'react'

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

// ── Styles (inline to keep component self-contained) ─────────────────────────
const css = `
@keyframes catShake {
  0%,100% { transform: translateX(0) rotate(0deg); }
  15%      { transform: translateX(-6px) rotate(-3deg); }
  30%      { transform: translateX(6px)  rotate(3deg); }
  45%      { transform: translateX(-4px) rotate(-2deg); }
  60%      { transform: translateX(4px)  rotate(2deg); }
  75%      { transform: translateX(-2px) rotate(-1deg); }
}
@keyframes catPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.18); }
  70%  { transform: scale(0.93); }
  100% { transform: scale(1); }
}
@keyframes basketPulse {
  0%,100% { box-shadow: var(--basket-glow-base); }
  50%     { box-shadow: var(--basket-glow-peak); }
}
@keyframes scoreFlash {
  0%   { transform: scale(1); color: #e8c98c; }
  40%  { transform: scale(1.35); color: #fff; }
  100% { transform: scale(1); color: #e8c98c; }
}
@keyframes roundIn {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes catLand {
  0%   { opacity: 1; transform: scale(1); }
  60%  { opacity: 0.5; transform: scale(0.5); }
  100% { opacity: 0; transform: scale(0.1); }
}
@keyframes starBurst {
  0%   { transform: scale(0) rotate(0deg); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: scale(1.8) rotate(180deg); opacity: 0; }
}
`

// ── Basket cushion ───────────────────────────────────────────────────────────
function Basket({ group, isTarget, placedCount, onSelect, selectedCatGroupId }) {
  const isCorrectTarget = isTarget && selectedCatGroupId === group.id
  const isPotentialTarget = isTarget && selectedCatGroupId != null

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: isPotentialTarget ? 'pointer' : 'default',
        opacity: isPotentialTarget && !isCorrectTarget ? 0.7 : 1,
        transition: 'opacity 0.2s, transform 0.2s',
        transform: isCorrectTarget ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 90,
          height: 72,
          borderRadius: 14,
          background: `radial-gradient(ellipse at 50% 40%, ${group.cushionGlow}, ${group.cushionColor} 70%)`,
          border: `2px solid ${isCorrectTarget ? group.borderColor : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isCorrectTarget
            ? `0 0 18px ${group.cushionGlow}, 0 0 6px ${group.borderColor}`
            : `0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Cushion texture lines */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden', pointerEvents: 'none',
        }}>
          {[0.3, 0.5, 0.7].map(y => (
            <div key={y} style={{
              position: 'absolute',
              left: '10%', right: '10%',
              top: `${y * 100}%`,
              height: 1,
              background: `rgba(255,255,255,0.06)`,
            }} />
          ))}
        </div>
        {/* Cat count pips */}
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
        {/* Glow ring when selected */}
        {isCorrectTarget && (
          <div style={{
            position: 'absolute', inset: -3, borderRadius: 16,
            border: `1.5px solid ${group.borderColor}`,
            opacity: 0.5, pointerEvents: 'none',
            animation: 'basketPulse 1s ease-in-out infinite',
            '--basket-glow-base': `0 0 8px ${group.cushionGlow}`,
            '--basket-glow-peak': `0 0 22px ${group.cushionGlow}`,
          }} />
        )}
      </div>
      <span style={{
        fontSize: 11,
        fontFamily: "'Outfit', sans-serif",
        color: isCorrectTarget ? group.borderColor : 'rgba(255,255,255,0.5)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        transition: 'color 0.2s',
        fontWeight: isCorrectTarget ? 600 : 400,
      }}>
        {group.label}
      </span>
    </div>
  )
}

// ── Cat card ─────────────────────────────────────────────────────────────────
function CatCard({ cat, isSelected, isPlaced, onSelect }) {
  const [anim, setAnim] = useState(null)

  useEffect(() => {
    if (anim) {
      const t = setTimeout(() => setAnim(null), 500)
      return () => clearTimeout(t)
    }
  }, [anim])

  function triggerShake() { setAnim('shake') }
  function triggerPop()   { setAnim('pop') }

  // expose shake/pop via ref-like callback on the card — parent will call these
  // We instead respond to prop changes from parent
  useEffect(() => {
    if (cat._shake) triggerShake()
    if (cat._pop)   triggerPop()
  }, [cat._shake, cat._pop])

  if (isPlaced) return null

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        width: 88,
        height: 88,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        border: isSelected ? '2px solid #e8c98c' : '2px solid rgba(255,255,255,0.08)',
        boxShadow: isSelected
          ? '0 0 18px rgba(232,201,140,0.5), 0 4px 20px rgba(0,0,0,0.6)'
          : '0 4px 14px rgba(0,0,0,0.5)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        animation: anim === 'shake' ? 'catShake 0.45s ease' : anim === 'pop' ? 'catPop 0.4s ease' : 'none',
        flexShrink: 0,
      }}
    >
      <img
        src={cat.src}
        alt="cat"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        draggable={false}
      />
      {isSelected && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(232,201,140,0.15)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

// ── Round complete overlay ────────────────────────────────────────────────────
function RoundComplete({ score, roundNumber, onNext }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'rgba(8,16,42,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
      animation: 'roundIn 0.5s ease',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Stars */}
      <div style={{ fontSize: 40, letterSpacing: 8 }}>✦ ✦ ✦</div>
      <div style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 'clamp(24px, 5vw, 38px)',
        color: '#e8c98c',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        round {roundNumber} complete
      </div>
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: '0.05em',
      }}>
        score so far
      </div>
      <div style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 'clamp(48px, 10vw, 72px)',
        color: '#fff',
        lineHeight: 1,
      }}>
        {score}
      </div>
      <button
        onClick={onNext}
        style={{
          marginTop: 8,
          padding: '12px 36px',
          borderRadius: 999,
          border: '1.5px solid rgba(232,201,140,0.5)',
          background: 'rgba(232,201,140,0.1)',
          color: '#e8c98c',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 15,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(232,201,140,0.2)'
          e.currentTarget.style.borderColor = 'rgba(232,201,140,0.8)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(232,201,140,0.1)'
          e.currentTarget.style.borderColor = 'rgba(232,201,140,0.5)'
        }}
      >
        next round
      </button>
    </div>
  )
}

// ── Main GamesRoom ────────────────────────────────────────────────────────────
export default function GamesRoom({ roomName = 'Games' }) {
  const [round, setRound]       = useState(() => buildRound())
  const [roundNumber, setRoundNumber] = useState(1)
  const [cats, setCats]         = useState(() => round.cats)
  const [placed, setPlaced]     = useState({})          // catId → true
  const [selected, setSelected] = useState(null)        // catId
  const [score, setScore]       = useState(0)
  const [streak, setStreak]     = useState(0)
  const [showComplete, setShowComplete] = useState(false)
  const [scoreFlash, setScoreFlash] = useState(false)
  const scoreRef = useRef(score)
  scoreRef.current = score

  // Keep cats in sync with round
  useEffect(() => {
    setCats(round.cats)
    setPlaced({})
    setSelected(null)
    setShowComplete(false)
  }, [round])

  function startNextRound() {
    const next = buildRound()
    setRound(next)
    setRoundNumber(n => n + 1)
  }

  function handleCatSelect(catId) {
    setSelected(prev => prev === catId ? null : catId)
  }

  function handleBasketSelect(groupId) {
    if (!selected) return
    const cat = cats.find(c => c.id === selected)
    if (!cat) return

    if (cat.groupId === groupId) {
      // Correct
      const points = 10 + streak * 2
      const newScore = scoreRef.current + points
      setScore(newScore)
      setStreak(s => s + 1)
      setScoreFlash(true)
      setTimeout(() => setScoreFlash(false), 400)

      // Trigger pop animation
      setCats(prev => prev.map(c => c.id === selected ? { ...c, _pop: Date.now() } : { ...c, _pop: null }))
      const catId = selected
      setTimeout(() => {
        setPlaced(prev => {
          const newPlaced = { ...prev, [catId]: true }
          if (Object.keys(newPlaced).length === 15) {
            setTimeout(() => setShowComplete(true), 300)
          }
          return newPlaced
        })
        setSelected(null)
      }, 350)
    } else {
      // Wrong
      setStreak(0)
      setCats(prev => prev.map(c => c.id === selected ? { ...c, _shake: Date.now() } : { ...c, _shake: null }))
    }
  }

  const placedByGroup = {}
  round.groups.forEach(g => {
    placedByGroup[g.id] = cats.filter(c => c.groupId === g.id && placed[c.id]).length
  })

  const selectedCat = selected ? cats.find(c => c.id === selected) : null

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', sans-serif",
        position: 'relative',
      }}>
        {/* Header */}
        <div className="room-header-wrap">
          <div className="room-head">
            <h2 className="room-title">{roomName}</h2>
          </div>
        </div>

        {/* Score bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 32px 0',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: 28,
            color: '#e8c98c',
            animation: scoreFlash ? 'scoreFlash 0.35s ease' : 'none',
            minWidth: 80,
          }}>
            {score}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {streak >= 2 && (
              <div style={{
                fontSize: 12,
                color: '#88e2b4',
                letterSpacing: '0.06em',
                fontFamily: "'Outfit', sans-serif",
                background: 'rgba(42,138,90,0.2)',
                border: '1px solid rgba(42,138,90,0.4)',
                borderRadius: 999,
                padding: '3px 12px',
              }}>
                ✦ ×{streak} streak
              </div>
            )}
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.05em',
            }}>
              round {roundNumber}
            </div>
          </div>
        </div>

        {/* Baskets */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'clamp(8px, 2vw, 20px)',
          padding: 'clamp(16px, 3vh, 28px) 24px 8px',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          {round.groups.map(group => (
            <Basket
              key={group.id}
              group={group}
              isTarget={selected !== null}
              placedCount={placedByGroup[group.id] || 0}
              onSelect={() => handleBasketSelect(group.id)}
              selectedCatGroupId={selectedCat?.groupId}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          margin: '8px 32px',
          background: 'linear-gradient(90deg, transparent, rgba(232,201,140,0.2), transparent)',
          flexShrink: 0,
        }} />

        {/* Instructions */}
        <div style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.06em',
          padding: '0 24px 8px',
          flexShrink: 0,
        }}>
          {selected
            ? 'tap the matching basket'
            : 'tap a cat to select it'}
        </div>

        {/* Cat grid */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 24px 32px',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(8px, 1.5vw, 14px)',
            justifyContent: 'center',
            maxWidth: 640,
            margin: '0 auto',
          }}>
            {cats.map(cat => (
              <CatCard
                key={cat.id}
                cat={cat}
                isSelected={selected === cat.id}
                isPlaced={!!placed[cat.id]}
                onSelect={() => !placed[cat.id] && handleCatSelect(cat.id)}
              />
            ))}
          </div>
        </div>

        {/* Round complete overlay */}
        {showComplete && (
          <RoundComplete
            score={score}
            roundNumber={roundNumber}
            onNext={startNextRound}
          />
        )}
      </div>
    </>
  )
}
