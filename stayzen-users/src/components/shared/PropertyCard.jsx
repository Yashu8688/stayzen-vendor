import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Star, MapPin, ArrowRight, X, Layers, Armchair } from 'lucide-react';
import './PropertyCard.css';

const PropertyCard = memo(({ item, isFavorite, onToggleFavorite, compact, onStartChat }) => {
    const navigate = useNavigate();
    const [activeImage, setActiveImage] = useState(0);
    const [showPricingModal, setShowPricingModal] = useState(false);

    const images = item.propertyImage ? [item.propertyImage] : (item.imageUrls || item.images || []);
    const title = item.name || item.propertyName || 'Premium Property';

    useEffect(() => {
        if (!images || images.length <= 1) return;
        const interval = setInterval(() => {
            setActiveImage((prev) => (prev + 1) % images.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [images.length]);

    let minRent = Infinity;
    if (item.bhkAllocations && item.bhkAllocations.length > 0) {
        item.bhkAllocations.forEach(a => {
            const price = Number(String(a.pricePerUnit || '0').replace(/[^0-9.]/g, ''));
            if (price > 0 && price < minRent) minRent = price;
        });
    } else if (item.roomConfigurations && item.roomConfigurations.length > 0) {
        item.roomConfigurations.forEach(c => {
            const price = Number(String(c.rentAmount || '0').replace(/[^0-9.]/g, ''));
            if (price > 0 && price < minRent) minRent = price;
        });
    }

    let displayRent = item.dailyRent || item.monthlyRent || item.rent || item.price || '';
    if (minRent !== Infinity && (!displayRent || displayRent === '' || displayRent === '0')) {
        displayRent = `₹${minRent}`;
    }

    if (displayRent && typeof displayRent === 'string' && !displayRent.startsWith('₹')) {
        displayRent = `₹${displayRent}`;
    }
    if (!displayRent || displayRent === '₹' || (typeof displayRent === 'string' && displayRent.toLowerCase().includes('request'))) {
        displayRent = 'Price on Request';
    }
    const isPriceOnRequest = typeof displayRent === 'string' && displayRent.toLowerCase().includes('request');

    let period = '';
    if (!isPriceOnRequest) {
        if (item.rentType?.toLowerCase() === 'daywise' || item.dailyRent) period = '/day';
        else if (item.rentType?.toLowerCase() === 'weekly') period = '/wk';
        else period = '/mo';
    }

    const location = item.location || (item.city ? `${item.city}${item.state ? `, ${item.state}` : ''}${item.pincode ? ` - ${item.pincode}` : ''}` : 'Premium Location');

    return (
        <motion.div
            className="property-card-premium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -12 }}
            onClick={() => navigate(`/property/${item.id}`)}
        >
            <div className="card-media">
                <div
                    className="media-backdrop"
                    style={{ backgroundImage: `url(${images[(activeImage - 1 + images.length) % images.length]})` }}
                />
                <AnimatePresence initial={false}>
                    <motion.img
                        key={activeImage}
                        src={images[activeImage] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600'}
                        alt={title}
                        className="media-item"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    />
                </AnimatePresence>

                <div className="media-overlay">
                    <div className="overlay-top">
                        {item.isFeatured && (
                            <div className="premium-badge">
                                <Sparkles size={12} />
                                <span>Featured</span>
                            </div>
                        )}
                        <button
                            className={`fav-action ${isFavorite ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, item); }}
                        >
                            <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
                        </button>
                    </div>

                    <div className="overlay-bottom">
                        <div className="media-ticker">
                            {images.slice(0, 5).map((_, i) => (
                                <div key={i} className={`ticker-dot ${i === activeImage ? 'active' : ''}`} />
                            ))}
                        </div>
                        <div className="rating-pill">
                            <Star size={12} fill="currentColor" />
                            <span>{item.rating || '4.8'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-content">
                <div className="content-upper">
                    <h3 className="prop-title-new">{title.toUpperCase()}</h3>
                    <div className="rating-mini">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        <span>{item.rating || '4.8'}</span>
                    </div>
                </div>

                <div className="prop-info-stack">
                    <p className="info-line-1">
                        {item.postType === 'roommate'
                            ? `${item.sharingType} • ${item.posterGender}`
                            : `${item.city || 'Tirupati'} | Rated: ${item.rating || '4.8'}`
                        }
                    </p>
                    <p className="info-line-2">
                        {item.postType === 'roommate'
                            ? `Seeking: ${item.preferredGender} • ${item.posterOccupation || 'Resident'}`
                            : `${item.roomType || item.unitType || 'Premium Space'} | ${item.furnitureProvided || 'AC, WiFi, Food'}`
                        }
                    </p>
                </div>

                <div className="card-footer-new">
                    <div className="price-tag-new">
                        <span className="val">{displayRent}</span>
                        <span className="per">{period}</span>
                    </div>
                    {item.postType === 'roommate' ? (
                        <button
                            className="book-btn-new roommate-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/roommates');
                            }}
                        >
                            Connect Roommate
                        </button>
                    ) : (
                        <button
                            className="book-btn-new"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/property/${item.id}`);
                            }}
                        >
                            Book Now
                        </button>
                    )}
                </div>
            </div>

            {showPricingModal && createPortal(
                <div className="hq-overlay" onClick={() => setShowPricingModal(false)}>
                    <motion.div
                        className="hq-popover"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="pop-header">
                            <h3>Pricing Protocol</h3>
                            <button onClick={() => setShowPricingModal(false)}><X size={20} /></button>
                        </div>
                        <div className="pop-body">
                            {(item.roomType || item.unitType || '').split(',').map((cfg, i) => (
                                <div className="pricing-node" key={i}>
                                    <span className="node-label">{cfg.trim()}</span>
                                    <span className="node-val">Active</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </motion.div>
    );
});

export default PropertyCard;
