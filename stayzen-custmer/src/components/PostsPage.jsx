import React from 'react';
import { IoLocationOutline, IoBedOutline, IoWaterOutline, IoCreateOutline, IoTrashOutline, IoAddOutline, IoBusinessOutline, IoPeopleOutline, IoCallOutline, IoMailOutline, IoCloseOutline, IoExpandOutline } from 'react-icons/io5';
import './posts.css';
import './properties.css';
import { subscribeToPosts, deletePost, updatePost, convertToBase64 } from '../services/dataService';

const ImageSlider = ({ images }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const validImages = images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1470&q=80'];

    const goToPrev = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev === 0 ? validImages.length - 1 : prev - 1));
    };

    const goToNext = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev === validImages.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="ps-card-image-slider">
            <div
                className="ps-slider-blur"
                style={{ backgroundImage: `url(${validImages[currentIndex]})` }}
            ></div>
            <div
                className="ps-slider-content"
                style={{ backgroundImage: `url(${validImages[currentIndex]})` }}
            >
                {validImages.length > 1 && (
                    <>
                        <button className="ps-slider-btn prev" onClick={goToPrev}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button className="ps-slider-btn next" onClick={goToNext}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                        <div className="ps-slider-dots">
                            {validImages.map((_, idx) => (
                                <span key={idx} className={`ps-dot ${idx === currentIndex ? 'active' : ''}`} />
                            ))}
                        </div>
                    </>
                )}
                <span className="ps-status-badge vacant">Live</span>
            </div>
        </div>
    );
};

