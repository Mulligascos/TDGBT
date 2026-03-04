import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, haptic } from '../../utils';
import { parsToArray } from '../../utils/strokeplay';
import { ChevronLeft, ChevronRight, Check, X, Minus, UserPlus } from 'lucide-react';
import { resolveBagTagChallenge, persistBagTagChallenge } from '../../utils/bagTags';

// ─── DRAFT PERSISTENCE ────────────────────────────────────────────────────────
const MP_DRAFT_KEY = (roundId, userId) => `tdg-mp-draft-${roundId}-${userId}`;

export const saveMPDraft = (roundId, userId, draft) => {
  try { localStorage.setItem(MP_DRAFT_KEY(roundId, userId), JSON.stringify({ ...draft, savedAt: new Date().toISOString() })); } catch {}
};
export const loadMPDraft = (roundId, userId) => {
  try { const r = localStorage.getItem(MP_DRAFT_KEY(roundId, userId)); return r ? JSON.parse(r) : null; } catch { return null; }
};
export const clearMPDraft = (roundId, userId) => {
  try { localStorage.removeItem(MP_DRAFT_KEY(roundId, userId)); } catch {}
};
export const listMPDrafts = () => {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('tdg-mp-draft-'))
      .map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } })
      .filter(Boolean).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch { return []; }
};

// ─── MATCHPLAY LOGIC ──────────────────────────────────────────────────────────
// holeResults: array of 0=unplayed, 1=p1 won, 2=p2 won, 3=halved
// Returns { holesUp, leader (1|2|null), holesPlayed, holesRemaining, dormie, finished, winner }
export const calcMatchStatus = (holeResults, totalHoles) => {
  let p1Wins = 0, p2Wins = 0;
  const holesPlayed = holeResults.filter(r => r !== 0).length;
  const holesRemaining = totalHoles - holesPlayed;

  holeResults.forEach(r => {
    if (r === 1) p1Wins++;
    else if (r === 2) p2Wins++;
  });

  const diff = p1Wins - p2Wins;
  const holesUp = Math.abs(diff);
  const leader = diff > 0 ? 1 : diff < 0 ? 2 : null;

  // Match ends when lead > holes remaining, or all holes played
  const finished = holesUp > holesRemaining || (holesPlayed === totalHoles && holesUp !== 0);
  const allSquareFinished = holesPlayed === totalHoles && diff === 0;
  const dormie = !finished && leader !== null && holesUp === holesRemaining;

  return { holesUp, leader, holesPlayed, holesRemaining, dormie, finished, allSquareFinished, winner: finished ? leader : null, p1Wins, p2Wins };
};

// Status label: "3&2", "1 up", "AS", "Dormie 2", etc.
const matchLabel = (status, totalHoles) => {
  if (status.allSquareFinished) return 'All Square';
  if (status.finished && status.winner) {
    return `${status.holesUp}&${status.holesRemaining}`;
  }
  if (status.holesPlayed === 0) return 'Not started';
  if (status.leader === null) return 'All Square';
  if (status.dormie) return `Dormie ${status.holesUp}`;
  return `${status.holesUp} Up`;
};

