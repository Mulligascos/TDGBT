import React, { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, formatDate } from '../../utils';
import { Card, Badge, Button, Input, Select, SectionLabel, Divider, EmptyState, Toast } from '../../components/ui';
import { ChevronLeft, Plus, Settings, Users, Calendar, Trophy } from 'lucide-react';

// ─── TOURNAMENT CREATOR ───────────────────────────────────────────────────────
const CreateTournamentForm = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: '', format: 'strokeplay', start_date: '', end_date: '',
    description: '', count_rounds: 6,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name || !form.start_date) { setError('Name and start date are required.'); return; }
    setSaving(true);
    const { data, error: err } = await supabase.from('tournaments').insert({
      name: form.name, format: form.format,
      start_date: form.start_date, end_date: form.end_date || null,
      description: form.description,
      status: 'upcoming',
    }).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 8 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          New Tournament
        </h2>
      </div>

      <Input label="Tournament Name" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Winter League 2026" />

      <Select label="Format" value={form.format} onChange={e => f('format', e.target.value)}>
        <option value="strokeplay" style={{ background: 'var(--bg-nav)' }}>Stroke Play</option>
        <option value="matchplay" style={{ background: 'var(--bg-nav)' }}>Match Play</option>
        <option value="mixed" style={{ background: 'var(--bg-nav)' }}>Mixed</option>
      </Select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Start Date" type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} />
        <Input label="End Date" type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} />
      </div>

      {form.format !== 'matchplay' && (
        <Input label="Best rounds to count" type="number" min={1} max={20}
          value={form.count_rounds} onChange={e => f('count_rounds', parseInt(e.target.value) || 6)} />
      )}

      <Input label="Description (optional)" value={form.description}
        onChange={e => f('description', e.target.value)} placeholder="Short description" />

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Button fullWidth onClick={handleSave} disabled={saving}>
        {saving ? 'Creating...' : '✓ Create Tournament'}
      </Button>
    </div>
  );
};

