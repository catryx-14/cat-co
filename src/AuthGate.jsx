import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) {
    async function signIn(e) {
      e.preventDefault()
      setError('')
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) setError(err.message)
    }
    return (
      <div className="auth-gate">
        <form className="auth-box" onSubmit={signIn}>
          <h1 className="auth-title">Cat &amp; Co</h1>
          <p className="auth-sub">the threshold</p>
          <div className="auth-field">
            <label className="auth-label">email</label>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">password</label>
            <input
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'entering…' : 'enter'}
          </button>
        </form>
      </div>
    )
  }

  return children(session)
}
