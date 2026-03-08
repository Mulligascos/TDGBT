import React from 'react';
import { BRAND } from '../utils';

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  fontFamily: "'DM Sans', sans-serif",
  color: 'white',
  paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }
    button { font-family: 'DM Sans', sans-serif; }
  `}</style>
);
