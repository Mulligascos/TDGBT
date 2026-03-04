import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate } from '../utils';
import { Badge, SectionLabel, EmptyState } from '../components/ui';
import { vsParLabel, vsParColor, parsToArray, totalPar } from '../utils/strokeplay';
import { ChevronDown, ChevronUp, Search, X, Calendar } from 'lucide-react';

// ─── PERSONAL BESTS BANNER ────────────────────────────────────────────────────
const PersonalBests = ({ myScores }) => {
  if (myScores.length === 0) return null;

  const best = myScores.reduce((b, s) => s.vs_par < b.vs_par ? s : b, myScores[0]);
  const avg = Math.round(myScores.reduce((a, s) => a + s.vs_par, 0) / myScores.length);
  const total = myScores.length;

  const stats = [
    { label: 'Rounds', value: total, color: BRAND.light },
    {
      label: 'Best Round',
      value: vsParLabel(best.vs_par),
      color: vsParColor(best.vs_par),
    },
    {
      label: 'Avg Score',
      value: vsParLabel(avg),
      color: vsParColor(avg),
    },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24,
    }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '14px 10px', textAlign: 'center',
        }}>
          <div style={{
            fontSize: 22, fontWeight: 800, color,
            fontFamily: "'Syne', sans-serif", lineHeight: 1, marginBottom: 4,
          }}>{value}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── HOLE-BY-HOLE GRID ────────────────────────────────────────────────────────
