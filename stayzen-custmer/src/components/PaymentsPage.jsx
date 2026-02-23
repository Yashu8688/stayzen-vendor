import React, { useState, useEffect } from 'react';
import { IoSearchOutline, IoDownloadOutline, IoFilterOutline, IoCardOutline, IoWalletOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoTrashOutline } from 'react-icons/io5';
import './payments.css';
import { subscribeToPayments, deletePayment, updatePayment, collectPayment } from '../services/dataService';

export default function PaymentsPage({ userId }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Completed');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToPayments(userId, (data) => {
            const sorted = data.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
            setPayments(sorted);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleCollectCash = async (payment) => {
        if (!window.confirm(`Mark ₹${payment.amount} as collected in cash?`)) return;
        try {
            await collectPayment(payment);
            alert("Payment recorded and renter ledger updated!");
        } catch (error) {
            console.error("Collection Error:", error);
            alert("Failed to update payment.");
        }
    };

    const handleDeletePayment = async (id) => {
        if (!window.confirm("Are you sure you want to delete this payment record? This will also remove it from the user's dashboard.")) return;
        try {
            await deletePayment(id);
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Failed to delete payment.");
        }
    };

    const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate Stats
    const totalCollected = payments
        .filter(p => p.status === 'Completed' || p.status === 'Success' || !p.status)
        .reduce((acc, p) => {
            const amt = Number(p.amount) || 0;
            return p.type === 'Correction' ? acc - amt : acc + amt;
        }, 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthCollected = payments
        .filter(p => {
            const isFinished = (p.status === 'Completed' || p.status === 'Success' || !p.status);
            const pDate = new Date(p.createdAt || p.date);
            return isFinished && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
        })
        .reduce((acc, p) => {
            const amt = Number(p.amount) || 0;
            return p.type === 'Correction' ? acc - amt : acc + amt;
        }, 0);

    const pendingRent = payments
        .filter(p => p.status === 'Pending')
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Filter Payments
    const filteredPayments = payments.filter(payment => {
        const renterName = (payment.renterName || payment.userName || 'Guest').toLowerCase();
        const propertyName = (payment.property || payment.propertyName || '').toLowerCase();
        const matchesSearch = renterName.includes(searchTerm.toLowerCase()) ||
            propertyName.includes(searchTerm.toLowerCase());

        const isCompleted = payment.status === 'Completed' || payment.status === 'Success' || !payment.status;
        const matchesTab = activeTab === 'Completed' ? isCompleted : payment.status === 'Pending';

        return matchesSearch && matchesTab;
    });

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Syncing financial data...</div>;

    return (
        <div className="py-container">
            <div className="py-header">
                <div className="py-header-title">
                    <h2>Payments</h2>
                    <p>Track and manage all your rental income</p>
                </div>
                <button className="py-primary-btn" onClick={() => alert('Export functionality coming soon!')}>
                    <IoDownloadOutline size={18} />
                    Export Report
                </button>
            </div>

            <div className="py-stats-grid">
                <div className="py-stat-card">
                    <div className="py-stat-header">
                        <div className="py-stat-icon" style={{ background: '#e8f7f6', color: '#1aa79c' }}>
                            <IoWalletOutline size={20} />
                        </div>
                    </div>
                    <div className="py-stat-content">
                        <h3>{formatCurrency(totalCollected)}</h3>
                        <p>Total Revenue</p>
                    </div>
                </div>
                <div className="py-stat-card">
                    <div className="py-stat-header">
                        <div className="py-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                            <IoCardOutline size={20} />
                        </div>
                    </div>
                    <div className="py-stat-content">
                        <h3>{formatCurrency(thisMonthCollected)}</h3>
                        <p>This Month</p>
                    </div>
                </div>
                <div className="py-stat-card">
                    <div className="py-stat-header">
                        <div className="py-stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
                            <IoTimeOutline size={20} />
                        </div>
                    </div>
                    <div className="py-stat-content">
                        <h3>{formatCurrency(pendingRent)}</h3>
                        <p>Pending Rent</p>
                    </div>
                </div>
            </div>

            <div className="py-actions-bar">
                <div className="py-tabs">
                    <button
                        className={`py-tab ${activeTab === 'Completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('Completed')}
                    >
                        Completed
                    </button>
                    <button
                        className={`py-tab ${activeTab === 'Pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('Pending')}
                    >
                        Pending
                    </button>
                </div>

                <div className="py-search-wrapper">
                    <IoSearchOutline className="py-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="py-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="py-table-container">
                <table className="py-table">
                    <thead>
                        <tr>
                            <th>Guest/Renter</th>
                            <th>Property / Unit</th>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPayments.length > 0 ? (
                            filteredPayments.map((payment) => (
                                <tr key={payment.id}>
                                    <td data-label="Renter">
                                        <div className="py-renter-profile">
                                            <div className="py-avatar">
                                                {(payment.renterName || payment.userName || 'U').charAt(0)}
                                            </div>
                                            <span className="py-renter-name">{payment.renterName || payment.userName || 'Guest'}</span>
                                        </div>
                                    </td>
                                    <td data-label="Property">
                                        <div className="py-property-info">
                                            {payment.property || payment.propertyName}
                                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{payment.unit || 'Standard'}</div>
                                        </div>
                                    </td>
                                    <td data-label="Date">
                                        <span className="py-date-box">
                                            {formatDate(payment.createdAt || payment.date)}
                                            <div style={{ fontSize: '11px' }}>
                                                {new Date(payment.createdAt || payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </span>
                                    </td>
                                    <td data-label="Method">
                                        <div className="py-method-tag">
                                            <span className="py-method-dot" style={{
                                                background: (payment.paymentMethod || payment.type) === 'Online' ? '#3b82f6' : ((payment.paymentMethod || payment.type) === 'Cash' ? '#10b981' : '#9ca3af')
                                            }}></span>
                                            {payment.paymentMethod || payment.type || (payment.status === 'Pending' ? 'Awaiting' : 'Other')}
                                        </div>
                                    </td>
                                    <td data-label="Amount">
                                        <span style={{ fontWeight: '600', color: payment.status === 'Pending' ? '#f59e0b' : '#10b981' }}>
                                            {formatCurrency(payment.amount)}
                                        </span>
                                    </td>
                                    <td data-label="Status">
                                        <span className={`py-status-pill ${payment.status?.toLowerCase() || 'success'}`}>
                                            {payment.status || 'Completed'}
                                        </span>
                                    </td>
                                    <td data-label="Actions">
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {payment.status === 'Pending' && (
                                                <button
                                                    className="py-action-btn collect"
                                                    onClick={() => handleCollectCash(payment)}
                                                    title="Mark as Paid (Cash)"
                                                >
                                                    <IoCheckmarkCircleOutline size={18} />
                                                    <span>Collect</span>
                                                </button>
                                            )}
                                            <button
                                                className="rn-icon-btn delete"
                                                onClick={() => handleDeletePayment(payment.id)}
                                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                                title="Delete Transaction"
                                            >
                                                <IoTrashOutline size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                    No {activeTab.toLowerCase()} payment records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
