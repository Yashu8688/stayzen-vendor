import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard,
    Search,
    Download,
    CheckCircle2,
    Clock,
    Receipt,
    X,
    ArrowUpRight,
    ChevronDown,
    Home
} from 'lucide-react';
import { auth } from '../firebase';
import { subscribeToUserPayments, subscribeToUserBookings, subscribeToUserRenterDetails, updateUserPayment, updateRenterPaidAmount } from '../services/dataService';
import './Payments.css';

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [renterDetails, setRenterDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [propertyFilter, setPropertyFilter] = useState('All');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    useEffect(() => {
        if (!auth.currentUser) return;

        const unsubscribePayments = subscribeToUserPayments(auth.currentUser.uid, (data) => {
            setPayments(data);
            setLoading(false);
        });

        const unsubscribeBookings = subscribeToUserBookings(auth.currentUser.uid, (data) => {
            setBookings(data);
        });

        const unsubscribeRenter = subscribeToUserRenterDetails(auth.currentUser.uid, (data) => {
            setRenterDetails(data);
        });

        return () => {
            unsubscribePayments();
            unsubscribeBookings();
            unsubscribeRenter();
        };
    }, [auth.currentUser?.uid]); // Only sync when the user profile changes

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && !event.target.closest('.property-select-wrap')) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const parseAmount = (val) => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const getMonthlyRent = () => {
        if (renterDetails && parseAmount(renterDetails.rentAmount) > 0) {
            return parseAmount(renterDetails.rentAmount);
        }
        const rentPayment = payments.find(p => p.type === 'Rent');
        if (rentPayment && parseAmount(rentPayment.amount) > 0) {
            return parseAmount(rentPayment.amount);
        }
        return 0;
    };

    const stats = {
        monthlyRent: propertyFilter === 'All'
            ? getMonthlyRent()
            : parseAmount(bookings.find(b => b.propertyName === propertyFilter)?.rent || 0),
        activeStays: bookings
            .filter(b => (b.status === 'Booked' || b.status === 'Confirmed') && (propertyFilter === 'All' || b.propertyName === propertyFilter))
            .length,
        pendingAmount: payments
            .filter(p => p.status === 'Pending' && (propertyFilter === 'All' || p.propertyName === propertyFilter))
            .reduce((acc, curr) => acc + parseAmount(curr.amount), 0)
    };

    const handleDownloadCSV = () => {
        const headers = ["ID", "Property", "Amount", "Status", "Date"];
        const rows = payments.map(p => [p.id, p.propertyName || 'Stay', p.amount, p.status || 'Success', new Date(p.createdAt || p.date).toLocaleDateString()]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = `transactions.csv`;
        link.click();
    };

    const filteredPayments = payments.filter(p => {
        const matchesSearch = (p.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase());
        const isCompleted = p.status === 'Completed' || p.status === 'Success' || !p.status;
        const matchesTab = activeTab === 'All' ||
            (activeTab === 'Completed' && isCompleted) ||
            (p.status === activeTab);
        const matchesProperty = propertyFilter === 'All' || p.propertyName === propertyFilter;

        return matchesSearch && matchesTab && matchesProperty;
    });

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.id = 'razorpay-sdk';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayRent = async (payment) => {
        const amount = parseAmount(payment.amount);

        if (amount <= 0) {
            alert("Error: Total amount is ₹0. Please contact the manager to set your rent.");
            return;
        }

        setIsPaying(payment.id);
        const res = await loadRazorpay();

        if (!res) {
            alert('Payment security module failed to load. Please refresh the page.');
            setIsPaying(null);
            return;
        }

        try {
            const options = {
                key: "rzp_test_S5fEDvgiK3b2fh", // TEST MODE key
                amount: Math.round(amount * 100),
                currency: "INR",
                name: "StayZen",
                description: `Rent Payment - ${payment.propertyName || 'Stay'}`,
                handler: async function (response) {
                    try {
                        await updateUserPayment(payment.id, {
                            razorpayPaymentId: response.razorpay_payment_id,
                            status: 'Completed',
                            statusText: 'Completed',
                            type: 'Online',
                            method: 'Razorpay',
                            paymentDate: new Date().toISOString()
                        });

                        // 🔔 SYNC TO RENTERS PAGE: If this is a Rent payment, update the renter's 'Paid' amount
                        if (payment.type === 'Rent') {
                            const syncId = payment.renterId || auth.currentUser.uid;
                            await updateRenterPaidAmount(syncId, payment.propertyName, amount);
                        }

                        alert("Payment Successful! Your digital receipt is now generated.");
                    } catch (error) {
                        console.error("Firestore Update Error:", error);
                        alert("Real-time sync failed. Please keep your Payment ID: " + response.razorpay_payment_id);
                    } finally {
                        setIsPaying(null);
                    }
                },
                prefill: {
                    name: auth.currentUser?.displayName || "",
                    email: auth.currentUser?.email || "",
                },
                theme: { color: "#1aa79c" },
                modal: {
                    ondismiss: function () {
                        setIsPaying(null);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                console.error("Razorpay Payment Failed Detail:", response.error);
                alert("Payment Failed: " + response.error.description);
            });
            rzp.open();
        } catch (error) {
            console.error("Razorpay Startup Error:", error);
            alert("Initialization failed. Please check if your browser blocks popups.");
            setIsPaying(null);
        }
    };

    return (
        <motion.div className="payments-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="payments-header">
                <div className="header-content">
                    <h1>Transaction History</h1>
                    <p>Manage and track all your stay-related payments</p>
                </div>
                <div className="header-actions">
                    <div className="property-select-wrap">
                        <button
                            className={`custom-select-trigger ${isDropdownOpen ? 'active' : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <div className="trigger-content">
                                <Home size={16} className="trigger-icon" />
                                <span>{propertyFilter === 'All' ? 'All Properties' : propertyFilter}</span>
                            </div>
                            <ChevronDown size={14} className={`chevron ${isDropdownOpen ? 'up' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    className="custom-options-panel"
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                >
                                    <div
                                        className={`option-item ${propertyFilter === 'All' ? 'selected' : ''}`}
                                        onClick={() => { setPropertyFilter('All'); setIsDropdownOpen(false); }}
                                    >
                                        <div className="option-dot"></div>
                                        <span>All Properties</span>
                                    </div>
                                    {[...new Set(bookings
                                        .filter(b => b.status === 'Booked' || b.status === 'Confirmed')
                                        .map(b => b.propertyName))]
                                        .map(name => (
                                            <div
                                                key={name}
                                                className={`option-item ${propertyFilter === name ? 'selected' : ''}`}
                                                onClick={() => { setPropertyFilter(name); setIsDropdownOpen(false); }}
                                            >
                                                <div className="option-dot"></div>
                                                <span>{name}</span>
                                            </div>
                                        ))
                                    }
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button className="download-report" onClick={handleDownloadCSV}>
                        <Download size={18} />
                        <span>Download CSV</span>
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrap rent"><ArrowUpRight size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">MONTHLY RENT</span>
                        <h2 className="stat-value">₹{stats.monthlyRent.toLocaleString()}</h2>
                        <span className="stat-trend primary">Current Plan</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap month"><Clock size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">PENDING PAYMENT</span>
                        <h2 className="stat-value">₹{stats.pendingAmount.toLocaleString()}</h2>
                        <span className="stat-trend orange">{stats.pendingAmount > 0 ? 'Dues remaining' : 'No dues'}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap stays"><Receipt size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">ACTIVE STAYS</span>
                        <h2 className="stat-value">{stats.activeStays.toString().padStart(2, '0')}</h2>
                        <span className="stat-trend blue">Current Month</span>
                    </div>
                </div>
            </div>

            <div className="payments-content-card">
                <div className="content-filters">
                    <div className="transactions-badge">
                        <CheckCircle2 size={16} />
                        TRANSACTIONS
                    </div>
                    <div className="tabs">
                        {['All', 'Completed', 'Pending', 'Failed'].map(tab => (
                            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="search-box">
                        <Search size={18} />
                        <input type="text" placeholder="Search by ID or property..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="transactions-table-wrap">
                    <table className="transactions-table">
                        <thead>
                            <tr>
                                <th>TRANSACTION DETAILS</th>
                                <th>PROPERTY</th>
                                <th>DATE</th>
                                <th>AMOUNT</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '100px' }}>Loading transactions...</td></tr>
                            ) : filteredPayments.length > 0 ? (
                                filteredPayments.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="tx-id-cell">
                                                <div className="tx-icon"><CreditCard size={18} /></div>
                                                <div>
                                                    <p className="tx-id">#{p.razorpayPaymentId?.slice(-8).toUpperCase() || p.id.slice(-8).toUpperCase()}</p>
                                                    <p className="tx-method">{p.paymentMethod || (p.type === 'Online' ? 'Razorpay' : p.type) || 'Razorpay'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td><p className="tx-property">{p.propertyName || 'StayZen Property'}</p></td>
                                        <td><p className="tx-date">{new Date(p.createdAt || p.date).toLocaleDateString('en-GB')}</p></td>
                                        <td><p className="tx-amount">₹{parseAmount(p.amount).toLocaleString()}</p></td>
                                        <td>
                                            <div className={`status-cell-badge ${p.status?.toLowerCase() || 'success'}`}>
                                                {p.status || 'COMPLETED'}
                                            </div>
                                        </td>
                                        <td>
                                            {p.status === 'Pending' ? (
                                                <button className={`pay-btn ${isPaying === p.id ? 'processing' : ''}`} onClick={() => handlePayRent(p)}>
                                                    {isPaying === p.id ? '...' : 'Pay Now'}
                                                </button>
                                            ) : (
                                                <button className="details-btn" onClick={() => setSelectedPayment(p)}>Details</button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">
                                        <div className="empty-state">
                                            <Receipt size={48} />
                                            <h3>No transactions found</h3>
                                            <p>It looks like you haven't made any payments yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Simple Receipt Modal - Re-using logic if needed */}
            <AnimatePresence>
                {selectedPayment && (
                    <motion.div className="receipt-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPayment(null)}>
                        {/* Modal content... */}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Payments;
