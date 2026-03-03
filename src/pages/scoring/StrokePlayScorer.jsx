import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, haptic } from '../../utils';
import {
  parsToArray, totalPar, calcVsPar, calcAdjustedStrokes,
  vsParLabel, vsParColor, isJunior, applyHandicap,
} from '../../utils/strokeplay';
import { ChevronLeft, ChevronRight, Plus, Minus, Check, X, UserPlus, UserMinus } from 'lucide-react';

// ─── PLAYER SCORE ROW ─────────────────────────────────────────────────────────
const PlayerRow = ({ player, score, par, onChange, isCurrentHole }) => {
  const adjusted = score != null ? applyHandicap(score, player) : null;
  const diff = adjusted != null ? adjusted - par : null;
  const junior = isJunior(player);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      opacity: isCurrentHole ? 1 : 0.85,
    }}>
      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          {formatName(player.name)}
          {junior && (
            <span style={{ fontSize: 9, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>J</span>
          )}
        </div>
        {adjusted != null && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
            {junior ? `${score} → ${adjusted} (handicap)` : `${score} strokes`}
          </div>
        )}
      </div>

      {/* +/- controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => { haptic('light'); onChange(Math.max(1, (score || par) - 1)); }} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'white', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Minus size={16} />
        </button>

        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: diff == null ? 'rgba(255,255,255,0.07)' :
            diff < 0 ? 'rgba(74,222,128,0.15)' :
            diff === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
          border: `1px solid ${diff == null ? 'rgba(255,255,255,0.1)' :
            diff < 0 ? 'rgba(74,222,128,0.3)' :
            diff === 0 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
          color: diff == null ? 'rgba(255,255,255,0.3)' :
            diff < 0 ? '#4ade80' : diff === 0 ? '#fbbf24' : '#f87171',
        }}>
          {score ?? '—'}
        </div>

        <button onClick={() => { haptic('light'); onChange((score || par) + 1); }} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'white', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Plus size={16} />
        </button>
      </div>

      {/* Running total */}
      <div style={{ width: 36, textAlign: 'right' }}>
        {diff != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: vsParColor(diff) }}>
            {vsParLabel(diff)}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── ADD PLAYERS MODAL ────────────────────────────────────────────────────────
