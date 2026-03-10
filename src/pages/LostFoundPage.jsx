import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate, haptic } from '../utils';
import { EmptyState, LogoWatermark } from '../components/ui';
import { ChevronLeft, Plus, Check, X, Search } from 'lucide-react';

// ─── STYLES ───────────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', paddingBottom: 90,
};

const DISC_COLOURS = ['White', 'Yellow', 'Orange', 'Red', 'Pink', 'Purple', 'Blue', 'Green', 'Black', 'Grey', 'Swirly', 'Other'];
const POPULAR_BRANDS = ['Innova', 'Discraft', 'Dynamic Discs', 'Latitude 64', 'Westside', 'MVP', 'Axiom', 'Prodigy', 'Kastaplast', 'Other'];

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  background: 'var(--bg-input)', border: '1px solid var(--border-card)',
  color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none',
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    button:active { transform: scale(0.97); }
    select option { background: var(--bg-nav); }
    input::placeholder, textarea::placeholder { color: var(--text-muted); }
  `}</style>
);

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    found:   { label: 'Unclaimed', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)',  color: '#fbbf24' },
    claimed: { label: 'Claimed',   bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)', color: '#4ade80' },
    lost:    { label: 'Lost',      bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', color: '#f87171' },
  }[status] || { label: status, bg: 'var(--text-muted)', border: 'var(--text-muted)', color: 'var(--text-secondary)' };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: 0.5,
    }}>{cfg.label}</div>
  );
};

// ─── DISC CARD ────────────────────────────────────────────────────────────────
const DiscCard = ({ disc, currentUser, isAdmin, onClaim, onFoundIt, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const isOwn = disc.reported_by === currentUser.id;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, marginBottom: 10, overflow: 'hidden',
      opacity: disc.status === 'claimed' ? 0.6 : 1,
    }}>
      {/* Main row */}
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Colour dot */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-card)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 20 }}>🥏</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: 0.5,
            maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{disc.colour}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {disc.brand} {disc.mould ? `· ${disc.mould}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {disc.type === 'lost'
              ? `Lost near hole ${disc.hole} · ${formatDate(disc.found_date)}`
              : `Hole ${disc.hole} · ${formatDate(disc.found_date)}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {disc.type === 'lost'
              ? `Reported missing by ${formatName(disc.finder_name || 'Unknown')}`
              : `Found by ${formatName(disc.finder_name || 'Unknown')}`}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <StatusBadge status={disc.status} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 14px' }}>
          {disc.description && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {disc.description}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { label: 'Colour', value: disc.colour },
              { label: 'Hole', value: `Hole ${disc.hole}` },
              { label: 'Course', value: disc.course_name || 'Unknown' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '5px 10px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {disc.status !== 'claimed' && disc.type !== 'lost' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {!isOwn && (
                <button onClick={() => onClaim(disc)} style={{
                  flex: 1, padding: '10px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                  border: '1px solid rgba(74,222,128,0.3)', color: 'var(--text-on-brand)',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Check size={14} /> This is my disc!
                </button>
              )}
              {(isOwn || isAdmin) && (
                <button onClick={() => onDelete(disc.id)} style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <X size={13} /> {isAdmin && !isOwn ? 'Remove' : 'Delete'}
                </button>
              )}
            </div>
          )}

          {disc.type === 'lost' && disc.status !== 'claimed' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {!isOwn && (
                <button onClick={() => onFoundIt(disc)} style={{
                  flex: 1, padding: '10px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #92400e, #b45309)',
                  border: '1px solid rgba(251,191,36,0.3)', color: 'var(--text-primary)',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Check size={14} /> I found this disc!
                </button>
              )}
              {(isOwn || isAdmin) && (
                <button onClick={() => onDelete(disc.id)} style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <X size={13} /> {isAdmin && !isOwn ? 'Remove' : 'Delete'}
                </button>
              )}
            </div>
          )}

          {disc.status === 'claimed' && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {disc.type === 'lost' ? 'Disc was found and returned 🎉' : 'Reunited with its owner 🎉'}
            </div>
          )}

          {isAdmin && disc.status !== 'claimed' && disc.type !== 'lost' && (
            <button onClick={() => onClaim(disc)} style={{
              marginTop: 8, width: '100%', padding: '8px', borderRadius: 10,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              color: '#fbbf24', fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer',
            }}>
              ✓ Mark as claimed (admin)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── REPORT FORM ─────────────────────────────────────────────────────────────
const FoundForm = ({ currentUser, courses, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    brand: '', mould: '', colour: '', hole: '', course_id: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.brand && form.colour && form.hole && form.course_id;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true); setError('');
    try {
      const course = courses.find(c => c.id === form.course_id);
      const { error: err } = await supabase.from('lost_discs').insert({
        brand: form.brand, mould: form.mould || null,
        colour: form.colour, hole: parseInt(form.hole),
        course_id: form.course_id, course_name: course?.name || '',
        description: form.description || null,
        reported_by: currentUser.id,
        finder_name: currentUser.name,
        found_date: new Date().toISOString().split('T')[0],
        status: 'found',
        type: 'found',
      });
      if (err) throw err;
      haptic('success');
      onSubmit();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', background: 'var(--bg-nav)', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Report Found Disc</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Brand */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Brand *</div>
          <select value={form.brand} onChange={e => set('brand', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
            <option value="">Select brand...</option>
            {POPULAR_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Mould */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Mould / Model</div>
          <input value={form.mould} onChange={e => set('mould', e.target.value)} placeholder="e.g. Destroyer, Buzzz, Judge..." style={inputStyle} />
        </div>

        {/* Colour */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Colour *</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DISC_COLOURS.map(c => (
              <button key={c} onClick={() => set('colour', c)} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: form.colour === c ? BRAND.primary : 'var(--bg-input)',
                border: `1px solid ${form.colour === c ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`,
                color: form.colour === c ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Course + Hole */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Course *</div>
            <select value={form.course_id} onChange={e => set('course_id', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">Select...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Hole *</div>
            <input type="number" min="1" max="27" value={form.hole} onChange={e => set('hole', e.target.value)} placeholder="1" style={inputStyle} />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Extra details</div>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Any markings, name on disc, condition..." rows={2}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
        </div>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#f87171' }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!valid || saving} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: valid ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'var(--text-muted)',
          border: valid ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
          color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
          cursor: valid ? 'pointer' : 'not-allowed', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Reporting...' : '🥏 Report Found Disc'}
        </button>
      </div>
    </div>
  );
};


// ─── LOST FORM ────────────────────────────────────────────────────────────────
const LostForm = ({ currentUser, courses, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    brand: '', mould: '', colour: '', hole: '', course_id: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.brand && form.colour && form.course_id;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true); setError('');
    try {
      const course = courses.find(c => c.id === form.course_id);
      const { error: err } = await supabase.from('lost_discs').insert({
        brand: form.brand, mould: form.mould || null,
        colour: form.colour, hole: parseInt(form.hole) || null,
        course_id: form.course_id, course_name: course?.name || '',
        description: form.description || null,
        reported_by: currentUser.id,
        finder_name: currentUser.name,
        found_date: new Date().toISOString().split('T')[0],
        status: 'lost',
        type: 'lost',
      });
      if (err) throw err;
      haptic('success');
      onSubmit();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', background: '#1a0a00', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Report Lost Disc</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
          🔍 Others will be notified to keep an eye out for your disc
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Brand *</div>
          <select value={form.brand} onChange={e => set('brand', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
            <option value="">Select brand...</option>
            {POPULAR_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Mould / Model</div>
          <input value={form.mould} onChange={e => set('mould', e.target.value)} placeholder="e.g. Destroyer, Buzzz, Judge..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Colour *</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DISC_COLOURS.map(col => (
              <button key={col} onClick={() => set('colour', col)} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: form.colour === col ? 'rgba(248,113,113,0.2)' : 'var(--text-muted)',
                border: `1px solid ${form.colour === col ? 'rgba(248,113,113,0.4)' : 'var(--text-muted)'}`,
                color: form.colour === col ? '#f87171' : 'var(--text-secondary)', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>{col}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Course *</div>
            <select value={form.course_id} onChange={e => set('course_id', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">Select...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Hole</div>
            <input type="number" min="1" max="27" value={form.hole} onChange={e => set('hole', e.target.value)} placeholder="?" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Extra details</div>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Any markings, name on disc, stamp details, approximate area lost..." rows={2}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
        </div>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#f87171' }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!valid || saving} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: valid ? 'linear-gradient(135deg, #92400e, #b45309)' : 'var(--text-muted)',
          border: valid ? '1px solid rgba(251,191,36,0.3)' : '1px solid var(--border)',
          color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
          cursor: valid ? 'pointer' : 'not-allowed', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Reporting...' : '🔍 Report Lost Disc'}
        </button>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export const LostFoundPage = ({ currentUser, isAdmin, courses }) => {
  const [discs, setDiscs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [filter, setFilter] = useState('active'); // 'active' | 'lost' | 'claimed' | 'all'
  const [search, setSearch] = useState('');

  const loadDiscs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lost_discs')
      .select('*')
      .order('found_date', { ascending: false });
    setDiscs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDiscs(); }, [loadDiscs]);

  // For found discs — owner claims their disc back
  const handleClaim = async (disc) => {
    haptic('medium');
    const { error } = await supabase
      .from('lost_discs')
      .update({ status: 'claimed', claimed_by: currentUser.id, claimed_at: new Date().toISOString() })
      .eq('id', disc.id);
    if (!error) setDiscs(prev => prev.map(d => d.id === disc.id ? { ...d, status: 'claimed' } : d));
  };

  // For lost discs — any member can mark it as found and provide their name
  const handleFoundIt = async (disc) => {
    haptic('success');
    const { error } = await supabase
      .from('lost_discs')
      .update({
        status: 'claimed',
        claimed_by: currentUser.id,
        claimed_at: new Date().toISOString(),
        finder_name: currentUser.name,  // update finder to the person who found it
      })
      .eq('id', disc.id);
    if (!error) setDiscs(prev => prev.map(d =>
      d.id === disc.id ? { ...d, status: 'claimed', finder_name: currentUser.name } : d
    ));
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('lost_discs').delete().eq('id', id);
    if (!error) setDiscs(prev => prev.filter(d => d.id !== id));
  };

  const filtered = discs.filter(d => {
    if (filter === 'active') {
      if (d.status === 'claimed') return false;
    } else if (filter === 'lost') {
      if (d.type !== 'lost') return false;
    } else if (filter !== 'all') {
      if (d.status !== filter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return (d.brand + d.mould + d.colour + d.course_name + d.description).toLowerCase().includes(s);
    }
    return true;
  });

  const unclaimed = discs.filter(d => d.status === 'found' && d.type !== 'lost').length;
  const lostCount = discs.filter(d => d.type === 'lost' && d.status !== 'claimed').length;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-header)',
        padding: '36px 20px 14px',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <LogoWatermark size={110} opacity={0.08} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 0 }} />
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            🥏 Lost & Found
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
            Disc Registry
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            {[unclaimed > 0 && `${unclaimed} found`, lostCount > 0 && `${lostCount} lost`].filter(Boolean).join(' · ') || 'No active listings'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px 0' }}>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search brand, colour, course..."
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setShowForm(true)} style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            border: '1px solid rgba(74,222,128,0.3)', color: '#ffffff',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <Plus size={15} /> Found a disc
          </button>
          <button onClick={() => setShowLostForm(true)} style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            background: 'linear-gradient(135deg, #92400e, #b45309)',
            border: '1px solid rgba(251,191,36,0.3)', color: '#ffffff',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            🔍 Lost a disc
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {[
            { id: 'active',  label: 'Active' },
            { id: 'lost',    label: lostCount > 0 ? `Lost (${lostCount})` : 'Lost' },
            { id: 'claimed', label: 'Claimed' },
            { id: 'all',     label: 'All' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: filter === tab.id ? BRAND.primary : 'var(--bg-input)',
              border: `1px solid ${filter === tab.id ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
              color: filter === tab.id ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🥏"
            title={filter === 'found' ? 'No unclaimed discs' : 'Nothing here'}
            subtitle={filter === 'active' ? "Use the buttons above to report a found or lost disc" : 'Try a different filter'}
          />
        ) : (
          filtered.map(disc => (
            <DiscCard
              key={disc.id}
              disc={disc}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onClaim={handleClaim}
              onFoundIt={handleFoundIt}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {showForm && (
        <FoundForm
          currentUser={currentUser}
          courses={courses}
          onSubmit={() => { setShowForm(false); loadDiscs(); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {showLostForm && (
        <LostForm
          currentUser={currentUser}
          courses={courses}
          onSubmit={() => { setShowLostForm(false); loadDiscs(); }}
          onClose={() => setShowLostForm(false)}
        />
      )}

      <GlobalStyles />
    </div>
  );
};
