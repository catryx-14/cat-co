import { useState } from 'react'

export default function SuiteCard({ icon, title, subtitle, onClick }) {
  const [hovered, setHovered] = useState(false)
  const isImage = typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('data:') || icon.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 200,
        padding: '20px 16px 24px',
        borderRadius: 16,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}
    >
      {isImage ? (
        <img src={icon} alt="" style={{
          width: 170,
          height: 'auto',
          objectFit: 'contain',
          border: 'none',
          filter: hovered ? 'drop-shadow(0 6px 18px rgba(0,0,0,0.5))' : 'drop-shadow(0 3px 10px rgba(0,0,0,0.35))',
          transition: 'all 0.2s',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
          display: 'block',
        }} />
      ) : (
        <span style={{ fontSize: 28 }}>{icon}</span>
      )}
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
