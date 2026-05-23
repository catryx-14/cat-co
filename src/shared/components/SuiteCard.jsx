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
          width: 135,
          height: 180,
          objectFit: 'cover',
          objectPosition: 'center 20%',
          borderRadius: '50%',
          border: 'none',
          boxShadow: hovered
            ? '0 0 0 9px rgba(222,148,170,0.92), 0 0 0 16px rgba(110,68,28,0.95), 0 0 0 17px rgba(35,15,3,0.55), 0 0 0 19px rgba(232,201,140,0.88), 0 0 0 20px rgba(35,15,3,0.3), 0 10px 30px rgba(0,0,0,0.55)'
            : '0 0 0 9px rgba(218,143,165,0.82), 0 0 0 16px rgba(100,62,24,0.9), 0 0 0 17px rgba(35,15,3,0.45), 0 0 0 19px rgba(232,201,140,0.7), 0 0 0 20px rgba(35,15,3,0.2), 0 5px 18px rgba(0,0,0,0.4)',
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
