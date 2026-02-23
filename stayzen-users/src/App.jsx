import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { auth } from './firebase';
import { Menu, Bell, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// Lazy Loaded Components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Explore = lazy(() => import('./components/Explore'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));
const Auth = lazy(() => import('./components/Auth'));
const Bookings = lazy(() => import('./components/Bookings'));
const Favorites = lazy(() => import('./components/Favorites'));
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const Payments = lazy(() => import('./components/Payments'));
const Notifications = lazy(() => import('./components/Notifications'));
const About = lazy(() => import('./components/About'));
const RoommateMatching = lazy(() => import('./components/RoommateMatching'));
const Chats = lazy(() => import('./components/Chats'));

const LoadingFallback = () => (
  <div className="intel-loading-screen">
    <motion.div
      className="intel-loader"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    />
  </div>
);

function AppContent({ user, isSidebarOpen, setIsSidebarOpen, handleLogout }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`app-container ${!user ? 'guest-mode' : ''}`}>
      {!isAuthPage && (
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      )}

      <div className="main-layout">
        {!isAuthPage && (
          <header className={`main-header glass-panel ${!user ? 'guest-header' : ''}`}>
            <div className="header-left">
              <button className={`menu-toggle ${isMobile ? 'mobile' : 'desktop'}`} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                {isMobile ? (
                  <Menu size={20} />
                ) : (
                  isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />
                )}
              </button>
              <div className="search-bar">
                <Search size={18} className="search-icon" />
                <input type="text" placeholder="Search for your next home..." />
              </div>
            </div>

            <div className="header-right">
              {user ? (
                <>
                  <Link to="/notifications" className="icon-btn">
                    <Bell size={20} />
                    <span className="badge"></span>
                  </Link>

                  <Link to="/profile" className="user-profile-head">
                    <div className="avatar">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="User" />
                    </div>
                    <div className="user-info-text">
                      <span className="user-display-name">{user.displayName || user.email.split('@')[0]}</span>
                      <span className="user-status">Verified Member</span>
                    </div>
                  </Link>
                </>
              ) : (
                <Link to="/auth" className="login-btn-header">
                  Sign In
                </Link>
              )}
            </div>
          </header>
        )}

        <main className="content-section" style={{ padding: isAuthPage ? 0 : '32px' }}>
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Explore />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />

                {/* All Protected Routes Restored */}
                <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/auth" />} />
                <Route path="/settings" element={user ? <Settings /> : <Navigate to="/auth" />} />
                <Route path="/bookings" element={user ? <Bookings /> : <Navigate to="/auth" />} />
                <Route path="/payments" element={user ? <Payments /> : <Navigate to="/auth" />} />
                <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" />} />
                <Route path="/favorites" element={user ? <Favorites /> : <Navigate to="/auth" />} />
                <Route path="/roommates" element={user ? <RoommateMatching /> : <Navigate to="/auth" />} />
                <Route path="/chats" element={user ? <Chats /> : <Navigate to="/auth" />} />

                {/* Public Pages */}
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Default sidebar state based on screen width
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  if (loading) return (
    <div className="app-loading">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />
      <p style={{ fontWeight: 700, color: 'var(--secondary)' }}>Staging your Zen experience...</p>
    </div>
  );

  return (
    <Router>
      <AppContent
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
      />
    </Router>
  );
}

export default App;

