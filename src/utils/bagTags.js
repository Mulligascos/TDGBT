// ─── BAG TAG UTILITIES ────────────────────────────────────────────────────────
// Shared logic for detecting challenges, resolving winners, swapping tags

/**
 * Given a list of scored players (with bagTag + vs_par + total_strokes),
 * determine if a challenge occurred (2+ tagged players) and who won.
 *
 * Returns null if no challenge, or:
 * {
 *   eligible: [...players with tags],
 *   winner: player | null (null = tie),
 *   tied: [...] (only if tie),
 *   lowestTag: number,
 *   swaps: [{ player, tagBefore, tagAfter }]
 * }
 */
export const resolveBagTagChallenge = (scoredPlayers) => {
  const eligible = scoredPlayers.filter(p => p.bagTag != null && p.bagTag < 999000);
  if (eligible.length < 2) return null;

  // Find best (lowest) adjusted vs_par among eligible players
  const best = Math.min(...eligible.map(p => p.vs_par));
  const winners = eligible.filter(p => p.vs_par === best);

  // Sort eligible by tag number ascending — lowest tag = most coveted
  const sorted = [...eligible].sort((a, b) => a.bagTag - b.bagTag);
  const lowestTag = sorted[0].bagTag;

  if (winners.length > 1) {
    // Tie — no swap, needs playoff
    return { eligible, winner: null, tied: winners, lowestTag, swaps: [], isTie: true };
  }

  const winner = winners[0];

  // Build swaps: winner gets the lowest tag,
  // previous holder of lowest tag gets winner's old tag
  const swaps = [];
  if (winner.bagTag !== lowestTag) {
    const lowestHolder = sorted[0]; // current holder of lowest tag

    swaps.push({ player: winner,       tagBefore: winner.bagTag,       tagAfter: lowestTag });
    swaps.push({ player: lowestHolder, tagBefore: lowestHolder.bagTag, tagAfter: winner.bagTag });

    // All other eligible players keep their tags
    eligible.forEach(p => {
      if (p.id !== winner.id && p.id !== lowestHolder.id) {
        swaps.push({ player: p, tagBefore: p.bagTag, tagAfter: p.bagTag });
      }
    });
  } else {
    // Winner already holds lowest tag — no swaps
    eligible.forEach(p => {
      swaps.push({ player: p, tagBefore: p.bagTag, tagAfter: p.bagTag });
    });
  }

  return { eligible, winner, tied: [], lowestTag, swaps, isTie: false };
};

/**
 * Persist a resolved challenge to Supabase.
 * Updates player bag_tag numbers and inserts challenge + participant records.
 */
export const persistBagTagChallenge = async (supabase, {
  roundId, courseId, challengeDate, swaps, winner, scoredPlayers, createdBy, notes,
}) => {
  // 1. Update bag_tag on each player where tag changed
  const tagChanges = swaps.filter(s => s.tagBefore !== s.tagAfter);
  for (const { player, tagAfter } of tagChanges) {
    await supabase.from('players').update({ bag_tag: tagAfter }).eq('player_id', player.id);
  }

  // 2. Insert challenge record
  const { data: challenge, error: cErr } = await supabase
    .from('bag_tag_challenges')
    .insert({
      round_id: roundId || null,
      course_id: courseId || null,
      challenge_date: challengeDate || new Date().toISOString().split('T')[0],
      notes: notes || null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (cErr) throw cErr;

  // 3. Insert participant rows
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

  if (pErr) throw pErr;

  return challenge;
};
