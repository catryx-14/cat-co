import { useState, useEffect } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import JewelRoomOval from '../../components/jewelry/JewelRoomOval.jsx'
import { todayDisplayStr } from '../../shared/lib/dates.js'
import { supabase } from '../../shared/lib/supabase.js'
import herdingCatsIcon from '../../assets/herding-cats-icon.png'
import bookPileIcon from '../../assets/book-pile-icon.png'

const PAGE_LABEL = 'more this way'
const PIN_CAP = 5

const ROOM_ICONS = {
  'herding-cats': herdingCatsIcon,
  'book-pile':    bookPileIcon,
}

// ── Room oval — the Jewelry & Joy metallic ring (JewelRoomOval) frames the room
// icon (or, for coming-soon rooms with no art, shows the ring's centre diamond).
// Hovering a live room lights it to the "active" state: glow + brighter ring +
// dot sparkle. Coming-soon rooms are dimmed. ───────────────────────────────────
function OvalPlaceholder({ hov, live, icon }) {
  const active = live && hov
  return (
    <div style={{ position: 'relative', width: 96, height: 120, flexShrink: 0 }}>
      <JewelRoomOval
        variant="quiet"
        active={active}
        centerDiamond={!icon}
        dim={!live}
        width={96}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      {icon && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 70, height: 90, borderRadius: '50%', overflow: 'hidden',
        }}>
          <img src={icon} alt="" draggable={false} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: !live ? 0.25 : hov ? 1 : 0.82,
            transition: 'opacity 0.2s', userSelect: 'none',
          }} />
        </div>
      )}
    </div>
  )
}

// ── Pin toggle button ────────────────────────────────────────────────────────
function PinButton({ pinned, onToggle, disabled }) {
  const [hov, setHov] = useState(false)
  const title = pinned
    ? 'remove from threshold'
    : disabled ? 'unpin one to add another' : 'pin to threshold'

  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle() }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={title}
      aria-label={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: disabled && !pinned ? 'not-allowed' : 'pointer',
        padding: '3px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled && !pinned ? 0.3 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <span style={{
        fontSize: 13,
        lineHeight: 1,
        color: pinned
          ? '#e8c98c'
          : hov && !disabled ? 'rgba(232,201,140,0.55)' : 'rgba(232,201,140,0.2)',
        transition: 'color 0.15s',
        userSelect: 'none',
      }}>
        {pinned ? '◆' : '◇'}
      </span>
    </button>
  )
}

// ── Room card ────────────────────────────────────────────────────────────────
function RoomCard({ room, pinned, pinCount, onPin, onNavigate }) {
  const isLive = room.status === 'live'
  const [hov, setHov] = useState(false)
  const pinDisabled = !pinned && pinCount >= PIN_CAP

  return (
    <div
      onClick={() => isLive && onNavigate(room.route)}
      onMouseEnter={() => isLive && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 108,
        gap: 8,
        cursor: isLive ? 'pointer' : 'default',
        opacity: isLive ? 1 : 0.38,
      }}
    >
      <OvalPlaceholder hov={hov} live={isLive} icon={ROOM_ICONS[room.slug]} />

      <span style={{
        fontFamily: "'Montserrat', Georgia, serif",
        fontSize: 14,
        lineHeight: 1.3,
        textAlign: 'center',
        color: isLive
          ? hov ? '#f0d9a8' : 'rgba(240,217,168,0.78)'
          : 'rgba(232,201,140,0.4)',
        transition: 'color 0.15s',
        maxWidth: '100%',
      }}>
        {room.name}
      </span>

      {!isLive && (
        <span style={{
          fontFamily: "'Montserrat', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 12,
          color: 'rgba(232,201,140,0.22)',
          marginTop: -4,
        }}>
          coming soon
        </span>
      )}

      {isLive && (
        <PinButton
          pinned={pinned}
          onToggle={() => onPin(room.slug, room.name, room.route)}
          disabled={pinDisabled}
        />
      )}
    </div>
  )
}

