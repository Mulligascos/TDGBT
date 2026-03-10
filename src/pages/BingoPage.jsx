import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate } from '../utils';
import { LogoWatermark } from '../components/ui';
import { Plus, Trophy, Grid, ChevronLeft, Trash2, Check } from 'lucide-react';

// ─── AUTO-CHECK ENGINE ────────────────────────────────────────────────────────
// Returns a Set of auto_keys that the player has achieved this season
const computeAutoKeys = async (playerId, seasonStart, seasonEnd) => {
  const achieved = new Set();
  const start = seasonStart;
  const end = seasonEnd;

  try {
    // Get all completed rounds for player in season
    const { data: myScores } = await supabase
      .from('round_scores')
      .select('round_id, scores, handicap')
      .eq('player_id', playerId);

    if (!myScores?.length) return achieved;
    const roundIds = myScores.map(s => s.round_id);

    const { data: rounds } = await supabase
      .from('rounds')
      .select('id, course_id, status, scheduled_date')
      .in('id', roundIds)
      .eq('status', 'complete')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end);

    if (!rounds?.length) return achieved;
    const seasonRoundIds = new Set(rounds.map(r => r.id));
    const seasonScores = myScores.filter(s => seasonRoundIds.has(s.round_id));

    // Get course pars for each round
    const courseIds = [...new Set(rounds.map(r => r.course_id))];
    const { data: courses } = await supabase
      .from('courses')
      .select('id, pars')
      .in('id', courseIds);
    const courseMap = {};
    (courses || []).forEach(c => { courseMap[c.id] = c; });

    // ── Check each auto key ──────────────────────────────────────────────────
    let totalBirdies = 0;
    let hasEagle = false;
    let hasAce = false;
    let maxConsecBirdies = 0;
    let uniqueCourses = new Set();
    let roundDates = [];

    for (const score of seasonScores) {
      const round = rounds.find(r => r.id === score.round_id);
      if (!round) continue;
      const course = courseMap[round.course_id];
      if (!course) continue;

      const pars = Array.isArray(course.pars) ? course.pars :
        (typeof course.pars === 'string' ? JSON.parse(course.pars) : []);
      const scores = Array.isArray(score.scores) ? score.scores :
        (typeof score.scores === 'string' ? JSON.parse(score.scores) : []);

      if (!pars.length || !scores.length) continue;

      uniqueCourses.add(round.course_id);
      roundDates.push(round.scheduled_date);

      let consecBirdies = 0;
      let roundTotal = 0;
      let roundPar = 0;

      for (let i = 0; i < Math.min(scores.length, pars.length); i++) {
        const s = scores[i];
        const p = pars[i];
        if (s == null || p == null) continue;
        roundTotal += s;
        roundPar += p;
        const diff = s - p;
        if (s === 1) { hasAce = true; achieved.add('ace'); }
        if (diff <= -2) { hasEagle = true; achieved.add('eagle'); }
        if (diff <= -1) {
          totalBirdies++;
          consecBirdies++;
          maxConsecBirdies = Math.max(maxConsecBirdies, consecBirdies);
        } else {
          consecBirdies = 0;
        }
      }
      if (roundTotal <= roundPar) achieved.add('under_par');
      if (roundTotal <= roundPar - 3) achieved.add('three_under');
    }

    if (totalBirdies >= 1)  achieved.add('birdie');
    if (totalBirdies >= 5)  achieved.add('five_birdies');
    if (hasEagle)           achieved.add('eagle');
    if (hasAce)             achieved.add('ace');
    if (maxConsecBirdies >= 3) achieved.add('turkey');
    if (uniqueCourses.size >= 2) achieved.add('two_courses');
    if (uniqueCourses.size >= 3) achieved.add('three_courses');
    if (seasonScores.length >= 3) achieved.add('three_rounds');
    if (seasonScores.length >= 5) achieved.add('five_rounds');
    if (seasonScores.length >= 10) achieved.add('ten_rounds');

    // 3 rounds in one week
    const dateCounts = {};
    roundDates.forEach(d => {
      const week = d ? d.substring(0, 8) + '0' : null; // rough week bucket
      if (week) dateCounts[week] = (dateCounts[week] || 0) + 1;
    });
    if (Object.values(dateCounts).some(n => n >= 3)) achieved.add('three_rounds_week');

  } catch (e) {
    console.error('Auto-check error:', e);
  }
  return achieved;
};

