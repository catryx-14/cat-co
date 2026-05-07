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
  { id: "a", label: "I'm overwhelmed — everything is too much", mechanism: "sensory_flooding",       textColor: "#a8d8f0", glowColor: "#1880b0" },
  { id: "b", label: "I'm frazzled and I don't know why",        mechanism: "accumulated_load",       textColor: "#a8c890", glowColor: "#507040" },
  { id: "c", label: "I feel activated and angry",               mechanism: "sympathetic_activation", textColor: "#f0c070", glowColor: "#c87820" },
  { id: "d", label: "I think I need to cry",                    mechanism: "grief_processing",       textColor: "#e8a0b0", glowColor: "#c05070" },
  { id: "e", label: "I've shut down",                           mechanism: "dorsal_shutdown",        textColor: "#c8a8f8", glowColor: "#7020d0" },
];

export default function FirstAidRoom({ onHome }) {
  const [stage, setStage] = useState(STAGES.FULL);
  const [selected, setSelected] = useState(null);
  const [autoPlayed, setAutoPlayed] = useState(false);
  const [visibleCards, setVisibleCards] = useState([]);

  // Outfit is loaded globally via index.html — no dynamic injection needed.

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
    console.log("First Aid state selected:", selected);
  };

  const isFull      = stage === STAGES.FULL;
  const isHolding   = stage === STAGES.HOLDING;
  const isFading    = stage === STAGES.FADING;
  const showHeader   = [STAGES.HEADER, STAGES.SUBTITLE, STAGES.CARDS].includes(stage);
  const showSubtitle = [STAGES.SUBTITLE, STAGES.CARDS].includes(stage);
  const showCards    = stage === STAGES.CARDS;

  return (
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Outfit', sans-serif",
      overflow: "hidden",
    }}>
      <div style={{
        padding: showHeader ? "40px 36px 32px" : "0 36px",
        overflow: "hidden",
        transition: "padding 0.4s ease",
        flexShrink: 0,
        textAlign: "center",
        borderBottom: showCards ? "1px solid #1e2040" : "none",
      }}>
        <div className="fa-title" style={{
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
        <div className="fa-subtitle" style={{
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
        {!showHeader && (
          <span className="fa-breathe-word" style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            display: "block",
            textAlign: "center",
            userSelect: "none",
            ...(isFull ? {
              willChange: "transform, opacity",
              animation: "breathePulse 11s cubic-bezier(0.45, 0, 0.55, 1) infinite",
            } : {}),
            ...(isHolding ? {
              transform: "scale(0.533)",
              opacity: 0.35,
              letterSpacing: "0.20em",
              color: "#7a6aa0",
              transition: "none",
            } : {}),
            ...(isFading ? {
              transform: "scale(0.533)",
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

        {showCards && (
          <div style={{ width: "100%", maxWidth: "520px" }}>
            {/* Rows 1 & 2 — 2×2 grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}>
              {states.slice(0, 4).map((state, i) => (
                <button
                  key={state.id}
                  className={`state-btn state-btn--${state.mechanism}`}
                  data-mechanism={state.mechanism}
                  onClick={() => setSelected(state.id)}
                  style={{
                    background:    "#0f1428",
                    border:        selected === state.id
                      ? `1px solid ${state.glowColor}`
                      : "1px solid rgba(255,255,255,0.08)",
                    borderRadius:  "12px",
                    padding:       "22px 20px",
                    textAlign:     "center",
                    cursor:        "pointer",
                    width:         "100%",
                    fontFamily:    "'Outfit', sans-serif",
                    fontSize:      "0.95rem",
                    fontWeight:    400,
                    color:         state.textColor,
                    lineHeight:    1.45,
                    position:      "relative",
                    overflow:      "hidden",
                    opacity:       visibleCards.includes(i) ? 1 : 0,
                    transform:     visibleCards.includes(i) ? "translateY(0)" : "translateY(10px)",
                    transition:    "opacity 0.5s ease, transform 0.5s ease, border-color 0.2s ease",
                    "--glow":      state.glowColor,
                  }}>
                  {state.label}
                </button>
              ))}
            </div>

            {/* Row 3 — single centred anchor card */}
            <div style={{
              display:        "flex",
              justifyContent: "center",
              marginTop:      "14px",
            }}>
              {(() => {
                const state = states[4];
                const i = 4;
                return (
                  <button
                    key={state.id}
                    className={`state-btn state-btn--${state.mechanism}`}
                    data-mechanism={state.mechanism}
                    onClick={() => setSelected(state.id)}
                    style={{
                      background:    "#0f1428",
                      border:        selected === state.id
                        ? `1px solid ${state.glowColor}`
                        : "1px solid rgba(255,255,255,0.08)",
                      borderRadius:  "12px",
                      padding:       "22px 20px",
                      textAlign:     "center",
                      cursor:        "pointer",
                      width:         "280px",
                      fontFamily:    "'Outfit', sans-serif",
                      fontSize:      "0.95rem",
                      fontWeight:    400,
                      color:         state.textColor,
                      lineHeight:    1.45,
                      position:      "relative",
                      overflow:      "hidden",
                      opacity:       visibleCards.includes(i) ? 1 : 0,
                      transform:     visibleCards.includes(i) ? "translateY(0)" : "translateY(10px)",
                      transition:    "opacity 0.5s ease, transform 0.5s ease, border-color 0.2s ease",
                      "--glow":      state.glowColor,
                    }}>
                    {state.label}
                  </button>
                );
              })()}
            </div>

            {selected && (
              <button
                onClick={handleConfirm}
                style={{
                  display:       "block",
                  marginTop:     "20px",
                  width:         "100%",
                  padding:       "16px",
                  background:    "rgba(180,160,220,0.08)",
                  border:        "1.5px solid rgba(180,160,220,0.95)",
                  borderRadius:  "10px",
                  color:         "rgba(255,255,255,0.95)",
                  fontFamily:    "'Outfit', sans-serif",
                  fontSize:      "15px",
                  fontWeight:    400,
                  letterSpacing: "0.06em",
                  cursor:        "pointer",
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

      <style>{`
        .fa-breathe-word { font-size: 120px; }
        @keyframes breathePulse {
          0%   { transform: scale(1);     opacity: 1;    letter-spacing: 0.06em; color: #e8e0ff; }
          40%  { transform: scale(0.533); opacity: 0.35; letter-spacing: 0.20em; color: #7a6aa0; }
          55%  { transform: scale(0.533); opacity: 0.35; letter-spacing: 0.20em; color: #7a6aa0; }
          100% { transform: scale(1);     opacity: 1;    letter-spacing: 0.06em; color: #e8e0ff; }
        }
        @media (max-width: 720px) {
          .fa-breathe-word {
            font-size: 56px;
            position: fixed;
            inset: 0;
            width: fit-content;
            height: fit-content;
            max-width: 90vw;
            margin: auto;
            text-align: center;
          }
          .fa-title    { font-size: 48px !important; }
          .fa-subtitle { font-size: 18px !important; letter-spacing: 0.14em !important; }
        }

        @keyframes cardGlow {
          0%   { opacity: 0.15; }
          50%  { opacity: 0.28; }
          100% { opacity: 0.15; }
        }

        .state-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: radial-gradient(ellipse at center, var(--glow) 0%, transparent 70%);
          animation: cardGlow 4s ease-in-out infinite;
          pointer-events: none;
        }

        .state-btn:hover {
          transform: translateY(-2px) !important;
        }

        .state-btn--sensory_flooding:hover    { box-shadow: 0 0 28px rgba(24,128,176,0.25); }
        .state-btn--accumulated_load:hover    { box-shadow: 0 0 28px rgba(80,112,64,0.25); }
        .state-btn--sympathetic_activation:hover { box-shadow: 0 0 28px rgba(200,120,32,0.25); }
        .state-btn--grief_processing:hover    { box-shadow: 0 0 28px rgba(192,80,112,0.25); }
        .state-btn--dorsal_shutdown:hover     { box-shadow: 0 0 32px rgba(160,100,240,0.3); }
      `}</style>
    </div>
  );
}
