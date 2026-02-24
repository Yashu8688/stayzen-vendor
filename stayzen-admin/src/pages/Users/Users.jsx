import React, { useState, useEffect } from 'react';
import './Users.css';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const handleToggleManager = async (user) => {
        const newRole = user.role === 'manager' ? 'user' : 'manager';
        try {
            await updateDoc(doc(db, 'users', user.id), { role: newRole });
        } catch (error) {
            console.error("Error updating role:", error);
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
                    <p>Manage app users, managers, and permissions.</p>
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
                <button className={filterRole === 'all' ? 'active' : ''} onClick={() => setFilterRole('all')}>All Users ({users.length})</button>
                <button className={filterRole === 'user' ? 'active' : ''} onClick={() => setFilterRole('user')}>Customers</button>
                <button className={filterRole === 'manager' ? 'active' : ''} onClick={() => setFilterRole('manager')}>Managers</button>
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
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Joined Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="user-avatar" style={{ backgroundColor: user.role === 'manager' ? '#eef2ff' : '#f0fdf4' }}>
                                                {(user.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="user-name">{user.name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>{user.email || 'N/A'}</td>
                                    <td>{user.phone || user.phoneNumber || 'N/A'}</td>
                                    <td>
                                        <span className={`role-badge ${user.role || 'user'}`}>
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={() => handleToggleManager(user)}
                                            className={`toggle-role-btn ${user.role === 'manager' ? 'demote' : 'promote'}`}
                                            title={user.role === 'manager' ? 'Demote to User' : 'Promote to Manager'}
                                        >
                                            {user.role === 'manager' ? '⚡ User' : '⭐ Manager'}
                                        </button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="delete-user-btn" title="Delete User">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && filteredUsers.length === 0 && (
                    <div className="empty-state">No users matching your criteria.</div>
                )}
            </div>
        </div>
    );
};

export default Users;
