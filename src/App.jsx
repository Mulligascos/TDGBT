import React, { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { haptic } from './utils';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { MatchesPage } from './pages/matches/MatchesPage';
import { AdminPanel } from './pages/matches/AdminPanel';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { CoursesPage } from './pages/CoursesPage';
import { BagTagsPage } from './pages/BagTagsPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState(null);

  const {
    currentUser, players: loginPlayers, isLoadingPlayers,
    loginError, setLoginError,
    login, logout, updateUser, isAdmin,
  } = useAuth();

  const {
    courses, tournaments, matches, players,
    isLoading, loadData, activeTournament, pendingRequestsCount,
  } = useAppData(currentUser, isAdmin);

  const showToast = useCallback((message, type = 'success') => {
    haptic(type === 'error' ? 'error' : 'success');
    setToast({ message, type });
  }, []);

  const handleLogin = useCallback(async (name, pin) => {
    const ok = await login(name, pin);
    if (ok) showToast(`Welcome back, ${name.split(' ')[0]}!`);
  }, [login, showToast]);

  const handleLogout = useCallback(() => {
    logout();
    setActiveTab('home');
    showToast('Signed out', 'info');
  }, [logout, showToast]);

  const handleTabChange = useCallback((tab) => {
    haptic('light');
    setActiveTab(tab);
  }, []);

  // Not logged in
  if (!currentUser) {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <LoginPage
          players={loginPlayers}
          isLoadingPlayers={isLoadingPlayers}
          onLogin={handleLogin}
          loginError={loginError}
        />
      </>
    );
  }

  // Shared props
  const commonProps = {
    currentUser,
    isAdmin,
    onNavigate: handleTabChange,
  };

  const pages = {
    home: (
      <HomePage
        {...commonProps}
        tournaments={tournaments}
        activeTournament={activeTournament}
        players={players}
        pendingRequestsCount={pendingRequestsCount}
      />
    ),
    matches: (
      <MatchesPage
        {...commonProps}
        matches={matches}
        activeTournament={activeTournament}
        courses={courses}
        players={players}
        tournaments={tournaments}
        onDataChanged={loadData}
        updateUser={updateUser}
      />
    ),
    history: <HistoryPage {...commonProps} matches={matches} players={players} />,
    courses: <CoursesPage {...commonProps} courses={courses} />,
    admin: (
      <AdminPanel
        currentUser={currentUser}
        tournaments={tournaments}
        rounds={[]}
        courses={courses}
        players={players}
        onDataChanged={loadData}
        onBack={() => handleTabChange('home')}
        pendingRequestsCount={pendingRequestsCount}
      />
    ),
    bagtags: (
      <BagTagsPage
        currentUser={currentUser}
        players={players}
      />
    ),
    profile: (
      <ProfilePage
        {...commonProps}
        onLogout={handleLogout}
        updateUser={updateUser}
      />
    ),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #071407; color: white; }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -100%); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        button { font-family: "'DM Sans', sans-serif"; }
        select option { background: #0d2b0d; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {pages[activeTab] || pages.home}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  );
}
