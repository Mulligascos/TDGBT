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

// Derive auth email from a raw DB row (has player_id)
const authEmail = (playerRow) =>
  playerRow.email?.trim() ? playerRow.email.trim() : `${playerRow.player_id}@tdg.local`;

// Derive auth email from a normalised player object (has id)
const authEmailFromNormalised = (player) =>
  player.email?.trim() ? player.email.trim() : `${player.id}@tdg.local`;

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

  // Load players list for the login dropdown.
  // IMPORTANT: Your RLS policy on `players` must allow anon SELECT of at least
  // (player_id, player_name, player_status, email) so the dropdown populates
  // before any user is signed in. All other columns remain RLS-protected.
  useEffect(() => {
    supabase
      .from('players')
      .select('player_id, player_name, player_status, email')
      .eq('player_status', 'Active')
      .order('player_name')
      .then(({ data }) => {
        setPlayers((data || []).map(normalisePlayer));
        setIsLoadingPlayers(false);
      });
  }, []);

  // Keep Supabase Auth session in sync on mount
  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return; // Already have a valid session

      // No session — silently re-authenticate using stored credentials
      const authRaw = localStorage.getItem('tdg-auth');
      if (!authRaw) return;

      try {
        const { email, pin } = JSON.parse(authRaw);
        if (!email || !pin) return;
        const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
        if (error) {
          console.warn('[Auth] Silent re-auth failed:', error.message);
        } else {
          console.log('[Auth] Session restored silently');
        }
      } catch (e) {
        console.warn('[Auth] Session restore error:', e);
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          localStorage.removeItem('tdg-user');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Create a Supabase Auth account for a player who doesn't have one yet.
  // playerRow is the raw DB row (uses player_id).
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
        console.warn('[Auth] signUp error:', error.message);
        return false;
      }

      // Link auth_user_id back to player record
      if (data?.user?.id) {
        await supabase
          .from('players')
          .update({ auth_user_id: data.user.id })
          .eq('player_id', playerRow.player_id);
      }

      // Sign in with the newly created account
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: String(pin),
      });

      if (signInErr) {
        console.warn('[Auth] signIn after signUp error:', signInErr.message);
        return false;
      }

      return true;
    } catch (e) {
      console.warn('[Auth] createAuthAccount error:', e);
      return false;
    }
  };

  const login = useCallback(async (playerName, pin) => {
    setLoginError('');

    // ── Step 1: Find the player in the already-loaded dropdown list. ──────────
    // This avoids any DB query before a session exists (RLS would block it).
    // The dropdown list was fetched with only the columns needed for login
    // (player_id, player_name, player_status, email) using a permissive anon policy.
    const cachedPlayer = players.find(p => p.name === playerName);

    if (!cachedPlayer) {
      setLoginError('Player not found.');
      return false;
    }

    const email = authEmailFromNormalised(cachedPlayer);

    // ── Step 2: Sign in with Supabase Auth first. ─────────────────────────────
    // Once this succeeds we have a session and all RLS-protected queries work.
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: String(pin),
    });

    if (authErr) {
      if (
        authErr.message?.includes('Invalid login credentials') ||
        authErr.status === 400
      ) {
        // Auth account doesn't exist yet — create it on the fly.
        // signUp with the supplied PIN; if the PIN is wrong we'll catch that
        // in Step 4 after we load the full player row.
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password: String(pin),
          options: {
            data: {
              player_id: cachedPlayer.id,
              player_name: cachedPlayer.name,
            },
          },
        });

        if (signUpErr) {
          // Email already exists means a race or duplicate — wrong PIN
          setLoginError('Invalid name or PIN. Please try again.');
          return false;
        }

        // Sign in with the newly created account
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: String(pin),
        });

        if (signInErr) {
          setLoginError('Invalid name or PIN. Please try again.');
          return false;
        }
      } else {
        setLoginError('Sign-in failed. Please try again.');
        console.warn('[Auth] signInWithPassword error:', authErr.message);
        return false;
      }
    }

    // ── Step 3: Session is live — fetch the full player row. ─────────────────
    const { data: playerRow, error: rowErr } = await supabase
      .from('players')
      .select('*')
      .eq('player_name', playerName)
      .single();

    if (rowErr || !playerRow) {
      await supabase.auth.signOut();
      setLoginError('Could not load your profile. Please try again.');
      return false;
    }

    // ── Step 4: Verify PIN against the DB value. ──────────────────────────────
    // This is the authoritative check. If wrong, the auth account was just
    // created with a bad password — sign out and reject.
    if (String(playerRow.pin) !== String(pin)) {
      await supabase.auth.signOut();
      setLoginError('Invalid name or PIN. Please try again.');
      return false;
    }

    // Link auth_user_id if not already set
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.id && !playerRow.auth_user_id) {
      supabase.from('players')
        .update({ auth_user_id: authUser.id })
        .eq('player_id', playerRow.player_id);
    }

    // ── Step 5: Persist user to state + localStorage. ────────────────────────
    const user = normalisePlayer(playerRow);
    const storedEmail = playerRow.email?.trim()
      ? playerRow.email.trim()
      : `${playerRow.player_id}@tdg.local`;
    localStorage.setItem('tdg-user', JSON.stringify(user));
    localStorage.setItem('tdg-auth', JSON.stringify({ email: storedEmail, pin: String(pin) }));
    setCurrentUser(user);

    // ── Step 6: Fire-and-forget last_seen update. ────────────────────────────
    supabase.from('players')
      .update({ last_seen: new Date().toISOString() })
      .eq('player_id', playerRow.player_id);

    return true;
  }, [players]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('tdg-user');
    localStorage.removeItem('tdg-auth');
    setCurrentUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    localStorage.setItem('tdg-user', JSON.stringify(updated));
    setCurrentUser(updated);
  }, []);

  // Change PIN — updates both the players table and Supabase Auth password
  const changePin = useCallback(async (playerId, newPin) => {
    const { error: dbErr } = await supabase
      .from('players')
      .update({ pin: newPin })
      .eq('player_id', playerId);
    if (dbErr) throw dbErr;

    const { error: authErr } = await supabase.auth.updateUser({
      password: String(newPin),
    });
    if (authErr) console.warn('[Auth] Auth password update failed:', authErr.message);
    // Don't throw — PIN is updated in DB, auth will sync on next login
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'committee';

  return {
    currentUser, players, isLoadingPlayers,
    loginError, setLoginError,
    login, logout, updateUser, isAdmin, changePin,
  };
};
