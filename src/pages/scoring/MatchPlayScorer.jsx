import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, haptic } from '../../utils';
import { parsToArray, applyHandicap, isJunior, vsParLabel, vsParColor } from '../../utils/strokeplay';
import { ChevronLeft, ChevronRight, Check, X, Minus, Plus, UserPlus } from 'lucide-react';
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
// Derive per-hole result from strokes: 1 = p1 wins, 2 = p2 wins, 3 = halved, 0 = unplayed
const holeWinner = (p1Strokes, p2Strokes, p1Player, p2Player) => {
  if (p1Strokes == null || p2Strokes == null) return 0;
  const a1 = applyHandicap(p1Strokes, p1Player);
  const a2 = applyHandicap(p2Strokes, p2Player);
  if (a1 < a2) return 1;
  if (a2 < a1) return 2;
  return 3; // halved
};

// Compute running matchplay status from stroke arrays
export const calcMatchStatus = (p1Scores, p2Scores, p1Player, p2Player, totalHoles) => {
  let p1Holes = 0, p2Holes = 0;
  const results = [];

  for (let i = 0; i < totalHoles; i++) {
    const r = holeWinner(p1Scores[i], p2Scores[i], p1Player, p2Player);
    results.push(r);
    if (r === 1) p1Holes++;
    else if (r === 2) p2Holes++;
  }

  const holesPlayed = results.filter(r => r !== 0).length;
  const holesRemaining = totalHoles - holesPlayed;
  const diff = p1Holes - p2Holes;
  const holesUp = Math.abs(diff);
  const leader = diff > 0 ? 1 : diff < 0 ? 2 : null;
  const finished = holesUp > holesRemaining || (holesPlayed === totalHoles && holesUp !== 0);
  const allSquareFinished = holesPlayed === totalHoles && diff === 0;
  const dormie = !finished && !allSquareFinished && leader !== null && holesUp === holesRemaining;

  return { p1Holes, p2Holes, holesPlayed, holesRemaining, holesUp, leader, results,
           finished, allSquareFinished, dormie, winner: finished ? leader : null };
};

// "3&2", "1 Up", "All Square", "Dormie 2"
const matchLabel = (status) => {
  if (status.allSquareFinished) return 'All Square';
  if (status.finished && status.winner) return `${status.holesUp}&${status.holesRemaining}`;
  if (status.holesPlayed === 0) return 'Not started';
  if (status.leader === null) return 'All Square';
  if (status.dormie) return `Dormie ${status.holesUp}`;
  return `${status.holesUp} Up`;
};

