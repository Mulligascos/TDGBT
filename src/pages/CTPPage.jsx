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

// ─── LEAFLET MAP ──────────────────────────────────────────────────────────────
// Loads Leaflet from CDN on first use — no API key required (OpenStreetMap tiles)
let leafletLoaded = false;
const loadLeaflet = () => new Promise((resolve) => {
  if (window.L) { resolve(window.L); return; }
  if (leafletLoaded) { const t = setInterval(() => { if (window.L) { clearInterval(t); resolve(window.L); } }, 100); return; }
  leafletLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = () => resolve(window.L);
  document.head.appendChild(script);
});

const CTPMap = ({ pinLat, pinLng, discLat, discLng }) => {
  const mapRef = React.useRef(null);
  const instanceRef = React.useRef(null);
  const markersRef = React.useRef({});

  useEffect(() => {
    let map;
    loadLeaflet().then(L => {
      if (!mapRef.current || instanceRef.current) return;
      map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
      instanceRef.current = map;
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 21,
        attribution: 'Tiles © Esri',
      }).addTo(map);

      // Pin marker (basket)
      const pinIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#fbbf24;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🎯</div>`,
        className: '', iconAnchor: [14, 14],
      });
      markersRef.current.pin = L.marker([pinLat, pinLng], { icon: pinIcon }).addTo(map).bindPopup('📍 Pin / Basket');

      if (discLat && discLng) {
        const discIcon = L.divIcon({
          html: `<div style="width:24px;height:24px;background:#4ade80;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🥏</div>`,
          className: '', iconAnchor: [12, 12],
        });
        markersRef.current.disc = L.marker([discLat, discLng], { icon: discIcon }).addTo(map).bindPopup('🥏 Your disc');
        L.polyline([[pinLat, pinLng], [discLat, discLng]], { color: '#4ade80', weight: 2, dashArray: '6,6', opacity: 0.7 }).addTo(map);
        const bounds = L.latLngBounds([[pinLat, pinLng], [discLat, discLng]]);
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView([pinLat, pinLng], 19);
      }
    });
    return () => { if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; } };
  }, []);

  // Update disc marker without re-mounting map
  useEffect(() => {
    if (!instanceRef.current || !window.L) return;
    const L = window.L;
    if (discLat && discLng) {
      if (markersRef.current.disc) {
        markersRef.current.disc.setLatLng([discLat, discLng]);
      } else {
        const discIcon = L.divIcon({
          html: `<div style="width:24px;height:24px;background:#4ade80;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🥏</div>`,
          className: '', iconAnchor: [12, 12],
        });
        markersRef.current.disc = L.marker([discLat, discLng], { icon: discIcon }).addTo(instanceRef.current);
      }
      if (markersRef.current.line) instanceRef.current.removeLayer(markersRef.current.line);
      markersRef.current.line = L.polyline([[pinLat, pinLng], [discLat, discLng]], { color: '#4ade80', weight: 2, dashArray: '6,6', opacity: 0.7 }).addTo(instanceRef.current);
      const bounds = L.latLngBounds([[pinLat, pinLng], [discLat, discLng]]);
      instanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [discLat, discLng]);

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-card)', marginBottom: 14 }}>
      <div ref={mapRef} style={{ height: 220, width: '100%' }} />
      <div style={{ padding: '8px 12px', background: 'var(--bg-input)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>🎯 Pin / basket</span>
        {discLat && <span>🥏 Your disc</span>}
        <span style={{ marginLeft: 'auto' }}>© Esri World Imagery</span>
      </div>
    </div>
  );
};

// ─── DISTANCE CAPTURE (GPS + Manual) ─────────────────────────────────────────
const DistanceCapture = ({ pinLat, pinLng, onCapture, captured, hint }) => {
  const [mode, setMode] = useState('gps'); // 'gps' | 'manual'
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [manualVal, setManualVal] = useState('');
  const [manualUnit, setManualUnit] = useState('m'); // 'm' | 'ft'
  const [discPos, setDiscPos] = useState(null); // {lat, lng, acc} — GPS only

  const captureGps = () => {
    setGpsLoading(true); setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        setDiscPos(p);
        onCapture({ lat: p.lat, lng: p.lng, acc: p.acc, manual: false });
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? 'Location permission denied' : 'Could not get location — try outside');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const submitManual = () => {
    const val = parseFloat(manualVal);
    if (!val || val <= 0) return;
    const metres = manualUnit === 'ft' ? val * 0.3048 : val;
    onCapture({ manual: true, distance_m: metres });
  };

  const modeBtn = (id, label) => (
    <button onClick={() => { setMode(id); onCapture(null); setDiscPos(null); setManualVal(''); }} style={{
      flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
      background: mode === id ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : 'var(--bg-input)',
      border: `1px solid ${mode === id ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
      color: mode === id ? '#ffffff' : 'var(--text-secondary)',
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700,
    }}>{label}</button>
  );

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {modeBtn('gps', '📡 GPS')}
        {modeBtn('manual', '✏️ Manual')}
      </div>

      {mode === 'gps' ? (
        <>
          <button onClick={captureGps} disabled={gpsLoading} style={{
            width: '100%', padding: '14px', borderRadius: 14, cursor: gpsLoading ? 'wait' : 'pointer',
            background: discPos ? 'rgba(74,222,128,0.1)' : 'var(--bg-input)',
            border: `2px solid ${discPos ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`,
            color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: discPos ? 'rgba(74,222,128,0.2)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {gpsLoading ? <div style={{ width: 18, height: 18, border: '2px solid var(--border-card)', borderTopColor: BRAND.light, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> :
               discPos ? <Check size={18} color="#4ade80" /> : <MapPin size={18} color="var(--text-muted)" />}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: discPos ? '#4ade80' : 'var(--text-primary)' }}>
                {gpsLoading ? 'Getting location...' : discPos ? '✓ Position captured' : "I'm standing at my disc"}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {discPos ? `±${Math.round(discPos.acc)}m accuracy · tap Submit to record` : 'Walk to your disc, then tap'}
              </div>
            </div>
          </button>
          {gpsError && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8, paddingLeft: 4 }}>⚠️ {gpsError}</div>}
          {/* Map — show once pin position known */}
          {pinLat && pinLng && (
            <CTPMap pinLat={pinLat} pinLng={pinLng} discLat={discPos?.lat} discLng={discPos?.lng} />
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
            Measure the distance from your disc to the basket and enter it below.
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Inp
              type="number" min="0" step="0.1"
              value={manualVal} onChange={e => { setManualVal(e.target.value); onCapture(null); }}
              placeholder={`Distance in ${manualUnit}`}
              style={{ flex: 1 }}
            />
            <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-card)', flexShrink: 0 }}>
              {['m', 'ft'].map(u => (
                <button key={u} onClick={() => setManualUnit(u)} style={{
                  padding: '0 14px', background: manualUnit === u ? BRAND.primary : 'var(--bg-input)',
                  border: 'none', color: manualUnit === u ? '#ffffff' : 'var(--text-secondary)',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>{u}</button>
              ))}
            </div>
          </div>
          {manualVal && parseFloat(manualVal) > 0 && (
            <Btn onClick={submitManual} style={{ width: '100%', marginBottom: 4 }}>
              <Check size={15} /> Confirm {parseFloat(manualVal)}{manualUnit}
              {manualUnit === 'ft' ? ` (${(parseFloat(manualVal) * 0.3048).toFixed(1)}m)` : ''}
            </Btn>
          )}
        </>
      )}
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
            <ChevronLeft size={15} /> Virtual CTP
          </button>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>New Virtual CTP</div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Challenge Name *</div>
          <Inp value={name} onChange={e => setName(e.target.value)} placeholder="e.g. October Virtual CTP — Hole 7" />
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
          <button onClick={() => {
            navigator.geolocation.getCurrentPosition(
              pos => setPinPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
              () => setError('Could not get location'),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
          }} style={{
            width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer', marginBottom: 8,
            background: pinPos ? 'rgba(74,222,128,0.1)' : 'var(--bg-input)',
            border: `2px solid ${pinPos ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`,
            color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: pinPos ? 'rgba(74,222,128,0.2)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pinPos ? <Check size={18} color="#4ade80" /> : <MapPin size={18} color="var(--text-muted)" />}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: pinPos ? '#4ade80' : 'var(--text-primary)' }}>
                {pinPos ? '✓ Pin position captured' : 'Capture Pin Position'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {pinPos ? `${pinPos.lat.toFixed(6)}, ${pinPos.lng.toFixed(6)} · ±${Math.round(pinPos.acc)}m` : 'Stand at the basket, then tap'}
              </div>
            </div>
          </button>
          {pinPos && <CTPMap pinLat={pinPos.lat} pinLng={pinPos.lng} />}
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
  const [capture, setCapture] = useState(null); // {lat,lng,acc,manual:false} | {manual:true,distance_m}
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
    if (!capture) return;
    setSubmitting(true);
    let distance, disc_lat, disc_lng;
    if (capture.manual) {
      distance = capture.distance_m;
      disc_lat = null; disc_lng = null;
    } else {
      distance = haversineDistance(challenge.pin_lat, challenge.pin_lng, capture.lat, capture.lng);
      disc_lat = capture.lat; disc_lng = capture.lng;
    }
    const { error } = await supabase.from('ctp_entries').upsert({
      challenge_id: challenge.id,
      player_id: currentUser.id,
      player_name: currentUser.name,
      disc_lat, disc_lng,
      distance_m: distance,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,player_id' });
    setSubmitting(false);
    if (!error) {
      showToast(`📍 Recorded! Your distance: ${formatDistance(distance)}`);
      setCapture(null);
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
            <ChevronLeft size={15} /> Virtual CTP
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
              🥏 Throw your disc, then use GPS or enter the distance manually.
            </div>
            <DistanceCapture
              pinLat={challenge.pin_lat}
              pinLng={challenge.pin_lng}
              onCapture={setCapture}
              captured={!!capture}
            />
            {capture && (
              <Btn onClick={handleSubmit} disabled={submitting} style={{ width: '100%', marginTop: 4 }}>
                <Target size={15} />{submitting ? 'Submitting...' : `Submit — ${formatDistance(capture.manual ? capture.distance_m : haversineDistance(challenge.pin_lat, challenge.pin_lng, capture.lat, capture.lng))} from pin`}
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
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>🎯 Virtual CTP</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>Virtual CTP</div>
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
              {isAdmin ? 'Tap + New to create the first Virtual CTP' : 'Check back when an admin creates a challenge'}
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
