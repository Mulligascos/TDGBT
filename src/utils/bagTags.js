// ─── BAG TAG UTILITIES ────────────────────────────────────────────────────────
import { supabase } from '../supabaseClient';

export const resolveBagTagChallenge = (scoredPlayers) => {
  // bagTag may come through as bag_tag in some paths — normalise defensively
  const withTag = scoredPlayers.map(p => ({
    ...p,
    bagTag: p.bagTag ?? p.bag_tag ?? null,
  }));

  const eligible = withTag.filter(p => p.bagTag != null && Number.isInteger(Number(p.bagTag)));
  if (eligible.length < 2) return null;

  const best = Math.min(...eligible.map(p => p.vs_par));
  const winners = eligible.filter(p => p.vs_par === best);

  // Tags available in the challenge, sorted lowest first
  const tagsSorted = [...eligible].map(p => Number(p.bagTag)).sort((a, b) => a - b);
  const lowestTag = tagsSorted[0];

  if (winners.length > 1) {
    return { eligible, winner: null, tied: winners, lowestTag, swaps: [], isTie: true };
  }

  const winner = winners[0];

  // ── Multi-player redistribution ──────────────────────────────────────────
  // Sort players by score (best first). In case of equal scores among non-winners,
  // preserve relative tag order (lower current tag = better position).
  const ranked = [...eligible].sort((a, b) => {
    if (a.vs_par !== b.vs_par) return a.vs_par - b.vs_par;
    return Number(a.bagTag) - Number(b.bagTag); // tiebreak: keep lower tag
  });

  // Assign tags: 1st place gets lowest tag, 2nd gets next, etc.
  const swaps = ranked.map((player, i) => ({
    player,
    tagBefore: Number(player.bagTag),
    tagAfter: tagsSorted[i],
  }));

  return { eligible, winner, tied: [], lowestTag, swaps, isTie: false };
};

export const persistBagTagChallenge = async ({
  roundId, courseId, challengeDate, swaps, winner, scoredPlayers, createdBy,
}) => {
  const tagChanges = swaps.filter(s => s.tagBefore !== s.tagAfter);

  // ── Swap tags safely around the unique index ────────────────
  // Step 1: Move all changing players to temporary high numbers
  // so we never have two players with the same real number at once.
  const TEMP_BASE = 900000;
  for (let i = 0; i < tagChanges.length; i++) {
    const { player } = tagChanges[i];
    const { error } = await supabase
      .from('players')
      .update({ bag_tag: TEMP_BASE + i })
      .eq('player_id', player.id);
    if (error) throw new Error(`Temp tag failed for ${player.name}: ${error.message}`);
  }

  // Step 2: Set each player to their final tag number
  for (const { player, tagAfter } of tagChanges) {
    const { error } = await supabase
      .from('players')
      .update({ bag_tag: tagAfter })
      .eq('player_id', player.id);
    if (error) throw new Error(`Tag update failed for ${player.name}: ${error.message}`);
  }

  // ── Record the challenge ────────────────────────────────────
  const { data: challenge, error: cErr } = await supabase
    .from('bag_tag_challenges')
    .insert({
      round_id: roundId || null,
      course_id: courseId || null,
      challenge_date: challengeDate || new Date().toISOString().split('T')[0],
      created_by: createdBy,
    })
    .select()
    .single();
  if (cErr) throw new Error(`Challenge record failed: ${cErr.message}`);

  // ── Record participants ─────────────────────────────────────
  const participants = swaps.map(s => {
    const scored = scoredPlayers.find(p => p.id === s.player.id);
    return {
      challenge_id: challenge.id,
      player_id: s.player.id,
      vs_par: scored?.vs_par ?? null,
      total_strokes: scored?.total_strokes ?? null,
      tag_before: s.tagBefore,
      tag_after: s.tagAfter,
      won: winner?.id === s.player.id,
    };
  });

  const { error: pErr } = await supabase
    .from('bag_tag_participants')
    .insert(participants);
  if (pErr) throw new Error(`Participants failed: ${pErr.message}`);

  return challenge;
};
