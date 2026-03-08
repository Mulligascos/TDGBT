import React, { useState, useEffect, useCallback } from 'react';
import { LogoWatermark } from '../components/ui';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate  } from '../utils';
import { vsParLabel, vsParColor } from '../utils/strokeplay';
import { Tag, ChevronLeft, Trophy } from 'lucide-react';

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
    {children}
  </div>
);

// ─── LEADERBOARD TAB ──────────────────────────────────────────────────────────
const LeaderboardTab = ({ players, currentUserId }) => {
  const tagged = players
    .filter(p => p.bagTag != null && p.bagTag < 999000)
    .sort((a, b) => a.bagTag - b.bagTag);

  if (tagged.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No bag tags assigned yet</div>;
  }

  return (
    <div>
      {tagged.map((p, i) => {
        const isMe = p.id === currentUserId;
        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', marginBottom: 8,
            background: isMe ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isMe ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 14,
          }}>
            {/* Rank */}
            <div style={{ width: 28, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </div>

            {/* Tag badge */}
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: i === 0
                ? 'linear-gradient(135deg, #92400e, #d97706)'
                : 'rgba(255,255,255,0.08)',
              border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <Tag size={11} color={i === 0 ? '#fbbf24' : 'var(--text-secondary)'} />
              <div style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? '#fbbf24' : 'white', fontFamily: "'Syne', sans-serif", lineHeight: 1.2 }}>
                {p.bagTag}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: isMe ? 700 : 600, color: isMe ? BRAND.light : 'white' }}>
                {formatName(p.name)}
                {isMe && <span style={{ fontSize: 11, color: BRAND.light, marginLeft: 6 }}>you</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {p.division} · {p.status}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
const HistoryTab = ({ currentUserId }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('bag_tag_challenges')
        .select(`
          *,
          courses(name),
          bag_tag_participants(
            player_id, vs_par, total_strokes, tag_before, tag_after, won,
            players(player_name)
          )
        `)
        .order('challenge_date', { ascending: false })
        .limit(50);
      setChallenges(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading...</div>;
  if (challenges.length === 0) return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No challenges recorded yet</div>;

  return (
    <div>
      {challenges.map(c => {
        const participants = (c.bag_tag_participants || []).sort((a, b) => (a.vs_par ?? 99) - (b.vs_par ?? 99));
        const winner = participants.find(p => p.won);
        const swaps = participants.filter(p => p.tag_before !== p.tag_after);
        const myEntry = participants.find(p => p.player_id === currentUserId);

        return (
          <div key={c.id} style={{
            background: myEntry ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${myEntry ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 16, padding: '16px', marginBottom: 12,
          }}>
            {/* Challenge header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{c.courses?.name || 'Unknown course'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{formatDate(c.challenge_date)}</div>
              </div>
              {myEntry && (
                <span style={{ fontSize: 11, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: BRAND.light, borderRadius: 8, padding: '3px 8px', fontWeight: 700 }}>
                  You played
                </span>
              )}
            </div>

            {/* Participants */}
            {participants.map(p => {
              const isWinner = p.won;
              const tagChanged = p.tag_before !== p.tag_after;
              return (
                <div key={p.player_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{isWinner ? '🏆' : ''}</div>
                  <div style={{ flex: 1, fontSize: 13, color: isWinner ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: isWinner ? 700 : 400 }}>
                    {formatName(p.players?.player_name || 'Unknown')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', width: 40, textAlign: 'center' }}>
                    {p.vs_par != null ? (p.vs_par === 0 ? 'E' : p.vs_par > 0 ? `+${p.vs_par}` : p.vs_par) : '—'}
                  </div>
                  {tagChanged ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <span style={{ color: '#f87171', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>#{p.tag_before}</span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>#{p.tag_after}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>#{p.tag_before}</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ─── MY TAG TAB ───────────────────────────────────────────────────────────────
const MyTagTab = ({ currentUser }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('bag_tag_participants')
        .select(`
          *,
          bag_tag_challenges(challenge_date, courses(name))
        `)
        .eq('player_id', currentUser.id)
        .order('bag_tag_challenges(challenge_date)', { ascending: false });
      setHistory(data || []);
      setLoading(false);
    };
    load();
  }, [currentUser.id]);

  const currentTag = currentUser.bagTag;

  return (
    <div>
      {/* Current tag display */}
      <div style={{
        background: currentTag
          ? 'linear-gradient(135deg, rgba(146,64,14,0.4), rgba(217,119,6,0.3))'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${currentTag ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 20, padding: '24px', textAlign: 'center', marginBottom: 28,
      }}>
        {currentTag ? (
          <>
            <Tag size={28} color="#fbbf24" style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 64, fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
              #{currentTag}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>Your current bag tag</div>
          </>
        ) : (
          <>
            <Tag size={28} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>No bag tag yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Win a challenge to earn one</div>
          </>
        )}
      </div>

      {/* Tag history */}
      <SectionTitle>Tag History</SectionTitle>
      {loading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>}
      {!loading && history.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No challenges played yet</div>
      )}
      {history.map((entry, i) => {
        const c = entry.bag_tag_challenges;
        const tagChanged = entry.tag_before !== entry.tag_after;
        return (
          <div key={entry.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            background: tagChanged ? (entry.won ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)') : 'rgba(255,255,255,0.04)',
            border: `1px solid ${tagChanged ? (entry.won ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)') : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 14, marginBottom: 8,
          }}>
            <div style={{ fontSize: 20, width: 24, textAlign: 'center' }}>
              {entry.won ? '🏆' : tagChanged ? '📉' : '—'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c?.courses?.name || 'Unknown course'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(c?.challenge_date)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {entry.vs_par != null ? (entry.vs_par === 0 ? 'E' : entry.vs_par > 0 ? `+${entry.vs_par}` : entry.vs_par) : '—'}
              </div>
              {tagChanged ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <span style={{ color: '#f87171', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>#{entry.tag_before}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
                  <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>#{entry.tag_after}</span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>#{entry.tag_before}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── MAIN BAG TAGS PAGE ───────────────────────────────────────────────────────
export const BagTagsPage = ({ currentUser, players }) => {
  const [tab, setTab] = useState('leaderboard');
  const tabs = [
    { id: 'leaderboard', label: 'Rankings' },
    { id: 'history',     label: 'Challenges' },
    { id: 'my',          label: 'My Tag' },
  ];

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #92400e, #1a0a00)',
        padding: '36px 20px 0',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        position: 'relative', overflow: 'hidden',
      }}>
        <LogoWatermark size={110} opacity={0.07} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)' }} />
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            🏷️ Bag Tags
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>
            Tag Challenge
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.id ? '#fbbf24' : 'transparent'}`,
                color: tab === t.id ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'leaderboard' && <LeaderboardTab players={players || []} currentUserId={currentUser.id} />}
        {tab === 'history'     && <HistoryTab currentUserId={currentUser.id} />}
        {tab === 'my'          && <MyTagTab currentUser={currentUser} />}
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