// ── Wing accordion ───────────────────────────────────────────────────────────
function WingAccordion({ wing, rooms, open, onToggle, pinSlugs, pinCount, onPin, onNavigate }) {
  const rawLabel = wing.room_label || 'room'
  const countLabel = rooms.length === 1 ? `1 ${rawLabel}` : `${rooms.length} ${rawLabel}s`

  return (
    <div style={{ borderBottom: '1px solid rgba(232,201,140,0.09)' }}>
      {/* Wing header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '15px 0',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 10,
          color: 'rgba(232,201,140,0.35)',
          flexShrink: 0,
          display: 'inline-block',
          transition: 'transform 0.18s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          lineHeight: 1,
          marginBottom: 2,
        }}>▶</span>

        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 19,
          color: 'var(--candle-soft)',
          letterSpacing: '0.01em',
        }}>
          {wing.name}
        </span>

        {wing.subtitle && (
          <span style={{
            fontFamily: "'Montserrat', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 14,
            color: 'rgba(232,201,140,0.42)',
          }}>
            {wing.subtitle}
          </span>
        )}

        <span style={{
          marginLeft: 'auto',
          fontFamily: "'Montserrat', Georgia, serif",
          fontSize: 12,
          color: 'rgba(232,201,140,0.22)',
          flexShrink: 0,
        }}>
          {countLabel}
        </span>
      </button>

      {/* Card gallery */}
      {open && (
        <div style={{
          paddingLeft: 22,
          paddingBottom: 20,
          paddingTop: 4,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
        }}>
          {rooms.map(room => (
            <RoomCard
              key={room.slug}
              room={room}
              pinned={pinSlugs.has(room.slug)}
              pinCount={pinCount}
              onPin={onPin}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MoreLightsRoom({ onRoom, onSettings, pinSlugs, pinCount, onAddPin, onRemovePin }) {
  const [wings, setWings]           = useState([])
  const [roomsByWing, setRoomsByWing] = useState({})
  const [loading, setLoading]       = useState(true)
  const [openWing, setOpenWing]     = useState(null)
  const [nudge, setNudge]           = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('hub_wings').select('*').eq('status', 'active').order('sort_order'),
      supabase.from('hub_rooms').select('*').order('sort_order'),
    ]).then(([wingsRes, roomsRes]) => {
      const byWing = {}
      for (const r of (roomsRes.data || [])) {
        if (!byWing[r.wing_slug]) byWing[r.wing_slug] = []
        byWing[r.wing_slug].push(r)
      }
      setWings(wingsRes.data || [])
      setRoomsByWing(byWing)
      setLoading(false)
    })
  }, [])

  const handlePin = (slug, name, route) => {
    const isPinned = pinSlugs.has(slug)
    if (isPinned) {
      onRemovePin(slug)
    } else {
      if (pinCount >= PIN_CAP) {
        setNudge(true)
        setTimeout(() => setNudge(false), 3000)
        return
      }
      onAddPin(slug, name, route)
    }
  }

  const toggleWing = (slug) => setOpenWing(prev => prev === slug ? null : slug)

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">{PAGE_LABEL}</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
      </div>

      <div style={{ padding: '8px 32px 80px', maxWidth: 700 }}>
        {nudge && (
          <div style={{
            fontFamily: "'Montserrat', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 14,
            color: 'rgba(232,201,140,0.6)',
            padding: '10px 0 6px',
          }}>
            unpin one to add another
          </div>
        )}

        {loading ? (
          <div style={{
            fontFamily: "'Montserrat', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 16,
            color: 'rgba(232,201,140,0.3)',
            padding: '32px 0',
          }}>
            …
          </div>
        ) : (
          wings.map(wing => (
            <WingAccordion
              key={wing.slug}
              wing={wing}
              rooms={roomsByWing[wing.slug] || []}
              open={openWing === wing.slug}
              onToggle={() => toggleWing(wing.slug)}
              pinSlugs={pinSlugs}
              pinCount={pinCount}
              onPin={handlePin}
              onNavigate={onRoom}
            />
          ))
        )}
      </div>
    </div>
  )
}
