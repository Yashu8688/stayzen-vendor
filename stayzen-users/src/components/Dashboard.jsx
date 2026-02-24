import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
    Compass,
    CalendarClock,
    MessageCircle,
    ArrowRight,
    Heart,
    ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToPosts, toggleFavorite, subscribeToUserFavorites } from '../services/dataService';
import PropertyModal from './PropertyModal';
import PropertyCard from './shared/PropertyCard';
import './Dashboard.css';
import './Explore.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);
    const [properties, setProperties] = useState([]);
    const [userFavorites, setUserFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((u) => {
            setUser(u);
        });

        const handleOpenProperty = (e) => setSelectedProperty(e.detail);
        window.addEventListener('openProperty', handleOpenProperty);
        return () => {
            window.removeEventListener('openProperty', handleOpenProperty);
            unsubscribeAuth();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToPosts((data) => {
            if (data && data.length > 0) {
                // Shuffle data to make the dashboard feel dynamic
                const shuffled = [...data].sort(() => 0.5 - Math.random());
                setProperties(shuffled.slice(0, 4));
            } else {
                setProperties([]);
            }
            setLoading(false);
        });

        let unsubscribeFavs = () => { };
        if (auth.currentUser) {
            unsubscribeFavs = subscribeToUserFavorites(auth.currentUser.uid, (data) => {
                const favIds = data.map(f => f.propertyId);
                setUserFavorites(favIds);
            });
        }

        return () => {
            unsubscribe();
            unsubscribeFavs();
        };
    }, []);

    const handleToggleFavorite = async (e, prop) => {
        e.stopPropagation();
        if (!auth.currentUser) {
            alert("Please sign in to save favorites.");
            return;
        }
        try {
            await toggleFavorite(auth.currentUser.uid, prop);
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    const QuickAction = ({ icon: Icon, label, desc, path, color }) => (
        <motion.div
            className="intel-quick-action"
            whileHover={{ y: -5 }}
            onClick={() => navigate(path)}
        >
            <div className="action-icon-vial" style={{ color: color, background: `${color}15` }}>
                <Icon size={24} />
            </div>
            <div className="action-info">
                <h3>{label}</h3>
                <p>{desc}</p>
            </div>
            <div className="action-arrow">
                <ArrowRight size={16} />
            </div>
        </motion.div>
    );

    return (
        <div className="intel-home-dashboard">
            {/* Welcome Header */}
            <header className="intel-welcome-header">
                <div className="welcome-text">
                    <motion.div
                        className="intel-status-pill"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <ShieldCheck size={14} />
                        <span>Verified Eco-system Member</span>
                    </motion.div>
                    <h1>Welcome, <span className="gradient-glow">{user?.displayName?.split(' ')[0] || 'Guest'}</span></h1>
                    <p>{user ? 'Your residential command center is active. All systems nominal.' : 'Explore the StayZen eco-system and find your next home.'}</p>
                </div>
                <div className="date-vial">
                    <CalendarClock size={16} />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
            </header>

            {/* Quick Actions Grid */}
            <section className="intel-actions-grid">
                <QuickAction
                    icon={Compass}
                    label="Explore Spaces"
                    desc="Discover new properties with AI matching."
                    path="/"
                    color="#1aa79c"
                />
                <QuickAction
                    icon={CalendarClock}
                    label="My Stays"
                    desc="Track active bookings and lease terms."
                    path="/bookings"
                    color="#3b82f6"
                />
                <QuickAction
                    icon={Heart}
                    label="My Favorites"
                    desc="View your saved and shortlisted properties."
                    path="/favorites"
                    color="#ec4899"
                />
                <QuickAction
                    icon={MessageCircle}
                    label="Support"
                    desc="24/7 assistance and help center."
                    path="/help"
                    color="#8b5cf6"
                />
            </section>

            {/* Recommended Feed */}
            <section className="intel-rec-section">
                <div className="section-header">
                    <h2>Recommended for You</h2>
                    <button className="view-all-btn" onClick={() => navigate('/')}>
                        View All <ArrowRight size={14} />
                    </button>
                </div>

                <div className="ex-grid-view dashboard-row">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="ex-skeleton card"></div>
                        ))
                    ) : (
                        properties.map((prop) => (
                            <PropertyCard
                                key={prop.id}
                                item={prop}
                                isFavorite={userFavorites.includes(prop.id)}
                                onToggleFavorite={handleToggleFavorite}
                                compact={true}
                            />
                        ))
                    )}
                </div>
            </section>

            <AnimatePresence>
                {selectedProperty && (
                    <PropertyModal
                        property={selectedProperty}
                        onClose={() => setSelectedProperty(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