// ─── ADD PLAYERS MODAL ────────────────────────────────────────────────────────
const AddPlayerModal = ({ allPlayers, currentPlayers, onAdd, onClose }) => {
  const [search, setSearch] = useState('');
  const available = allPlayers.filter(p =>
    !currentPlayers.find(cp => cp.id === p.id) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', background: '#0d2b0d', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 14 }}>Add Player</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 14, marginBottom: 12, outline: 'none' }} />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {available.map(p => (
            <button key={p.id} onClick={() => { onAdd(p); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, marginBottom: 6, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: BRAND.primary + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: BRAND.light }}>
                {p.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{formatName(p.name)}</div>
                {p.bagTag && <div style={{ fontSize: 11, color: '#fbbf24' }}>🏷️ #{p.bagTag}</div>}
              </div>
            </button>
          ))}
          {available.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>No players available</div>}
        </div>
        <button onClick={onClose} style={{ marginTop: 12, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
};

// ─── HOLE RESULT BUTTON ───────────────────────────────────────────────────────
const HoleBtn = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: '14px 4px', borderRadius: 12, cursor: 'pointer',
    background: active ? color + '25' : 'rgba(255,255,255,0.05)',
    border: `2px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
    color: active ? 'white' : 'rgba(255,255,255,0.4)',
    fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800,
    transition: 'all 0.12s',
  }}>
    {label}
  </button>
);

// ─── MATCH SUMMARY ────────────────────────────────────────────────────────────
const MatchSummary = ({ p1, p2, holeResults, pars, status, onConfirm, onBack, submitting, submitError }) => {
  const totalHoles = pars.length;
  return (
    <div style={{ padding: '20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'white' }}>Match Summary</div>
      </div>

      {/* Result banner */}
      <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 18, marginBottom: 24 }}>
        {status.allSquareFinished ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: 'white' }}>All Square</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Winner</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#fbbf24' }}>
              {formatName(status.winner === 1 ? p1.name : p2.name)}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.light, marginTop: 6 }}>
              {matchLabel(status, totalHoles)}
            </div>
          </>
        )}
      </div>

      {/* Hole-by-hole grid */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${Math.min(totalHoles, 9)}, 1fr)`, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Hole</div>
          {pars.slice(0, 9).map((p, i) => (
            <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 700 }}>{i + 1}</div>
          ))}
        </div>
        {[p1, p2].map((player, pi) => (
          <div key={player.id} style={{ display: 'grid', gridTemplateColumns: `60px repeat(${Math.min(totalHoles, 9)}, 1fr)`, padding: '8px 10px', borderBottom: pi === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}>{formatName(player.name).split(' ')[0]}</div>
            {holeResults.slice(0, 9).map((r, i) => {
              const won = r === (pi + 1);
              const halved = r === 3;
              return (
                <div key={i} style={{ textAlign: 'center', fontSize: 13, fontWeight: won ? 800 : 400, color: won ? BRAND.light : halved ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>
                  {r === 0 ? '·' : won ? 'W' : halved ? 'H' : 'L'}
                </div>
              );
            })}
          </div>
        ))}
        {totalHoles > 9 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${totalHoles - 9}, 1fr)`, padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Back</div>
              {pars.slice(9).map((p, i) => (
                <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 700 }}>{i + 10}</div>
              ))}
            </div>
            {[p1, p2].map((player, pi) => (
              <div key={player.id} style={{ display: 'grid', gridTemplateColumns: `60px repeat(${totalHoles - 9}, 1fr)`, padding: '8px 10px', borderBottom: pi === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}>{formatName(player.name).split(' ')[0]}</div>
                {holeResults.slice(9).map((r, i) => {
                  const won = r === (pi + 1);
                  const halved = r === 3;
                  return (
                    <div key={i} style={{ textAlign: 'center', fontSize: 13, fontWeight: won ? 800 : 400, color: won ? BRAND.light : halved ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>
                      {r === 0 ? '·' : won ? 'W' : halved ? 'H' : 'L'}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {submitError && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#f87171' }}>
          ⚠️ {submitError}
        </div>
      )}

      <button onClick={onConfirm} disabled={submitting} style={{
        width: '100%', padding: '16px', borderRadius: 14,
        background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
        border: '1px solid rgba(74,222,128,0.3)', color: 'white',
        fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
        cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Check size={18} /> {submitting ? 'Saving...' : 'Submit Result'}
      </button>
    </div>
  );
};

// ─── BAG TAG CHALLENGE SCREEN (matchplay version) ─────────────────────────────
const MPBagTagScreen = ({ p1, p2, winner, onComplete, updateUser, currentUser, roundId, courseId }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Build scored players format compatible with resolveBagTagChallenge
  // In matchplay, winner gets vs_par = -1, loser = +1 (just to determine winner)
  const scoredPlayers = [
    { ...p1, vs_par: winner?.id === p1.id ? -1 : 1, total_strokes: null },
    { ...p2, vs_par: winner?.id === p2.id ? -1 : 1, total_strokes: null },
  ];

  const result = resolveBagTagChallenge(scoredPlayers);
  if (!result) { onComplete?.(); return null; }

  const { swaps } = result;
  const hasSwap = swaps.some(s => s.tagBefore !== s.tagAfter);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await persistBagTagChallenge({
        roundId, courseId,
        challengeDate: new Date().toISOString().split('T')[0],
        swaps,
        winner: result.winner,
        scoredPlayers,
        createdBy: currentUser.id,
      });
      if (updateUser) {
        const { data: fresh } = await supabase.from('players').select('*').eq('player_id', currentUser.id).single();
        if (fresh) updateUser({ ...currentUser, bagTag: fresh.bag_tag });
      }
      onComplete?.();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a0a00 0%, #0a1f0a 60%, #071407 100%)', color: 'white', paddingBottom: 40 }}>
      <div style={{ background: 'linear-gradient(135deg, #92400e, #d97706)', padding: '52px 20px 24px', borderBottom: '1px solid rgba(251,191,36,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏷️</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'white' }}>Bag Tag Challenge!</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Both players hold bag tags</div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Result</div>

        {[p1, p2].map((p) => {
          const isWinner = winner?.id === p.id;
          const swap = swaps.find(s => s.player.id === p.id);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: isWinner ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isWinner ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, marginBottom: 8 }}>
              <div style={{ fontSize: 22, width: 28 }}>{isWinner ? '🏆' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{formatName(p.name)}</div>
                <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 2 }}>🏷️ #{p.bagTag}</div>
              </div>
              {swap && swap.tagBefore !== swap.tagAfter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <span style={{ color: '#f87171', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>#{swap.tagBefore}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
                  <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>#{swap.tagAfter}</span>
                </div>
              )}
              {swap && swap.tagBefore === swap.tagAfter && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: "'Syne', sans-serif" }}>#{swap.tagBefore}</div>
              )}
            </div>
          );
        })}

        {!hasSwap && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '8px 0', marginBottom: 8 }}>
            Winner already holds the lowest tag — no change needed.
          </div>
        )}

        {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>⚠️ {error}</div>}

        <button onClick={handleConfirm} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: 14, marginBottom: 10, background: 'linear-gradient(135deg, #92400e, #d97706)', border: '1px solid rgba(251,191,36,0.3)', color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          🏷️ {saving ? 'Saving...' : hasSwap ? 'Confirm Tag Swap' : 'Confirm — No Swap'}
        </button>
        <button onClick={onComplete} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>
          Skip
        </button>
      </div>
    </div>
  );
};

// ─── MAIN MATCHPLAY SCORER ────────────────────────────────────────────────────
export const MatchPlayScorer = ({ round, course, allPlayers, currentUser, onComplete, onBack, updateUser }) => {
  const pars = parsToArray(
    typeof course.pars === 'string' ? JSON.parse(course.pars) : course.pars,
    round.starting_hole, round.total_holes
  );
  const totalHoles = pars.length;

  const existingDraft = loadMPDraft(round.id, currentUser.id);

  const [p1, setP1] = useState(() => existingDraft?.p1 || currentUser);
  const [p2, setP2] = useState(() => existingDraft?.p2 || null);
  const [holeResults, setHoleResults] = useState(() => existingDraft?.holeResults || Array(totalHoles).fill(0));
  const [currentHole, setCurrentHole] = useState(() => existingDraft?.currentHole ?? 0);
  const [view, setView] = useState('setup'); // setup | scoring | summary | bagtag
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [savedRoundId, setSavedRoundId] = useState(null);
  const [matchWinner, setMatchWinner] = useState(null);
  const [resumedFromDraft] = useState(!!existingDraft);

  // Restore view from draft
  useEffect(() => {
    if (existingDraft && existingDraft.p2 && view === 'setup') setView('scoring');
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (view === 'setup' || view === 'summary' || view === 'bagtag') return;
    saveMPDraft(round.id, currentUser.id, {
      roundId: round.id,
      userId: currentUser.id,
      courseId: round.course_id,
      courseName: course.name,
      p1, p2, holeResults, currentHole,
      scoringFormat: 'matchplay',
    });
  }, [holeResults, currentHole, p1, p2, view]);

  const status = calcMatchStatus(holeResults, totalHoles);

  const setHoleResult = (result) => {
    haptic('light');
    setHoleResults(prev => {
      const next = [...prev];
      next[currentHole] = result;
      return next;
    });
  };

  const advance = () => {
    const nextStatus = calcMatchStatus(holeResults, totalHoles);
    if (nextStatus.finished) { setView('summary'); return; }
    if (currentHole < totalHoles - 1) setCurrentHole(h => h + 1);
    else setView('summary');
  };

  const goBack = () => {
    if (currentHole > 0) setCurrentHole(h => h - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      let realRoundId = round.id;
      const isCasual = typeof round.id === 'string' && round.id.startsWith('casual-');

      if (isCasual) {
        const { data: newRound, error: roundErr } = await supabase.from('rounds').insert({
          tournament_id: null,
          course_id: round.course_id,
          scheduled_date: new Date().toISOString().split('T')[0],
          total_holes: round.total_holes,
          starting_hole: round.starting_hole,
          status: 'complete',
          scoring_format: 'matchplay',
        }).select().single();
        if (roundErr) throw roundErr;
        realRoundId = newRound.id;
      }

      // Store match result in round_scores as a special matchplay entry
      // winner gets vs_par = -1, loser +1, draw = 0
      const rows = [p1, p2].filter(Boolean).map(p => {
        const won = status.winner !== null && ((status.winner === 1 && p.id === p1.id) || (status.winner === 2 && p.id === p2.id));
        const lost = status.winner !== null && !won;
        return {
          round_id: realRoundId,
          player_id: p.id,
          scores: holeResults,  // store hole-by-hole results
          total_strokes: status.winner === 1 ? (p.id === p1.id ? status.p1Wins : status.p2Wins) : (p.id === p1.id ? status.p1Wins : status.p2Wins),
          vs_par: won ? -1 : lost ? 1 : 0,
          submitted_at: new Date().toISOString(),
          submitted_by: currentUser.id,
        };
      });

      const { error } = await supabase.from('round_scores').upsert(rows, { onConflict: 'round_id,player_id' });
      if (error) throw error;

      clearMPDraft(round.id, currentUser.id);
      setSavedRoundId(realRoundId);
      haptic('success');

      // Check bag tags
      const winner = status.winner === 1 ? p1 : status.winner === 2 ? p2 : null;
      setMatchWinner(winner);

      const tagged = [p1, p2].filter(Boolean).filter(p => (p.bagTag ?? p.bag_tag) != null);
      if (winner && tagged.length >= 2) {
        setView('bagtag');
      } else {
        onComplete?.();
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Views ──────────────────────────────────────────────────────────────────

  if (view === 'bagtag') {
    return (
      <MPBagTagScreen
        p1={p1} p2={p2} winner={matchWinner}
        onComplete={onComplete}
        updateUser={updateUser}
        currentUser={currentUser}
        roundId={savedRoundId}
        courseId={round.course_id}
      />
    );
  }

  if (view === 'summary') {
    return (
      <div style={pageStyle}>
        <MatchSummary
          p1={p1} p2={p2 || { id: 'unknown', name: 'Player 2' }}
          holeResults={holeResults} pars={pars} status={status}
          onConfirm={handleSubmit} onBack={() => setView('scoring')}
          submitting={submitting} submitError={submitError}
        />
        <GlobalStyles />
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div style={pageStyle}>
        <div style={{ padding: '52px 20px 20px', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <ChevronLeft size={22} />
            </button>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'white' }}>Match Play</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{course.name}</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Players</div>

          {/* P1 (self) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 14, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: BRAND.primary + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: BRAND.light }}>
              {p1.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{formatName(p1.name)} <span style={{ fontSize: 11, color: BRAND.light }}>you</span></div>
              {p1.bagTag && <div style={{ fontSize: 11, color: '#fbbf24' }}>🏷️ #{p1.bagTag}</div>}
            </div>
          </div>

          {/* P2 */}
          {p2 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {p2.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{formatName(p2.name)}</div>
                {p2.bagTag && <div style={{ fontSize: 11, color: '#fbbf24' }}>🏷️ #{p2.bagTag}</div>}
              </div>
              <button onClick={() => setP2(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddPlayer(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 14, marginBottom: 10, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              <UserPlus size={18} /> Add Opponent
            </button>
          )}

          <button onClick={() => setView('scoring')} disabled={!p2} style={{ width: '100%', padding: '15px', borderRadius: 14, marginTop: 16, background: p2 ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'rgba(255,255,255,0.06)', border: p2 ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)', color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, cursor: p2 ? 'pointer' : 'not-allowed' }}>
            Start Match →
          </button>
        </div>
        {showAddPlayer && <AddPlayerModal allPlayers={allPlayers.filter(p => p.status === 'Active' || p.status === 'Junior')} currentPlayers={[p1]} onAdd={setP2} onClose={() => setShowAddPlayer(false)} />}
        <GlobalStyles />
      </div>
    );
  }

  // ── Scoring view ───────────────────────────────────────────────────────────
  if (!p2) { setView('setup'); return null; }

  const holeResult = holeResults[currentHole];
  const par = pars[currentHole];
  const holeNum = currentHole + round.starting_hole;
  const statusLabel = matchLabel(status, totalHoles);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${BRAND.primary}cc, ${BRAND.accent}99)`, padding: '48px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {resumedFromDraft && (
            <div style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 10 }}>
              ↩ Resumed from saved draft
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setView('setup')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{course.name} · Match Play</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
                Hole {holeNum} <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>of {totalHoles} · Par {par}</span>
              </div>
            </div>
            <button onClick={() => setView('summary')} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
              Summary
            </button>
          </div>

          {/* Match status pill */}
          <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: 20, display: 'inline-block', minWidth: 120 }}>
            {status.leader === null ? (
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>All Square</span>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 800, color: BRAND.light }}>
                {formatName(status.leader === 1 ? p1.name : p2.name).split(' ')[0]} <span style={{ color: 'white' }}>{statusLabel}</span>
              </span>
            )}
            {status.finished && <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 6 }}>· Match over</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        {/* Players with running hole counts */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[p1, p2].map((player, pi) => {
            const isLeading = status.leader === (pi + 1);
            const wins = pi === 0 ? status.p1Wins : status.p2Wins;
            return (
              <div key={player.id} style={{ flex: 1, padding: '12px', background: isLeading ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isLeading ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isLeading ? BRAND.light : 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  {formatName(player.name).split(' ')[0]}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: isLeading ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                  {wins}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>holes won</div>
              </div>
            );
          })}
        </div>

        {/* Hole result buttons */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          Hole {holeNum} Result
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <HoleBtn
            label={`${formatName(p1.name).split(' ')[0]} wins`}
            active={holeResult === 1}
            color={BRAND.light}
            onClick={() => setHoleResult(1)}
          />
          <HoleBtn
            label="Halved"
            active={holeResult === 3}
            color="#fbbf24"
            onClick={() => setHoleResult(3)}
          />
          <HoleBtn
            label={`${formatName(p2.name).split(' ')[0]} wins`}
            active={holeResult === 2}
            color="#f87171"
            onClick={() => setHoleResult(2)}
          />
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={goBack} disabled={currentHole === 0} style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: currentHole === 0 ? 'rgba(255,255,255,0.2)' : 'white', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: currentHole === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={advance} style={{ flex: 2, padding: '14px', borderRadius: 14, background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, border: '1px solid rgba(74,222,128,0.3)', color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {status.finished || currentHole === totalHoles - 1 ? <><Check size={15} /> Finish</> : <>Next <ChevronRight size={16} /></>}
          </button>
        </div>

        {/* Hole progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20, flexWrap: 'wrap' }}>
          {holeResults.map((r, i) => (
            <button key={i} onClick={() => setCurrentHole(i)} style={{ width: i === currentHole ? 20 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: i === currentHole ? BRAND.light : r === 1 ? 'rgba(74,222,128,0.5)' : r === 2 ? 'rgba(248,113,113,0.5)' : r === 3 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
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
    * { box-sizing: border-box; }
    button:active { transform: scale(0.97); }
  `}</style>
);
