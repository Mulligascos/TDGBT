import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import Members from './pages/Members.jsx'
import News from './pages/News.jsx'
import Events from './pages/Events.jsx'
import Scores from './pages/Scores.jsx'
import BagTag from './pages/BagTag.jsx'
import './App.css'

function AppShell() {
  const { session, profile, loading, isAdmin, signOut } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, background: '#080c0a', color: '#6b8f72', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 48 }}>🥏</div>
      <div style={{ fontSize: 14, letterSpacing: 2 }}>LOADING...</div>
    </div>
  )

  if (!session) return <Login />

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo">
            <span className="logo-icon">🥏</span>
            <div>
              <div className="logo-title">{profile?.club_name || 'DISC GOLF'}</div>
              <div className="logo-sub">MEMBER PORTAL</div>
            </div>
          </NavLink>

          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
            <NavLink to="/news" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>News</NavLink>
            <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Events</NavLink>
            <NavLink to="/scores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Scores</NavLink>
            <NavLink to="/bagtag" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Bag Tags</NavLink>
            <NavLink to="/members" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Members</NavLink>
          </nav>

          <div className="header-right">
            <NavLink to="/profile" className="profile-btn">
              {profile?.photo_url
                ? <img src={profile.photo_url} className="avatar avatar-sm" alt="" />
                : <div className="avatar avatar-sm">{initials}</div>
              }
              <span className="profile-name">{profile?.full_name?.split(' ')[0] || 'Profile'}</span>
              {isAdmin && <span className="admin-pip" title="Admin">★</span>}
            </NavLink>
            <button className="btn btn-secondary btn-sm signout-btn" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/members" element={<Members />} />
          <Route path="/news" element={<News />} />
          <Route path="/events" element={<Events />} />
          <Route path="/scores" element={<Scores />} />
          <Route path="/bagtag" element={<BagTag />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>{profile?.club_name || 'Disc Golf Club'}</span>
        <span className="footer-sep">·</span>
        <span>Member Portal</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
