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
            <div className="intel-simple-header">
                <div className="simple-header-content">
                    <h1>Personal Archive</h1>
                    <p>Your handpicked selection of premium living spaces.</p>
                </div>
            </div>

            <div className="ex-manifest">
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
                            >
                                <div className="ex-empty-icon-box">
                                    <Heart size={48} color="#cbd5e1" />
                                </div>
                                <h3>Archive Empty</h3>
                                <p>No properties saved to your memory bank. Initiate a global scan to find your next stay.</p>
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
