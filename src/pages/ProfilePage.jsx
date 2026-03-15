import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate } from '../utils';
import { Badge, LogoWatermark } from '../components/ui';
import { ThemePicker } from '../components/ThemePicker';
import { vsParLabel, vsParColor } from '../utils/strokeplay';
import { ChevronLeft, Eye, EyeOff, Check, X, Edit2 } from 'lucide-react';

// ─── SHARED INPUT ─────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', placeholder = '', hint = '' }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
      {label}
    </div>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '13px 14px', borderRadius: 12,
        background: 'var(--bg-input)', border: '1px solid var(--border-card)',
        color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
        outline: 'none', boxSizing: 'border-box',
      }}
    />
    {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{hint}</div>}
  </div>
);

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
  }}>
    {children}
  </div>
);

// ─── MENU ITEM ────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, sub, onClick, danger = false }) => (
  <button onClick={onClick} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    background: danger ? 'rgba(248,113,113,0.06)' : 'var(--text-muted)',
    border: `1px solid ${danger ? 'rgba(248,113,113,0.2)' : 'var(--text-muted)'}`,
    borderRadius: 14, padding: '14px 16px',
    cursor: 'pointer', marginBottom: 8, textAlign: 'left',
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#f87171' : 'var(--text-primary)' }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
    </div>
    {!danger && <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>}
  </button>
);

// ─── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = 'success' }) => (
  <div style={{
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 200,
    background: type === 'error' ? '#dc2626' : '#16a34a',
    color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 14,
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
  }}>
    {type === 'error' ? <X size={16} /> : <Check size={16} />} {message}
  </div>
);

