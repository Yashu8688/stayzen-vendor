import React from 'react';
import { motion } from 'framer-motion';
import { Info, Shield, Users, Target, Globe, Zap, Award, Star } from 'lucide-react';
import './About.css';

const About = () => {
    const stats = [
        { label: 'Verified Listings', value: '12K+', icon: <Shield className="stat-icon" /> },
        { label: 'Active Users', value: '45K+', icon: <Users className="stat-icon" /> },
        { label: 'Cities Covered', value: '85+', icon: <Globe className="stat-icon" /> },
        { label: 'Booking Success', value: '99.9%', icon: <Zap className="stat-icon" /> }
    ];

    const values = [
        {
            title: 'Trust & Safety',
            description: 'Every property goes through a rigorous 50-point verification check by our security protocols.',
            icon: <Shield size={24} />
        },
        {
            title: 'User Experience',
            description: 'We prioritize a seamless, intuitive interface that makes finding your next home effortless.',
            icon: <Award size={24} />
        },
        {
            title: 'Community First',
            description: 'Building a global ecosystem of happy residents and reliable property owners.',
            icon: <Users size={24} />
        }
    ];

    return (
        <div className="intel-about-container">
            <motion.div
                className="about-hero glass-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="hero-content">
                    <div className="about-badge">
                        <Info size={14} />
                        <span>PROTOCOL: SYSTEM_OVERVIEW</span>
                    </div>
                    <h1>Redefining Modern <span>Living Space</span></h1>
                    <p>StayZen is the next-generation housing ecosystem designed for the modern nomad, the professional, and the student. We bridge the gap between premium comfort and intelligent technology.</p>
                </div>
                <div className="hero-visual">
                    <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=100" alt="Team" />
                    <div className="visual-overlay" />
                </div>
            </motion.div>

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        className="stat-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                    >
                        <div className="stat-header">
                            {stat.icon}
                            <span className="stat-value">{stat.value}</span>
                        </div>
                        <span className="stat-label">{stat.label}</span>
                    </motion.div>
                ))}
            </div>

            <div className="about-section">
                <div className="section-title-box">
                    <Target className="section-icon" />
                    <h2>Our Mission</h2>
                </div>
                <div className="mission-content glass-panel">
                    <p>
                        Our mission is to democratize access to premium living spaces through advanced AI-driven matching and secure transaction protocols. We believe that finding a home should be as easy as booking a flight, with zero compromises on safety or quality.
                    </p>
                </div>
            </div>

            <div className="values-grid">
                {values.map((value, index) => (
                    <motion.div
                        key={index}
                        className="value-card glass-panel"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.6 }}
                    >
                        <div className="value-icon-box">
                            {value.icon}
                        </div>
                        <h3>{value.title}</h3>
                        <p>{value.description}</p>
                    </motion.div>
                ))}
            </div>

            <footer className="about-footer">
                <div className="footer-line" />
                <p>© 2026 StayZen User Cloud. All protocols active.</p>
            </footer>
        </div>
    );
};

export default About;