// ─── ROUND CREATOR ────────────────────────────────────────────────────────────
const CreateRoundForm = ({ tournament, courses, onSave, onCancel }) => {
  const [form, setForm] = useState({
    course_id: courses[0]?.id || '',
    scheduled_date: '',
    total_holes: 18,
    starting_hole: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.scheduled_date || !form.course_id) { setError('Date and course are required.'); return; }
    setSaving(true);
    const { data, error: err } = await supabase.from('rounds').insert({
      tournament_id: tournament.id,
      course_id: form.course_id,
      scheduled_date: form.scheduled_date,
      total_holes: form.total_holes,
      starting_hole: form.starting_hole,
      status: 'upcoming',
    }).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 8 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          New Round — {tournament.name}
        </h2>
      </div>

      <Select label="Course" value={form.course_id} onChange={e => f('course_id', e.target.value)}>
        {courses.map(c => (
          <option key={c.id} value={c.id} style={{ background: 'var(--bg-nav)' }}>{c.name}</option>
        ))}
      </Select>

      <Input label="Date" type="date" value={form.scheduled_date} onChange={e => f('scheduled_date', e.target.value)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Select label="Total Holes" value={form.total_holes} onChange={e => f('total_holes', parseInt(e.target.value))}>
          <option value={9} style={{ background: 'var(--bg-nav)' }}>9 holes</option>
          <option value={18} style={{ background: 'var(--bg-nav)' }}>18 holes</option>
        </Select>
        <Select label="Starting Hole" value={form.starting_hole} onChange={e => f('starting_hole', parseInt(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <option key={n} value={n} style={{ background: 'var(--bg-nav)' }}>Hole {n}</option>
          ))}
        </Select>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Button fullWidth onClick={handleSave} disabled={saving}>
        {saving ? 'Creating...' : '✓ Add Round'}
      </Button>
    </div>
  );
};

// ─── TOURNAMENT DETAIL ────────────────────────────────────────────────────────
const TournamentDetail = ({ tournament, rounds, courses, players, onBack, onRoundAdded, onStatusChange }) => {
  const [view, setView] = useState('overview'); // overview | add-round | manage-players
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [toast, setToast] = useState(null);

  const tournamentRounds = rounds.filter(r => r.tournament_id === tournament.id)
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from('tournaments')
      .update({ status: newStatus }).eq('id', tournament.id);
    setUpdatingStatus(false);
    if (!error) {
      onStatusChange(tournament.id, newStatus);
      setToast({ message: `Tournament ${newStatus}`, type: 'success' });
    }
  };

  const statusColor = { upcoming: '#fbbf24', active: '#4ade80', complete: 'rgba(255,255,255,0.3)' };

  if (view === 'add-round') {
    return <CreateRoundForm tournament={tournament} courses={courses}
      onSave={r => { onRoundAdded(r); setView('overview'); }}
      onCancel={() => setView('overview')} />;
  }

  return (
    <div style={{ padding: '0 20px 20px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {tournament.name}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {formatDate(tournament.start_date)} {tournament.end_date ? `– ${formatDate(tournament.end_date)}` : ''}
          </div>
        </div>
        <Badge label={tournament.status} color={statusColor[tournament.status] || '#fbbf24'} />
      </div>

      {/* Status controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tournament.status === 'upcoming' && (
          <button onClick={() => handleStatusChange('active')} disabled={updatingStatus} style={{
            flex: 1, padding: '10px', borderRadius: 12,
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            color: '#4ade80', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>▶ Activate</button>
        )}
        {tournament.status === 'active' && (
          <button onClick={() => handleStatusChange('complete')} disabled={updatingStatus} style={{
            flex: 1, padding: '10px', borderRadius: 12,
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
            color: '#fbbf24', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>✓ Complete Tournament</button>
        )}
        {tournament.status === 'complete' && (
          <button onClick={() => handleStatusChange('active')} disabled={updatingStatus} style={{
            flex: 1, padding: '10px', borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border-card)',
            color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif", fontSize: 13, cursor: 'pointer',
          }}>↩ Reopen</button>
        )}
      </div>

      {/* Rounds */}
      <SectionLabel>Rounds ({tournamentRounds.length})</SectionLabel>
      {tournamentRounds.length === 0 ? (
        <EmptyState icon="📅" title="No rounds yet" subtitle="Add the first round below" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {tournamentRounds.map((r, i) => {
            const course = courses.find(c => c.id === r.course_id);
            return (
              <div key={r.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Round {i + 1}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatDate(r.scheduled_date)} · {course?.name || 'Unknown'} · {r.total_holes} holes
                  </div>
                </div>
                <Badge
                  label={r.status || 'upcoming'}
                  color={r.status === 'complete' ? 'rgba(255,255,255,0.3)' : r.status === 'active' ? '#4ade80' : '#fbbf24'}
                />
              </div>
            );
          })}
        </div>
      )}

      <Button fullWidth variant="secondary" onClick={() => setView('add-round')} style={{ marginBottom: 8 }}>
        <Plus size={16} /> Add Round
      </Button>
    </div>
  );
};

// ─── ADMIN PANEL MAIN ─────────────────────────────────────────────────────────
export const AdminPanel = ({ currentUser, tournaments, rounds, courses, players, onDataChanged }) => {
  const [view, setView] = useState('home'); // home | create-tournament | tournament-detail
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [localTournaments, setLocalTournaments] = useState(tournaments);
  const [localRounds, setLocalRounds] = useState(rounds);
  const [toast, setToast] = useState(null);

  // Sync with parent
  React.useEffect(() => setLocalTournaments(tournaments), [tournaments]);
  React.useEffect(() => setLocalRounds(rounds), [rounds]);

  const handleTournamentCreated = (t) => {
    const updated = [t, ...localTournaments];
    setLocalTournaments(updated);
    setView('home');
    setToast({ message: 'Tournament created!', type: 'success' });
    onDataChanged?.();
  };

  const handleRoundAdded = (r) => {
    setLocalRounds(prev => [...prev, r]);
    onDataChanged?.();
  };

  const handleStatusChange = (tid, status) => {
    setLocalTournaments(prev => prev.map(t => t.id === tid ? { ...t, status } : t));
    onDataChanged?.();
  };

  if (view === 'create-tournament') {
    return (
      <div style={containerStyle}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <CreateTournamentForm onSave={handleTournamentCreated} onCancel={() => setView('home')} />
        <GlobalStyles />
      </div>
    );
  }

  if (view === 'tournament-detail' && selectedTournament) {
    return (
      <div style={containerStyle}>
        <TournamentDetail
          tournament={localTournaments.find(t => t.id === selectedTournament.id) || selectedTournament}
          rounds={localRounds} courses={courses} players={players}
          onBack={() => setView('home')}
          onRoundAdded={handleRoundAdded}
          onStatusChange={handleStatusChange}
        />
        <GlobalStyles />
      </div>
    );
  }

  const statusColor = { upcoming: '#fbbf24', active: '#4ade80', complete: 'rgba(255,255,255,0.3)' };

  return (
    <div style={containerStyle}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ padding: '0 20px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 8 }}>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Admin Panel
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {formatName(currentUser.name)} · {currentUser.role}
            </p>
          </div>
          <div style={{ fontSize: 28 }}>⚙️</div>
        </div>

        {/* Tournaments */}
        <SectionLabel>Tournaments</SectionLabel>
        {localTournaments.length === 0 ? (
          <EmptyState icon="🏆" title="No tournaments yet" subtitle="Create your first tournament below" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {localTournaments.map(t => {
              const tRounds = localRounds.filter(r => r.tournament_id === t.id);
              return (
                <div key={t.id}
                  onClick={() => { setSelectedTournament(t); setView('tournament-detail'); }}
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                    borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {t.format} · {tRounds.length} round{tRounds.length !== 1 ? 's' : ''}
                      {t.start_date ? ` · ${formatDate(t.start_date)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge label={t.status} color={statusColor[t.status] || '#fbbf24'} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button fullWidth onClick={() => setView('create-tournament')} style={{ marginBottom: 24 }}>
          <Plus size={16} /> Create Tournament
        </Button>

        <Divider />

        {/* Quick stats */}
        <SectionLabel>Club Overview</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Players', value: players.filter(p => p.status === 'Active').length, icon: '👥' },
            { label: 'Courses', value: courses.length, icon: '⛳' },
            { label: 'Tournaments', value: localTournaments.length, icon: '🏆' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <GlobalStyles />
    </div>
  );
};

const containerStyle = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
  `}</style>
);
