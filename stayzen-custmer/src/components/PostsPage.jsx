import React from 'react';
import { IoLocationOutline, IoBedOutline, IoWaterOutline, IoCreateOutline, IoTrashOutline, IoAddOutline, IoBusinessOutline, IoPeopleOutline, IoCallOutline, IoMailOutline, IoCloseOutline, IoExpandOutline, IoInformationCircleOutline, IoListOutline, IoShieldCheckmarkOutline, IoImageOutline } from 'react-icons/io5';
import './posts.css';
import './properties.css';
import { subscribeToPosts, deletePost, updatePost, uploadImage, compressImage } from '../services/dataService';

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
    const rowInputRef = React.useRef(null);

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
            propertyType: post.propertyType || post.type || 'Apartment',
            managerName: post.managerName || post.manager || '',
            propertyName: post.propertyName || post.name || '',
            contactNumber: post.contactNumber || '',
            email: post.email || '',
            totalUnits: post.totalUnits || post.units || '',
            unitType: post.unitType || (post.propertyType === 'Apartment' ? '1BHK' : 'Girls PG'),
            emptyUnits: post.emptyUnits || '',
            roomType: post.roomType || '1x Sharing',
            monthlyRent: post.monthlyRent || '',
            furnitureProvided: post.furnitureProvided || 'Semi-Furnished',
            liftAvailable: post.liftAvailable || 'Yes',
            parkingSpace: post.parkingSpace || 'Yes',
            waterAvailability: post.waterAvailability || 'Yes',
            powerBackup: post.powerBackup || 'Yes',
            cctvSecurity: post.cctvSecurity || 'Yes',
            wifiAvailable: post.wifiAvailable || 'No',
            individualCooking: post.individualCooking || 'No',
            isProvidingAC: post.isProvidingAC || 'No',
            state: post.state || '',
            city: post.city || '',
            colonyArea: post.colonyArea || '',
            pincode: post.pincode || '',
            googleMapsLink: post.googleMapsLink || '',
            advancePayment: post.advancePayment || '',
            rentType: post.rentType || 'Monthly',
            dailyRent: post.dailyRent || '',
            weeklyRent: post.weeklyRent || '',
            postDetails: post.postDetails || '',
            imageUrls: post.imageUrls || [],
            bhkAllocations: (post.bhkAllocations || []).map(a => ({ ...a, advancePayment: a.advancePayment || post.advancePayment || '' })),
            roomConfigurations: (post.roomConfigurations || []).map(c => ({ ...c, advancePayment: c.advancePayment || post.advancePayment || '' }))
        });

        // Initialize previews from existing image URLs if they exist in allocations
        if (post.bhkAllocations) {
            post.bhkAllocations.forEach(alloc => {
                if (alloc.imageUrls && !alloc.imagePreviews) {
                    alloc.imagePreviews = [...alloc.imageUrls];
                }
            });
        }
        if (post.roomConfigurations) {
            post.roomConfigurations.forEach(conf => {
                if (conf.imageUrls && !conf.imagePreviews) {
                    conf.imagePreviews = [...conf.imageUrls];
                }
            });
        }

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

    const handleRowImageChange = (e, type, idx) => {
        const files = Array.from(e.target.files);
        setEditForm(prev => {
            const list = type === 'bhk' ? [...prev.bhkAllocations] : [...prev.roomConfigurations];
            const currentImages = list[idx].images || [];
            const currentPreviews = list[idx].imagePreviews || [];

            if (files.length + currentImages.length > 8) {
                alert("Maximum 8 images per configuration allowed.");
                return prev;
            }

            list[idx].images = [...currentImages, ...files];
            list[idx].imagePreviews = [...currentPreviews, ...files.map(f => URL.createObjectURL(f))];

            return { ...prev, [type === 'bhk' ? 'bhkAllocations' : 'roomConfigurations']: list };
        });
    };

    const handleRemoveRowImage = (type, rowIdx, imgIdx) => {
        setEditForm(prev => {
            const list = type === 'bhk' ? [...prev.bhkAllocations] : [...prev.roomConfigurations];

            // Handle both new files and existing URLs
            const newImages = (list[rowIdx].images || []).filter((_, i) => i !== imgIdx);
            const newPreviews = (list[rowIdx].imagePreviews || []).filter((_, i) => i !== imgIdx);

            // If it was an existing URL, we might need to update imageUrls too
            const existingUrl = list[rowIdx].imagePreviews[imgIdx];
            if (existingUrl && !existingUrl.startsWith('blob:') && !existingUrl.startsWith('data:')) {
                list[rowIdx].imageUrls = (list[rowIdx].imageUrls || []).filter(url => url !== existingUrl);
            }

            list[rowIdx].images = newImages;
            list[rowIdx].imagePreviews = newPreviews;

            return { ...prev, [type === 'bhk' ? 'bhkAllocations' : 'roomConfigurations']: list };
        });
    };

    const handleSaveEdit = async () => {
        const isApartment = editForm.propertyType === 'Apartment';
        const isPG = editForm.propertyType === 'PGs' || editForm.propertyType === 'PG' || editForm.propertyType.toUpperCase().includes('PG');

        if (isApartment) {
            if (editForm.bhkAllocations && editForm.bhkAllocations.some(a => !a.advancePayment)) {
                alert("Advance payment is mandatory for all BHK allocations.");
                return;
            }
        } else if (isPG) {
            if (editForm.roomConfigurations && editForm.roomConfigurations.some(c => !c.advancePayment)) {
                alert("Advance payment is mandatory for all room configurations.");
                return;
            }
        } else {
            // Room or others
            if (!editForm.advancePayment && editForm.rentType === 'Monthly') {
                alert("Advance payment is mandatory.");
                return;
            }
        }

        try {
            setIsSaving(true);

            // 1. Helper for image upload (handle both new Files and old URLs)
            const uploadSingleImage = async (src, idx) => {
                // If it's already a Firebase Storage URL, keep it
                if (src && src.startsWith('http') && src.includes('firebasestorage')) {
                    return src;
                }

                // If it's a blob/data URL, it needs to be uploaded
                if (src && (src.startsWith('blob:') || src.startsWith('data:'))) {
                    try {
                        const response = await fetch(src);
                        const blob = await response.blob();
                        const compressedBlob = await compressImage(blob);
                        return await uploadImage(compressedBlob, `prop_${Date.now()}_${idx}.jpg`, 'posts');
                    } catch (e) {
                        console.error("Upload error:", e);
                        return null;
                    }
                }
                return null;
            };

            // 2. Process Global Images
            const finalGlobalImages = await Promise.all(
                imagePreviews.map((src, idx) => uploadSingleImage(src, idx))
            );

            // 3. Process Per-Configuration Images
            const isApartment = editForm.propertyType === 'Apartment';
            const isPG = editForm.propertyType === 'PGs' || editForm.propertyType === 'PG';

            let finalBhkAllocations = [];
            if (isApartment && editForm.bhkAllocations) {
                finalBhkAllocations = await Promise.all(editForm.bhkAllocations.map(async (alloc) => {
                    const urls = await Promise.all(
                        (alloc.imagePreviews || []).map((src, idx) => uploadSingleImage(src, idx))
                    );
                    const { images, imagePreviews, ...rest } = alloc;
                    return { ...rest, imageUrls: urls.filter(u => u != null) };
                }));
            }

            let finalRoomConfigurations = [];
            if (isPG && editForm.roomConfigurations) {
                finalRoomConfigurations = await Promise.all(editForm.roomConfigurations.map(async (conf) => {
                    const urls = await Promise.all(
                        (conf.imagePreviews || []).map((src, idx) => uploadSingleImage(src, idx))
                    );
                    const { images, imagePreviews, ...rest } = conf;
                    return { ...rest, imageUrls: urls.filter(u => u != null) };
                }));
            }

            // 4. Update the post with cleaned data (remove all File objects/previews)
            const {
                images,
                imagePreviews,
                bhkAllocations,
                roomConfigurations,
                ...cleanEditForm
            } = editForm;

            await updatePost(editingPost.id, {
                ...cleanEditForm,
                imageUrls: finalGlobalImages.filter(url => url !== null),
                bhkAllocations: isApartment ? finalBhkAllocations : null,
                roomConfigurations: isPG ? finalRoomConfigurations : null,
            });

            setIsEditModalOpen(false);
        } catch (err) {
            console.error("Error saving post:", err);
            alert("Error saving changes. Please try again.");
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
                            {/* Section 1: Basic Info */}
                            <div className="pp-modal-section-title">
                                <IoInformationCircleOutline size={16} />
                                Property & Manager Details
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="pp-form-group">
                                    <label>Property Type</label>
                                    <select name="propertyType" value={editForm.propertyType} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Apartment">Apartment</option>
                                        <option value="PG">PGs</option>
                                        <option value="Room">Room (Hotel)</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>{editForm.propertyType === 'Apartment' ? 'Property Manager Name' : (editForm.propertyType === 'Room' ? 'Hotel Manager Name' : 'PG Manager Name')}</label>
                                    <input type="text" name="managerName" value={editForm.managerName} onChange={handleEditInputChange} className="pp-form-input" />
                                </div>
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="pp-form-group">
                                    <label>{editForm.propertyType === 'Apartment' ? 'Apartment Name' : (editForm.propertyType === 'Room' ? 'Hotel Name' : 'PG Name')}</label>
                                    <input type="text" name="propertyName" value={editForm.propertyName} onChange={handleEditInputChange} className="pp-form-input" />
                                </div>
                                <div className="pp-form-group">
                                    <label>Contact Number</label>
                                    <input type="text" name="contactNumber" value={editForm.contactNumber} onChange={handleEditInputChange} className="pp-form-input" />
                                </div>
                            </div>

                            <div className="pp-form-group">
                                <label>Email Address</label>
                                <input type="email" name="email" value={editForm.email} onChange={handleEditInputChange} className="pp-form-input" />
                            </div>

                            {/* Section 2: Specifications & Allocations */}
                            <div className="pp-modal-section-title">
                                <IoListOutline size={16} />
                                Property Specifications & Types
                            </div>

                            {editForm.propertyType === 'Room' ? (
                                <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="pp-form-group">
                                        <label>ROOM TYPE</label>
                                        <select name="roomType" value={editForm.roomType} onChange={handleEditInputChange} className="pp-form-select">
                                            <option value="1 bed">1 bed</option>
                                            <option value="2 bed">2 bed</option>
                                            <option value="3 bed">3 bed</option>
                                            <option value="Custom">Custom</option>
                                        </select>
                                    </div>
                                    <div className="pp-form-group">
                                        <label>Available Rooms</label>
                                        <input type="number" name="emptyUnits" value={editForm.emptyUnits} onChange={handleEditInputChange} className="pp-form-input" />
                                    </div>
                                </div>
                            ) : editForm.propertyType === 'Apartment' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="pp-form-group">
                                            <label>Total Flats</label>
                                            <input type="number" name="totalUnits" value={editForm.totalUnits} onChange={handleEditInputChange} className="pp-form-input" />
                                        </div>
                                        <div className="pp-form-group">
                                            <label>Vacant Flats</label>
                                            <input type="number" name="emptyUnits" value={editForm.emptyUnits} onChange={handleEditInputChange} className="pp-form-input" />
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', margin: 0 }}>BHK ALLOCATION</label>
                                            <button
                                                type="button"
                                                className="ps-action-btn edit"
                                                style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}
                                                onClick={() => {
                                                    const newAllocs = [...(editForm.bhkAllocations || [])];
                                                    newAllocs.push({ bhkType: '1BHK', count: '', pricePerUnit: '', rentType: 'Monthly', advancePayment: '', images: [], imagePreviews: [] });
                                                    setEditForm({ ...editForm, bhkAllocations: newAllocs });
                                                }}
                                            >
                                                <IoAddOutline size={14} /> Add Type
                                            </button>
                                        </div>

                                        {(editForm.bhkAllocations || []).map((alloc, idx) => (
                                            <div key={idx} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>BHK</label>
                                                        <select
                                                            value={alloc.bhkType}
                                                            onChange={(e) => {
                                                                const list = [...editForm.bhkAllocations];
                                                                list[idx].bhkType = e.target.value;
                                                                setEditForm({ ...editForm, bhkAllocations: list });
                                                            }}
                                                            className="pp-form-select"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        >
                                                            <option value="Studio">Studio</option>
                                                            <option value="1BHK">1BHK</option>
                                                            <option value="2BHK">2BHK</option>
                                                            <option value="3BHK">3BHK</option>
                                                            <option value="4BHK">4BHK</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>QTY</label>
                                                        <input
                                                            type="number"
                                                            value={alloc.count}
                                                            onChange={(e) => {
                                                                const list = [...editForm.bhkAllocations];
                                                                list[idx].count = e.target.value;
                                                                setEditForm({ ...editForm, bhkAllocations: list });
                                                            }}
                                                            className="pp-form-input"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>RENT</label>
                                                        <input
                                                            type="number"
                                                            value={alloc.pricePerUnit}
                                                            onChange={(e) => {
                                                                const list = [...editForm.bhkAllocations];
                                                                list[idx].pricePerUnit = e.target.value;
                                                                setEditForm({ ...editForm, bhkAllocations: list });
                                                            }}
                                                            className="pp-form-input"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>PER</label>
                                                        <select
                                                            value={alloc.rentType}
                                                            onChange={(e) => {
                                                                const list = [...editForm.bhkAllocations];
                                                                list[idx].rentType = e.target.value;
                                                                setEditForm({ ...editForm, bhkAllocations: list });
                                                            }}
                                                            className="pp-form-select"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        >
                                                            <option value="Monthly">Monthly</option>
                                                            <option value="Weekly">Weekly</option>
                                                            <option value="Daily">Daily</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>ADVANCE</label>
                                                        <input
                                                            type="text"
                                                            value={alloc.advancePayment}
                                                            onChange={(e) => {
                                                                const list = [...editForm.bhkAllocations];
                                                                list[idx].advancePayment = e.target.value;
                                                                setEditForm({ ...editForm, bhkAllocations: list });
                                                            }}
                                                            className="pp-form-input"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                            placeholder="Advance"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const list = editForm.bhkAllocations.filter((_, i) => i !== idx);
                                                            setEditForm({ ...editForm, bhkAllocations: list });
                                                        }}
                                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer', marginTop: '18px' }}
                                                    >
                                                        <IoTrashOutline size={14} />
                                                    </button>
                                                </div>

                                                {/* Images for this BHK Row */}
                                                <div style={{ marginTop: '10px', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }}>IMAGES</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => rowInputRef.current?.click()}
                                                            style={{ background: 'var(--pp-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}
                                                        >
                                                            Add
                                                        </button>
                                                        <input
                                                            type="file"
                                                            ref={rowInputRef}
                                                            multiple
                                                            accept="image/*"
                                                            style={{ display: 'none' }}
                                                            onChange={(e) => handleRowImageChange(e, 'bhk', idx)}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                                                        {(alloc.imagePreviews || []).map((url, imgIdx) => (
                                                            <div key={imgIdx} style={{ position: 'relative', flex: '0 0 50px', height: '50px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <img src={url} alt="BHK" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRowImage('bhk', idx, imgIdx)}
                                                                    style={{ position: 'absolute', top: '1px', right: '1px', background: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', borderRadius: '2px', padding: '1px' }}
                                                                >
                                                                    <IoCloseOutline size={10} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="pp-form-group">
                                            <label>PG Type</label>
                                            <select name="unitType" value={editForm.unitType} onChange={handleEditInputChange} className="pp-form-select">
                                                <option value="Girls PG">Girls PG</option>
                                                <option value="Boys PG">Boys PG</option>
                                                <option value="Co-Living">Co-Living</option>
                                            </select>
                                        </div>
                                        <div className="pp-form-group">
                                            <label>Total Rooms</label>
                                            <input type="number" name="totalUnits" value={editForm.totalUnits} onChange={handleEditInputChange} className="pp-form-input" />
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', margin: 0 }}>ROOM CONFIGURATIONS</label>
                                            <button
                                                type="button"
                                                className="ps-action-btn edit"
                                                style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}
                                                onClick={() => {
                                                    const newConfs = [...(editForm.roomConfigurations || [])];
                                                    newConfs.push({ type: '1x Sharing', customType: '', count: '', rentType: 'Monthly', rentAmount: '', advancePayment: '', images: [], imagePreviews: [] });
                                                    setEditForm({ ...editForm, roomConfigurations: newConfs });
                                                }}
                                            >
                                                <IoAddOutline size={14} /> Add Type
                                            </button>
                                        </div>

                                        {(editForm.roomConfigurations || []).map((conf, idx) => (
                                            <div key={idx} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>SHARING</label>
                                                        <select
                                                            value={conf.type}
                                                            onChange={(e) => {
                                                                const list = [...editForm.roomConfigurations];
                                                                list[idx].type = e.target.value;
                                                                setEditForm({ ...editForm, roomConfigurations: list });
                                                            }}
                                                            className="pp-form-select"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        >
                                                            <option value="1x Sharing">1x Sharing</option>
                                                            <option value="2x Sharing">2x Sharing</option>
                                                            <option value="3x Sharing">3x Sharing</option>
                                                            <option value="4x Sharing">4x Sharing</option>
                                                            <option value="Custom">Custom</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>PER</label>
                                                        <select
                                                            value={conf.rentType}
                                                            onChange={(e) => {
                                                                const list = [...editForm.roomConfigurations];
                                                                list[idx].rentType = e.target.value;
                                                                setEditForm({ ...editForm, roomConfigurations: list });
                                                            }}
                                                            className="pp-form-select"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        >
                                                            <option value="Monthly">Monthly</option>
                                                            <option value="Weekly">Weekly</option>
                                                            <option value="Daily">Daily</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>ROOMS</label>
                                                        <input
                                                            type="number"
                                                            value={conf.count}
                                                            onChange={(e) => {
                                                                const list = [...editForm.roomConfigurations];
                                                                list[idx].count = e.target.value;
                                                                setEditForm({ ...editForm, roomConfigurations: list });
                                                            }}
                                                            className="pp-form-input"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>AMOUNT</label>
                                                        <input
                                                            type="text"
                                                            value={conf.rentAmount}
                                                            onChange={(e) => {
                                                                const list = [...editForm.roomConfigurations];
                                                                list[idx].rentAmount = e.target.value;
                                                                setEditForm({ ...editForm, roomConfigurations: list });
                                                            }}
                                                            className="pp-form-input"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                            placeholder="Rent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '10px', color: '#64748b' }}>ADVANCE</label>
                                                        <input
                                                            type="text"
                                                            value={conf.advancePayment}
                                                            onChange={(e) => {
                                                                const list = [...editForm.roomConfigurations];
                                                                list[idx].advancePayment = e.target.value;
                                                                setEditForm({ ...editForm, roomConfigurations: list });
                                                            }}
                                                            className="pp-form-input"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                            placeholder="Advance"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const list = editForm.roomConfigurations.filter((_, i) => i !== idx);
                                                            setEditForm({ ...editForm, roomConfigurations: list });
                                                        }}
                                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer', marginTop: '18px' }}
                                                    >
                                                        <IoTrashOutline size={14} />
                                                    </button>
                                                </div>

                                                {/* Images for this Room Row */}
                                                <div style={{ marginTop: '10px', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }}>IMAGES</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => rowInputRef.current?.click()}
                                                            style={{ background: 'var(--pp-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                                                        {(conf.imagePreviews || []).map((url, imgIdx) => (
                                                            <div key={imgIdx} style={{ position: 'relative', flex: '0 0 50px', height: '50px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <img src={url} alt="Room" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRowImage('room', idx, imgIdx)}
                                                                    style={{ position: 'absolute', top: '1px', right: '1px', background: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', borderRadius: '2px', padding: '1px' }}
                                                                >
                                                                    <IoCloseOutline size={10} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 3: Amenities & Rules */}
                            <div className="pp-modal-section-title" style={{ marginTop: '20px' }}>
                                <IoShieldCheckmarkOutline size={16} />
                                Amenities & Policy
                            </div>

                            <div className="pp-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div className="pp-form-group">
                                    <label>Furniture</label>
                                    <select name="furnitureProvided" value={editForm.furnitureProvided} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Fully-Furnished">Fully-Furnished</option>
                                        <option value="Semi-Furnished">Semi-Furnished</option>
                                        <option value="Unfurnished">Unfurnished</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Lift</label>
                                    <select name="liftAvailable" value={editForm.liftAvailable} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Parking</label>
                                    <select name="parkingSpace" value={editForm.parkingSpace} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Water (24/7)</label>
                                    <select name="waterAvailability" value={editForm.waterAvailability} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Power Backup</label>
                                    <select name="powerBackup" value={editForm.powerBackup} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>WiFi</label>
                                    <select name="wifiAvailable" value={editForm.wifiAvailable} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Security (CCTV)</label>
                                    <select name="cctvSecurity" value={editForm.cctvSecurity} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>AC</label>
                                    <select name="isProvidingAC" value={editForm.isProvidingAC} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="pp-form-group">
                                    <label>Cooking</label>
                                    <select name="individualCooking" value={editForm.individualCooking} onChange={handleEditInputChange} className="pp-form-select">
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pp-form-group" style={{ marginTop: '20px' }}>
                                <label>Detailed Description</label>
                                <textarea
                                    name="postDetails"
                                    value={editForm.postDetails}
                                    onChange={handleEditInputChange}
                                    className="pp-form-input"
                                    placeholder="Add property description, rules, etc..."
                                    style={{ height: '80px', resize: 'vertical' }}
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
