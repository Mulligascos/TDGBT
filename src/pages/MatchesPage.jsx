import React from 'react';
import { BRAND, formatName, formatDate, formatTime } from '../utils';
import { PageHeader, Badge, EmptyState, SectionLabel } from '../components/ui';

export const MatchesPage = ({ currentUser, matches, activeTournament, courses, onNavigate }) => {
  const myMatches = matches.filter(m =>
    m.player1?.id === currentUser.id || m.player2?.id === currentUser.id
  );

  const upcoming = myMatches
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const inProgress = myMatches.filter(m => m.status === 'in-progress');

  const getOpponent = (match) =>
    match.player1?.id === currentUser.id ? match.player2 : match.player1;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
      fontFamily: "'DM Sans', sans-serif",
      color: 'white', paddingBottom: 90,
    }}>
      <PageHeader
        title="Matches"
        subtitle={activeTournament ? activeTournament.name : 'Match play & stroke play'}
      />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Start scoring buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          <button style={{
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            border: `1px solid rgba(74,222,128,0.3)`,
            borderRadius: 16, padding: '16px 14px',
            color: 'white', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🥏</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700 }}>Match Play</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>1v1 · Hole by hole</div>
          </button>
          <button style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: '16px 14px',
            color: 'white', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>📋</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700 }}>Stroke Play</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Any players · vs par</div>
          </button>
        </div>

        {/* In progress */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>In Progress</SectionLabel>
            {inProgress.map(match => {
              const opp = getOpponent(match);
              return (
                <div key={match.id} style={{
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.25)',
                  borderRadius: 14, padding: '14px 18px',
                  marginBottom: 8, cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
                      vs {opp ? formatName(opp.name) : 'Unknown'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                      {match.course?.name || 'Unknown course'}
                    </div>
                  </div>
                  <div style={{
                    background: BRAND.light, color: BRAND.primary,
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 11, fontWeight: 700,
                  }}>Resume →</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming fixtures */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Your Fixtures</SectionLabel>
          {upcoming.length === 0 ? (
            <EmptyState icon="📅" title="No upcoming fixtures" subtitle="Fixtures will appear here once scheduled" />
          ) : (
            upcoming.map(match => {
              const opp = getOpponent(match);
              return (
                <div key={match.id} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '14px 18px',
                  marginBottom: 8, cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                        vs {opp ? formatName(opp.name) : 'TBD'}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        📅 {formatDate(match.scheduled_date)}
                        {match.scheduled_time && ` · ⏰ ${formatTime(match.scheduled_time)}`}
                      </div>
                      {match.course && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          📍 {match.course.name}
                        </div>
                      )}
                    </div>
                    <Badge label="Scheduled" color="#fbbf24" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Coming soon notice */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '14px 18px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Full scoring experience coming in Session 3
          </p>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
};
