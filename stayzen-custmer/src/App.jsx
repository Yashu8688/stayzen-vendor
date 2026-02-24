import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'
import { auth } from './firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setError(null);
      if (u) {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("./firebase");
          const userDoc = await getDoc(doc(db, "users", u.uid));

          if (userDoc.exists()) {
            if (userDoc.data().role === 'manager') {
              setHasProfile(true);
              setUser(u);
            } else {
              setHasProfile(false);
              setError("Access Denied: This portal is for Managers only. Your account has a 'User' role.");
            }
          } else {
            setHasProfile(false);
            setError("Profile not found. Please register as a Manager.");
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
          <Dashboard onLogout={handleLogout} user={user} />
        </motion.div>
      ) : showLanding ? (
        <LandingPage key="landing" onExplore={() => setShowLanding(false)} />
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