const AddPlayersModal = ({ allPlayers, currentPlayers, onAdd, onClose }) => {
  const [search, setSearch] = useState('');
  const available = allPlayers.filter(p =>
    !currentPlayers.find(cp => cp.id === p.id) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        background: '#0d1f0d', borderTop: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px 20px 0 0', padding: '20px',
        width: '100%', maxWidth: 520, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: 'white', margin: 0 }}>
            Add Player
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search players..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'white', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {available.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              No players available
            </p>
          ) : (
            available.map(p => (
              <button key={p.id} onClick={() => { haptic('light'); onAdd(p); onClose(); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 6,
                color: 'white', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isJunior(p) && <span style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700 }}>JUNIOR</span>}
                  <UserPlus size={16} color={BRAND.light} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── SCORECARD SUMMARY ────────────────────────────────────────────────────────
const ScorecardSummary = ({ players, scores, pars, onSubmit, onBack, submitting, submitError }) => {
  const rows = players.map(p => {
    const playerScores = scores[p.id] || [];
    const adjusted = playerScores.map(s => s != null ? applyHandicap(s, p) : null);
    const total = adjusted.filter(s => s != null).reduce((a, b) => a + b, 0);
    const vp = calcVsPar(adjusted, pars);
    return { player: p, scores: playerScores, adjusted, total, vsPar: vp };
  }).sort((a, b) => a.vsPar - b.vsPar);

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'white', margin: 0 }}>
          Review Scorecard
        </h2>
      </div>

      {/* Leaderboard */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Player</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Strokes</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, width: 36, textAlign: 'right' }}>+/-</span>
          </div>
        </div>
        {rows.map((row, i) => (
          <div key={row.player.id} style={{
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            background: i === 0 ? 'rgba(74,222,128,0.04)' : 'transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: i === 0 ? BRAND.light : 'rgba(255,255,255,0.08)',
                color: i === 0 ? BRAND.primary : 'rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>{i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{formatName(row.player.name)}</span>
              {isJunior(row.player) && <span style={{ fontSize: 9, color: '#fbbf24', fontWeight: 700 }}>J</span>}
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{row.total}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: vsParColor(row.vsPar), width: 36, textAlign: 'right' }}>
                {vsParLabel(row.vsPar)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Hole-by-hole grid */}
      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
          <thead>
            <tr>
              <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Hole</td>
              {pars.map((_, i) => (
                <td key={i} style={{ padding: '6px 4px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontWeight: 700 }}>{i + 1}</td>
              ))}
              <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.35)', textAlign: 'right', fontWeight: 700 }}>Tot</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>Par</td>
              {pars.map((p, i) => (
                <td key={i} style={{ padding: '4px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontSize: 10 }}>{p}</td>
              ))}
              <td style={{ padding: '4px 8px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', fontSize: 10 }}>{totalPar(pars)}</td>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.player.id}>
                <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {formatName(row.player.name)}
                </td>
                {row.adjusted.map((s, i) => (
                  <td key={i} style={{
                    padding: '6px 4px', textAlign: 'center',
                    color: s == null ? 'rgba(255,255,255,0.2)' :
                      s < pars[i] ? '#4ade80' : s === pars[i] ? 'white' : '#f87171',
                    fontWeight: s != null && s < pars[i] ? 700 : 400,
                  }}>{s ?? '—'}</td>
                ))}
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: vsParColor(row.vsPar) }}>
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {submitError && (
        <div style={{
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 14,
          fontSize: 13, color: '#f87171',
        }}>
          ⚠️ {submitError}
        </div>
      )}

      <button onClick={onSubmit} disabled={submitting} style={{
        width: '100%', padding: '16px', borderRadius: 14,
        background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
        border: `1px solid rgba(74,222,128,0.3)`, color: 'white',
        fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
        cursor: submitting ? 'not-allowed' : 'pointer',
        opacity: submitting ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Check size={18} /> {submitting ? 'Submitting...' : 'Submit Scorecard'}
      </button>
    </div>
  );
};

// ─── MAIN SCORECARD PAGE ──────────────────────────────────────────────────────
export const StrokePlayScorer = ({ round, course, allPlayers, currentUser, onComplete, onBack }) => {
  const pars = parsToArray(
    typeof course.pars === 'string' ? JSON.parse(course.pars) : course.pars,
    round.starting_hole, round.total_holes
  );

  const [cardPlayers, setCardPlayers] = useState([currentUser]);
  const [scores, setScores] = useState({});  // { playerId: [s1, s2, ...] }
  const [currentHole, setCurrentHole] = useState(0); // 0-indexed
  const [view, setView] = useState('scoring'); // scoring | summary
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const par = pars[currentHole];
  const totalHoles = pars.length;
  const isLastHole = currentHole === totalHoles - 1;
  const allScored = cardPlayers.every(p => (scores[p.id] || [])[currentHole] != null);

  const setScore = useCallback((playerId, holeIdx, val) => {
    setScores(prev => {
      const arr = [...(prev[playerId] || Array(totalHoles).fill(null))];
      arr[holeIdx] = val;
      return { ...prev, [playerId]: arr };
    });
  }, [totalHoles]);

  const addPlayer = (player) => {
    setCardPlayers(prev => [...prev, player]);
    setScores(prev => ({ ...prev, [player.id]: Array(totalHoles).fill(null) }));
  };

  const removePlayer = (playerId) => {
    if (cardPlayers.length <= 1) return;
    setCardPlayers(prev => prev.filter(p => p.id !== playerId));
    setScores(prev => { const n = { ...prev }; delete n[playerId]; return n; });
  };

  const goToHole = (idx) => {
    haptic('light');
    setCurrentHole(Math.max(0, Math.min(totalHoles - 1, idx)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      // Casual rounds have a fake id — create a real round row first
      let realRoundId = round.id;
      const isCasual = typeof round.id === 'string' && round.id.startsWith('casual-');

      if (isCasual) {
        const { data: newRound, error: roundErr } = await supabase
          .from('rounds')
          .insert({
            tournament_id: null,
            course_id: round.course_id,
            scheduled_date: new Date().toISOString().split('T')[0],
            total_holes: round.total_holes,
            starting_hole: round.starting_hole,
            status: 'complete',
          })
          .select()
          .single();
        if (roundErr) throw roundErr;
        realRoundId = newRound.id;
      }

      const rows = cardPlayers.map(p => {
        const playerScores = scores[p.id] || [];
        const adjusted = playerScores.map(s => s != null ? applyHandicap(s, p) : null);
        const total = adjusted.filter(s => s != null).reduce((a, b) => a + b, 0);
        const vp = calcVsPar(adjusted, pars);
        return {
          round_id: realRoundId,
          player_id: p.id,
          scores: playerScores,
          total_strokes: total,
          vs_par: vp,
          submitted_at: new Date().toISOString(),
          submitted_by: currentUser.id,
        };
      });

      const { error } = await supabase
        .from('round_scores')
        .upsert(rows, { onConflict: 'round_id,player_id' });
      if (error) throw error;

      // Mark tournament round active if still upcoming
      if (!isCasual && round.status === 'upcoming') {
        await supabase.from('rounds').update({ status: 'active' }).eq('id', realRoundId);
      }

      haptic('success');
      onComplete?.();
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'Failed to save scorecard. Please try again.');
      setSubmitting(false);
    }
  };

  if (view === 'summary') {
    return (
      <div style={pageStyle}>
        <ScorecardSummary
          players={cardPlayers} scores={scores} pars={pars}
          onSubmit={handleSubmit} onBack={() => setView('scoring')}
          submitting={submitting} submitError={submitError}
        />
        <GlobalStyles />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {showAddPlayer && (
        <AddPlayersModal
          allPlayers={allPlayers.filter(p => p.status === 'Active' || p.status === 'Junior')}
          currentPlayers={cardPlayers}
          onAdd={addPlayer}
          onClose={() => setShowAddPlayer(false)}
        />
      )}

      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${BRAND.primary}cc, ${BRAND.accent}99)`,
        padding: '48px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                {course.name}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
                Hole {currentHole + round.starting_hole} <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>of {totalHoles}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Par</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{par}</div>
            </div>
          </div>

          {/* Hole progress dots */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {pars.map((_, i) => {
              const hasAllScores = cardPlayers.every(p => (scores[p.id] || [])[i] != null);
              return (
                <button key={i} onClick={() => goToHole(i)} style={{
                  width: 22, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0,
                  background: i === currentHole ? BRAND.light :
                    hasAllScores ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.15)',
                  transform: i === currentHole ? 'scaleY(1.5)' : 'none',
                  transition: 'all 0.2s',
                }} />
              );
            })}
          </div>
        </div>
      </div>

      {/* Scores */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 20px 0' }}>
        {cardPlayers.map(player => (
          <PlayerRow
            key={player.id}
            player={player}
            score={(scores[player.id] || [])[currentHole]}
            par={par}
            onChange={val => setScore(player.id, currentHole, val)}
            isCurrentHole={true}
          />
        ))}

        {/* Add / remove players */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 16 }}>
          <button onClick={() => setShowAddPlayer(true)} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <UserPlus size={14} /> Add Player
          </button>
          {cardPlayers.length > 1 && (
            <button onClick={() => removePlayer(cardPlayers[cardPlayers.length - 1].id)} style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <UserMinus size={14} />
            </button>
          )}
        </div>

        {/* Running totals */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Running Totals
          </div>
          {cardPlayers.map(p => {
            const playerScores = scores[p.id] || [];
            const adjusted = playerScores.slice(0, currentHole + 1).map(s => s != null ? applyHandicap(s, p) : null);
            const vp = calcVsPar(adjusted, pars.slice(0, currentHole + 1));
            const holesPlayed = adjusted.filter(s => s != null).length;
            if (holesPlayed === 0) return null;
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{formatName(p.name)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: vsParColor(vp) }}>{vsParLabel(vp)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        position: 'fixed', bottom: 70, left: 0, right: 0,
        padding: '12px 20px', background: 'rgba(7,20,7,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10 }}>
          <button onClick={() => goToHole(currentHole - 1)} disabled={currentHole === 0} style={{
            flex: 1, padding: '13px', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: currentHole === 0 ? 'rgba(255,255,255,0.2)' : 'white',
            fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: currentHole === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <ChevronLeft size={18} /> Prev
          </button>

          {isLastHole ? (
            <button onClick={() => setView('summary')} style={{
              flex: 2, padding: '13px', borderRadius: 14,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              border: `1px solid rgba(74,222,128,0.3)`, color: 'white',
              fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Check size={18} /> Review Card
            </button>
          ) : (
            <button onClick={() => goToHole(currentHole + 1)} style={{
              flex: 2, padding: '13px', borderRadius: 14,
              background: allScored
                ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`
                : 'rgba(255,255,255,0.06)',
              border: allScored ? `1px solid rgba(74,222,128,0.3)` : '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <GlobalStyles />
    </div>
  );
};

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  fontFamily: "'DM Sans', sans-serif", color: 'white', paddingBottom: 130,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    button:active { transform: scale(0.97); }
  `}</style>
);