// ─── DEFAULT ITEMS ────────────────────────────────────────────────────────────
export const DEFAULT_BINGO_ITEMS = [
  { position: 0,  label: 'Score a Birdie',        icon: '🐦', type: 'auto',   auto_key: 'birdie',            description: 'Get a birdie in any round this season' },
  { position: 1,  label: 'Play in the Rain',       icon: '🌧️', type: 'manual', auto_key: null,                description: 'Complete a round in rainy conditions' },
  { position: 2,  label: 'Score an Eagle',         icon: '🦅', type: 'auto',   auto_key: 'eagle',             description: 'Get an eagle (-2) on any hole' },
  { position: 3,  label: 'Play Before 7am',        icon: '🌅', type: 'manual', auto_key: null,                description: 'Start a round before sunrise' },
  { position: 4,  label: 'Turkey! 3 in a Row',     icon: '🦃', type: 'auto',   auto_key: 'turkey',            description: '3 birdies in a row in one round' },
  { position: 5,  label: 'Play 3 Courses',         icon: '🗺️', type: 'auto',   auto_key: 'three_courses',     description: 'Play 3 different courses this season' },
  { position: 6,  label: 'Play with 4+ People',   icon: '👥', type: 'manual', auto_key: null,                description: 'Complete a round with a group of 4 or more' },
  { position: 7,  label: 'Throw 100m+',            icon: '💪', type: 'manual', auto_key: null,                description: 'Record a throw of over 100 metres' },
  { position: 8,  label: 'Finish Under Par',       icon: '✅', type: 'auto',   auto_key: 'under_par',         description: 'Complete a round at under par' },
  { position: 9,  label: 'Introduce a New Player', icon: '🤝', type: 'manual', auto_key: null,                description: 'Bring someone new to the club' },
  { position: 10, label: 'Find a Lost Disc',       icon: '🔍', type: 'manual', auto_key: null,                description: 'Return a lost disc to its owner via the app' },
  { position: 11, label: 'Play 5 Rounds',          icon: '📋', type: 'auto',   auto_key: 'five_rounds',       description: 'Complete 5 rounds this season' },
  { position: 12, label: '5 Birdies in a Round',   icon: '🐦', type: 'auto',   auto_key: 'five_birdies',      description: 'Score 5 or more birdies in a single round' },
  { position: 13, label: 'Play After 6pm',         icon: '🌆', type: 'manual', auto_key: null,                description: 'Complete a round after 6pm' },
  { position: 14, label: 'Hole in One!',           icon: '🎳', type: 'auto',   auto_key: 'ace',               description: 'Score an ace (hole in one) on any hole' },
  { position: 15, label: 'Beat Club Admin',        icon: '😏', type: 'manual', auto_key: null,                description: 'Beat the club admin in a casual round' },
  { position: 16, label: '3 Rounds in a Week',     icon: '📅', type: 'auto',   auto_key: 'three_rounds_week', description: 'Play 3 rounds in the same week' },
  { position: 17, label: 'Play in the Wind',       icon: '💨', type: 'manual', auto_key: null,                description: 'Complete a round in strong wind conditions' },
  { position: 18, label: 'One Disc Round',         icon: '🥏', type: 'manual', auto_key: null,                description: 'Complete a full round using only one disc' },
  { position: 19, label: 'Play a New Course',      icon: '🆕', type: 'manual', auto_key: null,                description: "Play a course you've never played before" },
  { position: 20, label: '3 Under Par',            icon: '🔥', type: 'auto',   auto_key: 'three_under',       description: 'Finish a round 3 or more under par' },
  { position: 21, label: 'Play on Birthday',       icon: '🎂', type: 'manual', auto_key: null,                description: 'Play a round on your birthday' },
  { position: 22, label: 'Throw In from 50m+',     icon: '🎯', type: 'manual', auto_key: null,                description: 'Make a throw-in from over 50 metres' },
  { position: 23, label: 'Complete 10 Rounds',     icon: '🏆', type: 'auto',   auto_key: 'ten_rounds',        description: 'Complete 10 rounds this season' },
]

