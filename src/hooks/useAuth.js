import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

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
        .select('id, name, status')
        .eq('status', 'Active')
        .order('name');
      if (!error && data) setPlayers(data);
      setIsLoadingPlayers(false);
    };
    fetchPlayers();
  }, []);

  const login = useCallback(async (playerName, pin) => {
    setLoginError('');
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('name', playerName)
      .eq('pin', pin)
      .single();

    if (error || !data) {
      setLoginError('Invalid name or PIN. Please try again.');
      return false;
    }

    localStorage.setItem('tdg-user', JSON.stringify(data));
    setCurrentUser(data);
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
