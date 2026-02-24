import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Lock,
    Bell,
    CreditCard,
    ChevronRight,
    Camera,
    LogOut,
    Smartphone,
    Save,
    X,
    Loader2,
    Shield
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { subscribeToUserProfile, updateUserProfile } from '../services/dataService';
import './Profile.css';

const Profile = ({ user }) => {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        city: '',
        area: '',
        bio: ''
    });

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = subscribeToUserProfile(user.uid, (data) => {
            setProfileData(data);
            setFormData({
                fullName: data?.fullName || user?.displayName || '',
                phoneNumber: data?.phoneNumber || '',
                city: data?.city || '',
                area: data?.area || '',
                bio: data?.bio || ''
            });
        });
        return () => unsubscribe();
    }, [user]);

    const handleLogout = () => signOut(auth);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            // Update Auth profile too
            await updateProfile(auth.currentUser, { displayName: formData.fullName });
            // Update Firestore
            await updateUserProfile(user.uid, {
                ...formData,
                email: user.email
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert("Update failed.");
        } finally {
            setLoading(false);
        }
    };

    const menuGroups = [
        {
            title: "Security & Payments",
            items: [
                { icon: <Lock size={20} />, label: "Login & Security", path: "/settings" },
                { icon: <CreditCard size={20} />, label: "Payments", path: "/payments" },
                { icon: <Shield size={20} />, label: "Trust Center", path: "/help" },
            ]
        },
        {
            title: "App Preferences",
            items: [
                { icon: <Bell size={20} />, label: "Notifications", path: "/settings" },
                { icon: <Smartphone size={20} />, label: "Display & Sync", path: "/settings" },
            ]
        }
    ];

    return (
        <div className="pr-root">
            {/* 1. Sleek Profile Header */}
            <div className="pr-hero-card">
                <div className="pr-hero-info">
                    <div className="pr-avatar-wrap">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Avatar" />
                        <button className="pr-avatar-btn"><Camera size={16} /></button>
                    </div>
                    <div className="pr-hero-text">
                        <h1>{formData.fullName || user?.email?.split('@')[0]}</h1>
                        <p>{user?.email}</p>
                        <button className="pr-edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                    </div>
                </div>
            </div>

            <div className="pr-content">
                {isEditing ? (
                    /* 2. Focused Edit Form */
                    <div className="pr-edit-view">
                        <div className="pr-view-header">
                            <h3>Edit Personal Information</h3>
                            <button onClick={() => setIsEditing(false)} className="pr-close-btn"><X size={20} /></button>
                        </div>
                        <div className="pr-form-grid">
                            <div className="pr-group">
                                <label>Legal Full Name</label>
                                <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                            </div>
                            <div className="pr-group">
                                <label>Contact Number</label>
                                <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
                            </div>
                            <div className="pr-group pr-full-width">
                                <label>Short Bio</label>
                                <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
                            </div>
                            <div className="pr-group">
                                <label>City</label>
                                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                            </div>
                            <div className="pr-group">
                                <label>Area</label>
                                <input type="text" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} />
                            </div>
                        </div>
                        <div className="pr-form-footer">
                            <button className="pr-btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="pr-btn-save" onClick={handleSaveProfile} disabled={loading}>
                                {loading ? <Loader2 className="pr-spin" size={20} /> : <Save size={20} />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 3. Clean Menu Groups */
                    <div className="pr-menu-list">
                        {menuGroups.map((group, gidx) => (
                            <div key={gidx} className="pr-menu-section">
                                <h3>{group.title}</h3>
                                <div className="pr-menu-card">
                                    {group.items.map((item, iidx) => (
                                        <button key={iidx} className="pr-row" onClick={() => navigate(item.path)}>
                                            <div className="pr-row-left">
                                                <div className="pr-icon-bg">{item.icon}</div>
                                                <span className="pr-label">{item.label}</span>
                                            </div>
                                            <ChevronRight size={18} className="pr-chevron" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button className="pr-logout-btn" onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>Sign Out from StayZen</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
