import { useState } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import { todayDisplayStr } from '../../shared/lib/dates.js'
import gamesIcon from '../../assets/games-icon.png'
import libraryIcon from '../../assets/library-icon.png'

const MORE_ROOMS = [
  {
    id: 'games',
    icon: gamesIcon,
    title: 'games',
    subtitle: 'a soft place to drift',
  },
  {
    id: 'library',
    icon: libraryIcon,
    title: 'library',
    subtitle: 'stories · collected things',
  },
]

function RoomCard({ icon, title, subtitle, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 220,
        padding: '20px 16px 24px',
        borderRadius: 16,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        transition: 'transform 0.15s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      <img
        src={icon}
        alt=""
        style={{
          width: 170,
          height: 170,
          objectFit: 'contain',
          transition: 'filter 0.2s, transform 0.2s',
          filter: hovered
            ? 'drop-shadow(0 0 18px rgba(232,201,140,0.6))'
            : 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <span style={{
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontSize: 20,
          color: '#e8c98c',
          lineHeight: 1.2,
        }}>
          {title}
        </span>
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13,
          color: 'rgba(230,210,165,0.75)',
          lineHeight: 1.5,
        }}>
          {subtitle}
        </span>
      </div>
    </button>
  )
}

export default function MoreLightsRoom({ onRoom, onSettings }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">more this way</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
      </div>
      <div style={{ padding: '24px 32px 40px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {MORE_ROOMS.map(r => (
            <RoomCard
              key={r.id}
              icon={r.icon}
              title={r.title}
              subtitle={r.subtitle}
              onClick={() => onRoom(r.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
