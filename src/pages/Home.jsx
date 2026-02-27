import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../AuthContext.jsx'
import { format } from 'date-fns'
import './Home.css'

export default function Home() {
  const { profile } = useAuth()
  const [news, setNews] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchNews(), fetchEvents()]).then(() => setLoading(false))
  }, [])

  async function fetchNews() {
    const { data } = await supabase.from('news_posts')
      .select('*, member_profiles(full_name)')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(5)
    setNews(data || [])
  }

  async function fetchEvents() {
    const { data } = await supabase.from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(4)
    setEvents(data || [])
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Member'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="home">
      <div className="home-hero">
        <div className="hero-text">
          <h1 className="hero-greeting">{greeting}, {firstName}</h1>
          <p className="hero-sub">Welcome to the club member portal</p>
        </div>
        {profile?.bag_tag && (
          <div className="hero-tag">
            <div className="hero-tag-num">#{profile.bag_tag}</div>
            <div className="hero-tag-label">YOUR TAG</div>
          </div>
        )}
      </div>

      <div className="home-grid">
        {/* Quick links */}
        <div className="quick-links">
          <Link to="/bagtag" className="quick-link">
            <span className="ql-icon">🥏</span>
            <span className="ql-label">Bag Tags</span>
          </Link>
          <Link to="/scores" className="quick-link">
            <span className="ql-icon">🏌️</span>
            <span className="ql-label">Scores</span>
          </Link>
          <Link to="/events" className="quick-link">
            <span className="ql-icon">📅</span>
            <span className="ql-label">Events</span>
          </Link>
          <Link to="/members" className="quick-link">
            <span className="ql-icon">👥</span>
            <span className="ql-label">Members</span>
          </Link>
        </div>

        {/* News feed */}
        <div className="home-section">
          <div className="section-header">
            <h2 className="section-title">LATEST NEWS</h2>
            <Link to="/news" className="section-link">View all →</Link>
          </div>
          {loading ? <div className="loading"><div className="spinner" /></div> :
           news.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📰</div>
              <div className="empty-title">NO NEWS YET</div>
            </div>
          ) : (
            <div className="news-list">
              {news.map((post, i) => (
                <div key={post.id} className="news-card fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  {post.cover_image && <img src={post.cover_image} className="news-img" alt="" />}
                  <div className="news-body">
                    <div className="news-meta">
                      <span className={`badge badge-${post.category === 'Tournament' ? 'yellow' : post.category === 'Announcement' ? 'blue' : 'green'}`}>
                        {post.category || 'News'}
                      </span>
                      <span className="news-date">{format(new Date(post.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <h3 className="news-title">{post.title}</h3>
                    <p className="news-excerpt">{post.excerpt || post.body?.slice(0, 120)}...</p>
                    <span className="news-author">By {post.member_profiles?.full_name || 'Admin'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="home-section">
          <div className="section-header">
            <h2 className="section-title">UPCOMING EVENTS</h2>
            <Link to="/events" className="section-link">View all →</Link>
          </div>
          {loading ? <div className="loading"><div className="spinner" /></div> :
           events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <div className="empty-title">NO UPCOMING EVENTS</div>
            </div>
          ) : (
            <div className="events-list">
              {events.map((ev, i) => (
                <div key={ev.id} className="event-row fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="event-date-block">
                    <div className="event-day">{format(new Date(ev.event_date), 'dd')}</div>
                    <div className="event-month">{format(new Date(ev.event_date), 'MMM')}</div>
                  </div>
                  <div className="event-info">
                    <div className="event-name">{ev.title}</div>
                    <div className="event-detail">
                      {ev.location && <span>📍 {ev.location}</span>}
                      <span>🕐 {format(new Date(ev.event_date), 'h:mm a')}</span>
                    </div>
                  </div>
                  <span className={`badge badge-${ev.event_type === 'Tournament' ? 'yellow' : ev.event_type === 'Social' ? 'green' : 'blue'}`}>
                    {ev.event_type || 'Event'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