// ─── EDIT PROFILE VIEW ────────────────────────────────────────────────────────
const EditProfileView = ({ currentUser, onBack, onSaved }) => {
  const [form, setForm] = useState({
    name: currentUser.name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    pdgaNumber: currentUser.pdgaNumber || '',
    udiscUsername: currentUser.udiscUsername || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name cannot be empty.'); return; }
    setSaving(true);
    const { error: err } = await supabase
      .from('players')
      .update({
        player_name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        pdga_number: form.pdgaNumber.trim() || null,
        udisc_username: form.udiscUsername.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', currentUser.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved({
      ...currentUser,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      pdgaNumber: form.pdgaNumber.trim(),
      udiscUsername: form.udiscUsername.trim(),
    });
  };

  const isDirty =
    form.name !== (currentUser.name || '') ||
    form.email !== (currentUser.email || '') ||
    form.phone !== (currentUser.phone || '') ||
    form.pdgaNumber !== (currentUser.pdgaNumber || '') ||
    form.udiscUsername !== (currentUser.udiscUsername || '');

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
          Edit Profile
        </div>
      </div>

      {/* Avatar placeholder */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
          border: `2px solid ${BRAND.light}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif",
        }}>
          {form.name[0]?.toUpperCase() || '?'}
        </div>
      </div>

      {/* Personal */}
      <div style={{ marginBottom: 4 }}>
        <SectionTitle>Personal</SectionTitle>
        <Field label="Display Name" value={form.name} onChange={v => f('name', v)} placeholder="Your full name" />
        <Field label="Email" value={form.email} onChange={v => f('email', v)} type="email" placeholder="you@example.com" />
        <Field label="Phone" value={form.phone} onChange={v => f('phone', v)} type="tel" placeholder="+64 21 000 0000" />
      </div>

      {/* Disc golf */}
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Disc Golf</SectionTitle>
        <Field
          label="PDGA Number"
          value={form.pdgaNumber}
          onChange={v => f('pdgaNumber', v)}
          placeholder="e.g. 123456"
          hint="Your Professional Disc Golf Association membership number"
        />
        <Field
          label="UDisc Username"
          value={form.udiscUsername}
          onChange={v => f('udiscUsername', v)}
          placeholder="e.g. MarkC"
          hint="Your username on the UDisc app"
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#f87171',
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <X size={14} /> {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !isDirty}
        style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: isDirty
            ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`
            : 'var(--text-muted)',
          border: isDirty ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
          color: isDirty ? '#ffffff' : 'var(--text-muted)', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
          cursor: isDirty ? 'pointer' : 'not-allowed',
          opacity: saving ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

// ─── CHANGE PIN VIEW ──────────────────────────────────────────────────────────
const ChangePinView = ({ currentUser, onBack, onSuccess }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (currentPin !== String(currentUser.pin)) { setError('Current PIN is incorrect.'); return; }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setError('New PIN must be exactly 4 digits.'); return; }
    if (newPin !== confirmPin) { setError('New PINs do not match.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('players').update({ pin: newPin }).eq('player_id', currentUser.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSuccess('PIN updated successfully');
    onBack();
  };

  const inputStyle = {
    width: '100%', padding: '13px 14px', borderRadius: 12,
    background: 'var(--bg-input)', border: '1px solid var(--border-card)',
    color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 15,
    outline: 'none', letterSpacing: 4, boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
          Change PIN
        </div>
        <button onClick={() => setShowPins(s => !s)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          {showPins ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Current PIN</div>
        <input type={showPins ? 'text' : 'password'} maxLength={4} inputMode="numeric" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>New PIN</div>
        <input type={showPins ? 'text' : 'password'} maxLength={4} inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Confirm New PIN</div>
        <input type={showPins ? 'text' : 'password'} maxLength={4} inputMode="numeric" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" style={inputStyle} />
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <X size={14} /> {error}
        </div>
      )}

      <button onClick={handleSave} disabled={saving || !currentPin || !newPin || !confirmPin} style={{
        width: '100%', padding: '14px', borderRadius: 14,
        background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
        border: '1px solid rgba(74,222,128,0.3)', color: '#ffffff',
        fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
        cursor: 'pointer', opacity: (!currentPin || !newPin || !confirmPin) ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Check size={16} /> {saving ? 'Saving...' : 'Update PIN'}
      </button>
    </div>
  );
};

// ─── SEASON STATS ─────────────────────────────────────────────────────────────
const SeasonStats = ({ stats, onViewHistory }) => {
  const items = [
    { label: 'Rounds', value: stats.roundsPlayed, color: 'var(--text-primary)' },
    { label: 'Best Round', value: stats.bestRound != null ? vsParLabel(stats.bestRound) : '—', color: stats.bestRound != null ? vsParColor(stats.bestRound) : 'var(--text-muted)' },
    { label: 'Avg Score', value: stats.avgScore != null ? vsParLabel(stats.avgScore) : '—', color: stats.avgScore != null ? vsParColor(stats.avgScore) : 'var(--text-muted)' },
    { label: 'Under Par', value: stats.underParRounds, color: '#4ade80' },
  ];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {items.map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-card)', borderRadius: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne', sans-serif", lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </div>
      <button onClick={onViewHistory} style={{
        width: '100%', padding: '10px', borderRadius: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer',
      }}>
        View full history →
      </button>
    </div>
  );
};

// ─── MAIN PROFILE PAGE ────────────────────────────────────────────────────────

// ─── ACHIEVEMENTS ENGINE ──────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: 'first_round',    icon: '🎯', label: 'First Round',      desc: 'Completed your first round',               tier: 'bronze' },
  { id: 'under_par',      icon: '⭐', label: 'Under Par',        desc: 'Finished a round under par',               tier: 'bronze' },
  { id: 'birdie_machine', icon: '🐦', label: 'Birdie Machine',   desc: '3+ birdies in a single round',             tier: 'silver' },
  { id: 'eagle',          icon: '🦅', label: 'Eagle!',           desc: 'Scored an eagle (2 under on a hole)',      tier: 'gold'   },
  { id: 'ace',            icon: '🎳', label: 'Ace',              desc: 'Hole in one!',                             tier: 'gold'   },
  { id: 'hot_streak',     icon: '🔥', label: 'Hot Streak',       desc: '3 consecutive under-par rounds',           tier: 'silver' },
  { id: 'iron_man',       icon: '💪', label: 'Iron Man',         desc: 'Played 10+ rounds',                       tier: 'silver' },
  { id: 'round_winner',   icon: '🥇', label: 'Round Winner',     desc: 'Best score in a round',                   tier: 'gold'   },
  { id: 'consistent',     icon: '📅', label: 'Consistent',       desc: '5+ rounds in a single month',             tier: 'silver' },
  { id: 'veteran',        icon: '🏅', label: 'Veteran',          desc: 'Played 25+ rounds',                       tier: 'gold'   },
  { id: 'scratch',        icon: '💎', label: 'Scratch Player',   desc: 'Season average of even par or better',    tier: 'gold'   },
];

const TIER_COLORS = {
  bronze: { bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.35)', color: '#cd7f32' },
  silver: { bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.3)', color: '#c0c0c0' },
  gold:   { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.35)', color: '#fbbf24' },
};

const computeAchievements = (scores, allRoundScores, rounds) => {
  // Returns Map of achievementId -> { date, detail }
  const earned = new Map();
  const earn = (id, date, detail) => { if (!earned.has(id)) earned.set(id, { date, detail }); };
  if (!scores.length) return earned;

  const sorted = [...scores].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
  const roundsPlayed = sorted.length;
  const vsPars = sorted.map(s => s.vs_par ?? 0);

  // First round
  earn('first_round', sorted[0].submitted_at, 'You played your first round!');

  // Iron man / veteran
  if (roundsPlayed >= 10) earn('iron_man', sorted[9].submitted_at, `Reached ${roundsPlayed} rounds played`);
  if (roundsPlayed >= 25) earn('veteran', sorted[24].submitted_at, `Reached ${roundsPlayed} rounds played`);

  // Under par
  const firstUnder = sorted.find(s => (s.vs_par ?? 0) < 0);
  if (firstUnder) earn('under_par', firstUnder.submitted_at, `First under-par round: ${firstUnder.vs_par > 0 ? '+' : ''}${firstUnder.vs_par}`);

  // Hot streak — 3+ consecutive under par
  let streak = 0, streakStart = null;
  for (const s of sorted) {
    if ((s.vs_par ?? 0) < 0) {
      if (streak === 0) streakStart = s;
      streak++;
      if (streak >= 3) { earn('hot_streak', s.submitted_at, `${streak} consecutive under-par rounds`); break; }
    } else { streak = 0; streakStart = null; }
  }

  // Consistent — 5+ rounds in a month
  const byMonth = {};
  sorted.forEach(s => {
    const month = (s.submitted_at || '').slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(s);
  });
  Object.entries(byMonth).forEach(([month, monthScores]) => {
    if (monthScores.length >= 5) {
      const [y, m] = month.split('-');
      const label = new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      earn('consistent', monthScores[4].submitted_at, `${monthScores.length} rounds in ${label}`);
    }
  });

  // Scratch — season avg ≤ par
  if (roundsPlayed >= 5) {
    const avg = vsPars.reduce((a, b) => a + b, 0) / roundsPlayed;
    if (avg <= 0) earn('scratch', sorted[roundsPlayed - 1].submitted_at, `Season average: ${avg.toFixed(1)} vs par`);
  }

  // Round winner
  scores.forEach(s => {
    const roundOthers = allRoundScores.filter(r => r.round_id === s.round_id);
    if (roundOthers.length > 1) {
      const best = Math.min(...roundOthers.map(r => r.total_strokes || 999));
      if (s.total_strokes === best) earn('round_winner', s.submitted_at, `Shot ${s.total_strokes} strokes — best in the round`);
    }
  });

  // Hole-level — eagles, aces, birdie machine
  scores.forEach(s => {
    const round = rounds.find(r => r.id === s.round_id);
    const holeScores = Array.isArray(s.scores) ? s.scores : (s.scores ? JSON.parse(s.scores) : []);
    if (!holeScores.length || !round) return;
    let birdies = 0;
    holeScores.forEach((strokes, i) => {
      if (!strokes || strokes <= 0) return;
      const diff = strokes - 3;
      if (diff <= -2) earn('eagle', s.submitted_at, `Eagle on hole ${i + 1}!`);
      if (strokes === 1) earn('ace', s.submitted_at, `Hole-in-one on hole ${i + 1}!`);
      if (diff === -1) birdies++;
    });
    if (birdies >= 3) earn('birdie_machine', s.submitted_at, `${birdies} birdies in one round`);
  });

  return earned;
};

const computeStreaks = (scores) => {
  if (!scores.length) return { current: 0, underPar: 0, bestUnderPar: 0 };

  const sorted = [...scores].sort((a, b) =>
    new Date(b.submitted_at) - new Date(a.submitted_at) // newest first
  );

  // Current round streak — consecutive rounds (any score)
  // Treat rounds within 30 days of each other as continuous
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const daysDiff = (new Date(sorted[i-1].submitted_at) - new Date(sorted[i].submitted_at)) / 86400000;
    if (daysDiff <= 45) current++;
    else break;
  }

  // Best under-par streak
  const vsPars = [...scores]
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
    .map(s => s.vs_par ?? 0);

  let best = 0, cur = 0;
  for (const vp of vsPars) {
    if (vp < 0) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  }

  // Current under-par streak (from most recent)
  let currentUnder = 0;
  for (const s of sorted) {
    if ((s.vs_par ?? 0) < 0) currentUnder++;
    else break;
  }

  return { current, underPar: currentUnder, bestUnderPar: best };
};

// ─── ACHIEVEMENTS COMPONENT ───────────────────────────────────────────────────
const AchievementsSection = ({ currentUser }) => {
  const [scores, setScores] = useState([]);
  const [allRoundScores, setAllRoundScores] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  const [dbAchievements, setDbAchievements] = useState([]);
  const [dbAwards, setDbAwards] = useState([]);

  const load = useCallback(async () => {
    const [scoresRes, allRes, roundsRes, achievementsRes, awardsRes] = await Promise.allSettled([
      supabase.from('round_scores').select('*').eq('player_id', currentUser.id).order('submitted_at'),
      supabase.from('round_scores').select('round_id, player_id, total_strokes, vs_par'),
      supabase.from('rounds').select('id, course_id, total_holes'),
      supabase.from('achievements').select('*').eq('active', true).order('sort_order'),
      supabase.from('achievement_awards').select('*').eq('player_id', currentUser.id),
    ]);
    setScores(scoresRes.value?.data || []);
    setAllRoundScores(allRes.value?.data || []);
    setRounds(roundsRes.value?.data || []);
    setDbAchievements(achievementsRes.value?.data || []);
    setDbAwards(awardsRes.value?.data || []);
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
      Loading achievements...
    </div>
  );

  const computedEarned = computeAchievements(scores, allRoundScores, rounds);
  const streaks = computeStreaks(scores);

  // Merge: DB awards take precedence, then computed auto-awards
  // Use DB achievement definitions if available, fall back to hardcoded ACHIEVEMENTS
  const achievementDefs = dbAchievements.length > 0 ? dbAchievements.map(a => ({
    id: a.code, icon: a.icon, label: a.label, desc: a.description, tier: a.tier, dbId: a.id,
  })) : ACHIEVEMENTS;

  // Build merged earned map
  const earned = new Map(computedEarned);
  dbAwards.forEach(award => {
    const def = achievementDefs.find(a => a.dbId === award.achievement_id || a.id === award.achievement_id);
    if (def) earned.set(def.id, { date: award.earned_at, detail: award.detail || 'Awarded' });
  });

  const earnedList = achievementDefs.filter(a => earned.has(a.id));
  const lockedList = achievementDefs.filter(a => !earned.has(a.id));

  return (
    <div>
      {/* Achievement popup */}
      {popup && (
        <div onClick={() => setPopup(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-nav)', borderRadius: 20, padding: '24px 20px',
            maxWidth: 320, width: '100%', textAlign: 'center',
            border: `1px solid ${popup.earned ? TIER_COLORS[popup.tier].border : 'var(--text-muted)'}`,
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{popup.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: popup.earned ? TIER_COLORS[popup.tier].color : 'var(--text-secondary)', fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>
              {popup.label}
            </div>
            {popup.earned ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                  {popup.earnedData.detail}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Earned {formatDate(popup.earnedData.date)}
                </div>
                <div style={{
                  display: 'inline-block', marginTop: 10,
                  fontSize: 10, fontWeight: 700, color: TIER_COLORS[popup.tier].color,
                  textTransform: 'uppercase', letterSpacing: 1,
                  background: TIER_COLORS[popup.tier].bg, border: `1px solid ${TIER_COLORS[popup.tier].border}`,
                  padding: '3px 8px', borderRadius: 6,
                }}>{popup.tier}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                  {popup.desc}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  🔒 Not yet earned
                </div>
              </>
            )}
            <button onClick={() => setPopup(null)} style={{
              marginTop: 18, padding: '9px 24px', borderRadius: 10,
              background: 'var(--bg-input)', border: '1px solid var(--border-card)',
              color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, cursor: 'pointer',
            }}>Close</button>
          </div>
        </div>
      )}

      {/* Streaks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '🔥', label: 'Round Streak', value: streaks.current, sub: 'rounds played' },
          { icon: '📈', label: 'Under Par Streak', value: streaks.underPar, sub: streaks.bestUnderPar > 0 ? `best: ${streaks.bestUnderPar}` : 'keep going!' },
        ].map(({ icon, label, value, sub }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px',
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Earned badges */}
      {earnedList.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Earned · {earnedList.length}/{ACHIEVEMENTS.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {earnedList.map(a => {
              const tier = TIER_COLORS[a.tier];
              return (
                <div key={a.id} onClick={() => setPopup({ ...a, earned: true, earnedData: earned.get(a.id) })} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', gap: 4,
                  background: tier.bg, border: `1px solid ${tier.border}`,
                  borderRadius: 10, padding: '8px 4px', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tier.color, lineHeight: 1.2 }}>{a.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {lockedList.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Locked
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {lockedList.map(a => (
              <div key={a.id} onClick={() => setPopup({ ...a, earned: false })} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', gap: 4,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 4px',
                opacity: 0.4, cursor: 'pointer',
              }}>
                <span style={{ fontSize: 20, filter: 'grayscale(1)' }}>{a.icon}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {scores.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Play your first round to start earning achievements</div>
        </div>
      )}
    </div>
  );
};

export const ProfilePage = ({ currentUser, onLogout, onNavigate, updateUser, seasonStats, onThemeChange }) => {
  const [view, setView] = useState('main'); // main | edit | change-pin
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleProfileSaved = (updated) => {
    updateUser(updated);
    setView('main');
    showToast('Profile updated');
  };

  const divisionLabel = { Mixed: 'Mixed Open', Female: 'Female', Junior: 'Junior', Senior: 'Senior' };

  if (view === 'edit') {
    return (
      <div style={pageStyle}>
        <div style={{ paddingTop: 52 }}>
          <EditProfileView currentUser={currentUser} onBack={() => setView('main')} onSaved={handleProfileSaved} />
        </div>
        <GlobalStyles />
      </div>
    );
  }

  if (view === 'change-pin') {
    return (
      <div style={pageStyle}>
        <div style={{ paddingTop: 52 }}>
          <ChangePinView currentUser={currentUser} onBack={() => setView('main')} onSuccess={msg => showToast(msg)} />
        </div>
        <GlobalStyles />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Header */}
      <div style={{
        background: 'var(--bg-header)',
        padding: '36px 20px 16px',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid var(--border)',
      }}>
        <LogoWatermark size={110} opacity={0.08} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 0 }} />

        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              border: `2px solid ${BRAND.light}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif",
            }}>
              {currentUser.name[0].toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                {formatName(currentUser.name)}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Badge label={currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'committee' ? 'Committee' : 'Member'} color={currentUser.role === 'admin' ? '#fbbf24' : BRAND.light} />
                <Badge label={currentUser.status || 'Active'} color={currentUser.status === 'Active' ? BRAND.light : '#f87171'} />
                {currentUser.division && <Badge label={divisionLabel[currentUser.division] || currentUser.division} color="var(--text-secondary)" />}
              </div>
            </div>

            {/* Edit button */}
            <button onClick={() => setView('edit')} style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Edit2 size={16} />
            </button>
          </div>

          {/* Details row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {currentUser.bagTag && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: BRAND.light, fontFamily: "'Syne', sans-serif" }}>#{currentUser.bagTag}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Bag Tag</div>
              </div>
            )}
            {currentUser.pdgaNumber && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>{currentUser.pdgaNumber}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>PDGA</div>
              </div>
            )}
            {currentUser.udiscUsername && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>{currentUser.udiscUsername}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>UDisc</div>
              </div>
            )}
            {currentUser.email && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentUser.email}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Email</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Season stats */}
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>This Season</SectionTitle>
          {seasonStats ? (
            <SeasonStats stats={seasonStats} onViewHistory={() => onNavigate('history')} />
          ) : (
            <MenuItem icon="📊" label="My Stats" sub="Season performance & history" onClick={() => onNavigate('history')} />
          )}
        </div>

        {/* Achievements */}
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>Streaks & Achievements</SectionTitle>
          <AchievementsSection currentUser={currentUser} />
        </div>

        {/* Account */}
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>Appearance</SectionTitle>
          <ThemePicker onThemeChange={onThemeChange} />

          <SectionTitle>Account</SectionTitle>
          <MenuItem icon="✏️" label="Edit Profile" sub="Name, email, phone, PDGA & UDisc" onClick={() => setView('edit')} />
          <MenuItem icon="🔑" label="Change PIN" sub="Update your 4-digit login PIN" onClick={() => setView('change-pin')} />
        </div>

        {/* Sign out */}
        <button onClick={onLogout} style={{
          width: '100%', padding: '14px',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 14, color: '#f87171',
          fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          Sign Out
        </button>

      </div>
      <GlobalStyles />
    </div>
  );
};

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
    input::placeholder { color: var(--text-muted); }
  `}</style>
);
