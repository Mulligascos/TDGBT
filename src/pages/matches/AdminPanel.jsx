import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, formatDate } from '../../utils';
import { Toast, Badge } from '../../components/ui';
import {
  ChevronLeft, ChevronRight, Plus, Check, X, Edit2, Trash2,
  Users, Trophy, MapPin, Megaphone, FileText, Settings
} from 'lucide-react';

// ─── SHARED PRIMITIVES ────────────────────────────────────────────────────────
const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>}
    {children}
    {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{hint}</div>}
  </div>
);

const inputStyle = {
  width: '100%', padding: '11px 13px', borderRadius: 10,
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
};

const Inp = (props) => <input style={inputStyle} {...props} />;
const Sel = ({ children, ...props }) => (
  <select style={{ ...inputStyle, appearance: 'none' }} {...props}>
    {children}
  </select>
);

const Btn = ({ children, onClick, disabled, variant = 'primary', small = false, fullWidth = false }) => {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, border: '1px solid rgba(74,222,128,0.3)', color: 'white' },
    ghost: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' },
    danger: { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' },
    warning: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...(styles[variant] || styles.primary),
      padding: small ? '7px 14px' : '12px 18px',
      borderRadius: small ? 8 : 12,
      fontFamily: "'DM Sans', sans-serif", fontSize: small ? 12 : 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      width: fullWidth ? '100%' : undefined, justifyContent: fullWidth ? 'center' : undefined,
    }}>
      {children}
    </button>
  );
};

const ErrMsg = ({ msg }) => msg ? (
  <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
    <X size={13} /> {msg}
  </div>
) : null;

const SectionHead = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>{children}</div>
);

const Card = ({ children, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '14px 16px', marginBottom: 8,
    cursor: onClick ? 'pointer' : 'default', ...style,
  }}>
    {children}
  </div>
);

const statusColor = { upcoming: '#fbbf24', active: '#4ade80', complete: 'rgba(255,255,255,0.4)', pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171' };

// ─── BACK HEADER ──────────────────────────────────────────────────────────────
const BackHeader = ({ title, onBack }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 4 }}>
    <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
      <ChevronLeft size={22} />
    </button>
    <div style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>{title}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: TOURNAMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const TournamentForm = ({ existing, courses, onSave, onBack }) => {
  const [form, setForm] = useState({
    name: existing?.name || '',
    format: existing?.format || 'strokeplay',
    start_date: existing?.start_date || '',
    end_date: existing?.end_date || '',
    description: existing?.description || '',
    count_rounds: existing?.count_rounds || 6,
    status: existing?.status || 'upcoming',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.start_date) { setError('Name and start date are required.'); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), format: form.format, start_date: form.start_date, end_date: form.end_date || null, description: form.description, count_rounds: form.count_rounds, status: form.status };
    const { data, error: err } = existing
      ? await supabase.from('tournaments').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('tournaments').insert(payload).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data);
  };

  return (
    <div>
      <BackHeader title={existing ? 'Edit Tournament' : 'New Tournament'} onBack={onBack} />
      <Field label="Name"><Inp value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Winter League 2026" /></Field>
      <Field label="Format">
        <Sel value={form.format} onChange={e => f('format', e.target.value)}>
          <option value="strokeplay" style={{ background: '#0d2b0d' }}>Stroke Play</option>
          <option value="matchplay" style={{ background: '#0d2b0d' }}>Match Play</option>
          <option value="mixed" style={{ background: '#0d2b0d' }}>Mixed</option>
        </Sel>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Start Date"><Inp type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} /></Field>
        <Field label="End Date"><Inp type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} /></Field>
      </div>
      <Field label="Best rounds to count">
        <Inp type="number" min={1} max={20} value={form.count_rounds} onChange={e => f('count_rounds', parseInt(e.target.value) || 6)} />
      </Field>
      <Field label="Status">
        <Sel value={form.status} onChange={e => f('status', e.target.value)}>
          <option value="upcoming" style={{ background: '#0d2b0d' }}>Upcoming</option>
          <option value="active" style={{ background: '#0d2b0d' }}>Active</option>
          <option value="complete" style={{ background: '#0d2b0d' }}>Complete</option>
        </Sel>
      </Field>
      <Field label="Description (optional)">
        <textarea value={form.description} onChange={e => f('description', e.target.value)} placeholder="Short description..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>
      <ErrMsg msg={error} />
      <Btn fullWidth onClick={handleSave} disabled={saving}><Check size={15} />{saving ? 'Saving...' : 'Save Tournament'}</Btn>
    </div>
  );
};

