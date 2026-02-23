import React from 'react';
import {
    IoSearchOutline, IoAddOutline, IoEllipsisHorizontalOutline,
    IoMailOutline, IoCallOutline, IoTrashOutline,
    IoCreateOutline, IoCloseOutline, IoWalletOutline, IoReceiptOutline
} from 'react-icons/io5';
import './renters.css';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { subscribeToRenters, addRenter, updateRenterPayment, processRenterPayment, addPayment, deleteRenter, subscribeToProperties, markRentAsPaid } from '../services/dataService';

export default function RentersPage({ userId }) {
    const [renters, setRenters] = React.useState([]);
    const [properties, setProperties] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [paymentHistory, setPaymentHistory] = React.useState([]);
    const [showHistoryModal, setShowHistoryModal] = React.useState(false);
    const [selectedRenterForHistory, setSelectedRenterForHistory] = React.useState(null);

    const handleDeleteRenter = async (id) => {
        if (!window.confirm("Are you sure you want to remove this renter?")) return;
        try {
            await deleteRenter(id);
        } catch (error) {
            console.error("Error deleting renter:", error);
        }
    };

    const openHistoryModal = async (renter) => {
        setSelectedRenterForHistory(renter);
        setShowHistoryModal(true);

        console.log('🔍 Fetching payment history for:', {
            property: renter.property,
            userId: renter.userId,
            renterData: renter
        });

        // Fetch payment history for this renter
        try {
            const paymentsQuery = query(
                collection(db, 'payments'),
                where('propertyName', '==', renter.property || renter.propertyName)
            );
            const snapshot = await getDocs(paymentsQuery);

            console.log('📊 Total payments found:', snapshot.docs.length);
            snapshot.docs.forEach(doc => {
                console.log('💰 Payment:', doc.data());
            });

            // Filter by userId if available, otherwise show all for this property
            let history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (renter.userId) {
                history = history.filter(payment => payment.userId === renter.userId);
                console.log('✅ Filtered by userId:', history.length);
            }

            // Sort by createdAt in JavaScript (descending - newest first)
            history.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setPaymentHistory(history);
        } catch (error) {
            console.error("❌ Error fetching payment history:", error);
            setPaymentHistory([]);
        }
    };

    // Add Renter Modal State
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [newRenter, setNewRenter] = React.useState({
        name: '',
        phone: '',
        email: '',
        property: '',
        unit: '',
        rentAmount: '',
        paidAmount: 0,
        paymentType: 'Online'
    });

    const handleAddRenter = async () => {
        if (!newRenter.name || !newRenter.property || !newRenter.rentAmount) {
            alert("Please fill in all required fields (Name, Property, Rent)");
            return;
        }

        try {
            await addRenter({
                ...newRenter,
                ownerId: userId,
                rentAmount: Number(newRenter.rentAmount),
                paidAmount: Number(newRenter.paidAmount) || 0
            });
            setIsAddModalOpen(false);
            setNewRenter({
                name: '',
                phone: '',
                email: '',
                property: '',
                unit: '',
                rentAmount: '',
                paidAmount: 0,
                paymentType: 'Online'
            });
        } catch (error) {
            console.error("Error adding renter:", error);
        }
    };

    // Payment Modal State
    const [selectedRenter, setSelectedRenter] = React.useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
    const [amountToPay, setAmountToPay] = React.useState('');
    const [rentAmount, setRentAmount] = React.useState(''); // New State for Rent
    const [paymentType, setPaymentType] = React.useState('Online');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const openPaymentModal = (renter) => {
        setSelectedRenter(renter);
        // Pre-fill with current paid amount and rent amount
        setAmountToPay(renter.paidAmount);
        setRentAmount(renter.rentAmount || 0);
        setPaymentType(renter.paymentType || 'Online');
        setIsPaymentModalOpen(true);
    };

    const handleUpdatePayment = async () => {
        if (!selectedRenter || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await processRenterPayment(
                selectedRenter,
                Number(amountToPay),
                Number(rentAmount),
                paymentType,
                userId
            );
            setIsPaymentModalOpen(false);
        } catch (error) {
            console.error("Error updating payment:", error);
            alert("Failed to process payment update. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterType, setFilterType] = React.useState('All'); // 'All', 'Paid', 'Due'

    const filteredRenters = renters.filter(renter => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (
            renter.name?.toLowerCase().includes(q) ||
            renter.property?.toLowerCase().includes(q) ||
            renter.unit?.toLowerCase().includes(q) ||
            renter.email?.toLowerCase().includes(q)
        );

        if (filterType === 'Paid') {
            return matchesSearch && (Number(renter.paidAmount) >= Number(renter.rentAmount) && Number(renter.rentAmount) > 0);
        }
        if (filterType === 'Due') {
            return matchesSearch && (Number(renter.paidAmount) < Number(renter.rentAmount));
        }

        return matchesSearch;
    });

    React.useEffect(() => {
        if (!userId) return;
        const unsubscribeRenters = subscribeToRenters(userId, (data) => {
            setRenters(data);
            setLoading(false);
        });

        const unsubscribeProperties = subscribeToProperties(userId, (data) => {
            setProperties(data.filter(p => p.status === 'Approved'));
        });

        return () => {
            unsubscribeRenters();
            unsubscribeProperties();
        };
    }, [userId]);

    const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

    return (
        <div className="rn-container">
            <div className="rn-header">
                <div className="rn-header-title">
                    <h2>Renters</h2>
                    <p>Manage and track all your active tenants</p>
                </div>
                <button className="rn-primary-btn mobile-hide" onClick={() => setIsAddModalOpen(true)}>
                    <IoAddOutline size={20} />
                    Add Renter
                </button>
            </div>

            {/* Mobile FAB */}
            <button
                className="mobile-fab mobile-show"
                onClick={() => setIsAddModalOpen(true)}
            >
                <IoAddOutline size={24} />
            </button>

            {/* Stats Summary */}
            <div className="rn-stats-grid">
                <div className="rn-stat-card">
                    <div className="rn-stat-icon" style={{ background: 'rgba(26, 167, 156, 0.1)', color: '#1aa79c' }}>
                        <IoAddOutline />
                    </div>
                    <div className="rn-stat-info">
                        <span>Total Renters</span>
                        <h3>{renters.length}</h3>
                    </div>
                </div>
                <div className="rn-stat-card">
                    <div className="rn-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <IoWalletOutline />
                    </div>
                    <div className="rn-stat-info">
                        <span>Total Paid</span>
                        <h3>{formatCurrency(renters.reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0))}</h3>
                    </div>
                </div>
                <div className="rn-stat-card">
                    <div className="rn-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <IoCloseOutline />
                    </div>
                    <div className="rn-stat-info">
                        <span>Ongoing Balance</span>
                        <h3>{formatCurrency(renters.reduce((acc, r) => acc + Math.max(0, (Number(r.rentAmount) || 0) - (Number(r.paidAmount) || 0)), 0))}</h3>
                    </div>
                </div>
            </div>

            <div className="rn-actions-bar">
                <div className="rn-search-wrapper">
                    <IoSearchOutline className="rn-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, property, unit..."
                        className="rn-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="rn-filter-group">
                    <button
                        className={`rn-filter-btn ${filterType === 'All' ? 'active' : ''}`}
                        onClick={() => setFilterType('All')}
                    >
                        All Stays
                    </button>
                    <button
                        className={`rn-filter-btn ${filterType === 'Paid' ? 'active-paid' : ''}`}
                        onClick={() => setFilterType('Paid')}
                    >
                        Fully Paid
                    </button>
                    <button
                        className={`rn-filter-btn ${filterType === 'Due' ? 'active-due' : ''}`}
                        onClick={() => setFilterType('Due')}
                    >
                        Pending Due
                    </button>
                </div>
            </div>

            <div className="rn-table-container">
                <div className="rn-table-wrapper">
                    <table className="rn-table">
                        <thead>
                            <tr>
                                <th>Renter</th>
                                <th>Property & Unit</th>
                                <th>Monthly Rent</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRenters.length > 0 ? (
                                filteredRenters.map((renter) => (
                                    <tr key={renter.id}>
                                        <td data-label="Renter">
                                            <div className="rn-renter-profile">
                                                <div className="rn-avatar">
                                                    {renter.name ? renter.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <span className="rn-renter-name">{renter.name}</span>
                                                    <span className="rn-renter-email">{renter.email || 'No email provided'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Property & Unit">
                                            <div className="rn-property-info">
                                                <div style={{ fontWeight: '700', color: '#334155' }}>{renter.property}</div>
                                                <span className="rn-unit-box">{renter.unit || 'General'}</span>
                                            </div>
                                        </td>
                                        <td data-label="Rent">
                                            <span style={{ fontWeight: '600', color: '#475569' }}>{formatCurrency(renter.rentAmount)}</span>
                                        </td>
                                        <td data-label="Paid">
                                            <span style={{ fontWeight: '700', color: '#10b981' }}>{formatCurrency(renter.paidAmount)}</span>
                                        </td>
                                        <td data-label="Balance">
                                            <span style={{
                                                fontWeight: '800',
                                                color: (renter.rentAmount - renter.paidAmount) > 0 ? '#ef4444' : '#10b981'
                                            }}>
                                                {formatCurrency(renter.rentAmount - renter.paidAmount)}
                                            </span>
                                        </td>
                                        <td data-label="Status">
                                            <span className={`rn-status-badge ${(renter.paidAmount >= renter.rentAmount && renter.rentAmount > 0) ? 'paid' : 'pending'
                                                }`}>
                                                {(renter.paidAmount >= renter.rentAmount && renter.rentAmount > 0) ? 'Fully Paid' : 'Pending'}
                                            </span>
                                        </td>
                                        <td data-label="Actions">
                                            <div className="rn-action-btns" style={{ paddingRight: '0.5rem' }}>
                                                <button className="rn-icon-btn" title="Payment History" onClick={() => openHistoryModal(renter)}><IoReceiptOutline size={18} /></button>
                                                <button className="rn-icon-btn" title="Update Payment" onClick={() => openPaymentModal(renter)}><IoWalletOutline size={18} /></button>
                                                <button className="rn-icon-btn delete" title="Remove Renter" onClick={() => handleDeleteRenter(renter.id)}><IoTrashOutline size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="rn-empty-state">
                                        No active renters found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Add Renter Modal */}
            {isAddModalOpen && (
                <div className="rn-modal-overlay">
                    <div className="rn-modal-content">
                        <div className="rn-modal-header">
                            <h3>Add New Renter</h3>
                            <button className="rn-close-btn" onClick={() => setIsAddModalOpen(false)}>
                                <IoCloseOutline size={24} />
                            </button>
                        </div>

                        <div className="rn-modal-inner">
                            <div className="rn-form-grid">
                                <div className="rn-form-group">
                                    <label>FULL NAME *</label>
                                    <input
                                        type="text"
                                        className="rn-form-input"
                                        value={newRenter.name}
                                        onChange={(e) => setNewRenter({ ...newRenter, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="rn-form-group">
                                    <label>PHONE NUMBER</label>
                                    <input
                                        type="tel"
                                        className="rn-form-input"
                                        value={newRenter.phone}
                                        onChange={(e) => setNewRenter({ ...newRenter, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                    />
                                </div>

                                <div className="rn-form-group">
                                    <label>EMAIL ADDRESS</label>
                                    <input
                                        type="email"
                                        className="rn-form-input"
                                        value={newRenter.email}
                                        onChange={(e) => setNewRenter({ ...newRenter, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div className="rn-form-group">
                                    <label>PROPERTY *</label>
                                    <select
                                        className="rn-form-select"
                                        value={newRenter.property}
                                        onChange={(e) => setNewRenter({ ...newRenter, property: e.target.value })}
                                    >
                                        <option value="">Select Property</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rn-form-group">
                                    <label>UNIT NUMBER / ROOM</label>
                                    <input
                                        type="text"
                                        className="rn-form-input"
                                        value={newRenter.unit}
                                        onChange={(e) => setNewRenter({ ...newRenter, unit: e.target.value })}
                                        placeholder="Room 101"
                                    />
                                </div>

                                <div className="rn-form-group">
                                    <label>MONTHLY RENT (₹) *</label>
                                    <input
                                        type="number"
                                        className="rn-form-input"
                                        value={newRenter.rentAmount}
                                        onChange={(e) => setNewRenter({ ...newRenter, rentAmount: e.target.value })}
                                        placeholder="5000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rn-modal-footer">
                            <button className="rn-secondary-btn" onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="rn-save-btn" onClick={handleAddRenter}>
                                Register Renter
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="rn-modal-overlay">
                    <div className="rn-modal-content premium-modal">
                        <div className="rn-modal-header">
                            <div>
                                <h3>Manage Payments</h3>
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Recording transaction for {selectedRenter?.name}</p>
                            </div>
                            <button className="rn-close-btn" onClick={() => setIsPaymentModalOpen(false)}>
                                <IoCloseOutline size={24} />
                            </button>
                        </div>

                        <div className="payment-summary-card">
                            <div className="summary-item">
                                <span>Monthly Rent</span>
                                <strong>₹{Number(rentAmount).toLocaleString()}</strong>
                            </div>
                            <div className="summary-divider"></div>
                            <div className="summary-item">
                                <span>Current Dues</span>
                                <strong style={{ color: (Number(rentAmount) - Number(amountToPay)) > 0 ? '#ef4444' : '#10b981' }}>
                                    ₹{Math.max(0, Number(rentAmount) - Number(amountToPay)).toLocaleString()}
                                </strong>
                            </div>
                        </div>

                        <div className="rn-form-grid">
                            <div className="rn-form-group">
                                <label>Adjust Monthly Rent (₹)</label>
                                <div className="input-with-icon">
                                    <input
                                        type="number"
                                        className="rn-form-input"
                                        value={rentAmount || ''}
                                        onChange={(e) => setRentAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="rn-form-group">
                                <label>Total Paid to Date (₹)</label>
                                <div className="input-with-icon">
                                    <input
                                        type="number"
                                        className="rn-form-input highlight"
                                        value={amountToPay}
                                        onChange={(e) => setAmountToPay(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="input-hint">Update this value when receiving cash/offline payments.</p>
                            </div>

                            <div className="rn-form-group">
                                <label>Payment Reference</label>
                                <select
                                    className="rn-form-select"
                                    value={paymentType}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                >
                                    <option value="Online">Online / UPI</option>
                                    <option value="Cash">Cash Payment</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Offline">Other Offline</option>
                                </select>
                            </div>
                        </div>

                        <div className="rn-modal-footer">
                            <button className="rn-secondary-btn" onClick={() => setIsPaymentModalOpen(false)} disabled={isSubmitting}>
                                Dismiss
                            </button>
                            <button
                                className={`rn-save-btn ${isSubmitting ? 'loading' : ''}`}
                                onClick={handleUpdatePayment}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Syncing...' : 'Save & Update Ledger'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment History Modal */}
            {showHistoryModal && selectedRenterForHistory && (
                <div className="rn-modal-overlay">
                    <div className="rn-modal-content premium-modal" style={{ maxWidth: '700px' }}>
                        <div className="rn-modal-header">
                            <div>
                                <h3>Payment History</h3>
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                    {selectedRenterForHistory.name} - {selectedRenterForHistory.property}
                                </p>
                            </div>
                            <button className="rn-close-btn" onClick={() => setShowHistoryModal(false)}>
                                <IoCloseOutline size={24} />
                            </button>
                        </div>

                        <div className="payment-summary-card" style={{ marginBottom: '20px' }}>
                            <div className="summary-item">
                                <span>Monthly Rent</span>
                                <strong>₹{Number(selectedRenterForHistory.rentAmount).toLocaleString()}</strong>
                            </div>
                            <div className="summary-divider"></div>
                            <div className="summary-item">
                                <span>Advance Paid</span>
                                <strong style={{ color: '#10b981' }}>₹{Number(selectedRenterForHistory.deposit || 0).toLocaleString()}</strong>
                            </div>
                            <div className="summary-divider"></div>
                            <div className="summary-item">
                                <span>Total Paid</span>
                                <strong style={{ color: '#10b981' }}>₹{Number(selectedRenterForHistory.paidAmount).toLocaleString()}</strong>
                            </div>
                            <div className="summary-divider"></div>
                            <div className="summary-item">
                                <span>Balance</span>
                                <strong style={{ color: (selectedRenterForHistory.rentAmount - selectedRenterForHistory.paidAmount) > 0 ? '#ef4444' : '#10b981' }}>
                                    ₹{Math.max(0, Number(selectedRenterForHistory.rentAmount) - Number(selectedRenterForHistory.paidAmount)).toLocaleString()}
                                </strong>
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Transaction History</h4>
                        </div>

                        <div className="payment-history-container" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                            {paymentHistory.length > 0 ? (
                                <div className="history-list">
                                    {paymentHistory.map((payment) => (
                                        <div key={payment.id} className="history-item">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{
                                                    width: '42px',
                                                    height: '42px',
                                                    borderRadius: '12px',
                                                    background: payment.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: payment.status === 'Completed' ? '#15803d' : '#92400e'
                                                }}>
                                                    <IoReceiptOutline size={20} />
                                                </div>
                                                <div>
                                                    <div className="history-date">
                                                        {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                        {payment.type || 'Standard Payment'} • {payment.paymentMethod || 'Online'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="history-amount">{formatCurrency(payment.amount)}</div>
                                                <div style={{
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    color: payment.status === 'Completed' ? '#10b981' : '#f59e0b'
                                                }}>
                                                    {payment.status || 'Completed'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rn-empty-state" style={{ padding: '2rem' }}>
                                    <IoReceiptOutline size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>No payment history records found.</p>
                                </div>
                            )}
                        </div>

                        <div className="rn-modal-footer">
                            <button className="rn-secondary-btn" onClick={() => setShowHistoryModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
