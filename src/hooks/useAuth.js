import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Normalise DB column names → consistent app-wide field names
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

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tdg-user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [players, setPlayers] = useState([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Load player list for login dropdown
  useEffect(() => {
    const fetchPlayers = async () => {
      setIsLoadingPlayers(true);
      const { data, error } = await supabase
        .from('players')
        .select('player_id, player_name, player_status')
        .eq('player_status', 'Active')
        .order('player_name');
      if (!error && data) {
        setPlayers(data.map(normalisePlayer));
      }
      if (error) console.error('Error loading players:', error);
      setIsLoadingPlayers(false);
    };
    fetchPlayers();
  }, []);

  const login = useCallback(async (playerName, pin) => {
    setLoginError('');
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('player_name', playerName)
      .eq('pin', pin)
      .single();

    if (error || !data) {
      setLoginError('Invalid name or PIN. Please try again.');
      return false;
    }

    const user = normalisePlayer(data);
    localStorage.setItem('tdg-user', JSON.stringify(user));
    setCurrentUser(user);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tdg-user');
    setCurrentUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    localStorage.setItem('tdg-user', JSON.stringify(updated));
    setCurrentUser(updated);
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'committee';

  return {
    currentUser, players, isLoadingPlayers,
    loginError, setLoginError,
    login, logout, updateUser, isAdmin,
  };
};
