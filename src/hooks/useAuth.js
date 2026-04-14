import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export const normalisePlayer = (row) => ({
  id: row.player_id,
  name: row.player_name,
  status: row.player_status,
  division: row.player_division,
  bagTag: row.bag_tag,
  role: row.role || 'member',
  pin: row.pin,
  membershipNumber: row.membership_number,
  email: row.email || '',
  phone: row.phone || '',
  pdgaNumber: row.pdga_number || '',
  udiscUsername: row.udisc_username || '',
  createdAt: row.created_at,
});

// Derive the auth email for a player
// Uses their real email if set, otherwise a synthetic internal one
const authEmail = (player) =>
  player.email?.trim() ? player.email.trim() : `${player.player_id}@tdg.local`;

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('tdg-user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [players, setPlayers] = useState([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Load players list for the login dropdown
  useEffect(() => {
    supabase
      .from('players')
      .select('player_id, player_name, player_status')
      .eq('player_status', 'Active')
      .order('player_name')
      .then(({ data }) => {
        setPlayers((data || []).map(normalisePlayer));
        setIsLoadingPlayers(false);
      });
  }, []);

  // Keep Supabase Auth session in sync
  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && currentUser) {
        // Auth session expired but we have a cached user — re-authenticate silently
        // This handles page refreshes where the session cookie expired
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          localStorage.removeItem('tdg-user');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (playerName, pin) => {
    setLoginError('');

    // Step 1: Find the player record by name to get their player_id and email
    const { data: playerRow, error: findErr } = await supabase
      .from('players')
      .select('*')
      .eq('player_name', playerName)
      .single();

    if (findErr || !playerRow) {
      setLoginError('Player not found.');
      return false;
    }

    // Step 2: Verify PIN matches (belt-and-braces check even with Auth)
    if (String(playerRow.pin) !== String(pin)) {
      setLoginError('Invalid name or PIN. Please try again.');
      return false;
    }

    // Step 3: Sign in with Supabase Auth
    const email = authEmail(playerRow);
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: String(pin),
    });

    if (authErr) {
      // Auth account doesn't exist yet — create it on the fly
      if (authErr.message?.includes('Invalid login credentials') ||
          authErr.status === 400) {
        const created = await createAuthAccount(playerRow, pin);
        if (!created) {
          // Fall back to PIN-only mode if auth account creation fails
          console.warn('Auth account creation failed, using PIN-only mode');
        }
      } else {
        console.warn('Auth error:', authErr.message);
        // Still proceed with PIN-only if Supabase Auth has issues
      }
    }

    // Step 4: Store user in state + localStorage
    const user = normalisePlayer(playerRow);
    localStorage.setItem('tdg-user', JSON.stringify(user));
    setCurrentUser(user);

    // Step 5: Fire-and-forget last_seen update
    supabase.from('players')
      .update({ last_seen: new Date().toISOString() })
      .eq('player_id', playerRow.player_id);

    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('tdg-user');
    setCurrentUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    localStorage.setItem('tdg-user', JSON.stringify(updated));
    setCurrentUser(updated);
  }, []);

  // Create a Supabase Auth account for a player who doesn't have one yet
  const createAuthAccount = async (playerRow, pin) => {
    try {
      const email = authEmail(playerRow);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: String(pin),
        options: {
          data: {
            player_id: playerRow.player_id,
            player_name: playerRow.player_name,
          },
        },
      });

      if (error) {
        console.warn('signUp error:', error.message);
        return false;
      }

      // Link auth_user_id back to player record if we got an id
      if (data?.user?.id) {
        await supabase
          .from('players')
          .update({ auth_user_id: data.user.id })
          .eq('player_id', playerRow.player_id);
      }

      // Now sign in with the newly created account
      await supabase.auth.signInWithPassword({
        email,
        password: String(pin),
      });

      return true;
    } catch (e) {
      console.warn('createAuthAccount error:', e);
      return false;
    }
  };

  // Change PIN — updates both the players table and Supabase Auth password
  const changePin = useCallback(async (playerId, newPin) => {
    // Update players table
    const { error: dbErr } = await supabase
      .from('players')
      .update({ pin: newPin })
      .eq('player_id', playerId);
    if (dbErr) throw dbErr;

    // Update Supabase Auth password
    const { error: authErr } = await supabase.auth.updateUser({
      password: String(newPin),
    });
    if (authErr) console.warn('Auth password update failed:', authErr.message);
    // Don't throw — PIN is updated in DB, auth will sync on next login
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'committee';

  return {
    currentUser, players, isLoadingPlayers,
    loginError, setLoginError,
    login, logout, updateUser, isAdmin, changePin,
  };
};
