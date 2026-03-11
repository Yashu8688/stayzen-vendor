import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoArrowForwardOutline, IoStar, IoMenu, IoClose } from 'react-icons/io5';
import { Star, X, MapPin, Phone, Mail, ChevronRight, Play, Layout, Shield, ArrowRight, Home, Users, BarChart3, Clock, Quote, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import PropertyRegistrationModal from './PropertyRegistrationModal';
import { auth } from '../firebase';
import { addProperty } from '../services/dataService';
import './properties.css';
import './landingPage.css';

const LandingPage = ({ onExplore }) => {
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [selectedReview, setSelectedReview] = React.useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false);

    const reviews = [
        { id: 1, name: "Anand Kumar", role: "Apartment Owner", text: "StayZen has transformed how I manage my 12 units. The automation is flawless.", rating: 5 },
        { id: 2, name: "Priya Reddy", role: "PG Manager", text: "Finally, a tool that understands the complexity of PG management. Highly recommended!", rating: 5 },
        { id: 3, name: "Suresh Chennupati", role: "Real Estate Agent", text: "The cleanest UI I've ever seen. My clients love the transparency and speed.", rating: 4 },
        { id: 4, name: "Meera Iyer", role: "Property Developer", text: "The roommate matching feature is a game-changer for our co-living spaces.", rating: 5 },
        { id: 5, name: "Vikram Shah", role: "Hostel Owner", text: "Simple, powerful, and effective. The customer support is top-notch as well.", rating: 5 }
    ];

    React.useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.8 }}
            className="lp-container"
        >
            {/* Animated Background Blobs */}
            <div className="lp-bg-blob lp-blob-1"></div>
            <div className="lp-bg-blob lp-blob-2"></div>
            <div className="lp-bg-blob lp-blob-3"></div>

            <nav className={`lp-nav ${isScrolled ? 'scrolled' : ''}`}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="lp-logo-container"
                >
                    <img src="/logo.svg" alt="StayZen Logo" className="lp-logo-img" />
                    <span className="lp-logo-text">Stay<span>Zen</span></span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="lp-nav-actions"
                >
                    <button onClick={() => onExplore()} className="lp-nav-btn">Sign In</button>
                </motion.div>
            </nav>

            <div className="lp-content">
                <div className="lp-main-grid">
                    <div className="lp-hero-section">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        >
                            <span className="lp-badge">The Smart Way to Manage</span>
                            <h1 className="lp-title">
                                Manage Your Properties <br />
                                With <span className="lp-highlight">Peace of Mind</span>
                            </h1>
                            <div className="lp-property-types">
                                <span>Apartments</span>
                                <div className="lp-dot" />
                                <span>Flats</span>
                                <div className="lp-dot" />
                                <span>PGs & Hostels</span>
                                <div className="lp-dot" />
                                <span>Private Rooms</span>
                            </div>

                            <p className="lp-subtitle">
                                The easy tool for property owners.
                                Handle bookings, collect rent, and manage your property
                                with simple, automated software.
                            </p>

                            <div className="lp-cta-group">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsRegisterModalOpen(true)}
                                    className="lp-primary-btn"
                                >
                                    Enroll Your Property <IoArrowForwardOutline size={20} />
                                </motion.button>

                                <div className="lp-stats">
                                    <div className="lp-stat-item">
                                        <strong>500+</strong>
                                        <span>Properties</span>
                                    </div>
                                    <div className="lp-divider" />
                                    <div className="lp-stat-item">
                                        <strong>10k+</strong>
                                        <span>Tenants</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="lp-side-info">
                        <div className="lp-traveler-scene">
                            {/* The House */}
                            <div className="lp-anim-house">
                                <svg viewBox="0 0 100 100">
                                    <path d="M20 50 L50 20 L80 50 V90 H20 Z" fill="#1aa79c" stroke="#148f85" strokeWidth="2" opacity="0.6" />
                                    <path d="M45 90 V70 H55 V90" fill="#148f85" opacity="0.8" />
                                </svg>
                            </div>

                            {/* The Travelers Loop - Fixed path to enter the house */}
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="lp-traveler"
                                    initial={{ left: "-10%", opacity: 0 }}
                                    animate={{
                                        left: ["-10%", "85%"],
                                        opacity: [0, 1, 1, 0]
                                    }}
                                    transition={{
                                        duration: 12,
                                        repeat: Infinity,
                                        delay: i * 4,
                                        ease: "linear"
                                    }}
                                >
                                    <div className="lp-boy">
                                        <div className="lp-head"></div>
                                        <div className="lp-body"></div>
                                        <div className="lp-trolley"></div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Orbiting Stars moved above for visibility */}
                            <motion.div
                                className="lp-orbit-top"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            >
                                <div className="lp-star s1"></div>
                                <div className="lp-star s2"></div>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                            className="lp-about-block"
                        >
                            <h2>Simple Property Management</h2>
                            <p>
                                StayZen is built to be simple and clear.
                                We believe that managing a property should be as peaceful as living in one.
                                Our system handles all the small details for you so you can focus on
                                your tenants, not just the buildings.
                            </p>
                            <p>
                                From easy money tracking to welcoming new tenants,
                                the StayZen system is designed to be easy to use,
                                and very powerful.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Premium Reviews Marquee - Moved outside for full-width */}
            <section className="lp-reviews-section">
                <div className="lp-reviews-header">
                    <span className="lp-badge">Testimonials</span>
                    <h2>Trust from Leading <span>Property Managers</span></h2>
                </div>

                <div className="lp-reviews-container">
                    <motion.div
                        className="lp-reviews-track"
                        animate={{ x: [0, -1000] }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    >
                        {[...reviews, ...reviews].map((rev, i) => (
                            <div key={i} className="lp-review-card">
                                <div className="rev-quote">
                                    <Quote size={20} fill="var(--lp-primary)" color="var(--lp-primary)" opacity={0.2} />
                                </div>
                                <div className="rev-stars">
                                    {[...Array(rev.rating)].map((_, j) => (
                                        <Star key={j} size={14} fill="#fb6340" color="#fb6340" />
                                    ))}
                                </div>
                                <p className="rev-text">"{rev.text}"</p>
                                <button
                                    className="rev-view-details"
                                    onClick={() => setSelectedReview(rev)}
                                >
                                    View Details
                                </button>
                                <div className="rev-footer">
                                    <div className="rev-avatar">{rev.name.charAt(0)}</div>
                                    <div className="rev-info">
                                        <strong>{rev.name}</strong>
                                        <span>{rev.role}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            <footer className="lp-footer">
                <div className="lp-footer-grid">
                    <div className="lp-footer-brand">
                        <div className="lp-footer-logo">
                            <img src="/logo.svg" alt="StayZen" className="lp-footer-logo-img" />
                            <span>Stay<span>Zen</span></span>
                        </div>
                        <p>
                            Modern property management for the digital age.
                            Simplify your workflow and enhance your tenant experience.
                        </p>
                        <div className="lp-footer-socials">
                            <a href="#" className="lp-social-btn"><Facebook size={18} /></a>
                            <a href="#" className="lp-social-btn"><Twitter size={18} /></a>
                            <a href="#" className="lp-social-btn"><Instagram size={18} /></a>
                            <a href="#" className="lp-social-btn"><Linkedin size={18} /></a>
                        </div>
                    </div>

                    <div className="lp-footer-col">
                        <h4>Platform</h4>
                        <div className="lp-footer-links">
                            <a href="#">Features</a>
                            <a href="#">Pricing</a>
                            <a href="#">Mobile App</a>
                            <a href="#">Success Stories</a>
                        </div>
                    </div>

                    <div className="lp-footer-col">
                        <h4>Support</h4>
                        <div className="lp-footer-links">
                            <a href="#">Help Center</a>
                            <a href="#">Contact Support</a>
                            <a href="#">Security</a>
                            <a href="#">Status</a>
                        </div>
                    </div>

                    <div className="lp-footer-col">
                        <h4>Contact Us</h4>
                        <div className="lp-footer-links">
                            <a href="tel:+919876543210" className="lp-contact-item">
                                <Phone size={16} />
                                <span>+91 98765 43210</span>
                            </a>
                            <a href="mailto:support@stayzen.com" className="lp-contact-item">
                                <Mail size={16} />
                                <span>support@stayzen.com</span>
                            </a>
                            <div className="lp-contact-item">
                                <MapPin size={16} />
                                <span>Hyderabad, TS, India</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lp-footer-bottom">
                    <p>© 2026 StayZen. Simple property management for everyone.</p>
                    <div className="lp-legal-links">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                        <a href="#">Cookies</a>
                    </div>
                </div>
            </footer>

            {/* Premium Review Modal */}
            <AnimatePresence>
                {selectedReview && (
                    <motion.div
                        className="lp-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedReview(null)}
                    >
                        <motion.div
                            className="lp-review-modal"
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="modal-close" onClick={() => setSelectedReview(null)}>
                                <X size={24} />
                            </button>

                            <div className="modal-content">
                                <div className="modal-quote">
                                    <Quote size={40} color="var(--lp-primary)" opacity={0.3} />
                                </div>
                                <div className="modal-stars">
                                    {[...Array(selectedReview.rating)].map((_, j) => (
                                        <Star key={j} size={18} fill="#fb6340" color="#fb6340" />
                                    ))}
                                </div>
                                <p className="modal-text">"{selectedReview.text}"</p>

                                <div className="modal-user-footer">
                                    <div className="modal-avatar">{selectedReview.name.charAt(0)}</div>
                                    <div className="modal-user-info">
                                        <strong>{selectedReview.name}</strong>
                                        <span>{selectedReview.role}</span>
                                    </div>
                                </div>

                                <div className="modal-badges">
                                    <span className="m-badge">Verified User</span>
                                    <span className="m-badge teal">Member since 2024</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reusable Property Registration Modal */}
            <PropertyRegistrationModal
                isOpen={isRegisterModalOpen}
                onClose={() => setIsRegisterModalOpen(false)}
                onComplete={async (data) => {
                    console.log("Registration complete from LP:", data);
                    if (auth.currentUser) {
                        try {
                            await addProperty({ ...data, ownerId: auth.currentUser.uid });
                        } catch (err) {
                            console.error("Error saving property from LP:", err);
                        }
                    } else {
                        localStorage.setItem('pendingPropertyRegistration', JSON.stringify(data));
                    }
                    onExplore('properties');
                }}
            />
        </motion.div>
    );
};

export default LandingPage;