// ─── BINGO CARD ───────────────────────────────────────────────────────────────
const BingoCard = ({ items, completions, onToggle, interactive }) => {
  const completed = new Set(completions.map(c => c.position));
  const totalCompleted = completed.size;
  const isComplete = totalCompleted === 24;

  return (
    <div>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 800, color: isComplete ? '#4ade80' : 'var(--text-primary)', fontSize: 16 }}>{totalCompleted}</span>
          <span style={{ color: 'var(--text-muted)' }}> / 24 squares</span>
        </div>
        {isComplete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '4px 12px' }}>
            <Trophy size={14} color="#4ade80" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#4ade80' }}>BINGO!</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(totalCompleted / 24) * 100}%`, background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.light})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>

      {/* 4x6 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {Array.from({ length: 24 }, (_, i) => {
          const item = items.find(it => it.position === i);
          if (!item) return <div key={i} style={{ aspectRatio: '0.85', background: 'var(--bg-card)', borderRadius: 10 }} />;
          const done = completed.has(i);
          const isAuto = item.type === 'auto';

          return (
            <button
              key={i}
              onClick={() => interactive && !isAuto && onToggle(item)}
              style={{
                aspectRatio: '0.85', borderRadius: 10, border: 'none',
                cursor: interactive && !isAuto ? 'pointer' : 'default',
                background: done ? 'rgba(74,222,128,0.15)' : 'var(--bg-card)',
                border: `1px solid ${done ? 'rgba(74,222,128,0.35)' : 'var(--border)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '8px 4px', position: 'relative', transition: 'all 0.15s',
              }}
            >
              {done && (
                <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, background: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={9} color="#052e0f" strokeWidth={3} />
                </div>
              )}
              <div style={{ fontSize: 22 }}>{item.icon}</div>
              <div style={{
                fontSize: 11.5, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                color: done ? '#4ade80' : 'var(--text-primary)',
                textAlign: 'center', lineHeight: 1.25, padding: '0 2px',
              }}>
                {item.label}
              </div>
              {isAuto && (
                <div style={{ position: 'absolute', bottom: 3, left: 4, width: 5, height: 5, borderRadius: '50%', background: done ? '#4ade80' : 'var(--text-muted)', opacity: 0.7 }} />
              )}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)' }} />
        Auto-tracked · tap manual squares to claim
      </div>
    </div>
  );
};

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
const Leaderboard = ({ seasonId, players }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('bingo_completions')
      .select('player_id, position')
      .eq('season_id', seasonId)
      .then(({ data }) => {
        const counts = {};
        (data || []).forEach(c => { counts[c.player_id] = (counts[c.player_id] || 0) + 1; });
        const sorted = Object.entries(counts)
          .map(([pid, count]) => ({ pid, count, name: players.find(p => p.id === pid)?.name || 'Unknown' }))
          .sort((a, b) => b.count - a.count);
        setRows(sorted);
        setLoading(false);
      });
  }, [seasonId, players]);

  if (loading) return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>;
  if (!rows.length) return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No completions yet</div>;

  return (
    <div>
      {rows.map((row, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        const isComplete = row.count === 24;
        return (
          <div key={row.pid} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 6,
            background: isComplete ? 'rgba(74,222,128,0.06)' : 'var(--bg-card)',
            border: `1px solid ${isComplete ? 'rgba(74,222,128,0.2)' : 'var(--border)'}`,
            borderRadius: 12,
          }}>
            <div style={{ fontSize: medal ? 20 : 13, fontWeight: 700, color: 'var(--text-muted)', width: 28, textAlign: 'center' }}>{medal || `${i + 1}`}</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatName(row.name)}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: isComplete ? '#4ade80' : 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                {isComplete ? '🏆 BINGO!' : `${row.count}/24`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── SHARED FORM COMPONENTS ──────────────────────────────────────────────────
const Inp = ({ style, ...props }) => (
  <input style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box', ...style }} {...props} />
);
const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{children}</div>
);

// ─── ADMIN BINGO SECTION ──────────────────────────────────────────────────────
export const BingoAdminSection = ({ currentUser, showToast }) => {
  const [seasons, setSeasons] = useState([]);
  const [view, setView] = useState('list'); // list | create | edit
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', starts_at: '', ends_at: '' });
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);

  const loadSeasons = useCallback(async () => {
    const { data } = await supabase.from('bingo_seasons').select('*').order('created_at', { ascending: false });
    setSeasons(data || []);
  }, []);

  useEffect(() => { loadSeasons(); }, [loadSeasons]);

  const loadItems = useCallback(async (seasonId) => {
    const { data } = await supabase.from('bingo_items').select('*').eq('season_id', seasonId).order('position');
    setItems(data || []);
  }, []);

  const createSeason = async () => {
    if (!form.name || !form.starts_at || !form.ends_at) { showToast('Fill in all fields', 'error'); return; }
    setSaving(true);
    const { data: season, error } = await supabase.from('bingo_seasons').insert({
      name: form.name, starts_at: form.starts_at, ends_at: form.ends_at,
      created_by: currentUser.id, status: 'active',
    }).select().single();
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }

    // Seed default items
    const toInsert = DEFAULT_BINGO_ITEMS.map(item => ({ ...item, season_id: season.id }));
    await supabase.from('bingo_items').insert(toInsert);
    setSaving(false);
    showToast('Season created with default items!');
    loadSeasons();
    setView('list');
    setForm({ name: '', starts_at: '', ends_at: '' });
  };

  const closeSeason = async (id) => {
    await supabase.from('bingo_seasons').update({ status: 'closed' }).eq('id', id);
    showToast('Season closed');
    loadSeasons();
  };

  const updateItem = async (item, changes) => {
    await supabase.from('bingo_items').update(changes).eq('id', item.id);
    loadItems(item.season_id);
  };

  if (view === 'create') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setView('list')} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>New Bingo Season</div>
      </div>
      <div style={{ marginBottom: 14 }}><Label>Season Name</Label><Inp value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Winter 2026" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div><Label>Start Date</Label><Inp type="date" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} /></div>
        <div><Label>End Date</Label><Inp type="date" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} /></div>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>📋 Default items will be seeded</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>25 squares will be pre-filled with the default bingo items. You can edit individual squares after creating the season.</div>
      </div>
      <button onClick={createSeason} disabled={saving} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: BRAND.primary, color: 'var(--text-on-brand)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? 'Creating...' : '✓ Create Season'}
      </button>
    </div>
  );

  if (view === 'edit' && selected) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => setView('list')} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Edit: {selected.name}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Tap a square label to edit it. Auto squares (●) are checked automatically from round data.</div>
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <input
              value={item.label}
              onChange={e => setItems(prev => prev.map(it => it.id === item.id ? { ...it, label: e.target.value } : it))}
              onBlur={e => updateItem(item, { label: e.target.value })}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, width: '100%', outline: 'none' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {item.type === 'auto' ? `⚡ Auto · ${item.auto_key}` : '👆 Manual'}
              {' · '}Pos {item.position + 1}
              {item.position === 12 ? ' (FREE)' : ''}
            </div>
          </div>
          <input
            value={item.icon}
            onChange={e => setItems(prev => prev.map(it => it.id === item.id ? { ...it, icon: e.target.value } : it))}
            onBlur={e => updateItem(item, { icon: e.target.value })}
            style={{ width: 44, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center', fontSize: 18, padding: '4px', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Bingo Seasons</div>
        <button onClick={() => setView('create')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> New Season
        </button>
      </div>
      {seasons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No seasons yet — create one to get started</div>
      ) : seasons.map(s => (
        <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(s.starts_at)} → {formatDate(s.ends_at)}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.status === 'active' ? '#4ade80' : 'var(--text-muted)', textTransform: 'uppercase' }}>{s.status === 'active' ? '🟢 Active' : '🔒 Closed'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setSelected(s); loadItems(s.id); setView('edit'); }} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ✏️ Edit Items
            </button>
            {s.status === 'active' && (
              <button onClick={() => closeSeason(s.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🔒 Close Season
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN BINGO PAGE ──────────────────────────────────────────────────────────
export const BingoPage = ({ currentUser, isAdmin, players }) => {
  const [season, setSeason] = useState(null);
  const [items, setItems] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('card'); // card | leaderboard
  const [detailItem, setDetailItem] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    // Get active season
    const { data: seasons } = await supabase.from('bingo_seasons')
      .select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    const activeSeason = seasons?.[0];
    if (!activeSeason) { setLoading(false); return; }
    setSeason(activeSeason);

    // Get items
    const { data: itemData } = await supabase.from('bingo_items')
      .select('*').eq('season_id', activeSeason.id).order('position');
    setItems(itemData || []);

    // Get existing completions for this player
    const { data: compData } = await supabase.from('bingo_completions')
      .select('*').eq('season_id', activeSeason.id).eq('player_id', currentUser.id);
    let currentCompletions = compData || [];

    // Auto-check — compute what player has achieved
    const autoKeys = await computeAutoKeys(currentUser.id, activeSeason.starts_at, activeSeason.ends_at);

    // Find auto items player should have but doesn't yet
    const completedPositions = new Set(currentCompletions.map(c => c.position));
    const toAdd = (itemData || []).filter(item =>
      item.type === 'auto' && item.auto_key && autoKeys.has(item.auto_key) && !completedPositions.has(item.position)
    );

    if (toAdd.length > 0) {
      const inserts = toAdd.map(item => ({
        season_id: activeSeason.id, player_id: currentUser.id,
        position: item.position, auto: true,
      }));
      const { data: newComps } = await supabase.from('bingo_completions').upsert(inserts, { onConflict: 'season_id,player_id,position' }).select();
      currentCompletions = [...currentCompletions, ...(newComps || [])];
    }

    setCompletions(currentCompletions);
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = (item) => setDetailItem(item);

  const claimItem = async (item) => {
    setClaiming(true);
    const alreadyDone = completions.some(c => c.position === item.position);
    if (alreadyDone) {
      // Unclaim
      await supabase.from('bingo_completions').delete()
        .eq('season_id', season.id).eq('player_id', currentUser.id).eq('position', item.position);
      setCompletions(prev => prev.filter(c => c.position !== item.position));
      showToast('Square unclaimed');
    } else {
      // Claim
      const { data } = await supabase.from('bingo_completions').upsert({
        season_id: season.id, player_id: currentUser.id, position: item.position, auto: false,
      }, { onConflict: 'season_id,player_id,position' }).select().single();
      if (data) {
        setCompletions(prev => [...prev, data]);
        showToast(`✅ "${item.label}" claimed!`);
        // Check if full card
        if (completions.length + 1 === 24) showToast('🏆 BINGO! Full card complete!');
      }
    }
    setDetailItem(null);
    setClaiming(false);
  };

  const isDone = detailItem && completions.some(c => c.position === detailItem.position);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', paddingBottom: 90 }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, color: '#ffffff', padding: '12px 20px', borderRadius: 14, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'var(--bg-header)', padding: '36px 20px 20px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <LogoWatermark size={110} opacity={0.07} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)' }} />
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>🎱 Off-Season</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>Disc Golf Bingo</div>
          {season && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{season.name} · ends {formatDate(season.ends_at)}</div>}
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['card', '🎱 My Card'], ['leaderboard', '🏆 Leaderboard']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: tab === val ? BRAND.primary : 'var(--bg-card)',
              border: `1px solid ${tab === val ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
              color: tab === val ? '#ffffff' : 'var(--text-secondary)',
              fontFamily: "'DM Sans', sans-serif",
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading your card...</div>
        ) : !season ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎱</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No active season</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ask your admin to create a bingo season</div>
          </div>
        ) : tab === 'card' ? (
          <BingoCard items={items} completions={completions} onToggle={handleToggle} interactive />
        ) : (
          <Leaderboard seasonId={season.id} players={players || []} />
        )}
      </div>

      {/* Item detail bottom sheet */}
      {detailItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setDetailItem(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'relative', background: 'var(--bg-nav)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxWidth: 520, width: '100%', margin: '0 auto', border: '1px solid var(--border-card)', borderBottom: 'none' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontSize: 40 }}>{detailItem.icon}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>{detailItem.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{detailItem.description}</div>
              </div>
            </div>
            {isDone ? (
              <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
                ✅ You've completed this square!
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => claimItem(detailItem)} disabled={claiming} style={{
                flex: 1, padding: '13px', borderRadius: 12, border: 'none', cursor: claiming ? 'wait' : 'pointer',
                background: isDone ? 'rgba(248,113,113,0.1)' : BRAND.primary,
                color: isDone ? '#f87171' : 'var(--text-on-brand)',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 800,
              }}>
                {claiming ? '...' : isDone ? '✗ Unclaim' : '✓ Claim Square'}
              </button>
              <button onClick={() => setDetailItem(null)} style={{ padding: '13px 18px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
