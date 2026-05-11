import { useState } from 'react'

export default function SuiteCard({ icon, title, subtitle, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 220,
        padding: '20px 24px',
        borderRadius: 16,
        border: `1.5px solid ${hovered ? 'rgba(232,201,140,0.45)' : 'rgba(232,201,140,0.2)'}`,
        background: hovered ? 'rgba(232,201,140,0.08)' : 'rgba(255,255,255,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
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
        color: 'rgba(255,255,255,0.45)',
        lineHeight: 1.5,
      }}>
        {subtitle}
      </span>
    </button>
  )
}
