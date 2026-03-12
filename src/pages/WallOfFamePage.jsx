import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND, formatName, formatDate } from '../utils';
import { vsParLabel, vsParColor } from '../utils/strokeplay';
import { LogoWatermark } from '../components/ui';
import { Trophy, Star, Tag, Zap, Target, Award, TrendingUp, Users } from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'all',      label: 'All' },
  { id: 'records',  label: 'Records' },
  { id: 'bagtags',  label: 'Bag Tags' },
  { id: 'streaks',  label: 'Streaks' },
  { id: 'bingo',    label: 'Bingo' },
];

// ─── TROPHY CARD ─────────────────────────────────────────────────────────────
const TrophyCard = ({ icon, emoji, title, holder, stat, sub, accent = BRAND.light, loading }) => (
  <div style={{
    background: 'var(--bg-card)', border: '1px solid var(--border-card)',
    borderRadius: 16, padding: '16px', position: 'relative', overflow: 'hidden',
  }}>
    {/* Accent bar */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${BRAND.primary}, ${accent})` }} />

    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${BRAND.primary}30, ${accent}30)`,
        border: `1px solid ${accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: emoji ? 22 : 0,
      }}>
        {emoji || (icon && React.createElement(icon, { size: 20, color: accent }))}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 }}>{title}</div>
        {loading ? (
          <div style={{ height: 18, width: '60%', borderRadius: 6, background: 'var(--bg-input)', marginBottom: 4 }} />
        ) : holder ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {holder}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginTop: 1 }}>{stat}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No data yet</div>
        )}
      </div>
    </div>
  </div>
);

// ─── MINI LEADERBOARD ────────────────────────────────────────────────────────
const MiniLeaderboard = ({ title, emoji, rows, valueKey, labelKey = 'name', formatValue, accent = BRAND.light, loading }) => {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        background: `linear-gradient(135deg, ${BRAND.primary}18, ${accent}10)`,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>{title}</div>
      </div>

      {/* Rows */}
      {loading ? (
        [1,2,3].map(i => (
          <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 24, height: 16, borderRadius: 4, background: 'var(--bg-input)' }} />
            <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--bg-input)' }} />
            <div style={{ width: 40, height: 14, borderRadius: 4, background: 'var(--bg-input)' }} />
          </div>
        ))
      ) : rows.length === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
      ) : rows.slice(0, 5).map((row, i) => (
        <div key={i} style={{
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: i < Math.min(rows.length, 5) - 1 ? '1px solid var(--border)' : 'none',
          background: i === 0 ? `${accent}08` : 'transparent',
        }}>
          <div style={{ width: 24, textAlign: 'center', fontSize: i < 3 ? 16 : 12, color: i < 3 ? 'inherit' : 'var(--text-muted)', fontWeight: 700 }}>
            {i < 3 ? medals[i] : `${i + 1}`}
          </div>
          <div style={{ flex: 1, fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row[labelKey]}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? accent : 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" }}>
            {formatValue ? formatValue(row[valueKey], row) : row[valueKey]}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── SECTION LABEL ───────────────────────────────────────────────────────────
const SectionTitle = ({ children, emoji }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 }}>
    {emoji && <span style={{ fontSize: 18 }}>{emoji}</span>}
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{children}</div>
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export const WallOfFamePage = ({ currentUser, courses = [], players = [] }) => {
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    courseRecords: [],       // { courseName, holderName, score, vsPar, date }
    mostRounds: [],          // { name, count }
    mostUnderPar: [],        // { name, count }
    bestVsPar: [],           // { name, best }
    currentTag1: null,       // { name, date }
    mostTag1: [],            // { name, count }
    mostTagWins: [],         // { name, wins }
    longestStreak: [],       // { name, streak }
    mostBingo: [],           // { name, squares }
    achievementLeaders: [],  // { name, count }
    recentRecords: [],       // trophy card highlights
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        roundScoresRes,
        roundsRes,
        bagTagRes,
        bingoRes,
        achievementAwardsRes,
      ] = await Promise.allSettled([
        supabase.from('round_scores').select('player_id, total_strokes, vs_par, scores, submitted_at, round_id'),
        supabase.from('rounds').select('id, course_id, status, scheduled_date').eq('status', 'complete'),
        supabase.from('bag_tag_participants').select('player_id, tag_after, tag_before, won, challenge_id'),
        supabase.from('bingo_completions').select('player_id, position, season_id'),
        supabase.from('achievement_awards').select('player_id'),
      ]);

      const allScores   = roundScoresRes.value?.data   || [];
      const allRounds   = roundsRes.value?.data         || [];
      const bagTagData  = bagTagRes.value?.data         || [];
      const bingoData   = bingoRes.value?.data          || [];
      const awardData   = achievementAwardsRes.value?.data || [];

      // Build player name lookup from the players prop (already normalised: {id, name})
      const playerNameMap = {};
      players.forEach(p => { playerNameMap[p.id] = p.name; });

      // ── Course Records ───────────────────────────────────────────────────
      const courseMap = {};
      courses.forEach(c => { courseMap[c.id] = c.name; });

      // Only count scores for completed rounds
      const completedRoundIds = new Set(allRounds.map(r => r.id));
      const roundCourseMap = {};
      const roundDateMap = {};
      allRounds.forEach(r => { roundCourseMap[r.id] = r.course_id; roundDateMap[r.id] = r.scheduled_date; });

      const completedScores = allScores.filter(s => completedRoundIds.has(s.round_id));

      const recordsByCourse = {};
      completedScores.forEach(s => {
        if (s.vs_par == null || s.total_strokes == null) return;
        const courseId = roundCourseMap[s.round_id];
        if (!courseId) return;
        if (!recordsByCourse[courseId] || s.vs_par < recordsByCourse[courseId].vs_par) {
          recordsByCourse[courseId] = { ...s, courseId };
        }
      });

      const courseRecords = Object.entries(recordsByCourse).map(([courseId, s]) => ({
        courseName: courseMap[courseId] || 'Unknown Course',
        holderName: formatName(playerNameMap[s.player_id] || 'Unknown'),
        score: s.total_strokes,
        vsPar: s.vs_par,
        date: roundDateMap[s.round_id] || s.submitted_at,
      })).sort((a, b) => a.courseName.localeCompare(b.courseName));

      // ── Rounds Played ───────────────────────────────────────────────────
      const roundsPerPlayer = {};
      completedScores.forEach(s => {
        roundsPerPlayer[s.player_id] = (roundsPerPlayer[s.player_id] || 0) + 1;
      });
      const mostRounds = Object.entries(roundsPerPlayer)
        .map(([id, count]) => ({ name: formatName(playerNameMap[id] || '?'), count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      // ── Most Under-Par Rounds ───────────────────────────────────────────
      const underParPerPlayer = {};
      completedScores.forEach(s => {
        if ((s.vs_par ?? 0) < 0) underParPerPlayer[s.player_id] = (underParPerPlayer[s.player_id] || 0) + 1;
      });
      const mostUnderPar = Object.entries(underParPerPlayer)
        .map(([id, count]) => ({ name: formatName(playerNameMap[id] || '?'), count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      // ── Best Single Round vs Par ────────────────────────────────────────
      const bestRoundPerPlayer = {};
      completedScores.forEach(s => {
        if (s.vs_par == null) return;
        if (bestRoundPerPlayer[s.player_id] == null || s.vs_par < bestRoundPerPlayer[s.player_id]) {
          bestRoundPerPlayer[s.player_id] = s.vs_par;
        }
      });
      const bestVsPar = Object.entries(bestRoundPerPlayer)
        .map(([id, best]) => ({ name: formatName(playerNameMap[id] || '?'), best }))
        .sort((a, b) => a.best - b.best).slice(0, 5);

      // ── Longest Under-Par Streak ─────────────────────────────────────────
      const scoresByPlayer = {};
      completedScores.forEach(s => {
        if (!scoresByPlayer[s.player_id]) scoresByPlayer[s.player_id] = [];
        scoresByPlayer[s.player_id].push({ ...s, roundDate: roundDateMap[s.round_id] || s.submitted_at });
      });
      const streaks = Object.entries(scoresByPlayer).map(([id, scores]) => {
        const sorted = [...scores].sort((a, b) => new Date(a.roundDate) - new Date(b.roundDate));
        let best = 0, cur = 0;
        sorted.forEach(s => { if ((s.vs_par ?? 1) < 0) { cur++; best = Math.max(best, cur); } else cur = 0; });
        return { name: formatName(playerNameMap[id] || '?'), streak: best };
      }).filter(x => x.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 5);

      // ── Bag Tag: current #1 — use players prop for current tag ──────────
      const tag1Player = players.find(p => p.bagTag === 1);
      const currentTag1 = tag1Player ? { name: formatName(tag1Player.name) } : null;

      // ── Bag Tag: most times held #1 ─────────────────────────────────────
      const tag1Count = {};
      bagTagData.filter(p => p.tag_after === 1).forEach(p => {
        const name = formatName(playerNameMap[p.player_id] || '?');
        tag1Count[name] = (tag1Count[name] || 0) + 1;
      });
      const mostTag1 = Object.entries(tag1Count)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      // ── Bag Tag: most challenge wins ─────────────────────────────────────
      const tagWins = {};
      bagTagData.filter(p => p.won).forEach(p => {
        const name = formatName(playerNameMap[p.player_id] || '?');
        tagWins[name] = (tagWins[name] || 0) + 1;
      });
      const mostTagWins = Object.entries(tagWins)
        .map(([name, wins]) => ({ name, wins }))
        .sort((a, b) => b.wins - a.wins).slice(0, 5);

      // ── Bingo Squares — from bingo_completions ───────────────────────────
      const bingoCount = {};
      bingoData.forEach(s => {
        const name = formatName(playerNameMap[s.player_id] || '?');
        bingoCount[name] = (bingoCount[name] || 0) + 1;
      });
      const mostBingo = Object.entries(bingoCount)
        .map(([name, squares]) => ({ name, squares }))
        .sort((a, b) => b.squares - a.squares).slice(0, 5);

      // ── Achievement Leaders ───────────────────────────────────────────────
      const achieveCount = {};
      awardData.forEach(a => {
        const name = formatName(playerNameMap[a.player_id] || '?');
        achieveCount[name] = (achieveCount[name] || 0) + 1;
      });
      const achievementLeaders = Object.entries(achieveCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      setData({
        courseRecords, mostRounds, mostUnderPar, bestVsPar,
        currentTag1, mostTag1, mostTagWins,
        longestStreak: streaks,
        mostBingo, achievementLeaders,
      });
    } catch (e) {
      console.error('Wall of Fame load error:', e);
    }
    setLoading(false);
  };

  const show = (section) => filter === 'all' || filter === section;

  // Hero trophy cards data
  const trophyCards = [
    {
      section: 'records',
      icon: Trophy, emoji: null,
      title: 'Course Record Holder',
      accent: '#fbbf24',
      holder: data.courseRecords[0]?.holderName,
      stat: data.courseRecords[0] ? `${vsParLabel(data.courseRecords[0].vsPar)} at ${data.courseRecords[0].courseName}` : null,
      sub: data.courseRecords[0] ? formatDate(data.courseRecords[0].date) : null,
    },
    {
      section: 'records',
      icon: Users, emoji: null,
      title: 'Most Rounds Played',
      accent: '#60a5fa',
      holder: data.mostRounds[0]?.name,
      stat: data.mostRounds[0] ? `${data.mostRounds[0].count} rounds` : null,
    },
    {
      section: 'streaks',
      icon: Zap, emoji: null,
      title: 'Longest Under-Par Streak',
      accent: '#4ade80',
      holder: data.longestStreak[0]?.name,
      stat: data.longestStreak[0] ? `${data.longestStreak[0].streak} in a row` : null,
    },
    {
      section: 'streaks',
      icon: TrendingUp, emoji: null,
      title: 'Best Single Round',
      accent: '#4ade80',
      holder: data.bestVsPar[0]?.name,
      stat: data.bestVsPar[0] ? vsParLabel(data.bestVsPar[0].best) : null,
    },
    {
      section: 'bagtags',
      icon: Tag, emoji: null,
      title: 'Current #1 Tag Holder',
      accent: '#fbbf24',
      holder: data.currentTag1?.name,
      stat: data.currentTag1 ? '#1 Bag Tag' : null,
      sub: data.currentTag1 ? `Since ${formatDate(data.currentTag1.date)}` : null,
    },
    {
      section: 'bagtags',
      icon: Star, emoji: null,
      title: 'Most Times Held #1',
      accent: '#fbbf24',
      holder: data.mostTag1[0]?.name,
      stat: data.mostTag1[0] ? `${data.mostTag1[0].count}× held #1` : null,
    },
    {
      section: 'bingo',
      icon: Target, emoji: null,
      title: 'Bingo Leader',
      accent: '#a78bfa',
      holder: data.mostBingo[0]?.name,
      stat: data.mostBingo[0] ? `${data.mostBingo[0].squares} squares` : null,
    },
    {
      section: 'bingo',
      icon: Award, emoji: null,
      title: 'Most Achievements',
      accent: '#fb923c',
      holder: data.achievementLeaders[0]?.name,
      stat: data.achievementLeaders[0] ? `${data.achievementLeaders[0].count} earned` : null,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: "'DM Sans', sans-serif", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BRAND.primary}, #0a2a0a)`,
        padding: '36px 20px 0', borderBottom: '1px solid rgba(74,222,128,0.15)',
        position: 'relative', overflow: 'hidden',
      }}>
        <LogoWatermark size={110} opacity={0.07} src="/assets/TDG_LogoSmall.PNG" style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)' }} />
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.light, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            🏆 Club Stats
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#ffffff', marginBottom: 20 }}>
            Wall of Fame
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setFilter(s.id)} style={{
                flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                borderBottom: `2px solid ${filter === s.id ? BRAND.light : 'transparent'}`,
                color: filter === s.id ? BRAND.light : 'rgba(255,255,255,0.5)',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: filter === s.id ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── TROPHY CARDS GRID ──────────────────────────────────────────── */}
        <SectionTitle emoji="🏅">Top Honours</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {trophyCards
            .filter(c => filter === 'all' || filter === c.section || (filter === 'streaks' && c.section === 'streaks'))
            .map((card, i) => (
              <TrophyCard key={i} loading={loading} {...card} />
            ))
          }
        </div>

        {/* ── COURSE RECORDS ───────────────────────────────────────────────── */}
        {show('records') && (
          <>
            <SectionTitle emoji="🏔️">Course Records</SectionTitle>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
              {loading ? (
                [1,2,3].map(i => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '45%', height: 14, background: 'var(--bg-input)', borderRadius: 4 }} />
                    <div style={{ width: '25%', height: 14, background: 'var(--bg-input)', borderRadius: 4 }} />
                  </div>
                ))
              ) : data.courseRecords.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No completed rounds yet</div>
              ) : data.courseRecords.map((rec, i) => (
                <div key={i} style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: i < data.courseRecords.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 16 }}>🏔️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.courseName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{rec.holderName} · {formatDate(rec.date)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: vsParColor(rec.vsPar), fontFamily: "'Syne', sans-serif" }}>{vsParLabel(rec.vsPar)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rec.score} strokes</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ROUNDS & SCORING LEADERBOARDS ────────────────────────────────── */}
        {show('records') && (
          <>
            <SectionTitle emoji="📊">Rounds & Scoring</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <MiniLeaderboard
                title="Most Rounds" emoji="🔄"
                rows={data.mostRounds} valueKey="count"
                formatValue={v => `${v}r`}
                loading={loading} accent="#60a5fa"
              />
              <MiniLeaderboard
                title="Under Par" emoji="📉"
                rows={data.mostUnderPar} valueKey="count"
                formatValue={v => `${v}×`}
                loading={loading} accent="#4ade80"
              />
            </div>
          </>
        )}

        {/* ── STREAKS ──────────────────────────────────────────────────────── */}
        {show('streaks') && (
          <>
            <SectionTitle emoji="⚡">Streaks</SectionTitle>
            <MiniLeaderboard
              title="Longest Under-Par Streak" emoji="🔥"
              rows={data.longestStreak} valueKey="streak"
              formatValue={v => `${v} in a row`}
              loading={loading} accent="#4ade80"
            />
            <div style={{ height: 10 }} />
            <MiniLeaderboard
              title="Best Single Round" emoji="💎"
              rows={data.bestVsPar} valueKey="best"
              formatValue={v => vsParLabel(v)}
              loading={loading} accent="#fbbf24"
            />
            <div style={{ height: 20 }} />
          </>
        )}

        {/* ── BAG TAGS ─────────────────────────────────────────────────────── */}
        {show('bagtags') && (
          <>
            <SectionTitle emoji="🏷️">Bag Tags</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <MiniLeaderboard
                title="Most #1 Holds" emoji="👑"
                rows={data.mostTag1} valueKey="count"
                formatValue={v => `${v}×`}
                loading={loading} accent="#fbbf24"
              />
              <MiniLeaderboard
                title="Most Challenge Wins" emoji="⚔️"
                rows={data.mostTagWins} valueKey="wins"
                formatValue={v => `${v}W`}
                loading={loading} accent="#fb923c"
              />
            </div>
          </>
        )}

        {/* ── BINGO & ACHIEVEMENTS ─────────────────────────────────────────── */}
        {show('bingo') && (
          <>
            <SectionTitle emoji="🎱">Bingo & Achievements</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <MiniLeaderboard
                title="Bingo Squares" emoji="🎱"
                rows={data.mostBingo} valueKey="squares"
                formatValue={v => `${v} sq`}
                loading={loading} accent="#a78bfa"
              />
              <MiniLeaderboard
                title="Achievements" emoji="🏅"
                rows={data.achievementLeaders} valueKey="count"
                formatValue={v => `${v} earned`}
                loading={loading} accent="#fb923c"
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
};
