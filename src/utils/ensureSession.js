// src/utils/ensureSession.js
// ─────────────────────────────────────────────────────────────────────────────
// Ensures a valid Supabase auth session exists before any RLS-protected write.
// Call `await ensureSession()` at the top of any function that inserts/updates.
//
// What it does:
//   1. Gets the current session from Supabase.
//   2. If the session is missing or the access token has expired, attempts a
//      silent refresh via refreshSession().
//   3. Throws a descriptive error if no valid session can be obtained, so the
//      calling code can surface a proper message to the user instead of
//      receiving a confusing RLS 403.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabaseClient';

/**
 * Ensure a valid authenticated session is present.
 * Throws if unauthenticated or if the token cannot be refreshed.
 * @returns {Promise<import('@supabase/supabase-js').Session>} The active session.
 */
export const ensureSession = async () => {
  // Try to get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Auth error: ${sessionError.message}`);
  }

  // Session present and token not yet expired — all good
  if (session && session.expires_at * 1000 > Date.now()) {
    return session;
  }

  // No session or token is stale — attempt a silent refresh
  const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError || !refreshed) {
    throw new Error(
      'Your session has expired. Please sign out and sign back in to continue.'
    );
  }

  return refreshed;
};
