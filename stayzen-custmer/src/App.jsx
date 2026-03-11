import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'
import { auth, db } from './firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, increment } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [initialTab, setInitialTab] = useState('dashboard');

  useEffect(() => {
    // 📊 DAILY VISIT TRACKING (Vendors Site)
    const trackVisit = async () => {
      const hasTracked = sessionStorage.getItem('v_tracked');
      if (hasTracked) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        const shardId = Math.floor(Math.random() * 10).toString(); // 10 shards
        const shardRef = doc(db, "analytics", "visits", "daily", today, "shards", shardId);

        await setDoc(shardRef, {
          vendors: increment(1),
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        sessionStorage.setItem('v_tracked', 'true');
        console.log("Visit tracked for Vendor site (sharded)");
      } catch (err) {
        console.error("Tracking Error:", err);
      }
    };

    trackVisit();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setError(null);
      if (u) {
        try {
          // 🚀 Ensure user has a manager profile and is approved automatically
          const { getOrCreateManagerProfile } = await import("./services/dataService");
          const userData = await getOrCreateManagerProfile(u);

          if (userData.role === 'manager') {
            if (userData.status === 'Approved') {
              setHasProfile(true);
              setUser(u);

              // Handle pending property registration
              const pendingProperty = localStorage.getItem('pendingPropertyRegistration');
              if (pendingProperty) {
                try {
                  const propertyData = JSON.parse(pendingProperty);
                  const { addProperty } = await import("./services/dataService");
                  await addProperty({ ...propertyData, ownerId: u.uid });
                  localStorage.removeItem('pendingPropertyRegistration');
                  setInitialTab('properties');
                } catch (err) {
                  console.error("Error saving pending property:", err);
                }
              }
            } else {
              setHasProfile(false);
              setError("Account Pending Approval: Your account is currently under review.");
            }
          } else {
            setHasProfile(false);
            setError("Manager account not found. Please register as a Manager to access this portal.");
          }
        } catch (err) {
          console.error("Profile check error:", err);
          setError("Failed to verify profile. Please try again.");
          setHasProfile(false);
        }
      } else {
        setUser(null);
        setHasProfile(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="loading-screen">Loading StayZen...</div>;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setError(null);
      setShowLanding(true);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  }

  if (auth.currentUser && !hasProfile && error) {
    return (
      <div className="auth-error-screen">
        <div className="auth-error-card">
          <h2>🚫 Access Restricted</h2>
          <p>{error}</p>
          <button onClick={handleLogout} className="error-logout-btn">Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {user && hasProfile ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Dashboard onLogout={handleLogout} user={user} initialTab={initialTab} />
        </motion.div>
      ) : showLanding ? (
        <LandingPage
          key="landing"
          onExplore={(tab) => {
            const destination = typeof tab === 'string' ? tab : 'dashboard';
            setInitialTab(destination);
            setShowLanding(false);
          }}
        />
      ) : (
        <motion.div
          key="auth"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
        >
          <Auth onLogin={() => { }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App
