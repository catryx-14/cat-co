export default function RoomMark({ date, onHome }) {
  return (
    <div className="room-mark-stack">
      <button
        type="button"
        className="room-mark-amp"
        onClick={onHome}
        aria-label="return to threshold"
        title="return to threshold"
      >
        <svg viewBox="0 0 229 329" aria-hidden="true">
          <defs>
            <linearGradient id="ampGoldSm" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%"   stopColor="#fff5cc"/>
              <stop offset="22%"  stopColor="#f4d28a"/>
              <stop offset="45%"  stopColor="#c9923a"/>
              <stop offset="65%"  stopColor="#8c5a1c"/>
              <stop offset="82%"  stopColor="#d4a352"/>
              <stop offset="100%" stopColor="#7a4a14"/>
            </linearGradient>
            <filter id="ampBevelSm" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
              <feSpecularLighting in="blur" surfaceScale="6" specularConstant="1.4" specularExponent="22" lightingColor="#fff8dc" result="spec">
                <feDistantLight azimuth="225" elevation="45"/>
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClipped"/>
              <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="specClipped"/></feMerge>
            </filter>
          </defs>
          <g filter="url(#ampBevelSm)">
            <path
              fill="url(#ampGoldSm)"
              stroke="#5a3608" strokeWidth="1.5" strokeOpacity="0.55"
              d="M 166 0 L 186 0 L 206 8 L 221 23 L 225 30 L 229 44 L 229 71 L 219 96 L 209 110 L 199 120 L 172 142 L 156 158 L 150 167 L 147 177 L 147 182 L 152 189 L 184 199 L 197 206 L 203 214 L 207 223 L 209 235 L 208 252 L 204 266 L 190 287 L 169 306 L 157 313 L 137 321 L 118 325 L 99 326 L 71 323 L 53 317 L 47 324 L 39 328 L 23 329 L 12 326 L 6 320 L 5 313 L 12 306 L 22 304 L 24 302 L 15 292 L 6 277 L 2 266 L 0 247 L 5 225 L 22 199 L 24 191 L 20 181 L 11 167 L 8 151 L 10 140 L 16 126 L 23 116 L 33 107 L 31 100 L 37 94 L 43 94 L 49 99 L 62 94 L 85 92 L 115 71 L 120 70 L 120 104 L 116 113 L 110 119 L 97 115 L 75 115 L 69 117 L 97 136 L 99 138 L 98 141 L 94 140 L 64 119 L 59 119 L 58 121 L 73 151 L 69 151 L 58 128 L 53 122 L 52 128 L 55 156 L 52 157 L 48 127 L 47 126 L 39 136 L 37 142 L 37 155 L 44 174 L 45 186 L 30 220 L 29 242 L 35 261 L 42 272 L 53 283 L 71 292 L 94 297 L 112 297 L 129 294 L 154 284 L 163 278 L 173 268 L 181 255 L 184 243 L 184 233 L 181 225 L 169 215 L 142 206 L 131 199 L 126 191 L 124 181 L 124 172 L 130 157 L 139 146 L 187 99 L 195 88 L 201 72 L 201 51 L 195 37 L 184 27 L 177 24 L 159 22 L 157 20 L 156 10 L 158 3 L 166 0 Z"
            />
          </g>
        </svg>
      </button>
      {date && <div className="room-date">{date}</div>}
    </div>
  )
}
