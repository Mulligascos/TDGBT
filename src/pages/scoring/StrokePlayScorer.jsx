import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, haptic } from '../../utils';
import {
  parsToArray, totalPar, calcVsPar, calcAdjustedStrokes, physicalBasket,
  vsParLabel, vsParColor, isJunior, applyHandicap,
} from '../../utils/strokeplay';
import { ChevronLeft, ChevronRight, Plus, Minus, Check, X, UserPlus, UserMinus, Tag, MapPin, Target } from 'lucide-react';
import { resolveBagTagChallenge, persistBagTagChallenge } from '../../utils/bagTags';


// ─── CTP HELPERS ─────────────────────────────────────────────────────────────
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const fmtDist = (m) => m < 1 ? `${Math.round(m*100)}cm` : m < 10 ? `${m.toFixed(2)}m` : `${m.toFixed(1)}m`;

// ─── DRAFT PERSISTENCE ────────────────────────────────────────────────────────
const DRAFT_KEY = (roundId, userId) => `tdg-draft-${roundId}-${userId}`;

export const saveDraft = (roundId, userId, draft) => {
  try {
    localStorage.setItem(DRAFT_KEY(roundId, userId), JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString(),
    }));
  } catch {}
};

export const loadDraft = (roundId, userId) => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(roundId, userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const clearDraft = (roundId, userId) => {
  try { localStorage.removeItem(DRAFT_KEY(roundId, userId)); } catch {}
};

export const listDrafts = () => {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('tdg-draft-'))
      .map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch { return []; }
};

