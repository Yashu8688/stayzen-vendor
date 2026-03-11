import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, MapPin, Star, Home, Wifi, Coffee, Wind, Shield,
    ChevronLeft, ChevronRight, Users, Briefcase, Calendar,
    Phone, CheckCircle2, Sparkles, ArrowRight, Zap, Bell
} from 'lucide-react';
import { createBooking, notifyAdmin, requestAvailabilityNotification } from '../services/dataService';
import { auth } from '../firebase';
import './PropertyModal.css';

const PropertyModal = ({ property, onClose }) => {
    const navigate = useNavigate();
    const [currentImg, setCurrentImg] = useState(0);
    const [step, setStep] = useState(1);
    const [bookingData, setBookingData] = useState({
        name: auth.currentUser?.displayName || '',
        phone: '',
        moveInDate: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!property) return null;

    const title = property.propertyName || property.name || 'Premium Property';
    const isRoom = (property.propertyType || property.type)?.toLowerCase().includes('room');
    const displayRent = property.rent || 'Price on Request';
    const location = property.location || (property.city ? `${property.city}, ${property.state}` : 'Premium Location');
    const images = property.imageUrls || property.images || [];
    const isAvailable = property.emptyUnits > 0;

    let period = '';
    if (displayRent !== 'Price on Request') {
        const rt = property.rentType?.toLowerCase();
        if (rt === 'daywise' || rt === 'daily' || property.dailyRent) period = '/day';
        else if (rt === 'weekly' || property.weeklyRent) period = '/wk';
        else period = '/mo';
    }

    const handleInitializeBooking = () => {
        if (!auth.currentUser) {
            navigate('/auth');
            return;
        }
        setStep(2);
    };

    const handleBooking = async () => {
        if (!bookingData.phone || !bookingData.name) {
            alert("Please provide valid contact details.");
            return;
        }

        setIsSubmitting(true);
        try {
            await createBooking({
                ...bookingData,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                propertyId: property.id,
                propertyName: title,
                rent: displayRent,
                status: 'Initial'
            });
            setStep(3);
            notifyAdmin('New Booking Interest', `${bookingData.name} is interested in ${title}.`);
        } catch (error) {
            alert("Connection error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div className="hq-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
            <motion.div
                className="hq-modal-content"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="hq-close-btn" onClick={onClose}><X size={24} /></button>

                <div className="hq-modal-grid">
                    <div className="hq-visual-panel">
                        <div className="hq-stage">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={currentImg}
                                    src={images[currentImg] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000'}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                />
                            </AnimatePresence>
                            <div className="hq-stage-nav">
                                <button onClick={() => setCurrentImg((prev) => (prev - 1 + images.length) % images.length)}><ChevronLeft /></button>
                                <button onClick={() => setCurrentImg((prev) => (prev + 1) % images.length)}><ChevronRight /></button>
                            </div>
                        </div>
                        <div className="hq-thumb-grid">
                            {images.map((img, i) => (
                                <div key={i} className={`hq-thumb ${i === currentImg ? 'active' : ''}`} onClick={() => setCurrentImg(i)}>
                                    <img src={img} alt="Thumbnail" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hq-info-panel">
                        {step === 1 && (
                            <>
                                <div className="hq-info-header">
                                    <span className="hq-cat-tag">{property.type}</span>
                                    <h1>{title}</h1>
                                    <div className="hq-loc-vial">
                                        <MapPin size={16} />
                                        <span>{location}</span>
                                    </div>
                                </div>

                                <div className="hq-price-card">
                                    <div className="price-info">
                                        <label>Rent Amount</label>
                                        <span className="val">{displayRent} <small style={{ fontSize: '14px', fontWeight: 'normal' }}>{period}</small></span>
                                    </div>
                                    <div className="status-pill">
                                        <div className="dot" />
                                        <span>Live Listing</span>
                                    </div>
                                </div>

                                <div className="hq-specs-box">
                                    <div className="spec-node">
                                        <label>Availability</label>
                                        <span className={isAvailable ? 'text-pos' : 'text-neg'}>
                                            {isAvailable ? `${property.emptyUnits} Units Left` : 'Fully Booked'}
                                        </span>
                                    </div>
                                    <div className="spec-node">
                                        <label>Advance</label>
                                        <span>{property.advancePayment ? `₹${property.advancePayment}` : '1 Month'}</span>
                                    </div>
                                </div>

                                <div className="hq-amenities">
                                    <h3>Infrastructure & Amenities</h3>
                                    <div className="hq-badge-grid">
                                        {property.wifiAvailable === 'Yes' && <div className="hq-badge"><Wifi size={14} /> WiFi</div>}
                                        {property.powerBackup === 'Yes' && <div className="hq-badge"><Zap size={14} /> Power</div>}
                                        {property.parkingSpace === 'Yes' && <div className="hq-badge"><Briefcase size={14} /> Parking</div>}
                                        {property.waterAvailability === 'Yes' && <div className="hq-badge"><Wind size={14} /> Water</div>}
                                        {property.liftAvailable === 'Yes' && <div className="hq-badge"><Layers size={14} /> Lift Access</div>}
                                        {property.cctvSecurity === 'Yes' && <div className="hq-badge"><Shield size={14} /> Security</div>}
                                        {property.individualCooking === 'Yes' && <div className="hq-badge"><Coffee size={14} /> Cooking</div>}
                                        {property.isProvidingAC === 'Yes' && <div className="hq-badge"><Wind size={14} /> AC</div>}
                                        <div className="hq-badge"><Home size={14} /> {property.furnitureProvided || 'Semi-Furnished'}</div>
                                    </div>
                                </div>

                                <div className="hq-footer-actions">
                                    <button
                                        className={`hq-prime-btn ${!isAvailable ? 'disabled' : ''}`}
                                        onClick={isAvailable ? handleInitializeBooking : () => alert('Waitlist active.')}
                                    >
                                        {isAvailable ? 'Secure this Space' : 'Join Waitlist'}
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <div className="hq-booking-flow">
                                <h2>Secure Your Residency</h2>
                                <p>Confirm your details to finalize the reservation.</p>
                                <div className="hq-input-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={bookingData.name}
                                        onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                                    />
                                </div>
                                <div className="hq-input-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={bookingData.phone}
                                        onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="hq-footer-actions">
                                    <button className="hq-prime-btn" onClick={handleBooking} disabled={isSubmitting}>
                                        {isSubmitting ? 'Processing...' : 'Complete Booking'}
                                    </button>
                                    <button className="hq-alt-btn" onClick={() => setStep(1)}>Back to Details</button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="hq-success-view">
                                <CheckCircle2 size={64} className="text-pos" />
                                <h2>Request Received</h2>
                                <p>Our residency team will coordinate with you shortly regarding <b>{title}</b>.</p>
                                <button className="hq-prime-btn" onClick={onClose}>Finish</button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PropertyModal;
