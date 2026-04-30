import { useState, useEffect } from 'react'
import { supabase } from './shared/lib/supabase.js'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) {
    async function signInWithEmail(e) {
      e.preventDefault()
      setError('')
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError('that didn\'t work, try again'); setLoading(false) }
    }

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
          <form onSubmit={signInWithEmail} style={{ display: 'contents' }}>
            <div className="auth-field">
              <label className="auth-label">email</label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">password</label>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'entering…' : 'sign in'}
            </button>
          </form>
          <div className="auth-or"><span>or</span></div>
          <button className="auth-btn auth-btn--ghost" onClick={signInWithGoogle} disabled={loading}>
            continue with Google
          </button>
        </div>
      </div>
    )
  }

  return children(session)
}
