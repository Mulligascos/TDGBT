import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, formatDate } from '../../utils';
import { Card, Badge, Button, SectionLabel, EmptyState, PageHeader, LogoWatermark } from '../../components/ui';
import { StrokePlayScorer, listDrafts, clearDraft } from '../scoring/StrokePlayScorer';
import { MatchPlayScorer, listMPDrafts, clearMPDraft } from '../scoring/MatchPlayScorer';
import { AdminPanel } from './AdminPanel';
import { vsParLabel, vsParColor, buildLeaderboard, parsToArray, totalPar } from '../../utils/strokeplay';
import { Trophy, Calendar, Play, ChevronRight, Settings, ChevronLeft, AlertCircle } from 'lucide-react';

// ─── ROUND CARD ───────────────────────────────────────────────────────────────
const RoundCard = ({ round, index, course, myScore, isAdmin, onStart, onStatusChange }) => {
  const statusColors = { upcoming: '#fbbf24', active: '#4ade80', complete: 'var(--text-muted)' };
  const status = round.status || 'upcoming';
  const [changingStatus, setChangingStatus] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setChangingStatus(true);
    await onStatusChange(round.id, newStatus);
    setChangingStatus(false);
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
            Round {index + 1}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
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
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Your score</span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{myScore.total_strokes} strokes</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: vsParColor(myScore.vs_par), fontFamily: "'Syne', sans-serif" }}>
              {vsParLabel(myScore.vs_par)}
            </span>
          </div>
        </div>
      ) : status === 'active' ? (
        <button onClick={() => onStart(round)} style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
          border: '1px solid rgba(74,222,128,0.3)',
          color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Play size={15} fill="currentColor" /> Score This Round
        </button>
      ) : status === 'complete' ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
          No score recorded for you this round
        </div>
      ) : null /* upcoming — admin controls below handle opening */}

      {isAdmin && status !== 'complete' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {status === 'upcoming' && (
            <button
              onClick={() => handleStatusChange('active')}
              disabled={changingStatus}
              style={{
                flex: 1, padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: BRAND.primary, border: '1px solid rgba(74,222,128,0.3)',
                color: '#ffffff', cursor: 'pointer', fontFamily: "'Syne', sans-serif",
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
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '28px 1fr 48px 48px 52px',
          gap: 4, padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
        }}>
          {['#', 'Player', 'Rnds', 'Stk', '+/-'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Player' ? 'left' : 'center' }}>
              {h}
            </div>
          ))}
        </div>
        {entries.map((entry, i) => {
          const posColors = ['#fbbf24', 'var(--text-secondary)', '#cd7f32'];
          return (
            <div key={entry.playerId} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 48px 48px 52px',
              gap: 4, padding: '12px 14px', alignItems: 'center',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
              background: i === 0 ? 'rgba(251,191,36,0.04)' : 'transparent',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? posColors[i] : 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatName(entry.player?.name || 'Unknown')}
                </div>
                {entry.roundsCounted < entry.roundsPlayed && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                    best {entry.roundsCounted} of {entry.roundsPlayed}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>{entry.roundsPlayed}/{totalRounds}</div>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>{entry.totalStrokes}</div>
              <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: vsParColor(entry.totalVsPar), fontFamily: "'Syne', sans-serif" }}>
                {vsParLabel(entry.totalVsPar)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
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
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 22 }}>‹</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>Round Results</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(round.scheduled_date)} · {course?.name}</div>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon="📋" title="No scores yet" subtitle="Scores will appear here once submitted" />
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px', gap: 4, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            {['#', 'Player', 'Strokes', '+/-'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Player' ? 'left' : 'center' }}>{h}</div>
            ))}
          </div>
          {sorted.map((rs, i) => {
            const player = players.find(p => p.id === rs.player_id);
            return (
              <div key={rs.id || rs.player_id} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px',
                gap: 4, padding: '12px 14px', alignItems: 'center',
                borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                background: i === 0 ? 'rgba(251,191,36,0.04)' : 'transparent',
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? ['#fbbf24','var(--text-secondary)','#cd7f32'][i] : 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>{i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatName(player?.name || 'Unknown')}</div>
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>{rs.total_strokes}</div>
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
  const [scoringFormat, setScoringFormat] = useState('strokeplay');
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
      scoring_format: scoringFormat,
    };
    onStart(casualRound, selectedCourse, scoringFormat);
  };

  const selectStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    background: 'var(--bg-input)', border: '1px solid var(--border-card)',
    color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' };

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>Casual Round</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Score outside a tournament</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Course</label>
        <select value={courseId} onChange={e => setCourseId(e.target.value)} style={selectStyle}>
          {courses.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--bg-nav)' }}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Holes</label>
          <select value={totalHoles} onChange={e => setTotalHoles(parseInt(e.target.value))} style={selectStyle}>
            <option value={9} style={{ background: 'var(--bg-nav)' }}>9 holes</option>
            <option value={18} style={{ background: 'var(--bg-nav)' }}>18 holes</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Start Hole</label>
          <select value={startingHole} onChange={e => setStartingHole(parseInt(e.target.value))} style={selectStyle}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} style={{ background: 'var(--bg-nav)' }}>Hole {n}</option>)}
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

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Scoring Format</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['strokeplay', '📊 Stroke Play'], ['matchplay', '⚔️ Match Play']].map(([fmt, label]) => (
            <button key={fmt} onClick={() => setScoringFormat(fmt)} style={{
              flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
              background: scoringFormat === fmt ? (fmt === 'matchplay' ? 'rgba(248,113,113,0.12)' : `rgba(74,222,128,0.12)`) : 'var(--text-muted)',
              border: `1px solid ${scoringFormat === fmt ? (fmt === 'matchplay' ? 'rgba(248,113,113,0.35)' : 'rgba(74,222,128,0.35)') : 'var(--text-muted)'}`,
              color: scoringFormat === fmt ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleStart} disabled={!selectedCourse} style={{
        width: '100%', padding: '15px', borderRadius: 14,
        background: selectedCourse ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'var(--text-muted)',
        border: selectedCourse ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
        color: selectedCourse ? '#ffffff' : 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
        cursor: selectedCourse ? 'pointer' : 'not-allowed',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Play size={16} fill="currentColor" /> {scoringFormat === 'matchplay' ? 'Start Match' : 'Start Scorecard'}
      </button>
    </div>
  );
};


// ─── LIVE LEADERBOARD ─────────────────────────────────────────────────────────
const LiveLeaderboard = ({ rounds, courses, players, currentUser }) => {
  const [liveData, setLiveData] = useState({}); // roundId → { scores, lastUpdated }
  const [expanded, setExpanded] = useState(null);
  const [batterySave, setBatterySave] = useState(false);
  const intervalRef = useRef(null);

  const activeRounds = rounds.filter(r => r.status === 'active');

  const fetchLiveScores = useCallback(async () => {
    if (activeRounds.length === 0) return;
    const ids = activeRounds.map(r => r.id);
    const { data } = await supabase
      .from('round_scores')
      .select('round_id, player_id, scores, total_strokes, vs_par, submitted_at')
      .in('round_id', ids);
    if (!data) return;

    const grouped = {};
    ids.forEach(id => { grouped[id] = []; });
    data.forEach(s => { if (grouped[s.round_id]) grouped[s.round_id].push(s); });
    setLiveData(prev => {
      const next = { ...prev };
      ids.forEach(id => { next[id] = { scores: grouped[id], lastUpdated: new Date() }; });
      return next;
    });
  }, [activeRounds.map(r => r.id).join(',')]);

  useEffect(() => {
    fetchLiveScores();
    if (!batterySave) {
      intervalRef.current = setInterval(fetchLiveScores, 60000);
    }
    return () => clearInterval(intervalRef.current);
  }, [fetchLiveScores, batterySave]);

  if (activeRounds.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px 20px', textAlign: 'center', marginTop: 8,
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🏌️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>No active rounds</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Live scores appear here when a round is opened</div>
      </div>
    );
  }

  return (
    <div>
      {activeRounds.map(round => {
        const course = courses.find(c => c.id === round.course_id);
        const pars = course ? parsToArray(
          typeof course.pars === 'string' ? JSON.parse(course.pars) : (course.pars || {}),
          round.starting_hole || 1, round.total_holes || 18
        ) : Array(round.total_holes || 18).fill(3);
        const totalParVal = totalPar(pars);
        const roundScores = liveData[round.id]?.scores || [];
        const lastUpdated = liveData[round.id]?.lastUpdated;

        // Build live standings — include players with scores AND players who haven't started
        const scoredPlayerIds = new Set(roundScores.map(s => s.player_id));
        const entries = roundScores.map(s => {
          const player = players.find(p => p.id === s.player_id);
          const holes = Array.isArray(s.scores) ? s.scores : (s.scores ? JSON.parse(s.scores) : []);
          const playedHoles = holes.filter(h => h != null && h > 0);
          const holesThru = playedHoles.length;
          const submitted = !!s.submitted_at && holesThru >= pars.length;

          // Live vs par from actual hole scores
          let liveVsPar = 0;
          playedHoles.forEach((strokes, i) => { liveVsPar += strokes - (pars[i] ?? 3); });

          return {
            player, playerId: s.player_id,
            holesThru, submitted, liveVsPar,
            totalStrokes: playedHoles.reduce((a, b) => a + b, 0),
            isMe: s.player_id === currentUser.id,
          };
        }).sort((a, b) => {
          // Finished players first by score, then in-progress by holes played
          if (a.submitted && !b.submitted) return -1;
          if (!a.submitted && b.submitted) return 1;
          if (a.liveVsPar !== b.liveVsPar) return a.liveVsPar - b.liveVsPar;
          return b.holesThru - a.holesThru;
        });

        const isExpanded = expanded === round.id;

        return (
          <div key={round.id} style={{ marginBottom: 16 }}>
            {/* Round header */}
            <div style={{
              background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)',
              borderRadius: isExpanded ? '14px 14px 0 0' : 14, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }} onClick={() => setExpanded(isExpanded ? null : round.id)}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                    LIVE · {course?.name || 'Unknown course'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 16 }}>
                  {round.total_holes} holes · Par {totalParVal} · {entries.length} player{entries.length !== 1 ? 's' : ''}
                  {lastUpdated && <span> · updated {Math.round((new Date() - lastUpdated) / 1000)}s ago</span>}
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{isExpanded ? '▲' : '▼'}</span>
            </div>

            {isExpanded && (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid rgba(74,222,128,0.1)',
                borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden',
              }}>
                {/* Column headers */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 52px 48px 56px',
                  gap: 4, padding: '8px 14px',
                  borderBottom: '1px solid var(--border)',
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  {['#', 'Player', 'Thru', 'Stk', '+/-'].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Player' ? 'left' : 'center' }}>{h}</div>
                  ))}
                </div>

                {entries.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    Waiting for scores...
                  </div>
                ) : (
                  entries.map((entry, i) => (
                    <div key={entry.playerId} style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr 52px 48px 56px',
                      gap: 4, padding: '11px 14px', alignItems: 'center',
                      borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                      background: entry.isMe ? 'rgba(74,222,128,0.04)' : 'transparent',
                    }}>
                      {/* Position */}
                      <div style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? ['#fbbf24','var(--text-secondary)','#cd7f32'][i] : 'var(--text-muted)', fontFamily: "'Syne', sans-serif", textAlign: 'center' }}>
                        {i + 1}
                      </div>
                      {/* Name */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: entry.isMe ? 700 : 500, color: entry.isMe ? BRAND.light : 'var(--text-primary)' }}>
                          {formatName(entry.player?.name || 'Unknown')}
                          {entry.isMe && <span style={{ fontSize: 10, color: BRAND.light, marginLeft: 4 }}>you</span>}
                        </div>
                        {entry.submitted && (
                          <div style={{ fontSize: 10, color: '#4ade80', marginTop: 1 }}>✓ Finished</div>
                        )}
                      </div>
                      {/* Thru */}
                      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {entry.submitted ? 'F' : entry.holesThru === 0 ? '-' : entry.holesThru}
                      </div>
                      {/* Strokes */}
                      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {entry.holesThru > 0 ? entry.totalStrokes : '-'}
                      </div>
                      {/* Vs par */}
                      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: entry.holesThru > 0 ? vsParColor(entry.liveVsPar) : 'var(--text-muted)', fontFamily: "Arial, sans-serif" }}>
                        {entry.holesThru > 0 ? vsParLabel(entry.liveVsPar) : '-'}
                      </div>
                    </div>
                  ))
                )}

                {/* Refresh / battery save footer */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={(e) => { e.stopPropagation(); setBatterySave(b => !b); }} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: batterySave ? 'rgba(251,191,36,0.12)' : 'var(--text-muted)',
                    border: batterySave ? '1px solid rgba(251,191,36,0.3)' : '1px solid var(--border)',
                    color: batterySave ? '#fbbf24' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    🔋 {batterySave ? 'Battery save ON' : 'Battery save'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); fetchLiveScores(); }} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                    color: '#4ade80', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    ↻ Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── MAIN MATCHES PAGE ────────────────────────────────────────────────────────
