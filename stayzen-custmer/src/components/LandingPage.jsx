import React from 'react';
import { motion } from 'framer-motion';
import { IoArrowForwardOutline } from 'react-icons/io5';
import './landingPage.css';

const LandingPage = ({ onExplore }) => {
    const [isScrolled, setIsScrolled] = React.useState(false);

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
                    <button onClick={onExplore} className="lp-nav-btn">Sign In</button>
                </motion.div>
            </nav>

            <main className="lp-content">
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
                                    onClick={onExplore}
                                    className="lp-primary-btn"
                                >
                                    Explore Workspace <IoArrowForwardOutline size={20} />
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

                            {/* The Travelers Loop */}
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="lp-traveler"
                                    initial={{ left: "-20%", opacity: 0 }}
                                    animate={{
                                        left: ["-20%", "85%"],
                                        opacity: [0, 1, 1, 0]
                                    }}
                                    transition={{
                                        duration: 8,
                                        repeat: Infinity,
                                        delay: i * 3,
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
            </main>

            <footer className="lp-footer">
                <p>© 2026 StayZen. Simple property management for everyone.</p>
            </footer>
        </motion.div>
    );
};

export default LandingPage;
