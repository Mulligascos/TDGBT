import React, { useState } from 'react';
import { BRAND } from '../utils';
import { PRESET_COLORS, saveTheme, loadTheme } from '../theme';

const Sun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const Moon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

export const ThemePicker = ({ onThemeChange }) => {
  const [theme, setTheme] = useState(loadTheme);
  const [open, setOpen] = useState(false);

  const update = (partial) => {
    const next = { ...theme, ...partial };
    setTheme(next);
    saveTheme(next);
    onThemeChange?.();
  };

  const cardStyle = {
    background: 'var(--bg-card, rgba(255,255,255,0.04))',
    border: '1px solid var(--border-card, rgba(255,255,255,0.1))',
    borderRadius: 16,
    padding: '16px',
    marginBottom: 16,
  };

  return (
    <div>
      {/* Header row */}
      <button onClick={() => setOpen(p => !p)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-card, rgba(255,255,255,0.04))',
        border: '1px solid var(--border-card, rgba(255,255,255,0.1))',
        borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", marginBottom: open ? 10 : 0,
        transition: 'margin 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${theme.primaryColor.primary}, ${theme.primaryColor.light})`,
          }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, white)' }}>App Theme</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
              {theme.mode === 'dark' ? '🌙 Dark' : '☀️ Light'} · {theme.primaryColor.label}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'var(--text-muted, rgba(255,255,255,0.3))', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ›
        </div>
      </button>

      {open && (
        <div style={{ ...cardStyle, animation: 'fadeIn 0.15s ease' }}>

          {/* Dark / Light toggle */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, rgba(255,255,255,0.3))', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Mode</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { val: 'dark',  label: 'Dark',  Icon: Moon },
              { val: 'light', label: 'Light', Icon: Sun },
            ].map(({ val, label, Icon }) => (
              <button key={val} onClick={() => update({ mode: val })} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px', borderRadius: 12, cursor: 'pointer', border: 'none',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
                background: theme.mode === val
                  ? `rgba(${val === 'dark' ? '74,222,128' : '251,191,36'},0.12)`
                  : 'var(--bg-input, rgba(255,255,255,0.07))',
                color: theme.mode === val
                  ? (val === 'dark' ? '#4ade80' : '#fbbf24')
                  : 'var(--text-secondary, rgba(255,255,255,0.5))',
                border: theme.mode === val
                  ? `1px solid ${val === 'dark' ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`
                  : '1px solid var(--border, rgba(255,255,255,0.08))',
              }}>
                <Icon />{label}
              </button>
            ))}
          </div>

          {/* Colour presets */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, rgba(255,255,255,0.3))', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Colour</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {PRESET_COLORS.map((preset) => {
              const selected = preset.label === theme.primaryColor.label;
              return (
                <button key={preset.label} onClick={() => update({ primaryColor: preset })} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                  background: selected ? `${preset.primary}22` : 'var(--bg-input, rgba(255,255,255,0.05))',
                  border: selected ? `2px solid ${preset.light}` : '2px solid transparent',
                  fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${preset.primary}, ${preset.light})`,
                      boxShadow: selected ? `0 0 12px ${preset.light}66` : 'none',
                    }} />
                    {selected && (
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-primary)',
                      }}>
                        <Check />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: selected ? 700 : 500, color: selected ? preset.light : 'var(--text-muted, rgba(255,255,255,0.4))' }}>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live preview strip */}
          <div style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', height: 8, background: 'var(--border, rgba(255,255,255,0.06))' }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, ${theme.primaryColor.primary}, ${theme.primaryColor.accent}, ${theme.primaryColor.light})`,
              transition: 'background 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, rgba(255,255,255,0.3))', textAlign: 'center', marginTop: 6 }}>
            Changes apply instantly across the app
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
};
