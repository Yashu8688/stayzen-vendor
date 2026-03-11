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
    Users
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
        const unsubscribeAuth = auth.onAuthStateChanged((u) => setUser(u));
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
        if (!auth.currentUser) return alert("Please sign in to save favorites.");
        try {
            await toggleFavorite(auth.currentUser.uid, prop);
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    return (
        <div className="hq-dashboard-container fade-up">
            {/* Premium Hero Section */}
            <header className="hq-hero-banner">
                <div className="hero-content">
                    <motion.div
                        className="hq-status-tag"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <ShieldCheck size={14} />
                        <span>StayZen Gold Member</span>
                    </motion.div>
                    <h1 className="heading-l">
                        Find your <span className="gradient-glow">Zen</span>,<br />
                        {user?.displayName?.split(' ')[0] || 'Guest'}
                    </h1>
                    <p className="hero-subtitle">Your personalized residential management center is ready.</p>
                </div>
                <div className="hero-date glass-card">
                    <CalendarClock size={18} />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
            </header>

            {/* Premium Actions Grid */}
            <section className="hq-actions-grid">
                <QuickAction
                    icon={Compass}
                    label="Explore Spaces"
                    desc="Search verified properties near you"
                    path="/"
                    color="#1aa79c"
                    navigate={navigate}
                />
                <QuickAction
                    icon={CalendarClock}
                    label="My Stays"
                    desc="Track your active bookings & terms"
                    path="/bookings"
                    color="#3b82f6"
                    navigate={navigate}
                />
                <QuickAction
                    icon={Heart}
                    label="Favorites"
                    desc="Your shortlisted premium homes"
                    path="/favorites"
                    color="#ec4899"
                    navigate={navigate}
                />
                <QuickAction
                    icon={Users}
                    label="Roommate Matching"
                    desc="Connect with verified residents"
                    path="/roommates"
                    color="#f59e0b"
                    navigate={navigate}
                />
            </section>

            {/* Recommendations Section */}
            <section className="hq-recommendations">
                <div className="section-header">
                    <div>
                        <h2 className="heading-m">Recommended for You</h2>
                        <p className="text-s">Based on your preferences and recent searches</p>
                    </div>
                    <button className="view-link" onClick={() => navigate('/')}>
                        View All <ArrowRight size={16} />
                    </button>
                </div>

                <div className="hq-properties-row">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="skeleton-card glass-card"></div>
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

const QuickAction = ({ icon: Icon, label, desc, path, color, navigate }) => (
    <motion.div
        className="hq-action-card glass-card card-hover"
        whileHover={{ y: -5 }}
        onClick={() => navigate(path)}
    >
        <div className="action-icon" style={{ color: color, background: `${color}15` }}>
            <Icon size={24} />
        </div>
        <div className="action-info">
            <h3>{label}</h3>
            <p>{desc}</p>
        </div>
        <div className="action-next">
            <ArrowRight size={18} />
        </div>
    </motion.div>
);

export default Dashboard;
