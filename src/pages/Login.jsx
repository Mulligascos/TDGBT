import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import './Login.css'

export default function Login() {
  const { signInWithEmail, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function switchMode(m) {
    setError('')
    setSuccess('')
    setPassword('')
    setMode(m)
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return setError('Please enter your email and password')
    setLoading(true)
    setError('')
    const { error } = await signInWithEmail(email.trim().toLowerCase(), password)
    setLoading(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password' : error.message)
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email) return setError('Please enter your email address')
    setLoading(true)
    setError('')
    const { error } = await resetPassword(email.trim().toLowerCase())
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess('Password reset link sent — check your inbox.')
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

        {mode === 'login' && (
          <>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to your member account</p>
            <form onSubmit={handleLogin} className="login-form">
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
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
                {loading
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Signing in...</>
                  : 'Sign in'}
              </button>
            </form>
            <div className="login-links">
              <button className="login-link" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </div>
            <p className="login-note">
              Don't have an account? Contact your club admin to get access.
            </p>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1 className="login-title">Reset password</h1>
            <p className="login-subtitle">Enter your email and we'll send you a reset link</p>
            <form onSubmit={handleForgot} className="login-form">
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
              {success && <div className="login-success">{success}</div>}
              <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
                {loading
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Sending...</>
                  : 'Send reset link'}
              </button>
            </form>
            <div className="login-links">
              <button className="login-link" onClick={() => switchMode('login')}>
                ← Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