// Score colour relative to par (for the scorecard cells)
const scoreColor = (strokes, par) => {
  if (strokes == null) return 'rgba(255,255,255,0.2)';
  const d = strokes - par;
  if (d <= -2) return '#fbbf24'; // eagle+
  if (d === -1) return '#4ade80'; // birdie
  if (d === 0)  return 'rgba(255,255,255,0.7)'; // par
  if (d === 1)  return '#fb923c'; // bogey
  return '#f87171'; // double+
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    button:active { transform: scale(0.97); }
  `}</style>
);

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  fontFamily: "'DM Sans', sans-serif", color: 'white', paddingBottom: 90,
};

// ─── STROKE INPUT ROW ─────────────────────────────────────────────────────────
const StrokeRow = ({ player, score, par, onChange, holeResult, isP1, opponent }) => {
  const adj = score != null ? applyHandicap(score, player) : null;
  const won = holeResult === (isP1 ? 1 : 2);
  const halved = holeResult === 3;
  const lost = score != null && !won && !halved && holeResult !== 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
      background: won ? 'rgba(74,222,128,0.08)' : halved ? 'rgba(251,191,36,0.06)' : lost ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${won ? 'rgba(74,222,128,0.2)' : halved ? 'rgba(251,191,36,0.15)' : lost ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 16, marginBottom: 10,
    }}>
      {/* Name + result badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          {formatName(player.name).split(' ')[0]}
          {isJunior(player) && <span style={{ fontSize: 10, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', padding: '1px 5px', borderRadius: 4 }}>J</span>}
          {won && <span style={{ fontSize: 11, color: '#4ade80' }}>▲ hole won</span>}
          {halved && <span style={{ fontSize: 11, color: '#fbbf24' }}>= halved</span>}
          {lost && <span style={{ fontSize: 11, color: '#f87171' }}>▼ hole lost</span>}
        </div>
        {isJunior(player) && score != null && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            plays as {adj} (−1 handicap)
          </div>
        )}
      </div>

      {/* − score + */}
      <button onClick={() => onChange(Math.max(1, (score ?? par) - 1))} style={{
        width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>−</button>

      <div style={{
        width: 52, textAlign: 'center', fontFamily: "'Syne', sans-serif",
        fontSize: 32, fontWeight: 800, color: scoreColor(score, par), lineHeight: 1,
      }}>
        {score ?? par}
      </div>

      <button onClick={() => onChange((score ?? par) + 1)} style={{
        width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>
    </div>
  );
};

// ─── SCORECARD (horizontal hole-by-hole) ─────────────────────────────────────
const Scorecard = ({ p1, p2, p1Scores, p2Scores, pars, status, currentHole, onHoleClick, startingHole }) => {
  const totalHoles = pars.length;

  const ScorecardHalf = ({ from, to, label }) => (
    <div style={{ marginBottom: 10 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, paddingLeft: 48 }}>{label}</div>}
      <div style={{ display: 'flex', gap: 2 }}>
        {/* Name column */}
        <div style={{ width: 46, flexShrink: 0 }}>
          <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Hole</span>
          </div>
          <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Par</span>
          </div>
          <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 44 }}>
              {formatName(p1.name).split(' ')[0]}
            </span>
          </div>
          <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 44 }}>
              {formatName(p2.name).split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Hole columns */}
        {pars.slice(from, to).map((par, idx) => {
          const i = from + idx;
          const holeNum = i + startingHole;
          const r = status.results[i] ?? 0;
          const s1 = p1Scores[i];
          const s2 = p2Scores[i];
          const isCurrent = i === currentHole;
          return (
            <button key={i} onClick={() => onHoleClick(i)} style={{
              flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              {/* Hole number */}
              <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCurrent ? BRAND.light : 'transparent',
                  color: isCurrent ? '#071407' : 'rgba(255,255,255,0.3)',
                }}>{holeNum}</span>
              </div>
              {/* Par */}
              <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{par}</span>
              </div>
              {/* P1 score */}
              <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 13, fontWeight: 800,
                  color: s1 != null ? scoreColor(s1, par) : 'rgba(255,255,255,0.12)',
                  background: r === 1 ? 'rgba(74,222,128,0.15)' : 'transparent',
                  borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: r === 1 ? '1px solid rgba(74,222,128,0.3)' : 'none',
                }}>
                  {s1 ?? '·'}
                </span>
              </div>
              {/* P2 score */}
              <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 13, fontWeight: 800,
                  color: s2 != null ? scoreColor(s2, par) : 'rgba(255,255,255,0.12)',
                  background: r === 2 ? 'rgba(74,222,128,0.15)' : 'transparent',
                  borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: r === 2 ? '1px solid rgba(74,222,128,0.3)' : 'none',
                }}>
                  {s2 ?? '·'}
                </span>
              </div>
            </button>
          );
        })}

        {/* Totals */}
        <div style={{ width: 28, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 3 }}>
          <div style={{ height: 20 }} />
          <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{pars.slice(from, to).reduce((a, b) => a + b, 0)}</span>
          </div>
          {[p1Scores, p2Scores].map((sc, pi) => {
            const total = sc.slice(from, to).filter(s => s != null).reduce((a, b) => a + b, 0);
            const parTotal = pars.slice(from, to).reduce((a, b) => a + b, 0);
            const diff = total - parTotal;
            return (
              <div key={pi} style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: total ? vsParColor(diff) : 'rgba(255,255,255,0.15)' }}>
                  {total || '·'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 10px', overflowX: 'auto' }}>
      <ScorecardHalf from={0} to={Math.min(9, totalHoles)} label={totalHoles > 9 ? 'Front 9' : ''} />
      {totalHoles > 9 && <ScorecardHalf from={9} to={totalHoles} label="Back 9" />}
    </div>
  );
};

// ─── ADD PLAYER MODAL ─────────────────────────────────────────────────────────
const AddPlayerModal = ({ allPlayers, currentPlayers, onAdd, onClose }) => {
  const [search, setSearch] = useState('');
  const available = allPlayers.filter(p =>
    !currentPlayers.find(cp => cp.id === p.id) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', background: '#0d2b0d', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 14 }}>Add Opponent</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." autoFocus
          style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 14, marginBottom: 12, outline: 'none' }} />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {available.map(p => (
            <button key={p.id} onClick={() => { onAdd(p); onClose(); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, marginBottom: 6, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: BRAND.primary + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: BRAND.light }}>
                {p.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                  {formatName(p.name)}
                  {isJunior(p) && <span style={{ marginLeft: 6, fontSize: 10, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', padding: '1px 5px', borderRadius: 4 }}>Junior</span>}
                </div>
                {(p.bagTag ?? p.bag_tag) && <div style={{ fontSize: 11, color: '#fbbf24' }}>🏷️ #{p.bagTag ?? p.bag_tag}</div>}
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

// ─── BAG TAG SCREEN ───────────────────────────────────────────────────────────
const MPBagTagScreen = ({ p1, p2, winnerPlayer, onComplete, updateUser, currentUser, roundId, courseId }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const scoredPlayers = [
    { ...p1, vs_par: winnerPlayer?.id === p1.id ? -1 : 1, total_strokes: 0 },
    { ...p2, vs_par: winnerPlayer?.id === p2.id ? -1 : 1, total_strokes: 0 },
  ];

  const result = resolveBagTagChallenge(scoredPlayers);
  if (!result) { onComplete?.(); return null; }

  const { swaps } = result;
  const hasSwap = swaps.some(s => s.tagBefore !== s.tagAfter);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await persistBagTagChallenge({ roundId, courseId, swaps, winner: result.winner, scoredPlayers, createdBy: currentUser.id });
      if (updateUser) {
        const { data: fresh } = await supabase.from('players').select('*').eq('player_id', currentUser.id).single();
        if (fresh) updateUser({ ...currentUser, bagTag: fresh.bag_tag });
      }
      onComplete?.();
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a0a00 0%, #0a1f0a 60%, #071407 100%)', color: 'white', paddingBottom: 40 }}>
      <div style={{ background: 'linear-gradient(135deg, #92400e, #d97706)', padding: '52px 20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏷️</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800 }}>Bag Tag Challenge!</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Both players hold bag tags</div>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        {[p1, p2].map(p => {
          const isWinner = winnerPlayer?.id === p.id;
          const swap = swaps.find(s => s.player.id === p.id);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: isWinner ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isWinner ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, marginBottom: 8 }}>
              <div style={{ fontSize: 22, width: 28 }}>{isWinner ? '🏆' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{formatName(p.name)}</div>
                <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 2 }}>🏷️ #{p.bagTag ?? p.bag_tag}</div>
              </div>
              {swap && swap.tagBefore !== swap.tagAfter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>#{swap.tagBefore}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>#{swap.tagAfter}</span>
                </div>
              )}
              {swap && swap.tagBefore === swap.tagAfter && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>#{swap.tagBefore}</span>
              )}
            </div>
          );
        })}
        {!hasSwap && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '6px 0 12px' }}>Winner already holds the lowest tag — no change needed.</div>}
        {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 12 }}>⚠️ {error}</div>}
        <button onClick={handleConfirm} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: 14, marginBottom: 10, background: 'linear-gradient(135deg, #92400e, #d97706)', border: '1px solid rgba(251,191,36,0.3)', color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          🏷️ {saving ? 'Saving...' : hasSwap ? 'Confirm Tag Swap' : 'Confirm — No Swap'}
        </button>
        <button onClick={onComplete} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>Skip</button>
      </div>
    </div>
  );
};

// ─── MATCH SUMMARY ────────────────────────────────────────────────────────────
const MatchSummary = ({ p1, p2, p1Scores, p2Scores, pars, status, onConfirm, onBack, submitting, submitError, startingHole }) => (
  <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><ChevronLeft size={22} /></button>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'white' }}>Match Summary</div>
    </div>

    {/* Result banner */}
    <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 18, marginBottom: 24 }}>
      {status.allSquareFinished ? (
        <><div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: 'white' }}>All Square</div></>
      ) : status.winner ? (
        <><div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Winner</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#fbbf24' }}>
          {formatName(status.winner === 1 ? p1.name : p2.name)}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.light, marginTop: 6 }}>{matchLabel(status)}</div></>
      ) : (
        <><div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>Match in progress</div></>
      )}
    </div>

    {/* Scorecard */}
    <div style={{ marginBottom: 24 }}>
      <Scorecard p1={p1} p2={p2} p1Scores={p1Scores} p2Scores={p2Scores} pars={pars}
        status={status} currentHole={-1} onHoleClick={() => {}} startingHole={startingHole} />
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const MatchPlayScorer = ({ round, course, allPlayers, currentUser, onComplete, onBack, updateUser }) => {
  const pars = parsToArray(
    typeof course.pars === 'string' ? JSON.parse(course.pars) : course.pars,
    round.starting_hole, round.total_holes
  );
  const totalHoles = pars.length;

  const existingDraft = loadMPDraft(round.id, currentUser.id);

  const [p1]    = useState(currentUser);
  const [p2, setP2]   = useState(() => existingDraft?.p2 || null);
  // scores keyed by player id, arrays of strokes (defaults to par)
  const [p1Scores, setP1Scores] = useState(() => existingDraft?.p1Scores || pars.map(p => p));
  const [p2Scores, setP2Scores] = useState(() => existingDraft?.p2Scores || pars.map(p => p));
  const [currentHole, setCurrentHole] = useState(() => existingDraft?.currentHole ?? 0);
  const [view, setView]   = useState(() => existingDraft?.p2 ? 'scoring' : 'setup');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [savedRoundId, setSavedRoundId] = useState(null);
  const [winnerPlayer, setWinnerPlayer] = useState(null);
  const [resumedFromDraft] = useState(!!existingDraft);

  // When a p2 is added for the first time, seed their scores to par
  const addOpponent = (player) => {
    setP2(player);
    setP2Scores(pars.map(p => p));
  };

  // Auto-save draft on every change
  React.useEffect(() => {
    if (view === 'setup' || view === 'summary' || view === 'bagtag') return;
    saveMPDraft(round.id, currentUser.id, {
      roundId: round.id, userId: currentUser.id,
      courseId: round.course_id, courseName: course.name,
      scoringFormat: 'matchplay',
      p1, p2, p1Scores, p2Scores, currentHole,
    });
  }, [p1Scores, p2Scores, currentHole, p2, view]); // eslint-disable-line

  const setScore = (isP1, holeIdx, val) => {
    haptic('light');
    const setter = isP1 ? setP1Scores : setP2Scores;
    setter(prev => { const next = [...prev]; next[holeIdx] = Math.max(1, val); return next; });
  };

  // Compute status live
  const status = p2
    ? calcMatchStatus(p1Scores, p2Scores, p1, p2, totalHoles)
    : { p1Holes: 0, p2Holes: 0, holesPlayed: 0, holesRemaining: totalHoles, holesUp: 0, leader: null, results: Array(totalHoles).fill(0), finished: false, allSquareFinished: false, dormie: false, winner: null };

  const handleNext = () => {
    haptic('medium');
    if (status.finished || currentHole >= totalHoles - 1) { setView('summary'); return; }
    setCurrentHole(h => Math.min(totalHoles - 1, h + 1));
  };

  const handleBack = () => {
    if (currentHole > 0) { haptic('light'); setCurrentHole(h => h - 1); }
  };

  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError('');
    try {
      let realRoundId = round.id;
      const isCasual = typeof round.id === 'string' && round.id.startsWith('casual-');

      if (isCasual) {
        const { data: newRound, error: rErr } = await supabase.from('rounds').insert({
          tournament_id: null, course_id: round.course_id,
          scheduled_date: new Date().toISOString().split('T')[0],
          total_holes: round.total_holes, starting_hole: round.starting_hole,
          status: 'complete', scoring_format: 'matchplay',
        }).select().single();
        if (rErr) throw rErr;
        realRoundId = newRound.id;
      }

      // Save each player's strokes + matchplay result metadata
      const rows = [
        { player: p1, scores: p1Scores, holeWins: status.p1Holes },
        { player: p2, scores: p2Scores, holeWins: status.p2Holes },
      ].map(({ player, scores, holeWins }) => {
        const won = (status.winner === 1 && player.id === p1.id) || (status.winner === 2 && player.id === p2.id);
        const lost = status.winner !== null && !won;
        return {
          round_id: realRoundId, player_id: player.id,
          scores,           // raw strokes per hole
          total_strokes: scores.reduce((a, b) => a + b, 0),
          vs_par: won ? -1 : lost ? 1 : 0,  // -1 win, 0 draw, +1 loss
          submitted_at: new Date().toISOString(),
          submitted_by: currentUser.id,
        };
      });

      const { error } = await supabase.from('round_scores').upsert(rows, { onConflict: 'round_id,player_id' });
      if (error) throw error;

      clearMPDraft(round.id, currentUser.id);
      setSavedRoundId(realRoundId);
      haptic('success');

      // Bag tag check
      const winner = status.winner === 1 ? p1 : status.winner === 2 ? p2 : null;
      setWinnerPlayer(winner);
      const tagged = [p1, p2].filter(p => (p?.bagTag ?? p?.bag_tag) != null);
      if (winner && tagged.length >= 2) { setView('bagtag'); return; }
      onComplete?.();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Views ──────────────────────────────────────────────────────────────────

  if (view === 'bagtag') {
    return <MPBagTagScreen p1={p1} p2={p2} winnerPlayer={winnerPlayer}
      onComplete={onComplete} updateUser={updateUser} currentUser={currentUser}
      roundId={savedRoundId} courseId={round.course_id} />;
  }

  if (view === 'summary') {
    return (
      <div style={pageStyle}>
        <MatchSummary p1={p1} p2={p2 || { id: '?', name: 'Opponent' }}
          p1Scores={p1Scores} p2Scores={p2Scores} pars={pars} status={status}
          onConfirm={handleSubmit} onBack={() => setView('scoring')}
          submitting={submitting} submitError={submitError}
          startingHole={round.starting_hole} />
        <GlobalStyles />
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div style={pageStyle}>
        <div style={{ padding: '52px 20px 20px', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><ChevronLeft size={22} /></button>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'white' }}>Match Play</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{course.name} · {totalHoles} holes</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Players</div>

          {/* P1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 14, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: BRAND.primary + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: BRAND.light }}>
              {p1.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{formatName(p1.name)} <span style={{ fontSize: 11, color: BRAND.light }}>you</span></div>
              {isJunior(p1) && <div style={{ fontSize: 11, color: '#60a5fa' }}>Junior (-1 handicap)</div>}
              {(p1.bagTag ?? p1.bag_tag) && <div style={{ fontSize: 11, color: '#fbbf24' }}>🏷️ #{p1.bagTag ?? p1.bag_tag}</div>}
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
                {isJunior(p2) && <div style={{ fontSize: 11, color: '#60a5fa' }}>Junior (-1 handicap)</div>}
                {(p2.bagTag ?? p2.bag_tag) && <div style={{ fontSize: 11, color: '#fbbf24' }}>🏷️ #{p2.bagTag ?? p2.bag_tag}</div>}
              </div>
              <button onClick={() => setP2(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
          ) : (
            <button onClick={() => setShowAddPlayer(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px', background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)',
              borderRadius: 14, marginBottom: 10, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: 14,
            }}>
              <UserPlus size={18} /> Add Opponent
            </button>
          )}

          <button onClick={() => setView('scoring')} disabled={!p2} style={{
            width: '100%', padding: '15px', borderRadius: 14, marginTop: 16,
            background: p2 ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'rgba(255,255,255,0.06)',
            border: p2 ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
            color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
            cursor: p2 ? 'pointer' : 'not-allowed',
          }}>
            Start Match →
          </button>
        </div>
        {showAddPlayer && (
          <AddPlayerModal
            allPlayers={allPlayers.filter(p => p.status === 'Active' || p.status === 'Junior')}
            currentPlayers={[p1]}
            onAdd={addOpponent}
            onClose={() => setShowAddPlayer(false)}
          />
        )}
        <GlobalStyles />
      </div>
    );
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  if (!p2) { setView('setup'); return null; }

  const par = pars[currentHole];
  const holeNum = currentHole + round.starting_hole;
  const holeResult = status.results[currentHole];
  const statusLabel = matchLabel(status);

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={() => setView('setup')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                {course.name} · Match Play
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
                Hole {holeNum} <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>of {totalHoles} · Par {par}</span>
              </div>
            </div>
            <button onClick={() => setView('summary')} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
              Summary
            </button>
          </div>

          {/* Match status pill */}
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: 20 }}>
            {status.leader === null
              ? <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>All Square</span>
              : <span style={{ fontSize: 14, fontWeight: 800, color: BRAND.light }}>
                  {formatName(status.leader === 1 ? p1.name : p2.name).split(' ')[0]}{' '}
                  <span style={{ color: 'white' }}>{statusLabel}</span>
                </span>
            }
            {status.finished && <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 8 }}>· Match over</span>}
          </div>

          {/* Hole progress dots */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 12 }}>
            {pars.map((_, i) => {
              const r = status.results[i];
              return (
                <button key={i} onClick={() => { haptic('light'); setCurrentHole(i); }} style={{
                  width: i === currentHole ? 22 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0,
                  background: i === currentHole ? BRAND.light
                    : r === 1 ? 'rgba(74,222,128,0.55)' : r === 2 ? 'rgba(248,113,113,0.55)'
                    : r === 3 ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.15)',
                  transform: i === currentHole ? 'scaleY(1.5)' : 'none',
                  transition: 'all 0.2s',
                }} />
              );
            })}
          </div>
        </div>
      </div>

      {/* Hole scoring */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Hole {holeNum} Scores
          </div>
          {holeResult === 3 && <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>= Halved</span>}
          {holeResult === 1 && <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>▲ {formatName(p1.name).split(' ')[0]} wins hole</span>}
          {holeResult === 2 && <span style={{ fontSize: 12, color: '#f87171', fontWeight: 700 }}>▲ {formatName(p2.name).split(' ')[0]} wins hole</span>}
        </div>

        <StrokeRow player={p1} score={p1Scores[currentHole]} par={par}
          onChange={val => setScore(true, currentHole, val)}
          holeResult={holeResult} isP1={true} opponent={p2} />

        <StrokeRow player={p2} score={p2Scores[currentHole]} par={par}
          onChange={val => setScore(false, currentHole, val)}
          holeResult={holeResult} isP1={false} opponent={p1} />

        {/* Running hole wins */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, marginTop: 4 }}>
          {[{ player: p1, wins: status.p1Holes }, { player: p2, wins: status.p2Holes }].map(({ player, wins }, pi) => {
            const leading = status.leader === (pi + 1);
            return (
              <div key={player.id} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: leading ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${leading ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{formatName(player.name).split(' ')[0]}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: leading ? '#4ade80' : 'rgba(255,255,255,0.35)', lineHeight: 1 }}>{wins}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>holes won</div>
              </div>
            );
          })}
        </div>

        {/* Scorecard */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Scorecard</div>
          <Scorecard p1={p1} p2={p2} p1Scores={p1Scores} p2Scores={p2Scores} pars={pars}
            status={status} currentHole={currentHole} onHoleClick={i => { haptic('light'); setCurrentHole(i); }}
            startingHole={round.starting_hole} />
        </div>
      </div>

      {/* Navigation */}
      <div style={{ position: 'fixed', bottom: 70, left: 0, right: 0, padding: '12px 20px', background: 'rgba(7,20,7,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10 }}>
          <button onClick={handleBack} disabled={currentHole === 0} style={{
            flex: 1, padding: '14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: currentHole === 0 ? 'rgba(255,255,255,0.2)' : 'white',
            fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
            cursor: currentHole === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={handleNext} style={{
            flex: 2, padding: '14px', borderRadius: 14,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            border: '1px solid rgba(74,222,128,0.3)', color: 'white',
            fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {status.finished || currentHole >= totalHoles - 1
              ? <><Check size={15} /> Finish Match</>
              : <>Next Hole <ChevronRight size={16} /></>
            }
          </button>
        </div>
      </div>
      <GlobalStyles />
    </div>
  );
};
