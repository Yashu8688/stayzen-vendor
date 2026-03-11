import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Star, Wifi, Coffee, Wind, Shield,
    ChevronLeft, ChevronRight, Users, User, Briefcase, Calendar,
    Phone, CheckCircle2, Sparkles, ArrowRight, Zap, Bell, X,
    Home, Info, Contact, ShieldCheck, Heart, Share2, ArrowLeft, Layers, MessageSquare
} from 'lucide-react';
import { getPropertyById, createBooking, notifyAdmin, toggleFavorite, subscribeToUserFavorites } from '../services/dataService';
import { auth } from '../firebase';
import './PropertyDetails.css';

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImg, setCurrentImg] = useState(0);
    const [step, setStep] = useState(1);
    const [isFavorite, setIsFavorite] = useState(false);
    const [bookingData, setBookingData] = useState({
        name: auth.currentUser?.displayName || '',
        phone: '',
        moveInDate: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [selectedUnit, setSelectedUnit] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchProp = async () => {
            try {
                const data = await getPropertyById(id);
                if (data) {
                    setProperty(data);
                    // Initialize selected unit
                    if (data.bhkAllocations && data.bhkAllocations.length > 0) {
                        setSelectedUnit({ type: 'bhk', data: data.bhkAllocations[0] });
                    } else if (data.roomConfigurations && data.roomConfigurations.length > 0) {
                        setSelectedUnit({ type: 'room', data: data.roomConfigurations[0] });
                    }
                }
                else navigate('/');
            } catch (err) {
                console.error(err);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchProp();

        if (auth.currentUser) {
            const unsub = subscribeToUserFavorites(auth.currentUser.uid, (favs) => {
                setIsFavorite(favs.some(f => f.propertyId === id));
            });
            return () => unsub();
        }
    }, [id, navigate]);

    if (loading) return (
        <div className="pd-loading">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="pd-loader" />
        </div>
    );

    if (!property) return null;

    const images = property.images || [];
    const title = property.name || 'Premium Property';
    const isRoom = property.type?.toLowerCase().includes('room') || property.propertyType === 'Room';
    let period = '';
    let displayRent = property.rent || 'Price on Request';

    if (selectedUnit) {
        if (selectedUnit.type === 'bhk') {
            displayRent = `₹${selectedUnit.data.pricePerUnit}`;
        } else {
            displayRent = `₹${selectedUnit.data.rentAmount}`;
        }
    }

    if (displayRent !== 'Price on Request') {
        const rt = (selectedUnit?.data?.rentType || property.rentType)?.toLowerCase();
        if (rt === 'daywise' || rt === 'daily' || property.dailyRent) period = '/day';
        else if (rt === 'weekly' || property.weeklyRent) period = '/wk';
        else period = '/mo';
    }

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.id = 'razorpay-sdk';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleBooking = async () => {
        if (!auth.currentUser) {
            navigate('/auth');
            return;
        }
        if (!bookingData.phone || !bookingData.name) {
            alert("Please provide valid contact details.");
            return;
        }

        const rawAdvance = selectedUnit?.data?.advancePayment || property.advancePayment || '0';
        const advanceAmount = Number(String(rawAdvance).replace(/[^0-9.]/g, '')) || 0;
        if (advanceAmount <= 0) {
            alert("This property requires an advance payment to confirm the booking. Please contact support.");
            return;
        }

        setIsSubmitting(true);
        const res = await loadRazorpay();

        if (!res) {
            alert('Payment security module failed to load. Please refresh the page.');
            setIsSubmitting(false);
            return;
        }

        try {
            const options = {
                key: "rzp_test_S5fEDvgiK3b2fh", // TEST MODE key
                amount: Math.round(advanceAmount * 100),
                currency: "INR",
                name: "StayZen",
                description: `Advance Payment - ${title}`,
                handler: async function (response) {
                    try {
                        const bookingId = await createBooking({
                            ...bookingData,
                            userId: auth.currentUser.uid,
                            userEmail: auth.currentUser.email,
                            userName: bookingData.name,
                            userPhone: bookingData.phone,
                            propertyId: property.originalId || property.id,
                            propertyName: title,
                            ownerId: property.ownerId || null,
                            rent: displayRent,
                            advance: advanceAmount,
                            unitDetails: selectedUnit ? (selectedUnit.type === 'bhk' ? selectedUnit.data.bhkType : selectedUnit.data.type) : 'Standard',
                            paymentId: response.razorpay_payment_id,
                            status: 'Advance Paid',
                            paymentStatus: 'Completed',
                            paymentMethod: 'Razorpay',
                            paidAt: new Date().toISOString()
                        });

                        setStep(3);
                        notifyAdmin('New Advance Payment & Booking', `${bookingData.name} paid ₹${advanceAmount} for ${title}. Booking ID: ${bookingId}`);
                    } catch (error) {
                        console.error("Booking Creation Error:", error);
                        alert("Payment successful but booking record failed. Please contact support with Payment ID: " + response.razorpay_payment_id);
                    } finally {
                        setIsSubmitting(false);
                    }
                },
                prefill: {
                    name: bookingData.name || auth.currentUser?.displayName || "",
                    email: auth.currentUser?.email || "",
                    contact: bookingData.phone || ""
                },
                theme: { color: "#1aa79c" },
                modal: {
                    ondismiss: function () {
                        setIsSubmitting(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert("Payment Failed: " + response.error.description);
                setIsSubmitting(false);
            });
            rzp.open();
        } catch (error) {
            console.error("Razorpay Error:", error);
            alert("Failed to initialize payment.");
            setIsSubmitting(false);
        }
    };

    const handleFavorite = async () => {
        if (!auth.currentUser) {
            navigate('/auth');
            return;
        }
        await toggleFavorite(auth.currentUser.uid, property);
    };

    return (
        <div className="pd-root">
            {/* Upper Header Navigation */}
            <div className="pd-header-nav">
                <button onClick={() => navigate(-1)} className="back-btn">
                    <ArrowLeft size={20} />
                    <span>Back to Explore</span>
                </button>
                <div className="pd-nav-actions">
                    <button onClick={handleFavorite} className={`action-btn ${isFavorite ? 'fav-active' : ''}`}>
                        <Heart size={20} fill={isFavorite ? "#ef4444" : "none"} color={isFavorite ? "#ef4444" : "currentColor"} />
                    </button>
                    <button className="action-btn"><Share2 size={20} /></button>
                </div>
            </div>

            <div className="pd-container">
                {/* Asymmetric Premium Gallery */}
                <div className="pd-gallery-grid-new">
                    <div className="gallery-main-node" onClick={() => { setViewerIndex(0); setShowFullscreen(true); }}>
                        <img src={images[0]} alt={title} />
                    </div>
                    <div className="gallery-side-nodes">
                        <div className="side-node" onClick={() => { setViewerIndex(1); setShowFullscreen(true); }}>
                            <img src={images[1] || images[0]} alt={title} />
                        </div>
                        <div className="side-node" onClick={() => { setViewerIndex(2); setShowFullscreen(true); }}>
                            <img src={images[2] || images[0]} alt={title} />
                            {images.length > 3 && (
                                <div className="gallery-overlay-count">
                                    <Layers size={24} />
                                    <span>+{images.length - 3} More Photos</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="pd-content-grid">
                    <div className="pd-main-info">
                        <div className="pd-info-card">
                            <div className="type-badge">
                                {property.postType === 'roommate' ? 'Roommate Matching' : property.type}
                            </div>
                            <h1>{title}</h1>
                            <div className="loc-string">
                                <MapPin size={18} />
                                <span>{property.location}</span>
                            </div>

                            <div className="rating-row">
                                <div className="stars">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} fill={i < 4 ? "#f59e0b" : "none"} color="#f59e0b" />
                                    ))}
                                </div>
                                <span className="score">4.8 / 5.0</span>
                                {property.postType === 'roommate' && (
                                    <span className="user-badge" style={{ marginLeft: '10px', fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', color: '#64748b' }}>
                                        Posted by {property.userName}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Unit Selection Section */}
                        {(property.bhkAllocations?.length > 0 || property.roomConfigurations?.length > 0) && (
                            <div className="pd-section unit-selection">
                                <h3>Available Configurations</h3>
                                <div className="unit-chips">
                                    {property.bhkAllocations?.map((alloc, idx) => (
                                        <button
                                            key={`bhk-${idx}`}
                                            className={`unit-chip ${selectedUnit?.type === 'bhk' && selectedUnit?.data?.bhkType === alloc.bhkType ? 'active' : ''}`}
                                            onClick={() => setSelectedUnit({ type: 'bhk', data: alloc })}
                                        >
                                            <div className="chip-header">
                                                <Layers size={14} />
                                                <span>{alloc.bhkType}</span>
                                            </div>
                                            <div className="chip-price">₹{alloc.pricePerUnit}</div>
                                        </button>
                                    ))}
                                    {property.roomConfigurations?.map((conf, idx) => (
                                        <button
                                            key={`room-${idx}`}
                                            className={`unit-chip ${selectedUnit?.type === 'room' && selectedUnit?.data?.type === conf.type ? 'active' : ''}`}
                                            onClick={() => setSelectedUnit({ type: 'room', data: conf })}
                                        >
                                            <div className="chip-header">
                                                <Users size={14} />
                                                <span>{conf.type}</span>
                                            </div>
                                            <div className="chip-price">₹{conf.rentAmount}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {property.postType === 'roommate' ? (
                            <>
                                <div className="pd-section">
                                    <h3>Resident Background</h3>
                                    <div className="amenities-grid">
                                        <div className="amenity-item">
                                            <User size={20} />
                                            <span>{property.posterGender} • {property.posterOccupation || 'Resident'}</span>
                                        </div>
                                        <div className="amenity-item">
                                            <Sparkles size={20} />
                                            <span>Looking for: {property.preferredGender}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pd-section">
                                    <h3>Sharing & Space</h3>
                                    <div className="amenities-grid">
                                        <div className="amenity-item">
                                            <Users size={20} />
                                            <span>{property.sharingType || '2x Sharing'}</span>
                                        </div>
                                        {property.amenities && property.amenities.split(',').map((am, idx) => (
                                            <div className="amenity-item" key={idx}>
                                                <Info size={20} />
                                                <span>{am.trim()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pd-section">
                                    <h3>Ideal Roommate Qualities</h3>
                                    <div className="qualities-box" style={{ background: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px solid #bbf7d0', color: '#166534', fontWeight: '600' }}>
                                        <CheckCircle2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                        {property.qualities || 'Flexible and clean roommate'}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="pd-section">
                                <h3>Infrastructure & Amenities</h3>
                                <div className="amenities-grid">
                                    {property.wifiAvailable === 'Yes' && (
                                        <div className="amenity-item">
                                            <Wifi size={20} />
                                            <span>WiFi Available</span>
                                        </div>
                                    )}
                                    {property.powerBackup === 'Yes' && (
                                        <div className="amenity-item">
                                            <Zap size={20} />
                                            <span>Power Backup</span>
                                        </div>
                                    )}
                                    {property.parkingSpace === 'Yes' && (
                                        <div className="amenity-item">
                                            <Briefcase size={20} />
                                            <span>Parking Space</span>
                                        </div>
                                    )}
                                    {property.waterAvailability === 'Yes' && (
                                        <div className="amenity-item">
                                            <Wind size={20} />
                                            <span>Water Supply</span>
                                        </div>
                                    )}
                                    {property.liftAvailable === 'Yes' && (
                                        <div className="amenity-item">
                                            <Layers size={20} />
                                            <span>Lift Access</span>
                                        </div>
                                    )}
                                    {property.cctvSecurity === 'Yes' && (
                                        <div className="amenity-item">
                                            <Shield size={20} />
                                            <span>CCTV Security</span>
                                        </div>
                                    )}
                                    {property.individualCooking === 'Yes' && (
                                        <div className="amenity-item">
                                            <Coffee size={20} />
                                            <span>Cooking Allowed</span>
                                        </div>
                                    )}
                                    {property.isProvidingAC === 'Yes' && (
                                        <div className="amenity-item">
                                            <Wind size={20} />
                                            <span>AC Room</span>
                                        </div>
                                    )}
                                    <div className="amenity-item">
                                        <Home size={20} />
                                        <span>{property.furnitureProvided || 'Semi-Furnished'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pd-section">
                            <h3>Property Rules & Policies</h3>
                            <div className="policies-stack">
                                <div className="policy-note">
                                    <CheckCircle2 size={18} className="text-pos" />
                                    <span>Advance Payment: {selectedUnit?.data?.advancePayment || property.advancePayment ? `₹${selectedUnit?.data?.advancePayment || property.advancePayment}` : 'Required'}</span>
                                </div>
                                <div className="policy-note">
                                    <CheckCircle2 size={18} className="text-pos" />
                                    <span>Rent Type: {property.rentType || 'Monthly'}</span>
                                </div>
                                <div className="policy-note">
                                    <CheckCircle2 size={18} className="text-pos" />
                                    <span>Notice Period: 1 Month required before vacating</span>
                                </div>
                            </div>
                        </div>

                        <div className="pd-section description">
                            <h3>{property.postType === 'roommate' ? 'Rules & Further Details' : 'About the Property'}</h3>
                            <p>{property.description || property.postDetails || 'Experience premium living at this meticulously managed property. Designed for comfort and convenience, it offers everything a modern resident needs.'}</p>
                        </div>
                    </div>

                    {/* Sticky Sidebar Booking Card */}
                    <div className="pd-sidebar">
                        <div className="sticky-booking-card">
                            <div className="price-header">
                                <div className="price-val">
                                    <span className="big">{displayRent}</span>
                                    <span className="per">{period}</span>
                                </div>
                                <div className={`status-tag ${property.emptyUnits > 0 ? 'available' : 'booked'}`}>
                                    {property.emptyUnits > 0 ? 'Available Now' : 'Fully Booked'}
                                </div>
                            </div>

                            <div className="booking-form-box">
                                {property.postType === 'roommate' ? (
                                    <div className="roommate-action-step">
                                        <div className="avail-info" style={{ background: '#fdf2f2', color: '#991b1b', marginBottom: '20px' }}>
                                            <Info size={16} />
                                            <span>Interested in being a roommate? Send a chat request to {property.userName}.</span>
                                        </div>
                                        <button
                                            className="reserve-btn"
                                            onClick={() => navigate('/roommates', { state: { autoChat: property } })}
                                        >
                                            Request to Chat
                                            <MessageSquare size={20} style={{ marginLeft: '10px' }} />
                                        </button>
                                        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '15px' }}>
                                            Communication is secured and only allowed once they accept your request.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {step === 1 && (
                                            <div className="mobile-price-col">
                                                <span className="m-price">₹{property.price}</span>
                                                <span className="m-per">PER MONTH</span>
                                            </div>
                                        )}
                                        {step === 1 && (
                                            <div className="step-initial">
                                                <p className="form-tip">Zero Brokerage • Quality Assured • Easy Move-in</p>
                                                <div className="avail-info">
                                                    <Info size={16} />
                                                    <span>Reserve your stay at {selectedUnit?.data?.bhkType || selectedUnit?.data?.type || 'this property'}.</span>
                                                </div>
                                                <button
                                                    className={`reserve-btn ${!(property.emptyUnits > 0) ? 'disabled' : ''}`}
                                                    onClick={property.emptyUnits > 0 ? () => {
                                                        if (!auth.currentUser) {
                                                            navigate('/auth');
                                                        } else {
                                                            setStep(2);
                                                        }
                                                    } : null}
                                                >
                                                    {property.emptyUnits > 0 ? 'Book Now' : 'Join Waitlist'}
                                                    <ArrowRight size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {step === 2 && (
                                    <div className="step-form">
                                        <button className="form-close-btn" onClick={() => setStep(1)}><X size={20} /></button>
                                        <h4>Finalize Your Stay</h4>
                                        <div className="input-group">
                                            <label>Your Name</label>
                                            <input
                                                type="text"
                                                placeholder="Enter full name"
                                                value={bookingData.name}
                                                onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Phone Number</label>
                                            <input
                                                type="tel"
                                                placeholder="Mobile number"
                                                value={bookingData.phone}
                                                onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Move-in Date</label>
                                            <input
                                                type="date"
                                                value={bookingData.moveInDate}
                                                onChange={(e) => setBookingData({ ...bookingData, moveInDate: e.target.value })}
                                            />
                                        </div>

                                        <div className="advance-summary">
                                            <div className="adv-row">
                                                <span>Advance Payment</span>
                                                <strong>₹{Number(String(selectedUnit?.data?.advancePayment || property.advancePayment || '0').replace(/[^0-9.]/g, '')) || 0}</strong>
                                            </div>
                                            <p className="adv-note">This amount will be adjusted in your first month's rent/deposit.</p>
                                        </div>

                                        <button className="confirm-btn" onClick={handleBooking} disabled={isSubmitting}>
                                            {isSubmitting ? 'Opening Payment Gateway...' : `Pay ₹${Number(String(selectedUnit?.data?.advancePayment || property.advancePayment || '0').replace(/[^0-9.]/g, '')) || 0} & Book Now`}
                                        </button>
                                        <button className="back-link" onClick={() => setStep(1)}>Changed my mind?</button>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="step-success">
                                        <div className="success-icon"><CheckCircle2 size={48} /></div>
                                        <h4>Booking Confirmed!</h4>
                                        <p>Your payment for <strong>{selectedUnit?.data?.bhkType || selectedUnit?.data?.type || ''}</strong> was successful. We've notified the manager of your stay at <strong>{title}</strong>.</p>
                                        <button className="done-btn" onClick={() => navigate('/bookings')}>View My Bookings</button>
                                    </div>
                                )}
                            </div>

                            <div className="trust-badges">
                                <div className="t-node"><ShieldCheck size={16} /> <span>100% Secure</span></div>
                                <div className="t-node"><Sparkles size={16} /> <span>StayZen Verified</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen Viewer Portal */}
            <AnimatePresence>
                {showFullscreen && (
                    <motion.div
                        className="pd-lightbox-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowFullscreen(false)}
                    >
                        <button className="lb-close" onClick={() => setShowFullscreen(false)}><X size={32} /></button>

                        <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
                            <button className="lb-nav prev" onClick={() => setViewerIndex((prev) => (prev - 1 + images.length) % images.length)}>
                                <ChevronLeft size={40} />
                            </button>

                            <motion.div
                                className="lb-img-container"
                                key={viewerIndex}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", damping: 25 }}
                            >
                                <img src={images[viewerIndex]} alt="Property Large View" />
                            </motion.div>

                            <button className="lb-nav next" onClick={() => setViewerIndex((prev) => (prev + 1) % images.length)}>
                                <ChevronRight size={40} />
                            </button>
                        </div>

                        <div className="lb-counter">
                            {viewerIndex + 1} / {images.length}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PropertyDetails;
