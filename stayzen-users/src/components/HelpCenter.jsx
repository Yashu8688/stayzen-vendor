import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    MessageCircle,
    Phone,
    Mail,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    HelpCircle,
    Info,
    ShieldCheck,
    MessageSquareText,
    Zap,
    LifeBuoy
} from 'lucide-react';
import { getSupportSettings, subscribeToFaqs } from '../services/dataService';
import './HelpCenter.css';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`intel-faq-item ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
            <div className="faq-trigger">
                <span className="faq-q">{question}</span>
                <div className="faq-icon-vial">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="faq-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="faq-inner">
                            <p>{answer}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const HelpCenter = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [faqs, setFaqs] = useState([]);
    const [supportInfo, setSupportInfo] = useState({
        countryCode: '91',
        whatsappNumber: '9876543210',
        supportEmail: 'support@stayzen.in'
    });

    useEffect(() => {
        // Fetch Support Settings
        const fetchSettings = async () => {
            const settings = await getSupportSettings();
            if (settings) {
                setSupportInfo({
                    countryCode: settings.countryCode || '91',
                    whatsappNumber: settings.whatsappNumber || '9876543210',
                    supportEmail: settings.supportEmail || 'support@stayzen.in'
                });
            }
        };

        // Subscribe to FAQs
        const unsubscribeFaqs = subscribeToFaqs((data) => {
            if (data && data.length > 0) {
                setFaqs(data);
            } else {
                // Fallback to defaults if none in DB
                setFaqs([
                    {
                        question: "How do I book a stay on StayZen?",
                        answer: "Simply browse properties on your dashboard, click on 'View Details', and then the 'Book This Stay' button."
                    },
                    {
                        question: "What is the advance payment for?",
                        answer: "The advance payment is a security deposit that confirms your booking."
                    }
                ]);
            }
        });

        fetchSettings();
        return () => unsubscribeFaqs();
    }, []);

    const filteredFaqs = faqs.filter(f =>
        f.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleWhatsAppSupport = () => {
        const message = encodeURIComponent("Hi StayZen Support, I need help with my booking.");
        window.open(`https://wa.me/${supportInfo.countryCode}${supportInfo.whatsappNumber}?text=${message}`, '_blank');
    };

    return (
        <div className="intel-help-view animated-view">
            <header className="intel-help-header">
                <div className="header-meta">
                    <div className="meta-pill">
                        <LifeBuoy size={14} />
                        <span>24/7 Global Support</span>
                    </div>
                </div>
                <h1 className="intel-help-title">Operational <span className="gradient-glow">Support.</span></h1>
                <p className="intel-help-subtitle">Search our knowledge base or initiate a direct communication protocol with our team.</p>

                <div className="intel-help-search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search for solutions, documentation, or protocols..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className="intel-help-grid">
                <section className="intel-faq-manifest">
                    <div className="manifest-header">
                        <div className="indicator">FAQ</div>
                        <h2>Knowledge Base</h2>
                    </div>
                    <div className="faq-list">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((faq, i) => (
                                <FAQItem key={i} {...faq} />
                            ))
                        ) : (
                            <div className="intel-empty-state mini">No documents matched your criteria.</div>
                        )}
                    </div>
                </section>

                <aside className="intel-contact-sidebar">
                    <div className="intel-contact-card primary">
                        <div className="card-top">
                            <div className="icon-vial"><MessageSquareText size={24} /></div>
                            <div className="status-dot"></div>
                        </div>
                        <h3>Real-time Assistance</h3>
                        <p>Initiate an encrypted WhatsApp session with our support engineers.</p>
                        <button className="intel-btn-primary" onClick={handleWhatsAppSupport}>
                            <Zap size={18} />
                            <span>Start Mission</span>
                        </button>
                    </div>

                    <div className="intel-contact-group">
                        <div className="intel-contact-item">
                            <div className="item-icon"><Phone size={18} /></div>
                            <div className="item-info">
                                <span>Voice Liaison</span>
                                <a href={`tel:+${supportInfo.countryCode}${supportInfo.whatsappNumber}`}>+{supportInfo.countryCode} {supportInfo.whatsappNumber}</a>
                            </div>
                        </div>
                        <div className="intel-contact-item">
                            <div className="item-icon"><Mail size={18} /></div>
                            <div className="item-info">
                                <span>Digital Correspondence</span>
                                <a href={`mailto:${supportInfo.supportEmail}`}>{supportInfo.supportEmail}</a>
                            </div>
                        </div>
                    </div>

                    <div className="intel-protection-box">
                        <div className="protection-header">
                            <ShieldCheck size={20} className="shield-icon" />
                            <span>StayZen Protection</span>
                        </div>
                        <p>Every operational stay is protected by our Tier-1 safety guarantee and verified insurance protocols.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default HelpCenter;
