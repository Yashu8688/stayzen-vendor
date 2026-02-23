import React, { useState, useEffect } from 'react';
import { IoPersonOutline, IoNotificationsOutline, IoLockClosedOutline, IoShieldCheckmarkOutline, IoGlobeOutline, IoMoonOutline, IoCheckmarkCircle } from 'react-icons/io5';
import './settings.css';
import { getUserProfile, updateUserProfile, convertToBase64 } from '../services/dataService';
import { auth } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export default function SettingsPage({ userId }) {
    const [activeSection, setActiveSection] = useState('profile');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        notifications: {
            email: true,
            push: true,
            sms: false
        },
        preferences: {
            darkMode: false,
            autoRefresh: true
        },
        avatar: '' // Added avatar field
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // Dark Mode Effect
    useEffect(() => {
        if (profile.preferences.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [profile.preferences.darkMode]);

    useEffect(() => {
        if (!userId) return;

        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const data = await getUserProfile(userId);
                if (data) {
                    setProfile(prev => ({
                        ...prev,
                        ...data,
                        // Ensure nested objects exist
                        notifications: data.notifications || prev.notifications,
                        preferences: data.preferences || prev.preferences
                    }));
                }
            } catch (error) {
                console.error("Settings fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    const sections = [
        { id: 'profile', label: 'Profile Settings', icon: <IoPersonOutline size={20} /> },
        { id: 'notifications', label: 'Notifications', icon: <IoNotificationsOutline size={20} /> },
        { id: 'security', label: 'Security & Password', icon: <IoLockClosedOutline size={20} /> },
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleChange = (section, key) => {
        setProfile(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: !prev[section][key]
            }
        }));
    };

    const handleSave = async () => {
        if (!userId) return;
        try {
            setIsSaving(true);
            await updateUserProfile(userId, profile);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Settings save error:", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await convertToBase64(file);
            setProfile(prev => ({ ...prev, avatar: base64 }));
        } catch (error) {
            console.error("Image upload error:", error);
            alert("Failed to upload image.");
        }
    };

    const handlePasswordUpdate = async () => {
        if (passwordData.new !== passwordData.confirm) {
            alert("New passwords do not match.");
            return;
        }
        if (!passwordData.current) {
            alert("Please enter your current password.");
            return;
        }

        try {
            setIsSaving(true);
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, passwordData.current);

            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.new);

            setIsSaving(false);
            setSaveSuccess(true);
            alert("Password updated successfully!");
            setPasswordData({ current: '', new: '', confirm: '' });
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setIsSaving(false);
            console.error("Password update error:", error);
            alert("Failed to update password: " + error.message);
        }
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <div className="st-section">
                        <h3 className="st-section-title">Personal Information</h3>
                        <p className="st-section-desc">Update your personal details and how others see you.</p>

                        <div className="st-profile-upload">
                            {profile.avatar ? (
                                <img src={profile.avatar} alt="Profile" className="st-avatar-large" style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="st-avatar-large">
                                    {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                                </div>
                            )}
                            <div className="st-upload-actions">
                                <label className="st-btn-save" style={{ cursor: 'pointer', textAlign: 'center' }}>
                                    CHANGE PHOTO
                                    <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                                </label>
                                <button className="st-btn-outline" onClick={() => setProfile(prev => ({ ...prev, avatar: '' }))}>Remove</button>
                            </div>
                        </div>

                        <div className="st-form-grid">
                            <div className="st-form-group">
                                <label>FULL NAME</label>
                                <input
                                    type="text"
                                    className="st-form-input"
                                    name="fullName"
                                    value={profile.fullName}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="st-form-group">
                                <label>EMAIL ADDRESS</label>
                                <input
                                    type="email"
                                    className="st-form-input"
                                    name="email"
                                    value={profile.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="st-form-group">
                                <label>PHONE NUMBER</label>
                                <input
                                    type="text"
                                    className="st-form-input"
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="st-form-group">
                                <label>COMPANY NAME</label>
                                <input
                                    type="text"
                                    className="st-form-input"
                                    name="company"
                                    value={profile.company}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                        <div className="st-form-group">
                            <label>ADDRESS</label>
                            <input
                                type="text"
                                className="st-form-input"
                                name="address"
                                value={profile.address}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="st-section">
                        <h3 className="st-section-title">Notification Preferences</h3>
                        <p className="st-section-desc">Control which notifications you receive and where.</p>

                        <div className="st-toggle-group">
                            <div className="st-toggle-item">
                                <div className="st-toggle-info">
                                    <h4>Email Notifications</h4>
                                    <p>Receive weekly reports and property alerts.</p>
                                </div>
                                <label className="st-switch">
                                    <input
                                        type="checkbox"
                                        checked={profile.notifications?.email}
                                        onChange={() => handleToggleChange('notifications', 'email')}
                                    />
                                    <span className="st-slider"></span>
                                </label>
                            </div>
                            <div className="st-toggle-item">
                                <div className="st-toggle-info">
                                    <h4>Push Notifications</h4>
                                    <p>Get instant alerts for new bookings and payments.</p>
                                </div>
                                <label className="st-switch">
                                    <input
                                        type="checkbox"
                                        checked={profile.notifications?.push}
                                        onChange={() => handleToggleChange('notifications', 'push')}
                                    />
                                    <span className="st-slider"></span>
                                </label>
                            </div>
                            <div className="st-toggle-item">
                                <div className="st-toggle-info">
                                    <h4>SMS Alerts</h4>
                                    <p>Direct alerts for urgent property management tasks.</p>
                                </div>
                                <label className="st-switch">
                                    <input
                                        type="checkbox"
                                        checked={profile.notifications?.sms}
                                        onChange={() => handleToggleChange('notifications', 'sms')}
                                    />
                                    <span className="st-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="st-section">
                        <h3 className="st-section-title">Security Settings</h3>
                        <p className="st-section-desc">Manage your password and account security options.</p>

                        <div className="st-form-group" style={{ marginBottom: '24px' }}>
                            <label>Current Password</label>
                            <input
                                type="password"
                                className="st-form-input"
                                placeholder="••••••••"
                                value={passwordData.current}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                            />
                        </div>
                        <div className="st-form-grid">
                            <div className="st-form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className="st-form-input"
                                    placeholder="New password"
                                    value={passwordData.new}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                                />
                            </div>
                            <div className="st-form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    className="st-form-input"
                                    placeholder="Confirm password"
                                    value={passwordData.confirm}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button className="st-btn-save" onClick={handlePasswordUpdate} disabled={isSaving}>
                                Update Password
                            </button>
                        </div>

                        <div className="st-toggle-item" style={{ marginTop: '32px', padding: '20px', background: '#f9fafb', borderRadius: '12px' }}>
                            <div className="st-toggle-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <IoShieldCheckmarkOutline color="#1aa79c" size={18} />
                                    <h4 style={{ margin: 0 }}>Two-Factor Authentication</h4>
                                </div>
                                <p>Add an extra layer of security to your account.</p>
                            </div>
                            <button className="st-btn-outline">Enable</button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="st-container">
            <div className="st-header">
                <h2>Settings</h2>
                <p>Manage your account settings and preferences.</p>
            </div>

            <div className="st-grid">
                <div className="st-sidebar">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            className={`st-nav-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            {section.icon}
                            {section.label}
                        </button>
                    ))}
                </div>

                <div className="st-content-card">
                    {isLoading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                            Loading your settings...
                        </div>
                    ) : (
                        renderSectionContent()
                    )}

                    <div className="st-footer">
                        {saveSuccess && (
                            <div style={{ marginRight: 'auto', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500' }}>
                                <IoCheckmarkCircle size={20} />
                                Settings saved successfully!
                            </div>
                        )}
                        <button className="st-btn-outline" onClick={() => window.location.reload()}>Cancel</button>
                        <button
                            className="st-btn-save"
                            disabled={isSaving || isLoading}
                            onClick={handleSave}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
