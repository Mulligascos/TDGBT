import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate  } from '../utils';
import { Badge, LogoWatermark } from '../components/ui';
import { vsParLabel, vsParColor, buildLeaderboard } from '../utils/strokeplay';
import { Trophy, Disc, Clock, ChevronRight, Zap, Flag, BookOpen, Settings } from 'lucide-react';

// ─── SECTION TITLE ────────────────────────────────────────────────────────────

// ─── MARKDOWN RENDERER (shared with announcements) ───────────────────────────
const inlineMarkdown = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, '')); i++; }
      elements.push(<ul key={i} style={{ paddingLeft: 18, margin: '4px 0' }}>{items.map((item, j) => <li key={j} style={{ marginBottom: 2 }}>{inlineMarkdown(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; }
      elements.push(<ol key={i} style={{ paddingLeft: 18, margin: '4px 0' }}>{items.map((item, j) => <li key={j} style={{ marginBottom: 2 }}>{inlineMarkdown(item)}</li>)}</ol>);
      continue;
    }
    if (line.trim() === '') { elements.push(<div key={i} style={{ height: 6 }} />); }
    else { elements.push(<div key={i}>{inlineMarkdown(line)}</div>); }
    i++;
  }
  return elements;
};


const SectionTitle = ({ children, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
      {children}
    </div>
    {action}
  </div>
);

// ─── QUICK ACTION BUTTON ──────────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, onClick, accent = false }) => (
  <button onClick={onClick} style={{
    background: accent ? `linear-gradient(135deg, ${BRAND.primary}60, ${BRAND.accent}40)` : 'rgba(255,255,255,0.05)',
    border: `1px solid ${accent ? BRAND.light + '30' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 12, padding: '10px 6px', cursor: 'pointer', textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 5, flex: 1,
  }}>
    <Icon size={18} color={accent ? BRAND.light : 'rgba(255,255,255,0.5)'} />
    <div style={{ fontSize: 11, fontWeight: 600, color: accent ? 'white' : 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>{label}</div>
  </button>
);

// ─── TOP 3 LEADERBOARD ────────────────────────────────────────────────────────
const Top3 = ({ entries, currentUserId, onViewAll }) => {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 8 }}>
      {entries.map((entry, i) => {
        const isMe = entry.playerId === currentUserId;
        return (
          <div key={entry.playerId} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: isMe ? 'rgba(74,222,128,0.06)' : 'transparent',
            borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{medals[i]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 600, color: isMe ? BRAND.light : 'white' }}>
                {formatName(entry.player?.name || 'Unknown')}
                {isMe && <span style={{ fontSize: 11, color: BRAND.light, marginLeft: 6 }}>you</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {entry.roundsPlayed} round{entry.roundsPlayed !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: vsParColor(entry.totalVsPar), fontFamily: "'Syne', sans-serif" }}>
              {vsParLabel(entry.totalVsPar)}
            </div>
          </div>
        );
      })}
      <button onClick={onViewAll} style={{
        width: '100%', padding: '11px', background: 'var(--bg-card)',
        border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)',
        color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif",
        fontSize: 13, cursor: 'pointer',
      }}>
        Full standings →
      </button>
    </div>
  );
};

// ─── MY RECENT SCORES ─────────────────────────────────────────────────────────
const RecentScores = ({ scores, onViewAll }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 8 }}>
    {scores.map((s, i) => (
      <div key={s.id} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: i < scores.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: s.vs_par < 0 ? 'rgba(74,222,128,0.12)' : s.vs_par === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.08)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: vsParColor(s.vs_par), fontFamily: "Arial, sans-serif", lineHeight: 1 }}>
            {vsParLabel(s.vs_par)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{s.total_strokes}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.courseName || 'Unknown course'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{formatDate(s.roundDate)}</div>
        </div>
      </div>
    ))}
    <button onClick={onViewAll} style={{
      width: '100%', padding: '11px', background: 'var(--bg-card)',
      border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)',
      color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif",
      fontSize: 13, cursor: 'pointer',
    }}>
      Full history →
    </button>
  </div>
);

// ─── ANNOUNCEMENT CARD ────────────────────────────────────────────────────────
const AnnouncementCard = ({ announcement }) => (
  <div style={{
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '14px 16px', marginBottom: 8,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flex: 1, paddingRight: 8 }}>{announcement.title}</div>
      {announcement.pinned && (
        <span style={{ fontSize: 10, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>📌 Pinned</span>
      )}
    </div>
    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{renderMarkdown(announcement.body)}</div>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
      {formatDate(announcement.created_at)}
    </div>
  </div>
);

// ─── NO TOURNAMENT STATE ──────────────────────────────────────────────────────
const NoTournamentBanner = ({ onScore }) => (
  <div style={{
    background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '12px 16px', marginBottom: 18,
    display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <span style={{ fontSize: 22, flexShrink: 0 }}>🥏</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>No active tournament</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Play a casual round</div>
    </div>
    <button onClick={onScore} style={{
      padding: '7px 14px', borderRadius: 9, flexShrink: 0,
      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
      border: '1px solid rgba(74,222,128,0.3)', color: 'var(--text-primary)',
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer',
    }}>
      Score →
    </button>
  </div>
);

// ─── MAIN HOME PAGE ───────────────────────────────────────────────────────────
export const HomePage = ({ currentUser, tournaments, activeTournament, players, onNavigate, isAdmin, pendingRequestsCount = 0 }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRecentScores, setMyRecentScores] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  // Time-based greeting
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const loadHomeData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Load in parallel
      const queries = [
        // My recent 3 scores with course info
        supabase.from('round_scores')
          .select('*, rounds!inner(course_id, scheduled_date, tournament_id, courses(name))')
          .eq('player_id', currentUser.id)
          .order('submitted_at', { ascending: false })
          .limit(3),
        // Announcements
        supabase.from('announcements')
          .select('*')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3),
      ];

      // If active tournament, also load leaderboard data
      if (activeTournament) {
        queries.push(
          supabase.from('round_scores')
            .select('*, rounds!inner(tournament_id)')
            .eq('rounds.tournament_id', activeTournament.id)
        );
      }

      const results = await Promise.all(queries);
      const [scoresResult, announcementsResult, leaderboardResult] = results;

      // My recent scores
      const myScores = (scoresResult.data || []).map(s => ({
        ...s,
        courseName: s.rounds?.courses?.name || 'Unknown course',
        roundDate: s.rounds?.scheduled_date,
      }));
      setMyRecentScores(myScores);

      // Announcements (graceful — table may not exist yet)
      setAnnouncements(announcementsResult.data || []);

      // Leaderboard top 3
      if (activeTournament && leaderboardResult?.data) {
        const lb = buildLeaderboard(leaderboardResult.data, players || [], activeTournament.count_rounds || 6);
        setLeaderboard(lb.slice(0, 3));
      }

    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, activeTournament?.id, players.map(p => p.id).join(',')]);

  useEffect(() => { loadHomeData(); }, [loadHomeData]);

  const divisionLabel = { Mixed: 'Mixed Open', Female: 'Female', Junior: 'Junior', Senior: 'Senior' };

  return (
    <div style={pageStyle}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${BRAND.primary}cc, ${BRAND.accent}88)`,
        padding: '36px 20px 16px',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid var(--border)',
      }}>
        <LogoWatermark size={110} opacity={0.08} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 0 }} />

        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{greeting}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5, marginBottom: 10 }}>
                {formatName(currentUser.name)} 👋
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge
                  label={currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'committee' ? 'Committee' : 'Member'}
                  color={currentUser.role === 'admin' ? '#fbbf24' : BRAND.light}
                />
                <Badge label={currentUser.status || 'Active'} color={BRAND.light} />
                {currentUser.division && (
                  <Badge label={divisionLabel[currentUser.division] || currentUser.division} color="rgba(255,255,255,0.35)" />
                )}
                {currentUser.bagTag && (
                  <Badge label={`#${currentUser.bagTag}`} color={BRAND.light} />
                )}
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => onNavigate('admin')} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.35)',
                borderRadius: 12, padding: '8px 14px',
                color: '#fbbf24', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
                flexShrink: 0, marginTop: 4, position: 'relative',
              }}>
                <Settings size={15} /> Admin
                {pendingRequestsCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: '#f87171', color: 'var(--text-primary)',
                    borderRadius: '50%', width: 18, height: 18,
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #071407',
                  }}>
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* ── ACTIVE TOURNAMENT BANNER ── */}
        {activeTournament ? (
          <div style={{
            background: `linear-gradient(135deg, ${BRAND.primary}50, ${BRAND.accent}30)`,
            border: `1px solid ${BRAND.light}35`,
            borderRadius: 18, padding: '18px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                  🏆 Active Tournament
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                  {activeTournament.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {formatDate(activeTournament.start_date)} – {formatDate(activeTournament.end_date)}
                </div>
              </div>
              <button onClick={() => onNavigate('matches')} style={{
                background: BRAND.light, color: BRAND.primary,
                border: 'none', borderRadius: 10, padding: '8px 16px',
                fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                Rounds →
              </button>
            </div>

            {/* Top 3 inline leaderboard */}
            {!loading && leaderboard.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                  Standings
                </div>
                <Top3
                  entries={leaderboard}
                  currentUserId={currentUser.id}
                  onViewAll={() => onNavigate('matches')}
                />
              </>
            )}

            {!loading && leaderboard.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                No scores submitted yet — be the first!
              </div>
            )}
          </div>
        ) : (
          <NoTournamentBanner onScore={() => onNavigate('matches')} />
        )}

        {/* ── QUICK ACTIONS ── */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <QuickAction icon={Disc} label="Score" onClick={() => onNavigate('matches')} accent />
            <QuickAction icon={Trophy} label="Standings" onClick={() => onNavigate('matches')} />
            <QuickAction icon={Clock} label="History" onClick={() => onNavigate('history')} />
            <QuickAction icon={Flag} label="Courses" onClick={() => onNavigate('courses')} />
          </div>
        </div>

        {/* ── MY RECENT SCORES ── */}
        {myRecentScores.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle
              action={
                <button onClick={() => onNavigate('history')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  See all
                </button>
              }
            >
              My Recent Scores
            </SectionTitle>
            <RecentScores scores={myRecentScores} onViewAll={() => onNavigate('history')} />
          </div>
        )}

        {/* No scores yet nudge */}
        {!loading && myRecentScores.length === 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>My Recent Scores</SectionTitle>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No rounds scored yet</div>
              <button onClick={() => onNavigate('matches')} style={{
                marginTop: 12, padding: '8px 20px', borderRadius: 10,
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
                color: BRAND.light, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer',
              }}>
                Score your first round →
              </button>
            </div>
          </div>
        )}

        {/* ── ANNOUNCEMENTS ── */}
        {announcements.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Club News</SectionTitle>
            {announcements.map(a => <AnnouncementCard key={a.id} announcement={a} />)}
          </div>
        )}

      </div>

      <GlobalStyles />
    </div>
  );
};

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg-page)',
  fontFamily: "'DM Sans', sans-serif", color: 'var(--text-primary)', paddingBottom: 90,
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; } body { background: var(--bg-base); color: var(--text-primary); }
    button { font-family: 'DM Sans', sans-serif; }
    button:active { transform: scale(0.97); }
  `}</style>
);
