import React, { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName } from '../utils';
import { Badge } from '../components/ui';
import { vsParLabel, vsParColor } from '../utils/strokeplay';
import { ChevronLeft, Eye, EyeOff, Check, X } from 'lucide-react';

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const Section = ({ children }) => (
  <div style={{ marginBottom: 20 }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
  }}>
    {children}
  </div>
);

// ─── MENU ITEM ────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, sub, onClick, chevron = true, danger = false, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    background: danger ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${danger ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 14, padding: '14px 16px',
    cursor: disabled ? 'default' : 'pointer', marginBottom: 8, textAlign: 'left',
    opacity: disabled ? 0.5 : 1,
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#f87171' : 'rgba(255,255,255,0.9)' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{sub}</div>}
    </div>
    {chevron && !danger && (
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
    )}
  </button>
);

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
    if (currentPin !== String(currentUser.pin)) {
      setError('Current PIN is incorrect.');
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PINs do not match.');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from('players')
      .update({ pin: newPin })
      .eq('player_id', currentUser.id);
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
        <input
          type={showPins ? 'text' : 'password'}
          maxLength={4} inputMode="numeric" value={currentPin}
          onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••" style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>New PIN</div>
        <input
          type={showPins ? 'text' : 'password'}
          maxLength={4} inputMode="numeric" value={newPin}
          onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••" style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Confirm New PIN</div>
        <input
          type={showPins ? 'text' : 'password'}
          maxLength={4} inputMode="numeric" value={confirmPin}
          onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••" style={inputStyle}
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <X size={14} /> {error}
        </div>
      )}

      <button onClick={handleSave} disabled={saving || !currentPin || !newPin || !confirmPin} style={{
        width: '100%', padding: '14px', borderRadius: 14,
        background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
        border: '1px solid rgba(74,222,128,0.3)', color: 'white',
        fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: (!currentPin || !newPin || !confirmPin) ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Check size={16} /> {saving ? 'Saving...' : 'Update PIN'}
      </button>
    </div>
  );
};

// ─── SEASON STATS VIEW ────────────────────────────────────────────────────────
const SeasonStats = ({ stats, onViewHistory }) => {
  if (!stats) return null;

  const items = [
    { label: 'Rounds Played', value: stats.roundsPlayed, color: 'white' },
    { label: 'Best Round', value: stats.bestRound != null ? vsParLabel(stats.bestRound) : '—', color: stats.bestRound != null ? vsParColor(stats.bestRound) : 'rgba(255,255,255,0.3)' },
    { label: 'Average Score', value: stats.avgScore != null ? vsParLabel(stats.avgScore) : '—', color: stats.avgScore != null ? vsParColor(stats.avgScore) : 'rgba(255,255,255,0.3)' },
    { label: 'Under Par Rounds', value: stats.underParRounds, color: '#4ade80' },
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '16px', marginBottom: 8,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {items.map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne', sans-serif", lineHeight: 1, marginBottom: 4 }}>
              {value}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      <button onClick={onViewHistory} style={{
        width: '100%', padding: '10px', borderRadius: 10,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        cursor: 'pointer',
      }}>
        View full history →
      </button>
    </div>
  );
};

// ─── MAIN PROFILE PAGE ────────────────────────────────────────────────────────
export const ProfilePage = ({ currentUser, onLogout, onNavigate, updateUser, seasonStats }) => {
  const [view, setView] = useState('main'); // main | change-pin
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const divisionLabel = {
    Mixed: 'Mixed Open',
    Female: 'Female',
    Junior: 'Junior',
    Senior: 'Senior',
  };

  if (view === 'change-pin') {
    return (
      <div style={pageStyle}>
        <div style={{ paddingTop: 52 }}>
          <ChangePinView
            currentUser={currentUser}
            onBack={() => setView('main')}
            onSuccess={showToast}
          />
        </div>
        <GlobalStyles />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#16a34a', color: 'white',
          padding: '12px 20px', borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <Check size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${BRAND.primary}dd, #071407)`,
        padding: '52px 20px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              border: `2px solid ${BRAND.light}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: 'white',
              fontFamily: "'Syne', sans-serif",
            }}>
              {currentUser.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
                {formatName(currentUser.name)}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Badge
                  label={currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'committee' ? 'Committee' : 'Member'}
                  color={currentUser.role === 'admin' ? '#fbbf24' : BRAND.light}
                />
                <Badge
                  label={currentUser.status || 'Active'}
                  color={currentUser.status === 'Active' ? BRAND.light : '#f87171'}
                />
                {currentUser.division && (
                  <Badge
                    label={divisionLabel[currentUser.division] || currentUser.division}
                    color="rgba(255,255,255,0.4)"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Key details row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            {currentUser.bagTag && (
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12,
                padding: '10px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.light, fontFamily: "'Syne', sans-serif" }}>
                  #{currentUser.bagTag}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                  Bag Tag
                </div>
              </div>
            )}
            {currentUser.membershipNumber && (
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12,
                padding: '10px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white', fontFamily: "'Syne', sans-serif" }}>
                  {currentUser.membershipNumber}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                  Member No.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Season stats */}
        <Section>
          <SectionTitle>This Season</SectionTitle>
          {seasonStats ? (
            <SeasonStats stats={seasonStats} onViewHistory={() => onNavigate('history')} />
          ) : (
            <MenuItem
              icon="📊"
              label="My Stats"
              sub="Season performance & history"
              onClick={() => onNavigate('history')}
            />
          )}
        </Section>

        {/* Account */}
        <Section>
          <SectionTitle>Account</SectionTitle>
          <MenuItem
            icon="🔑"
            label="Change PIN"
            sub="Update your 4-digit login PIN"
            onClick={() => setView('change-pin')}
          />
        </Section>

        {/* Sign out */}
        <Section>
          <button onClick={onLogout} style={{
            width: '100%', padding: '14px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 14, color: '#f87171',
            fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </Section>

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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    button:active { transform: scale(0.97); }
    input::placeholder { color: rgba(255,255,255,0.2); }
  `}</style>
);
