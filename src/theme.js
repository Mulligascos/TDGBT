// ─── THEME SYSTEM ─────────────────────────────────────────────────────────────
// All theme values are applied as CSS custom properties on :root
// Components read from BRAND which pulls live values from CSS vars

const STORAGE_KEY = 'tdgbt-theme';

export const PRESET_COLORS = [
  { label: 'Forest',   primary: '#006400', accent: '#228B22', light: '#4ade80' },
  { label: 'Ocean',    primary: '#0c4a6e', accent: '#0369a1', light: '#38bdf8' },
  { label: 'Fire',     primary: '#7c2d12', accent: '#c2410c', light: '#fb923c' },
  { label: 'Purple',   primary: '#4c1d95', accent: '#6d28d9', light: '#a78bfa' },
  { label: 'Gold',     primary: '#713f12', accent: '#92400e', light: '#fbbf24' },
  { label: 'Rose',     primary: '#881337', accent: '#be123c', light: '#fb7185' },
  { label: 'Slate',    primary: '#1e293b', accent: '#334155', light: '#94a3b8' },
  { label: 'Teal',     primary: '#134e4a', accent: '#0f766e', light: '#2dd4bf' },
];

export const DEFAULT_THEME = {
  mode: 'dark',
  primaryColor: PRESET_COLORS[0],  // Forest green
  clubName: '',
};

// Dark mode CSS vars
const darkVars = (primary, accent, light) => ({
  '--bg-base':       '#071407',
  '--bg-page':       'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  '--bg-card':       'rgba(255,255,255,0.04)',
  '--bg-card-hover': 'rgba(255,255,255,0.07)',
  '--bg-nav':        'rgba(10, 26, 10, 0.97)',
  '--bg-input':      'rgba(255,255,255,0.07)',
  '--bg-header':     `linear-gradient(160deg, ${primary}dd, #071407)`,
  '--border':        'rgba(255,255,255,0.2)',
  '--border-card':   'rgba(255,255,255,0.4)',
  '--text-primary':  '#ffffff',
  '--text-secondary':'rgba(255,255,255,0.5)',
  '--text-muted':    'rgba(255,255,255,0.25)',
  '--text-on-brand': '#ffffff',
  '--bg-subtle':     'rgba(255,255,255,0.05)',
  '--bg-subtle2':    'rgba(255,255,255,0.08)',
  '--border-subtle': 'rgba(255,255,255,0.15)',
  '--brand-primary': primary,
  '--brand-accent':  accent,
  '--brand-light':   light,
  '--brand-text':    '#052e0f',
});

// Light mode CSS vars
const lightVars = (primary, accent, light) => ({
  '--bg-base':       '#f0f4f0',
  '--bg-page':       'linear-gradient(160deg, #e8f0e8 0%, #f0f4f0 60%, #e8f0e8 100%)',
  '--bg-card':       'rgba(255,255,255,0.8)',
  '--bg-card-hover': 'rgba(255,255,255,0.95)',
  '--bg-nav':        'rgba(240, 244, 240, 0.97)',
  '--bg-input':      'rgba(0,0,0,0.06)',
  '--bg-header':     `linear-gradient(160deg, ${primary}22, #f0f4f0)`,
  '--border':        'rgba(0,0,0,0.2)',
  '--border-card':   'rgba(0,0,0,0.4)',
  '--text-primary':  '#0f1f0f',
  '--text-secondary':'rgba(0,0,0,0.55)',
  '--text-muted':    'rgba(0,0,0,0.3)',
  '--text-on-brand': '#052e0f',
  '--bg-subtle':     'rgba(0,0,0,0.04)',
  '--bg-subtle2':    'rgba(0,0,0,0.07)',
  '--border-subtle': 'rgba(0,0,0,0.15)',
  '--brand-primary': primary,
  '--brand-accent':  accent,
  '--brand-light':   accent,
  '--brand-text':    '#ffffff',
});

export const applyTheme = (theme) => {
  const { mode, primaryColor } = theme;
  const { primary, accent, light } = primaryColor;
  const vars = mode === 'light' ? lightVars(primary, accent, light) : darkVars(primary, accent, light);

  const root = document.documentElement;
  Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));

  // Also update body background
  document.body.style.background = mode === 'light' ? '#f0f4f0' : '#071407';
  document.body.style.color = mode === 'light' ? '#0f1f0f' : '#ffffff';
};

export const saveTheme = (theme) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch {}
  applyTheme(theme);
};

export const loadTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_THEME, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_THEME;
};
