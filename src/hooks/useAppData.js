import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { normalisePlayer } from './useAuth';

export const useAppData = (currentUser, isAdmin = false) => {
  const [courses, setCourses] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const queries = [
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
      ];

      if (isAdmin) {
        queries.push(
          supabase.from('course_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
        );
      }

      const results = await Promise.all(queries);
      const [coursesRes, tournamentsRes, matchesRes, playersRes, pendingRes] = results;

      if (coursesRes.data) setCourses(coursesRes.data);
      if (tournamentsRes.data) setTournaments(tournamentsRes.data);
      if (matchesRes.data) {
        setMatches(matchesRes.data.map(m => ({
          ...m,
          player1: m.player1 ? normalisePlayer(m.player1) : null,
          player2: m.player2 ? normalisePlayer(m.player2) : null,
          winner: m.winner ? normalisePlayer(m.winner) : null,
        })));
      }
      if (playersRes.data) setPlayers(playersRes.data.map(normalisePlayer));
      if (isAdmin && pendingRes) setPendingRequestsCount(pendingRes.count || 0);

      setLastLoaded(new Date());
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isAdmin]);

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
