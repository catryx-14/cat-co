import { useState, useEffect } from "react";

// Colour sync note: #e8e0ff / #7a6aa0 appear in the keyframes, the holding state,
// the fading state, and the header. If these colours ever change, update all four
// locations together or the breathing rhythm will look broken.

const STAGES = {
  FULL:     "full",
  HOLDING:  "holding",
  FADING:   "fading",
  HEADER:   "header",
  SUBTITLE: "subtitle",
  CARDS:    "cards",
};

const states = [
  { id: "a", label: "Something difficult happened" },
  { id: "b", label: "I'm overwhelmed — everything is too much" },
  { id: "c", label: "I've shut down" },
  { id: "d", label: "I'm frazzled and I don't know why" },
];

export default function FirstAidRoom({ onHome }) {
  const [stage, setStage] = useState(STAGES.FULL);
  const [selected, setSelected] = useState(null);
  const [autoPlayed, setAutoPlayed] = useState(false);
  const [visibleCards, setVisibleCards] = useState([]);

  // Outfit is loaded globally via index.html — no dynamic injection needed.

  // Transition sequence: +1 cycle (37.4s) → holds tiny 5s → fades over 2s →
  // header snaps in 0.4s → subtitle drifts in 0.8s → cards stagger 180ms apart
  useEffect(() => {
    if (autoPlayed) return;
    const timer = setTimeout(() => {
      setAutoPlayed(true);
      setStage(STAGES.HOLDING);
      setTimeout(() => setStage(STAGES.FADING),   5000);
      setTimeout(() => setStage(STAGES.HEADER),   7300);
      setTimeout(() => setStage(STAGES.SUBTITLE), 8200);
      setTimeout(() => setStage(STAGES.CARDS),    9400);
    }, 37400);
    return () => clearTimeout(timer);
  }, [autoPlayed]);

  useEffect(() => {
    if (stage !== STAGES.CARDS) return;
    setVisibleCards([]);
    states.forEach((_, i) => {
      setTimeout(() => {
        setVisibleCards(prev => [...prev, i]);
      }, i * 180);
    });
  }, [stage]);

  const skip = () => {
    if (stage !== STAGES.FULL) return;
    setAutoPlayed(true);
    setStage(STAGES.CARDS);
  };

  const reset = () => {
    setStage(STAGES.FULL);
    setSelected(null);
    setVisibleCards([]);
    setAutoPlayed(false);
  };

  const handleConfirm = () => {
    // TODO: Navigate to Tools screen — pass `selected` forward here when that
    // session is built. `selected` will be one of: "a", "b", "c", "d".
    console.log("First Aid state selected:", selected);
  };

  const isFull      = stage === STAGES.FULL;
  const isHolding   = stage === STAGES.HOLDING;
  const isFading    = stage === STAGES.FADING;
  const showHeader   = [STAGES.HEADER, STAGES.SUBTITLE, STAGES.CARDS].includes(stage);
  const showSubtitle = [STAGES.SUBTITLE, STAGES.CARDS].includes(stage);
  const showCards    = stage === STAGES.CARDS;

  return (
    // No background set here — the site's body gradient and star canvas show through.
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Outfit', sans-serif",
      overflow: "hidden",
    }}>

      {/* Header area */}
      <div style={{
        padding: showHeader ? "40px 36px 32px" : "0 36px",
        overflow: "hidden",
        transition: "padding 0.4s ease",
        flexShrink: 0,
        textAlign: "center",
        borderBottom: showCards ? "1px solid #1e2040" : "none",
      }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 400,
          fontSize: "38px",
          color: "#f5edd6",
          letterSpacing: "0.18em",
          opacity: showHeader ? 1 : 0,
          transition: "opacity 0.4s ease",
          marginBottom: "12px",
        }}>
          breathe.
        </div>

        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 300,
          fontSize: "14px",
          color: "rgba(245,237,214,0.6)",
          letterSpacing: "0.10em",
          opacity: showSubtitle ? 1 : 0,
          transform: showSubtitle ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}>
          where do we start?
        </div>
      </div>

      {/* Main area — centers the breathe animation or shows cards */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: (isFull || isHolding || isFading) ? "center" : "flex-start",
          padding: showCards ? "32px 24px" : "0",
          position: "relative",
        }}
        onClick={isFull ? skip : undefined}
      >

        {/* Large breathe. — animated during FULL, locked tiny during HOLDING/FADING */}
        {!showHeader && (
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            display: "block",
            textAlign: "center",
            userSelect: "none",
            // FULL: animation running — 120px→64px, opacity 1→0.35, 11s cycle
            ...(isFull ? {
              animation: "breathePulse 11s cubic-bezier(0.45, 0, 0.55, 1) infinite",
            } : {}),
            // HOLDING: locked at exhale bottom, no transition
            ...(isHolding ? {
              fontSize: "clamp(30px, 8vw, 64px)",
              opacity: 0.35,
              letterSpacing: "0.20em",
              color: "#7a6aa0",
              transition: "none",
            } : {}),
            // FADING: stays tiny, opacity fades to 0 over 2s
            ...(isFading ? {
              fontSize: "clamp(30px, 8vw, 64px)",
              opacity: 0,
              letterSpacing: "0.20em",
              color: "#7a6aa0",
              transition: "opacity 2s ease",
            } : {}),
          }}>
            breathe.
          </span>
        )}

        {isFull && (
          <div style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "11px",
            color: "#2a2a45",
            letterSpacing: "2px",
            textTransform: "uppercase",
            fontFamily: "system-ui",
          }}>
            tap to skip ahead
          </div>
        )}

        {/* State picker cards */}
        {showCards && (
          <div style={{
            width: "100%",
            maxWidth: "520px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}>
            {states.map((state, i) => (
              <button
                key={state.id}
                className="state-btn"
                onClick={() => setSelected(state.id)}
                style={{
                  background:   "#131630",
                  border:       "1.5px solid rgba(180,160,220,0.6)",
                  borderRadius: "10px",
                  padding:      "18px 22px",
                  textAlign:    "center",
                  cursor:       "pointer",
                  width:        "100%",
                  fontFamily:   "'Outfit', sans-serif",
                  fontSize:     "16px",
                  fontWeight:   400,
                  color:        "rgba(245,237,214,0.75)",
                  letterSpacing: "0.02em",
                  lineHeight:   1.4,
                  opacity:      visibleCards.includes(i) ? 1 : 0,
                  transform:    visibleCards.includes(i) ? "translateY(0)" : "translateY(10px)",
                  transition:   "opacity 0.5s ease, transform 0.5s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                }}>
                {state.label}
              </button>
            ))}

            {selected && (
              <button
                onClick={handleConfirm}
                style={{
                  gridColumn:   "1 / -1",
                  marginTop:    "8px",
                  width:        "100%",
                  padding:      "16px",
                  background:   "rgba(180,160,220,0.08)",
                  border:       "1.5px solid rgba(180,160,220,0.95)",
                  borderRadius: "10px",
                  color:        "rgba(255,255,255,0.95)",
                  fontFamily:   "'Outfit', sans-serif",
                  fontSize:     "15px",
                  fontWeight:   400,
                  letterSpacing: "0.06em",
                  cursor:       "pointer",
                }}>
                this is where I am →
              </button>
            )}
          </div>
        )}

        {showCards && (
          <button onClick={reset} style={{
            position:      "fixed",
            bottom:        "24px",
            right:         "24px",
            background:    "transparent",
            border:        "1px solid #1e2040",
            color:         "#3a3a60",
            borderRadius:  "6px",
            padding:       "6px 12px",
            fontSize:      "10px",
            cursor:        "pointer",
            fontFamily:    "system-ui",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}>
            replay
          </button>
        )}
      </div>

      {/* breathePulse keyframes — locked values, do not change independently:
          all colour/size/opacity values also appear in the holding/fading inline
          styles above and in the header text. Change all together or never. */}
      <style>{`
        @keyframes breathePulse {
          0%   { font-size: 120px; opacity: 1;    letter-spacing: 0.06em; color: #e8e0ff; }
          40%  { font-size: 64px;  opacity: 0.35; letter-spacing: 0.20em; color: #7a6aa0; }
          55%  { font-size: 64px;  opacity: 0.35; letter-spacing: 0.20em; color: #7a6aa0; }
          100% { font-size: 120px; opacity: 1;    letter-spacing: 0.06em; color: #e8e0ff; }
        }
        @media (max-width: 720px) {
          @keyframes breathePulse {
            0%   { font-size: 56px;  opacity: 1;    letter-spacing: 0.06em; color: #e8e0ff; }
            40%  { font-size: 30px;  opacity: 0.35; letter-spacing: 0.20em; color: #7a6aa0; }
            55%  { font-size: 30px;  opacity: 0.35; letter-spacing: 0.20em; color: #7a6aa0; }
            100% { font-size: 56px;  opacity: 1;    letter-spacing: 0.06em; color: #e8e0ff; }
          }
        }
        .state-btn:hover {
          background: rgba(180,160,220,0.08) !important;
          border-color: rgba(180,160,220,0.95) !important;
          color: rgba(255,255,255,0.95) !important;
        }
      `}</style>
    </div>
  );
}
