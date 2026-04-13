import React, { useState, useCallback, useEffect } from 'react';
import { loadTheme, applyTheme } from './theme';

// Apply saved theme immediately on load
applyTheme(loadTheme());
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
import { LostFoundPage } from './pages/LostFoundPage';
import { CTPPage } from './pages/CTPPage';
import { useAppBanners, AppBanners } from './components/AppBanner';
import { BingoPage } from './pages/BingoPage';
import { WallOfFamePage } from './pages/WallOfFamePage';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState(null);
  const [, forceThemeRender] = useState(0);
  const handleThemeChange = () => forceThemeRender(n => n + 1);

  const {
    currentUser, players: loginPlayers, isLoadingPlayers,
    loginError, setLoginError,
    login, logout, updateUser, isAdmin,
  } = useAuth();

  const { banners, dismiss: dismissBanner } = useAppBanners(currentUser);

  const {
    courses, tournaments, matches, players,
    isLoading, loadData, refreshData, activeTournament, pendingRequestsCount,
  } = useAppData(currentUser, isAdmin, updateUser);

  // Track background refresh (cache was warm but silent fetch is running)
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  useEffect(() => {
    if (!isLoading && courses.length > 0) {
      // Data is showing from cache — do a silent background refresh
      setBackgroundRefreshing(true);
      const t = setTimeout(() => setBackgroundRefreshing(false), 3000);
      return () => clearTimeout(t);
    }
  }, [currentUser?.id]); // only on user change/login

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

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return (
        <HomePage {...commonProps} tournaments={tournaments} activeTournament={activeTournament}
          players={players} pendingRequestsCount={pendingRequestsCount} />
      );
      case 'matches': return (
        <MatchesPage {...commonProps} matches={matches} activeTournament={activeTournament}
          courses={courses} players={players} tournaments={tournaments}
          onDataChanged={refreshData} updateUser={updateUser} />
      );
      case 'history': return <HistoryPage {...commonProps} matches={matches} players={players} />;
      case 'courses': return <CoursesPage {...commonProps} courses={courses} />;
      case 'admin': return (
        <AdminPanel currentUser={currentUser} tournaments={tournaments} rounds={[]}
          courses={courses} players={players} onDataChanged={refreshData}
          onBack={() => handleTabChange('home')} pendingRequestsCount={pendingRequestsCount} />
      );
      case 'bagtags': return <BagTagsPage currentUser={currentUser} players={players} />;
      case 'lostfound': return <LostFoundPage currentUser={currentUser} isAdmin={isAdmin} courses={courses} />;
      case 'ctp': return <CTPPage currentUser={currentUser} isAdmin={isAdmin} courses={courses} />;
      case 'bingo': return <BingoPage currentUser={currentUser} isAdmin={isAdmin} players={players} />;
      case 'walloffame': return <WallOfFamePage currentUser={currentUser} courses={courses} players={players} />;
      case 'profile': return <ProfilePage {...commonProps} onLogout={handleLogout} updateUser={updateUser} onThemeChange={handleThemeChange} />;
      default: return <HomePage {...commonProps} tournaments={tournaments} activeTournament={activeTournament}
        players={players} pendingRequestsCount={pendingRequestsCount} />;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-base); color: var(--text-primary); }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -100%); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes shimmer {
          0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; }
        }
        button { font-family: "'DM Sans', sans-serif"; }
        select option { background: var(--bg-nav); }
        input::placeholder { color: var(--text-muted); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-card); border-radius: 2px; }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AppBanners banners={banners} onDismiss={dismissBanner} />

      {/* Subtle background refresh indicator — thin animated bar at top */}
      {(isLoading || backgroundRefreshing) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, var(--brand-light, #4ade80), transparent)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.2s ease-in-out infinite',
          zIndex: 9999,
          pointerEvents: 'none',
        }} />
      )}

      {renderPage()}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  );
}
