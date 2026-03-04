import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { normalisePlayer } from './useAuth';

export const useAppData = (currentUser) => {
  const [courses, setCourses] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [
        { data: coursesData },
        { data: tournamentsData },
        { data: matchesData },
        { data: playersData },
      ] = await Promise.all([
        supabase.from('courses').select('*').order('name'),
        supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
        supabase.from('matches').select(`
          *,
          player1:player1_id(player_id, player_name, player_status),
          player2:player2_id(player_id, player_name, player_status),
          winner:winner_id(player_id, player_name),
          course:course_id(id, name, code)
        `).order('scheduled_date', { ascending: false }),
        supabase.from('players')
          .select('*')
          .eq('player_status', 'Active')
          .order('player_name'),
      ]);

      if (coursesData) setCourses(coursesData);
      if (tournamentsData) setTournaments(tournamentsData);
      if (matchesData) {
        // Normalise nested player references
        setMatches(matchesData.map(m => ({
          ...m,
          player1: m.player1 ? normalisePlayer(m.player1) : null,
          player2: m.player2 ? normalisePlayer(m.player2) : null,
          winner: m.winner ? normalisePlayer(m.winner) : null,
        })));
      }
      if (playersData) setPlayers(playersData.map(normalisePlayer));
      setLastLoaded(new Date());
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTournament = tournaments.find(t => t.status === 'active') || null;

  return {
    courses, tournaments, matches, players,
    isLoading, lastLoaded, loadData,
    activeTournament, pendingRequestsCount,
    setCourses, setTournaments, setMatches, setPlayers,
  };
};
