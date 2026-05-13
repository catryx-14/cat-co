import { useState } from 'react'
import SuiteCard from '../../shared/components/SuiteCard.jsx'
import BookPileRoom from './BookPileRoom.jsx'
import RoomMark from '../../shared/components/RoomMark.jsx'

function todayDisplayStr() {
  const d = new Date()
  const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
  return `${d.getFullYear()} · ${m} · ${d.getDate().toString().padStart(2,'0')}`
}

const SUITE_ROOMS = [
  {
    id: 'book-pile',
    icon: '📚',
    title: 'the book pile',
    subtitle: "every book you've read, want to read, or gave up on",
  },
]

function EFSuiteLanding({ onSelect }) {
  return (
    <div style={{ padding: '24px 0 40px' }}>
      <p style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 18,
        color: 'rgba(255,255,255,0.45)',
        margin: '0 0 28px',
        fontStyle: 'italic',
      }}>
        tools for the doing-things part of your brain
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {SUITE_ROOMS.map(r => (
          <SuiteCard
            key={r.id}
            icon={r.icon}
            title={r.title}
            subtitle={r.subtitle}
            onClick={() => onSelect(r.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default function EFSuiteRoom() {
  const [activeRoom, setActiveRoom] = useState(null)
  const title = activeRoom === 'book-pile' ? 'the book pile' : 'executive suite'

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">{title}</h2>
          {activeRoom === 'book-pile' && (
            <RoomMark date={todayDisplayStr()} onSettings={() => {}} />
          )}
        </div>
      </div>
      {activeRoom === 'book-pile'
        ? <BookPileRoom onBack={() => setActiveRoom(null)} />
        : <EFSuiteLanding onSelect={setActiveRoom} />
      }
    </div>
  )
}
