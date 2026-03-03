import React from 'react';
import { BRAND, formatName } from '../utils';
import { PageHeader, EmptyState, Badge } from '../components/ui';

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
export const HistoryPage = ({ currentUser }) => (
  <div style={pageStyle}>
    <PageHeader title="History" subtitle="Past results & tournaments" />
    <div style={bodyStyle}>
      <EmptyState
        icon="📋"
        title="Coming in Session 5"
        subtitle="Full match history, filters by player, opponent, tournament, venue and date"
      />
    </div>
    <GlobalStyles />
  </div>
);

// ─── COURSES PAGE ─────────────────────────────────────────────────────────────
export const CoursesPage = ({ currentUser, courses }) => (
  <div style={pageStyle}>
    <PageHeader title="Courses" subtitle="Local disc golf courses" />
    <div style={bodyStyle}>
      {courses.length === 0 ? (
        <EmptyState icon="⛳" title="Coming in Session 6" subtitle="Course info, pars, hazards and change requests" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {courses.map(course => (
            <div key={course.id} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{course.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {course.holes} holes · {course.location}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    <GlobalStyles />
  </div>
);

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
export const ProfilePage = ({ currentUser, onLogout, onNavigate }) => (
  <div style={pageStyle}>
    <PageHeader title="Profile" subtitle={formatName(currentUser.name)} />
    <div style={bodyStyle}>
      {/* Player card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: '20px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            {currentUser.name[0]}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{currentUser.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Badge
                label={currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'committee' ? 'Committee' : 'Member'}
                color={currentUser.role === 'admin' ? '#fbbf24' : BRAND.light}
              />
              <Badge
                label={currentUser.status}
                color={currentUser.status === 'Active' ? BRAND.light : '#f87171'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      {[
        { icon: '🔑', label: 'Change PIN', sub: 'Update your 4-digit PIN', action: () => {} },
        { icon: '📊', label: 'My Stats', sub: 'Season performance & history', action: () => onNavigate('history') },
        { icon: '🎴', label: 'Season Recap', sub: 'View and share your season', action: () => window.open('/recap', '_blank') },
        { icon: '🔔', label: 'Notifications', sub: 'Coming soon', action: () => {} },
      ].map(({ icon, label, sub, action }) => (
        <button key={label} onClick={action} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '14px 16px',
          cursor: 'pointer', marginBottom: 8, textAlign: 'left',
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{sub}</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
        </button>
      ))}

      {/* Club section */}
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        {[
          { icon: '📢', label: 'Club News', sub: 'Announcements & updates', action: () => {} },
          { icon: '💡', label: 'Make a Suggestion', sub: 'Send feedback to the committee', action: () => {} },
          { icon: '👥', label: 'Invite a Member', sub: 'Share the app with new players', action: () => {} },
        ].map(({ icon, label, sub, action }) => (
          <button key={label} onClick={action} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '14px 16px',
            cursor: 'pointer', marginBottom: 8, textAlign: 'left',
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{sub}</div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>

      {/* Sign out */}
      <button onClick={onLogout} style={{
        width: '100%', padding: '13px',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: 14, color: '#f87171',
        fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
        cursor: 'pointer', marginTop: 8,
      }}>
        Sign Out
      </button>
    </div>
    <GlobalStyles />
  </div>
);

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  fontFamily: "'DM Sans', sans-serif",
  color: 'white',
  paddingBottom: 90,
};

const bodyStyle = {
  maxWidth: 520, margin: '0 auto', padding: '24px 20px 0',
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
  `}</style>
);
