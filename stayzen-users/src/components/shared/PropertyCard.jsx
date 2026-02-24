import React, { useState, useEffect, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Star, MapPin, ArrowRight, X } from 'lucide-react';
import './PropertyCard.css';

const PropertyCard = memo(({ item, isFavorite, onToggleFavorite, compact, onStartChat }) => {
    const [activeImage, setActiveImage] = useState(0);
    const [showPricingModal, setShowPricingModal] = useState(false);

    // --- Unified Data Mapping ---
    const isRoommate = item.postType === 'roommate' || item.type === 'Roommate Matching';
    const images = item.propertyImage ? [item.propertyImage] : (item.imageUrls || item.images || []);
    const title = item.name || item.propertyName || 'Premium Property';

    // Auto-scroll logic for images
    useEffect(() => {
        if (!images || images.length <= 1) return;

        const interval = setInterval(() => {
            setActiveImage((prev) => (prev + 1) % images.length);
        }, 8000); // 8 seconds as requested

        return () => clearInterval(interval);
    }, [images.length]);

    // Simplified price logic - trust the formatted rent from dataService
    let displayRent = item.rent || '';

    // PG specific pricing extraction if rent is missing
    if (!displayRent || displayRent === '₹' || displayRent.toLowerCase().includes('request')) {
        if (item.monthlyRent) displayRent = `₹${item.monthlyRent}`;
        else if (item.dailyRent) displayRent = `₹${item.dailyRent}`;
        else if (item.weeklyRent) displayRent = `₹${item.weeklyRent}`;
        else if (item.price) displayRent = `₹${item.price}`;
    }

    if (!displayRent || displayRent === '₹') {
        displayRent = 'Price on Request';
    }

    const isPriceOnRequest = displayRent.toLowerCase().includes('request');

    // Determine period
    let period = '';
    if (!isPriceOnRequest) {
        if (isRoommate) period = '/mo';
        else if (item.type === 'Room' || (item.rentType && item.rentType.toLowerCase() === 'daywise')) period = '/day';
        else if (item.rentType && item.rentType.toLowerCase() === 'weekly') period = '/wk';
        else period = '/mo';
    }

    const location = item.location || (item.city ? `${item.city}, ${item.province || item.state}` : 'Premium Location');

    const handleCardClick = () => {
        window.dispatchEvent(new CustomEvent('openProperty', { detail: item }));
    };

    return (
        <motion.div
            className={`ex-stay-card ${compact ? 'compact' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleCardClick}
            style={{ cursor: 'pointer', willChange: 'transform' }}
        >
            <div className="ex-img-container">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={activeImage}
                        src={images[activeImage] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600'}
                        alt={title}
                        className="ex-main-img"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600';
                        }}
                    />
                </AnimatePresence>

                <div className="ex-overlay-top">
                    {item.isFeatured !== false && (
                        <div className="ex-badge-vial">
                            <Sparkles size={12} fill="#ea580c" color="#ea580c" />
                            <span>Featured</span>
                        </div>
                    )}
                    <button
                        className={`ex-wish-btn ${isFavorite ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(e, item);
                        }}
                    >
                        <Heart
                            size={20}
                            fill={isFavorite ? "#ef4444" : "transparent"}
                            color={isFavorite ? "#ef4444" : "white"}
                        />
                    </button>
                </div>

                <div className="ex-img-controls">
                    <div className="ex-dots">
                        {images.length > 0 && images.slice(0, 3).map((_, idx) => (
                            <div
                                key={idx}
                                className={`ex-dot ${idx === activeImage ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImage(idx);
                                }}
                            />
                        ))}
                    </div>
                    <div className="ex-rating-vial">
                        <Star size={12} fill="#ffffff" color="#ffffff" />
                        <span>{item.rating || '4.8'}</span>
                    </div>
                </div>
            </div>

            <div className="ex-card-body">
                <div className="ex-row-meta">
                    <div className="ex-tags-group">
                        <span className="ex-tag">
                            {item.propertyType || item.type || 'Stay'}
                        </span>
                        {(() => {
                            let secondaryValue = '';
                            const pType = (item.propertyType || item.type || '').toLowerCase();

                            // 1. Try to find the most specific layout/type string
                            if (pType.includes('pg') || pType.includes('co-living') || pType.includes('hostel')) {
                                secondaryValue = item.roomType || item.unitType || item.sharingType || (item.features && item.features.roomType) || '';
                            } else {
                                secondaryValue = item.unitType || item.flatType || item.roomType || (item.features && item.features.flatType) || '';
                            }

                            // 2. Sanitize: Convert to string, trim, and catch boolean bugs
                            let displayValue = String(secondaryValue).trim();

                            // 3. Fallback for boolean bugs or missing data
                            if (!displayValue || displayValue.toLowerCase() === "true" || displayValue.toLowerCase() === "false" || displayValue === "undefined" || displayValue === "null") {
                                displayValue = pType.includes('apartment') ? '1BHK' : (pType.includes('room') ? 'Standard' : '');
                            }

                            if (displayValue) {
                                const isPG = pType.includes('pg') || pType.includes('hostel') || pType.includes('co-living');
                                const configurations = displayValue.split(',').map(s => s.trim()).filter(Boolean);

                                let firstConfig = configurations[0];
                                // Special formatting for PGs: if it's just "1x" or "2", add "Sharing"
                                if (isPG && /^\d+x?$/i.test(firstConfig)) {
                                    firstConfig += ' Sharing';
                                }

                                const hasMore = configurations.length > 1;

                                return (
                                    <div className="ex-tags-wrap">
                                        <span className="ex-tag secondary">{firstConfig}</span>
                                        {hasMore && (
                                            <button
                                                className="ex-more-tag"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPricingModal(true);
                                                }}
                                            >
                                                + {configurations.length - 1} More
                                            </button>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <div className="ex-price-node">
                        <span className={`ex-value ${isPriceOnRequest ? 'request' : ''}`}>{displayRent}</span>
                        <span className="ex-period">{period}</span>
                    </div>
                </div>

                <h3 className="ex-prop-name" title={title}>
                    {isRoommate ? (
                        <>
                            <span className="poster-name">{item.userName}</span>
                            <span className="at-building"> looking at {item.propertyName}</span>
                        </>
                    ) : title}
                </h3>

                <div className="ex-location">
                    <MapPin size={16} className="ex-loc-icon" />
                    <span>{location}</span>
                </div>

                {isRoommate ? (
                    <div className="ex-roommate-details">
                        <div className="rm-feat"><b>Type:</b> {item.sharingType}</div>
                        <div className="rm-feat"><b>Qualities:</b> {item.qualities}</div>
                    </div>
                ) : !compact && (
                    <div className="ex-specs-grid">
                        <div className="ex-spec-item">
                            <span className="ex-spec-label">Config / Layout</span>{' '}
                            <span className="ex-spec-val highlight">
                                {(() => {
                                    const pType = (item.propertyType || item.type || '').toLowerCase();
                                    const isPG = pType.includes('pg') || pType.includes('hostel') || pType.includes('co-living');

                                    const val = item.unitType || item.flatType || item.roomType || item.sharingType || (item.features && (item.features.flatType || item.features.roomType)) || '';
                                    let str = String(val).trim();

                                    if (!str || str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
                                        return pType.includes('apartment') ? '1BHK' : 'Standard';
                                    }

                                    const configs = str.split(',').map(s => s.trim().replace(/\s*sharing\s*/i, '')).filter(Boolean);
                                    if (configs.length > 1 && isPG) {
                                        return configs.slice(0, 2).join('/') + ' Sharing';
                                    }

                                    if (isPG && /^\d+x?$/i.test(str)) {
                                        return str + ' Sharing';
                                    }

                                    return str.length > 20 ? str.split(',')[0] : str;
                                })()}
                            </span>
                        </div>
                        <div className="ex-spec-item">
                            <span className="ex-spec-label">Empty Units</span>{' '}
                            <span className={`ex-spec-val ${(!item.emptyUnits || item.emptyUnits == 0) ? 'text-red' : 'highlight'}`}>
                                {item.emptyUnits ?? '0'}
                            </span>
                        </div>
                        <div className="ex-spec-item">
                            <span className="ex-spec-label">Furniture</span>{' '}
                            <span className="ex-spec-val">{item.furnitureProvided || 'Semi'}</span>
                        </div>
                        <div className="ex-spec-item">
                            <span className="ex-spec-label">Advance</span>{' '}
                            <span className="ex-spec-val">{item.advancePayment || 'NA'}</span>
                        </div>
                    </div>
                )}

                <div className="ex-footer">
                    <div className="ex-footer-left">
                        {isRoommate ? (
                            <button
                                className="ex-chat-now-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStartChat && onStartChat(item.userId, item.userName);
                                }}
                            >
                                Chat Now
                            </button>
                        ) : (
                            <>
                                <div className={`ex-quick-status ${(!item.emptyUnits || item.emptyUnits == 0) ? 'unavailable' : ''}`}>
                                    {(!item.emptyUnits || item.emptyUnits == 0) ? 'Not Available' : 'Available Now'}
                                </div>
                                <button
                                    className="ex-map-btn"
                                    title="View on Maps"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const mapUrl = item.latitude && item.longitude
                                            ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
                                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`;
                                        window.open(mapUrl, '_blank');
                                    }}
                                >
                                    <MapPin size={14} />
                                </button>
                            </>
                        )}
                    </div>
                    <div className="ex-view-link">
                        <ArrowRight size={18} />
                    </div>
                </div>
            </div>
            {/* Pricing Details Modal - Rendered via Portal to ensure global centering */}
            {createPortal(
                <AnimatePresence>
                    {showPricingModal && (
                        <motion.div
                            className="ex-pricing-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPricingModal(false);
                            }}
                        >
                            <motion.div
                                className="ex-pricing-modal glass-modal"
                                initial={{ scale: 0.9, opacity: 0, y: 100 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 100 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <div className="title-stack">
                                        <h3>Pricing Protocol</h3>
                                        <span className="subtitle-vial">{title}</span>
                                    </div>
                                    <button className="close-btn" onClick={() => setShowPricingModal(false)}><X size={20} /></button>
                                </div>
                                <div className="modal-body">
                                    <div className="config-list">
                                        {(item.roomType || item.unitType || '').split(',').map((cfg, idx) => {
                                            const rawCfg = cfg.trim();
                                            if (!rawCfg) return null;

                                            const qtyMatch = rawCfg.match(/^(\d+x)\s+/i);
                                            const quantity = qtyMatch ? qtyMatch[1] : '';
                                            const priceMatch = rawCfg.match(/\((.*?)\)/);
                                            const priceOnly = priceMatch ? priceMatch[1] : 'Price on Request';
                                            let nameOnly = rawCfg.replace(/^(\d+x)\s+/i, '').replace(/\(.*?\)/, '').trim();

                                            return (
                                                <div className="config-node" key={idx}>
                                                    <div className="node-info">
                                                        <div className="node-top">
                                                            <span className="node-name">{nameOnly}</span>
                                                            {quantity && <span className="node-qty">{quantity} Available</span>}
                                                        </div>
                                                        <div className="node-status">
                                                            <div className="status-dot"></div>
                                                            <span>Configuration Active</span>
                                                        </div>
                                                    </div>
                                                    <div className="node-price">
                                                        <span className="price-tag">{priceOnly.includes('₹') ? priceOnly : `₹${priceOnly}`}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="primary-action-btn" onClick={() => {
                                        setShowPricingModal(false);
                                        window.dispatchEvent(new CustomEvent('openProperty', { detail: item }));
                                    }}>
                                        Access Full Property Data
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </motion.div>
    );
});

export default PropertyCard;
