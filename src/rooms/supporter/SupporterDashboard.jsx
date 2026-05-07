import { useState, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabase.js'

const MECHANISM_LABELS = {
  sensory_flooding: "I'm overwhelmed — everything is too much",
  sympathetic_activation: "I feel activated and angry",
  grief_processing: "I think I need to cry",
  dorsal_shutdown: "I've shut down",
}

export default function SupporterDashboard({ profile, onTree, onLibrary }) {
  const [stateLabel, setStateLabel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCatState()
  }, [profile?.linked_user_id])

  async function loadCatState() {
    setLoading(true)
    try {
      const catId = profile?.linked_user_id
      if (!catId) { setLoading(false); return }

      const { data: sess } = await supabase
        .from('first_aid_sessions')
        .select('user_state_id, user_states(custom_label, mechanism_id)')
        .eq('user_id', catId)
        .not('user_state_id', 'is', null)
        .maybeSingle()

      if (!sess?.user_state_id) { setLoading(false); return }
      const state = sess.user_states
      setStateLabel(state?.custom_label || MECHANISM_LABELS[state?.mechanism_id] || null)
    } catch (e) {
      console.error('[SupporterDashboard] loadCatState:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
      padding: '40px 24px',
      gap: '28px',
    }}>
      {/* Active state banner */}
      {!loading && stateLabel && (
        <div style={{
          background: 'rgba(110,192,191,0.1)',
          border: '1px solid rgba(110,192,191,0.38)',
          borderRadius: '10px',
          padding: '12px 20px',
          color: '#6ec0bf',
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
          lineHeight: 1.5,
        }}>
          Cat has selected: <strong>{stateLabel}</strong>
        </div>
      )}

      {/* Heading */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'Italiana, serif',
          fontSize: 'clamp(40px, 9vw, 72px)',
          color: '#f5edd6',
          margin: 0,
          letterSpacing: 2,
          textShadow: '0 0 40px rgba(232,184,124,0.2)',
        }}>
          Cat &amp; Co
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: '15px',
          color: 'rgba(245,237,214,0.45)',
          margin: '8px 0 0',
          letterSpacing: 1,
        }}>
          supporter view
        </p>
      </div>

      {/* Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '320px',
      }}>
        <button
          onClick={onTree}
          style={{
            background: 'rgba(232,201,140,0.08)',
            border: '1px solid rgba(232,201,140,0.5)',
            borderRadius: '12px',
            padding: '18px 24px',
            color: '#f5edd6',
            fontSize: '16px',
            fontFamily: "'Outfit', sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          How can I help?
        </button>
        <button
          onClick={onLibrary}
          style={{
            background: 'transparent',
            border: '1px solid rgba(245,237,214,0.18)',
            borderRadius: '12px',
            padding: '18px 24px',
            color: 'rgba(245,237,214,0.6)',
            fontSize: '16px',
            fontFamily: "'Outfit', sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          Library
        </button>
      </div>

      {/* Quiet note for Wes */}
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: '14px',
        color: 'rgba(245,237,214,0.28)',
        textAlign: 'center',
        lineHeight: 1.85,
        maxWidth: '360px',
        margin: '12px 0 0',
      }}>
        Cat built this for you. She thought about you while she was building it — about what you'd need, about how your brain works, about what would actually help you help her. The pre-staging tasks, the two-at-a-time rule, the permission to talk to Myra, the reminder that your comfort matters — all of that was her thinking about you.
        <br /><br />
        You don't have to get this perfect. You just have to show up and follow the path. That's enough. That has always been enough.
      </p>
    </div>
  )
}