export default function PostsPage({ userId, setActiveTab }) {
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [editingPost, setEditingPost] = React.useState(null);
    const [editForm, setEditForm] = React.useState({});
    const [isSaving, setIsSaving] = React.useState(false);

    const [isUploadingImages, setIsUploadingImages] = React.useState(false);
    const [imagePreviews, setImagePreviews] = React.useState([]);
    const [selectedImages, setSelectedImages] = React.useState([]);
    const imageInputRef = React.useRef(null);

    React.useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToPosts(userId, (data) => {
            setPosts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleDeletePost = async (id, name) => {
        try {
            await deletePost(id);
        } catch (err) {
            console.error("Error deleting post: ", err);
        }
    };

    const handleEditClick = (post) => {
        setEditingPost(post);
        setEditForm({
            propertyType: post.propertyType || 'Apartment',
            managerName: post.managerName || '',
            propertyName: post.propertyName || '',
            contactNumber: post.contactNumber || '',
            email: post.email || '',
            totalUnits: post.totalUnits || '',
            unitType: post.unitType || (post.propertyType === 'Apartment' ? '1BHK' : 'Girls PG'),
            emptyUnits: post.emptyUnits || '',
            roomType: post.roomType || '1x Sharing',
            monthlyRent: post.monthlyRent || '',
            furnitureProvided: post.furnitureProvided || 'Fully-Furnished',
            liftAvailable: post.liftAvailable || 'Yes',
            parkingSpace: post.parkingSpace || 'Yes',
            waterAvailability: post.waterAvailability || 'Yes',
            powerBackup: post.powerBackup || 'Yes',
            cctvSecurity: post.cctvSecurity || 'Yes',
            state: post.state || '',
            city: post.city || '',
            colonyArea: post.colonyArea || '',
            pincode: post.pincode || '',
            googleMapsLink: post.googleMapsLink || '',
            advancePayment: post.advancePayment || '',
            postDetails: post.postDetails || '',
            imageUrls: post.imageUrls || []
        });
        setImagePreviews(post.imageUrls || []);
        setSelectedImages([]); // Reset selected new images
        setIsEditModalOpen(true);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + imagePreviews.length > 8) {
            alert("Maximum 8 images allowed");
            return;
        }

        setSelectedImages(prev => [...prev, ...files]);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEdit = async () => {
        try {
            setIsSaving(true);

            // Handle image processing (ensure all are base64 for storage)
            const finalImages = await Promise.all(
                imagePreviews.map(async (src) => {
                    if (src.startsWith('data:')) return src; // Already base64
                    // If it's a blob URL or remote URL, we need to convert to base64
                    try {
                        const response = await fetch(src);
                        const blob = await response.blob();
                        return await convertToBase64(blob);
                    } catch (e) {
                        return src; // Fallback
                    }
                })
            );

            await updatePost(editingPost.id, {
                ...editForm,
                imageUrls: finalImages
            });
            setIsEditModalOpen(false);
        } catch (err) {
            console.error("Error saving post:", err);
        } finally {
            setIsSaving(false);
            setIsUploadingImages(false);
        }
    };


    return (
        <div className="ps-container">
            <div className="ps-header">
                <div className="ps-header-title">
                    <h2>My Posts</h2>
                    <p>Manage your property listings</p>
                </div>
                <button className="ps-primary-btn" onClick={() => setActiveTab('properties')}>
                    <IoAddOutline size={20} />
                    Add Post
                </button>
            </div>

            <div className="ps-grid">
                {loading ? (
                    <p>Loading posts...</p>
                ) : posts.length > 0 ? (
                    posts.map((post) => (
                        <div key={post.id} className="ps-card">
                            <ImageSlider images={post.imageUrls} />
                            <div className="ps-card-details">
                                <div className="ps-prop-header">
                                    <h3>{post.propertyName}</h3>
                                    <span className="ps-price">₹{post.monthlyRent}<span className="ps-period">/mo</span></span>
                                </div>
                                <p className="ps-location">
                                    <IoLocationOutline size={14} />
                                    {post.colonyArea ? `${post.colonyArea}, ` : ''}{post.city}, {post.state} {post.pincode ? `- ${post.pincode}` : ''}
                                </p>

                                <div className="ps-contact-info">
                                    <div className="ps-info-item">
                                        <IoPeopleOutline size={14} />
                                        <span>{post.managerName}</span>
                                    </div>
                                    <div className="ps-info-item">
                                        <IoCallOutline size={14} />
                                        <span>{post.contactNumber}</span>
                                    </div>
                                    {post.email && (
                                        <div className="ps-info-item">
                                            <IoMailOutline size={14} />
                                            <span>{post.email}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="ps-features">
                                    <div className="ps-feature">
                                        <IoBusinessOutline size={16} />
                                        <span>{post.propertyType}</span>
                                    </div>
                                    <div className="ps-feature">
                                        {post.propertyType === 'Apartment' ? (
                                            <>
                                                <IoBedOutline size={16} />
                                                <span>{post.unitType}</span>
                                            </>
                                        ) : (
                                            <>
                                                <IoPeopleOutline size={16} />
                                                <span>{post.roomType || post.unitType}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="ps-feature">
                                        <IoExpandOutline size={16} />
                                        <span>{post.emptyUnits && post.totalUnits ? `${post.emptyUnits}/${post.totalUnits}` : (post.emptyUnits || post.totalUnits || '0')} Units</span>
                                    </div>
                                </div>

                                {post.googleMapsLink && (
                                    <a href={post.googleMapsLink} target="_blank" rel="noopener noreferrer" className="ps-map-link">
                                        <IoLocationOutline size={14} />
                                        View on Google Maps
                                    </a>
                                )}

                                <div className="ps-card-actions">
                                    <button
                                        className="ps-action-btn edit"
                                        onClick={() => handleEditClick(post)}
                                    >
                                        <IoCreateOutline size={16} />
                                        Edit
                                    </button>
                                    <button
                                        className="ps-action-btn delete"
                                        onClick={() => handleDeletePost(post.id, post.propertyName)}
                                    >
                                        <IoTrashOutline size={16} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="ps-empty" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '16px' }}>
                        <p style={{ color: '#6b7280', fontSize: '16px' }}>You haven't published any posts yet. Go to the Properties tab to publish one!</p>
                    </div>
                )}
            </div>

            {/* Edit Post Modal (Using Publish Property Post Modal Structure) */}
            {isEditModalOpen && (
                <div className="pp-modal-overlay">
                    <div className="pp-modal-content" style={{ width: '700px', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', marginBottom: '60px' }}>
                        <div className="pp-modal-header">
                            <h3>Edit Property Post</h3>
                            <button className="pp-close-btn" onClick={() => setIsEditModalOpen(false)}>
                                <IoCloseOutline size={24} color="#6b7280" />
                            </button>
                        </div>

                        <div className="pp-modal-body">
                            {/* Common Fields with Dynamic Labels */}
                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="pp-form-group">
                                    <label>Property Type</label>
                                    <select name="propertyType" value={editForm.propertyType} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Apartment">Apartment</option>
                                        <option value="PGs">PGs</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>{editForm.propertyType === 'Apartment' ? 'Property Manager Name' : 'PG Manager Name'}</label>
                                    <input type="text" name="managerName" value={editForm.managerName} onChange={handleEditInputChange} className="pp-form-input" placeholder="Ananya Rao" />
                                </div>
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="pp-form-group">
                                    <label>{editForm.propertyType === 'Apartment' ? 'Apartment Name' : 'PG Name'}</label>
                                    <input type="text" name="propertyName" value={editForm.propertyName} onChange={handleEditInputChange} className="pp-form-input" placeholder="Marina Heights" />
                                </div>
                                <div className="pp-form-group">
                                    <label>Contact Number</label>
                                    <input type="text" name="contactNumber" value={editForm.contactNumber} onChange={handleEditInputChange} className="pp-form-input" placeholder="Enter contact number" />
                                </div>
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="pp-form-group">
                                    <label>Email</label>
                                    <input type="email" name="email" value={editForm.email} onChange={handleEditInputChange} className="pp-form-input" placeholder="Enter email address" />
                                </div>
                                <div className="pp-form-group">
                                    {editForm.propertyType === 'Apartment' ? (
                                        <>
                                            <label>How many flats on your Apt</label>
                                            <input type="text" name="totalUnits" value={editForm.totalUnits} onChange={handleEditInputChange} className="pp-form-input" placeholder="Total number of flats" />
                                        </>
                                    ) : (
                                        <>
                                            <label>Total Rooms in your PG</label>
                                            <input type="text" name="totalUnits" value={editForm.totalUnits} onChange={handleEditInputChange} className="pp-form-input" placeholder="Total number of rooms" />
                                        </>
                                    )}
                                </div>
                            </div>

                            {editForm.propertyType === 'Apartment' ? (
                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>Flats Type</label>
                                        <select name="unitType" value={editForm.unitType} onChange={handleEditInputChange} className="pp-form-select">
                                            <option value="1BHK">1 BHK</option>
                                            <option value="2BHK">2 BHK</option>
                                            <option value="3BHK">3 BHK</option>
                                            <option value="All">All</option>
                                        </select>
                                    </div>
                                    <div className="pp-form-group">
                                        <label>Number of empty flats</label>
                                        <input type="number" name="emptyUnits" value={editForm.emptyUnits} onChange={handleEditInputChange} className="pp-form-input" placeholder="Number of empty flats" />
                                    </div>
                                </div>
                            ) : (
                                <div className="pp-form-grid ps-pg-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>PG Type</label>
                                        <select name="unitType" value={editForm.unitType} onChange={handleEditInputChange} className="pp-form-select">
                                            <option value="Girls PG">Girls PG</option>
                                            <option value="Boys PG">Boys PG</option>
                                            <option value="Co-Living">Co-Living</option>
                                        </select>
                                    </div>
                                    <div className="pp-form-group">
                                        <label>PG Rooms Type</label>
                                        <select name="roomType" value={editForm.roomType || 'Sharing'} onChange={handleEditInputChange} className="pp-form-select">
                                            <option value="1x Sharing">1x Sharing</option>
                                            <option value="2x Sharing">2x Sharing</option>
                                            <option value="3x Sharing">3x Sharing</option>
                                            <option value="4x Sharing">4x Sharing</option>
                                        </select>
                                    </div>
                                    <div className="pp-form-group">
                                        <label>Total Vacant<br/>Rooms</label>
                                        <input type="number" name="emptyUnits" value={editForm.emptyUnits} onChange={handleEditInputChange} className="pp-form-input" placeholder="Available rooms" />
                                    </div>
                                </div>
                            )}

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="pp-form-group">
                                    <label>Monthly Rent</label>
                                    <input type="text" name="monthlyRent" value={editForm.monthlyRent} onChange={handleEditInputChange} className="pp-form-input" placeholder="Enter monthly rent (₹)" />
                                </div>
                                <div className="pp-form-group">
                                    <label>Furniture provided or not?</label>
                                    <select name="furnitureProvided" value={editForm.furnitureProvided} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Fully-Furnished">Fully-Furnished</option>
                                        <option value="Semi-Furnished">Semi-Furnished</option>
                                        <option value="Unfurnished">Unfurnished</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                                <div className="pp-form-group">
                                    <label>Apartment/PG providing a lift?</label>
                                    <select name="liftAvailable" value={editForm.liftAvailable} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Parking space?</label>
                                    <select name="parkingSpace" value={editForm.parkingSpace} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                                <div className="pp-form-group">
                                    <label>24/7 Water Availability?</label>
                                    <select name="waterAvailability" value={editForm.waterAvailability} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Power Backup?</label>
                                    <select name="powerBackup" value={editForm.powerBackup} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                                <div className="pp-form-group">
                                    <label>CCTV Security?</label>
                                    <select name="cctvSecurity" value={editForm.cctvSecurity} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    {/* Placeholder */}
                                </div>
                            </div>

                            {/* Image Upload UI */}
                            <div className="pp-form-group" style={{ marginTop: '20px' }}>
                                <label>Property Images (Min 1, Max 8)</label>
                                <div style={{
                                    border: '2px dashed #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '30px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: '#f9fafb',
                                    marginTop: '8px',
                                    transition: 'border-color 0.2s'
                                }}
                                    onClick={() => imageInputRef.current?.click()}
                                >
                                    <div style={{ color: '#1aa79c', marginBottom: '8px' }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                    </div>
                                    <p style={{ fontWeight: '600', color: '#374151', margin: '0' }}>Click to upload more images</p>
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>PNG, JPG or JPEG (max 8 images total)</p>
                                    <input
                                        type="file"
                                        ref={imageInputRef}
                                        multiple
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleImageChange}
                                    />
                                </div>

                                {imagePreviews.length > 0 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '15px' }}>
                                        {imagePreviews.map((url, idx) => (
                                            <div key={idx} style={{ position: 'relative', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                <img src={url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#f1f5f9' }} />
                                                <button
                                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImagePreviews(prev => prev.filter((_, i) => i !== idx));
                                                    }}
                                                >
                                                    <IoCloseOutline size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                <div className="pp-form-group">
                                    <label>Advance Payment Details</label>
                                    <input type="text" name="advancePayment" value={editForm.advancePayment} onChange={handleEditInputChange} className="pp-form-input" placeholder="e.g. 1 Month Rent" />
                                </div>
                                <div className="pp-form-group">
                                    <label>Property Location</label>
                                    <input type="text" name="googleMapsLink" value={editForm.googleMapsLink} onChange={handleEditInputChange} className="pp-form-input" placeholder="Paste Google Maps Link" />
                                </div>
                            </div>

                            <div className="pp-form-group" style={{ marginTop: '20px' }}>
                                <label>Post Description / Details</label>
                                <textarea
                                    name="postDetails"
                                    value={editForm.postDetails}
                                    onChange={handleEditInputChange}
                                    className="pp-form-input"
                                    placeholder="Enter detailed description for customers..."
                                    style={{ height: '100px', resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        <div className="pp-modal-footer">
                            <button className="pp-secondary-btn" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>Cancel</button>
                            <button className="pp-primary-btn" disabled={isSaving} onClick={handleSaveEdit}>
                                {isSaving ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Adjustment Modal */}
        </div>
    );
}
