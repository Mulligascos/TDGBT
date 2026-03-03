import React from 'react';
import { BRAND, formatName, formatDate, formatTime } from '../utils';
import { Badge, EmptyState, SectionLabel } from '../components/ui';

export const HomePage = ({ currentUser, matches, tournaments, activeTournament, onNavigate, isAdmin }) => {
  const myMatches = matches.filter(m =>
    m.player1?.id === currentUser.id || m.player2?.id === currentUser.id
  );

  const nextMatch = myMatches
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0];

  const recentResults = myMatches
    .filter(m => m.status === 'complete')
    .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
    .slice(0, 3);

  const formatVs = (match) => {
    const opp = match.player1?.id === currentUser.id ? match.player2 : match.player1;
    return opp?.name ? formatName(opp.name) : 'TBD';
  };

  const didWin = (match) => match.winner_id === currentUser.id;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
      fontFamily: "'DM Sans', sans-serif",
      color: 'white',
      paddingBottom: 90,
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${BRAND.primary}cc, ${BRAND.accent}aa)`,
        padding: '52px 20px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 4 }}>
            Welcome back
          </p>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 28, fontWeight: 800,
            color: 'white', margin: 0, letterSpacing: -0.5,
          }}>
            {formatName(currentUser.name)} 👋
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Badge
              label={currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'committee' ? 'Committee' : 'Member'}
              color={currentUser.role === 'admin' ? '#fbbf24' : BRAND.light}
            />
            <Badge label={currentUser.status} color={currentUser.status === 'Active' ? BRAND.light : '#f87171'} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Active tournament banner */}
        {activeTournament && (
          <div style={{
            background: `linear-gradient(135deg, ${BRAND.primary}40, ${BRAND.accent}20)`,
            border: `1px solid ${BRAND.light}30`,
            borderRadius: 16, padding: '14px 18px',
            marginBottom: 24, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                Active Tournament
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
                {activeTournament.name}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {formatDate(activeTournament.start_date)} – {formatDate(activeTournament.end_date)}
              </div>
            </div>
            <button onClick={() => onNavigate('matches')} style={{
              background: BRAND.light, color: BRAND.primary,
              border: 'none', borderRadius: 10, padding: '8px 14px',
              fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              View →
            </button>
          </div>
        )}

        {/* Next match */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Your Next Match</SectionLabel>
          {nextMatch ? (
            <div
              onClick={() => onNavigate('matches')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '16px 18px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 6 }}>
                    vs {formatVs(nextMatch)}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                    📅 {formatDate(nextMatch.scheduled_date)}
                    {nextMatch.scheduled_time && ` · ⏰ ${formatTime(nextMatch.scheduled_time)}`}
                  </div>
                  {nextMatch.course && (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                      📍 {nextMatch.course.name}
                    </div>
                  )}
                </div>
                <Badge label="Scheduled" color="#fbbf24" />
              </div>
            </div>
          ) : (
            <EmptyState icon="🥏" title="No upcoming matches" subtitle="Check back after fixtures are scheduled" />
          )}
        </div>

        {/* Recent results */}
        {recentResults.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Recent Results</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentResults.map(match => {
                const won = didWin(match);
                return (
                  <div key={match.id} onClick={() => onNavigate('history')} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${won ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    borderLeft: `3px solid ${won ? BRAND.light : '#f87171'}`,
                    borderRadius: 12, padding: '12px 16px',
                    cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                        vs {formatVs(match)}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        {formatDate(match.scheduled_date)}
                      </div>
                    </div>
                    <Badge
                      label={won ? 'Win' : match.winner_id ? 'Loss' : 'Tie'}
                      color={won ? BRAND.light : match.winner_id ? '#f87171' : '#fbbf24'}
                    />
                  </div>
                );
              })}
            </div>
            <button onClick={() => onNavigate('history')} style={{
              width: '100%', marginTop: 10, padding: '10px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, color: 'rgba(255,255,255,0.4)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              cursor: 'pointer',
            }}>
              View full history →
            </button>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Quick Actions</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: '🥏 Start Match', sub: 'Match play', tab: 'matches' },
              { label: '📋 Scorecard', sub: 'Stroke play', tab: 'matches' },
              { label: '📊 Standings', sub: 'League table', tab: 'history' },
              { label: '⛳ Courses', sub: 'Course info', tab: 'courses' },
            ].map(({ label, sub, tab }) => (
              <button key={label} onClick={() => onNavigate(tab)} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '14px 16px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideDown { from{opacity:0;transform:translate(-50%,-100%)} to{opacity:1;transform:translate(-50%,0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
};
