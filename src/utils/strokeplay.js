// ─── STROKE PLAY UTILITIES ────────────────────────────────────────────────────

export const isJunior = (player) =>
  player?.status === 'Junior' || player?.division === 'Junior';

export const applyHandicap = (strokes, player) =>
  isJunior(player) ? Math.max(1, strokes - 1) : strokes;

export const vsParLabel = (diff) => {
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : String(diff);
};

export const vsParColor = (diff) => {
  if (diff < 0) return '#4ade80';   // under par — green
  if (diff === 0) return '#fbbf24'; // even — gold
  return '#f87171';                  // over par — red
};

// Parse pars object from course: {"1":3,"2":3,...} → array [3,3,3,...]
export const parsToArray = (parsObj, startHole = 1, totalHoles = 18) => {
  const result = [];
  for (let i = startHole; i < startHole + totalHoles; i++) {
    result.push(parsObj[String(i)] ?? 3);
  }
  return result;
};

// Calculate total par for a set of holes
export const totalPar = (pars) => pars.reduce((s, p) => s + p, 0);

// Calculate vs par for a player's scores
// scores: array of ints (actual strokes, already handicap-adjusted)
// pars: array of ints
export const calcVsPar = (scores, pars) => {
  let diff = 0;
  scores.forEach((s, i) => {
    if (s != null && s > 0) diff += s - (pars[i] ?? 3);
  });
  return diff;
};

// Calculate total strokes (raw, before handicap)
export const calcTotalStrokes = (scores) =>
  scores.filter(s => s != null && s > 0).reduce((a, b) => a + b, 0);

// Calculate adjusted strokes (after junior handicap applied per hole)
export const calcAdjustedStrokes = (scores, player) =>
  scores.filter(s => s != null && s > 0)
    .reduce((a, s) => a + applyHandicap(s, player), 0);

// Best N rounds from an array of vs-par scores
export const bestNRounds = (roundScores, n = 6) => {
  const sorted = [...roundScores].sort((a, b) => a.vs_par - b.vs_par);
  return sorted.slice(0, n);
};

// Build tournament leaderboard from round_scores rows
// Returns sorted array of { player, rounds, bestN, totalVsPar, totalStrokes }
export const buildLeaderboard = (roundScores, players, countRounds = 6) => {
  const byPlayer = {};
  roundScores.forEach(rs => {
    const pid = rs.player_id;
    if (!byPlayer[pid]) byPlayer[pid] = [];
    byPlayer[pid].push(rs);
  });

  return Object.entries(byPlayer).map(([pid, scores]) => {
    const player = players.find(p => p.id === pid);
    const best = bestNRounds(scores, countRounds);
    const totalVsPar = best.reduce((a, r) => a + r.vs_par, 0);
    const totalStrokes = best.reduce((a, r) => a + r.total_strokes, 0);
    return {
      player, playerId: pid,
      roundsPlayed: scores.length,
      roundsCounted: best.length,
      rounds: scores,
      bestRounds: best,
      totalVsPar,
      totalStrokes,
    };
  }).sort((a, b) => {
    if (a.totalVsPar !== b.totalVsPar) return a.totalVsPar - b.totalVsPar;
    return a.totalStrokes - b.totalStrokes;
  });
};
