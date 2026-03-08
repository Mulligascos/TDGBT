// ─── FORMATTING ───────────────────────────────────────────────────────────────

export const formatName = (fullName) => {
  if (!fullName) return '';
  const clean = fullName.replace(' (J)', '').trim();
  const parts = clean.split(' ');
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}`;
};

export const formatFullName = (name) => name?.replace(' (J)', '').trim() || '';

export const ordinal = (n) => {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-NZ', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

export const formatTime = (time) => {
  if (!time) return '';
  return time.slice(0, 5); // HH:MM from time string
};

export const formatTimeAgo = (date) => {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(date);
};

// ─── SCORING ──────────────────────────────────────────────────────────────────

export const isJunior = (player) =>
  player?.status === 'Junior' || player?.name?.includes('(J)');

export const applyJuniorHandicap = (score, player) =>
  isJunior(player) ? Math.max(1, score - 1) : score;

export const calcMatchHoles = (scoresJson, player1, player2) => {
  let p1 = 0, p2 = 0;
  (scoresJson || []).forEach((s) => {
    if (!s?.scored) return;
    const a1 = applyJuniorHandicap(s.p1, player1);
    const a2 = applyJuniorHandicap(s.p2, player2);
    if (a1 < a2) p1++;
    else if (a2 < a1) p2++;
  });
  return { p1, p2 };
};

export const vsParLabel = (strokes, par) => {
  const d = strokes - par;
  if (d === 0) return 'E';
  return d > 0 ? `+${d}` : String(d);
};

// ─── HAPTICS ─────────────────────────────────────────────────────────────────

export const haptic = (style = 'medium') => {
  if (!('vibrate' in navigator)) return;
  const patterns = { light: 10, medium: 20, heavy: 30, success: [10, 50, 10], error: [20, 100, 20] };
  navigator.vibrate(patterns[style] ?? patterns.medium);
};

// ─── COLOURS ─────────────────────────────────────────────────────────────────
// BRAND reads live CSS variables so themes apply instantly across all components
const getVar = (name, fallback) => {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

export const BRAND = {
  get primary() { return getVar('--brand-primary', '#006400'); },
  get accent()  { return getVar('--brand-accent',  '#228B22'); },
  get light()   { return getVar('--brand-light',   '#4ade80'); },
  get text()    { return getVar('--brand-text',    '#052e0f'); },
  gold: '#D4AF37',
};

