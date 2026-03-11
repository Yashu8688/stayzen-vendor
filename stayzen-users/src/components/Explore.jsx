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
    X,
    SlidersHorizontal
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
        location: '',
        gender: 'All',
        furnishing: 'All',
        amenities: []
    });

    useEffect(() => {
        const handleOpenProperty = (e) => {
            if (auth.currentUser) setSelectedProperty(e.detail);
            else setBridgeProperty(e.detail);
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
        return () => unsubscribeFavs();
    }, []);

    const handleLoadMore = async () => {
        if (isMoreLoading || !hasMore) return;
        setIsMoreLoading(true);
        try {
            const { posts, lastVisible: last } = await getPostsPaginated(lastVisible, 12);
            if (posts.length === 0) setHasMore(false);
            else {
                setProperties(prev => [...prev, ...posts]);
                setLastVisible(last);
                if (posts.length < 12) setHasMore(false);
            }
        } catch (error) { console.error("Load More Error:", error); }
        finally { setIsMoreLoading(false); }
    };

    const handleToggleFavorite = async (e, prop) => {
        e.stopPropagation();
        if (!auth.currentUser) return navigate('/auth');
        try { await toggleFavorite(auth.currentUser.uid, prop); }
        catch (error) { console.error("Error toggling favorite:", error); }
    };

    const handleStartChat = async (targetUserId, targetUserName) => {
        if (!auth.currentUser) return navigate('/auth');
        try {
            const chatId = await findOrCreateChat(auth.currentUser.uid, targetUserId);
            setActiveChat(chatId);
            setIsChatOpen(true);
        } catch (error) { console.error("Error starting chat:", error); }
    };

    const categories = [
        { name: 'All', icon: <Compass size={18} /> },
        { name: 'Apartment', icon: <Building2 size={18} /> },
        { name: 'PG', icon: <Hotel size={18} /> },
        { name: 'Rooms', icon: <Home size={18} /> },
        { name: 'Roommate Matching', icon: <Users size={18} /> },
    ];

    const getFilterSummary = () => {
        if (activeCategory === 'All' && filterConfig.bhk === 'All' && filterConfig.sharing === 'All' && filterConfig.priceRange >= 200000 && !filterConfig.location) {
            return 'Filter Protocol';
        }
        const parts = [];
        if (activeCategory !== 'All') parts.push(activeCategory);
        if (filterConfig.bhk !== 'All') parts.push(filterConfig.bhk);
        if (filterConfig.priceRange < 200000) parts.push(`₹${(filterConfig.priceRange / 1000).toFixed(0)}k`);
        return parts.join(' • ');
    };

    const handleLocate = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported.");
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLocation({ lat: latitude, lng: longitude });
                setIsDistanceFilterActive(true);
                setIsLocating(false);
            },
            () => { setIsLocating(false); alert("Unable to get location."); },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const extractCoords = (url) => {
        if (!url || typeof url !== 'string') return null;
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        return match ? { lat: parseFloat(match[1]), lng: parseFloat(match[2]) } : null;
    };

    // Hero Slider State
    const [bgIndex, setBgIndex] = useState(0);
    const heroImages = [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80'
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setBgIndex(prev => (prev + 1) % heroImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const filteredProperties = properties.filter(item => {
        const matchesCategory = activeCategory === 'All' ||
            (activeCategory === 'Roommate Matching' && item.postType === 'roommate') ||
            (activeCategory !== 'Roommate Matching' && item.type?.toLowerCase().includes(activeCategory.toLowerCase())) ||
            (activeCategory === 'Rooms' && item.propertyType === 'Room');
        const matchesSearch = (item.name || item.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.location || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchesDistance = true;
        if (isDistanceFilterActive && userLocation) {
            const propertyCoords = item.latitude && item.longitude ? { lat: item.latitude, lng: item.longitude } : extractCoords(item.locationLink);
            if (propertyCoords) matchesDistance = getDistance(userLocation.lat, userLocation.lng, propertyCoords.lat, propertyCoords.lng) <= 15;
            else matchesDistance = false;
        }

        const rawPrice = item.dailyRent || item.monthlyRent || item.rent || item.price || 0;
        const numericPrice = typeof rawPrice === 'string' ? parseInt(rawPrice.replace(/[^0-9]/g, '')) : rawPrice;
        const matchesPrice = !numericPrice || numericPrice <= filterConfig.priceRange;

        const matchesBHK = filterConfig.bhk === 'All' ||
            (item.bhkType || item.unitType || '').toLowerCase().includes(filterConfig.bhk.toLowerCase());

        const matchesSharing = filterConfig.sharing === 'All' ||
            (item.roomType || item.sharingType || '').toLowerCase().includes(filterConfig.sharing.toLowerCase());

        const matchesGender = filterConfig.gender === 'All' ||
            (item.gender || item.preference || '').toLowerCase().includes(filterConfig.gender.toLowerCase());

        const matchesFurnishing = filterConfig.furnishing === 'All' ||
            (item.furnishing || '').toLowerCase().includes(filterConfig.furnishing.toLowerCase());

        const matchesAmenities = filterConfig.amenities.length === 0 ||
            filterConfig.amenities.every(amenity =>
                (item.amenities || []).toString().toLowerCase().includes(amenity.toLowerCase())
            );

        const isOwnPost = auth.currentUser && item.userId === auth.currentUser.uid;

        return !isOwnPost && matchesCategory && matchesSearch && matchesDistance && matchesPrice &&
            matchesBHK && matchesSharing && matchesGender && matchesFurnishing && matchesAmenities;
    });

    return (
        <div className="ex-main-container fade-up">
            {/* Dynamic Hero Section */}
            <section className="ex-search-hero">
                <AnimatePresence>
                    <motion.div
                        key={bgIndex}
                        className="hero-bg-layer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        style={{ backgroundImage: `url(${heroImages[bgIndex]})` }}
                    />
                </AnimatePresence>
                <div className="hero-overlay"></div>

                <div className="hero-text-content">
                    <motion.h1
                        className="heading-l"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Find your <span className="gradient-glow">perfect home</span>
                    </motion.h1>
                    <motion.p
                        className="hero-sub"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        Discover verified rooms, PGs and apartments at best prices.
                    </motion.p>
                </div>

                <div className="hq-mobile-search-wrapper">
                    <div className="hq-search-row">
                        <div className="search-input-group">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Where would you like to live?"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="mobile-filter-btn" onClick={() => setIsFilterOpen(true)}>
                            <SlidersHorizontal size={20} />
                        </button>
                    </div>
                    <button className="mobile-search-action-btn" onClick={() => {/* Search trigger if needed */ }}>
                        Search
                    </button>
                </div>

                {/* Desktop Search Bar (Hidden on Mobile) */}
                <div className="hq-search-bar glass-card desktop-only">
                    <div className="search-sec">
                        <Search size={18} className="icon" />
                        <input
                            type="text"
                            placeholder="Where would you like to live?"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="divider"></div>
                    <div className="filter-sec" onClick={() => setIsFilterOpen(true)}>
                        <SlidersHorizontal size={18} className="icon" />
                        <span>Filter</span>
                    </div>
                    <button
                        className={`locate-btn ${isDistanceFilterActive ? 'active' : ''}`}
                        onClick={handleLocate}
                        disabled={isLocating}
                    >
                        <Navigation size={18} className={isLocating ? 'spin' : ''} />
                    </button>
                </div>

                {/* Categories inside Hero */}
                <div className="hero-categories">
                    <div className="category-scroll">
                        {categories.map((cat, i) => (
                            <button
                                key={i}
                                className={`cat-item ${activeCategory === cat.name ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.name)}
                            >
                                <span className="icon">{cat.icon}</span>
                                <span className="label">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Property Display Grid */}
            <section className="ex-property-manifest">
                <div className="ex-section-header">
                    <div className="header-text">
                        <h2>Recommended for you</h2>
                        <p>{filteredProperties.length} Properties found</p>
                    </div>
                </div>
                <div className="manifest-grid">
                    <AnimatePresence mode='popLayout'>
                        {loading ? (
                            Array(8).fill(0).map((_, i) => (
                                <div key={i} className="skeleton-card glass-card"></div>
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
                            <div className="empty-state">
                                <SearchX size={64} />
                                <h3>No properties found</h3>
                                <p>Try adjusting your filters or search area.</p>
                                <button className="premium-btn" onClick={() => { setSearchTerm(''); setActiveCategory('All'); setIsDistanceFilterActive(false); }}>
                                    Reset Scan
                                </button>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {hasMore && filteredProperties.length > 0 && (
                    <div className="load-more-vial">
                        <button className="premium-btn" onClick={handleLoadMore} disabled={isMoreLoading}>
                            {isMoreLoading ? 'Syncing...' : 'Load More Experiences'}
                        </button>
                    </div>
                )}
            </section>

            {/* Filter Overlay Portal */}
            {createPortal(
                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            className="hq-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                        >
                            <motion.div
                                className="hq-popover glass-card"
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="pop-header">
                                    <h3>Advanced Protocol</h3>
                                    <button onClick={() => setIsFilterOpen(false)}><X size={20} /></button>
                                </div>
                                <div className="pop-body">
                                    <div className="filter-group">
                                        <label>Budget Parameter</label>
                                        <div className="range-vial">
                                            <span>₹{(filterConfig.priceRange).toLocaleString()}</span>
                                            <input
                                                type="range"
                                                min="5000" max="200000" step="1000"
                                                value={filterConfig.priceRange}
                                                onChange={(e) => setFilterConfig({ ...filterConfig, priceRange: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="filter-group">
                                        <label>Configuration</label>
                                        <div className="grid-options three-cols">
                                            {['All', '1 BHK', '2 BHK', '3 BHK', '4 BHK'].map(b => (
                                                <button
                                                    key={b}
                                                    className={filterConfig.bhk === b ? 'active' : ''}
                                                    onClick={() => setFilterConfig({ ...filterConfig, bhk: b })}
                                                >{b}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="filter-group">
                                        <label>Sharing Format</label>
                                        <div className="grid-options three-cols">
                                            {['All', 'Private', '2 Sharing', '3 Sharing', '4 Sharing'].map(s => (
                                                <button
                                                    key={s}
                                                    className={filterConfig.sharing === s ? 'active' : ''}
                                                    onClick={() => setFilterConfig({ ...filterConfig, sharing: s })}
                                                >{s}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="filter-group">
                                        <label>Gender Preference</label>
                                        <div className="grid-options three-cols">
                                            {['All', 'Boys', 'Girls', 'Co-living'].map(g => (
                                                <button
                                                    key={g}
                                                    className={filterConfig.gender === g ? 'active' : ''}
                                                    onClick={() => setFilterConfig({ ...filterConfig, gender: g })}
                                                >{g}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="filter-group">
                                        <label>Furnishing Tier</label>
                                        <div className="grid-options three-cols">
                                            {['All', 'Fully', 'Semi', 'Unfurnished'].map(f => (
                                                <button
                                                    key={f}
                                                    className={filterConfig.furnishing === f ? 'active' : ''}
                                                    onClick={() => setFilterConfig({ ...filterConfig, furnishing: f })}
                                                >{f}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="filter-group">
                                        <label>Amenities Protocol</label>
                                        <div className="grid-options three-cols">
                                            {['WiFi', 'AC', 'Parking', 'Gym', 'Geyser', 'Power Backup', 'Food'].map(a => (
                                                <button
                                                    key={a}
                                                    className={filterConfig.amenities.includes(a) ? 'active' : ''}
                                                    onClick={() => {
                                                        const newAmenities = filterConfig.amenities.includes(a)
                                                            ? filterConfig.amenities.filter(item => item !== a)
                                                            : [...filterConfig.amenities, a];
                                                        setFilterConfig({ ...filterConfig, amenities: newAmenities });
                                                    }}
                                                >{a}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="pop-footer">
                                    <div className="protocol-actions">
                                        <button className="reset-link" onClick={() => setFilterConfig({
                                            bhk: 'All',
                                            sharing: 'All',
                                            priceRange: 200000,
                                            location: '',
                                            gender: 'All',
                                            furnishing: 'All',
                                            amenities: []
                                        })}>Reset Protocol</button>
                                        <button className="premium-btn" onClick={() => setIsFilterOpen(false)}>Engage Protocol</button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

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

export default Explore;
