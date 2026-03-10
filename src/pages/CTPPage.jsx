import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate } from '../utils';
import { LogoWatermark } from '../components/ui';
import { MapPin, Plus, Check, X, Target, ChevronLeft, Trash2, Lock } from 'lucide-react';

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', paddingBottom: 90,
};

// Calculate distance between two GPS coords in metres (Haversine formula)
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (m) => {
  if (m < 1) return `${Math.round(m * 100)}cm`;
  if (m < 10) return `${m.toFixed(2)}m`;
  return `${m.toFixed(1)}m`;
};

const Inp = ({ style, ...props }) => (
  <input style={{
    width: '100%', padding: '10px 12px', borderRadius: 12,
    background: 'var(--bg-input)', border: '1px solid var(--border-card)',
    color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    outline: 'none', ...style,
  }} {...props} />
);

const Btn = ({ children, onClick, disabled, variant = 'primary', style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '12px 20px', borderRadius: 12, fontFamily: "'DM Sans', sans-serif",
    fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, border: 'none',
    background: variant === 'danger' ? 'rgba(248,113,113,0.15)' :
                variant === 'ghost'  ? 'var(--bg-card)' : BRAND.primary,
    color: variant === 'danger' ? '#f87171' :
           variant === 'ghost'  ? 'var(--text-secondary)' : '#ffffff',
    ...style,
  }}>{children}</button>
);

// ─── GPS CAPTURE BUTTON ───────────────────────────────────────────────────────
const GpsButton = ({ label, onCapture, captured, hint }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const capture = () => {
    setLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        onCapture(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        setLoading(false);
        setError(err.code === 1 ? 'Location permission denied' : 'Could not get location — try outside');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={capture} disabled={loading} style={{
        width: '100%', padding: '14px', borderRadius: 14, cursor: loading ? 'wait' : 'pointer',
        background: captured ? 'rgba(74,222,128,0.1)' : 'var(--text-muted)',
        border: `2px solid ${captured ? 'rgba(74,222,128,0.4)' : 'var(--text-muted)'}`,
        color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif",
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: captured ? 'rgba(74,222,128,0.2)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading ? <div style={{ width: 18, height: 18, border: '2px solid var(--border-card)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> :
           captured ? <Check size={18} color="#4ade80" /> : <MapPin size={18} color="var(--text-muted)" />}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: captured ? '#4ade80' : 'white' }}>
            {loading ? 'Getting location...' : captured ? `✓ ${label} captured` : label}
          </div>
          {captured ? (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{hint}</div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Tap to capture your GPS position</div>
          )}
        </div>
      </button>
      {error && <div style={{ fontSize: 12, color: '#f87171', marginTop: 6, paddingLeft: 4 }}>⚠️ {error}</div>}
    </div>
  );
};

