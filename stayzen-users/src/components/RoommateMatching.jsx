import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, MessageSquare, Plus, X, Send, User, MapPin, Briefcase, Sparkles } from 'lucide-react';
import { auth } from '../firebase';
import {
    subscribeToRoommateRequests,
    createRoommateRequest,
    subscribeToMessages,
    sendMessage,
    findOrCreateChat,
    subscribeToUserBookings,
    POSTS_COLLECTION
} from '../services/dataService';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import './RoommateMatching.css';

export default function RoommateMatching() {
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeBookings, setActiveBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state for new request
    const [formData, setFormData] = useState({
        bookingId: '',
        qualities: '',
        sharingType: '2x Sharing',
        description: ''
    });

    useEffect(() => {
        const unsubscribe = subscribeToRoommateRequests((data) => {
            setRequests(data);
            setLoading(false);
        });

        let unsubscribeBookings = () => { };
        if (auth.currentUser) {
            unsubscribeBookings = subscribeToUserBookings(auth.currentUser.uid, (data) => {
                const confirmed = data.filter(b =>
                    b.status === 'Booked' || b.status === 'Confirmed' || b.status === 'Completed'
                );
                setActiveBookings(confirmed);
            });
        }

        return () => {
            unsubscribe();
            unsubscribeBookings();
        };
    }, []);

    useEffect(() => {
        if (activeChat) {
            const unsubscribe = subscribeToMessages(activeChat, (data) => {
                setMessages(data);
            });
            return () => unsubscribe();
        }
    }, [activeChat]);

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        if (!formData.bookingId) {
            alert("Please select your current property.");
            return;
        }

        const selectedBooking = activeBookings.find(b => b.id === formData.bookingId);

        try {
            const requestData = {
                ...formData,
                propertyName: selectedBooking.propertyName,
                location: selectedBooking.location,
                rent: selectedBooking.rent || selectedBooking.price,
                propertyImage: selectedBooking.image,
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                userEmail: auth.currentUser.email,
                type: 'Roommate Matching',
                createdAt: new Date().toISOString()
            };

            // Save to roommate requests
            await createRoommateRequest(requestData);

            // Also save to posts for Explore page visibility
            await addDoc(collection(db, POSTS_COLLECTION), {
                ...requestData,
                name: `Roommate @ ${selectedBooking.propertyName}`,
                postType: 'roommate'
            });

            setIsCreateModalOpen(false);
            setFormData({ bookingId: '', qualities: '', sharingType: '2x Sharing', description: '' });
            alert("Roommate request posted successfully!");
        } catch (error) {
            console.error("Error creating request:", error);
            alert("Failed to post request.");
        }
    };

    const handleStartChat = async (targetUserId, targetUserName) => {
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
            await sendMessage(activeChat, auth.currentUser.uid, newMessage);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const filteredRequests = requests.filter(req =>
        (req.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.propertyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.userName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="rm-container">
            <header className="rm-header">
                <div className="rm-header-content">
                    <h1>Residency Network</h1>
                    <p>Connect with verified residents in your building or area.</p>
                </div>
                {activeBookings.length > 0 && (
                    <button className="rm-create-btn" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={20} />
                        <span>Find a Roommate</span>
                    </button>
                )}
            </header>

            <div className="rm-search-bar">
                <Search size={20} />
                <input
                    type="text"
                    placeholder="Search by city, area, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="rm-grid">
                {filteredRequests.map((req) => (
                    <motion.div
                        key={req.id}
                        className="rm-card glass-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="rm-card-header">
                            <div className="rm-avatar">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.userEmail}`} alt={req.userName} />
                            </div>
                            <div className="rm-user-info">
                                <h3>{req.userName}</h3>
                                <div className="rm-meta">
                                    <MapPin size={14} />
                                    <span>{req.location}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rm-details">
                            <div className="rm-detail-item">
                                <Users size={16} />
                                <span>{req.sharingType}</span>
                            </div>
                            <div className="rm-detail-item">
                                <Sparkles size={16} />
                                <span className="rm-qualities">{req.qualities}</span>
                            </div>
                            <div className="rm-budget">
                                {req.rent}
                            </div>
                        </div>

                        <p className="rm-property-name">@ {req.propertyName}</p>
                        <p className="rm-description">{req.description}</p>

                        <div className="rm-footer">
                            <button
                                className="rm-chat-btn"
                                onClick={() => handleStartChat(req.userId, req.userName)}
                                disabled={req.userId === auth.currentUser.uid}
                            >
                                <MessageSquare size={18} />
                                <span>{req.userId === auth.currentUser.uid ? 'Your Request' : 'Chat Now'}</span>
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Create Request Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="rm-modal-overlay">
                        <motion.div
                            className="rm-modal glass-panel"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="rm-modal-header">
                                <h2>Looking for a Roommate?</h2>
                                <button onClick={() => setIsCreateModalOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateRequest} className="rm-form">
                                <div className="rm-form-grid">
                                    <div className="rm-form-group">
                                        <label>Select Your Property</label>
                                        <select
                                            required
                                            value={formData.bookingId}
                                            onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                                        >
                                            <option value="">Select an active stay...</option>
                                            {activeBookings.map(b => (
                                                <option key={b.id} value={b.id}>{b.propertyName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="rm-form-group">
                                        <label>Sharing Format</label>
                                        <select
                                            value={formData.sharingType}
                                            onChange={(e) => setFormData({ ...formData, sharingType: e.target.value })}
                                        >
                                            <option value="1x Single">1x Private Room</option>
                                            <option value="2x Sharing">2x Sharing</option>
                                            <option value="3x Sharing">3x Sharing</option>
                                            <option value="4x Sharing">4x Sharing</option>
                                        </select>
                                    </div>
                                    <div className="rm-form-group full-width">
                                        <label>Roommate Qualities</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Non-smoker, Professional, Clean habits"
                                            value={formData.qualities}
                                            onChange={(e) => setFormData({ ...formData, qualities: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="rm-form-group">
                                    <label>Further Details</label>
                                    <textarea
                                        rows="4"
                                        placeholder="Add any additional context or rules..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>
                                <button type="submit" className="rm-submit-btn">Broadcast Request</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Chat Overlay */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        className="rm-chat-window glass-panel"
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                    >
                        <div className="rm-chat-header">
                            <div className="rm-chat-user">
                                <MessageSquare size={18} />
                                <span>Roommate Chat</span>
                            </div>
                            <button onClick={() => setIsChatOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="rm-messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`rm-msg ${msg.senderId === auth.currentUser.uid ? 'sent' : 'received'}`}>
                                    <div className="rm-msg-bubble">
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="rm-chat-input">
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
        </div>
    );
}