const RoundForm = ({ tournament, courses, existing, onSave, onBack }) => {
  const [form, setForm] = useState({
    course_id: existing?.course_id || courses[0]?.id || '',
    scheduled_date: existing?.scheduled_date || '',
    total_holes: existing?.total_holes || 18,
    starting_hole: existing?.starting_hole || 1,
    status: existing?.status || 'upcoming',
    notes: existing?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.scheduled_date || !form.course_id) { setError('Date and course are required.'); return; }
    setSaving(true);
    const payload = { tournament_id: tournament.id, course_id: form.course_id, scheduled_date: form.scheduled_date, total_holes: parseInt(form.total_holes), starting_hole: parseInt(form.starting_hole), status: form.status, notes: form.notes || null };
    const { data, error: err } = existing
      ? await supabase.from('rounds').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('rounds').insert(payload).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data);
  };

  return (
    <div>
      <BackHeader title={existing ? 'Edit Round' : `New Round — ${tournament.name}`} onBack={onBack} />
      <Field label="Course">
        <Sel value={form.course_id} onChange={e => f('course_id', e.target.value)}>
          {courses.map(c => <option key={c.id} value={c.id} style={{ background: '#0d2b0d' }}>{c.name}</option>)}
        </Sel>
      </Field>
      <Field label="Date"><Inp type="date" value={form.scheduled_date} onChange={e => f('scheduled_date', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Holes">
          <Sel value={form.total_holes} onChange={e => f('total_holes', e.target.value)}>
            <option value={9} style={{ background: '#0d2b0d' }}>9 holes</option>
            <option value={18} style={{ background: '#0d2b0d' }}>18 holes</option>
          </Sel>
        </Field>
        <Field label="Starting Hole">
          <Sel value={form.starting_hole} onChange={e => f('starting_hole', e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1} style={{ background: '#0d2b0d' }}>Hole {i + 1}</option>)}
          </Sel>
        </Field>
      </div>
      <Field label="Status">
        <Sel value={form.status} onChange={e => f('status', e.target.value)}>
          <option value="upcoming" style={{ background: '#0d2b0d' }}>Upcoming</option>
          <option value="active" style={{ background: '#0d2b0d' }}>Active</option>
          <option value="complete" style={{ background: '#0d2b0d' }}>Complete</option>
        </Sel>
      </Field>
      <Field label="Notes (optional)">
        <Inp value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="e.g. All members welcome" />
      </Field>
      <ErrMsg msg={error} />
      <Btn fullWidth onClick={handleSave} disabled={saving}><Check size={15} />{saving ? 'Saving...' : 'Save Round'}</Btn>
    </div>
  );
};

