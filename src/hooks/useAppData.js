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
      // Use allSettled so one failing query doesn't kill the rest
      const queries = [
        supabase.from('courses').select('*').order('name'),
        supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
        supabase.from('matches').select('*').order('scheduled_date', { ascending: false }),
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

      const results = await Promise.allSettled(queries);
      const [coursesRes, tournamentsRes, matchesRes, playersRes, pendingRes] = results;

      if (coursesRes.status === 'fulfilled' && coursesRes.value.data)
        setCourses(coursesRes.value.data);
      if (tournamentsRes.status === 'fulfilled' && tournamentsRes.value.data)
        setTournaments(tournamentsRes.value.data);
      if (matchesRes.status === 'fulfilled' && matchesRes.value.data)
        setMatches(matchesRes.value.data);
      if (playersRes.status === 'fulfilled' && playersRes.value.data)
        setPlayers(playersRes.value.data.map(normalisePlayer));
      if (isAdmin && pendingRes?.status === 'fulfilled' && pendingRes.value)
        setPendingRequestsCount(pendingRes.value.count || 0);

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
