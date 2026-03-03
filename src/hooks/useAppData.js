import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

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
          player1:player1_id(id, name, status),
          player2:player2_id(id, name, status),
          winner:winner_id(id, name),
          course:course_id(id, name, code)
        `).order('scheduled_date', { ascending: false }),
        supabase.from('players').select('*').order('name'),
      ]);

      if (coursesData) setCourses(coursesData);
      if (tournamentsData) setTournaments(tournamentsData);
      if (matchesData) setMatches(matchesData);
      if (playersData) setPlayers(playersData);
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
    activeTournament,
    setCourses, setTournaments, setMatches, setPlayers,
  };
};
