import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { BRAND, formatName, formatDate } from '../../utils';
import { Toast, Badge } from '../../components/ui';
import {
  ChevronLeft, ChevronRight, Plus, Check, X, Edit2, Trash2,
  Users, Trophy, MapPin, Megaphone, FileText, Settings, Award, RotateCcw,
  Mail, Send, Clock, AlertCircle
} from 'lucide-react';


// ─── RICH TEXT ────────────────────────────────────────────────────────────────
// Lightweight markdown: **bold**, *italic*, bullet lists (- item), numbered lists, line breaks
const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Unordered list block
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      elements.push(
        <ul key={i} style={{ paddingLeft: 18, margin: '4px 0' }}>
          {items.map((item, j) => <li key={j} style={{ marginBottom: 2 }}>{inlineMarkdown(item)}</li>)}
        </ul>
      );
      continue;
    }
    // Ordered list block
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol key={i} style={{ paddingLeft: 18, margin: '4px 0' }}>
          {items.map((item, j) => <li key={j} style={{ marginBottom: 2 }}>{inlineMarkdown(item)}</li>)}
        </ol>
      );
      continue;
    }
    // Blank line → spacer
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(<div key={i}>{inlineMarkdown(line)}</div>);
    }
    i++;
  }
  return elements;
};

const inlineMarkdown = (text) => {
  // Split on **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
};

const RichTextToolbar = ({ value, onChange, textareaRef }) => {
  const wrap = (before, after, placeholder) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = value.slice(start, end) || placeholder;
    const next  = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  };

  const insertList = (prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    // Insert at start of current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length); }, 0);
  };

  const btnStyle = (active) => ({
    padding: '5px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${active ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
    color: active ? '#4ade80' : 'rgba(255,255,255,0.6)',
    fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px 10px 0 0', borderBottom: 'none' }}>
      <button type="button" onClick={() => wrap('**', '**', 'bold text')} style={btnStyle(false)}><strong>B</strong></button>
      <button type="button" onClick={() => wrap('*', '*', 'italic text')} style={btnStyle(false)}><em>I</em></button>
      <button type="button" onClick={() => insertList('- ')} style={btnStyle(false)}>• List</button>
      <button type="button" onClick={() => insertList('1. ')} style={btnStyle(false)}>1. List</button>
      <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 2px' }} />
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', alignSelf: 'center', paddingLeft: 4 }}>**bold**  *italic*  - list</span>
    </div>
  );
};

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalT(tournaments); setLocalR(rounds); }, [
    tournaments.map(t => t.id).join(','),
    rounds.map(r => r.id).join(','),
  ]);

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

