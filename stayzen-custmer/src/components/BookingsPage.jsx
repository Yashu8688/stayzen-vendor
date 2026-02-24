import React, { useState, useEffect } from 'react';
import { IoSearchOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoEyeOutline, IoCalendarOutline } from 'react-icons/io5';
import './bookings.css';
import { subscribeToBookings, updateBookingStatus, addRenter, addPayment, sendNotification, getUserNotificationSettings } from '../services/dataService';

export default function BookingsPage({ setActiveTab, userId }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedBooking, setSelectedBooking] = useState(null);

    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalTarget, setApprovalTarget] = useState(null);
    const [rentDueDay, setRentDueDay] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToBookings(userId, (data) => {
            const sorted = data.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
            setBookings(sorted);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleUpdateStatus = async (id, status) => {
        if (!window.confirm(`Are you sure you want to mark this as ${status}?`)) return;
        try {
            await updateBookingStatus(id, status);
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const confirmApprove = async () => {
        const booking = approvalTarget;
        if (!booking) return;

        try {
            const parseAmount = (val) => {
                if (!val) return 0;
                return Number(String(val).replace(/[^0-9.]/g, '')) || 0;
            };

            let finalRentAmount = parseAmount(booking.monthlyRent || booking.rent);

            const newRenterId = await addRenter({
                name: booking.userName || 'Unknown',
                userId: booking.userId || booking.user_id || null,
                phone: booking.userPhone || '',
                email: booking.email || '',
                property: booking.propertyName || 'Unknown Property',
                unit: booking.unit || 'Unit 1',
                rentAmount: finalRentAmount || 8000,
                rentDueDay: new Date(rentDueDay).getDate(),
                paidAmount: 0,
                deposit: (booking.advance && booking.advance !== '0') ? Number(booking.advance) : 1000,
                rentStatus: 'Pending',
                paymentType: '-',
                ownerId: userId || null,
                joinedDate: new Date().toISOString(),
            });

            const targetUserId = booking.userId || booking.user_id;
            const cycleDay = new Date(rentDueDay).getDate();
            if (targetUserId) {
                await addPayment({
                    userId: targetUserId,
                    renterId: newRenterId, // Link the renter ID for better sync
                    bookingId: booking.id,
                    propertyName: booking.propertyName,
                    amount: finalRentAmount,
                    status: 'Pending',
                    type: 'Rent',
                    description: `Monthly Rent Due (Every month on ${cycleDay})`,
                    ownerId: userId || null,
                    createdAt: new Date().toISOString()
                });
            }

            await updateBookingStatus(booking.id, 'Booked', {
                renterId: newRenterId,
                approvedAt: new Date().toISOString()
            });

            // Notify User (if enabled)
            if (targetUserId) {
                try {
                    const settings = await getUserNotificationSettings(targetUserId);
                    if (settings && settings.pushEnabled !== false) {
                        await sendNotification({
                            userId: targetUserId,
                            type: 'BOOKING_APPROVED',
                            title: 'Booking Approved!',
                            message: `Your booking for ${booking.propertyName} has been approved. Welcome home!`,
                            targetId: booking.id
                        });
                    }
                } catch (err) {
                    console.error("Error sending notification:", err);
                }
            }

            setShowApprovalModal(false);
            if (setActiveTab) setActiveTab('renters');

        } catch (error) {
            console.error("Approval Error:", error);
            alert("Failed to approve booking.");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredBookings = bookings.filter(booking => {
        const matchesSearch = (booking.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (booking.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase());
        let matchesStatus = filterStatus === 'All' ||
            (filterStatus === 'Payment Pending' && ['Upcoming', 'Pending', 'Advance Paid'].includes(booking.status)) ||
            (filterStatus === 'Booked' && ['Booked', 'Confirmed', 'Completed'].includes(booking.status)) ||
            (booking.status === filterStatus);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="bk-container">
            <div className="bk-header">
                <div className="bk-header-title">
                    <h2>Bookings</h2>
                    <p>Track tour requests, confirm residencies, and manage reservations.</p>
                </div>
            </div>

            <div className="bk-actions-bar">
                <div className="bk-search-wrapper">
                    <IoSearchOutline className="bk-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search by guest or property..."
                        className="bk-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bk-filters">
                    {['All', 'Payment Pending', 'Booked', 'Cancelled', 'Rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`bk-filter-tab ${filterStatus === status ? 'active' : ''}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bk-table-container">
                <table className="bk-table">
                    <thead>
                        <tr>
                            <th>Guest Profile</th>
                            <th>Property</th>
                            <th>Move-in Date</th>
                            <th>Details</th>
                            <th>Advance</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>Loading manifest records...</td></tr>
                        ) : filteredBookings.length > 0 ? (
                            filteredBookings.map((booking) => (
                                <tr key={booking.id}>
                                    <td data-label="Guest">
                                        <div className="bk-user-profile">
                                            <div className="bk-avatar">{(booking.userName || 'G').charAt(0).toUpperCase()}</div>
                                            <div>
                                                <div className="bk-user-name">{booking.userName || 'Guest User'}</div>
                                                <div className="bk-user-contact">{booking.userPhone || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Property"><div className="bk-prop-name">{booking.propertyName}</div></td>
                                    <td data-label="Move-in"><div className="bk-move-in">{formatDate(booking.moveInDate)}</div></td>
                                    <td data-label="Details">
                                        <div className="bk-details-badge">
                                            {booking.stayType && <span className="detail-tag">{booking.stayType}</span>}
                                            {booking.occupation && <span className="detail-tag">{booking.occupation}</span>}
                                            {!(booking.stayType || booking.occupation) && <span className="detail-tag">General</span>}
                                        </div>
                                    </td>
                                    <td data-label="Advance"><div className="bk-advance-val">₹{Number(booking.advance || 0).toLocaleString()}</div></td>
                                    <td data-label="Status">
                                        <span className={`bk-status-pill ${booking.status?.toLowerCase().replace(' ', '-') || 'pending'}`}>
                                            {booking.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td data-label="Actions">
                                        <div className="bk-action-btns">
                                            <button className="bk-icon-btn view" title="View Protocol" onClick={() => setSelectedBooking(booking)}><IoEyeOutline size={18} /></button>

                                            {/* Approve shows if not strictly 'Confirmed' logic, allowing re-approval if needed */}
                                            {booking.status !== 'Booked' && (
                                                <button className="bk-icon-btn approve" title="Confirm Residency" onClick={() => { setApprovalTarget(booking); setShowApprovalModal(true); }}>
                                                    <IoCheckmarkCircleOutline size={18} />
                                                </button>
                                            )}

                                            <button className="bk-icon-btn reject" title="Cancel/Reject" onClick={() => handleUpdateStatus(booking.id, 'Rejected')}>
                                                <IoCloseCircleOutline size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr className="bk-empty-state">
                                <td colSpan="7">No bookings found for the selected filter.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Premium Approval Modal */}
            {showApprovalModal && (
                <div className="bk-modal-overlay">
                    <div className="bk-modal-content">
                        <div className="bk-modal-header">
                            <h3>Verify Residency</h3>
                            <button onClick={() => setShowApprovalModal(false)}><IoCloseCircleOutline size={24} /></button>
                        </div>
                        <div className="bk-approval-body">
                            <div className="bk-user-summary">
                                <div className="bk-avatar large">{(approvalTarget?.userName || 'G').charAt(0)}</div>
                                <h4>{approvalTarget?.userName}</h4>
                                <p>{approvalTarget?.propertyName}</p>
                            </div>
                            <div className="bk-rent-config">
                                <label><IoCalendarOutline size={16} /> Select Rent Commencement Date</label>
                                <input
                                    type="date"
                                    className="bk-date-input"
                                    value={rentDueDay}
                                    onChange={(e) => {
                                        const selectedDate = new Date(e.target.value);
                                        setRentDueDay(e.target.value); // Store full date string
                                    }}
                                />
                                <p className="hint">The recurring monthly rent will be generated based on this selected day.</p>
                            </div>
                        </div>
                        <div className="bk-modal-footer">
                            <button className="bk-confirm-btn" onClick={confirmApprove}>Complete Verification</button>
                            <button className="bk-cancel-btn" onClick={() => setShowApprovalModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt/View Modal */}
            {selectedBooking && (
                <div className="bk-modal-overlay">
                    <div className="bk-modal-content">
                        <div className="bk-modal-header">
                            <h3>Booking Manifest</h3>
                            <button onClick={() => setSelectedBooking(null)}><IoCloseCircleOutline size={24} /></button>
                        </div>

                        <div className="bk-profile-header">
                            <div className="bk-avatar xl">{(selectedBooking.userName || 'G').charAt(0).toUpperCase()}</div>
                            <div className="bk-profile-info">
                                <h4>{selectedBooking.userName || 'Guest User'}</h4>
                                <p>{selectedBooking.userPhone || 'No Contact'}</p>
                                {selectedBooking.email && <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{selectedBooking.email}</p>}
                            </div>
                        </div>

                        <div className="bk-details-list">
                            <div className="detail-row">
                                <span>Target Property</span>
                                <strong>{selectedBooking.propertyName}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Move-in Date</span>
                                <strong>{formatDate(selectedBooking.moveInDate)}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Unit / Room Type</span>
                                <strong>{selectedBooking.stayType || 'Not Specified'}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Advance Paid</span>
                                <strong style={{ color: 'var(--bk-success)' }}>₹{Number(selectedBooking.advance || 0).toLocaleString()}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Status</span>
                                <span className={`bk-status-pill ${selectedBooking.status?.toLowerCase().replace(' ', '-') || 'pending'}`}>
                                    {selectedBooking.status || 'Pending'}
                                </span>
                            </div>

                            <div className="bk-notes-box">
                                <span className="bk-notes-label">Internal Notes</span>
                                <p className="bk-notes-content">
                                    {selectedBooking.message || 'No specific notes provided by the user for this booking.'}
                                </p>
                            </div>
                        </div>

                        <div className="bk-modal-footer">
                            <button className="bk-confirm-btn" onClick={() => { setApprovalTarget(selectedBooking); setShowApprovalModal(true); setSelectedBooking(null); }}>Approve Renter</button>
                            <button className="bk-cancel-btn" onClick={() => setSelectedBooking(null)}>Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
