import React, { useState, useEffect } from 'react';
import './Alerts.css';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'notifications'),
            where('targetId', '==', 'admin'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const alertList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().createdAt ? new Date(doc.data().createdAt).toLocaleDateString() : 'Just now'
            }));
            setAlerts(alertList);
            setLoading(false);
        }, (error) => {
            console.error("Alerts Fetch Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleResolve = async (id) => {
        try {
            await deleteDoc(doc(db, 'notifications', id));
        } catch (error) {
            console.error("Error resolving alert:", error);
        }
    };

    return (
        <div className="alerts-page">
            <div className="page-header">
                <h1>Alerts & Complaints</h1>
                <p>Stay updated with pending approvals and user reported issues.</p>
            </div>

            <div className="alerts-grid">
                {loading ? (
                    <div className="loading-state">Loading alerts...</div>
                ) : alerts.length > 0 ? (
                    alerts.map(alert => (
                        <div key={alert.id} className={`alert-card priority-${alert.type === 'NEW_PROPERTY' ? 'high' : 'medium'}`}>
                            <div className="alert-badge">{alert.type === 'NEW_PROPERTY' ? 'Approval' : 'Info'}</div>
                            <p className="alert-msg">{alert.message || alert.title}</p>
                            <div className="alert-footer">
                                <span className="alert-date">{alert.date}</span>
                                <button onClick={() => handleResolve(alert.id)} className="resolve-btn">Mark as Resolved</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">No active alerts. All clear!</div>
                )}
            </div>
        </div>
    );
};

export default Alerts;
