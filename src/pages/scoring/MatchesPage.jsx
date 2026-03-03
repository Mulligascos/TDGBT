import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, formatDate } from '../../utils';
import { Card, Badge, Button, SectionLabel, EmptyState, PageHeader } from '../../components/ui';
import { StrokePlayScorer } from '../scoring/StrokePlayScorer';
import { AdminPanel } from './AdminPanel';
import { vsParLabel, vsParColor, buildLeaderboard, parsToArray, totalPar } from '../../utils/strokeplay';
import { Trophy, Calendar, Play, ChevronRight, BarChart2, Settings, Lock } from 'lucide-react';

// ─── ROUND CARD ───────────────────────────────────────────────────────────────
const RoundCard = ({ round, index, course, myScore, onStart }) => {
  const statusColors = { upcoming: '#fbbf24', active: '#4ade80', complete: 'rgba(255,255,255,0.3)' };
  const status = round.status || 'upcoming';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
            Round {index + 1}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            {formatDate(round.scheduled_date)} · {course?.name || '—'} · {round.total_holes} holes
          </div>
        </div>
        <Badge label={status} color={statusColors[status]} />
      </div>

      {myScore ? (
        <div style={{
          background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Your score</span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{myScore.total_strokes} strokes</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: vsParColor(myScore.vs_par), fontFamily: "'Syne', sans-serif" }}>
              {vsParLabel(myScore.vs_par)}
            </span>
          </div>
        </div>
      ) : status !== 'complete' ? (
        <button onClick={() => onStart(round)} style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: status === 'active'
            ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`
            : 'rgba(255,255,255,0.06)',
          border: status === 'active'
            ? '1px solid rgba(74,222,128,0.3)'
            : '1px solid rgba(255,255,255,0.1)',
          color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Play size={15} fill="currentColor" />
          {status === 'active' ? 'Score This Round' : 'Start Early'}
        </button>
      ) : (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '4px 0' }}>
          No score recorded for you this round
        </div>
      )}
    </div>
  );
};

// ─── LEADERBOARD TABLE ────────────────────────────────────────────────────────
const LeaderboardTable = ({ entries, countRounds, totalRounds }) => {
  if (entries.length === 0) {
    return <EmptyState icon="📊" title="No scores yet" subtitle="Scores will appear here once rounds are submitted" />;
  }

  return (
    <div>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '28px 1fr 48px 48px 52px',
          gap: 4, padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {['#', 'Player', 'Rnds', 'Stk', '+/-'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Player' ? 'left' : 'center' }}>
              {h}
            </div>
          ))}
        </div>

        {entries.map((entry, i) => {
          const isTop3 = i < 3;
          const posColors = ['#fbbf24', 'rgba(255,255,255,0.5)', '#cd7f32'];
          return (
            <div key={entry.playerId} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 48px 48px 52px',
              gap: 4, padding: '12px 14px', alignItems: 'center',
              borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: i === 0 ? 'rgba(251,191,36,0.04)' : 'transparent',
            }}>
              <div style={{
                fontSize: 13, fontWeight: 800,
                color: isTop3 ? posColors[i] : 'rgba(255,255,255,0.25)',
                fontFamily: "'Syne', sans-serif",
              }}>{i + 1}</div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                  {formatName(entry.player?.name || 'Unknown')}
                </div>
                {entry.roundsCounted < entry.roundsPlayed && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                    best {entry.roundsCounted} of {entry.roundsPlayed}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                {entry.roundsPlayed}/{totalRounds}
              </div>

              <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                {entry.totalStrokes}
              </div>

              <div style={{
                textAlign: 'center', fontSize: 15, fontWeight: 800,
                color: vsParColor(entry.totalVsPar),
                fontFamily: "'Syne', sans-serif",
              }}>
                {vsParLabel(entry.totalVsPar)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 10 }}>
        Best {countRounds} rounds counted · Handicap applied for Juniors
      </div>
    </div>
  );
};

// ─── ROUND RESULTS ────────────────────────────────────────────────────────────
const RoundResults = ({ round, roundScores, players, course, onBack }) => {
  const pars = course ? parsToArray(
    typeof course.pars === 'string' ? JSON.parse(course.pars) : course.pars,
    round.starting_hole, round.total_holes
  ) : [];

  const sorted = [...roundScores].sort((a, b) => a.vs_par - b.vs_par);

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 22 }}>‹</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
            Round Results
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {formatDate(round.scheduled_date)} · {course?.name}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="📋" title="No scores yet" subtitle="Scores will appear here once submitted" />
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px', gap: 4, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {['#', 'Player', 'Strokes', '+/-'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Player' ? 'left' : 'center' }}>
                {h}
              </div>
            ))}
          </div>
          {sorted.map((rs, i) => {
            const player = players.find(p => p.id === rs.player_id);
            return (
              <div key={rs.id || rs.player_id} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px',
                gap: 4, padding: '12px 14px', alignItems: 'center',
                borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: i === 0 ? 'rgba(251,191,36,0.04)' : 'transparent',
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? ['#fbbf24','rgba(255,255,255,0.5)','#cd7f32'][i] : 'rgba(255,255,255,0.25)', fontFamily: "'Syne', sans-serif" }}>{i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{formatName(player?.name || 'Unknown')}</div>
                <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{rs.total_strokes}</div>
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: vsParColor(rs.vs_par), fontFamily: "'Syne', sans-serif" }}>
                  {vsParLabel(rs.vs_par)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── MAIN MATCHES PAGE ────────────────────────────────────────────────────────
export const MatchesPage = ({ currentUser, isAdmin, courses, tournaments, players, onDataChanged }) => {
  const [activeTab, setActiveTab] = useState('rounds');  // rounds | leaderboard | admin
  const [rounds, setRounds] = useState([]);
  const [roundScores, setRoundScores] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoringRound, setScoringRound] = useState(null);
  const [viewingRound, setViewingRound] = useState(null);
  const [localTournaments, setLocalTournaments] = useState(tournaments);

  useEffect(() => { setLocalTournaments(tournaments); }, [tournaments]);

  // Find active or most recent tournament
  useEffect(() => {
    const active = localTournaments.find(t => t.status === 'active');
    const upcoming = localTournaments.find(t => t.status === 'upcoming');
    setActiveTournament(active || upcoming || localTournaments[0] || null);
  }, [localTournaments]);

  // Load rounds and scores for active tournament
  const loadData = useCallback(async () => {
    if (!activeTournament) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: roundsData }, { data: scoresData }] = await Promise.all([
        supabase.from('rounds')
          .select('*')
          .eq('tournament_id', activeTournament.id)
          .order('scheduled_date'),
        supabase.from('round_scores')
          .select('*')
          .in('round_id',
            // will be filtered after rounds load
            rounds.length > 0 ? rounds.map(r => r.id) : ['00000000-0000-0000-0000-000000000000']
          ),
      ]);
      if (roundsData) {
        setRounds(roundsData);
        // Load scores for these rounds
        if (roundsData.length > 0) {
          const { data: scores } = await supabase.from('round_scores')
            .select('*')
            .in('round_id', roundsData.map(r => r.id));
          setRoundScores(scores || []);
        }
      }
    } catch (err) {
      console.error('Error loading rounds:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleScoringComplete = () => {
    setScoringRound(null);
    loadData();
    onDataChanged?.();
  };

  const handleDataChanged = () => {
    loadData();
    onDataChanged?.();
  };

  // Leaderboard data
  const countRounds = activeTournament?.count_rounds || 6;
  const leaderboard = buildLeaderboard(roundScores, players, countRounds);

  // If scoring
  if (scoringRound) {
    const course = courses.find(c => c.id === scoringRound.course_id);
    return (
      <StrokePlayScorer
        round={scoringRound}
        course={course}
        allPlayers={players}
        currentUser={currentUser}
        onComplete={handleScoringComplete}
        onBack={() => setScoringRound(null)}
      />
    );
  }

  // If viewing round results
  if (viewingRound) {
    const course = courses.find(c => c.id === viewingRound.course_id);
    const scores = roundScores.filter(s => s.round_id === viewingRound.id);
    return (
      <div style={pageStyle}>
        <RoundResults
          round={viewingRound} roundScores={scores}
          players={players} course={course}
          onBack={() => setViewingRound(null)}
        />
      </div>
    );
  }

  // Admin view
  if (activeTab === 'admin' && isAdmin) {
    return (
      <div style={pageStyle}>
        <div style={{ paddingTop: 50 }}>
          <AdminPanel
            currentUser={currentUser}
            tournaments={localTournaments}
            rounds={rounds}
            courses={courses}
            players={players}
            onDataChanged={handleDataChanged}
          />
        </div>
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />
        <GlobalStyles />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${BRAND.primary}dd, #071407)`,
        padding: '52px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            🥏 Matches
          </div>
          {activeTournament ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
                {activeTournament.name}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <Badge
                  label={activeTournament.status}
                  color={activeTournament.status === 'active' ? '#4ade80' : '#fbbf24'}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {activeTournament.format} · {rounds.length} rounds
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
              No active tournament
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.3)',
        maxWidth: 520, margin: '0 auto',
        overflowX: 'auto',
      }}>
        {[
          { id: 'rounds', label: 'Rounds', icon: <Calendar size={14} /> },
          { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> },
          ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <Settings size={14} /> }] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '13px 8px',
            background: 'none', border: 'none',
            borderBottom: activeTab === tab.id
              ? `2px solid ${BRAND.light}` : '2px solid transparent',
            color: activeTab === tab.id ? BRAND.light : 'rgba(255,255,255,0.35)',
            fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            whiteSpace: 'nowrap',
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px 0' }}>

        {/* ROUNDS TAB */}
        {activeTab === 'rounds' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>Loading rounds...</div>
            ) : !activeTournament ? (
              <EmptyState
                icon="🏆"
                title="No tournament found"
                subtitle={isAdmin ? "Create a tournament in the Admin panel" : "Check back soon for the next season"}
              />
            ) : rounds.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No rounds scheduled"
                subtitle={isAdmin ? "Add rounds in the Admin panel" : "Rounds will appear here when scheduled"}
              />
            ) : (
              rounds.map((round, i) => {
                const course = courses.find(c => c.id === round.course_id);
                const myScore = roundScores.find(s => s.round_id === round.id && s.player_id === currentUser.id);
                return (
                  <div key={round.id}>
                    <RoundCard
                      round={round} index={i} course={course} myScore={myScore}
                      onStart={() => setScoringRound(round)}
                    />
                    {round.status === 'complete' && (
                      <button
                        onClick={() => setViewingRound(round)}
                        style={{
                          width: '100%', marginTop: -4, marginBottom: 14,
                          padding: '8px', borderRadius: '0 0 12px 12px',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                          borderTop: 'none', color: 'rgba(255,255,255,0.3)',
                          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}
                      >
                        View results <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <SectionLabel>Season Standings</SectionLabel>
              {activeTournament && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  Best {countRounds} of {rounds.length} rounds
                </span>
              )}
            </div>
            <LeaderboardTable
              entries={leaderboard}
              countRounds={countRounds}
              totalRounds={rounds.length}
            />
          </>
        )}
      </div>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />
      <GlobalStyles />
    </div>
  );
};

// ─── TAB BAR (internal sub-nav, not bottom nav) ───────────────────────────────
// This is only used as a placeholder — the real bottom nav is in App.jsx
const TabBar = () => null;

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  fontFamily: "'DM Sans', sans-serif", color: 'white', paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    button:active { transform: scale(0.97); }
    ::-webkit-scrollbar { display: none; }
  `}</style>
);
