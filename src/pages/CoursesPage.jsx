import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate } from '../utils';
import { Badge, EmptyState, SectionLabel } from '../components/ui';
import { vsParLabel } from '../utils/strokeplay';
import { ChevronLeft, ChevronRight, MapPin, AlertTriangle, Plus, Check, X, Flag } from 'lucide-react';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const totalPar = (pars) => {
  if (!pars) return null;
  const obj = typeof pars === 'string' ? JSON.parse(pars) : pars;
  return Object.values(obj).reduce((a, b) => a + b, 0);
};

const parsToArray = (pars, holes = 18) => {
  if (!pars) return Array(holes).fill(3);
  const obj = typeof pars === 'string' ? JSON.parse(pars) : pars;
  return Array.from({ length: holes }, (_, i) => obj[String(i + 1)] ?? 3);
};

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
    {children}
  </div>
);

// ─── PAR GRID ─────────────────────────────────────────────────────────────────
const ParGrid = ({ pars, holes }) => {
  const parArr = parsToArray(pars, holes);
  const front = parArr.slice(0, 9);
  const back = parArr.slice(9);
  const hasBoth = back.length > 0;

  const HalfGrid = ({ arr, startHole, label }) => (
    <div style={{ marginBottom: hasBoth ? 12 : 0 }}>
      {hasBoth && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${arr.length}, 1fr)`, gap: 4 }}>
        {arr.map((par, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginBottom: 3 }}>{startHole + i}</div>
            <div style={{
              height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: par === 3 ? 'rgba(74,222,128,0.1)' : par === 4 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${par === 3 ? 'rgba(74,222,128,0.2)' : par === 4 ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)'}`,
              fontSize: 13, fontWeight: 700,
              color: par === 3 ? '#4ade80' : par === 4 ? '#fbbf24' : '#f87171',
              fontFamily: "'Syne', sans-serif",
            }}>
              {par}
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>
        Par {arr.reduce((a, b) => a + b, 0)}
      </div>
    </div>
  );

  return (
    <div>
      <HalfGrid arr={front} startHole={1} label="Front 9" />
      {hasBoth && <HalfGrid arr={back} startHole={10} label="Back 9" />}
    </div>
  );
};

