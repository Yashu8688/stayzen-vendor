import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Properties from './pages/Properties/Properties';
import Bookings from './pages/Bookings/Bookings';
import Promotions from './pages/Promotions/Promotions';

import Alerts from './pages/Alerts/Alerts';
import Settings from './pages/Settings/Settings';
import Feedback from './pages/Feedback/Feedback';
import HelpCenter from './pages/HelpCenter/HelpCenter';
import Users from './pages/Users/Users';
import RoommateMatching from './pages/RoommateMatching/RoommateMatching';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Start with login required

  // Check localStorage for existing login state
  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    if (adminLoggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    setIsLoggedIn(false);
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={!isLoggedIn ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />

      {/* Protected Dashboard Routes */}
      <Route element={isLoggedIn ? <DashboardLayout onLogout={handleLogout} /> : <Navigate to="/" />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/promotions" element={<Promotions />} />

        <Route path="/settings" element={<Settings />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/users" element={<Users />} />
        <Route path="/roommate-matching" element={<RoommateMatching />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
}

export default App;
