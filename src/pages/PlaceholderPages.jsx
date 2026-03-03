import React from 'react';
import { BRAND } from '../utils';
import { PageHeader, EmptyState } from '../components/ui';

// ─── COURSES PAGE ─────────────────────────────────────────────────────────────
export const CoursesPage = ({ currentUser, courses }) => (
  <div style={pageStyle}>
    <PageHeader title="Courses" subtitle="Local disc golf courses" />
    <div style={bodyStyle}>
      {courses.length === 0 ? (
        <EmptyState icon="⛳" title="Coming in Session 6" subtitle="Course info, pars, hazards and change requests" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {courses.map(course => (
            <div key={course.id} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{course.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {course.holes} holes · {course.location}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    <GlobalStyles />
  </div>
);

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #071407 0%, #0a1f0a 60%, #071407 100%)',
  fontFamily: "'DM Sans', sans-serif",
  color: 'white',
  paddingBottom: 90,
};

const bodyStyle = {
  maxWidth: 520, margin: '0 auto', padding: '24px 20px 0',
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
  `}</style>
);
