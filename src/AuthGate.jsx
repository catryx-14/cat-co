import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = initialising
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION once Supabase finishes initialising
    // (including processing any OAuth tokens in the URL), so we don't need getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Still loading — show nothing so we don't flash the login screen
  if (session === undefined) return null

  if (!session) {
    async function signInWithGoogle() {
      setError('')
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (err) { setError(err.message); setLoading(false) }
    }

    return (
      <div className="auth-gate">
        <div className="auth-box">
          <h1 className="auth-title">Cat &amp; Co</h1>
          <p className="auth-sub">the threshold</p>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-btn" onClick={signInWithGoogle} disabled={loading}>
            {loading ? 'entering…' : 'continue with Google'}
          </button>
        </div>
      </div>
    )
  }

  return children(session)
}
