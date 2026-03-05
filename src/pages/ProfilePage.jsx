import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName } from '../utils';
import { Badge } from '../components/ui';
import { vsParLabel, vsParColor } from '../utils/strokeplay';
import { ChevronLeft, Eye, EyeOff, Check, X, Edit2 } from 'lucide-react';

// ─── SHARED INPUT ─────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', placeholder = '', hint = '' }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
      {label}
    </div>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '13px 14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
        color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
        outline: 'none', boxSizing: 'border-box',
      }}
    />
    {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>{hint}</div>}
  </div>
);

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
  }}>
    {children}
  </div>
);

// ─── MENU ITEM ────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, sub, onClick, danger = false }) => (
  <button onClick={onClick} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    background: danger ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${danger ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 14, padding: '14px 16px',
    cursor: 'pointer', marginBottom: 8, textAlign: 'left',
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#f87171' : 'rgba(255,255,255,0.9)' }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{sub}</div>}
    </div>
    {!danger && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>}
  </button>
);

// ─── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = 'success' }) => (
  <div style={{
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 200,
    background: type === 'error' ? '#dc2626' : '#16a34a',
    color: 'white', padding: '12px 20px', borderRadius: 14,
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
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
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
          fontSize: 32, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif",
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
            : 'rgba(255,255,255,0.06)',
          border: isDirty ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.08)',
          color: 'white', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
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
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'white', fontFamily: "'DM Sans', sans-serif", fontSize: 15,
    outline: 'none', letterSpacing: 4, boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingTop: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
          Change PIN
        </div>
        <button onClick={() => setShowPins(s => !s)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
          {showPins ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Current PIN</div>
        <input type={showPins ? 'text' : 'password'} maxLength={4} inputMode="numeric" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>New PIN</div>
        <input type={showPins ? 'text' : 'password'} maxLength={4} inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Confirm New PIN</div>
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
        border: '1px solid rgba(74,222,128,0.3)', color: 'white',
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
    { label: 'Rounds', value: stats.roundsPlayed, color: 'white' },
    { label: 'Best Round', value: stats.bestRound != null ? vsParLabel(stats.bestRound) : '—', color: stats.bestRound != null ? vsParColor(stats.bestRound) : 'rgba(255,255,255,0.3)' },
    { label: 'Avg Score', value: stats.avgScore != null ? vsParLabel(stats.avgScore) : '—', color: stats.avgScore != null ? vsParColor(stats.avgScore) : 'rgba(255,255,255,0.3)' },
    { label: 'Under Par', value: stats.underParRounds, color: '#4ade80' },
  ];
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px', marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {items.map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne', sans-serif", lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </div>
      <button onClick={onViewHistory} style={{
        width: '100%', padding: '10px', borderRadius: 10,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer',
      }}>
        View full history →
      </button>
    </div>
  );
};

// ─── MAIN PROFILE PAGE ────────────────────────────────────────────────────────
export const ProfilePage = ({ currentUser, onLogout, onNavigate, updateUser, seasonStats }) => {
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
        background: `linear-gradient(160deg, ${BRAND.primary}dd, #071407)`,
        padding: '52px 20px 28px',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              border: `2px solid ${BRAND.light}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif",
            }}>
              {currentUser.name[0].toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
                {formatName(currentUser.name)}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Badge label={currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'committee' ? 'Committee' : 'Member'} color={currentUser.role === 'admin' ? '#fbbf24' : BRAND.light} />
                <Badge label={currentUser.status || 'Active'} color={currentUser.status === 'Active' ? BRAND.light : '#f87171'} />
                {currentUser.division && <Badge label={divisionLabel[currentUser.division] || currentUser.division} color="rgba(255,255,255,0.4)" />}
              </div>
            </div>

            {/* Edit button */}
            <button onClick={() => setView('edit')} style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Edit2 size={16} />
            </button>
          </div>

          {/* Details row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {currentUser.bagTag && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: BRAND.light, fontFamily: "'Syne', sans-serif" }}>#{currentUser.bagTag}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Bag Tag</div>
              </div>
            )}
            {currentUser.pdgaNumber && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: "'Syne', sans-serif" }}>{currentUser.pdgaNumber}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>PDGA</div>
              </div>
            )}
            {currentUser.udiscUsername && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: "'Syne', sans-serif" }}>{currentUser.udiscUsername}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>UDisc</div>
              </div>
            )}
            {currentUser.email && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{currentUser.email}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Email</div>
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

        {/* Account */}
        <div style={{ marginBottom: 20 }}>
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
  background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  fontFamily: "'DM Sans', sans-serif", color: 'white', paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }
    button { font-family: 'DM Sans', sans-serif; }
    button:active { transform: scale(0.97); }
    input::placeholder { color: rgba(255,255,255,0.2); }
  `}</style>
);