// ─── HAZARD CARD ──────────────────────────────────────────────────────────────
const HazardCard = ({ hazard, isAdmin, onClear }) => (
  <div style={{
    background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
    borderRadius: 12, padding: '12px 14px', marginBottom: 8,
    display: 'flex', gap: 10, alignItems: 'flex-start',
  }}>
    <AlertTriangle size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
    <div style={{ flex: 1 }}>
      {hazard.hole && (
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 3 }}>Hole {hazard.hole}</div>
      )}
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{hazard.description}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
        Reported {formatDate(hazard.reported_at)}
      </div>
    </div>
    {isAdmin && (
      <button onClick={() => onClear(hazard.id)} style={{
        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
        color: '#4ade80', cursor: 'pointer', whiteSpace: 'nowrap',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Clear
      </button>
    )}
  </div>
);

// ─── REPORT HAZARD FORM ───────────────────────────────────────────────────────
const ReportHazardForm = ({ courseId, holes, currentUser, onSaved, onCancel }) => {
  const [hole, setHole] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('course_hazards').insert({
      course_id: courseId,
      hole: hole ? parseInt(hole) : null,
      description: description.trim(),
      reported_by: currentUser.id,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px', marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 14 }}>Report Temporary Hazard</div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Hole</div>
          <select value={hole} onChange={e => setHole(e.target.value)} style={{
            width: '100%', padding: '10px 8px', borderRadius: 10,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none',
          }}>
            <option value="" style={{ background: '#0d2b0d' }}>Any</option>
            {Array.from({ length: holes }, (_, i) => (
              <option key={i + 1} value={i + 1} style={{ background: '#0d2b0d' }}>{i + 1}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Description</div>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Basket moved 10m left"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !description.trim()} style={{
          flex: 2, padding: '10px', borderRadius: 10,
          background: description.trim() ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(74,222,128,0.3)', color: 'white',
          fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          {saving ? 'Reporting...' : 'Report Hazard'}
        </button>
      </div>
    </div>
  );
};

// ─── CHANGE REQUEST FORM ──────────────────────────────────────────────────────
const ChangeRequestForm = ({ courseId, courseName, currentUser, onSaved, onCancel }) => {
  const [form, setForm] = useState({ request_type: 'layout', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  const types = [
    { value: 'par_change', label: 'Par Change' },
    { value: 'layout', label: 'Layout / Basket' },
    { value: 'facilities', label: 'Facilities' },
    { value: 'new_course', label: 'New Course' },
    { value: 'other', label: 'Other' },
  ];

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('course_requests').insert({
      course_id: courseId || null,
      request_type: form.request_type,
      title: form.title.trim(),
      description: form.description.trim(),
      submitted_by: currentUser.id,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inputStyle = {
    width: '100%', padding: '11px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none',
    boxSizing: 'border-box', marginBottom: 10,
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px', marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 14 }}>
        {courseName ? `Request Change — ${courseName}` : 'Request New Course'}
      </div>

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Type</div>
      <select value={form.request_type} onChange={e => f('request_type', e.target.value)} style={{ ...inputStyle }}>
        {types.map(t => <option key={t.value} value={t.value} style={{ background: '#0d2b0d' }}>{t.label}</option>)}
      </select>

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Title</div>
      <input value={form.title} onChange={e => f('title', e.target.value)} placeholder="Short summary" style={inputStyle} />

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Details</div>
      <textarea value={form.description} onChange={e => f('description', e.target.value)} placeholder="Describe the change or addition..." rows={3} style={{
        ...inputStyle, resize: 'vertical', lineHeight: 1.5,
      }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.description.trim()} style={{
          flex: 2, padding: '10px', borderRadius: 10,
          background: (form.title.trim() && form.description.trim()) ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(74,222,128,0.3)', color: 'white',
          fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          {saving ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
};

// ─── COURSE DETAIL ────────────────────────────────────────────────────────────
const CourseDetail = ({ course, currentUser, isAdmin, myRoundsCount, onBack }) => {
  const [hazards, setHazards] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const tp = totalPar(course.pars);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = useCallback(async () => {
    const [{ data: haz }, { data: req }] = await Promise.all([
      supabase.from('course_hazards').select('*').eq('course_id', course.id).eq('cleared', false).order('reported_at', { ascending: false }),
      supabase.from('course_requests').select('*').eq('course_id', course.id).eq('status', 'pending').order('submitted_at', { ascending: false }),
    ]);
    setHazards(haz || []);
    setRequests(req || []);
    setLoading(false);
  }, [course.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClearHazard = async (id) => {
    await supabase.from('course_hazards').update({ cleared: true, cleared_at: new Date().toISOString(), cleared_by: currentUser.id }).eq('id', id);
    setHazards(prev => prev.filter(h => h.id !== id));
    showToast('Hazard cleared');
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: '#16a34a', color: 'white', padding: '12px 20px', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <Check size={15} /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${BRAND.primary}dd, #071407)`, padding: '52px 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '6px 12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
            <ChevronLeft size={15} /> Courses
          </button>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>{course.name}</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {course.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                <MapPin size={13} /> {course.location}
              </div>
            )}
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{course.holes || 18} holes</span>
            {tp && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Par {tp}</span>}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {myRoundsCount > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.light, fontFamily: "'Syne', sans-serif" }}>{myRoundsCount}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>My Rounds</div>
              </div>
            )}
            {hazards.length > 0 && (
              <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24', fontFamily: "'Syne', sans-serif" }}>{hazards.length}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Hazard{hazards.length !== 1 ? 's' : ''}</div>
              </div>
            )}
          </div>

          {/* Directions */}
          {course.directions_url && (
            <a href={course.directions_url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <MapPin size={13} /> Get Directions
            </a>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Par grid */}
        {course.pars && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Hole Pars</SectionTitle>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px' }}>
              <ParGrid pars={course.pars} holes={course.holes || 18} />
            </div>
          </div>
        )}

        {/* Notes */}
        {course.notes && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Layout Notes</SectionTitle>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              {course.notes}
            </div>
          </div>
        )}

        {/* Facilities */}
        {course.facilities && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Facilities</SectionTitle>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              {course.facilities}
            </div>
          </div>
        )}

        {/* Active hazards */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle>Active Hazards</SectionTitle>
            {!showHazardForm && (
              <button onClick={() => setShowHazardForm(true)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
                color: '#fbbf24', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                <Plus size={13} /> Report
              </button>
            )}
          </div>

          {showHazardForm && (
            <ReportHazardForm
              courseId={course.id}
              holes={course.holes || 18}
              currentUser={currentUser}
              onSaved={() => { setShowHazardForm(false); loadData(); showToast('Hazard reported'); }}
              onCancel={() => setShowHazardForm(false)}
            />
          )}

          {loading ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}>Loading...</div>
          ) : hazards.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>No active hazards reported</div>
          ) : (
            hazards.map(h => <HazardCard key={h.id} hazard={h} isAdmin={isAdmin} onClear={handleClearHazard} />)
          )}
        </div>

        {/* Change requests */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle>Change Requests</SectionTitle>
            {!showRequestForm && (
              <button onClick={() => setShowRequestForm(true)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                <Plus size={13} /> Request
              </button>
            )}
          </div>

          {showRequestForm && (
            <ChangeRequestForm
              courseId={course.id}
              courseName={course.name}
              currentUser={currentUser}
              onSaved={() => { setShowRequestForm(false); loadData(); showToast('Request submitted'); }}
              onCancel={() => setShowRequestForm(false)}
            />
          )}

          {!loading && requests.length === 0 && !showRequestForm && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>No pending requests</div>
          )}

          {requests.map(r => (
            <div key={r.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{r.title}</div>
                <Badge label={r.request_type.replace('_', ' ')} color="rgba(255,255,255,0.3)" />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{r.description}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>Submitted {formatDate(r.submitted_at)}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

// ─── COURSE LIST CARD ─────────────────────────────────────────────────────────
const CourseCard = ({ course, myRoundsCount, activeHazards, onClick }) => {
  const tp = totalPar(course.pars);
  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '16px 18px', marginBottom: 10, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>{course.name}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {course.location && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={11} /> {course.location}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{course.holes || 18} holes{tp ? ` · Par ${tp}` : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {myRoundsCount > 0 && (
            <span style={{ fontSize: 11, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: BRAND.light, borderRadius: 6, padding: '2px 8px' }}>
              {myRoundsCount} round{myRoundsCount !== 1 ? 's' : ''}
            </span>
          )}
          {activeHazards > 0 && (
            <span style={{ fontSize: 11, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={10} /> {activeHazards} hazard{activeHazards !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
    </div>
  );
};

// ─── MAIN COURSES PAGE ────────────────────────────────────────────────────────
export const CoursesPage = ({ currentUser, isAdmin, courses: initialCourses }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState(initialCourses || []);
  const [hazardCounts, setHazardCounts] = useState({});
  const [myRoundCounts, setMyRoundCounts] = useState({});
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Keep courses in sync with prop changes
  useEffect(() => { setCourses(initialCourses || []); }, [initialCourses]);

  // Load hazard counts and my round counts for all courses
  useEffect(() => {
    const loadMeta = async () => {
      setLoading(true);
      const courseIds = (initialCourses || []).map(c => c.id);
      if (courseIds.length === 0) { setLoading(false); return; }

      const [{ data: hazards }, { data: myScores }] = await Promise.all([
        supabase.from('course_hazards').select('course_id').eq('cleared', false).in('course_id', courseIds),
        supabase.from('round_scores')
          .select('round_id, rounds!inner(course_id)')
          .eq('player_id', currentUser.id),
      ]);

      // Count hazards per course
      const hCounts = {};
      (hazards || []).forEach(h => { hCounts[h.course_id] = (hCounts[h.course_id] || 0) + 1; });
      setHazardCounts(hCounts);

      // Count my rounds per course
      const rCounts = {};
      (myScores || []).forEach(s => {
        const cid = s.rounds?.course_id;
        if (cid) rCounts[cid] = (rCounts[cid] || 0) + 1;
      });
      setMyRoundCounts(rCounts);
      setLoading(false);
    };
    loadMeta();
  }, [initialCourses, currentUser.id]);

  // Course detail view
  if (selectedCourse) {
    return (
      <div style={pageStyle}>
        <CourseDetail
          course={selectedCourse}
          currentUser={currentUser}
          isAdmin={isAdmin}
          myRoundsCount={myRoundCounts[selectedCourse.id] || 0}
          onBack={() => setSelectedCourse(null)}
        />
        <GlobalStyles />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: '#16a34a', color: 'white', padding: '12px 20px', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <Check size={15} /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${BRAND.primary}dd, #071407)`, padding: '52px 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>⛳ Courses</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>Local Courses</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{courses.length} course{courses.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>Loading courses...</div>
        ) : courses.length === 0 ? (
          <EmptyState icon="⛳" title="No courses yet" subtitle="Courses will appear here once added by an admin" />
        ) : (
          courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              myRoundsCount={myRoundCounts[course.id] || 0}
              activeHazards={hazardCounts[course.id] || 0}
              onClick={() => setSelectedCourse(course)}
            />
          ))
        )}

        {/* Request new course */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          {!showRequestForm ? (
            <button onClick={() => setShowRequestForm(true)} style={{
              width: '100%', padding: '13px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Plus size={14} /> Suggest a new course
            </button>
          ) : (
            <ChangeRequestForm
              courseId={null}
              courseName={null}
              currentUser={currentUser}
              onSaved={() => { setShowRequestForm(false); showToast('Request submitted to committee'); }}
              onCancel={() => setShowRequestForm(false)}
            />
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
  fontFamily: "'DM Sans', sans-serif", color: 'white', paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }
    button { font-family: 'DM Sans', sans-serif; }
    button:active { transform: scale(0.97); }
    textarea { font-family: 'DM Sans', sans-serif; }
    a:active { opacity: 0.7; }
  `}</style>
);