// ─── CREATE CHALLENGE (Admin) ─────────────────────────────────────────────────
const CreateChallenge = ({ currentUser, courses, onCreated, onBack }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [hole, setHole] = useState('');
  const [pinPos, setPinPos] = useState(null);
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const course = courses.find(c => c.id === courseId);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!pinPos) { setError('You must capture the pin position'); return; }
    setSaving(true); setError('');
    const { data, error: err } = await supabase.from('ctp_challenges').insert({
      name: name.trim(),
      description: description.trim() || null,
      course_id: courseId || null,
      course_name: course?.name || null,
      hole: hole ? parseInt(hole) : null,
      pin_lat: pinPos.lat,
      pin_lng: pinPos.lng,
      created_by: currentUser.id,
      ends_at: endsAt || null,
      status: 'active',
    }).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated(data);
  };

  return (
    <div>
      <div style={{ background: 'var(--bg-header)', padding: '36px 20px 14px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <LogoWatermark size={110} opacity={0.07} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)' }} />
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '6px 12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
            <ChevronLeft size={15} /> CTP Challenges
          </button>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>New CTP Challenge</div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Challenge Name *</div>
          <Inp value={name} onChange={e => setName(e.target.value)} placeholder="e.g. October CTP — Hole 7" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Description</div>
          <Inp value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Course</div>
            <select value={courseId} onChange={e => setCourseId(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
              <option value="">Any</option>
              {courses.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--bg-nav)' }}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Hole</div>
            <Inp type="number" value={hole} onChange={e => setHole(e.target.value)} placeholder="e.g. 7" min="1" max="27" />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Ends (optional)</div>
          <Inp type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
        </div>

        {/* Pin position capture */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Pin Position *</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
            📍 Stand at the basket and tap the button below to record the pin's GPS position.
          </div>
          <GpsButton
            label="Capture Pin Position"
            onCapture={(lat, lng, acc) => setPinPos({ lat, lng, acc })}
            captured={!!pinPos}
            hint={pinPos ? `${pinPos.lat.toFixed(6)}, ${pinPos.lng.toFixed(6)} · ±${Math.round(pinPos.acc)}m accuracy` : ''}
          />
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
        <Btn onClick={handleSave} disabled={saving || !name || !pinPos} style={{ width: '100%' }}>
          <Target size={16} />{saving ? 'Creating...' : 'Create Challenge'}
        </Btn>
      </div>
    </div>
  );
};

// ─── CHALLENGE DETAIL (Player view + leaderboard) ─────────────────────────────
const ChallengeDetail = ({ challenge, currentUser, isAdmin, onBack, onDeleted }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myEntry, setMyEntry] = useState(null);
  const [discPos, setDiscPos] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const isClosed = challenge.status === 'closed' ||
    (challenge.ends_at && new Date(challenge.ends_at) < new Date());

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('ctp_entries')
      .select('*')
      .eq('challenge_id', challenge.id)
      .order('distance_m');
    setEntries(data || []);
    setMyEntry(data?.find(e => e.player_id === currentUser.id) || null);
    setLoading(false);
  }, [challenge.id, currentUser.id]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSubmit = async () => {
    if (!discPos) return;
    setSubmitting(true);
    const distance = haversineDistance(challenge.pin_lat, challenge.pin_lng, discPos.lat, discPos.lng);
    const { error } = await supabase.from('ctp_entries').upsert({
      challenge_id: challenge.id,
      player_id: currentUser.id,
      player_name: currentUser.name,
      disc_lat: discPos.lat,
      disc_lng: discPos.lng,
      distance_m: distance,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,player_id' });
    setSubmitting(false);
    if (!error) {
      showToast(`📍 Recorded! Your distance: ${formatDistance(distance)}`);
      setDiscPos(null);
      loadEntries();
    }
  };

  const handleDelete = async () => {
    await supabase.from('ctp_challenges').delete().eq('id', challenge.id);
    onDeleted();
  };

  const handleClose = async () => {
    await supabase.from('ctp_challenges').update({ status: 'closed' }).eq('id', challenge.id);
    showToast('Challenge closed');
    onBack();
  };

  const myRank = myEntry ? entries.findIndex(e => e.player_id === currentUser.id) + 1 : null;

  return (
    <div style={pageStyle}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: '#16a34a', color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'var(--bg-header)', padding: '36px 20px 20px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <LogoWatermark size={110} opacity={0.07} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)' }} />
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '6px 12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
            <ChevronLeft size={15} /> CTP Challenges
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>{challenge.name}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {challenge.course_name && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{challenge.course_name}</span>}
                {challenge.hole && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Hole {challenge.hole}</span>}
                <span style={{ fontSize: 12, color: isClosed ? '#f87171' : '#4ade80', fontWeight: 700 }}>{isClosed ? '🔒 Closed' : '🟢 Active'}</span>
              </div>
              {challenge.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{challenge.description}</div>}
            </div>
            {myRank && (
              <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '10px 14px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: myRank === 1 ? '#fbbf24' : BRAND.light, fontFamily: "'Syne', sans-serif" }}>
                  {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `#${myRank}`}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Your Rank</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.light, marginTop: 2 }}>{formatDistance(myEntry.distance_m)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>

        {/* Submit section */}
        {!isClosed && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              {myEntry ? '🔄 Update My Shot' : '📍 Record My Shot'}
            </div>
            {myEntry && (
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#4ade80' }}>
                Current: <strong>{formatDistance(myEntry.distance_m)}</strong> from pin — rank #{myRank}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              🥏 Throw your disc, walk to where it landed, then tap below.
            </div>
            <GpsButton
              label="I'm standing at my disc"
              onCapture={(lat, lng, acc) => setDiscPos({ lat, lng, acc })}
              captured={!!discPos}
              hint={discPos ? `±${Math.round(discPos.acc)}m GPS accuracy · tap Submit to record` : ''}
            />
            {discPos && (
              <Btn onClick={handleSubmit} disabled={submitting} style={{ width: '100%', marginTop: 4 }}>
                <Target size={15} />{submitting ? 'Submitting...' : `Submit — ${formatDistance(haversineDistance(challenge.pin_lat, challenge.pin_lng, discPos.lat, discPos.lng))} from pin`}
              </Btn>
            )}
          </div>
        )}

        {isClosed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', marginBottom: 20, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12 }}>
            <Lock size={14} color="#f87171" />
            <span style={{ fontSize: 13, color: '#f87171' }}>This challenge is closed — no more entries</span>
          </div>
        )}

        {/* Leaderboard */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Leaderboard · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No entries yet — be the first!</div>
          </div>
        ) : (
          entries.map((entry, i) => {
            const isMe = entry.player_id === currentUser.id;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 8,
                background: isMe ? 'rgba(74,222,128,0.06)' : 'var(--text-muted)',
                border: `1px solid ${isMe ? 'rgba(74,222,128,0.2)' : 'var(--text-muted)'}`,
                borderRadius: 14,
              }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                  {medal || `${i + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 600, color: isMe ? BRAND.light : 'white' }}>
                    {formatName(entry.player_name)}
                    {isMe && <span style={{ fontSize: 11, color: BRAND.light, marginLeft: 6 }}>you</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(entry.submitted_at)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? '#fbbf24' : isMe ? BRAND.light : 'white', fontFamily: "'Syne', sans-serif" }}>
                    {formatDistance(entry.distance_m)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>from pin</div>
                </div>
              </div>
            );
          })
        )}

        {/* Admin controls */}
        {isAdmin && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Admin</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isClosed && (
                <Btn onClick={handleClose} variant="ghost" style={{ flex: 1 }}>
                  <Lock size={14} /> Close Challenge
                </Btn>
              )}
              {!confirmDelete ? (
                <Btn onClick={() => setConfirmDelete(true)} variant="danger" style={{ flex: 1 }}>
                  <Trash2 size={14} /> Delete
                </Btn>
              ) : (
                <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                  <Btn onClick={handleDelete} variant="danger" style={{ flex: 1 }}>Confirm Delete</Btn>
                  <Btn onClick={() => setConfirmDelete(false)} variant="ghost" style={{ flex: 1 }}>Cancel</Btn>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ─── MAIN CTP PAGE ────────────────────────────────────────────────────────────
export const CTPPage = ({ currentUser, isAdmin, courses }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | create | detail
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('active'); // active | closed | all

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('ctp_challenges')
      .select('*, entry_count:ctp_entries(count)')
      .order('created_at', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (view === 'create') return (
    <CreateChallenge
      currentUser={currentUser}
      courses={courses || []}
      onBack={() => setView('list')}
      onCreated={(c) => { setChallenges(p => [c, ...p]); setView('list'); }}
    />
  );

  if (view === 'detail' && selected) return (
    <ChallengeDetail
      challenge={selected}
      currentUser={currentUser}
      isAdmin={isAdmin}
      onBack={() => { setView('list'); load(); }}
      onDeleted={() => { setChallenges(p => p.filter(c => c.id !== selected.id)); setView('list'); }}
    />
  );

  const now = new Date();
  const filtered = challenges.filter(c => {
    const closed = c.status === 'closed' || (c.ends_at && new Date(c.ends_at) < now);
    if (filter === 'active') return !closed;
    if (filter === 'closed') return closed;
    return true;
  });

  const activeCount = challenges.filter(c => c.status === 'active' && (!c.ends_at || new Date(c.ends_at) >= now)).length;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ background: 'var(--bg-header)', padding: '36px 20px 20px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <LogoWatermark size={110} opacity={0.07} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)' }} />
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>🎯 CTP</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>Closest to Pin</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{activeCount} active challenge{activeCount !== 1 ? 's' : ''}</div>
          </div>
          {isAdmin && (
            <button onClick={() => setView('create')} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: BRAND.primary, border: 'none', borderRadius: 12,
              color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              <Plus size={15} /> New
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['active', '🟢 Active'], ['closed', '🔒 Closed'], ['all', 'All']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: filter === val ? BRAND.primary : 'var(--bg-input)',
              border: `1px solid ${filter === val ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
              color: filter === val ? '#ffffff' : 'var(--text-secondary)',
              fontFamily: "'DM Sans', sans-serif",
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No challenges yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {isAdmin ? 'Tap + New to create the first CTP challenge' : 'Check back when an admin creates a challenge'}
            </div>
          </div>
        ) : (
          filtered.map(c => {
            const closed = c.status === 'closed' || (c.ends_at && new Date(c.ends_at) < now);
            const entryCount = c.entry_count?.[0]?.count || 0;
            return (
              <div key={c.id} onClick={() => { setSelected(c); setView('detail'); }} style={{
                background: 'var(--bg-card)', border: `1px solid ${closed ? 'var(--bg-card)' : 'var(--text-muted)'}`,
                borderRadius: 16, padding: '16px', marginBottom: 10, cursor: 'pointer',
                opacity: closed ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: closed ? '#f87171' : '#4ade80', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {closed ? '🔒 Closed' : '🟢 Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{c.name}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {c.course_name && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📍 {c.course_name}</span>}
                      {c.hole && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Hole {c.hole}</span>}
                      {c.ends_at && !closed && <span style={{ fontSize: 12, color: '#fbbf24' }}>⏱ Ends {formatDate(c.ends_at)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.light, fontFamily: "'Syne', sans-serif" }}>{entryCount}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>entries</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
