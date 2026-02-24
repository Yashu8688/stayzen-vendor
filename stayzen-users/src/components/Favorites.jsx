import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { subscribeToUserFavorites, toggleFavorite } from '../services/dataService';
import { Heart, MapPin, Star, Sparkles, ArrowRight, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PropertyModal from './PropertyModal';
import PropertyCard from './shared/PropertyCard';
import './Favorites.css';
import './Explore.css';

const Favorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [userFavorites, setUserFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleOpenProperty = (e) => setSelectedProperty(e.detail);
        window.addEventListener('openProperty', handleOpenProperty);
        return () => window.removeEventListener('openProperty', handleOpenProperty);
    }, []);

    useEffect(() => {
        if (!auth.currentUser) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToUserFavorites(auth.currentUser.uid, (data) => {
            const propertyList = data.map(fav => ({
                id: fav.propertyId,
                ...fav.propertyData,
                images: fav.propertyData.images || [fav.propertyData.image]
            }));
            setFavorites(propertyList);
            setUserFavorites(data.map(f => f.propertyId));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleToggleFavorite = async (e, prop) => {
        e.stopPropagation();
        try {
            await toggleFavorite(auth.currentUser.uid, prop);
        } catch (error) {
            console.error("Toggle Favorite Error:", error);
        }
    };

    return (
        <div className="ex-root favorites-page">
            <div className="intel-simple-header" style={{ padding: '40px 40px 0' }}>
                <div className="simple-header-content">
                    <div className="ex-badge-vial" style={{ marginBottom: 12 }}>
                        <Sparkles size={12} fill="#ea580c" color="#ea580c" />
                        <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>Memory Collective</span>
                    </div>
                    <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px' }}>Personal Archive</h1>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Your handpicked selection of premium living spaces.</p>
                </div>
            </div>

            <div className="ex-manifest" style={{ marginTop: 0, paddingTop: 40 }}>
                <div className="ex-grid-view">
                    <AnimatePresence mode='popLayout'>
                        {loading ? (
                            [1, 2, 3, 4].map(i => <div key={i} className="ex-skeleton card"></div>)
                        ) : favorites.length > 0 ? (
                            favorites.map((prop) => (
                                <PropertyCard
                                    key={prop.id}
                                    item={prop}
                                    isFavorite={userFavorites.includes(prop.id)}
                                    onToggleFavorite={handleToggleFavorite}
                                />
                            ))
                        ) : (
                            <motion.div
                                key="empty"
                                className="ex-empty-state"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ gridColumn: '1 / -1', padding: '100px 0' }}
                            >
                                <div className="ex-empty-icon-box" style={{ width: 100, height: 100, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', border: '1px dashed #e2e8f0' }}>
                                    <Heart size={48} color="#cbd5e1" />
                                </div>
                                <h3 style={{ fontSize: 24, fontWeight: 900 }}>Archive Empty</h3>
                                <p style={{ maxWidth: 400, margin: '15px auto 30px', color: '#64748b' }}>No properties saved to your memory bank. Initiate a global scan to find your next stay.</p>
                                <button className="ex-reset-btn" onClick={() => navigate('/')}>
                                    Locate Spaces
                                    <Compass size={18} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

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

export default Favorites;
