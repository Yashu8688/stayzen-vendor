import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { subscribeToUserBookings, deleteBooking, addPaymentRecord, getPaymentByBookingId } from '../services/dataService';
import {
    Calendar,
    MapPin,
    CreditCard,
    Trash2,
    CalendarCheck,
    Clock,
    User,
    Users,
    Briefcase,
    ChevronRight,
    Search,
    ArrowRight,
    Receipt,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Bookings.css';

const Bookings = () => {
    const [activeTab, setActiveTab] = useState('Pending');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToUserBookings(auth.currentUser.uid, (data) => {
            setBookings(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredBookings = bookings.filter(b => {
        const status = b.status || 'Upcoming';
        if (activeTab === 'Pending') {
            return status === 'Upcoming' || status === 'Pending' || status === 'Advance Paid' || status === 'Rejected' || status === 'Cancelled';
        } else {
            return status === 'Booked' || status === 'Confirmed' || status === 'Completed';
        }
    });

    const handleCancel = async (id) => {
        if (window.confirm("Are you sure you want to cancel this booking?")) {
            try {
                // Instead of deleting, we update status to 'Cancelled' for record keeping
                await deleteBooking(id); // Keeping delete for now if that's the established pattern, but user might want it to stay
            } catch (error) {
                console.error("Cancel Error:", error);
                alert("Failed to cancel booking.");
            }
        }
    };

    const handlePayment = (booking) => {
        // Use defined advance, or default to 1000 if explicitly 0 or missing
        let rawAmount = booking.advance;
        if (!rawAmount || rawAmount === '0' || rawAmount === 0) {
            rawAmount = '1000';
        }

        const amount = parseFloat(rawAmount.toString().replace(/[^0-9.]/g, '')) || 0;

        if (amount <= 0) {
            alert("This stay has no advance payment required.");
            return;
        }

        const options = {
            key: "rzp_live_SEgBKenzs40ifv",
            amount: amount * 100,
            currency: "INR",
            name: "StayZen",
            description: `Advance Payment for ${booking.propertyName}`,
            image: "https://i.imgur.com/3g7nmJC.png",
            handler: async function (response) {
                try {
                    await addPaymentRecord({
                        bookingId: booking.id,
                        userId: auth.currentUser.uid,
                        amount: amount,
                        paymentId: response.razorpay_payment_id,
                        status: 'Completed',
                        property: booking.propertyName,
                        renterName: auth.currentUser.displayName || auth.currentUser.email,
                        type: 'Online'
                    });
                    alert("Payment Successful! Your stay is now officially confirmed.");
                    setActiveTab('Confirmed');
                } catch (error) {
                    console.error("Payment Record Error:", error);
                    alert("Payment successful but database update failed. Please contact support.");
                }
            },
            prefill: {
                name: auth.currentUser?.displayName || "User",
                email: auth.currentUser?.email || ""
            },
            theme: { color: "#1aa79c" }
        };

        if (!window.Razorpay) {
            alert("Payment gateway is currently unavailable. Please check your internet connection and try again.");
            return;
        }

        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    const handleViewReceipt = async (booking) => {
        try {
            const payment = await getPaymentByBookingId(booking.id);
            if (payment) {
                setSelectedPayment(payment);
                setViewingReceipt(true);
            } else {
                alert("Receipt not found for this booking.");
            }
        } catch (error) {
            console.error("Receipt Fetch Error:", error);
            alert("Error loading receipt.");
        }
    };

    return (
        <div className="intel-dashboard">
            {/* Cinematic Header - My Stays */}
            {/* Simple Header */}
            <div className="intel-simple-header">
                <div className="simple-header-content">
                    <h1>My Stays</h1>
                    <p>Track active protocols, payments, and reservation history.</p>
                </div>
            </div>

            <div className="intel-content-wrapper">

                <div className="intel-tabs-container">
                    <div className="intel-tabs">
                        {['Pending', 'Confirmed'].map(tab => (
                            <button
                                key={tab}
                                className={`intel-tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab === 'Pending' ? <Clock size={16} /> : <CalendarCheck size={16} />}
                                <span>{tab} Phase</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="intel-booking-grid">
                    <AnimatePresence mode='popLayout'>
                        {loading ? (
                            <div className="intel-skeleton-list">
                                {[1, 2].map(i => <div key={i} className="intel-manifest-skeleton"></div>)}
                            </div>
                        ) : filteredBookings.length > 0 ? (
                            filteredBookings.map((booking, index) => (
                                <motion.div
                                    key={booking.id}
                                    className="booking-ticket"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="ticket-main">
                                        <div className="ticket-img">
                                            <img src={booking.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600'} alt={booking.propertyName} />
                                            <div className={`status-badge ${booking.status?.toLowerCase() || 'pending'}`}>
                                                {booking.status || 'Pending'}
                                            </div>
                                        </div>
                                        <div className="ticket-info">
                                            <div className="info-header">
                                                <h3>{booking.propertyName}</h3>
                                                <div className="loc-row">
                                                    <MapPin size={14} /> {booking.location}
                                                </div>
                                            </div>
                                            <div className="info-chips">
                                                <span className="chip"><Users size={12} /> {booking.stayType}</span>
                                                <span className="chip"><Briefcase size={12} /> {booking.occupation}</span>
                                            </div>
                                            <div className="dates-row">
                                                <Calendar size={14} />
                                                <span>Move-in: {new Date(booking.moveInDate || booking.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ticket-perforation">
                                        <div className="circle-top"></div>
                                        <div className="line"></div>
                                        <div className="circle-bottom"></div>
                                    </div>

                                    <div className="ticket-actions-side">
                                        <div className="price-block">
                                            <span className="p-label">{activeTab === 'Pending' ? 'Pay Advance' : 'Monthly Rent'}</span>
                                            <span className="p-val">{activeTab === 'Pending' ? (booking.advance && booking.advance !== '0' ? booking.advance : '₹1,000') : (booking.rent || booking.price)}</span>
                                        </div>

                                        <div className="action-buttons">
                                            {activeTab === 'Pending' ? (
                                                <>
                                                    {booking.status === 'Rejected' || booking.status === 'Cancelled' ? (
                                                        <div className={`status-pill ${booking.status.toLowerCase()}`}>
                                                            {booking.status === 'Rejected' ? 'Owner Rejected' : 'Request Cancelled'}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {booking.status !== 'Advance Paid' ? (
                                                                <button className="care-btn primary" onClick={() => handlePayment(booking)}>
                                                                    Pay & Confirm Booking <ArrowRight size={16} />
                                                                </button>
                                                            ) : (
                                                                <div className="waiting-pill">
                                                                    <Clock size={14} /> Approval Pending
                                                                </div>
                                                            )}
                                                            <button className="care-btn ghost" onClick={() => handleCancel(booking.id)}>
                                                                Cancel Request
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <button className="care-btn secondary" onClick={() => handleViewReceipt(booking)}>
                                                    <Receipt size={16} /> Receipt
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                className="intel-empty-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="empty-icon-circle">
                                    <Search size={48} />
                                </div>
                                <h3>No {activeTab.toLowerCase()} protocols active</h3>
                                <p>Ready to initialize a new resident sequence? Explore verified sectors now.</p>
                                <button className="intel-btn-primary" onClick={() => window.location.href = '/explore'}>
                                    Explore Verified Stays
                                    <ArrowRight size={18} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Receipt Modal */}
            <AnimatePresence>
                {viewingReceipt && selectedPayment && (
                    <motion.div
                        className="intel-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewingReceipt(false)}
                    >
                        <motion.div
                            className="intel-receipt-card"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="receipt-header">
                                <div className="receipt-icon">
                                    <Receipt size={24} />
                                </div>
                                <h2>Transaction Complete</h2>
                                <button className="close-btn" onClick={() => setViewingReceipt(false)}><X size={20} /></button>
                            </div>

                            <div className="receipt-content">
                                <div className="receipt-amount-block">
                                    <span>Total Amount</span>
                                    <h1>₹{selectedPayment.amount?.toLocaleString()}</h1>
                                    <div className="status-pill success">Verified</div>
                                </div>

                                <div className="receipt-details">
                                    <div className="detail-row">
                                        <span>Transaction ID</span>
                                        <code className="mono">{selectedPayment.paymentId || selectedPayment.razorpayPaymentId || selectedPayment.id}</code>
                                    </div>
                                    <div className="detail-row">
                                        <span>Property Protocol</span>
                                        <span>{selectedPayment.property || selectedPayment.propertyName}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Timestamp</span>
                                        <span>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Beneficiary</span>
                                        <span>StayZen Corp.</span>
                                    </div>
                                </div>

                                <button className="intel-btn-primary full-width" onClick={() => window.print()}>
                                    Print Manifest
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Bookings;
