import React, { useState, useEffect } from 'react';
import './Bookings.css';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import {
    Search,
    Filter,
    Download,
    User,
    Building2,
    Calendar,
    Phone,
    MapPin,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    SearchX
} from 'lucide-react';

const Bookings = () => {
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                displayId: doc.id.substring(0, 8).toUpperCase()
            }));
            setBookings(data);
            setLoading(false);
        }, (error) => {
            console.error("Bookings Fetch Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredBookings = bookings.filter(b => {
        const matchesFilter = filter === 'all' || (b.status || 'Upcoming').toLowerCase() === filter.toLowerCase();
        const matchesSearch =
            (b.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusIcon = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'completed': return <CheckCircle2 size={14} />;
            case 'cancelled': return <XCircle size={14} />;
            case 'pending':
            case 'processing': return <Clock size={14} />;
            default: return <Calendar size={14} />;
        }
    };

    return (
        <div className="bookings-view animated-view">
            {/* 1. Header Section */}
            <div className="bookings-header-wrap">
                <div className="header-left">
                    <h1 className="view-title">Ledger & Orchestration</h1>
                    <p className="view-subtitle">Monitor system-wide stay transitions and financial settlement.</p>
                </div>
                <div className="header-right">
                    <button className="export-action-btn">
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                    <button className="primary-action-btn">
                        <span>+ Manual Manifest</span>
                    </button>
                </div>
            </div>

            {/* 2. Controls Section */}
            <div className="bookings-controls-panel">
                <div className="search-group">
                    <div className="search-pill">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by ID, Property or User..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="filter-group">
                    {['all', 'upcoming', 'processing', 'completed', 'cancelled'].map((f) => (
                        <button
                            key={f}
                            className={`filter-pill ${filter === f ? 'active' : f}`}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. Data Table Section */}
            <div className="bookings-table-container">
                {loading ? (
                    <div className="loading-state-view">
                        <div className="vial-spinner"></div>
                        <span>Synchronizing Ledger...</span>
                    </div>
                ) : filteredBookings.length > 0 ? (
                    <table className="bookings-data-table">
                        <thead>
                            <tr>
                                <th><div className="th-cell">Reference <ArrowUpDown size={12} /></div></th>
                                <th><div className="th-cell">Asset Identity</div></th>
                                <th><div className="th-cell">User Profile</div></th>
                                <th><div className="th-cell">Stay Flow</div></th>
                                <th><div className="th-cell">Settlement</div></th>
                                <th><div className="th-cell">Status</div></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBookings.map(booking => (
                                <tr key={booking.id} className="booking-tr">
                                    <td className="td-id" data-label="Reference #">
                                        <div className="id-vial">#{booking.displayId}</div>
                                    </td>
                                    <td data-label="Asset Identity">
                                        <div className="asset-vial">
                                            <div className="asset-icon"><Building2 size={16} /></div>
                                            <div className="asset-info">
                                                <span className="asset-name">{booking.propertyName}</span>
                                                <span className="asset-loc"><MapPin size={10} /> Virtual Node</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="User Profile">
                                        <div className="user-vial">
                                            <span className="user-main">{booking.userName}</span>
                                            <span className="user-sub"><Phone size={10} /> {booking.userPhone}</span>
                                        </div>
                                    </td>
                                    <td data-label="Stay Flow">
                                        <div className="stay-vial">
                                            <span className="stay-type">{booking.stayType || 'Bachelor'}</span>
                                            <span className="stay-meta">{booking.gender} · {booking.occupation}</span>
                                        </div>
                                    </td>
                                    <td className="td-amount" data-label="Settlement">
                                        <div className="amount-wrap">
                                            <span className="currency">₹</span>
                                            <span className="val">{booking.rent}</span>
                                        </div>
                                    </td>
                                    <td data-label="Status">
                                        <div className={`status-vial status-${(booking.status || 'Upcoming').toLowerCase()}`}>
                                            {getStatusIcon(booking.status)}
                                            <span>{booking.status || 'Upcoming'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state-view">
                        <div className="empty-icon"><SearchX size={48} /></div>
                        <h3>Zero Matches Found</h3>
                        <p>Adjust your filters or search term to locate the booking record.</p>
                        <button className="reset-view-btn" onClick={() => { setFilter('all'); setSearchTerm(''); }}>Reset All Filters</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Bookings;
