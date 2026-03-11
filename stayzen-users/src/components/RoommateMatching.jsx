import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, MessageSquare, Plus, X, Send, User, MapPin, Briefcase, Sparkles,
    Shield, Home, Check, Play, Clock, Camera, Image as ImageIcon, Trash2
} from 'lucide-react';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    subscribeToRoommateRequests,
    createRoommateRequest,
    updateRoommateRequest,
    deleteRoommateRequest,
    subscribeToMessages,
    sendMessage,
    findOrCreateChat,
    subscribeToUserBookings,
    POSTS_COLLECTION,
    triggerEmailProtocol
} from '../services/dataService';
import './RoommateMatching.css';

export default function RoommateMatching() {
    const navigate = useNavigate();
    const location = useLocation();
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeBookings, setActiveBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        bookingId: 'manual',
        propertyName: '',
        location: '',
        qualities: '',
        sharingType: '2x Sharing',
        description: '',
        rent: '',
        amenities: '',
        images: [],
        posterGender: 'Male',
        posterOccupation: '',
        preferredGender: 'Any',
        phoneNumber: '',
        realName: ''
    });

    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [activeTab, setActiveTab] = useState('browse');
    const [chatRequests, setChatRequests] = useState([]);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [editingRequestId, setEditingRequestId] = useState(null);

    useEffect(() => {
        const unsubscribe = subscribeToRoommateRequests((data) => {
            setRequests(data);
            setLoading(false);
        });

        let unsubscribeChatRequests = () => { };
        let unsubscribeBookings = () => { };
        if (auth.currentUser) {
            const q = query(
                collection(db, "chat_requests"),
                where("targetUserId", "==", auth.currentUser.uid),
                where("status", "==", "pending")
            );
            unsubscribeChatRequests = onSnapshot(q, (snapshot) => {
                setChatRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

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
            unsubscribeChatRequests();
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown && !event.target.closest('.premium-select-container')) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdown]);

    useEffect(() => {
        if (location.state?.autoChat && !loading && requests.length > 0) {
            const req = requests.find(r => r.userId === location.state.autoChat.userId);
            if (req) {
                handleRequestChat(req);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, loading, requests]);

    useEffect(() => {
        if (activeChat) {
            const unsubscribe = subscribeToMessages(activeChat, (data) => {
                setMessages(data);
            });
            return () => unsubscribe();
        }
    }, [activeChat]);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedFiles.length > 5) {
            alert("Maximum 5 images allowed.");
            return;
        }
        setSelectedFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        const isStayZenBooking = formData.bookingId !== 'manual';
        if (isStayZenBooking && !formData.bookingId) return alert("Please select stay.");
        if (!isStayZenBooking && (!formData.propertyName || !formData.location)) return alert("Enter details.");
        if (!formData.phoneNumber || !formData.realName) return alert("Enter name and phone.");

        setUploading(true);
        try {
            let uploadedUrls = formData.propertyImages || [];
            if (selectedFiles.length > 0) {
                const newUrls = [];
                for (const file of selectedFiles) {
                    const storageRef = ref(storage, `roommate_requests/${Date.now()}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(snapshot.ref);
                    newUrls.push(url);
                }
                uploadedUrls = [...uploadedUrls, ...newUrls];
            }

            let finalPropName = formData.propertyName;
            let finalLocation = formData.location;
            let finalRent = formData.rent;
            let finalImage = uploadedUrls[0] || '';

            if (isStayZenBooking) {
                const selectedBooking = activeBookings.find(b => b.id === formData.bookingId);
                finalPropName = selectedBooking.propertyName;
                finalLocation = selectedBooking.location;
                finalRent = selectedBooking.rent || selectedBooking.price;
                if (!finalImage) finalImage = selectedBooking.image;
            }

            const requestData = {
                ...formData,
                propertyName: finalPropName,
                location: finalLocation,
                rent: finalRent,
                propertyImages: uploadedUrls,
                propertyImage: finalImage,
                userId: auth.currentUser.uid,
                userName: formData.realName || auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                userEmail: auth.currentUser.email,
                type: 'Roommate Matching',
                isExternal: !isStayZenBooking,
                createdAt: formData.createdAt || new Date().toISOString()
            };

            const postData = {
                ...requestData,
                name: `Roommate @ ${finalPropName}`,
                postType: 'roommate',
                gender: requestData.posterGender,
                preference: requestData.preferredGender,
                sharing: requestData.sharingType
            };

            if (editingRequestId) {
                await updateRoommateRequest(editingRequestId, requestData);
                const q = query(collection(db, POSTS_COLLECTION), where("originalId", "==", editingRequestId));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    await updateDoc(doc(db, POSTS_COLLECTION, snap.docs[0].id), postData);
                } else {
                    // Fallback: If originalId search fails, try direct ID update
                    await setDoc(doc(db, POSTS_COLLECTION, editingRequestId), postData, { merge: true });
                }
                alert("Roommate post updated successfully!");
            } else {
                const requestId = await createRoommateRequest(requestData);
                // Assign identical ID for both collections for perfect sync
                await setDoc(doc(db, POSTS_COLLECTION, requestId), {
                    ...postData,
                    originalId: requestId
                });
                alert("Roommate request posted successfully!");
            }

            setIsCreateModalOpen(false);
            setEditingRequestId(null);
            setFormData({
                bookingId: 'manual', propertyName: '', location: '', qualities: '',
                sharingType: '2x Sharing', description: '', rent: '', amenities: '',
                posterGender: 'Male', posterOccupation: '', preferredGender: 'Any',
                phoneNumber: '', realName: ''
            });
            setSelectedFiles([]);
            setPreviews([]);
        } catch (error) {
            console.error(error);
            alert("Error saving.");
        } finally {
            setUploading(false);
        }
    };

    const handleEditRequest = (req) => {
        setEditingRequestId(req.id);
        setFormData({ ...req, bookingId: req.bookingId || 'manual' });
        setPreviews(req.propertyImages || []);
        setIsCreateModalOpen(true);
    };

    const handleDeleteRequest = async (requestId) => {
        if (!window.confirm("Sure?")) return;
        try {
            await deleteRoommateRequest(requestId);
            alert("Deleted.");
        } catch (error) {
            console.error(error);
        }
    };

    const handleRequestChat = async (req) => {
        if (!auth.currentUser) return navigate('/auth');
        try {
            const q = query(collection(db, "chat_requests"), where("senderId", "==", auth.currentUser.uid), where("requestId", "==", req.id || req.userId));
            const snap = await getDocs(q);
            if (!snap.empty) return alert("Already sent!");

            await addDoc(collection(db, "chat_requests"), {
                requestId: req.id || req.userId,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                targetUserId: req.userId,
                propertyName: req.propertyName,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            await addDoc(collection(db, "notifications"), {
                targetId: req.userId,
                title: 'New Roommate Request',
                message: `${auth.currentUser.displayName || auth.currentUser.email.split('@')[0]} wants to chat about ${req.propertyName}`,
                type: 'roommate_request',
                read: false,
                createdAt: new Date().toISOString()
            });

            // Trigger an email alert if we have the target user's email 
            if (req.userEmail) {
                const mailSubject = `New Connection Request on StayZen`;
                const mailHTML = `
                    <div style="font-family: sans-serif; padding: 20px; color: #333; background: #fafafa; border-radius: 8px;">
                        <h2 style="color: #1aa79c; margin-bottom: 5px;">StayZen Connections</h2>
                        <hr style="border: 0; background: #eee; height: 1px; margin-bottom: 20px;" />
                        <p style="font-size: 16px;">Hello,</p>
                        <p style="font-size: 16px;"><strong>${auth.currentUser.displayName || auth.currentUser.email.split('@')[0]}</strong> has requested to connect with you regarding your listing at <strong>${req.propertyName}</strong>.</p>
                        <p style="font-size: 16px; margin-top: 20px;">
                            <a href="https://stayzen-dcc00.web.app/roommates" style="background: #1aa79c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                View Request
                            </a>
                        </p>
                        <p style="font-size: 14px; color: #777; margin-top: 30px;">Best Regards,<br/><strong>The StayZen Team</strong></p>
                        <p style="font-size: 11px; color: #aaa; margin-top: 20px; font-style: italic;">StayZen India, Inc. Please refer to this secure link to handle your requests.</p>
                    </div>
                `;
                triggerEmailProtocol(req.userEmail, mailSubject, mailHTML);
            }

            alert("Sent!");
        } catch (error) { console.error(error); }
    };

    const handleAcceptRequest = async (chatReq) => {
        try {
            await updateDoc(doc(db, "chat_requests", chatReq.id), { status: 'accepted' });

            // Pass names to findOrCreateChat so they appear in Chats.jsx
            const chatId = await findOrCreateChat(
                chatReq.senderId,
                auth.currentUser.uid,
                chatReq.senderName,
                auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
            );

            await addDoc(collection(db, "notifications"), {
                targetId: chatReq.senderId,
                title: 'Accepted',
                message: `${auth.currentUser.displayName} accepted!`,
                type: 'request_accepted',
                read: false,
                createdAt: new Date().toISOString()
            });
            handleStartChat(chatReq.senderId, chatReq.senderName);
        } catch (err) { console.error(err); }
    };

    const handleStartChat = async (targetUserId, targetUserName = "Resident") => {
        try {
            const chatId = await findOrCreateChat(
                auth.currentUser.uid,
                targetUserId,
                auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                targetUserName
            );
            navigate('/messages');
        } catch (error) { console.error(error); }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;
        try {
            await sendMessage(activeChat, {
                text: newMessage,
                senderId: auth.currentUser.uid,
                participants: activeChat.split('_')
            });
            setNewMessage('');
        } catch (error) { console.error(error); }
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
                <button className="rm-create-btn" onClick={() => auth.currentUser ? setIsCreateModalOpen(true) : navigate('/auth')}>
                    <Plus size={20} /> <span>Find a Roommate</span>
                </button>
            </header>

            <div className="rm-search-bar">
                <Search size={20} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="rm-tabs">
                <button className={activeTab === 'browse' ? 'active' : ''} onClick={() => setActiveTab('browse')}>Browse</button>
                {auth.currentUser && (
                    <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>
                        Requests {chatRequests.length > 0 && <span className="req-count">{chatRequests.length}</span>}
                    </button>
                )}
            </div>

            <div className="rm-grid">
                {activeTab === 'browse' ? (
                    filteredRequests.map((req) => (
                        <motion.div key={req.id} className="rm-card glass-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="rm-card-header">
                                <div className="rm-avatar">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.userEmail}`} alt={req.userName} />
                                </div>
                                <div className="rm-user-info">
                                    <h3>{req.userName}</h3>
                                    <div className="rm-meta"><MapPin size={14} /> <span>{req.location}</span></div>
                                </div>
                            </div>
                            {req.propertyImage && <img src={req.propertyImage} className="rm-card-image" alt="Room" />}
                            <div className="rm-details">
                                <div className="rm-detail-item"><Users size={16} /> <span>{req.sharingType} • {req.posterGender}</span></div>
                                <div className="rm-detail-item"><Briefcase size={16} /> <span>{req.posterOccupation || 'Resident'}</span></div>
                                <div className="rm-detail-item"><User size={16} /> <span>Seeking: {req.preferredGender}</span></div>
                                <div className="rm-budget">{req.rent || 'Negotiable'}</div>
                            </div>
                            {req.amenities && <div className="rm-amenities-preview"><Home size={14} /> <span>{req.amenities}</span></div>}
                            <p className="rm-property-name">@ {req.propertyName}</p>
                            <p className="rm-description">{req.description}</p>
                            <div className="rm-footer">
                                {auth.currentUser && req.userId === auth.currentUser.uid ? (
                                    <div className="owner-actions">
                                        <button className="edit-btn" onClick={() => handleEditRequest(req)}><Play size={14} style={{ transform: 'rotate(180deg)' }} /> Edit</button>
                                        <button className="delete-btn" onClick={() => handleDeleteRequest(req.id)}><Trash2 size={16} /></button>
                                    </div>
                                ) : (
                                    <button className="rm-chat-btn" onClick={() => handleRequestChat(req)}><MessageSquare size={18} /> <span>Chat</span></button>
                                )}
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="rm-requests-list">
                        {chatRequests.length === 0 ? <p className="no-requests bread-center">No pending requests.</p> :
                            chatRequests.map(req => (
                                <div key={req.id} className="request-strip glass-panel">
                                    <div className="req-info"><strong>{req.senderName}</strong> wants to chat about <b>{req.propertyName}</b></div>
                                    <div className="req-actions">
                                        <button className="accept-btn" onClick={() => handleAcceptRequest(req)}><Check size={18} /> Approve</button>
                                        <button className="ignore-btn">Ignore</button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="rm-modal-overlay">
                        <motion.div className="rm-modal glass-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="rm-modal-header">
                                <h2>{editingRequestId ? 'Update Post' : 'Find a Roommate'}</h2>
                                <button onClick={() => { setIsCreateModalOpen(false); setEditingRequestId(null); }}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleCreateRequest} className="rm-form">
                                <div className="rm-form-grid">
                                    <div className="rm-form-group">
                                        <label>Full Name</label>
                                        <input type="text" required placeholder="Name" value={formData.realName} onChange={(e) => setFormData({ ...formData, realName: e.target.value })} />
                                    </div>
                                    <div className="rm-form-group">
                                        <label>Phone (Admin Only)</label>
                                        <input type="tel" required placeholder="Phone" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
                                    </div>
                                    <div className="rm-form-group full-width">
                                        <label>Your Stay</label>
                                        <div className="premium-select-container">
                                            <div className={`premium-select-trigger ${openDropdown === 'booking' ? 'active' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'booking' ? null : 'booking')}>
                                                <span>{formData.bookingId === 'manual' ? "Other Location" : activeBookings.find(b => b.id === formData.bookingId)?.propertyName || 'My Stay'}</span>
                                                <Play size={14} className="chevron-icon" style={{ transform: openDropdown === 'booking' ? 'rotate(-90deg)' : 'rotate(90deg)', transition: '0.3s' }} />
                                            </div>
                                            <AnimatePresence>
                                                {openDropdown === 'booking' && (
                                                    <motion.div className="premium-select-options" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                        <div className="premium-option" onClick={() => { setFormData({ ...formData, bookingId: 'manual' }); setOpenDropdown(null); }}>Other Location</div>
                                                        {activeBookings.map(b => <div key={b.id} className="premium-option" onClick={() => { setFormData({ ...formData, bookingId: b.id }); setOpenDropdown(null); }}>{b.propertyName}</div>)}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {formData.bookingId === 'manual' && (
                                        <>
                                            <div className="rm-form-group"><label>Property</label><input type="text" required value={formData.propertyName} onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })} /></div>
                                            <div className="rm-form-group"><label>Location</label><input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
                                        </>
                                    )}

                                    <div className="rm-form-group">
                                        <label>Sharing</label>
                                        <div className="premium-select-container">
                                            <div className={`premium-select-trigger ${openDropdown === 'sharing' ? 'active' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'sharing' ? null : 'sharing')}>
                                                <span>{formData.sharingType}</span>
                                                <Play size={14} className="chevron-icon" style={{ transform: openDropdown === 'sharing' ? 'rotate(-90deg)' : 'rotate(90deg)', transition: '0.3s' }} />
                                            </div>
                                            <AnimatePresence>
                                                {openDropdown === 'sharing' && (
                                                    <motion.div className="premium-select-options" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                        {['1x Private', '2x Sharing', '3x Sharing', '4x Sharing'].map(opt => <div key={opt} className="premium-option" onClick={() => { setFormData({ ...formData, sharingType: opt }); setOpenDropdown(null); }}>{opt}</div>)}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="rm-form-group"><label>Occupation</label><input type="text" required value={formData.posterOccupation} onChange={(e) => setFormData({ ...formData, posterOccupation: e.target.value })} /></div>

                                    <div className="rm-form-group">
                                        <label>Your Gender</label>
                                        <div className="premium-select-container">
                                            <div className={`premium-select-trigger ${openDropdown === 'posterGender' ? 'active' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'posterGender' ? null : 'posterGender')}><span>{formData.posterGender}</span><Play size={14} className="chevron-icon" style={{ transform: openDropdown === 'posterGender' ? 'rotate(-90deg)' : 'rotate(90deg)', transition: '0.3s' }} /></div>
                                            <AnimatePresence>{openDropdown === 'posterGender' && <motion.div className="premium-select-options" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{['Male', 'Female', 'Other'].map(opt => <div key={opt} className="premium-option" onClick={() => { setFormData({ ...formData, posterGender: opt }); setOpenDropdown(null); }}>{opt}</div>)}</motion.div>}</AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="rm-form-group">
                                        <label>Looking for</label>
                                        <div className="premium-select-container">
                                            <div className={`premium-select-trigger ${openDropdown === 'preferredGender' ? 'active' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'preferredGender' ? null : 'preferredGender')}><span>{formData.preferredGender}</span><Play size={14} className="chevron-icon" style={{ transform: openDropdown === 'preferredGender' ? 'rotate(-90deg)' : 'rotate(90deg)', transition: '0.3s' }} /></div>
                                            <AnimatePresence>{openDropdown === 'preferredGender' && <motion.div className="premium-select-options" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{['Male', 'Female', 'Any'].map(opt => <div key={opt} className="premium-option" onClick={() => { setFormData({ ...formData, preferredGender: opt }); setOpenDropdown(null); }}>{opt}</div>)}</motion.div>}</AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="rm-form-group"><label>Qualities</label><input type="text" required value={formData.qualities} onChange={(e) => setFormData({ ...formData, qualities: e.target.value })} /></div>
                                    <div className="rm-form-group"><label>Rent</label><input type="text" required value={formData.rent} onChange={(e) => setFormData({ ...formData, rent: e.target.value })} /></div>
                                    <div className="rm-form-group full-width"><label>Amenities</label><input type="text" required value={formData.amenities} onChange={(e) => setFormData({ ...formData, amenities: e.target.value })} /></div>

                                    <div className="rm-form-group full-width">
                                        <label>Photos ({selectedFiles.length}/5)</label>
                                        <div className="image-upload-grid">
                                            {previews.map((src, idx) => (
                                                <div key={idx} className="preview-box">
                                                    <img src={src} alt="P" />
                                                    <button type="button" onClick={() => removeImage(idx)} className="remove-img"><X size={14} /></button>
                                                </div>
                                            ))}
                                            {previews.length < 5 && <label className="upload-trigger"><Camera size={24} /><span>Add Photo</span><input type="file" multiple onChange={handleImageSelect} style={{ display: 'none' }} /></label>}
                                        </div>
                                    </div>

                                    <div className="rm-form-group full-width"><label>Rules</label><textarea rows="2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea></div>
                                </div>
                                <button type="submit" className="rm-submit-btn" disabled={uploading}>{uploading ? 'Wait...' : 'Broadcast Roommate Request'}</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isChatOpen && activeChat && (
                    <motion.div className="rm-chat-window glass-panel" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}>
                        <div className="chat-header"><h3>Building Chat</h3><button onClick={() => setIsChatOpen(false)}><X size={20} /></button></div>
                        <div className="chat-messages">
                            {messages.map((msg, i) => <div key={i} className={`message ${msg.senderId === auth.currentUser.uid ? 'sent' : 'received'}`}><p>{msg.text}</p></div>)}
                        </div>
                        <form className="chat-input" onSubmit={handleSendMessage}><input type="text" placeholder="..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} /><button type="submit"><Send size={18} /></button></form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
