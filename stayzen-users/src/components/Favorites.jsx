import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { subscribeToUserFavorites, toggleFavorite } from '../services/dataService';
import { Heart, MapPin, Star, Sparkles, ArrowRight, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PropertyModal from './PropertyModal';
import PropertyCard from './shared/PropertyCard';
import './Favorites-final.css';

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
        <div className="favorites-container">
            <div className="fav-content">
                <div className="fav-grid-header">
                    <div className="fav-label">♥ SAVED ITEMS</div>
                    <h1>Wishlist</h1>
                    <p>Your saved properties</p>
                </div>

                <AnimatePresence mode='popLayout'>
                    {loading ? (
                        <div className="fav-grid">
                            {[1, 2, 3, 4].map(i => <div key={i} className="ex-skeleton card"></div>)}
                        </div>
                    ) : favorites.length > 0 ? (
                        <div className="fav-grid">
                            {favorites.map((prop) => (
                                <PropertyCard
                                    key={prop.id}
                                    item={prop}
                                    isFavorite={userFavorites.includes(prop.id)}
                                    onToggleFavorite={handleToggleFavorite}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="fav-empty">
                            <Heart size={48} color="#cbd5e1" />
                            <h3>No Saved Properties</h3>
                            <p>Start exploring to save your favorites</p>
                            <button className="fav-btn" onClick={() => navigate('/')}>
                                Explore Properties
                            </button>
                        </div>
                    )}
                </AnimatePresence>
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