export const MatchesPage = ({ currentUser, isAdmin, courses, tournaments, players, onDataChanged, updateUser, initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'rounds');
  const [rounds, setRounds] = useState([]);
  const [roundScores, setRoundScores] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoringRound, setScoringRound] = useState(null);
  const [scoringCourse, setScoringCourse] = useState(null);
  const [scoringFormat, setScoringFormat] = useState('strokeplay'); // strokeplay | matchplay
  const [savedDraft, setSavedDraft] = useState(() => {
    const spDrafts = listDrafts().map(d => ({ ...d, scoringFormat: 'strokeplay' }));
    const mpDrafts = listMPDrafts().map(d => ({ ...d, scoringFormat: 'matchplay' }));
    const all = [...spDrafts, ...mpDrafts].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    return all.length > 0 ? all[0] : null;
  });
  const [viewingRound, setViewingRound] = useState(null);
  const [showCasualPicker, setShowCasualPicker] = useState(false);
  const [localTournaments, setLocalTournaments] = useState(tournaments || []);

  // Use stable key to avoid re-running when parent re-renders with new array reference
  const tournamentsKey = (tournaments || []).map(t => t.id + t.status).join(',');
  useEffect(() => {
    const visible = (tournaments || []).filter(t => isAdmin || t.status !== 'draft');
    setLocalTournaments(visible);
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tournamentsKey, isAdmin]);

  useEffect(() => {
    const active = localTournaments.find(t => t.status === 'active');
    const upcoming = localTournaments.find(t => t.status === 'upcoming');
    setActiveTournament(active || upcoming || localTournaments.filter(t => t.status !== 'draft')[0] || null);
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

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    const holeCount = savedDraft.scoringFormat === 'matchplay'
      ? (savedDraft.holeResults?.length || 18)
      : (savedDraft.scores ? Object.values(savedDraft.scores)[0]?.length || 18 : 18);
    const round = rounds.find(r => r.id === savedDraft.roundId)
      || { id: savedDraft.roundId, course_id: savedDraft.courseId, total_holes: savedDraft.totalHoles || holeCount, starting_hole: savedDraft.startingHole || 1, status: 'active' };
    const course = courses.find(c => c.id === savedDraft.courseId)
      || { id: savedDraft.courseId, name: savedDraft.courseName || 'Unknown', pars: {} };
    setScoringFormat(savedDraft.scoringFormat || 'strokeplay');
    setScoringCourse(course);
    setScoringRound(round);
  };

  const handleDiscardDraft = () => {
    if (savedDraft) {
      if (savedDraft.scoringFormat === 'matchplay') clearMPDraft(savedDraft.roundId, savedDraft.userId || currentUser.id);
      else clearDraft(savedDraft.roundId, savedDraft.userId || currentUser.id);
    }
    setSavedDraft(null);
  };

  const handleScoringComplete = () => {
    setScoringRound(null);
    setScoringCourse(null);
    setSavedDraft(null);
    loadData();
    onDataChanged?.();
  };

  const handleStartRound = (round) => {
    const course = courses.find(c => c.id === round.course_id);
    const tournament = localTournaments.find(t => t.id === round.tournament_id);
    const fmt = round.scoring_format || (tournament?.format === 'matchplay' ? 'matchplay' : 'strokeplay');
    setScoringFormat(fmt);
    setScoringCourse(course);
    setScoringRound(round);
  };

  const handleStartCasual = (round, course, format = 'strokeplay') => {
    setShowCasualPicker(false);
    setScoringFormat(format);
    setScoringCourse(course);
    setScoringRound(round);
  };

  const countRounds = activeTournament?.count_rounds || 6;
  const leaderboard = buildLeaderboard(roundScores, players || [], countRounds);

  // Scoring view
  if (scoringRound && scoringCourse) {
    const scorerProps = {
      round: scoringRound,
      course: scoringCourse,
      allPlayers: players || [],
      currentUser,
      onComplete: handleScoringComplete,
      updateUser,
      onBack: () => { setScoringRound(null); setScoringCourse(null); },
    };
    return (
      <div style={pageStyle}>
        {scoringFormat === 'matchplay'
          ? <MatchPlayScorer {...scorerProps} />
          : <StrokePlayScorer {...scorerProps} />
        }
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
        background: 'var(--bg-header)',
        padding: '36px 20px 14px',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <LogoWatermark size={110} opacity={0.08} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 0 }} />
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            🥏 Matches
          </div>
          {activeTournament ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                {activeTournament.name}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <Badge label={activeTournament.status} color={activeTournament.status === 'active' ? '#4ade80' : '#fbbf24'} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {activeTournament.format} · {rounds.length} rounds
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
              No active tournament
            </div>
          )}

          <button onClick={() => setShowCasualPicker(true)} style={{
            marginTop: 14, padding: '9px 16px', borderRadius: 12,
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif",
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
        {/* Draft resume banner */}
        {savedDraft && !scoringRound && (
          <div style={{
            margin: '12px 20px 0', padding: '12px 16px', borderRadius: 14,
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>↩</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                {savedDraft.scoringFormat === 'matchplay' ? '⚔️ Match' : '📊 Round'} in progress
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                {savedDraft.courseName || 'Unknown course'} · hole {(savedDraft.currentHole || 0) + 1}
              </div>
            </div>
            <button onClick={handleResumeDraft} style={{
              padding: '7px 14px', borderRadius: 9, background: '#fbbf24',
              border: 'none', color: '#1a0a00', fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Resume</button>
            <button onClick={() => { if (window.confirm('Cancel this match? Your progress will be lost.')) handleDiscardDraft(); }} style={{
              padding: '7px 12px', borderRadius: 9, background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)', color: '#f87171',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Cancel</button>
          </div>
        )}

        {activeTab === 'rounds' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading rounds...</div>
            ) : !activeTournament ? (
              <EmptyState icon="🏆" title="No tournament found" subtitle={isAdmin ? "Create a tournament in the Admin panel" : "Check back soon for the next season"} />
            ) : rounds.length === 0 ? (
              <EmptyState icon="📅" title="No rounds scheduled" subtitle={isAdmin ? "Add rounds in the Admin panel" : "Rounds will appear here when scheduled"} />
            ) : (
              <>
                {(() => {
                  // Non-admins: only show active + complete rounds
                  const visibleRounds = isAdmin ? rounds : rounds.filter(r => r.status === 'active' || r.status === 'complete');
                  const scheduledCount = isAdmin ? 0 : rounds.filter(r => r.status === 'upcoming').length;
                  return (<>
                    {visibleRounds.map((round, i) => {
                      const course = courses.find(c => c.id === round.course_id);
                      const myScore = roundScores.find(s => s.round_id === round.id && s.player_id === currentUser.id);
                      return (
                        <div key={round.id}>
                          <RoundCard
                            round={round} index={rounds.indexOf(round)} course={course} myScore={myScore}
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
                          background: 'var(--bg-input)', border: '1px solid var(--border)',
                          borderTop: 'none', color: 'var(--text-muted)',
                          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}
                      >
                        View results <ChevronRight size={12} />
                      </button>
                    )}
                        </div>
                      );
                    })}
                    {scheduledCount > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                        background: 'var(--bg-input)', border: '1px dashed var(--border-card)',
                        borderRadius: 14, marginBottom: 10,
                      }}>
                        <div style={{ fontSize: 24 }}>📅</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {scheduledCount} upcoming round{scheduledCount !== 1 ? 's' : ''} scheduled
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            Details will be revealed when the admin opens each round
                          </div>
                        </div>
                      </div>
                    )}
                    {visibleRounds.length === 0 && scheduledCount === 0 && (
                      <EmptyState icon="📅" title="No rounds yet" subtitle="Rounds will appear here when scheduled" />
                    )}
                  </>);
                })()}
              </>
            )}
          </>
        )}

        {activeTab === 'live' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <SectionLabel>Live Scores</SectionLabel>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-refreshes · tap 🔋 to pause</span>
            </div>
            <LiveLeaderboard
              rounds={rounds}
              courses={courses}
              players={players || []}
              currentUser={currentUser}
            />
          </>
        )}

        {activeTab === 'leaderboard' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <SectionLabel>Season Standings</SectionLabel>
              {activeTournament && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
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
    display: 'flex', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-nav)', maxWidth: 520, margin: '0 auto', overflowX: 'auto',
  }}>
    {[
      { id: 'rounds', label: 'Rounds', icon: <Calendar size={14} /> },
      { id: 'live', label: '🔴 Live', icon: null },
      { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> },
      ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <Settings size={14} /> }] : []),
    ].map(tab => (
      <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
        flex: 1, padding: '13px 8px', background: 'none', border: 'none',
        borderBottom: activeTab === tab.id ? `2px solid ${BRAND.light}` : '2px solid transparent',
        color: activeTab === tab.id ? BRAND.light : 'var(--text-muted)',
        fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        whiteSpace: 'nowrap',
      }}>
        {tab.icon && tab.icon} {tab.label}
      </button>
    ))}
  </div>
);

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; } body { background: var(--bg-base); color: var(--text-primary); }
    button { font-family: 'DM Sans', sans-serif; }
    button:active { transform: scale(0.97); }
    ::-webkit-scrollbar { display: none; }
  `}</style>
);
