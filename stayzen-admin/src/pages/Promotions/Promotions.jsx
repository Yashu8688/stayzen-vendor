import React, { useState, useEffect } from 'react';
import './Promotions.css';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';

const Promotions = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', type: 'Percentage', expiry: '' });

    useEffect(() => {
        const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCoupons(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'coupons'), {
                ...newCoupon,
                usage: '0',
                status: 'active',
                createdAt: new Date().toISOString()
            });
            setNewCoupon({ code: '', discount: '', type: 'Percentage', expiry: '' });
            setShowForm(false);
        } catch (error) {
            console.error("Error creating coupon:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure?")) {
            await deleteDoc(doc(db, 'coupons', id));
        }
    };

    return (
        <div className="promotions-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Promotions & Coupons</h1>
                    <p>Create and manage discount codes for users.</p>
                </div>
                <button className="add-coupon-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Create New Coupon'}
                </button>
            </div>

            {showForm && (
                <div className="admin-card promo-form-card">
                    <form onSubmit={handleCreate} className="promo-form">
                        <input
                            placeholder="Coupon Code (e.g. SAVE20)"
                            value={newCoupon.code}
                            onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                            required
                        />
                        <input
                            placeholder="Discount Value"
                            type="number"
                            value={newCoupon.discount}
                            onChange={e => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                            required
                        />
                        <select value={newCoupon.type} onChange={e => setNewCoupon({ ...newCoupon, type: e.target.value })}>
                            <option value="Percentage">Percentage (%)</option>
                            <option value="Flat">Flat Amount (₹)</option>
                        </select>
                        <input
                            type="date"
                            value={newCoupon.expiry}
                            onChange={e => setNewCoupon({ ...newCoupon, expiry: e.target.value })}
                        />
                        <button type="submit" className="save-btn">Save Coupon</button>
                    </form>
                </div>
            )}

            <div className="promotions-grid">
                {loading ? (
                    <div className="loading-state">Loading promotions...</div>
                ) : coupons.length > 0 ? (
                    coupons.map(coupon => (
                        <div key={coupon.id} className={`coupon-card status-${coupon.status}`}>
                            <div className="coupon-header">
                                <span className="coupon-code">{coupon.code}</span>
                                <span className={`status-pill ${coupon.status}`}>{coupon.status}</span>
                            </div>
                            <div className="coupon-body">
                                <h3>{coupon.type === 'Percentage' ? `${coupon.discount}% OFF` : `₹${coupon.discount} OFF`}</h3>
                                <p>{coupon.type} Discount</p>
                                <div className="usage-stats">
                                    <span>Usage: <strong>{coupon.usage}</strong></span>
                                </div>
                            </div>
                            <div className="coupon-footer">
                                <button onClick={() => handleDelete(coupon.id)} className="del-btn">Delete</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">No active coupons. Create one to get started!</div>
                )}
            </div>
        </div>
    );
};

export default Promotions;
