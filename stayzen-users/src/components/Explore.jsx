import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Search,
    Compass,
    Building2,
    Hotel,
    ArrowRight,
    Sparkles,
    Filter,
    Navigation,
    ShieldCheck,
    ChevronRight,
    SearchX,
    Home,
    Users,
    MessageSquare,
    Send,
    Bell,
    X
} from 'lucide-react';
import { auth, db } from '../firebase';
import {
    subscribeToPosts,
    getPostsPaginated,
    toggleFavorite,
    subscribeToUserFavorites,
    findOrCreateChat,
    subscribeToMessages,
    sendMessage
} from '../services/dataService';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyModal from './PropertyModal';
import PropertyCard from './shared/PropertyCard';
import './Explore.css';
import { useNavigate } from 'react-router-dom';

const Explore = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [userFavorites, setUserFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isDistanceFilterActive, setIsDistanceFilterActive] = useState(false);
    const [bridgeProperty, setBridgeProperty] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [lastVisible, setLastVisible] = useState(null);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Advanced Filter States
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);
    const [filterConfig, setFilterConfig] = useState({
        bhk: 'All',
        sharing: 'All',
        priceRange: 200000,
        location: ''
    });

    useEffect(() => {
        // Portal-aware interaction logic: Click-outside is handled by the overlay backdrop
        // This effect can be empty or removed if no other refs need outside-click handling
    }, []);

    useEffect(() => {
        const handleOpenProperty = (e) => {
            if (e.detail?.postType === 'roommate') return; // Don't open modal for roommate posts
            if (auth.currentUser) {
                setSelectedProperty(e.detail);
            } else {
                setBridgeProperty(e.detail);
            }
        };
        window.addEventListener('openProperty', handleOpenProperty);
        return () => window.removeEventListener('openProperty', handleOpenProperty);
    }, []);

    useEffect(() => {
        const fetchInitialPosts = async () => {
            try {
                const { posts, lastVisible: last } = await getPostsPaginated(null, 12);
                setProperties(posts);
                setLastVisible(last);
                setLoading(false);
                if (posts.length < 12) setHasMore(false);
            } catch (error) {
                console.error("Initial Fetch Error:", error);
                setLoading(false);
            }
        };

        fetchInitialPosts();

        let unsubscribeFavs = () => { };
        if (auth.currentUser) {
            unsubscribeFavs = subscribeToUserFavorites(auth.currentUser.uid, (data) => {
                const favIds = data.map(f => f.propertyId);
                setUserFavorites(favIds);
            });
        }

        return () => {
            unsubscribeFavs();
        };
    }, []);

    const handleLoadMore = async () => {
        if (isMoreLoading || !hasMore) return;
        setIsMoreLoading(true);
        try {
            const { posts, lastVisible: last } = await getPostsPaginated(lastVisible, 12);
            if (posts.length === 0) {
                setHasMore(false);
            } else {
                setProperties(prev => [...prev, ...posts]);
                setLastVisible(last);
                if (posts.length < 12) setHasMore(false);
            }
        } catch (error) {
            console.error("Load More Error:", error);
        } finally {
            setIsMoreLoading(false);
        }
    };

    useEffect(() => {
        if (activeChat) {
            const unsubscribe = subscribeToMessages(activeChat, (data) => {
                setMessages(data);
            });
            return () => unsubscribe();
        }
    }, [activeChat]);

    const handleStartChat = async (targetUserId, targetUserName) => {
        if (!auth.currentUser) {
            navigate('/auth');
            return;
        }
        try {
            const chatId = await findOrCreateChat(auth.currentUser.uid, targetUserId);
            setActiveChat(chatId);
            setIsChatOpen(true);
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;
        try {
            await sendMessage(activeChat, {
                text: newMessage,
                senderId: auth.currentUser.uid,
                participants: activeChat.split('_')
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleToggleFavorite = async (e, prop) => {
        e.stopPropagation();
        if (!auth.currentUser) {
            navigate('/auth');
            return;
        }
        try {
            await toggleFavorite(auth.currentUser.uid, prop);
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    const categories = [
        { name: 'All', icon: <Compass size={18} /> },
        { name: 'Apartment', icon: <Building2 size={18} /> },
        { name: 'PG', icon: <Hotel size={18} /> },
        { name: 'Rooms', icon: <Home size={18} /> },
        { name: 'Co-Living', icon: <Navigation size={18} /> },
        { name: 'Roommate Matching', icon: <Users size={18} /> },
    ];

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const extractCoords = (url) => {
        if (!url || typeof url !== 'string') return null;
        const patterns = [
            /@(-?\d+\.\d+),(-?\d+\.\d+)/,
            /(?:search|place|dir)\/(-?\d+\.\d+)(?:,\s*|\+|,)(-?\d+\.\d+)/,
            /q=(-?\d+\.\d+)(?:,\s*|\+|,)(-?\d+\.\d+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
        }
        return null;
    };

    const handleLocate = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({
                    lat: latitude,
                    lng: longitude
                });
                setIsDistanceFilterActive(true);

                // Reverse geocoding to get location name for search bar
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
                    const data = await response.json();
                    if (data && data.address) {
                        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
                        const area = data.address.sublocality || data.address.neighbourhood || '';
                        const locationName = area ? `${area}, ${city}` : city;
                        if (locationName) setSearchTerm(locationName);
                    }
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                }

                setIsLocating(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location. Please check permissions.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Helper to generate smart filter summary
    const getFilterSummary = () => {
        if (activeCategory === 'All' && filterConfig.bhk === 'All' && filterConfig.sharing === 'All' && filterConfig.priceRange >= 200000 && !filterConfig.location) {
            return 'Scanning All Sectors';
        }

        const parts = [];
        if (activeCategory !== 'All') parts.push(activeCategory);
        if (filterConfig.bhk !== 'All') parts.push(filterConfig.bhk);
        if (filterConfig.sharing !== 'All') parts.push(filterConfig.sharing);
        if (filterConfig.priceRange < 200000) parts.push(`Upto ₹${(filterConfig.priceRange / 1000).toFixed(0)}k`);
        if (filterConfig.location) parts.push(filterConfig.location);

        return parts.join(' • ');
    };

    const filteredProperties = properties.filter(item => {
        const matchesCategory = activeCategory === 'All' ||
            (activeCategory === 'Rooms' ? (item.type === 'Room' || item.propertyType === 'Room') :
                activeCategory === 'Roommate Matching' ? (item.postType === 'roommate' || item.type === 'Roommate Matching') :
                    item.type?.toLowerCase().includes(activeCategory.toLowerCase()));

        const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchesDistance = true;
        if (isDistanceFilterActive && userLocation) {
            const propertyCoords = item.latitude && item.longitude
                ? { lat: item.latitude, lng: item.longitude }
                : extractCoords(item.googleMapsLink || item.locationLink);

            if (propertyCoords) {
                const distance = getDistance(
                    userLocation.lat,
                    userLocation.lng,
                    propertyCoords.lat,
                    propertyCoords.lng
                );
                matchesDistance = distance <= 20; // 20km radius
            } else {
                matchesDistance = false;
            }
        }

        const itemBHKInfo = (item.bhk || item.flatType || item.unitType || (item.roomType && !String(item.roomType).toLowerCase().includes('sharing') ? item.roomType : '') || '').toString().toLowerCase();
        const filterBHKDigit = filterConfig.bhk.charAt(0).toLowerCase();
        const matchesBHK = filterConfig.bhk === 'All' || itemBHKInfo.includes(filterBHKDigit);

        const itemSharingInfo = (item.sharing || item.sharingType || (item.roomType && String(item.roomType).toLowerCase().includes('sharing') ? item.roomType : '') || '').toString().toLowerCase();
        const filterSharingDigit = filterConfig.sharing.charAt(0).toLowerCase();
        const matchesSharing = filterConfig.sharing === 'All' || itemSharingInfo.includes(filterSharingDigit);

        // Robust price parsing including dailyRent
        const rawPrice = item.dailyRent || item.monthlyRent || item.rent || item.price || '0';
        const numericPrice = parseInt(rawPrice.toString().replace(/[^0-9]/g, '')) || 0;
        const matchesPrice = numericPrice <= filterConfig.priceRange;

        const matchesLocationFilter = !filterConfig.location ||
            (item.location || '').toLowerCase().includes(filterConfig.location.toLowerCase());

        return matchesCategory && matchesSearch && matchesDistance && matchesBHK && matchesSharing && matchesPrice && matchesLocationFilter;
    });

    return (
        <div className="ex-root">
            {/* Mobile Branding Header */}
            <div className="ex-mobile-header">
                <img src="/logo.svg" alt="StayZen" />
                <span>Stay<span>Zen</span></span>
            </div>

            {/* Cinematic Hero Section */}
            <section className="ex-hero-panel">
                <div className="ex-hero-bg"></div>
                <div className="ex-hero-content">
                    <motion.div
                        className="ex-status-pill"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <ShieldCheck size={11} />
                        <span>Verified Eco-system Presence</span>
                    </motion.div>

                    <motion.h1
                        className="ex-hero-title"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        High-Performance <br />
                        <span className="ex-gradient-glow">Living Ecosystems.</span>
                    </motion.h1>

                    <motion.p
                        className="ex-hero-subtitle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Discover high-performance living spaces with verified credentials and seamless integration.
                    </motion.p>

                    <motion.div
                        className="ex-search-console"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
                    >
                        <div className="ex-console-group">
                            <label><Search size={11} /> Global Search</label>
                            <input
                                type="text"
                                placeholder="Search by city, area or sector..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="ex-console-divider"></div>
                        <div
                            className="ex-console-group clickable"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFilterOpen(!isFilterOpen);
                            }}
                            ref={filterRef}
                            style={{ position: 'relative' }}
                        >
                            <label><Filter size={11} /> Active Protocol</label>
                            <div className="ex-select-vial">
                                <span className="ex-summary-text">{getFilterSummary()}</span>
                                <ChevronRight
                                    size={12}
                                    className={`ex-chevron ${isFilterOpen ? 'rotating' : ''}`}
                                    style={{ transform: isFilterOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                />
                            </div>
                        </div>
                        <button
                            className={`ex-search-btn ${isLocating ? 'locating' : ''} ${isDistanceFilterActive ? 'active' : ''}`}
                            onClick={handleLocate}
                            disabled={isLocating}
                        >
                            <Compass size={16} className={isLocating ? "ex-spin" : "ex-spin-slow"} />
                            <span>{isLocating ? 'Locating...' : isDistanceFilterActive ? 'Near Me' : 'Locate'}</span>
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Smart Categories */}
            <div className="ex-cat-section">
                <div className="ex-cat-bar">
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            className={`ex-cat-pill ${activeCategory === cat.name ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.name)}
                        >
                            <span className="ex-cat-icon">{cat.icon}</span>
                            <span className="ex-cat-text">{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Manifest Grid */}
            <section className="ex-manifest">
                <div className="ex-manifest-header" style={{ justifyContent: 'flex-end', marginBottom: '16px' }}>

                    {(searchTerm || activeCategory !== 'All' || isDistanceFilterActive) && (
                        <motion.div
                            className="ex-header-actions"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <button
                                className="ex-clear-filter-btn"
                                onClick={() => {
                                    setSearchTerm('');
                                    setActiveCategory('All');
                                    setIsDistanceFilterActive(false);
                                    setUserLocation(null);
                                }}
                            >
                                <Filter size={14} />
                                <span>Clear Filters</span>
                            </button>
                        </motion.div>
                    )}
                </div>

                <div className="ex-grid-view">
                    <AnimatePresence mode='popLayout'>
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <div key={i} className="ex-skeleton card"></div>
                            ))
                        ) : filteredProperties.length > 0 ? (
                            filteredProperties.map((prop) => (
                                <PropertyCard
                                    key={prop.id}
                                    item={prop}
                                    isFavorite={userFavorites.includes(prop.id)}
                                    onToggleFavorite={handleToggleFavorite}
                                    onStartChat={handleStartChat}
                                />
                            ))
                        ) : (
                            <div className="ex-empty-state">
                                <SearchX size={64} className="ex-empty-icon" />
                                <h3>No Data Response</h3>
                                <p>The current search parameters yielded zero matches in our cloud. Adjust your filters or location scan.</p>
                                <button className="ex-reset-btn" onClick={() => { setSearchTerm(''); setActiveCategory('All'); setIsDistanceFilterActive(false); setUserLocation(null); }}>
                                    Reset Scan
                                </button>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {hasMore && filteredProperties.length > 0 && (
                    <div className="ex-load-more-container">
                        <button
                            className={`ex-load-more-btn ${isMoreLoading ? 'loading' : ''}`}
                            onClick={handleLoadMore}
                            disabled={isMoreLoading}
                        >
                            {isMoreLoading ? (
                                <>
                                    <div className="mini-loader"></div>
                                    <span>Syncing Data Batch...</span>
                                </>
                            ) : (
                                <>
                                    <span>Explore More Sectors</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </section>

            <AnimatePresence>
                {bridgeProperty && (
                    <motion.div
                        className="ex-bridge-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setBridgeProperty(null)}
                    >
                        <motion.div
                            className="ex-bridge-content"
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="ex-bridge-header">
                                <div className="ex-status-pill">
                                    <Sparkles size={12} />
                                    <span>Access Protocol</span>
                                </div>
                                <h2>How to proceed?</h2>
                                <p>Continue to <b>{bridgeProperty.name}</b> details through your preferred gateway.</p>
                            </div>

                            <div className="ex-bridge-options">
                                <button className="ex-bridge-btn app" onClick={() => {
                                    window.open('https://play.google.com/store/games', '_blank');
                                    setBridgeProperty(null);
                                }}>
                                    <div className="btn-icon">
                                        <img src="https://cdn-icons-png.flaticon.com/512/888/888857.png" alt="Play Store" />
                                    </div>
                                    <div className="btn-text">
                                        <span className="btn-label">Optimized Experience</span>
                                        <span className="btn-main">Continue with App</span>
                                    </div>
                                    <ChevronRight size={18} />
                                </button>

                                <button className="ex-bridge-btn browser" onClick={() => {
                                    if (!auth.currentUser) {
                                        navigate('/auth');
                                        return;
                                    }
                                    setSelectedProperty(bridgeProperty);
                                    setBridgeProperty(null);
                                }}>
                                    <div className="btn-icon">
                                        <Compass size={24} />
                                    </div>
                                    <div className="btn-text">
                                        <span className="btn-label">Native Web</span>
                                        <span className="btn-main">Continue with Browser</span>
                                    </div>
                                    <ArrowRight size={18} />
                                </button>
                            </div>

                            <button className="ex-bridge-cancel" onClick={() => setBridgeProperty(null)}>
                                Dismiss Scan
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedProperty && (
                    <PropertyModal
                        property={selectedProperty}
                        onClose={() => setSelectedProperty(null)}
                    />
                )}
            </AnimatePresence>

            {/* Chat Overlay for Explore */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        className="ex-chat-window glass-panel"
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                    >
                        <div className="ex-chat-header">
                            <div className="ex-chat-user">
                                <MessageSquare size={18} />
                                <span>Roommate Protocol</span>
                            </div>
                            <button onClick={() => setIsChatOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="ex-messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`ex-msg ${msg.senderId === auth?.currentUser?.uid ? 'sent' : 'received'}`}>
                                    <div className="ex-msg-bubble">
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="ex-chat-input">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button type="submit">
                                <Send size={18} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Portal-based Filter Protocol */}
            {createPortal(
                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            key="ex-filter-portal"
                            className="ex-filter-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                        >
                            <motion.div
                                className="ex-filter-popover glass-panel"
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="ex-popover-scroll">
                                    <div className="ex-filter-section">
                                        <label>Sector Location</label>
                                        <div className="ex-input-vial">
                                            <Navigation size={16} />
                                            <input
                                                type="text"
                                                placeholder="Enter sub-sector..."
                                                value={filterConfig.location}
                                                onChange={(e) => setFilterConfig({ ...filterConfig, location: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="ex-filter-section">
                                        <label>Configuration (BHK)</label>
                                        <div className="ex-option-grid">
                                            {['All', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'].map(size => (
                                                <button
                                                    key={size}
                                                    className={`ex-option-btn ${filterConfig.bhk === size ? 'active' : ''}`}
                                                    onClick={() => setFilterConfig({ ...filterConfig, bhk: size })}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="ex-filter-section">
                                        <label>Sharing Protocol</label>
                                        <div className="ex-option-grid">
                                            {['All', '1x Sharing', '2x Sharing', '3x Sharing'].map(type => (
                                                <button
                                                    key={type}
                                                    className={`ex-option-btn ${filterConfig.sharing === type ? 'active' : ''}`}
                                                    onClick={() => setFilterConfig({ ...filterConfig, sharing: type })}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="ex-filter-section">
                                        <div className="ex-flex-header">
                                            <label>Budget Parameter</label>
                                            <span className="ex-value-tag">₹{filterConfig.priceRange.toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="500"
                                            max="100000"
                                            step="500"
                                            className="ex-range-slider"
                                            value={filterConfig.priceRange}
                                            onChange={(e) => setFilterConfig({ ...filterConfig, priceRange: parseInt(e.target.value) })}
                                        />
                                        <div className="ex-range-labels">
                                            <span>₹500</span>
                                            <span>₹100k</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ex-popover-footer">
                                    <button className="ex-reset-filters" onClick={() => setFilterConfig({ bhk: 'All', sharing: 'All', priceRange: 100000, location: '' })}>
                                        Reset
                                    </button>
                                    <button className="ex-apply-filters" onClick={() => setIsFilterOpen(false)}>
                                        Apply Protocol
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default Explore;
