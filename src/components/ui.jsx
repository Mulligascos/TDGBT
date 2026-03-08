import React, { useEffect } from 'react';
import { Check, X, ChevronLeft } from 'lucide-react';
import { BRAND } from '../utils';

// ─── TOAST ────────────────────────────────────────────────────────────────────
export const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: '#16a34a',
    error: '#dc2626',
    info: '#2563eb',
    warning: '#d97706',
  };

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200, animation: 'slideDown 0.3s ease-out',
    }}>
      <div style={{
        background: colors[type] || colors.success,
        color: 'var(--text-primary)', padding: '12px 20px',
        borderRadius: 14, display: 'flex', alignItems: 'center',
        gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        maxWidth: 340, fontFamily: "'DM Sans', sans-serif",
        fontSize: 14, fontWeight: 500,
      }}>
        {type === 'success' && <Check size={16} />}
        {type === 'error' && <X size={16} />}
        <span>{message}</span>
      </div>
    </div>
  );
};

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, onBack, action }) => (
  <div style={{
    background: `linear-gradient(160deg, ${BRAND.primary}, ${BRAND.accent})`,
    padding: '48px 20px 24px',
    position: 'relative',
  }}>
    {onBack && (
      <button onClick={onBack} style={{
        position: 'absolute', top: 16, left: 16,
        background: 'var(--bg-input)', border: 'none',
        borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
        color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
      }}>
        <ChevronLeft size={16} /> Back
      </button>
    )}
    {action && (
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        {action}
      </div>
    )}
    <h1 style={{
      fontFamily: "'Syne', sans-serif",
      fontSize: 28, fontWeight: 800,
      color: 'var(--text-primary)', margin: 0,
      letterSpacing: -0.5,
    }}>{title}</h1>
    {subtitle && (
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 13, marginTop: 4, fontFamily: "'DM Sans', sans-serif",
      }}>{subtitle}</p>
    )}
  </div>
);

// ─── CARD ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    background: 'var(--bg-card)',
    border: '1px solid var(--border-card)',
    borderRadius: 16, overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    ...style,
  }}>
    {children}
  </div>
);

// ─── BADGE ────────────────────────────────────────────────────────────────────
export const Badge = ({ label, color = BRAND.light }) => (
  <span style={{
    display: 'inline-block',
    background: `${color}20`,
    border: `1px solid ${color}40`,
    color, borderRadius: 20,
    padding: '2px 10px', fontSize: 11,
    fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.5, textTransform: 'uppercase',
  }}>{label}</span>
);

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, subtitle }) => (
  <div style={{
    textAlign: 'center', padding: '48px 20px',
    color: 'var(--text-muted)',
    fontFamily: "'DM Sans', sans-serif",
  }}>
    {icon && <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>}
    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</p>
    {subtitle && <p style={{ fontSize: 13 }}>{subtitle}</p>}
  </div>
);

// ─── BUTTON ───────────────────────────────────────────────────────────────────
export const Button = ({ children, onClick, variant = 'primary', disabled, fullWidth, style = {} }) => {
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
      border: `1px solid rgba(74,222,128,0.3)`,
      color: 'var(--text-primary)',
    },
    secondary: {
      background: 'var(--text-muted)',
      border: '1px solid var(--border-card)',
      color: 'var(--text-primary)',
    },
    danger: {
      background: 'rgba(220,38,38,0.15)',
      border: '1px solid rgba(220,38,38,0.3)',
      color: '#f87171',
    },
    ghost: {
      background: 'transparent',
      border: '1px solid var(--border)',
      color: 'var(--text-secondary)',
    },
  };

  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[variant],
      width: fullWidth ? '100%' : 'auto',
      padding: '13px 20px', borderRadius: 14,
      fontFamily: "'Syne', sans-serif",
      fontSize: 14, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s ease',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 8,
      ...style,
    }}>
      {children}
    </button>
  );
};

// ─── INPUT ────────────────────────────────────────────────────────────────────
export const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--text-secondary)', textTransform: 'uppercase',
        letterSpacing: 1.5, marginBottom: 8,
        fontFamily: "'DM Sans', sans-serif",
      }}>{label}</label>
    )}
    <input style={{
      width: '100%', padding: '13px 16px', borderRadius: 12,
      background: 'var(--text-muted)',
      border: '1px solid var(--border-card)',
      color: 'var(--text-primary)', fontSize: 15,
      fontFamily: "'DM Sans', sans-serif",
      outline: 'none', boxSizing: 'border-box',
    }} {...props} />
  </div>
);

// ─── SELECT ───────────────────────────────────────────────────────────────────
export const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--text-secondary)', textTransform: 'uppercase',
        letterSpacing: 1.5, marginBottom: 8,
        fontFamily: "'DM Sans', sans-serif",
      }}>{label}</label>
    )}
    <select style={{
      width: '100%', padding: '13px 16px', borderRadius: 12,
      background: 'var(--text-muted)',
      border: '1px solid var(--border-card)',
      color: 'var(--text-primary)', fontSize: 15,
      fontFamily: "'DM Sans', sans-serif",
      outline: 'none', appearance: 'none',
      cursor: 'pointer', boxSizing: 'border-box',
    }} {...props}>
      {children}
    </select>
  </div>
);

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
export const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginBottom: 10, marginTop: 4,
    fontFamily: "'DM Sans', sans-serif",
  }}>{children}</div>
);

// ─── DIVIDER ──────────────────────────────────────────────────────────────────
export const Divider = () => (
  <div style={{ height: 1, background: 'var(--text-muted)', margin: '16px 0' }} />
);

// ─── LOGO WATERMARK ──────────────────────────────────────────────────────────
export const LogoWatermark = ({ size = 80, opacity = 0.08, style = {} }) => (
  <img
    src="/assets/tdg_logo.gif"
    alt=""
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      objectFit: 'contain',
      opacity,
      pointerEvents: 'none',
      userSelect: 'none',
      ...style,
    }}
  />
);
