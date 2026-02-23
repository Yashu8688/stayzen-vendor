import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Search, Send, X, User, Clock } from 'lucide-react';
import { auth } from '../firebase';
import { subscribeToUserChats, subscribeToMessages, sendMessage } from '../services/dataService';
import './Chats.css';

const Chats = () => {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const unsubscribe = subscribeToUserChats(auth.currentUser.uid, (data) => {
            setChats(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (activeChat) {
            const unsubscribe = subscribeToMessages(activeChat.id, (data) => {
                setMessages(data);
            });
            return () => unsubscribe();
        }
    }, [activeChat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;
        try {
            await sendMessage(activeChat.id, {
                text: newMessage,
                senderId: auth.currentUser.uid,
                participants: activeChat.participants
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const getOtherParticipant = (participants) => {
        return participants.find(p => p !== auth.currentUser.uid);
    };

    const filteredChats = chats.filter(chat => {
        const otherId = getOtherParticipant(chat.participants);
        // In a real app, we'd fetch names. For now, we'll use IDs or placeholders.
        return otherId.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="chats-root">
            <div className="chats-container glass-panel">
                <div className="chats-sidebar">
                    <div className="sidebar-header">
                        <h2>Your Chats</h2>
                        <div className="search-vial">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="chats-list">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <div key={i} className="chat-skeleton"></div>)
                        ) : filteredChats.length > 0 ? (
                            filteredChats.map(chat => (
                                <motion.div
                                    key={chat.id}
                                    className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                                    onClick={() => setActiveChat(chat)}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="chat-avatar">
                                        <User size={20} />
                                    </div>
                                    <div className="chat-info">
                                        <div className="chat-info-top">
                                            <span className="participant-name">Resident {getOtherParticipant(chat.participants).slice(0, 5)}</span>
                                            <span className="chat-time">{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                        </div>
                                        <p className="last-msg">{chat.lastMessage || 'No messages yet'}</p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="empty-chats">
                                <MessageSquare size={40} className="empty-icon" />
                                <p>No active protocols found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chat-main">
                    {activeChat ? (
                        <>
                            <div className="chat-header">
                                <div className="header-user">
                                    <div className="chat-avatar mini">
                                        <User size={16} />
                                    </div>
                                    <div className="user-details">
                                        <h3>Resident {getOtherParticipant(activeChat.participants).slice(0, 5)}</h3>
                                        <span className="status">Active Chat Protocol</span>
                                    </div>
                                </div>
                                <button className="close-chat-btn" onClick={() => setActiveChat(null)}><X size={20} /></button>
                            </div>
                            <div className="messages-area">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        className={`msg-wrapper ${msg.senderId === auth.currentUser.uid ? 'sent' : 'received'}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="msg-bubble">
                                            {msg.text}
                                            <span className="msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <form onSubmit={handleSendMessage} className="chat-input-area">
                                <input
                                    type="text"
                                    placeholder="Execute text protocol..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" disabled={!newMessage.trim()}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="no-active-chat">
                            <div className="intel-logo-dim">
                                <img src="/logo.svg" alt="StayZen" />
                            </div>
                            <h3>Secure Messaging Channel</h3>
                            <p>Select a verified resident to initialize communication.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chats;
