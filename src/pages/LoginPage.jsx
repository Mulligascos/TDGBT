import React, { useState } from 'react';
import { BRAND, haptic } from '../utils';
import { Button, Input, Select, LogoWatermark } from '../components/ui';

export const LoginPage = ({ players, isLoadingPlayers, onLogin, loginError }) => {
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedName || pin.length !== 4) return;
    haptic('medium');
    setLoading(true);
    await onLogin(selectedName, pin);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #071407 0%, #0d2b0d 50%, #071407 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Logo area */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img
          src="/assets/tdg_logo.GIF"
          alt="Timaru Disc Golf Club"
          style={{
            width: 120, height: 120,
            objectFit: 'contain',
            margin: '0 auto 16px',
            display: 'block',
            filter: 'drop-shadow(0 8px 24px rgba(74,222,128,0.25))',
          }}
        />
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 32, fontWeight: 800,
          color: 'white', margin: 0, letterSpacing: -1,
        }}>TDG Members</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 }}>
          Timaru Disc Golf Club
        </p>
      </div>

      {/* Login form */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: 28,
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 8,
            }}>Select your name</label>
            {isLoadingPlayers ? (
              <div style={{
                height: 48, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                animation: 'shimmer 1.5s infinite',
                backgroundSize: '200% 100%',
              }} />
            ) : (
              <select
                value={selectedName}
                onChange={e => setSelectedName(e.target.value)}
                required
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: 12,
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: selectedName ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: 15, fontFamily: "'DM Sans', sans-serif",
                  outline: 'none', appearance: 'none', cursor: 'pointer',
                  boxSizing: 'border-box', 
                }}
              >
                <option value="" style={{ background: 'var(--bg-nav)' }}>Choose your name...</option>
                {players.map(p => (
                  <option key={p.id} value={p.name} style={{ background: 'var(--bg-nav)' }}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 8,
            }}>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              placeholder="4-digit PIN"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 12,
                background: 'var(--bg-input)',
                border: loginError
                  ? '1px solid rgba(248,113,113,0.5)'
                  : '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none', boxSizing: 'border-box',
                letterSpacing: 8,
              }}
            />
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 13, color: '#f87171', marginBottom: 16,
            }}>
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedName || pin.length !== 4}
            style={{
              width: '100%', padding: '14px',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: 14, color: 'white',
              fontFamily: "'Syne', sans-serif",
              fontSize: 15, fontWeight: 700,
              cursor: loading || !selectedName || pin.length !== 4 ? 'not-allowed' : 'pointer',
              opacity: loading || !selectedName || pin.length !== 4 ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, marginTop: 32, textAlign: 'center' }}>
        TDG Members App · Timaru Disc Golf Club
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        button { font-family: 'DM Sans', sans-serif; }
        select option { background: #0d2b0d; }
      `}</style>
    </div>
  );
};