const HoleGrid = ({ scores, pars }) => {
  if (!scores || !pars || pars.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>
        No hole-by-hole data available
      </div>
    );
  }

  const holeScores = Array.isArray(scores) ? scores : [];

  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <td style={{ padding: '4px 6px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Hole
            </td>
            {pars.map((_, i) => (
              <td key={i} style={{ padding: '4px 3px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 700 }}>
                {i + 1}
              </td>
            ))}
            <td style={{ padding: '4px 6px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', fontWeight: 700 }}>
              Tot
            </td>
          </tr>
          <tr>
            <td style={{ padding: '3px 6px', color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>Par</td>
            {pars.map((p, i) => (
              <td key={i} style={{ padding: '3px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontSize: 10 }}>
                {p}
              </td>
            ))}
            <td style={{ padding: '3px 6px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', fontSize: 10 }}>
              {totalPar(pars)}
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '5px 6px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Score</td>
            {pars.map((par, i) => {
              const s = holeScores[i];
              const diff = s != null ? s - par : null;
              return (
                <td key={i} style={{
                  padding: '5px 3px', textAlign: 'center',
                  color: diff == null ? 'rgba(255,255,255,0.2)'
                    : diff < 0 ? '#4ade80'
                    : diff === 0 ? 'white'
                    : '#f87171',
                  fontWeight: diff != null && diff < 0 ? 700 : 400,
                }}>
                  {s ?? '—'}
                </td>
              );
            })}
            <td style={{
              padding: '5px 6px', textAlign: 'right', fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
            }}>
              {holeScores.filter(s => s != null).reduce((a, b) => a + b, 0) || '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ─── ROUND HISTORY CARD ───────────────────────────────────────────────────────
const RoundHistoryCard = ({ score, round, course, tournament, coPlayers, allPlayers }) => {
  const [expanded, setExpanded] = useState(false);

  const pars = course?.pars ? parsToArray(
    typeof course.pars === 'string' ? JSON.parse(course.pars) : course.pars,
    round?.starting_hole || 1,
    round?.total_holes || 18
  ) : [];

  const holeScores = score.scores
    ? (Array.isArray(score.scores) ? score.scores : JSON.parse(score.scores))
    : [];

  // Recalculate vs_par from hole scores + course pars (more reliable than stored value)
  const calcVsParFromHoles = (holes) => {
    if (!holes.length || !pars.length) return null;
    // Only count regulation holes (ignore playoff extras beyond pars.length)
    const regulationHoles = holes.slice(0, pars.length);
    const strokes = regulationHoles.reduce((a, b) => a + (b ?? 0), 0);
    const par = totalPar(pars.slice(0, regulationHoles.length));
    return strokes - par;
  };

  const myVsPar = calcVsParFromHoles(holeScores) ?? score.vs_par;

  // Other players in the same round
  const others = coPlayers
    .filter(s => s.player_id !== score.player_id)
    .map(s => {
      const p = allPlayers.find(p => p.id === s.player_id);
      const hs = s.scores
        ? (Array.isArray(s.scores) ? s.scores : JSON.parse(s.scores))
        : [];
      const vp = calcVsParFromHoles(hs) ?? s.vs_par;
      return { name: p?.name || 'Unknown', vs_par: vp, total_strokes: s.total_strokes, holeScores: hs };
    })
    .sort((a, b) => a.vs_par - b.vs_par);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Main row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        {/* Score bubble */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: myVsPar < 0
            ? 'rgba(74,222,128,0.12)' : myVsPar === 0
            ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.1)',
          border: `1px solid ${vsParColor(myVsPar)}30`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 18, fontWeight: 800, color: vsParColor(myVsPar),
            fontFamily: "'Syne', sans-serif", lineHeight: 1,
          }}>
            {vsParLabel(myVsPar)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {score.total_strokes}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 3 }}>
            {course?.name || 'Unknown course'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {formatDate(round?.scheduled_date)}
            {tournament && (
              <span style={{ marginLeft: 6, color: BRAND.light + '99' }}>· {tournament.name}</span>
            )}
          </div>
          {others.length > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
              with {others.slice(0, 3).map(o => formatName(o.name)).join(', ')}
              {others.length > 3 && ` +${others.length - 3}`}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <div style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 16px 16px',
        }}>
          {/* Hole grid */}
          {pars.length > 0 && holeScores.length > 0 ? (
            <HoleGrid scores={holeScores} pars={pars} />
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '4px 0' }}>
              No hole-by-hole data for this round
            </div>
          )}

          {/* Other players — full scorecards */}
          {others.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {others.map(o => (
                <div key={o.name} style={{
                  marginBottom: 14, paddingTop: 14,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {/* Player header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {formatName(o.name)}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{o.total_strokes} strokes</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: vsParColor(o.vs_par), fontFamily: "'Syne', sans-serif" }}>
                        {vsParLabel(o.vs_par)}
                      </span>
                    </div>
                  </div>
                  {/* Hole grid */}
                  {pars.length > 0 && o.holeScores.length > 0
                    ? <HoleGrid scores={o.holeScores} pars={pars} />
                    : <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '4px 0' }}>No hole data</div>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
const FilterBar = ({ playerFilter, setPlayerFilter, dateFrom, setDateFrom, dateTo, setDateTo, allPlayers, onClear, hasFilters }) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Search + toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: showFilters ? 10 : 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <select
            value={playerFilter}
            onChange={e => setPlayerFilter(e.target.value)}
            style={{
              width: '100%', padding: '11px 12px 11px 34px', borderRadius: 12,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: playerFilter ? 'white' : 'rgba(255,255,255,0.4)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none',
              appearance: 'none',
            }}
          >
            <option value="" style={{ background: '#0d2b0d', color: 'rgba(255,255,255,0.5)' }}>Filter by player...</option>
            {allPlayers.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#0d2b0d', color: 'white' }}>
                {formatName(p.name)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowFilters(s => !s)}
          style={{
            padding: '11px 14px', borderRadius: 12,
            background: showFilters ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)',
            border: showFilters ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
            color: showFilters ? BRAND.light : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
          }}
        >
          <Calendar size={14} /> Dates
        </button>

        {hasFilters && (
          <button onClick={onClear} style={{
            padding: '11px 12px', borderRadius: 12,
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            color: '#f87171', cursor: 'pointer',
          }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Date range */}
      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>From</div>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none',
                colorScheme: 'dark',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>To</div>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none',
                colorScheme: 'dark',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN HISTORY PAGE ────────────────────────────────────────────────────────
export const HistoryPage = ({ currentUser, players }) => {
  const [myScores, setMyScores] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [allRoundScores, setAllRoundScores] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [playerFilter, setPlayerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const hasFilters = !!(playerFilter || dateFrom || dateTo);

  const loadHistory = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Load all round_scores for current user
      const { data: myScoresData } = await supabase
        .from('round_scores')
        .select('*')
        .eq('player_id', currentUser.id)
        .order('submitted_at', { ascending: false });

      if (!myScoresData || myScoresData.length === 0) {
        setMyScores([]);
        setLoading(false);
        return;
      }

      const roundIds = [...new Set(myScoresData.map(s => s.round_id))];

      // Load all supporting data in parallel
      const [
        { data: roundsData },
        { data: allScoresData },
        { data: coursesData },
        { data: tournamentsData },
      ] = await Promise.all([
        supabase.from('rounds').select('*').in('id', roundIds),
        supabase.from('round_scores').select('*').in('round_id', roundIds),
        supabase.from('courses').select('*'),
        supabase.from('tournaments').select('*'),
      ]);

      setMyScores(myScoresData);
      setRounds(roundsData || []);
      setAllRoundScores(allScoresData || []);
      setCourses(coursesData || []);
      setTournaments(tournamentsData || []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Apply filters
  const filteredScores = myScores.filter(score => {
    const round = rounds.find(r => r.id === score.round_id);
    if (!round) return false;

    // Date range filter
    if (dateFrom && round.scheduled_date < dateFrom) return false;
    if (dateTo && round.scheduled_date > dateTo) return false;

    // Player filter — only show rounds where this player also played
    if (playerFilter) {
      const playedTogether = allRoundScores.some(
        s => s.round_id === score.round_id && s.player_id === playerFilter
      );
      if (!playedTogether) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setPlayerFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Other players to show in filter (exclude self)
  const otherPlayers = (players || []).filter(p => p.id !== currentUser.id);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${BRAND.primary}dd, #071407)`,
        padding: '52px 20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            📋 History
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
            My Rounds
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {formatName(currentUser.name)} · all completed rounds
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
            Loading history...
          </div>
        ) : myScores.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No rounds yet"
            subtitle="Your completed rounds will appear here once you've submitted a scorecard"
          />
        ) : (
          <>
            {/* Personal bests */}
            <PersonalBests myScores={myScores} />

            {/* Filters */}
            <FilterBar
              playerFilter={playerFilter}
              setPlayerFilter={setPlayerFilter}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              allPlayers={otherPlayers}
              onClear={clearFilters}
              hasFilters={hasFilters}
            />

            {/* Results count */}
            {hasFilters && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
                {filteredScores.length} round{filteredScores.length !== 1 ? 's' : ''} found
              </div>
            )}

            {/* Round cards */}
            {filteredScores.length === 0 ? (
              <EmptyState icon="🔍" title="No rounds match" subtitle="Try adjusting your filters" />
            ) : (
              filteredScores.map(score => {
                const round = rounds.find(r => r.id === score.round_id);
                const course = courses.find(c => c.id === round?.course_id);
                const tournament = tournaments.find(t => t.id === round?.tournament_id);
                const coPlayers = allRoundScores.filter(s => s.round_id === score.round_id);
                return (
                  <RoundHistoryCard
                    key={score.id}
                    score={score}
                    round={round}
                    course={course}
                    tournament={tournament}
                    coPlayers={coPlayers}
                    allPlayers={players || []}
                  />
                );
              })
            )}
          </>
        )}
      </div>

      <GlobalStyles />
    </div>
  );
};

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
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
  `}</style>
);
