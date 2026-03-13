import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, haptic } from '../utils';
import { Button, Input, Select, LogoWatermark } from '../components/ui';

export const LoginPage = ({ players, isLoadingPlayers, onLogin, loginError }) => {
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ full_name: '', email: '', phone: '', message: '' });
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedName || pin.length !== 4) return;
    haptic('medium');
    setLoading(true);
    await onLogin(selectedName, pin);
    setLoading(false);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.full_name.trim()) { setRequestError('Please enter your name'); return; }
    setRequestLoading(true);
    setRequestError('');
    const { error } = await supabase.from('member_requests').insert({
      full_name: requestForm.full_name.trim(),
      email: requestForm.email.trim() || null,
      phone: requestForm.phone.trim() || null,
      message: requestForm.message.trim() || null,
    });
    if (error) { setRequestError('Something went wrong, please try again.'); }
    else { setRequestSent(true); }
    setRequestLoading(false);
  };

  if (showRequest) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-page)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <button onClick={() => { setShowRequest(false); setRequestSent(false); setRequestError(''); }} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 13, marginBottom: 24, padding: 0, display: 'flex', alignItems: 'center', gap: 6,
          }}>← Back to sign in</button>

          {requestSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                Request Sent!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
                Your membership request has been sent to the club admins. They'll get you set up soon.
              </p>
              <button onClick={() => { setShowRequest(false); setRequestSent(false); }} style={{
                marginTop: 24, padding: '12px 28px', borderRadius: 12,
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                border: 'none', color: '#fff', fontFamily: "'Syne', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Back to Sign In</button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <img src="/assets/TDG_LogoSmall.PNG" alt="TDG" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Request to Join
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                  Fill in your details and a club admin will add you to the app.
                </p>
              </div>

              <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                    Full Name *
                  </label>
                  <input
                    value={requestForm.full_name}
                    onChange={e => setRequestForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Your name"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={requestForm.email}
                    onChange={e => setRequestForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={requestForm.phone}
                    onChange={e => setRequestForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="021 000 0000"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                    Message
                  </label>
                  <textarea
                    value={requestForm.message}
                    onChange={e => setRequestForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Anything you'd like to add…"
                    rows={3}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {requestError && (
                  <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                    {requestError}
                  </div>
                )}

                <button type="submit" disabled={requestLoading || !requestForm.full_name.trim()} style={{
                  width: '100%', padding: '14px',
                  background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                  border: '1px solid rgba(74,222,128,0.3)', borderRadius: 14,
                  color: '#fff', fontFamily: "'Syne', sans-serif",
                  fontSize: 15, fontWeight: 700,
                  cursor: requestLoading || !requestForm.full_name.trim() ? 'not-allowed' : 'pointer',
                  opacity: requestLoading || !requestForm.full_name.trim() ? 0.5 : 1,
                }}>
                  {requestLoading ? 'Sending…' : 'Send Request'}
                </button>
              </form>
            </>
          )}
        </div>
        <style>{`* { box-sizing: border-box; } input, textarea { -webkit-appearance: none; }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Logo area */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img
          src="/assets/TDG_LogoSmall.PNG"
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
          color: 'var(--text-primary)', margin: 0, letterSpacing: -1,
        }}>TDG Portal</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
          Timaru Disc Golf Club
        </p>
      </div>

      {/* Login form */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 24, padding: 28,
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'var(--text-secondary)', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 8,
            }}>Select your name</label>
            {isLoadingPlayers ? (
              <div style={{
                height: 48, borderRadius: 12,
                background: 'var(--bg-card)',
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
                  border: '1px solid var(--border-card)',
                  color: selectedName ? 'white' : 'var(--text-muted)',
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
              color: 'var(--text-secondary)', textTransform: 'uppercase',
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
                  : '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 15,
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
              borderRadius: 14, color: 'var(--text-primary)',
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

      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 32, textAlign: 'center' }}>
        TDG Portal App · Timaru Disc Golf Club
      </p>

      <button onClick={() => setShowRequest(true)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: BRAND.light, fontSize: 13, fontWeight: 600,
        marginTop: 12, padding: '4px 8px', fontFamily: "'DM Sans', sans-serif",
        textDecoration: 'underline', textDecorationColor: `${BRAND.light}60`,
      }}>
        Not a member yet? Request to join →
      </button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        button { font-family: 'DM Sans', sans-serif; }
        select option { background: var(--bg-nav); }
      `}</style>
    </div>
  );
};
