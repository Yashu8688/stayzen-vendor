import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, NavLink } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { auth, db } from './firebase';
import { doc, setDoc, increment } from "firebase/firestore";
import { Menu, Bell, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import logoImg from './assets/logo.jpg';

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
const PropertyDetails = lazy(() => import('./components/PropertyDetails'));
import Footer from './components/shared/Footer';
import ReviewSlider from './components/shared/ReviewSlider';

const LoadingFallback = () => (
  <div className="intel-loading-screen">
    <motion.div
      className="intel-loader"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    />
  </div>
);

const AppContent = ({ user, handleLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  const navItems = [
    { label: 'Explore', path: '/', icon: Search },
    { label: 'Dashboard', path: '/dashboard', icon: Menu },
    { label: 'My Stays', path: '/bookings', icon: Bell },
    { label: 'Favorites', path: '/favorites', icon: Search },
    { label: 'Chats', path: '/chats', icon: Search },
  ];

  return (
    <div className={`app-container ${!user ? 'guest-mode' : ''}`}>
      {!isAuthPage && (
        <header className="glass-nav fixed-header">
          <div className="nav-content-wrapper">
            {/* Left: Mobile Menu Trigger */}
            <button
              className="mobile-menu-trigger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={24} />
            </button>

            {/* Center: Logo Section */}
            <Link to="/" className="brand-logotype centered-logo">
              <img src="/logo.svg" className="logo-img" alt="StayZen" />
              <span className="logo-text">Stay<span>Zen</span></span>
            </Link>

            {/* Right: Notifications */}
            <div className="mobile-header-actions">
              {user && (
                <Link to="/notifications" className="action-circle">
                  <Bell size={22} />
                  <div className="dot-badge"></div>
                </Link>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="main-nav-links">
              <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Explore</Link>
              {user ? (
                <>
                  <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
                  <Link to="/bookings" className={location.pathname === '/bookings' ? 'active' : ''}>Bookings</Link>
                  <Link to="/payments" className={location.pathname === '/payments' ? 'active' : ''}>Payments</Link>
                  <Link to="/favorites" className={location.pathname === '/favorites' ? 'active' : ''}>Favorites</Link>
                  <Link to="/chats" className={location.pathname === '/chats' ? 'active' : ''}>Messages</Link>
                  <Link to="/help" className={location.pathname === '/help' ? 'active' : ''}>Help Center</Link>
                  <Link to="/roommates" className={location.pathname === '/roommates' ? 'active' : ''}>Roommate Matching</Link>
                </>
              ) : (
                <>
                  <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>About</Link>
                  <Link to="/help" className={location.pathname === '/help' ? 'active' : ''}>Help</Link>
                </>
              )}
            </nav>

            {/* Actions Section */}
            <div className="nav-actions">
              <a
                href="https://vendors.stayzen.in/"
                className="enroll-property-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Enroll Your Property
              </a>
              {user ? (
                <>
                  <Link to="/notifications" className="action-circle">
                    <Bell size={18} />
                    <span className="dot-badge"></span>
                  </Link>
                  <div className="user-dropdown-trigger">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="User" />
                    <div className="dropdown-menu glass-card">
                      <div className="dropdown-header">
                        <strong>{user.displayName || 'User'}</strong>
                        <span>Verified Member</span>
                      </div>
                      <div className="dropdown-divider"></div>
                      <Link to="/profile">Profile</Link>
                      <Link to="/favorites">Favorites</Link>
                      <Link to="/settings">Settings</Link>
                      <div className="dropdown-divider"></div>
                      <button onClick={handleLogout} className="logout-btn">Sign Out</button>
                    </div>
                  </div>
                </>
              ) : (
                <Link to="/auth" className="premium-btn">Sign In</Link>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="main-viewport" style={{ paddingTop: isAuthPage ? 0 : '64px' }}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Explore />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
              <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/auth" />} />
              <Route path="/settings" element={user ? <Settings /> : <Navigate to="/auth" />} />
              <Route path="/bookings" element={user ? <Bookings /> : <Navigate to="/auth" />} />
              <Route path="/payments" element={user ? <Payments /> : <Navigate to="/auth" />} />
              <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" />} />
              <Route path="/favorites" element={user ? <Favorites /> : <Navigate to="/auth" />} />
              <Route path="/roommates" element={user ? <RoommateMatching /> : <Navigate to="/auth" />} />
              <Route path="/chats" element={user ? <Chats /> : <Navigate to="/auth" />} />
              <Route path="/messages" element={user ? <Chats /> : <Navigate to="/auth" />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/property/:id" element={<PropertyDetails />} />
              <Route path="/view-property/:id" element={<PropertyDetails />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
        {!user && !isAuthPage && !['/chats', '/payments', '/help', '/bookings', '/notifications'].includes(location.pathname) && (
          <ReviewSlider />
        )}
        {!isAuthPage && location.pathname !== '/notifications' && (
          <Footer />
        )}
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                className="mobile-sidebar-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                className="mobile-sidebar"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                <div className="sidebar-header">
                  <div className="logo-icon">S</div>
                  <span className="logo-text">Stay<span>Zen</span></span>
                </div>
                <nav className="sidebar-nav">
                  <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>Explore</NavLink>
                  {user ? (
                    <>
                      <NavLink to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</NavLink>
                      <NavLink to="/bookings" onClick={() => setIsMobileMenuOpen(false)}>Bookings</NavLink>
                      <NavLink to="/payments" onClick={() => setIsMobileMenuOpen(false)}>Payments</NavLink>
                      <NavLink to="/favorites" onClick={() => setIsMobileMenuOpen(false)}>Favorites</NavLink>
                      <NavLink to="/chats" onClick={() => setIsMobileMenuOpen(false)}>Messages</NavLink>
                      <NavLink to="/roommates" onClick={() => setIsMobileMenuOpen(false)}>Roommate Matching</NavLink>
                      <NavLink to="/profile" onClick={() => setIsMobileMenuOpen(false)}>My Profile</NavLink>
                      <NavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)}>Settings</NavLink>
                    </>
                  ) : (
                    <NavLink to="/auth" onClick={() => setIsMobileMenuOpen(false)}>Sign In / Register</NavLink>
                  )}
                  <NavLink to="/help" onClick={() => setIsMobileMenuOpen(false)}>Help Center</NavLink>
                  <NavLink to="/about" onClick={() => setIsMobileMenuOpen(false)}>About Us</NavLink>
                  <a
                    href="https://vendors.stayzen.in/"
                    className="mobile-enroll-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enroll Your Property
                  </a>
                </nav>
                {user && (
                  <div className="sidebar-footer">
                    <button onClick={handleLogout} className="sidebar-logout">Sign Out</button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation Bar Removed */}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 📊 DAILY VISIT TRACKING
    const trackVisit = async () => {
      const hasTracked = sessionStorage.getItem('u_tracked');
      if (hasTracked) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        const shardId = Math.floor(Math.random() * 10).toString();
        const shardRef = doc(db, "analytics", "visits", "daily", today, "shards", shardId);
        await setDoc(shardRef, { users: increment(1), lastUpdated: new Date().toISOString() }, { merge: true });
        sessionStorage.setItem('u_tracked', 'true');
      } catch (err) { console.error("Tracking Error:", err); }
    };
    trackVisit();

    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => auth.signOut();

  if (loading) return <LoadingFallback />;

  return (
    <Router>
      <AppContent user={user} handleLogout={handleLogout} />
    </Router>
  );
}

export default App;