// ─── PLAYER SCORE ROW ─────────────────────────────────────────────────────────
const PlayerRow = ({ player, score, par, onChange, isCurrentHole }) => {
  const adjusted = score != null ? applyHandicap(score, player) : null;
  const diff = adjusted != null ? adjusted - par : null;
  const junior = isJunior(player);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      opacity: isCurrentHole ? 1 : 0.85,
    }}>
      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {formatName(player.name)}
          {junior && (
            <span style={{ fontSize: 9, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>J</span>
          )}
          {player.isGuest && (
            <span style={{ fontSize: 9, background: 'rgba(148,163,184,0.2)', color: '#94a3b8', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>GUEST</span>
          )}
        </div>
        {adjusted != null && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            {junior ? `${score} → ${adjusted} (handicap)` : `${score} strokes`}
          </div>
        )}
      </div>

      {/* +/- controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => { haptic('light'); onChange(Math.max(1, (score || par) - 1)); }} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--bg-input)', border: '1px solid var(--border-card)',
          color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Minus size={16} />
        </button>

        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: diff == null ? 'var(--bg-card)' :
            diff < 0 ? 'rgba(74,222,128,0.15)' :
            diff === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
          border: `1px solid ${diff == null ? 'var(--border)' :
            diff < 0 ? 'rgba(74,222,128,0.3)' :
            diff === 0 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
          color: diff == null ? 'var(--text-muted)' :
            diff < 0 ? '#4ade80' : diff === 0 ? '#fbbf24' : '#f87171',
        }}>
          {score ?? '—'}
        </div>

        <button onClick={() => { haptic('light'); onChange((score || par) + 1); }} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--bg-input)', border: '1px solid var(--border-card)',
          color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer',
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
  const [tab, setTab] = useState('members'); // 'members' | 'guest'
  const [search, setSearch] = useState('');
  const [guestName, setGuestName] = useState('');
  const available = allPlayers.filter(p =>
    !currentPlayers.find(cp => cp.id === p.id) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    haptic('light');
    onAdd({ id: `guest-${Date.now()}`, name, isGuest: true });
    onClose();
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        background: 'var(--bg-nav)', borderTop: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0', padding: '20px',
        width: '100%', maxWidth: 520, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Add Player
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['members', '👥 Members'], ['guest', '🙋 Guest']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '8px', borderRadius: 10,
              background: tab === id ? BRAND.primary : 'var(--bg-input)',
              border: `1px solid ${tab === id ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
              color: tab === id ? '#ffffff' : 'var(--text-secondary)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>

        {tab === 'members' ? (
          <>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                background: 'var(--bg-input)', border: '1px solid var(--border-card)',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {available.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  No members available
                </p>
              ) : (
                available.map(p => (
                  <button key={p.id} onClick={() => { haptic('light'); onAdd(p); onClose(); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 16px', marginBottom: 6,
                    color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
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
          </>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              Guest scores are saved with the round but don't count toward club stats or bag tags.
            </div>
            <input
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addGuest()}
              placeholder="Guest name..."
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 14,
                background: 'var(--bg-input)', border: '1px solid var(--border-card)',
                color: 'var(--text-primary)', fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button onClick={addGuest} disabled={!guestName.trim()} style={{
              width: '100%', padding: '13px', borderRadius: 12,
              background: guestName.trim() ? 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))' : 'var(--text-muted)',
              border: `1px solid ${guestName.trim() ? 'rgba(74,222,128,0.3)' : 'var(--text-muted)'}`,
              color: guestName.trim() ? '#4ade80' : 'var(--text-muted)',
              fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: guestName.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <UserPlus size={16} /> Add {guestName.trim() || 'Guest'}
            </button>
          </div>
        )}
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
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Review Scorecard
        </h2>
      </div>

      {/* Leaderboard */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Player</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Strokes</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, width: 36, textAlign: 'right' }}>+/-</span>
          </div>
        </div>
        {rows.map((row, i) => (
          <div key={row.player.id} style={{
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            background: i === 0 ? 'rgba(74,222,128,0.04)' : 'transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: i === 0 ? BRAND.light : 'var(--bg-subtle2)',
                color: i === 0 ? '#052e0f' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>{i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatName(row.player.name)}</span>
              {isJunior(row.player) && <span style={{ fontSize: 9, color: '#fbbf24', fontWeight: 700 }}>J</span>}
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{row.total}</span>
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
              <td style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 700 }}>Hole</td>
              {pars.map((_, i) => (
                <td key={i} style={{ padding: '6px 4px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 700 }}>{i + 1}</td>
              ))}
              <td style={{ padding: '6px 8px', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 700 }}>Tot</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', color: 'var(--text-muted)', fontSize: 10 }}>Par</td>
              {pars.map((p, i) => (
                <td key={i} style={{ padding: '4px', color: 'var(--text-muted)', textAlign: 'center', fontSize: 10 }}>{p}</td>
              ))}
              <td style={{ padding: '4px 8px', color: 'var(--text-muted)', textAlign: 'right', fontSize: 10 }}>{totalPar(pars)}</td>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.player.id}>
                <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {formatName(row.player.name)}
                </td>
                {row.adjusted.map((s, i) => (
                  <td key={i} style={{
                    padding: '6px 4px', textAlign: 'center',
                    color: s == null ? 'var(--text-muted)' :
                      s < pars[i] ? '#4ade80' : s === pars[i] ? 'var(--text-primary)' : '#f87171',
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
        border: `1px solid rgba(74,222,128,0.3)`, color: '#ffffff',
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

// ─── BAG TAG CHALLENGE SCREEN ─────────────────────────────────────────────────
const BagTagChallengeScreen = ({ result, course, currentUser, roundId, courseId, onComplete, updateUser }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { eligible, winner, swaps, isTie, scoredPlayers } = result;
  const tagsSorted = [...eligible].map(p => Number(p.bagTag)).sort((a, b) => a - b);

  // Build initial finishing order from scores, preserving score groups
  const buildInitialOrder = () => {
    return [...eligible].sort((a, b) => {
      if (a.vs_par !== b.vs_par) return a.vs_par - b.vs_par;
      return Number(a.bagTag) - Number(b.bagTag); // tiebreak default: lower tag wins
    });
  };

  const [order, setOrder] = useState(buildInitialOrder);

  // Compute which positions are tied (same vs_par, adjacent in order)
  const tiedPositions = new Set();
  order.forEach((p, i) => {
    if (i > 0 && p.vs_par === order[i - 1].vs_par) {
      tiedPositions.add(i - 1);
      tiedPositions.add(i);
    }
  });
  const hasTies = tiedPositions.size > 0;

  // Derive swaps from current order
  const effectiveSwaps = order.map((player, i) => ({
    player,
    tagBefore: Number(player.bagTag),
    tagAfter: tagsSorted[i],
  }));
  const hasSwap = effectiveSwaps.some(s => s.tagBefore !== s.tagAfter);
  const effectiveWinner = order[0];

  const moveUp = (i) => {
    if (i === 0) return;
    const next = [...order];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setOrder(next);
  };

  const moveDown = (i) => {
    if (i === order.length - 1) return;
    const next = [...order];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setOrder(next);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await persistBagTagChallenge({
        roundId, courseId,
        challengeDate: new Date().toISOString().split('T')[0],
        swaps: effectiveSwaps,
        winner: effectiveWinner,
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

  const vsParLabel = (v) => v === 0 ? 'E' : v > 0 ? `+${v}` : `${v}`;
  const vsParColor = (v) => v < 0 ? '#4ade80' : v === 0 ? '#fbbf24' : '#f87171';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #92400e, #d97706)', padding: '52px 20px 24px', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏷️</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            Bag Tag Challenge!
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            {eligible.length} tagged players · {course?.name}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>

        {/* Tie notice */}
        {hasTies && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🤝</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 2 }}>Tied positions detected</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Use the arrows to set the final finishing order for tied players (e.g. after a playoff hole). Tags are assigned top to bottom.
              </div>
            </div>
          </div>
        )}

        {/* Finishing order */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          Finishing Order
        </div>
        {order.map((p, i) => {
          const isTied = tiedPositions.has(i);
          const canUp = i > 0 && p.vs_par === order[i - 1].vs_par;
          const canDown = i < order.length - 1 && p.vs_par === order[i + 1].vs_par;
          const tagAfter = tagsSorted[i];
          const tagChanged = Number(p.bagTag) !== tagAfter;
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              marginBottom: 8, borderRadius: 14,
              background: isTied ? 'rgba(251,191,36,0.06)' : i === 0 ? 'rgba(74,222,128,0.06)' : 'var(--bg-card)',
              border: `1px solid ${isTied ? 'rgba(251,191,36,0.3)' : i === 0 ? 'rgba(74,222,128,0.2)' : 'var(--border-card)'}`,
            }}>
              {/* Position */}
              <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 18 : 13, color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                {isTied ? '🤝' : (medals[i] || `${i + 1}`)}
              </div>

              {/* Name + score */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatName(p.name)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {p.total_strokes} strokes · <span style={{ color: vsParColor(p.vs_par), fontWeight: 700 }}>{vsParLabel(p.vs_par)}</span>
                  {' · '}🏷️ #{p.bagTag}
                </div>
              </div>

              {/* Tag outcome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{
                  minWidth: 36, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: tagChanged ? 'rgba(248,113,113,0.15)' : 'var(--bg-input)',
                  border: `1px solid ${tagChanged ? 'rgba(248,113,113,0.35)' : 'var(--border)'}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: tagChanged ? '#f87171' : 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>#{p.bagTag}</span>
                </div>
                <div style={{ width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tagChanged
                    ? <span style={{ fontSize: 14, color: '#fbbf24' }}>➜</span>
                    : <span style={{ display: 'block', width: 12, height: 2, borderRadius: 2, background: 'var(--text-muted)' }} />
                  }
                </div>
                <div style={{
                  minWidth: 36, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: tagChanged ? 'rgba(74,222,128,0.15)' : 'var(--bg-input)',
                  border: `1px solid ${tagChanged ? 'rgba(74,222,128,0.35)' : 'var(--border)'}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: tagChanged ? '#4ade80' : 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>#{tagAfter}</span>
                </div>
              </div>

              {/* Up/Down arrows — only shown for tied players */}
              {(canUp || canDown) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => moveUp(i)} disabled={!canUp} style={{
                    width: 28, height: 26, borderRadius: 6, border: 'none', cursor: canUp ? 'pointer' : 'default',
                    background: canUp ? 'rgba(251,191,36,0.15)' : 'transparent',
                    color: canUp ? '#fbbf24' : 'transparent', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>▲</button>
                  <button onClick={() => moveDown(i)} disabled={!canDown} style={{
                    width: 28, height: 26, borderRadius: 6, border: 'none', cursor: canDown ? 'pointer' : 'default',
                    background: canDown ? 'rgba(251,191,36,0.15)' : 'transparent',
                    color: canDown ? '#fbbf24' : 'transparent', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>▼</button>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ height: 20 }} />

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleConfirm} disabled={saving} style={{
          width: '100%', padding: '16px', borderRadius: 14, marginBottom: 10,
          background: 'linear-gradient(135deg, #92400e, #d97706)',
          border: '1px solid rgba(251,191,36,0.3)', color: '#ffffff',
          fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}>
          🏷️ {saving ? 'Saving...' : hasSwap ? 'Confirm Tag Swap' : 'Confirm — No Swap'}
        </button>

        <button onClick={() => onComplete?.()} style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: 'transparent', border: '1px solid var(--border-card)',
          color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer',
        }}>
          Skip — record scores only
        </button>

      </div>
    </div>
  );
};


// ─── MAIN SCORECARD PAGE ──────────────────────────────────────────────────────
export const StrokePlayScorer = ({ round, course, allPlayers, currentUser, onComplete, onBack, updateUser }) => {
  const pars = parsToArray(
    typeof course.pars === 'string' ? JSON.parse(course.pars) : course.pars,
    round.starting_hole, round.total_holes
  );

  // Restore from draft if one exists
  const existingDraft = loadDraft(round.id, currentUser.id);

  const [cardPlayers, setCardPlayers] = useState(() => {
    if (existingDraft?.cardPlayers?.length) return existingDraft.cardPlayers;
    return [currentUser];
  });
  const [scores, setScores] = useState(() => {
    if (existingDraft?.scores) return existingDraft.scores;
    return { [currentUser.id]: pars.map(p => p) };
  });
  const [currentHole, setCurrentHole] = useState(existingDraft?.currentHole ?? 0);
  const [view, setView] = useState('scoring'); // scoring | summary | challenge
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);
  const [savedRoundId, setSavedRoundId] = useState(null);
  const [savedCourseId, setSavedCourseId] = useState(null);
  const [resumedFromDraft] = useState(!!existingDraft);


  // ─── CTP state ──────────────────────────────────────────────────────────────
  const [ctpChallenges, setCtpChallenges] = useState([]);
  const [ctpSheet, setCtpSheet] = useState(false);   // bottom sheet open
  const [ctpPos, setCtpPos]     = useState(null);    // captured disc GPS
  const [ctpGpsLoading, setCtpGpsLoading] = useState(false);
  const [ctpGpsError, setCtpGpsError]     = useState('');
  const [ctpSubmitting, setCtpSubmitting] = useState(false);
  const [ctpToast, setCtpToast]           = useState('');

  const showCtpToast = (msg) => { setCtpToast(msg); setTimeout(() => setCtpToast(''), 3500); };

  // Load active CTP challenges for this course
  React.useEffect(() => {
    if (!round.course_id) return;
    supabase.from('ctp_challenges')
      .select('*')
      .eq('status', 'active')
      .eq('course_id', round.course_id)
      .then(({ data }) => setCtpChallenges(data || []));
  }, [round.course_id]);

  // Challenge matching current hole (1-indexed)
  const courseHoles = Object.keys(typeof course.pars === 'string' ? JSON.parse(course.pars) : (course.pars || {})).length || 9;
  const currentBasket = physicalBasket(currentHole, round.starting_hole || 1, courseHoles);
  const is9HoleTwice = round.total_holes === 18 && courseHoles === 9;
  const currentHoleNum = currentBasket; // for CTP matching
  const ctpForHole = ctpChallenges.find(c => c.hole === currentHoleNum);

  const captureCtpGps = () => {
    setCtpGpsLoading(true); setCtpGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCtpGpsLoading(false); setCtpPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }); },
      (err) => { setCtpGpsLoading(false); setCtpGpsError(err.code === 1 ? 'Location permission denied' : 'Could not get location'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const submitCtpShot = async () => {
    if (!ctpPos || !ctpForHole) return;
    setCtpSubmitting(true);
    const dist = haversineDistance(ctpForHole.pin_lat, ctpForHole.pin_lng, ctpPos.lat, ctpPos.lng);
    const { error } = await supabase.from('ctp_entries').upsert({
      challenge_id: ctpForHole.id,
      player_id: currentUser.id,
      player_name: currentUser.name,
      disc_lat: ctpPos.lat,
      disc_lng: ctpPos.lng,
      distance_m: dist,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,player_id' });
    setCtpSubmitting(false);
    if (!error) {
      setCtpSheet(false); setCtpPos(null);
      showCtpToast(`🎯 CTP recorded! ${fmtDist(dist)} from pin`);
    }
  };

  const [visitedHoles, setVisitedHoles] = useState(() =>
    existingDraft?.visitedHoles ? new Set(existingDraft.visitedHoles) : new Set([0])
  );

  // Auto-save draft on every change
  const { useEffect: ue, useRef: ur } = React;
  React.useEffect(() => {
    saveDraft(round.id, currentUser.id, {
      roundId: round.id,
      userId: currentUser.id,
      courseId: round.course_id,
      courseName: course.name,
      startingHole: round.starting_hole || 1,
      totalHoles: round.total_holes || 18,
      currentHole,
      cardPlayers,
      scores,
      visitedHoles: [...visitedHoles],
    });
  }, [scores, currentHole, cardPlayers]);  // eslint-disable-line

  const par = pars[currentHole];
  const totalHoles = pars.length;
  const isLastHole = currentHole === totalHoles - 1;
  const allScored = true; // all holes default to par so always ready to advance

  const setScore = useCallback((playerId, holeIdx, val) => {
    setScores(prev => {
      const arr = [...(prev[playerId] || Array(totalHoles).fill(null))];
      arr[holeIdx] = val;
      return { ...prev, [playerId]: arr };
    });
  }, [totalHoles]);

  const addPlayer = (player) => {
    setCardPlayers(prev => [...prev, player]);
    setScores(prev => ({ ...prev, [player.id]: pars.map(p => p) }));  // default to par
  };

  const removePlayer = (playerId) => {
    if (cardPlayers.length <= 1) return;
    setCardPlayers(prev => prev.filter(p => p.id !== playerId));
    setScores(prev => { const n = { ...prev }; delete n[playerId]; return n; });
  };

  const goToHole = (idx) => {
    haptic('light');
    const next = Math.max(0, Math.min(totalHoles - 1, idx));
    setCurrentHole(next);
    setVisitedHoles(prev => new Set([...prev, next]));
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
        const isGuest = p.isGuest === true;
        const playerScores = scores[p.id] || [];
        const adjusted = playerScores.map(s => s != null ? applyHandicap(s, p) : null);
        const total = adjusted.filter(s => s != null).reduce((a, b) => a + b, 0);
        const vp = calcVsPar(adjusted, pars);
        return {
          round_id: realRoundId,
          player_id: isGuest ? null : p.id,
          guest_name: isGuest ? p.name : null,
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
      clearDraft(round.id, currentUser.id);

      // ── Bag Tag Challenge Detection ──────────────────────────
      // Guests don't participate in bag tag challenges
      const scoredPlayers = cardPlayers.filter(p => !p.isGuest).map(p => {
        const playerScores = scores[p.id] || [];
        const adjusted = playerScores.map(s => s != null ? applyHandicap(s, p) : null);
        const total = adjusted.filter(s => s != null).reduce((a, b) => a + b, 0);
        const vp = calcVsPar(adjusted, pars);
        return { ...p, vs_par: vp, total_strokes: total };
      });

      const challenge = resolveBagTagChallenge(scoredPlayers);
      if (challenge) {
        setSavedRoundId(realRoundId);
        setSavedCourseId(round.course_id);
        setChallengeResult({ ...challenge, scoredPlayers });
        setView('challenge');
        setSubmitting(false);
      } else {
        onComplete?.();
      }
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'Failed to save scorecard. Please try again.');
      setSubmitting(false);
    }
  };

  if (view === 'challenge' && challengeResult) {
    return (
      <div style={pageStyle}>
        <BagTagChallengeScreen
          result={challengeResult}
          course={course}
          currentUser={currentUser}
          roundId={savedRoundId}
          courseId={savedCourseId}
          onComplete={onComplete}
          updateUser={updateUser}
        />
        <GlobalStyles />
      </div>
    );
  }

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
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={onBack} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                {course.name}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                Hole {currentHole + 1}
                {is9HoleTwice && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', marginLeft: 6, background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, padding: '2px 10px', borderRadius: 10, border: `1px solid ${BRAND.light}40` }}>
                    Basket {currentBasket}
                  </span>
                )}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}> of {totalHoles}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Par</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{par}</div>
            </div>
          </div>

          {/* Hole progress dots */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {pars.map((_, i) => {
              const visited = visitedHoles.has(i);
              return (
                <button key={i} onClick={() => goToHole(i)} style={{
                  width: 22, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0,
                  background: i === currentHole ? BRAND.light :
                    visited ? 'rgba(74,222,128,0.4)' : 'var(--text-muted)',
                  transform: i === currentHole ? 'scaleY(1.5)' : 'none',
                  transition: 'all 0.2s',
                }} />
              );
            })}
          </div>
        </div>

          {/* CTP indicator */}
          {ctpForHole && (
            <button onClick={() => { setCtpSheet(true); setCtpPos(null); setCtpGpsError(''); }} style={{
              width: '100%', marginTop: 10, padding: '9px 14px',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <Target size={14} color="#fbbf24" />
              <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                🎯 Virtual CTP active — tap to record your shot
              </span>
            </button>
          )}

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
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
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
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Running Totals
          </div>
          {cardPlayers.map(p => {
            const playerScores = scores[p.id] || [];
            const isGuest = p.isGuest === true;
            const adjusted = playerScores.slice(0, currentHole + 1).map(s => s != null ? applyHandicap(s, p) : null);
            const vp = calcVsPar(adjusted, pars.slice(0, currentHole + 1));
            const holesPlayed = adjusted.filter(s => s != null).length;
            if (holesPlayed === 0) return null;
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {formatName(p.name)}
                  {p.isGuest && <span style={{ fontSize: 9, background: 'rgba(148,163,184,0.15)', color: '#94a3b8', padding: '1px 5px', borderRadius: 4, fontWeight: 700, marginLeft: 5 }}>GUEST</span>}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: vsParColor(vp) }}>{vsParLabel(vp)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        position: 'fixed', bottom: 70, left: 0, right: 0,
        padding: '12px 20px', background: 'var(--bg-nav)',
        borderTop: '1px solid var(--border)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10 }}>
          <button onClick={() => goToHole(currentHole - 1)} disabled={currentHole === 0} style={{
            flex: 1, padding: '13px', borderRadius: 14,
            background: 'var(--bg-input)', border: '1px solid var(--border-card)',
            color: currentHole === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
            fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
            cursor: currentHole === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <ChevronLeft size={18} /> Prev
          </button>

          {isLastHole ? (
            <button onClick={() => setView('summary')} style={{
              flex: 2, padding: '13px', borderRadius: 14,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              border: `1px solid ${BRAND.light}40`, color: '#ffffff',
              fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Check size={18} /> Review Card
            </button>
          ) : (
            <button onClick={() => goToHole(currentHole + 1)} style={{
              flex: 2, padding: '13px', borderRadius: 14,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              border: `1px solid ${BRAND.light}40`, color: '#ffffff',
              fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <GlobalStyles />

      {/* CTP Toast */}
      {ctpToast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, color: '#ffffff', padding: '12px 20px', borderRadius: 14,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
          whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {ctpToast}
        </div>
      )}

      {/* CTP Bottom Sheet */}
      {ctpSheet && ctpForHole && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setCtpSheet(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'relative', background: 'var(--bg-nav)', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 40px', maxWidth: 520, width: '100%', margin: '0 auto',
            border: '1px solid var(--border-card)', borderBottom: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                  🎯 {ctpForHole.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Hole {ctpForHole.hole} · Virtual CTP</div>
              </div>
              <button onClick={() => setCtpSheet(false)} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              🥏 Throw your disc, walk to where it landed, then tap the button below.
            </div>
            <button onClick={captureCtpGps} disabled={ctpGpsLoading} style={{
              width: '100%', padding: '14px', borderRadius: 14, cursor: ctpGpsLoading ? 'wait' : 'pointer',
              background: ctpPos ? 'rgba(74,222,128,0.1)' : 'var(--text-muted)',
              border: '2px solid ' + (ctpPos ? 'rgba(74,222,128,0.4)' : 'var(--bg-card)'),
              color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: ctpPos ? 'rgba(74,222,128,0.2)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ctpGpsLoading
                  ? <div style={{ width: 16, height: 16, border: '2px solid var(--border-card)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : ctpPos ? <Check size={16} color="#4ade80" /> : <MapPin size={16} color="var(--text-muted)" />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: ctpPos ? '#4ade80' : 'var(--text-primary)' }}>
                  {ctpGpsLoading ? 'Getting location...' : ctpPos ? 'Position captured' : "I'm standing at my disc"}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {ctpPos
                    ? ('+-' + Math.round(ctpPos.acc) + 'm accuracy · ' + fmtDist(haversineDistance(ctpForHole.pin_lat, ctpForHole.pin_lng, ctpPos.lat, ctpPos.lng)) + ' from pin')
                    : 'Tap to capture GPS position'}
                </div>
              </div>
            </button>
            {ctpGpsError && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>⚠️ {ctpGpsError}</div>}
            {ctpPos && (
              <button onClick={submitCtpShot} disabled={ctpSubmitting} style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                background: BRAND.primary, color: '#ffffff', fontFamily: "'DM Sans', sans-serif",
                fontSize: 15, fontWeight: 800, cursor: ctpSubmitting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Target size={16} />
                {ctpSubmitting ? 'Submitting...' : ('Submit ' + fmtDist(haversineDistance(ctpForHole.pin_lat, ctpForHole.pin_lng, ctpPos.lat, ctpPos.lng)) + ' from pin')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', paddingBottom: 130,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; } body { background: var(--bg-base); color: var(--text-primary); }
    button { font-family: 'DM Sans', sans-serif; }
    button:active { transform: scale(0.97); }
  `}</style>
);
