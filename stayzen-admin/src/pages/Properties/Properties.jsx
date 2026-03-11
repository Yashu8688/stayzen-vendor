import React, { useState, useEffect } from 'react';
import './Properties.css';
import { db } from '../../firebase';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Search, Check, X, Eye, MapPin, Building2, Phone, Mail, Globe, Layers, Calendar } from 'lucide-react';

const Properties = () => {
    const [activeTab, setActiveTab] = useState('Processing');
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        setLoading(true);
        // Simplified query to ensure it works even if indexes aren't ready or createdAt is missing
        const q = query(collection(db, 'properties'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const propsData = [];
            querySnapshot.forEach((doc) => {
                propsData.push({ id: doc.id, ...doc.data() });
            });

            // Sort manually in memory to avoid index requirements
            propsData.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                return dateB - dateA;
            });

            setProperties(propsData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore error:", error);
            setProperties([]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleStatusUpdate = async (propertyId, newStatus) => {
        try {
            const propertyRef = doc(db, 'properties', propertyId);
            const propertySnapshot = properties.find(p => p.id === propertyId);

            await updateDoc(propertyRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });

            if (propertySnapshot) {
                // Determine target user UID for notification (prioritize ownerId/userId)
                const targetId = propertySnapshot.ownerId || propertySnapshot.userId || propertySnapshot.authEmail || propertySnapshot.email;

                if (targetId) {
                    await addDoc(collection(db, 'notifications'), {
                        type: 'PROPERTY_STATUS',
                        title: `Property ${newStatus}`,
                        message: `Your property "${propertySnapshot.name}" has been ${newStatus.toLowerCase()} by the admin.`,
                        targetId: targetId,
                        propertyId: propertyId,
                        status: 'unread',
                        createdAt: new Date().toISOString()
                    });
                }

                // 📧 Trigger Approval/Rejection Email
                if (propertySnapshot.email) {
                    const isApproved = newStatus === 'Approved';
                    await addDoc(collection(db, 'mail'), {
                        to: propertySnapshot.email,
                        message: {
                            subject: isApproved
                                ? `Good News! Your ${propertySnapshot.type} is Approved`
                                : `Update regarding your ${propertySnapshot.type} registration`,
                            html: `
                                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                    <h2 style="color: ${isApproved ? '#1aa79c' : '#ef4444'};">
                                        Hello ${propertySnapshot.manager},
                                    </h2>
                                    <p>Your ${propertySnapshot.type} <strong>"${propertySnapshot.name}"</strong> has been <strong>${newStatus.toLowerCase()}</strong> by the admin.</p>
                                    ${isApproved
                                    ? `<p>You can now log in to your dashboard and start posting your property. Happy hosting!</p>`
                                    : `<p>Please contact support if you have any questions regarding this decision.</p>`
                                }
                                    <br>
                                    <p>Best regards,<br>The StayZen Team</p>
                                </div>
                            `,
                        }
                    });
                }
            }
            if (showModal) setShowModal(false);
        } catch (error) {
            console.error("Status update error:", error);
        }
    };

    const handleViewDetails = (property) => {
        setSelectedProperty(property);
        setShowModal(true);
    };

    const filteredProperties = properties.filter(p => p.status === activeTab);

    return (
        <div className="properties-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Property Listings</h1>
                    <p>Review and manage property registrations from managers.</p>
                </div>
                <div className="header-actions">
                    <div className="local-search">
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Filter by name or manager..." />
                    </div>
                </div>
            </div>

            <div className="tabs-container">
                <button className={`tab-btn ${activeTab === 'Processing' ? 'active' : ''}`} onClick={() => setActiveTab('Processing')}>
                    Processing <span>({properties.filter(p => p.status === 'Processing').length})</span>
                </button>
                <button className={`tab-btn ${activeTab === 'Approved' ? 'active' : ''}`} onClick={() => setActiveTab('Approved')}>
                    Approved
                </button>
                <button className={`tab-btn ${activeTab === 'Rejected' ? 'active' : ''}`} onClick={() => setActiveTab('Rejected')}>
                    Rejected
                </button>
            </div>

            <div className="properties-table-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <span>Syncing properties...</span>
                    </div>
                ) : (
                    <table className="properties-table">
                        <thead>
                            <tr>
                                <th>Property Name</th>
                                <th>Manager</th>
                                <th>Type</th>
                                <th>Rent / Units</th>
                                <th>Location</th>
                                <th>Date Filed</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProperties.map(prop => (
                                <tr key={prop.id} className="property-row">
                                    <td>
                                        <div className="prop-name-cell">
                                            <div className="prop-avatar">
                                                <Building2 size={16} />
                                            </div>
                                            <span className="prop-name">{prop.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="manager-name">{prop.manager}</span>
                                    </td>
                                    <td>
                                        <span className="badge-type">{prop.type}</span>
                                    </td>
                                    <td>
                                        <div className="rent-units">
                                            <div className="rent-text">₹{prop.rent}</div>
                                            <div className="units-text">{prop.units} Units</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="location-cell">
                                            <MapPin size={12} className="loc-icon" />
                                            <span className="location-text">
                                                {prop.city || prop.address?.city || 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="date-text">{prop.createdAt ? new Date(prop.createdAt).toLocaleDateString() : 'N/A'}</span>
                                    </td>
                                    <td>
                                        <div className="action-btns">
                                            {prop.status !== 'Approved' && (
                                                <button
                                                    className="action-icon-btn approve"
                                                    title="Approve"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusUpdate(prop.id, 'Approved');
                                                    }}
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                            {prop.status !== 'Rejected' && (
                                                <button
                                                    className="action-icon-btn reject"
                                                    title="Reject"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusUpdate(prop.id, 'Rejected');
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                            <button className="view-details-btn" onClick={() => handleViewDetails(prop)}>
                                                <Eye size={16} />
                                                <span>View</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && filteredProperties.length === 0 && (
                    <div className="empty-state">
                        <Building2 size={48} className="empty-icon" />
                        <p>No {activeTab.toLowerCase()} properties at the moment.</p>
                    </div>
                )}
            </div>

            {showModal && selectedProperty && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="details-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-modern">
                            <div className="header-left-group">
                                <h2>Property Registration Details</h2>
                                <div className="header-status-line">
                                    <span className={`modern-badge ${selectedProperty.status.toLowerCase()}`}>
                                        <span className="status-dot"></span>
                                        {selectedProperty.status}
                                    </span>
                                    <span className="id-tag">
                                        ID: {selectedProperty.id.substring(0, 8).toUpperCase()} • {selectedProperty.createdAt ? new Date(selectedProperty.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <button className="modern-close-btn" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body-modern">
                            <div className="modern-main-pane">
                                <section>
                                    <div className="modern-section-label">
                                        <Building2 size={15} />
                                        Registration Overview
                                    </div>
                                    <div className="modern-grid">
                                        <div className="modern-info-card">
                                            <label>PROPERTY NAME</label>
                                            <p>{selectedProperty.name}</p>
                                        </div>
                                        <div className="modern-info-card">
                                            <label>MANAGED BY</label>
                                            <p>{selectedProperty.manager}</p>
                                        </div>
                                        <div className="modern-info-card">
                                            <label>PROPERTY TYPE</label>
                                            <p className="highlight-text">{selectedProperty.type}</p>
                                        </div>
                                        <div className="modern-info-card">
                                            <label>LISTING RENT</label>
                                            <p className="bold-text">₹{selectedProperty.rent}</p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <div className="modern-section-label">
                                        <MapPin size={15} />
                                        Physical Location
                                    </div>
                                    <div className="map-hero-box">
                                        <div className="map-hero-text">
                                            <h4>Verified Property Address</h4>
                                            <p>{selectedProperty.city}, {selectedProperty.state || ''}</p>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProperty.name + ' ' + selectedProperty.city)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="premium-map-btn"
                                        >
                                            <Globe size={18} />
                                            View on Maps
                                        </a>
                                    </div>
                                </section>
                            </div>

                            <div className="modern-side-pane">
                                <section>
                                    <div className="modern-section-label">Point of Contact</div>
                                    <div className="contacts-list">
                                        <div className="icon-stat">
                                            <div className="icon-wrapper"><Phone size={18} /></div>
                                            <div className="stat-info">
                                                <label>DIRECT LINE</label>
                                                <span>{selectedProperty.contactNumber}</span>
                                            </div>
                                        </div>
                                        <div className="icon-stat">
                                            <div className="icon-wrapper"><Mail size={18} /></div>
                                            <div className="stat-info">
                                                <label>EMAIL ADDRESS</label>
                                                <span>{selectedProperty.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="specs-section">
                                    <div className="modern-section-label">Property Specs</div>
                                    <div className="specs-grid">
                                        <div className="modern-info-card mini">
                                            <label>UNITS</label>
                                            <p>{selectedProperty.units}</p>
                                        </div>
                                        {selectedProperty.features ? Object.entries(selectedProperty.features).map(([k, v]) => (
                                            <div key={k} className="modern-info-card mini">
                                                <label>{k.toUpperCase()}</label>
                                                <p>{v}</p>
                                            </div>
                                        )) : (
                                            <div className="no-specs">No extra specs</div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="premium-footer">
                            <button className="modern-btn close" onClick={() => setShowModal(false)}>Close View</button>
                            <div className="action-group">
                                {selectedProperty.status !== 'Rejected' && (
                                    <button className="modern-btn reject" onClick={() => handleStatusUpdate(selectedProperty.id, 'Rejected')}>Reject Listing</button>
                                )}
                                {selectedProperty.status !== 'Approved' && (
                                    <button className="modern-btn approve" onClick={() => handleStatusUpdate(selectedProperty.id, 'Approved')}>Approve & List</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Properties;