const MembersSection = ({ players: propPlayers, onRefresh, showToast }) => {
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Inactive'
  const [localPlayers, setLocalPlayers] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);

  // Fetch ALL players (bypasses the Active-only filter in useAppData)
  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    const { data } = await supabase.from('players').select('*').order('player_name');
    if (data) {
      setLocalPlayers(data.map(raw => ({
        id: raw.player_id, name: raw.player_name, status: raw.player_status,
        division: raw.player_division, bagTag: raw.bag_tag, role: raw.role || 'member',
        pin: raw.pin, membershipNumber: raw.membership_number,
        email: raw.email || '', phone: raw.phone || '',
        pdgaNumber: raw.pdga_number || '', udiscUsername: raw.udisc_username || '',
      })));
    }
    setLoadingAll(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  const handleToggleStatus = async (e, player) => {
    e.stopPropagation();
    const newStatus = player.status === 'Active' ? 'Inactive' : 'Active';
    const { error } = await supabase.from('players')
      .update({ player_status: newStatus })
      .eq('player_id', player.id);
    if (!error) {
      setLocalPlayers(p => p.map(x => x.id === player.id ? { ...x, status: newStatus } : x));
      showToast(`${formatName(player.name)} set to ${newStatus}`);
      onRefresh();
    }
  };

  if (view === 'edit' && selected) return <MemberForm existing={selected} onBack={() => { setView('list'); loadAll(); }} onSave={handleSave} />;
  if (view === 'new') return <MemberForm onBack={() => setView('list')} onSave={handleSave} />;

  const divColor = { Mixed: BRAND.light, Female: '#f9a8d4', Junior: '#fbbf24', Senior: '#93c5fd' };
  const activeCount = localPlayers.filter(p => p.status === 'Active').length;
  const inactiveCount = localPlayers.filter(p => p.status !== 'Active').length;

  const filtered = localPlayers.filter(p => {
    if (statusFilter === 'Active' && p.status !== 'Active') return false;
    if (statusFilter === 'Inactive' && p.status === 'Active') return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionHead>Members ({activeCount} active · {inactiveCount} inactive)</SectionHead>
        <Btn small onClick={() => { setSelected(null); setView('new'); }}><Plus size={13} /> Add</Btn>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['all', `All (${localPlayers.length})`], ['Active', `Active (${activeCount})`], ['Inactive', `Inactive (${inactiveCount})`]].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: statusFilter === val ? BRAND.primary : 'rgba(255,255,255,0.05)',
            border: `1px solid ${statusFilter === val ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: statusFilter === val ? '#4ade80' : 'rgba(255,255,255,0.4)',
            fontFamily: "'DM Sans', sans-serif",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." />
      </div>

      {loadingAll ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No members found</div>
      ) : (
        filtered.map(p => (
          <Card key={p.id} onClick={() => { setSelected(p); setView('edit'); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: p.status === 'Active'
                  ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`
                  : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif",
                opacity: p.status === 'Active' ? 1 : 0.5,
              }}>
                {p.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: p.status === 'Active' ? 'white' : 'rgba(255,255,255,0.4)' }}>
                  {formatName(p.name)}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  {p.bagTag && <span style={{ fontSize: 11, color: BRAND.light }}>#{p.bagTag}</span>}
                  <span style={{ fontSize: 11, color: divColor[p.division] || 'rgba(255,255,255,0.3)' }}>{p.division}</span>
                  {p.role !== 'member' && <span style={{ fontSize: 11, color: '#fbbf24' }}>{p.role}</span>}
                  <span style={{ fontSize: 11, color: p.status === 'Active' ? '#4ade80' : '#f87171' }}>{p.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={(e) => handleToggleStatus(e, p)}
                  style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: p.status === 'Active' ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                    border: `1px solid ${p.status === 'Active' ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.25)'}`,
                    color: p.status === 'Active' ? '#f87171' : '#4ade80',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
              </div>
            </div>
          </Card>
        ))
      )}
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalCourses(courses); }, [courses.map(c => c.id).join(',')]);

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

