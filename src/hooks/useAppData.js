import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { normalisePlayer } from './useAuth';

export const useAppData = (currentUser, isAdmin = false, onCurrentUserUpdated = null) => {
  const [courses, setCourses] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Use refs so loadData doesn't need currentUser/isAdmin/onCurrentUserUpdated
  // in its dependency array — prevents re-render loops when updateUser fires
  const currentUserRef = useRef(currentUser);
  const isAdminRef = useRef(isAdmin);
  const onUpdatedRef = useRef(onCurrentUserUpdated);
  currentUserRef.current = currentUser;
  isAdminRef.current = isAdmin;
  onUpdatedRef.current = onCurrentUserUpdated;

  const loadData = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user) return;
    setIsLoading(true);
    try {
      const queries = [
        supabase.from('courses').select('*').order('name'),
        supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
        supabase.from('matches').select('*').order('scheduled_date', { ascending: false }),
        supabase.from('players').select('*').eq('player_status', 'Active').order('player_name'),
      ];

      if (isAdminRef.current) {
        queries.push(
          supabase.from('course_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
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
      if (playersRes.status === 'fulfilled' && playersRes.value.data) {
        const normalised = playersRes.value.data.map(normalisePlayer);
        setPlayers(normalised);

        // Sync currentUser only if something actually changed — prevents loop
        const cb = onUpdatedRef.current;
        if (cb && user) {
          const freshMe = normalised.find(p => p.id === user.id);
          if (freshMe) {
            const changed = Object.keys(freshMe).some(k => freshMe[k] !== user[k]);
            if (changed) cb(freshMe);
          }
        }
      }
      if (isAdminRef.current && pendingRes?.status === 'fulfilled' && pendingRes.value)
        setPendingRequestsCount(pendingRes.value.count || 0);

      setLastLoaded(new Date());
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // stable — no deps, uses refs

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