const TournamentsSection = ({ tournaments, rounds, courses, onRefresh, showToast }) => {
  const [view, setView] = useState('list'); // list | new-t | edit-t | detail | new-r | edit-r
  const [selected, setSelected] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [localT, setLocalT] = useState(tournaments);
  const [localR, setLocalR] = useState(rounds);

  useEffect(() => { setLocalT(tournaments); setLocalR(rounds); }, [tournaments, rounds]);

  const tRounds = (tid) => localR.filter(r => r.tournament_id === tid).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  if (view === 'new-t') return <TournamentForm courses={courses} onBack={() => setView('list')} onSave={t => { setLocalT(p => [t, ...p]); setView('list'); showToast('Tournament created'); onRefresh(); }} />;
  if (view === 'edit-t' && selected) return <TournamentForm existing={selected} courses={courses} onBack={() => setView('detail')} onSave={t => { setLocalT(p => p.map(x => x.id === t.id ? t : x)); setSelected(t); setView('detail'); showToast('Tournament updated'); onRefresh(); }} />;
  if (view === 'new-r' && selected) return <RoundForm tournament={selected} courses={courses} onBack={() => setView('detail')} onSave={r => { setLocalR(p => [...p, r]); setView('detail'); showToast('Round added'); onRefresh(); }} />;
  if (view === 'edit-r' && selected && selectedRound) return <RoundForm tournament={selected} courses={courses} existing={selectedRound} onBack={() => setView('detail')} onSave={r => { setLocalR(p => p.map(x => x.id === r.id ? r : x)); setView('detail'); showToast('Round updated'); onRefresh(); }} />;

  if (view === 'detail' && selected) {
    const t = localT.find(x => x.id === selected.id) || selected;
    const rs = tRounds(t.id);
    return (
      <div>
        <BackHeader title={t.name} onBack={() => setView('list')} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Badge label={t.status} color={statusColor[t.status]} />
          <Badge label={t.format} color="rgba(255,255,255,0.3)" />
          {t.start_date && <Badge label={formatDate(t.start_date)} color="rgba(255,255,255,0.3)" />}
        </div>
        {t.description && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>{t.description}</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <Btn small variant="ghost" onClick={() => setView('edit-t')}><Edit2 size={13} /> Edit</Btn>
          <Btn small variant="primary" onClick={() => setView('new-r')}><Plus size={13} /> Add Round</Btn>
        </div>
        <SectionHead>Rounds ({rs.length})</SectionHead>
        {rs.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>No rounds yet</div>}
        {rs.map(r => {
          const c = courses.find(x => x.id === r.course_id);
          return (
            <Card key={r.id} onClick={() => { setSelectedRound(r); setView('edit-r'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{c?.name || 'Unknown course'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{formatDate(r.scheduled_date)} · {r.total_holes} holes</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge label={r.status} color={statusColor[r.status]} />
                  <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionHead>Tournaments</SectionHead>
        <Btn small onClick={() => setView('new-t')}><Plus size={13} /> New</Btn>
      </div>
      {localT.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>No tournaments yet</div>}
      {localT.map(t => (
        <Card key={t.id} onClick={() => { setSelected(t); setView('detail'); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {t.format} · {tRounds(t.id).length} round{tRounds(t.id).length !== 1 ? 's' : ''}{t.start_date ? ` · ${formatDate(t.start_date)}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge label={t.status} color={statusColor[t.status]} />
              <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: MEMBERS
// ═══════════════════════════════════════════════════════════════════════════════

const MemberForm = ({ existing, onSave, onBack }) => {
  const [form, setForm] = useState({
    player_name: existing?.name || '',
    player_division: existing?.division || 'Mixed',
    player_status: existing?.status || 'Active',
    role: existing?.role || 'member',
    bag_tag: existing?.bagTag || '',
    membership_number: existing?.membershipNumber || '',
    pin: existing?.pin || '',
    email: existing?.email || '',
    phone: existing?.phone || '',
    pdga_number: existing?.pdgaNumber || '',
    udisc_username: existing?.udiscUsername || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.player_name.trim()) { setError('Name is required.'); return; }
    if (!existing && (!form.pin || !/^\d{4}$/.test(form.pin))) { setError('A 4-digit PIN is required for new members.'); return; }
    setSaving(true);
    const payload = {
      player_name: form.player_name.trim(),
      player_division: form.player_division,
      player_status: form.player_status,
      role: form.role,
      bag_tag: form.bag_tag ? parseInt(form.bag_tag) : null,
      membership_number: form.membership_number || null,
      email: form.email || null,
      phone: form.phone || null,
      pdga_number: form.pdga_number || null,
      udisc_username: form.udisc_username || null,
      updated_at: new Date().toISOString(),
    };
    if (!existing) payload.pin = form.pin;
    else if (form.pin) payload.pin = form.pin;

    const { data, error: err } = existing
      ? await supabase.from('players').update(payload).eq('player_id', existing.id).select().single()
      : await supabase.from('players').insert(payload).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data);
  };

  const divisions = ['Mixed', 'Female', 'Junior', 'Senior'];
  const roles = ['member', 'committee', 'admin'];

  return (
    <div>
      <BackHeader title={existing ? `Edit — ${formatName(existing.name)}` : 'Add Member'} onBack={onBack} />
      <SectionHead>Personal</SectionHead>
      <Field label="Full Name"><Inp value={form.player_name} onChange={e => f('player_name', e.target.value)} placeholder="First Last" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Division">
          <Sel value={form.player_division} onChange={e => f('player_division', e.target.value)}>
            {divisions.map(d => <option key={d} value={d} style={{ background: '#0d2b0d' }}>{d}</option>)}
          </Sel>
        </Field>
        <Field label="Status">
          <Sel value={form.player_status} onChange={e => f('player_status', e.target.value)}>
            <option value="Active" style={{ background: '#0d2b0d' }}>Active</option>
            <option value="Inactive" style={{ background: '#0d2b0d' }}>Inactive</option>
          </Sel>
        </Field>
      </div>
      <Field label="Email"><Inp type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="member@email.com" /></Field>
      <Field label="Phone"><Inp type="tel" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+64 21 000 0000" /></Field>

      <SectionHead style={{ marginTop: 8 }}>Club</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Role">
          <Sel value={form.role} onChange={e => f('role', e.target.value)}>
            {roles.map(r => <option key={r} value={r} style={{ background: '#0d2b0d' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </Sel>
        </Field>
        <Field label="Bag Tag #"><Inp type="number" value={form.bag_tag} onChange={e => f('bag_tag', e.target.value)} placeholder="e.g. 7" /></Field>
      </div>
      <Field label="Membership Number"><Inp value={form.membership_number} onChange={e => f('membership_number', e.target.value)} placeholder="e.g. TDG-0042" /></Field>

      <SectionHead style={{ marginTop: 8 }}>Disc Golf</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="PDGA Number"><Inp value={form.pdga_number} onChange={e => f('pdga_number', e.target.value)} placeholder="123456" /></Field>
        <Field label="UDisc Username"><Inp value={form.udisc_username} onChange={e => f('udisc_username', e.target.value)} placeholder="MarkC" /></Field>
      </div>

      <SectionHead style={{ marginTop: 8 }}>Login PIN</SectionHead>
      <Field label={existing ? 'New PIN (leave blank to keep current)' : 'PIN (4 digits)'} hint="Members use this to log in">
        <Inp type="password" maxLength={4} inputMode="numeric" value={form.pin} onChange={e => f('pin', e.target.value.replace(/\D/g, ''))} placeholder="••••" style={{ ...inputStyle, letterSpacing: 4 }} />
      </Field>

      <ErrMsg msg={error} />
      <Btn fullWidth onClick={handleSave} disabled={saving}><Check size={15} />{saving ? 'Saving...' : 'Save Member'}</Btn>
    </div>
  );
};

const MembersSection = ({ players, onRefresh, showToast }) => {
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [localPlayers, setLocalPlayers] = useState(players);

  useEffect(() => { setLocalPlayers(players); }, [players]);

  const filtered = localPlayers.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  const handleSave = (raw) => {
    const normalised = {
      id: raw.player_id, name: raw.player_name, status: raw.player_status,
      division: raw.player_division, bagTag: raw.bag_tag, role: raw.role || 'member',
      pin: raw.pin, membershipNumber: raw.membership_number,
      email: raw.email || '', phone: raw.phone || '',
      pdgaNumber: raw.pdga_number || '', udiscUsername: raw.udisc_username || '',
    };
    if (selected) {
      setLocalPlayers(p => p.map(x => x.id === normalised.id ? normalised : x));
      showToast('Member updated');
    } else {
      setLocalPlayers(p => [normalised, ...p]);
      showToast('Member added');
    }
    setView('list');
    onRefresh();
  };

  if (view === 'edit' && selected) return <MemberForm existing={selected} onBack={() => setView('list')} onSave={handleSave} />;
  if (view === 'new') return <MemberForm onBack={() => setView('list')} onSave={handleSave} />;

  const divColor = { Mixed: BRAND.light, Female: '#f9a8d4', Junior: '#fbbf24', Senior: '#93c5fd' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionHead>Members ({localPlayers.filter(p => p.status === 'Active').length} active)</SectionHead>
        <Btn small onClick={() => { setSelected(null); setView('new'); }}><Plus size={13} /> Add</Btn>
      </div>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." />
      </div>
      {filtered.map(p => (
        <Card key={p.id} onClick={() => { setSelected(p); setView('edit'); }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif",
            }}>
              {p.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{formatName(p.name)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                {p.bagTag && <span style={{ fontSize: 11, color: BRAND.light }}>#{p.bagTag}</span>}
                <span style={{ fontSize: 11, color: divColor[p.division] || 'rgba(255,255,255,0.3)' }}>{p.division}</span>
                {p.role !== 'member' && <span style={{ fontSize: 11, color: '#fbbf24' }}>{p.role}</span>}
                {p.status !== 'Active' && <span style={{ fontSize: 11, color: '#f87171' }}>Inactive</span>}
              </div>
            </div>
            <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
          </div>
        </Card>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: COURSES
// ═══════════════════════════════════════════════════════════════════════════════

const CourseForm = ({ existing, onSave, onBack }) => {
  const defaultPars = existing?.pars
    ? (typeof existing.pars === 'string' ? existing.pars : JSON.stringify(existing.pars))
    : '{"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":3,"9":3,"10":3,"11":3,"12":3,"13":3,"14":3,"15":3,"16":3,"17":3,"18":3}';

  const [form, setForm] = useState({
    name: existing?.name || '',
    location: existing?.location || '',
    holes: existing?.holes || 18,
    directions_url: existing?.directions_url || '',
    notes: existing?.notes || '',
    facilities: existing?.facilities || '',
  });
  const [parsJson, setParsJson] = useState(defaultPars);
  const [parsError, setParsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Parse pars as editable per-hole inputs
  const getParsObj = () => {
    try { return JSON.parse(parsJson); } catch { return null; }
  };

  const setPar = (hole, val) => {
    const obj = getParsObj() || {};
    obj[String(hole)] = parseInt(val) || 3;
    setParsJson(JSON.stringify(obj));
    setParsError('');
  };

  const parsObj = getParsObj();

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Course name is required.'); return; }
    if (!parsObj) { setError('Pars are not valid JSON.'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), location: form.location || null,
      holes: parseInt(form.holes), pars: parsObj,
      directions_url: form.directions_url || null,
      notes: form.notes || null, facilities: form.facilities || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: err } = existing
      ? await supabase.from('courses').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('courses').insert({ ...payload, status: 'active' }).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data);
  };

  return (
    <div>
      <BackHeader title={existing ? `Edit — ${existing.name}` : 'Add Course'} onBack={onBack} />
      <Field label="Course Name"><Inp value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Centennial Park" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
        <Field label="Location"><Inp value={form.location} onChange={e => f('location', e.target.value)} placeholder="Suburb or city" /></Field>
        <Field label="Holes">
          <Sel value={form.holes} onChange={e => f('holes', parseInt(e.target.value))}>
            <option value={9} style={{ background: '#0d2b0d' }}>9</option>
            <option value={18} style={{ background: '#0d2b0d' }}>18</option>
          </Sel>
        </Field>
      </div>

      <Field label="Hole Pars">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, marginBottom: 4 }}>
          {Array.from({ length: parseInt(form.holes) }, (_, i) => {
            const h = i + 1;
            const p = parsObj?.[String(h)] ?? 3;
            return (
              <div key={h} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>{h}</div>
                <select value={p} onChange={e => setPar(h, e.target.value)} style={{
                  width: '100%', padding: '6px 2px', borderRadius: 7, textAlign: 'center',
                  background: p === 3 ? 'rgba(74,222,128,0.15)' : p === 4 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                  border: `1px solid ${p === 3 ? 'rgba(74,222,128,0.3)' : p === 4 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, outline: 'none',
                  appearance: 'none',
                }}>
                  <option value={3} style={{ background: '#0d2b0d' }}>3</option>
                  <option value={4} style={{ background: '#0d2b0d' }}>4</option>
                  <option value={5} style={{ background: '#0d2b0d' }}>5</option>
                </select>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          Total par: {parsObj ? Object.values(parsObj).slice(0, parseInt(form.holes)).reduce((a, b) => a + b, 0) : '—'}
        </div>
      </Field>

      <Field label="Directions URL (Google Maps etc.)"><Inp value={form.directions_url} onChange={e => f('directions_url', e.target.value)} placeholder="https://maps.google.com/..." /></Field>
      <Field label="Layout Notes">
        <textarea value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Course notes, tricky holes etc." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>
      <Field label="Facilities">
        <textarea value={form.facilities} onChange={e => f('facilities', e.target.value)} placeholder="Toilets, parking, shelter etc." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>
      <ErrMsg msg={error} />
      <Btn fullWidth onClick={handleSave} disabled={saving}><Check size={15} />{saving ? 'Saving...' : 'Save Course'}</Btn>
    </div>
  );
};

const CoursesSection = ({ courses, onRefresh, showToast }) => {
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [localCourses, setLocalCourses] = useState(courses);

  useEffect(() => { setLocalCourses(courses); }, [courses]);

  const handleSave = (raw) => {
    if (selected) {
      setLocalCourses(p => p.map(x => x.id === raw.id ? raw : x));
      showToast('Course updated');
    } else {
      setLocalCourses(p => [raw, ...p]);
      showToast('Course added');
    }
    setView('list');
    onRefresh();
  };

  const tp = (pars) => {
    if (!pars) return null;
    const obj = typeof pars === 'string' ? JSON.parse(pars) : pars;
    return Object.values(obj).reduce((a, b) => a + b, 0);
  };

  if (view === 'edit' && selected) return <CourseForm existing={selected} onBack={() => setView('list')} onSave={handleSave} />;
  if (view === 'new') return <CourseForm onBack={() => setView('list')} onSave={handleSave} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionHead>Courses ({localCourses.length})</SectionHead>
        <Btn small onClick={() => { setSelected(null); setView('new'); }}><Plus size={13} /> Add</Btn>
      </div>
      {localCourses.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No courses yet</div>}
      {localCourses.map(c => (
        <Card key={c.id} onClick={() => { setSelected(c); setView('edit'); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {c.holes || 18} holes{tp(c.pars) ? ` · Par ${tp(c.pars)}` : ''}{c.location ? ` · ${c.location}` : ''}
              </div>
            </div>
            <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
          </div>
        </Card>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CHANGE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

const RequestsSection = ({ courses, currentUser, showToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('course_requests')
      .select('*, players!submitted_by(player_name)')
      .eq('status', filter)
      .order('submitted_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id, status, notes = '') => {
    await supabase.from('course_requests').update({
      status, admin_notes: notes || null,
      resolved_at: new Date().toISOString(), resolved_by: currentUser.id,
    }).eq('id', id);
    setRequests(p => p.filter(r => r.id !== id));
    showToast(status === 'approved' ? 'Request approved' : 'Request rejected');
  };

  return (
    <div>
      <SectionHead>Course Change Requests</SectionHead>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filter === s ? `rgba(74,222,128,0.15)` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${filter === s ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.08)'}`,
            color: filter === s ? BRAND.light : 'rgba(255,255,255,0.4)',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Loading...</div>}
      {!loading && requests.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No {filter} requests</div>}
      {requests.map(r => {
        const course = courses.find(c => c.id === r.course_id);
        return (
          <Card key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{r.title}</div>
              <Badge label={r.request_type.replace('_', ' ')} color="rgba(255,255,255,0.3)" />
            </div>
            {course && <div style={{ fontSize: 11, color: BRAND.light, marginBottom: 4 }}>📍 {course.name}</div>}
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 6 }}>{r.description}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: filter === 'pending' ? 12 : 0 }}>
              By {r.players?.player_name || 'Unknown'} · {formatDate(r.submitted_at)}
            </div>
            {filter === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn small variant="primary" onClick={() => resolve(r.id, 'approved')}><Check size={13} /> Approve</Btn>
                <Btn small variant="danger" onClick={() => resolve(r.id, 'rejected')}><X size={13} /> Reject</Btn>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const AnnouncementsSection = ({ currentUser, showToast }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', pinned: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements')
      .select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('announcements').insert({
      title: form.title.trim(), body: form.body.trim(),
      pinned: form.pinned, created_by: currentUser.id,
    }).select().single();
    setSaving(false);
    if (error) return;
    setAnnouncements(p => [data, ...p]);
    setForm({ title: '', body: '', pinned: false });
    setShowForm(false);
    showToast('Announcement posted');
  };

  const handleDelete = async (id) => {
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(p => p.filter(a => a.id !== id));
    showToast('Announcement deleted');
  };

  const togglePin = async (a) => {
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id);
    setAnnouncements(p => p.map(x => x.id === a.id ? { ...x, pinned: !x.pinned } : x));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionHead>Announcements</SectionHead>
        <Btn small onClick={() => setShowForm(s => !s)}><Plus size={13} /> Post</Btn>
      </div>

      {showForm && (
        <Card>
          <Field label="Title"><Inp value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title" /></Field>
          <Field label="Body">
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Write your announcement..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} />
            Pin to top of home screen
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn small onClick={handlePost} disabled={saving || !form.title.trim() || !form.body.trim()}>
              {saving ? 'Posting...' : 'Post'}
            </Btn>
          </div>
        </Card>
      )}

      {loading && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Loading...</div>}
      {!loading && announcements.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No announcements yet</div>}
      {announcements.map(a => (
        <Card key={a.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', flex: 1 }}>{a.title}</div>
            {a.pinned && <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 8 }}>📌</span>}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 8 }}>{a.body}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>{formatDate(a.created_at)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small variant="ghost" onClick={() => togglePin(a)}>{a.pinned ? 'Unpin' : '📌 Pin'}</Btn>
            <Btn small variant="danger" onClick={() => handleDelete(a.id)}><Trash2 size={12} /> Delete</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'courses', label: 'Courses', icon: MapPin },
  { id: 'requests', label: 'Requests', icon: FileText },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
];

export const AdminPanel = ({ currentUser, tournaments, rounds, courses, players, onDataChanged }) => {
  const [activeSection, setActiveSection] = useState('tournaments');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeItem = NAV_ITEMS.find(n => n.id === activeSection);

  return (
    <div style={containerStyle}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${BRAND.primary}dd, #071407)`,
        padding: '52px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>⚙️ Admin</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>{activeItem?.label}</div>
          </div>
          {/* Hamburger menu */}
          <button onClick={() => setMenuOpen(s => !s)} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: 'white',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 18, height: 2, background: 'white', borderRadius: 1 }} />)}
          </button>
        </div>
      </div>

      {/* Slide-out side menu */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 240,
            background: '#0a1f0a', borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 100, paddingTop: 60, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '0 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Admin Panel</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{formatName(currentUser.name)}</div>
            </div>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setActiveSection(id); setMenuOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px',
                background: activeSection === id ? 'rgba(74,222,128,0.1)' : 'transparent',
                borderLeft: `3px solid ${activeSection === id ? BRAND.light : 'transparent'}`,
                border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                <Icon size={18} color={activeSection === id ? BRAND.light : 'rgba(255,255,255,0.4)'} />
                <span style={{ fontSize: 14, fontWeight: activeSection === id ? 700 : 500, color: activeSection === id ? BRAND.light : 'rgba(255,255,255,0.7)' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        {activeSection === 'tournaments' && (
          <TournamentsSection tournaments={tournaments} rounds={rounds} courses={courses} players={players} onRefresh={onDataChanged} showToast={showToast} />
        )}
        {activeSection === 'members' && (
          <MembersSection players={players} onRefresh={onDataChanged} showToast={showToast} />
        )}
        {activeSection === 'courses' && (
          <CoursesSection courses={courses} onRefresh={onDataChanged} showToast={showToast} />
        )}
        {activeSection === 'requests' && (
          <RequestsSection courses={courses} currentUser={currentUser} showToast={showToast} />
        )}
        {activeSection === 'announcements' && (
          <AnnouncementsSection currentUser={currentUser} showToast={showToast} />
        )}
      </div>

      <GlobalStyles />
    </div>
  );
};

const containerStyle = {
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
    textarea { font-family: 'DM Sans', sans-serif; }
    select option { background: #0d2b0d; }
    input[type="date"] { color-scheme: dark; }
    input[type="checkbox"] { accent-color: ${BRAND.light}; width: 16px; height: 16px; }
  `}</style>
);
