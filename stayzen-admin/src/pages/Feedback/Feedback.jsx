import React, { useState, useEffect } from 'react';
import './Feedback.css';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';

const Feedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setFeedbacks(data);
            setLoading(false);
        }, (error) => {
            console.error("Feedback Fetch Error:", error);
            // Fallback mock data if collection doesn't exist or is empty
            if (feedbacks.length === 0) {
                setFeedbacks([
                    { id: '1', userName: 'John Doe', userEmail: 'john@example.com', rating: 5, message: 'Great app! Love the UI.', createdAt: new Date().toISOString() },
                    { id: '2', userName: 'Jane Smith', userEmail: 'jane@example.com', rating: 4, message: 'Good experience, but could use more properties in Bangalore.', createdAt: new Date().toISOString() },
                    { id: '3', userName: 'Rahul Kumar', userEmail: 'rahul@example.com', rating: 2, message: 'The app is a bit slow on my older device.', createdAt: new Date().toISOString() },
                ]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this feedback?')) {
            try {
                await deleteDoc(doc(db, 'feedback', id));
            } catch (error) {
                console.error("Delete Error:", error);
            }
        }
    };

    const filteredFeedback = feedbacks.filter(f =>
        f.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="feedback-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>User Feedback</h1>
                    <p>Review and manage ratings and comments from app users.</p>
                </div>
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search feedback..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="feedback-stats">
                <div className="stat-card">
                    <h3>Total Feedbacks</h3>
                    <span>{feedbacks.length}</span>
                </div>
                <div className="stat-card">
                    <h3>Avg. Rating</h3>
                    <span>
                        {feedbacks.length > 0
                            ? (feedbacks.reduce((acc, curr) => acc + (curr.rating || 0), 0) / feedbacks.length).toFixed(1)
                            : '0.0'} / 5.0
                    </span>
                </div>
            </div>

            <div className="feedback-grid">
                {loading ? (
                    <div className="loading-state">Loading feedbacks...</div>
                ) : (
                    filteredFeedback.map(fb => (
                        <div key={fb.id} className="feedback-card">
                            <div className="fb-card-header">
                                <div className="user-info">
                                    <h4>{fb.userName || 'Anonymous'}</h4>
                                    <span>{fb.userEmail || 'No email provided'}</span>
                                </div>
                                <div className="rating-badge">
                                    {'⭐'.repeat(fb.rating || 0)}
                                </div>
                            </div>
                            <div className="fb-content">
                                <p>"{fb.message}"</p>
                            </div>
                            <div className="fb-footer">
                                <span className="date">{new Date(fb.createdAt).toLocaleDateString()}</span>
                                <button className="delete-btn" onClick={() => handleDelete(fb.id)}>Delete</button>
                            </div>
                        </div>
                    ))
                )}
                {!loading && filteredFeedback.length === 0 && (
                    <div className="empty-state">No feedback found.</div>
                )}
            </div>
        </div>
    );
};

export default Feedback;
