import React, { useState } from 'react';
import { BRAND } from '../utils';

// Primary tabs always visible
const PRIMARY_TABS = [
  { id: 'home',    label: 'Home',    icon: HomeIcon },
  { id: 'matches', label: 'Matches', icon: DiscIcon },
  { id: 'bagtags', label: 'Tags',    icon: TagIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
];

// Secondary tabs in the More drawer
const MORE_TABS = [
  { id: 'courses',   label: 'Courses',    icon: CourseIcon,    emoji: '🏔️' },
  { id: 'ctp',       label: 'CTP',        icon: CTPIcon,       emoji: '🎯' },
  { id: 'lostfound', label: 'Lost+Found', icon: LostFoundIcon, emoji: '🔍' },
];

const MORE_IDS = MORE_TABS.map(t => t.id);

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  );
}

function DiscIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="2" x2="12" y2="9"/>
      <line x1="12" y1="15" x2="12" y2="22"/>
    </svg>
  );
}

function CourseIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l4-8 4 4 4-6 4 10"/>
      <line x1="3" y1="21" x2="21" y2="21"/>
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function TagIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function CTPIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="22" y2="12"/>
    </svg>
  );
}

function LostFoundIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
      <path d="M11 8v6M8 11h6"/>
    </svg>
  );
}

function MoreIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? BRAND.light : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" fill={active ? BRAND.light : 'currentColor'}/>
      <circle cx="12" cy="12" r="1.5" fill={active ? BRAND.light : 'currentColor'}/>
      <circle cx="19" cy="12" r="1.5" fill={active ? BRAND.light : 'currentColor'}/>
    </svg>
  );
}

export const BottomNav = ({ activeTab, onTabChange }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_IDS.includes(activeTab);

  const handlePrimaryTab = (id) => {
    setMoreOpen(false);
    onTabChange(id);
  };

  const handleMoreTab = (id) => {
    setMoreOpen(false);
    onTabChange(id);
  };

  const toggleMore = () => setMoreOpen(prev => !prev);

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.6)' }}
        />
      )}

      {/* More drawer — slides up above nav */}
      <div style={{
        position: 'fixed', bottom: moreOpen ? 70 : 20, left: 0, right: 0, zIndex: 49,
        transform: moreOpen ? 'translateY(0)' : 'translateY(120%)',
        transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), bottom 0s',
        maxWidth: 520, margin: '0 auto',
        padding: '0 16px',
      }}>
        <div style={{
          background: 'var(--bg-nav)',
          border: '1px solid var(--border-card)',
          borderRadius: 20,
          padding: '8px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
        }}>
          {/* Section label */}
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase', letterSpacing: 1.5,
            padding: '8px 12px 6px',
          }}>More</div>

          {/* Grid of more items */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 4px 8px' }}>
            {MORE_TABS.map(({ id, label, icon: Icon, emoji }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => handleMoreTab(id)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 6, padding: '14px 8px',
                  background: active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 14, cursor: 'pointer',
                  color: active ? BRAND.light : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <div style={{ fontSize: 22 }}>{emoji}</div>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, letterSpacing: 0.3 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-nav)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
          {PRIMARY_TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => handlePrimaryTab(id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '10px 4px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? BRAND.light : 'rgba(255,255,255,0.35)',
                transition: 'color 0.2s ease', position: 'relative',
              }}>
                {active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24, height: 2, borderRadius: 2,
                    backgroundColor: BRAND.light,
                  }} />
                )}
                <Icon active={active} />
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  letterSpacing: 0.3, fontFamily: "'DM Sans', sans-serif",
                }}>{label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button onClick={toggleMore} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, padding: '10px 4px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: (moreActive || moreOpen) ? BRAND.light : 'rgba(255,255,255,0.35)',
            transition: 'color 0.2s ease', position: 'relative',
          }}>
            {(moreActive || moreOpen) && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 24, height: 2, borderRadius: 2,
                backgroundColor: BRAND.light,
              }} />
            )}
            <MoreIcon active={moreActive || moreOpen} />
            <span style={{
              fontSize: 10, fontWeight: (moreActive || moreOpen) ? 700 : 500,
              letterSpacing: 0.3, fontFamily: "'DM Sans', sans-serif",
            }}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
