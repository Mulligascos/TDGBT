// ─── AUTH SESSION UTILITY ─────────────────────────────────────────────────────
// Call ensureSession() before any Supabase write operation.
// It checks for a valid auth session and silently re-authenticates if needed,
// using credentials stored in localStorage at login time.
 
import { supabase } from '../supabaseClient';
 
export const ensureSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;
 
    // No session — re-auth from stored credentials (no DB query needed)
    const authRaw = localStorage.getItem('tdg-auth');
    if (!authRaw) return false;
 
    const { email, pin } = JSON.parse(authRaw);
    if (!email || !pin) return false;
 
    const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
    if (error) {
      console.warn('[ensureSession] Re-auth failed:', error.message);
      return false;
    }
 
    console.log('[ensureSession] Session restored');
    return true;
  } catch (e) {
    console.warn('[ensureSession] Error:', e);
    return false;
  }
};
 
