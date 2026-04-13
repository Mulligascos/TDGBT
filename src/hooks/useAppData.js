import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { normalisePlayer } from './useAuth';

// ─── LOCAL CACHE ──────────────────────────────────────────────────────────────
const CACHE_KEY = 'tdg-appdata-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — data older than this triggers a blocking load

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {}
};

const clearCache = () => {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

export const useAppData = (currentUser, isAdmin = false, onCurrentUserUpdated = null) => {
  const cache = readCache();
  const cacheIsWarm = cache && (Date.now() - cache.savedAt) < CACHE_TTL;

  // Hydrate from cache immediately — no waiting for network
  const [courses, setCourses] = useState(cache?.courses || []);
  const [tournaments, setTournaments] = useState(cache?.tournaments || []);
  const [matches, setMatches] = useState(cache?.matches || []);
  const [players, setPlayers] = useState(cache?.players || []);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(cache?.pendingRequestsCount || 0);

  // Only show loading spinner if cache is stale/empty (first open or >5 min old)
  const [isLoading, setIsLoading] = useState(!cacheIsWarm);
  const [lastLoaded, setLastLoaded] = useState(cache?.savedAt ? new Date(cache.savedAt) : null);

  const currentUserRef = useRef(currentUser);
  const isAdminRef = useRef(isAdmin);
  const onUpdatedRef = useRef(onCurrentUserUpdated);
  currentUserRef.current = currentUser;
  isAdminRef.current = isAdmin;
  onUpdatedRef.current = onCurrentUserUpdated;

  const loadData = useCallback(async (opts = {}) => {
    const user = currentUserRef.current;
    if (!user) return;

    // Only show blocking spinner if caller asks, or cache was empty/stale
    const showSpinner = opts.showSpinner ?? false;
    if (showSpinner) setIsLoading(true);

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

      const newCourses     = coursesRes.status === 'fulfilled'     ? (coursesRes.value.data     || []) : courses;
      const newTournaments = tournamentsRes.status === 'fulfilled' ? (tournamentsRes.value.data || []) : tournaments;
      const newMatches     = matchesRes.status === 'fulfilled'     ? (matchesRes.value.data     || []) : matches;
      const newPending     = isAdminRef.current && pendingRes?.status === 'fulfilled' ? (pendingRes.value.count || 0) : pendingRequestsCount;

      let newPlayers = players;
      if (playersRes.status === 'fulfilled' && playersRes.value.data) {
        newPlayers = playersRes.value.data.map(normalisePlayer);

        const cb = onUpdatedRef.current;
        if (cb && user) {
          const freshMe = newPlayers.find(p => p.id === user.id);
          if (freshMe) {
            const changed = Object.keys(freshMe).some(k => freshMe[k] !== user[k]);
            if (changed) cb(freshMe);
          }
        }
      }

      // Update state
      setCourses(newCourses);
      setTournaments(newTournaments);
      setMatches(newMatches);
      setPlayers(newPlayers);
      setPendingRequestsCount(newPending);

      // Persist to cache for next launch
      writeCache({
        courses: newCourses,
        tournaments: newTournaments,
        matches: newMatches,
        players: newPlayers,
        pendingRequestsCount: newPending,
      });

      setLastLoaded(new Date());
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // stable ref pattern

  useEffect(() => {
    if (!currentUser) return;

    if (cacheIsWarm) {
      // Cache is fresh — load silently in background, no spinner
      loadData({ showSpinner: false });
    } else {
      // No cache or stale — show spinner so user knows something is happening
      setIsLoading(true);
      loadData({ showSpinner: true });
    }
  }, [loadData, currentUser?.id]); // re-run if user changes

  // Invalidate cache on explicit refresh (e.g. after admin actions)
  const refreshData = useCallback(() => {
    clearCache();
    loadData({ showSpinner: true });
  }, [loadData]);

  const activeTournament = tournaments.find(t => t.status === 'active') || null;

  return {
    courses, tournaments, matches, players,
    isLoading, lastLoaded, loadData, refreshData,
    activeTournament, pendingRequestsCount,
    setCourses, setTournaments, setMatches, setPlayers,
  };
};
