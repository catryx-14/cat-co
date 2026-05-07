import { useState, useEffect } from "react";
import { supabase } from "../../shared/lib/supabase.js";

const TIER_LABELS = {
  1: "tier 1 — near zero capacity",
  2: "tier 2 — a little more capacity",
  3: "tier 3 — coming back online",
  4: "tier 4 — enough online to reach outward",
};

export default function FirstAidToolsScreen({ mechanism, onChangeState, onReset, dataUserId = null, onSupporterBack = null }) {
  const [userState, setUserState]       = useState(null);
  const [permissions, setPermissions]   = useState([]);
  const [tierGroups, setTierGroups]     = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [tickedIds, setTickedIds]             = useState(new Set());
  const [openTiers, setOpenTiers]             = useState(new Set([1]));
  const [activeCard, setActiveCard]           = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => { loadData(); }, [mechanism]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // For supporter mode, state data comes from Cat's user ID; session always uses the authenticated user.
      const stateUserId = dataUserId || user.id;

      // user_state for this mechanism
      const { data: us, error: usErr } = await supabase
        .from("user_states")
        .select("id, custom_label, intro_text")
        .eq("user_id", stateUserId)
        .eq("mechanism_id", mechanism)
        .eq("is_active", true)
        .maybeSingle();
      if (usErr) throw usErr;
      if (!us) throw new Error("State not found for this user");
      setUserState(us);

      // permissions
      const { data: perms, error: permsErr } = await supabase
        .from("user_state_permissions")
        .select("id, display_order, permissions_library(text)")
        .eq("user_state_id", us.id)
        .eq("user_id", stateUserId)
        .order("display_order");
      if (permsErr) throw permsErr;
      setPermissions((perms ?? []).map(p => p.permissions_library?.text).filter(Boolean));

      // tool assignments
      const { data: tools, error: toolsErr } = await supabase
        .from("user_tool_assignments")
        .select("id, tier, display_order, custom_note, regulation_tools(name, has_card, description, how_to_use, time_component, access_cost, the_science, notes_variations)")
        .eq("user_state_id", us.id)
        .eq("user_id", stateUserId)
        .eq("is_active", true)
        .order("tier")
        .order("display_order");
      if (toolsErr) throw toolsErr;

      console.log("[FirstAid] raw tools response:", JSON.stringify(tools?.slice(0, 2)));
      console.log("[FirstAid] permissions response:", JSON.stringify(perms));
      console.log("[FirstAid] userState:", JSON.stringify(us));

      const groups = {};
      for (const t of tools ?? []) {
        if (!groups[t.tier]) groups[t.tier] = [];
        groups[t.tier].push(t);
      }
      setTierGroups(groups);

      // session always keyed to the authenticated user (Wes's ticks are his own)
      const { data: session, error: sessErr } = await supabase
        .from("first_aid_sessions")
        .select("user_state_id, ticked_tool_ids")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sessErr) throw sessErr;

      if (session && session.user_state_id === us.id) {
        setTickedIds(new Set(session.ticked_tool_ids ?? []));
      } else {
        await supabase
          .from("first_aid_sessions")
          .upsert(
            { user_id: user.id, user_state_id: us.id, ticked_tool_ids: [] },
            { onConflict: "user_id" }
          );
        setTickedIds(new Set());
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTick(assignmentId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = new Set(tickedIds);
    if (next.has(assignmentId)) next.delete(assignmentId);
    else next.add(assignmentId);
    setTickedIds(next);
    await supabase
      .from("first_aid_sessions")
      .update({ ticked_tool_ids: [...next], last_active_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  function toggleTier(tier) {
    setOpenTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  }

  async function confirmReset() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setTickedIds(new Set());
    setOpenTiers(new Set([1]));
    setShowResetConfirm(false);
    const { error: resetErr } = await supabase
      .from("first_aid_sessions")
      .update({ ticked_tool_ids: [], user_state_id: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (resetErr) console.error("[FirstAid] reset update error:", resetErr);
    const { data: check } = await supabase
      .from("first_aid_sessions")
      .select("user_state_id, ticked_tool_ids")
      .eq("user_id", user.id)
      .maybeSingle();
    console.log("[FirstAid] session after reset:", JSON.stringify(check));
    onReset();
  }

  if (loading) return (
    <div style={{ padding: "40px", color: "rgba(245,237,214,0.4)", fontFamily: "'Outfit', sans-serif", fontSize: "14px" }}>
      loading…
    </div>
  );
  if (error) return (
    <div style={{ padding: "40px", color: "rgba(255,120,100,0.7)", fontFamily: "'Outfit', sans-serif", fontSize: "14px" }}>
      {error}
    </div>
  );

  const tiers = Object.keys(tierGroups).map(Number).sort();

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Supporter back link ── */}
      {onSupporterBack && (
        <div style={{
          padding: "12px 24px 0",
          flexShrink: 0,
        }}>
          <button
            onClick={onSupporterBack}
            style={btnReset({ color: "rgba(110,192,191,0.7)", fontSize: "12px", letterSpacing: "0.02em" })}
          >
            ← back to supporter tree
          </button>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: onSupporterBack ? "10px 24px 16px" : "20px 24px 16px",
        borderBottom: "1px solid rgba(232,201,140,0.28)",
        flexShrink: 0,
      }}>
        <button onClick={onChangeState} style={btnReset({ color: "rgba(245,237,214,0.65)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" })}>
          ← change state
        </button>
        <div style={{ color: "#f5edd6", fontSize: "15px", fontWeight: 400, letterSpacing: "0.04em" }}>
          {userState?.custom_label}
        </div>
        <button onClick={() => setShowResetConfirm(true)} style={btnReset({ color: "rgba(245,237,214,0.35)", fontSize: "11px", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "4px" })}>
          ↺ reset session
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 48px", maxWidth: "600px", width: "100%" }}>

        {/* Intro text */}
        {userState?.intro_text && (
          <p style={{ fontStyle: "italic", color: "rgba(245,237,214,0.55)", fontSize: "14px", lineHeight: 1.75, margin: "0 0 20px" }}>
            {userState.intro_text}
          </p>
        )}

        {/* Permission statements */}
        {permissions.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            {permissions.map((text, i) => (
              <p key={i} style={{ fontStyle: "italic", color: "rgba(245,237,214,0.38)", fontSize: "13px", lineHeight: 1.6, margin: "0 0 6px" }}>
                {text}
              </p>
            ))}
          </div>
        )}

        {/* Tier blocks */}
        {tiers.map(tier => {
          const tools = tierGroups[tier];
          const isOpen = openTiers.has(tier);
          return (
            <div key={tier} style={{ marginBottom: "10px" }}>
              <button
                onClick={() => toggleTier(tier)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(232,201,140,0.25)",
                  borderRadius: isOpen ? "10px 10px 0 0" : "10px",
                  padding: "11px 16px",
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  color: "#f5edd6",
                  fontSize: "13px",
                  letterSpacing: "0.04em",
                  textAlign: "left",
                }}
              >
                <span>{TIER_LABELS[tier]}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span style={{ background: "rgba(232,201,140,0.12)", color: "rgba(232,201,140,0.7)", borderRadius: "10px", padding: "2px 8px", fontSize: "11px" }}>
                    {tools.length}
                  </span>
                  <span style={{ color: "rgba(245,237,214,0.4)", fontSize: "11px" }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {!isOpen && (
                <div style={{
                  border: "1px solid rgba(232,201,140,0.25)",
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  padding: "7px 16px",
                  fontStyle: "italic",
                  color: "rgba(245,237,214,0.25)",
                  fontSize: "12px",
                }}>
                  tap to expand when you're ready
                </div>
              )}

              {isOpen && (
                <div style={{ border: "1px solid rgba(232,201,140,0.25)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                  {tools.map((t, idx) => {
                    const tool = t.regulation_tools;
                    if (!tool) return <div key={t.id} style={{ padding: "10px 16px", color: "rgba(245,237,214,0.3)", fontSize: "12px" }}>tool data unavailable (id: {t.id})</div>;
                    const ticked = tickedIds.has(t.id);
                    return (
                      <div key={t.id} style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                        padding: "13px 16px",
                        borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        background: ticked ? "rgba(232,201,140,0.04)" : "transparent",
                        transition: "background 0.15s ease",
                      }}>
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTick(t.id)}
                          aria-label={ticked ? "untick" : "tick"}
                          style={{
                            width: "20px", height: "20px", flexShrink: 0, marginTop: "2px",
                            borderRadius: "5px",
                            border: ticked ? "1.5px solid rgba(232,201,140,0.75)" : "1.5px solid rgba(245,237,214,0.22)",
                            background: ticked ? "rgba(232,201,140,0.18)" : "transparent",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "rgba(232,201,140,0.9)", fontSize: "11px", fontWeight: 600,
                          }}
                        >
                          {ticked ? "✓" : ""}
                        </button>

                        {/* Tool info */}
                        <div style={{ flex: 1 }}>
                          {tool.has_card ? (
                            <button
                              onClick={() => setActiveCard({ name: tool.name, description: tool.description, how_to_use: tool.how_to_use, time_component: tool.time_component, access_cost: tool.access_cost, the_science: tool.the_science, notes_variations: tool.notes_variations })}
                              style={btnReset({ color: "rgba(232,201,140,0.85)", fontSize: "14px", textDecoration: "underline", textDecorationColor: "rgba(232,201,140,0.3)", display: "inline-flex", alignItems: "center", gap: "4px" })}
                            >
                              {tool.name}
                              <span style={{ fontSize: "10px", opacity: 0.65 }}>↗</span>
                            </button>
                          ) : (
                            <span style={{ color: "#f5edd6", fontSize: "14px" }}>{tool.name}</span>
                          )}

                          {t.custom_note && (
                            <div style={{ fontStyle: "italic", color: "rgba(245,237,214,0.45)", fontSize: "12px", marginTop: "3px" }}>
                              {t.custom_note}
                            </div>
                          )}

                          {!tool.has_card && (
                            <div style={{ fontStyle: "italic", color: "rgba(245,237,214,0.18)", fontSize: "11px", marginTop: "2px" }}>
                              no card yet
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Reset confirmation ── */}
      {showResetConfirm && (
        <div style={overlayBackdrop}>
          <div style={overlayBox}>
            <p style={{ color: "#f5edd6", fontSize: "15px", margin: "0 0 22px", lineHeight: 1.5 }}>
              clear all ticks and start fresh?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={confirmReset} style={confirmBtn}>yes, reset</button>
              <button onClick={() => setShowResetConfirm(false)} style={cancelBtn}>cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tool card overlay ── */}
      {activeCard && (
        <div style={overlayBackdrop} onClick={() => setActiveCard(null)}>
          <div
            style={{ ...overlayBox, maxWidth: "400px", textAlign: "left", position: "relative", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveCard(null)}
              style={btnReset({ position: "absolute", top: "14px", right: "16px", color: "rgba(245,237,214,0.45)", fontSize: "17px", lineHeight: 1, padding: "4px" })}
            >
              ✕
            </button>
            <h2 style={{ color: "#f5edd6", fontSize: "18px", fontWeight: 400, margin: "0 0 16px", paddingRight: "28px", flexShrink: 0 }}>
              {activeCard.name}
            </h2>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {activeCard.description && (
                <p style={{ color: "rgba(245,237,214,0.65)", fontSize: "14px", lineHeight: 1.75, margin: "0 0 18px" }}>
                  {activeCard.description}
                </p>
              )}
              {activeCard.how_to_use && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={cardLabel}>how to use it</div>
                  <p style={cardText}>{activeCard.how_to_use}</p>
                </div>
              )}
              {activeCard.time_component && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={cardLabel}>time</div>
                  <p style={cardText}>{activeCard.time_component}</p>
                </div>
              )}
              {activeCard.access_cost && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={cardLabel}>access cost</div>
                  <p style={cardText}>{activeCard.access_cost}</p>
                </div>
              )}
              {activeCard.the_science && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={cardLabel}>the science</div>
                  <p style={cardText}>{activeCard.the_science}</p>
                </div>
              )}
              {activeCard.notes_variations && (
                <div style={{ marginBottom: "4px" }}>
                  <div style={cardLabel}>notes</div>
                  <p style={cardText}>{activeCard.notes_variations}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────

function btnReset(extra = {}) {
  return {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    ...extra,
  };
}

const overlayBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(5,8,20,0.87)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
};

const overlayBox = {
  background: "#0f1428",
  border: "1px solid rgba(232,201,140,0.45)",
  borderRadius: "14px",
  padding: "28px 32px",
  maxWidth: "320px",
  width: "90%",
  textAlign: "center",
  fontFamily: "'Outfit', sans-serif",
};

const confirmBtn = {
  background: "rgba(232,201,140,0.1)",
  border: "1px solid rgba(232,201,140,0.45)",
  borderRadius: "8px",
  color: "#f5edd6",
  padding: "10px 22px",
  cursor: "pointer",
  fontFamily: "'Outfit', sans-serif",
  fontSize: "13px",
};

const cancelBtn = {
  background: "transparent",
  border: "1px solid rgba(245,237,214,0.15)",
  borderRadius: "8px",
  color: "rgba(245,237,214,0.55)",
  padding: "10px 22px",
  cursor: "pointer",
  fontFamily: "'Outfit', sans-serif",
  fontSize: "13px",
};

const cardLabel = {
  color: "rgba(232,201,140,0.55)",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "5px",
};

const cardText = {
  color: "rgba(245,237,214,0.65)",
  fontSize: "13px",
  lineHeight: 1.75,
  margin: 0,
};
