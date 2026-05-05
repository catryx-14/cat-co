export default function RoomMark({ date, onSettings }) {
  return (
    <div className="room-mark-stack">
      <button
        type="button"
        className="room-mark-amp"
        onClick={onSettings}
        aria-label="open settings"
        title="settings"
        style={{ width: 28, height: 28 }}
      >
        <svg viewBox="-14 -14 28 28" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <radialGradient id="starRimGold" cx="30%" cy="25%" r="60%">
              <stop offset="0%"  stopColor="#fff8e0" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#fff8e0" stopOpacity="0" />
            </radialGradient>
            <filter id="starGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#starGlow)">
            {/* outer glow layer */}
            <path d="M10,0 L1.768,-1.768 L0,-10 L-1.768,-1.768 L-10,0 L-1.768,1.768 L0,10 L1.768,1.768 Z"
              fill="rgba(212,174,60,0.55)" />
            {/* main body */}
            <path d="M8,0 L1.414,-1.414 L0,-8 L-1.414,-1.414 L-8,0 L-1.414,1.414 L0,8 L1.414,1.414 Z"
              fill="rgba(244,212,100,0.92)" />
            {/* bright inner */}
            <path d="M5,0 L0.884,-0.884 L0,-5 L-0.884,-0.884 L-5,0 L-0.884,0.884 L0,5 L0.884,0.884 Z"
              fill="rgba(255,248,200,0.98)" />
            {/* specular rim */}
            <path d="M8,0 L1.414,-1.414 L0,-8 L-1.414,-1.414 L-8,0 L-1.414,1.414 L0,8 L1.414,1.414 Z"
              fill="url(#starRimGold)" />
            {/* hot core */}
            <circle cx="0" cy="0" r="1.2" fill="rgba(255,255,240,1)" />
          </g>
        </svg>
      </button>
      {date && <div className="room-date">{date}</div>}
    </div>
  )
}
