import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    MapPin,
    Star,
    Home,
    Wifi,
    Coffee,
    Wind,
    Shield,
    ChevronLeft,
    ChevronRight,
    Users,
    Briefcase,
    Calendar,
    Phone,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    Zap,
    Bell
} from 'lucide-react';
import { createBooking, addPaymentRecord, decrementAvailableUnits, notifyAdmin, notifyUser, requestAvailabilityNotification } from '../services/dataService';
import { auth } from '../firebase';
import './PropertyModal.css';

const PropertyModal = ({ property, onClose }) => {
    const navigate = useNavigate();
    const [currentImg, setCurrentImg] = useState(0);
    const [step, setStep] = useState(1); // 1: Details, 2: Booking Form, 3: Success
    const [bookingData, setBookingData] = useState({
        stayType: 'Bachelor',
        occupation: 'Student',
        gender: 'Male',
        name: auth.currentUser?.displayName || '',
        phone: '',
        moveInDate: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!property) return null;

    // --- Unified Dynamic Data Mapping ---
    const isRoom = (property.propertyType || property.type) === 'Room';
    const title = property.propertyName || property.name || 'Premium Property';

    const rentVal = isRoom ? (property.dailyRent || property.rent || '0') : (property.monthlyRent || property.rent || '0');
    const displayRent = rentVal.toString().includes('₹') ? rentVal : `₹${rentVal}`;
    const periodLabel = isRoom ? 'daily rate' : 'monthly subscription';

    const manager = property.managerName || property.manager || 'StayZen Partner';
    const advance = property.advancePayment || property.advance || 'NA';
    const location = property.location || (property.city ? `${property.city}, ${property.state}` : 'Premium Location');

    // Safety check for images
    const images = property.imageUrls || property.images || [];
    const isAvailable = property.emptyUnits > 0;

    const handleNextImg = (e) => {
        e.stopPropagation();
        if (images.length > 0) {
            setCurrentImg((prev) => (prev + 1) % images.length);
        }
    };

    const handlePrevImg = (e) => {
        e.stopPropagation();
        if (images.length > 0) {
            setCurrentImg((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    const handleInitializeBooking = () => {
        if (!auth.currentUser) {
            alert("Please login to proceed with booking.");
            navigate('/auth');
            return;
        }
        setStep(2);
        notifyAdmin(
            'Booking Initialized',
            `${auth.currentUser?.email || 'A user'} has started the booking process for ${title}.`,
            { propertyId: property.id }
        );
    };

    const handleNotifyMe = async () => {
        if (!auth.currentUser) {
            alert("Please login to request notifications.");
            navigate('/auth');
            return;
        }
        try {
            await requestAvailabilityNotification(auth.currentUser.uid, property.id, title);
            alert("Success! We will notify you and the admin as soon as this property has availability.");
        } catch (error) {
            alert("Failed to register for notifications.");
        }
    };

    const handleBooking = async () => {
        if (!auth.currentUser) {
            alert("Please login to book a stay.");
            return;
        }
        if (!bookingData.phone || !bookingData.name) {
            alert("Please provide both name and contact number");
            return;
        }

        setIsSubmitting(true);
        try {
            const bookingId = await createBooking({
                ...bookingData,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                propertyId: property.id,
                propertyName: title,
                rent: displayRent,
                status: 'Initial'
            });

            setStep(3);
            notifyAdmin(
                'New Booking!',
                `${bookingData.name} has booked ${title}.`,
                { propertyId: property.id, bookingId }
            );
        } catch (error) {
            console.error(error);
            alert("Booking failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            className="pm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="pm-content-wrapper"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ willChange: 'transform' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Floating Absolute Controls */}
                <div className="pm-close-circle" onClick={onClose}>
                    <X size={24} />
                </div>

                <div className="pm-dual-container">
                    {/* --- LEFT SIDE: THE CINEMATIC --- */}
                    <div className="pm-visual-side">
                        <div className="pm-main-cinematic">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentImg}
                                    style={{ width: '100%', height: '100%', position: 'relative' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div
                                        className="pm-stage-bg-blur"
                                        style={{ backgroundImage: `url(${images[currentImg] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000'})` }}
                                    />
                                    <img
                                        src={images[currentImg] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000'}
                                        alt="Property Stage"
                                        className="pm-stage-img"
                                    />
                                </motion.div>
                            </AnimatePresence>
                            <div className="pm-stage-overlay"></div>
                            <div className="pm-img-count">
                                {currentImg + 1} / {images.length || 1}
                            </div>

                            {images.length > 1 && (
                                <div className="pm-nav-ctrls">
                                    <button className="pm-nav-btn" onClick={handlePrevImg}><ChevronLeft size={24} /></button>
                                    <button className="pm-nav-btn" onClick={handleNextImg}><ChevronRight size={24} /></button>
                                </div>
                            )}

                            <div className="pm-thumb-reel">
                                {images.map((img, i) => (
                                    <motion.div
                                        key={i}
                                        className={`pm-mini-thumb ${currentImg === i ? 'active' : ''}`}
                                        onClick={() => setCurrentImg(i)}
                                        whileHover={{ y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <img src={img} alt={`Slide ${i}`} />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT SIDE: THE CONTENT --- */}
                    <div className="pm-info-side">
                        {step === 1 && (
                            <>
                                <div className="pm-header-box">
                                    <span className="pm-type-tag">{property.type}</span>
                                    <h1 className="pm-main-title">{title}</h1>
                                    <div className="pm-loc-text">
                                        <MapPin size={18} />
                                        <span>{location}</span>
                                    </div>
                                </div>

                                <div className="pm-price-vial">
                                    <div className="pm-amount-box">
                                        <label>{isRoom ? 'Daily Rate' : 'Monthly Subscription'}</label>
                                        <div className="pm-val">{displayRent}</div>
                                    </div>
                                    <div className="pm-live-badge">
                                        <div className="pm-pulse-dot"></div>
                                        <span>Live Feed</span>
                                    </div>
                                </div>

                                <div className="pm-bento-stats">
                                    <div className="pm-bento-item">
                                        <label>Layout / Type</label>
                                        <b style={{ color: 'var(--pp-primary)' }}>
                                            {(() => {
                                                const val = property.unitType || property.flatType || property.roomType || (property.features && (property.features.flatType || property.features.roomType)) || '';
                                                const str = String(val).trim();
                                                return (str && str.toLowerCase() !== 'true') ? str : (property.type === 'Apartment' ? '1BHK' : 'Standard');
                                            })()}
                                        </b>
                                    </div>
                                    <div className="pm-bento-item">
                                        <label>Availability</label>
                                        <b style={{ color: isAvailable ? '#10b981' : '#ef4444' }}>
                                            {isAvailable ? `${property.emptyUnits} Vacant` : 'Waitlisted'}
                                        </b>
                                    </div>
                                    <div className="pm-bento-item">
                                        <label>Furniture</label>
                                        <b>{property.furnitureProvided || 'Semi-Furnished'}</b>
                                    </div>
                                    <div className="pm-bento-item">
                                        <label>Advance Payment</label>
                                        <b>{advance}</b>
                                    </div>
                                </div>

                                <div className="pm-section-head">
                                    <h4>Living Infrastructure</h4>
                                    <div className="pm-line"></div>
                                </div>

                                <div className="pm-amenity-stack">
                                    {property.liftAvailable === 'Yes' && (
                                        <div className="pm-luxury-badge"><Zap size={18} /> High-speed Lift</div>
                                    )}
                                    {property.parkingSpace === 'Yes' && (
                                        <div className="pm-luxury-badge"><Briefcase size={18} /> Secured Parking</div>
                                    )}
                                    {property.powerBackup === 'Yes' && (
                                        <div className="pm-luxury-badge"><Zap size={18} /> 24/7 Power</div>
                                    )}
                                    {property.waterAvailability === 'Yes' && (
                                        <div className="pm-luxury-badge"><Wind size={18} /> Soft Water</div>
                                    )}
                                    {property.wifiAvailable === 'Yes' && (
                                        <div className="pm-luxury-badge"><Wifi size={18} /> Fiber WiFi</div>
                                    )}
                                    {property.isProvidingAC === 'Yes' && property.type !== 'Apartment' && (
                                        <div className="pm-luxury-badge"><Wind size={18} /> Air Conditioning</div>
                                    )}
                                    {property.individualCooking === 'Yes' && property.type !== 'Apartment' && (
                                        <div className="pm-luxury-badge"><Coffee size={18} /> Private Kitchen</div>
                                    )}
                                </div>

                                <div className="pm-section-head">
                                    <h4>Facility Manager</h4>
                                    <div className="pm-line"></div>
                                </div>

                                <div className="pm-host-strip">
                                    <div className="pm-host-avatar">{manager?.[0]}</div>
                                    <div className="pm-host-info">
                                        <b>{manager}</b>
                                        <span>StayZen Verified Partner</span>
                                    </div>
                                </div>

                                <div className="pm-action-footer">
                                    <button
                                        className={`pm-prime-btn ${!isAvailable ? 'waitlist' : ''}`}
                                        onClick={isAvailable ? handleInitializeBooking : handleNotifyMe}
                                    >
                                        {isAvailable ? 'Book Now' : 'Join the Waitlist'}
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <motion.div
                                className="pm-form-vial"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <div className="pm-header-box">
                                    <h2 className="pm-main-title">Complete Reservation</h2>
                                    <p className="pm-loc-text">Provide details to sync your residency protocol.</p>
                                </div>

                                <div className="pm-input-slab">
                                    <label>Full Identity</label>
                                    <input
                                        type="text"
                                        placeholder="Legal Name"
                                        value={bookingData.name}
                                        onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                                    />
                                </div>

                                <div className="pm-input-slab">
                                    <label>Active Contact</label>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={bookingData.phone}
                                        onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="pm-input-slab">
                                    <label>Proposed Move-in</label>
                                    <input
                                        type="date"
                                        value={bookingData.moveInDate}
                                        onChange={(e) => setBookingData({ ...bookingData, moveInDate: e.target.value })}
                                    />
                                </div>

                                <div className="pm-action-footer">
                                    <button
                                        className="pm-prime-btn"
                                        onClick={handleBooking}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Synchronizing...' : `Finalize & Pay ${advance}`}
                                    </button>
                                    <button
                                        className="pm-back-btn"
                                        onClick={() => setStep(1)}
                                        style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', marginTop: '12px', cursor: 'pointer', fontWeight: '800' }}
                                    >
                                        RETURN TO DETAILS
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                className="pm-success-node"
                                style={{ textAlign: 'center', padding: '100px 0' }}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                <div className="pm-success-piston">
                                    <CheckCircle2 size={80} color="#10b981" />
                                </div>
                                <h1 className="pm-main-title">Reservation Active</h1>
                                <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', marginBottom: '40px' }}>
                                    Your protocol for <b>{title}</b> has been broadcast to the network. The manager will synchronize with you shortly.
                                </p>
                                <button className="pm-prime-btn" onClick={() => { onClose(); navigate('/bookings'); }}>
                                    GO TO DASHBOARD
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PropertyModal;
