import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import './Footer.css';
import logoImg from '../../assets/logo.jpg';

const Footer = () => {
    return (
        <footer className="footer-root">
            <div className="footer-content">
                <div className="footer-section brand-info">
                    <Link to="/" className="footer-brand">
                        <img src="/logo.svg" className="footer-logo" alt="StayZen" />
                        <span className="brand-main">Stay<span>Zen</span></span>
                    </Link>
                    <p className="footer-desc">
                        Redefining modern living with curated spaces and seamless technology. Your journey to a perfect home starts here.
                    </p>
                    <div className="social-links">
                        <a href="#"><Facebook size={20} /></a>
                        <a href="#"><Twitter size={20} /></a>
                        <a href="#"><Instagram size={20} /></a>
                        <a href="#"><Linkedin size={20} /></a>
                    </div>
                </div>

                <div className="footer-section links-group">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><Link to="/">Explore</Link></li>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/help">Help Center</Link></li>
                        <li><Link to="/auth">Sign In</Link></li>
                    </ul>
                </div>

                <div className="footer-section links-group">
                    <h3>Support</h3>
                    <ul>
                        <li><Link to="/help">Privacy Policy</Link></li>
                        <li><Link to="/help">Terms of Service</Link></li>
                        <li><Link to="/help">Cancellation Policy</Link></li>
                        <li><Link to="/help">Contact Support</Link></li>
                    </ul>
                </div>

                <div className="footer-section contact-info">
                    <h3>Contact Us</h3>
                    <div className="contact-item">
                        <Mail size={18} />
                        <span>support@stayzen.in</span>
                    </div>
                    <div className="contact-item">
                        <Phone size={18} />
                        <span>+91 98765 43210</span>
                    </div>
                    <div className="contact-item">
                        <MapPin size={18} />
                        <span>Hitech City, Hyderabad, India</span>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} StayZen. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
