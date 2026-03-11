import React, { useState, useEffect } from 'react';
import './Users.css';
import { db } from '../../firebase';
import { collection, query, orderBy, doc, updateDoc, deleteDoc, getDocs, limit, startAfter } from 'firebase/firestore';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const BATCH_SIZE = 15;

    useEffect(() => {
        const fetchInitialUsers = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(BATCH_SIZE));
                const snapshot = await getDocs(q);
                const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(userList);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                if (snapshot.docs.length < BATCH_SIZE) setHasMore(false);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialUsers();
    }, []);

    const fetchMoreUsers = async () => {
        if (!hasMore || isMoreLoading) return;
        setIsMoreLoading(true);
        try {
            const q = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(BATCH_SIZE)
            );
            const snapshot = await getDocs(q);
            const newList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (newList.length > 0) {
                setUsers(prev => [...prev, ...newList]);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            }
            if (snapshot.docs.length < BATCH_SIZE) setHasMore(false);
        } catch (error) {
            console.error("Load more error:", error);
        } finally {
            setIsMoreLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.fullName || user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = filterRole === 'all';
        if (filterRole === 'Pending') matchesFilter = user.status === 'Pending';
        else if (filterRole === 'PendingBank') matchesFilter = user.bankDetails && user.bankDetails.verified === false;
        else if (filterRole === 'manager') matchesFilter = user.role === 'manager';
        else if (filterRole === 'user') matchesFilter = user.role === 'user';

        return matchesSearch && matchesFilter;
    });

    const [selectedBankUser, setSelectedBankUser] = useState(null);

    const handleVerifyBank = async (userId) => {
        try {
            await updateDoc(doc(db, 'users', userId), {
                'bankDetails.verified': true,
                'bankDetails.verifiedAt': new Date().toISOString()
            });
            setSelectedBankUser(null);
            // In a real app, this might trigger a cloud function to create a Razorpay Linked Account
        } catch (error) {
            console.error("Error verifying bank:", error);
        }
    };

    const handleToggleManager = async (user) => {
        const newRole = user.role === 'manager' ? 'user' : 'manager';
        try {
            await updateDoc(doc(db, 'users', user.id), { role: newRole });
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'Approved' ? 'Pending' : 'Approved';
        try {
            await updateDoc(doc(db, 'users', user.id), { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, 'users', id));
            } catch (error) {
                console.error("Error deleting user:", error);
            }
        }
    };

    return (
        <div className="users-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>User Management</h1>
                    <p>Manage app users, managers, and bank verifications.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="filter-tabs">
                <button className={filterRole === 'all' ? 'active' : ''} onClick={() => setFilterRole('all')}>All ({users.length})</button>
                <button className={filterRole === 'Pending' ? 'active' : ''} onClick={() => setFilterRole('Pending')}>Pending Status</button>
                <button className={filterRole === 'PendingBank' ? 'active' : ''} onClick={() => setFilterRole('PendingBank')}>Bank Verification</button>
                <button className={filterRole === 'manager' ? 'active' : ''} onClick={() => setFilterRole('manager')}>Managers</button>
                <button className={filterRole === 'user' ? 'active' : ''} onClick={() => setFilterRole('user')}>Customers</button>
            </div>

            <div className="users-table-container">
                {loading ? (
                    <div className="loading-state">Loading users...</div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Bank Status</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="user-avatar" style={{ backgroundColor: user.role === 'manager' ? '#e1f5fe' : '#f0fdf4' }}>
                                                {(user.fullName || user.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="user-name">{user.fullName || user.name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>{user.email || 'N/A'}</td>
                                    <td>
                                        <span className={`role-badge ${user.role || 'user'}`}>
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td>
                                        {user.bankDetails ? (
                                            <span
                                                className={`bank-badge ${user.bankDetails.verified ? 'verified' : 'pending'}`}
                                                onClick={() => setSelectedBankUser(user)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {user.bankDetails.verified ? '✅ Linked' : '🕒 Verify Now'}
                                            </span>
                                        ) : (
                                            <span className="bank-badge none">Not Added</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-pill ${user.status?.toLowerCase() || 'approved'}`}>
                                            {user.status || 'Approved'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={() => handleToggleManager(user)}
                                            className={`action-btn ${user.role === 'manager' ? 'demote' : 'promote'}`}
                                            title={user.role === 'manager' ? 'Make Customer' : 'Make Manager'}
                                        >
                                            {user.role === 'manager' ? '👤' : '🏨'}
                                        </button>

                                        <button
                                            onClick={() => handleToggleStatus(user)}
                                            className={`action-btn status ${user.status === 'Approved' ? 'revoke' : 'approve'}`}
                                            title={user.status === 'Approved' ? 'Revoke' : 'Approve'}
                                        >
                                            {user.status === 'Approved' ? '🚫' : '✅'}
                                        </button>

                                        {user.bankDetails && (
                                            <button
                                                onClick={() => setSelectedBankUser(user)}
                                                className="action-btn bank"
                                                title="View Bank Details"
                                            >
                                                🏦
                                            </button>
                                        )}

                                        <button onClick={() => handleDeleteUser(user.id)} className="action-btn delete" title="Delete User">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {hasMore && !loading && (
                    <div className="pagination-footer">
                        <button className="load-more-btn" onClick={fetchMoreUsers} disabled={isMoreLoading}>
                            {isMoreLoading ? 'Loading...' : 'Load More Users'}
                        </button>
                    </div>
                )}
                {!loading && filteredUsers.length === 0 && (
                    <div className="empty-state">No users matching your criteria.</div>
                )}
            </div>

            {/* 🏦 BANK VERIFICATION MODAL */}
            {selectedBankUser && (
                <div className="modal-overlay" onClick={() => setSelectedBankUser(null)}>
                    <div className="bank-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Bank Account Verification</h2>
                            <button className="close-btn" onClick={() => setSelectedBankUser(null)}>×</button>
                        </div>
                        <div className="bank-details-view">
                            <div className="detail-item">
                                <label>ACCOUNT HOLDER</label>
                                <span>{selectedBankUser.bankDetails.accountHolderName}</span>
                            </div>
                            <div className="detail-item">
                                <label>BANK NAME</label>
                                <span>{selectedBankUser.bankDetails.bankName}</span>
                            </div>
                            <div className="detail-item">
                                <label>ACCOUNT NUMBER</label>
                                <span className="secure-font">{selectedBankUser.bankDetails.accountNumber}</span>
                            </div>
                            <div className="detail-item">
                                <label>IFSC CODE</label>
                                <span>{selectedBankUser.bankDetails.ifscCode}</span>
                            </div>
                            <div className="detail-item">
                                <label>ACCOUNT TYPE</label>
                                <span>{selectedBankUser.bankDetails.accountType}</span>
                            </div>
                            {selectedBankUser.bankDetails.upiId && (
                                <div className="detail-item">
                                    <label>UPI ID</label>
                                    <span>{selectedBankUser.bankDetails.upiId}</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            {!selectedBankUser.bankDetails.verified ? (
                                <button className="approve-bank-btn" onClick={() => handleVerifyBank(selectedBankUser.id)}>
                                    Approve & Link Account
                                </button>
                            ) : (
                                <div className="verified-success">
                                    Verified on {new Date(selectedBankUser.bankDetails.verifiedAt).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