const RequestsSection = ({ courses, currentUser, players: allPlayers, showToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.from('course_requests')
      .select('*')
      .eq('status', filter)
      .order('submitted_at', { ascending: false });
    if (err) setError(err.message);
    setRequests(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const [resolving, setResolving] = useState({}); // { [id]: 'approve' | 'reject' }
  const [notes, setNotes] = useState({});           // { [id]: string }
  const [saving, setSaving] = useState(null);

  const startResolve = (id, action) => {
    setResolving(p => ({ ...p, [id]: action }));
    setNotes(p => ({ ...p, [id]: p[id] || '' }));
  };

  const cancelResolve = (id) => {
    setResolving(p => { const n = { ...p }; delete n[id]; return n; });
  };

  const confirmResolve = async (id, status) => {
    setSaving(id);
    await supabase.from('course_requests').update({
      status,
      admin_notes: notes[id]?.trim() || null,
      resolved_at: new Date().toISOString(),
      resolved_by: currentUser.id,
    }).eq('id', id);
    setSaving(null);
    setResolving(p => { const n = { ...p }; delete n[id]; return n; });
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
      {error && <div style={{ fontSize: 13, color: '#f87171', padding: '8px 0' }}>⚠️ {error}</div>}
      {!loading && !error && requests.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No {filter} requests</div>}
      {requests.map(r => {
        const course = courses.find(c => c.id === r.course_id);
        const action = resolving[r.id];
        const isApproving = action === 'approve';
        const isRejecting = action === 'reject';
        return (
          <Card key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{r.title}</div>
              <Badge label={r.request_type.replace('_', ' ')} color="rgba(255,255,255,0.3)" />
            </div>
            {course && <div style={{ fontSize: 11, color: BRAND.light, marginBottom: 4 }}>📍 {course.name}</div>}
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 6 }}>{r.description}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>
              By {allPlayers?.find(p => p.id === r.submitted_by)?.name || 'Unknown'} · {formatDate(r.submitted_at)}
            </div>

            {filter === 'pending' && !action && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn small variant="primary" onClick={() => startResolve(r.id, 'approve')}><Check size={13} /> Approve</Btn>
                <Btn small variant="danger" onClick={() => startResolve(r.id, 'reject')}><X size={13} /> Reject</Btn>
              </div>
            )}

            {filter === 'pending' && action && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isApproving ? BRAND.light : '#f87171', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
                  {isApproving ? '✓ Approving' : '✕ Rejecting'} — add notes for the requestor
                </div>
                <textarea
                  value={notes[r.id] || ''}
                  onChange={e => setNotes(p => ({ ...p, [r.id]: e.target.value }))}
                  placeholder={isApproving ? 'e.g. Change scheduled for next round...' : 'e.g. Outside our current scope...'}
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, resize: 'vertical',
                    background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${isApproving ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                    color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    outline: 'none', boxSizing: 'border-box', marginBottom: 10,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn small variant="ghost" onClick={() => cancelResolve(r.id)}>Cancel</Btn>
                  <Btn
                    small
                    variant={isApproving ? 'primary' : 'danger'}
                    disabled={saving === r.id}
                    onClick={() => confirmResolve(r.id, isApproving ? 'approved' : 'rejected')}
                  >
                    {saving === r.id ? 'Saving...' : isApproving ? <><Check size={13} /> Confirm Approve</> : <><X size={13} /> Confirm Reject</>}
                  </Btn>
                </div>
              </div>
            )}

            {/* Show admin notes on resolved requests */}
            {filter !== 'pending' && r.admin_notes && (
              <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Admin Notes</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{r.admin_notes}</div>
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
  const [preview, setPreview] = useState(false);
  const textareaRef = React.useRef(null);

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
    // Optimistically remove from UI
    const prev = announcements;
    setAnnouncements(p => p.filter(a => a.id !== id));
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      // Revert if DB delete failed (e.g. RLS blocked it)
      setAnnouncements(prev);
      showToast('Delete failed — check permissions');
      console.error('Delete announcement error:', error);
    } else {
      showToast('Announcement deleted');
    }
  };

  const togglePin = async (a) => {
    const { error } = await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id);
    if (!error) setAnnouncements(p => p.map(x => x.id === a.id ? { ...x, pinned: !x.pinned } : x));
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
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              {['write', 'preview'].map(m => (
                <button key={m} type="button" onClick={() => setPreview(m === 'preview')} style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: (preview ? m === 'preview' : m === 'write') ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${(preview ? m === 'preview' : m === 'write') ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: (preview ? m === 'preview' : m === 'write') ? '#4ade80' : 'rgba(255,255,255,0.4)',
                  fontFamily: "'DM Sans', sans-serif", textTransform: 'capitalize',
                }}>{m}</button>
              ))}
            </div>
            {!preview ? (
              <>
                <RichTextToolbar value={form.body} onChange={v => setForm(p => ({ ...p, body: v }))} textareaRef={textareaRef} />
                <textarea
                  ref={textareaRef}
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  placeholder={"Write your announcement...\n\nTips:\n**bold text**\n*italic text*\n- bullet item\n1. numbered item"}
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', borderRadius: '0 0 10px 10px', borderTop: 'none' }}
                />
              </>
            ) : (
              <div style={{ ...inputStyle, minHeight: 100, lineHeight: 1.6, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                {form.body ? renderMarkdown(form.body) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>Nothing to preview yet</span>}
              </div>
            )}
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} />
            Pin to top of home screen
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small variant="ghost" onClick={() => { setShowForm(false); setPreview(false); }}>Cancel</Btn>
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
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 8 }}>{renderMarkdown(a.body)}</div>
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

// ─── ACHIEVEMENTS SECTION ─────────────────────────────────────────────────────
const TIERS = ['bronze', 'silver', 'gold'];
const TIER_COLORS = {
  bronze: { bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.3)', color: '#cd7f32' },
  silver: { bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.25)', color: '#c0c0c0' },
  gold:   { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)',  color: '#fbbf24' },
};
const COMMON_ICONS = ['🎯','⭐','🐦','🦅','🎳','🔥','💪','🥇','📅','🏅','💎','🏆','👑','🎖️','🌟','⚡','🎪','🎨','🎭','🎬'];

const AchievementForm = ({ existing, onSave, onBack }) => {
  const [form, setForm] = useState({
    icon: existing?.icon || '🏅',
    label: existing?.label || '',
    description: existing?.description || '',
    tier: existing?.tier || 'bronze',
    auto_award: existing?.auto_award ?? true,
    active: existing?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.label || !form.description) { setError('Label and description required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        icon: form.icon, label: form.label, description: form.description,
        tier: form.tier, auto_award: form.auto_award, active: form.active,
        code: existing?.code || form.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      };
      const { data, error: err } = existing
        ? await supabase.from('achievements').update(payload).eq('id', existing.id).select().single()
        : await supabase.from('achievements').insert(payload).select().single();
      if (err) throw err;
      onSave(data);
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <div>
      <BackHeader title={existing ? 'Edit Achievement' : 'New Achievement'} onBack={onBack} />
      <Field label="Icon">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {COMMON_ICONS.map(ic => (
            <button key={ic} onClick={() => set('icon', ic)} style={{
              width: 36, height: 36, borderRadius: 8, fontSize: 18,
              background: form.icon === ic ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${form.icon === ic ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer',
            }}>{ic}</button>
          ))}
        </div>
        <Inp value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="Or type any emoji" />
      </Field>
      <Field label="Label *"><Inp value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Eagle!" /></Field>
      <Field label="Description *"><Inp value={form.description} onChange={e => set('description', e.target.value)} placeholder="How to earn this achievement" /></Field>
      <Field label="Tier">
        <div style={{ display: 'flex', gap: 8 }}>
          {TIERS.map(t => (
            <button key={t} onClick={() => set('tier', t)} style={{
              flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
              background: form.tier === t ? TIER_COLORS[t].bg : 'rgba(255,255,255,0.04)',
              border: `1px solid ${form.tier === t ? TIER_COLORS[t].border : 'rgba(255,255,255,0.08)'}`,
              color: form.tier === t ? TIER_COLORS[t].color : 'rgba(255,255,255,0.4)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
              textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Award type">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['true', 'Auto (from scores)'], ['false', 'Manual only']].map(([val, lbl]) => (
            <button key={val} onClick={() => set('auto_award', val === 'true')} style={{
              flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
              background: String(form.auto_award) === val ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${String(form.auto_award) === val ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
              color: String(form.auto_award) === val ? '#4ade80' : 'rgba(255,255,255,0.4)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
            }}>{lbl}</button>
          ))}
        </div>
      </Field>
      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
      <Btn fullWidth onClick={handleSave} disabled={saving}>
        <Check size={15} />{saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Achievement'}
      </Btn>
    </div>
  );
};

const AchievementsSection = ({ players, showToast }) => {
  const [view, setView] = useState('list'); // list | edit | awards
  const [achievements, setAchievements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [awards, setAwards] = useState([]); // for selected achievement
  const [loading, setLoading] = useState(true);
  const [awardingPlayer, setAwardingPlayer] = useState('');
  const [awardDetail, setAwardDetail] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('achievements').select('*').order('sort_order');
    setAchievements(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadAwards = async (achievement) => {
    const { data } = await supabase
      .from('achievement_awards')
      .select('*, player:player_id(player_name)')
      .eq('achievement_id', achievement.id)
      .order('earned_at', { ascending: false });
    setAwards(data || []);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this achievement? This will also remove all awards for it.')) return;
    const { error } = await supabase.from('achievements').delete().eq('id', id);
    if (!error) { setAchievements(p => p.filter(a => a.id !== id)); showToast('Achievement deleted'); }
  };

  const handleToggleActive = async (a) => {
    const { error } = await supabase.from('achievements').update({ active: !a.active }).eq('id', a.id);
    if (!error) { setAchievements(p => p.map(x => x.id === a.id ? { ...x, active: !x.active } : x)); }
  };

  const handleManualAward = async () => {
    if (!awardingPlayer) return;
    const { error } = await supabase.from('achievement_awards').upsert({
      achievement_id: selected.id,
      player_id: awardingPlayer,
      detail: awardDetail || 'Awarded by admin',
      earned_at: new Date().toISOString(),
    }, { onConflict: 'achievement_id,player_id' });
    if (!error) {
      showToast('Award granted');
      setAwardingPlayer(''); setAwardDetail('');
      loadAwards(selected);
    }
  };

  const handleRevokeAward = async (awardId) => {
    const { error } = await supabase.from('achievement_awards').delete().eq('id', awardId);
    if (!error) { setAwards(p => p.filter(a => a.id !== awardId)); showToast('Award revoked'); }
  };

  const handleResetAll = async (achievement) => {
    if (!window.confirm(`Reset ALL awards for "${achievement.label}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('achievement_awards').delete().eq('achievement_id', achievement.id);
    if (!error) { setAwards([]); showToast('All awards reset'); }
  };

  if (view === 'edit') return (
    <AchievementForm
      existing={selected}
      onBack={() => { setView('list'); setSelected(null); }}
      onSave={a => {
        setAchievements(p => selected ? p.map(x => x.id === a.id ? a : x) : [a, ...p]);
        showToast(selected ? 'Achievement updated' : 'Achievement created');
        setView('list'); setSelected(null);
      }}
    />
  );

  if (view === 'awards' && selected) return (
    <div>
      <BackHeader title={`${selected.icon} ${selected.label}`} onBack={() => { setView('list'); setSelected(null); }} />

      {/* Manual award */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Grant to player</div>
        <select value={awardingPlayer} onChange={e => setAwardingPlayer(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 14, marginBottom: 8 }}>
          <option value="">Select player...</option>
          {(players || []).filter(p => p.status === 'Active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Inp value={awardDetail} onChange={e => setAwardDetail(e.target.value)} placeholder="Detail (optional, e.g. 'Eagle on hole 3')" style={{ marginBottom: 8 }} />
        <Btn onClick={handleManualAward} disabled={!awardingPlayer}><Award size={14} /> Grant Award</Btn>
      </div>

      {/* Reset all */}
      <button onClick={() => handleResetAll(selected)} style={{
        width: '100%', padding: '10px', borderRadius: 10, marginBottom: 20,
        background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
        color: '#f87171', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <RotateCcw size={13} /> Reset all awards for this achievement
      </button>

      {/* Current awardees */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Earned by {awards.length} player{awards.length !== 1 ? 's' : ''}
      </div>
      {awards.length === 0 ? (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '20px 0' }}>No one has earned this yet</div>
      ) : (
        awards.map(award => (
          <div key={award.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, marginBottom: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
                {formatName(award.player?.player_name || 'Unknown')}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                {award.detail} · {formatDate(award.earned_at)}
              </div>
            </div>
            <button onClick={() => handleRevokeAward(award.id)} style={{
              padding: '5px 10px', borderRadius: 8, background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)', color: '#f87171',
              cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            }}>Revoke</button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionHead>Achievements ({achievements.length})</SectionHead>
        <Btn onClick={() => { setSelected(null); setView('edit'); }}><Plus size={14} /> New</Btn>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
      ) : (
        achievements.map(a => {
          const tier = TIER_COLORS[a.tier];
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              background: a.active ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
              border: `1px solid ${a.active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 12, marginBottom: 8,
              opacity: a.active ? 1 : 0.5,
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: tier.color }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{a.description}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: tier.color, textTransform: 'uppercase', letterSpacing: 1, background: tier.bg, border: `1px solid ${tier.border}`, padding: '1px 5px', borderRadius: 4 }}>{a.tier}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', padding: '1px 5px' }}>{a.auto_award ? 'Auto' : 'Manual'}</span>
                  {!a.active && <span style={{ fontSize: 9, color: '#f87171', padding: '1px 5px' }}>Inactive</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => { setSelected(a); loadAwards(a); setView('awards'); }} style={{
                  padding: '5px 9px', borderRadius: 8, background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80',
                  cursor: 'pointer', fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                }}>Awards</button>
                <button onClick={() => { setSelected(a); setView('edit'); }} style={{
                  padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}><Edit2 size={12} /></button>
                <button onClick={() => handleToggleActive(a)} style={{
                  padding: '5px 8px', borderRadius: 8,
                  background: a.active ? 'rgba(251,191,36,0.08)' : 'rgba(74,222,128,0.08)',
                  border: `1px solid ${a.active ? 'rgba(251,191,36,0.2)' : 'rgba(74,222,128,0.2)'}`,
                  color: a.active ? '#fbbf24' : '#4ade80',
                  cursor: 'pointer', fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                }}>{a.active ? 'Hide' : 'Show'}</button>
                <button onClick={() => handleDelete(a.id)} style={{
                  padding: '5px 8px', borderRadius: 8, background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)', color: '#f87171',
                  cursor: 'pointer',
                }}><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};


// ─── MESSAGES SECTION ────────────────────────────────────────────────────────
const QUICK_TEMPLATES = [
  { label: '💰 Fees Due',      subject: 'Club Fees Reminder', body: 'Hi,\n\nJust a reminder that club fees are now due. Please arrange payment at your earliest convenience.\n\nThank you!' },
  { label: '🏆 Tournament',    subject: 'Upcoming Tournament', body: 'Hi,\n\nDon\'t forget we have a tournament coming up soon. Make sure you\'re registered and ready to play!\n\nSee you on the course!' },
  { label: '🔧 Working Bee',   subject: 'Course Working Bee', body: 'Hi,\n\nWe\'re organising a course working bee. Your help would be greatly appreciated — please come along if you can.\n\nThanks!' },
  { label: '📅 Round Reminder',subject: 'Club Round This Weekend', body: 'Hi,\n\nJust a reminder that we have a club round this weekend. Head to the app to register your score afterwards.\n\nSee you there!' },
];

const MessagesSection = ({ currentUser, showToast }) => {
  const [view, setView]           = useState('compose');
  const [subject, setSubject]     = useState('');
  const [body, setBody]           = useState('');
  const [selected, setSelected]   = useState(new Set());
  const [search, setSearch]       = useState('');
  const [sending, setSending]     = useState(false);
  const [history, setHistory]     = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);

  // Fetch full player list including email (prop players omits email field)
  useEffect(() => {
    supabase.from('players')
      .select('player_id, player_name, player_status, email')
      .eq('player_status', 'Active')
      .order('player_name')
      .then(({ data }) => {
        setAllPlayers((data || []).map(p => ({
          id: p.player_id, name: p.player_name, status: p.player_status, email: p.email || '',
        })));
      });
  }, []);

  const activePlayers = allPlayers.filter(p => p.email);
  const noEmail       = allPlayers.filter(p => !p.email);

  const filtered = activePlayers.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const togglePlayer = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map(p => p.id)));
  const selectNone = () => setSelected(new Set());

  const applyTemplate = (t) => { setSubject(t.subject); setBody(t.body); };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('club_messages')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);
    setHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { if (view === 'history') loadHistory(); }, [view]);

  const handleSend = async () => {
    if (!subject.trim())    { showToast('Subject is required', 'error'); return; }
    if (!body.trim())       { showToast('Message body is required', 'error'); return; }
    if (selected.size === 0){ showToast('Select at least one recipient', 'error'); return; }

    setSending(true);
    try {
      const recipients = activePlayers
        .filter(p => selected.has(p.id))
        .map(p => ({ email: p.email, name: formatName(p.name), id: p.id }));

      // Call Supabase Edge Function using the built-in invoker
      const { data: result, error: fnError } = await supabase.functions.invoke('dynamic-action', {
        body: {
          subject: subject.trim(),
          body: body.trim(),
          recipients: recipients.map(r => ({ email: r.email, name: r.name })),
        },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(`Edge function error: ${fnError.message || JSON.stringify(fnError)}`);
      }
      const sent   = result.sent   || 0;
      const failed = result.failed || 0;

      // Log to DB
      await supabase.from('club_messages').insert({
        subject: subject.trim(),
        body: body.trim(),
        sent_by: currentUser.id,
        recipient_ids:    recipients.map(r => r.id),
        recipient_emails: recipients.map(r => r.email),
        recipient_names:  recipients.map(r => r.name),
        sent_count:   sent,
        failed_count: failed,
        status: failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial',
      });

      if (failed === 0) {
        showToast(`✉️ Sent to ${sent} member${sent !== 1 ? 's' : ''}`);
        setSubject(''); setBody(''); setSelected(new Set());
      } else {
        showToast(`Sent ${sent}, failed ${failed}`, 'error');
      }
    } catch (err) {
      console.error('Send error:', err);
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const statusColor = { sent: '#4ade80', partial: '#fbbf24', failed: '#f87171' };
  const statusIcon  = { sent: '✓', partial: '⚠️', failed: '✗' };

  return (
    <div>
      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['compose', <><Mail size={13} /> Compose</>], ['history', <><Clock size={13} /> Sent History</>]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: view === id ? BRAND.primary : 'rgba(255,255,255,0.05)',
            border: `1px solid ${view === id ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: view === id ? '#4ade80' : 'rgba(255,255,255,0.4)',
            fontFamily: "'DM Sans', sans-serif",
          }}>{label}</button>
        ))}
      </div>

      {view === 'compose' && (
        <div>
          {/* Quick templates */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Quick Templates</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUICK_TEMPLATES.map(t => (
                <button key={t.label} onClick={() => applyTemplate(t)} style={{
                  padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif",
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <Field label="Subject *">
            <Inp value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Club Fees Due" />
          </Field>

          {/* Body */}
          <Field label="Message *">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                resize: 'vertical', lineHeight: 1.5,
              }}
            />
          </Field>

          {/* Recipients */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Recipients ({selected.size} selected)
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={selectAll} style={{ fontSize: 11, color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>All</button>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>·</span>
                <button onClick={selectNone} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>None</button>
              </div>
            </div>

            <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." style={{ marginBottom: 8 }} />

            {noEmail.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', marginBottom: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
                <AlertCircle size={13} color="#fbbf24" />
                <span style={{ fontSize: 12, color: '#fbbf24' }}>{noEmail.length} member{noEmail.length !== 1 ? 's' : ''} have no email address and will be skipped</span>
              </div>
            )}

            <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No members with email addresses</div>
              ) : (
                filtered.map(p => {
                  const isSelected = selected.has(p.id);
                  return (
                    <div key={p.id} onClick={() => togglePlayer(p.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: isSelected ? 'rgba(74,222,128,0.06)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        background: isSelected ? BRAND.primary : 'rgba(255,255,255,0.07)',
                        border: `1.5px solid ${isSelected ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.15)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <Check size={12} color="#4ade80" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{formatName(p.name)}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Send button */}
          <Btn fullWidth onClick={handleSend} disabled={sending || selected.size === 0 || !subject || !body}>
            <Send size={14} />{sending ? `Sending to ${selected.size} member${selected.size !== 1 ? 's' : ''}...` : `Send to ${selected.size} member${selected.size !== 1 ? 's' : ''}`}
          </Btn>
        </div>
      )}

      {view === 'history' && (
        <div>
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>No messages sent yet</div>
            </div>
          ) : (
            history.map(msg => {
              const isExpanded = expandedMsg === msg.id;
              return (
                <div key={msg.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, marginBottom: 10, overflow: 'hidden',
                }}>
                  <div onClick={() => setExpandedMsg(isExpanded ? null : msg.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: `${statusColor[msg.status]}20`,
                        border: `1px solid ${statusColor[msg.status]}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12,
                      }}>{statusIcon[msg.status]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 3 }}>{msg.subject}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: statusColor[msg.status] }}>
                            {msg.sent_count} sent{msg.failed_count > 0 ? `, ${msg.failed_count} failed` : ''}
                          </span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{formatDate(msg.sent_at)}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} color="rgba(255,255,255,0.2)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 10 }}>
                        {msg.body}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Sent to ({msg.recipient_names?.length || 0})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(msg.recipient_names || []).map((name, i) => (
                          <span key={i} style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
                          }}>{name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'courses', label: 'Courses', icon: MapPin },
  { id: 'requests', label: 'Requests', icon: FileText },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'messages', label: 'Messages', icon: Mail },
];

export const AdminPanel = ({ currentUser, tournaments, rounds: roundsProp, courses, players, onDataChanged, onBack, pendingRequestsCount = 0 }) => {
  const [rounds, setRounds] = React.useState(roundsProp || []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (roundsProp && roundsProp.length > 0) { setRounds(roundsProp); return; }
    // Load rounds ourselves if not provided
    supabase.from('rounds').select('*').then(({ data }) => { if (data) setRounds(data); });
  }, [roundsProp]);
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onBack && (
              <button onClick={onBack} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <ChevronLeft size={15} /> Home
              </button>
            )}
            <button onClick={() => setMenuOpen(s => !s)} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: 'white',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 18, height: 2, background: 'white', borderRadius: 1 }} />)}
            </button>
          </div>
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
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const hasBadge = id === 'requests' && pendingRequestsCount > 0;
              return (
                <button key={id} onClick={() => { setActiveSection(id); setMenuOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px',
                  background: activeSection === id ? 'rgba(74,222,128,0.1)' : 'transparent',
                  borderLeft: `3px solid ${activeSection === id ? BRAND.light : 'transparent'}`,
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <Icon size={18} color={activeSection === id ? BRAND.light : 'rgba(255,255,255,0.4)'} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: activeSection === id ? 700 : 500, color: activeSection === id ? BRAND.light : 'rgba(255,255,255,0.7)' }}>
                    {label}
                  </span>
                  {hasBadge && (
                    <span style={{
                      background: '#f87171', color: 'white', borderRadius: 10,
                      padding: '1px 7px', fontSize: 11, fontWeight: 800, marginRight: 8,
                    }}>
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
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
          <RequestsSection courses={courses} currentUser={currentUser} players={players} showToast={showToast} />
        )}
        {activeSection === 'announcements' && (
          <AnnouncementsSection currentUser={currentUser} showToast={showToast} />
        )}
        {activeSection === 'achievements' && (
          <AchievementsSection players={players} showToast={showToast} />
        )}
        {activeSection === 'messages' && (
          <MessagesSection currentUser={currentUser} showToast={showToast} />
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
