import SuiteCard from '../../shared/components/SuiteCard.jsx'
import RoomMark from '../../shared/components/RoomMark.jsx'

function todayDisplayStr() {
  const d = new Date()
  const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
  return `${d.getFullYear()} · ${m} · ${d.getDate().toString().padStart(2,'0')}`
}

const MORE_ROOMS = [
  {
    id: 'games',
    icon: '🎮',
    title: 'games',
    subtitle: 'a soft place to drift',
  },
  {
    id: 'library',
    icon: '📖',
    title: 'library',
    subtitle: 'stories · collected things',
  },
]

export default function MoreLightsRoom({ onRoom, onSettings }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">more lights</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
      </div>
      <div style={{ padding: '24px 32px 40px' }}>
        <p style={{
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontSize: 18,
          color: 'rgba(255,255,255,0.45)',
          margin: '0 0 28px',
          fontStyle: 'italic',
        }}>
          more rooms this way
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {MORE_ROOMS.map(r => (
            <SuiteCard
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
