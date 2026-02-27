import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import './Login.css'

export default function Login() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await signInWithEmail(email.trim().toLowerCase())
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb orb1" />
        <div className="login-orb orb2" />
      </div>

      <div className="login-card fade-up">
        <div className="login-logo">
          <span className="login-disc">🥏</span>
          <div className="login-club">DISC GOLF</div>
          <div className="login-portal">MEMBER PORTAL</div>
        </div>

        {sent ? (
          <div className="login-sent">
            <div className="sent-icon">📬</div>
            <h2 className="sent-title">Check your email</h2>
            <p className="sent-body">
              We've sent a magic link to <strong>{email}</strong>.<br />
              Click the link to sign in — no password needed.
            </p>
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Enter your email and we'll send you a sign-in link.</p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
                {loading ? <><div className="spinner" style={{width:14,height:14}} /> Sending...</> : '✉️ Send magic link'}
              </button>
            </form>

            <p className="login-note">
              Not a member yet? Contact your club admin to get access.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
