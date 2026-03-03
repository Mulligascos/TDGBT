import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, formatDate } from '../../utils';
import { Card, Badge, Button, SectionLabel, EmptyState, PageHeader } from '../../components/ui';
import { StrokePlayScorer } from '../scoring/StrokePlayScorer';
import { AdminPanel } from './AdminPanel';
import { vsParLabel, vsParColor, buildLeaderboard, parsToArray, totalPar } from '../../utils/strokeplay';
import { Trophy, Calendar, Play, ChevronRight, Settings, ChevronLeft, AlertCircle } from 'lucide-react';

// ─── ROUND CARD ───────────────────────────────────────────────────────────────
const RoundCard = ({ round, index, course, myScore, isAdmin, onStart, onStatusChange }) => {
  const statusColors = { upcoming: '#fbbf24', active: '#4ade80', complete: 'rgba(255,255,255,0.3)' };
  const status = round.status || 'upcoming';
  const [changingStatus, setChangingStatus] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setChangingStatus(true);
    await onStatusChange(round.id, newStatus);
    setChangingStatus(false);
  };

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

      {isAdmin && status !== 'complete' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {status === 'upcoming' && (
            <button
              onClick={() => handleStatusChange('active')}
              disabled={changingStatus}
              style={{
                flex: 1, padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                color: '#4ade80', cursor: 'pointer', fontFamily: "'Syne', sans-serif",
              }}
            >▶ Open Round</button>
          )}
          {status === 'active' && (
            <button
              onClick={() => handleStatusChange('complete')}
              disabled={changingStatus}
              style={{
                flex: 1, padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                color: '#fbbf24', cursor: 'pointer', fontFamily: "'Syne', sans-serif",
              }}
            >✓ Close Round</button>
          )}
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
          const posColors = ['#fbbf24', 'rgba(255,255,255,0.5)', '#cd7f32'];
          return (
            <div key={entry.playerId} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 48px 48px 52px',
              gap: 4, padding: '12px 14px', alignItems: 'center',
              borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: i === 0 ? 'rgba(251,191,36,0.04)' : 'transparent',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? posColors[i] : 'rgba(255,255,255,0.25)', fontFamily: "'Syne', sans-serif" }}>{i + 1}</div>
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
              <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{entry.roundsPlayed}/{totalRounds}</div>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{entry.totalStrokes}</div>
              <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: vsParColor(entry.totalVsPar), fontFamily: "'Syne', sans-serif" }}>
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
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>Round Results</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{formatDate(round.scheduled_date)} · {course?.name}</div>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon="📋" title="No scores yet" subtitle="Scores will appear here once submitted" />
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px', gap: 4, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {['#', 'Player', 'Strokes', '+/-'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Player' ? 'left' : 'center' }}>{h}</div>
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
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: vsParColor(rs.vs_par), fontFamily: "'Syne', sans-serif" }}>{vsParLabel(rs.vs_par)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── CASUAL ROUND PICKER ──────────────────────────────────────────────────────
const CasualRoundPicker = ({ courses, onStart, onBack }) => {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [totalHoles, setTotalHoles] = useState(18);
  const [startingHole, setStartingHole] = useState(1);
  const selectedCourse = courses.find(c => c.id === courseId);

  const handleStart = () => {
    if (!selectedCourse) return;
    const casualRound = {
      id: `casual-${Date.now()}`,
      course_id: courseId,
      scheduled_date: new Date().toISOString(),
      total_holes: totalHoles,
      starting_hole: startingHole,
      status: 'active',
      tournament_id: null,
    };
    onStart(casualRound, selectedCourse);
  };

  const selectStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' };

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>Casual Round</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Score outside a tournament</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Course</label>
        <select value={courseId} onChange={e => setCourseId(e.target.value)} style={selectStyle}>
          {courses.map(c => <option key={c.id} value={c.id} style={{ background: '#0d2b0d' }}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Holes</label>
          <select value={totalHoles} onChange={e => setTotalHoles(parseInt(e.target.value))} style={selectStyle}>
            <option value={9} style={{ background: '#0d2b0d' }}>9 holes</option>
            <option value={18} style={{ background: '#0d2b0d' }}>18 holes</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Start Hole</label>
          <select value={startingHole} onChange={e => setStartingHole(parseInt(e.target.value))} style={selectStyle}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} style={{ background: '#0d2b0d' }}>Hole {n}</option>)}
          </select>
        </div>
      </div>

      {courses.length === 0 && (
        <div style={{
          background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: '#fbbf24' }}>No courses yet. Ask an admin to add courses first.</span>
        </div>
      )}

      <button onClick={handleStart} disabled={!selectedCourse} style={{
        width: '100%', padding: '15px', borderRadius: 14,
        background: selectedCourse ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'rgba(255,255,255,0.06)',
        border: selectedCourse ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
        color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
        cursor: selectedCourse ? 'pointer' : 'not-allowed',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Play size={16} fill="currentColor" /> Start Scorecard
      </button>
    </div>
  );
};

// ─── MAIN MATCHES PAGE ────────────────────────────────────────────────────────
export const MatchesPage = ({ currentUser, isAdmin, courses, tournaments, players, onDataChanged }) => {
  const [activeTab, setActiveTab] = useState('rounds');
  const [rounds, setRounds] = useState([]);
  const [roundScores, setRoundScores] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoringRound, setScoringRound] = useState(null);
  const [scoringCourse, setScoringCourse] = useState(null);
  const [viewingRound, setViewingRound] = useState(null);
  const [showCasualPicker, setShowCasualPicker] = useState(false);
  const [localTournaments, setLocalTournaments] = useState(tournaments || []);

  useEffect(() => { setLocalTournaments(tournaments || []); }, [tournaments]);

  useEffect(() => {
    const active = localTournaments.find(t => t.status === 'active');
    const upcoming = localTournaments.find(t => t.status === 'upcoming');
    setActiveTournament(active || upcoming || localTournaments[0] || null);
  }, [localTournaments]);

  const loadData = useCallback(async () => {
    if (!activeTournament) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('*')
        .eq('tournament_id', activeTournament.id)
        .order('scheduled_date');

      if (roundsData && roundsData.length > 0) {
        setRounds(roundsData);
        const { data: scores } = await supabase
          .from('round_scores')
          .select('*')
          .in('round_id', roundsData.map(r => r.id));
        setRoundScores(scores || []);
      } else {
        setRounds([]);
        setRoundScores([]);
      }
    } catch (err) {
      console.error('Error loading rounds:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRoundStatusChange = async (roundId, newStatus) => {
    const { error } = await supabase.from('rounds').update({ status: newStatus }).eq('id', roundId);
    if (!error) setRounds(prev => prev.map(r => r.id === roundId ? { ...r, status: newStatus } : r));
  };

  const handleScoringComplete = () => {
    setScoringRound(null);
    setScoringCourse(null);
    loadData();
    onDataChanged?.();
  };

  const handleStartRound = (round) => {
    const course = courses.find(c => c.id === round.course_id);
    setScoringCourse(course);
    setScoringRound(round);
  };

  const handleStartCasual = (round, course) => {
    setShowCasualPicker(false);
    setScoringCourse(course);
    setScoringRound(round);
  };

  const countRounds = activeTournament?.count_rounds || 6;
  const leaderboard = buildLeaderboard(roundScores, players || [], countRounds);

  // Scoring view
  if (scoringRound && scoringCourse) {
    return (
      <div style={pageStyle}>
        <StrokePlayScorer
          round={scoringRound}
          course={scoringCourse}
          allPlayers={players || []}
          currentUser={currentUser}
          onComplete={handleScoringComplete}
          onBack={() => { setScoringRound(null); setScoringCourse(null); }}
        />
        <GlobalStyles />
      </div>
    );
  }

  // Casual round picker
  if (showCasualPicker) {
    return (
      <div style={pageStyle}>
        <div style={{ paddingTop: 52 }}>
          <CasualRoundPicker
            courses={courses}
            onStart={handleStartCasual}
            onBack={() => setShowCasualPicker(false)}
          />
        </div>
        <GlobalStyles />
      </div>
    );
  }

  // Round results
  if (viewingRound) {
    const course = courses.find(c => c.id === viewingRound.course_id);
    const scores = roundScores.filter(s => s.round_id === viewingRound.id);
    return (
      <div style={pageStyle}>
        <div style={{ paddingTop: 52 }}>
          <RoundResults
            round={viewingRound} roundScores={scores}
            players={players || []} course={course}
            onBack={() => setViewingRound(null)}
          />
        </div>
        <GlobalStyles />
      </div>
    );
  }

  // Admin panel
  if (activeTab === 'admin' && isAdmin) {
    return (
      <div style={pageStyle}>
        <div style={{ paddingTop: 50 }}>
          <AdminPanel
            currentUser={currentUser}
            tournaments={localTournaments}
            rounds={rounds}
            courses={courses}
            players={players || []}
            onDataChanged={() => { loadData(); onDataChanged?.(); }}
          />
        </div>
        <SubTabBar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />
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
                <Badge label={activeTournament.status} color={activeTournament.status === 'active' ? '#4ade80' : '#fbbf24'} />
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

          <button onClick={() => setShowCasualPicker(true)} style={{
            marginTop: 14, padding: '9px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Play size={13} /> Score a casual round
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <SubTabBar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />

      {/* Content */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px 0' }}>
        {activeTab === 'rounds' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>Loading rounds...</div>
            ) : !activeTournament ? (
              <EmptyState icon="🏆" title="No tournament found" subtitle={isAdmin ? "Create a tournament in the Admin panel" : "Check back soon for the next season"} />
            ) : rounds.length === 0 ? (
              <EmptyState icon="📅" title="No rounds scheduled" subtitle={isAdmin ? "Add rounds in the Admin panel" : "Rounds will appear here when scheduled"} />
            ) : (
              rounds.map((round, i) => {
                const course = courses.find(c => c.id === round.course_id);
                const myScore = roundScores.find(s => s.round_id === round.id && s.player_id === currentUser.id);
                return (
                  <div key={round.id}>
                    <RoundCard
                      round={round} index={i} course={course} myScore={myScore}
                      isAdmin={isAdmin}
                      onStart={handleStartRound}
                      onStatusChange={handleRoundStatusChange}
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
            <LeaderboardTable entries={leaderboard} countRounds={countRounds} totalRounds={rounds.length} />
          </>
        )}
      </div>

      <GlobalStyles />
    </div>
  );
};

// ─── SUB-TAB BAR ─────────────────────────────────────────────────────────────
const SubTabBar = ({ activeTab, setActiveTab, isAdmin }) => (
  <div style={{
    display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.3)', maxWidth: 520, margin: '0 auto', overflowX: 'auto',
  }}>
    {[
      { id: 'rounds', label: 'Rounds', icon: <Calendar size={14} /> },
      { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> },
      ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <Settings size={14} /> }] : []),
    ].map(tab => (
      <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
        flex: 1, padding: '13px 8px', background: 'none', border: 'none',
        borderBottom: activeTab === tab.id ? `2px solid ${BRAND.light}` : '2px solid transparent',
        color: activeTab === tab.id ? BRAND.light : 'rgba(255,255,255,0.35)',
        fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        whiteSpace: 'nowrap',
      }}>
        {tab.icon} {tab.label}
      </button>
    ))}
  </div>
);

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  fontFamily: "'DM Sans', sans-serif", color: 'white', paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }
    button { font-family: 'DM Sans', sans-serif; }
    button:active { transform: scale(0.97); }
    ::-webkit-scrollbar { display: none; }
  `}</style>
);
