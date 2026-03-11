import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Search, Send, X, User, Clock, Menu, MoreVertical, Trash2, AlertTriangle, ChevronLeft } from 'lucide-react';
import { auth } from '../firebase';
import { subscribeToUserChats, subscribeToMessages, sendMessage, clearChatHistory, reportChatProtocol } from '../services/dataService';
import './Chats.css';

const Chats = () => {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) return;
        const unsubscribe = subscribeToUserChats(auth.currentUser.uid, (data) => {
            setChats(data);
            setLoading(false);

            // Re-sync active chat if it's open to refresh names/data
            if (activeChat) {
                const updated = data.find(c => c.id === activeChat.id);
                if (updated) setActiveChat(updated);
            }
        });
        return () => unsubscribe();
    }, [activeChat?.id]);

    useEffect(() => {
        if (activeChat) {
            const unsubscribe = subscribeToMessages(activeChat.id, (data) => {
                setMessages(data);
            });
            return () => unsubscribe();
        }
    }, [activeChat?.id]);

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

    const handleClearChat = async () => {
        if (!activeChat || !window.confirm("Are you sure you want to clear this chat history?")) return;
        try {
            await clearChatHistory(activeChat.id);
            setShowMenu(false);
        } catch (error) {
            alert("Clear protocol failed. Try again.");
        }
    };

    const handleReport = async () => {
        if (!activeChat) return;
        const reason = window.prompt("Reason for reporting this user to Admin:");
        if (!reason) return;
        try {
            await reportChatProtocol({
                chatId: activeChat.id,
                reportedBy: auth.currentUser.uid,
                reporterName: auth.currentUser.displayName || auth.currentUser.email,
                targetUserId: getOtherParticipant(activeChat.participants),
                reason: reason
            });
            alert("Report sent to StayZen Admin. We will investigate.");
            setShowMenu(false);
        } catch (error) {
            alert("Report delivery failed.");
        }
    };

    const getOtherParticipant = (participants) => {
        return participants.find(p => p !== auth.currentUser.uid);
    };

    const getParticipantName = (chat) => {
        const otherId = getOtherParticipant(chat.participants);
        return chat.participantNames?.[otherId] || `Resident ${otherId.slice(0, 5)}`;
    };

    const filteredChats = chats.filter(chat => {
        const name = getParticipantName(chat);
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="chats-root">
            <div className={`chats-container glass-panel ${activeChat ? 'has-active-chat' : ''}`}>
                <div className={`chats-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
                                    onClick={() => {
                                        setActiveChat(chat);
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="chat-avatar">
                                        <User size={20} />
                                    </div>
                                    <div className="chat-info">
                                        <div className="chat-info-top">
                                            <span className="participant-name">{getParticipantName(chat)}</span>
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

                <div className="chat-main" onClick={() => {
                    if (window.innerWidth < 768 && sidebarOpen) setSidebarOpen(false);
                    if (showMenu) setShowMenu(false);
                }}>
                    {activeChat ? (
                        <>
                            <div className="chat-header">
                                <div className="header-user">
                                    <button className="mobile-back-btn" onClick={() => { setActiveChat(null); setSidebarOpen(true); }}><ChevronLeft size={24} /></button>
                                    <div className="chat-avatar mini">
                                        <User size={16} />
                                    </div>
                                    <div className="user-details">
                                        <h3>{getParticipantName(activeChat)}</h3>
                                        <span className="status">Active Secure Channel</span>
                                    </div>
                                </div>
                                <div className="header-actions">
                                    <button className="chat-menu-trigger" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
                                        <MoreVertical size={20} />
                                    </button>
                                    <AnimatePresence>
                                        {showMenu && (
                                            <motion.div
                                                className="chat-menu-dropdown"
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                <button className="menu-item" onClick={handleClearChat}>
                                                    <Trash2 size={16} /> <span>Clear History</span>
                                                </button>
                                                <button className="menu-item danger" onClick={handleReport}>
                                                    <AlertTriangle size={16} /> <span>Report Resident</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
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
                                {messages.length === 0 && (
                                    <div className="empty-messages">
                                        <MessageSquare size={32} />
                                        <p>Secure protocol established. Start your conversation.</p>
                                    </div>
                                )}
                            </div>
                            <form onSubmit={handleSendMessage} className="chat-input-area">
                                <input
                                    type="text"
                                    placeholder="Enter encrypted message..."
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
