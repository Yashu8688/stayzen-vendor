import React, { useState, useEffect } from 'react';
import { IoPersonOutline, IoNotificationsOutline, IoLockClosedOutline, IoShieldCheckmarkOutline, IoGlobeOutline, IoMoonOutline, IoCheckmarkCircle, IoCardOutline, IoCheckmarkDoneCircleOutline, IoAlertCircleOutline } from 'react-icons/io5';
import './settings.css';
import { getUserProfile, updateUserProfile, uploadImage, compressImage } from '../services/dataService';
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
        avatar: ''
    });

    // Bank Details State
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        bankName: '',
        accountType: 'Savings',
        upiId: '',
        verified: false
    });
    const [isSavingBank, setIsSavingBank] = useState(false);
    const [bankSaveSuccess, setBankSaveSuccess] = useState(false);
    const [bankError, setBankError] = useState('');

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
                        notifications: data.notifications || prev.notifications,
                        preferences: data.preferences || prev.preferences
                    }));
                    // Load saved bank details if present
                    if (data.bankDetails) {
                        setBankDetails(prev => ({ ...prev, ...data.bankDetails, confirmAccountNumber: data.bankDetails.accountNumber || '' }));
                    }
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
        { id: 'bank', label: 'Bank & Payments', icon: <IoCardOutline size={20} /> },
    ];

    const handleBankSave = async () => {
        setBankError('');
        if (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
            setBankError('Please fill in all required fields.');
            return;
        }
        if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
            setBankError('Account numbers do not match. Please re-enter.');
            return;
        }
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(bankDetails.ifscCode.toUpperCase())) {
            setBankError('Invalid IFSC code format. Example: SBIN0001234');
            return;
        }
        try {
            setIsSavingBank(true);
            const dataToSave = {
                accountHolderName: bankDetails.accountHolderName,
                accountNumber: bankDetails.accountNumber,
                ifscCode: bankDetails.ifscCode.toUpperCase(),
                bankName: bankDetails.bankName,
                accountType: bankDetails.accountType,
                upiId: bankDetails.upiId || '',
                verified: false,
                savedAt: new Date().toISOString()
            };
            await updateUserProfile(userId, { bankDetails: dataToSave });
            setBankSaveSuccess(true);
            setTimeout(() => setBankSaveSuccess(false), 4000);
        } catch (error) {
            console.error('Bank save error:', error);
            setBankError('Failed to save. Please try again.');
        } finally {
            setIsSavingBank(false);
        }
    };

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
            setIsSaving(true);
            const compressedBlob = await compressImage(file);
            const imageUrl = await uploadImage(compressedBlob, `profile_${userId}.jpg`, 'profiles');
            setProfile(prev => ({ ...prev, avatar: imageUrl }));
        } catch (error) {
            console.error("Image upload error:", error);
            alert("Failed to upload image.");
        } finally {
            setIsSaving(false);
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
            case 'bank':
                return (
                    <div className="st-section">
                        <h3 className="st-section-title">Bank & Payment Details</h3>
                        <p className="st-section-desc">Add your bank account to receive payouts. 90% of each booking payment will be transferred to this account automatically.</p>

                        {/* Status Banner */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '14px 18px', borderRadius: '14px', marginBottom: '24px',
                            background: bankDetails.accountNumber ? '#f0fdf4' : '#fefce8',
                            border: `1px solid ${bankDetails.accountNumber ? '#bbf7d0' : '#fde68a'}`
                        }}>
                            {bankDetails.accountNumber
                                ? <IoCheckmarkDoneCircleOutline size={22} color="#16a34a" />
                                : <IoAlertCircleOutline size={22} color="#d97706" />}
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: bankDetails.accountNumber ? '#15803d' : '#92400e' }}>
                                    {bankDetails.accountNumber ? '✅ Bank Account Linked' : '⚠️ No Bank Account Added'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                    {bankDetails.accountNumber
                                        ? `${bankDetails.bankName} — ****${bankDetails.accountNumber.slice(-4)} | Payouts enabled for Phase 2`
                                        : 'Add your bank details below to receive automatic payouts via Razorpay Route'}
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {bankError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>
                                {bankError}
                            </div>
                        )}

                        <div className="st-form-grid">
                            <div className="st-form-group">
                                <label>ACCOUNT HOLDER NAME *</label>
                                <input
                                    type="text"
                                    className="st-form-input"
                                    placeholder="As per bank records"
                                    value={bankDetails.accountHolderName}
                                    onChange={e => setBankDetails(p => ({ ...p, accountHolderName: e.target.value }))}
                                />
                            </div>
                            <div className="st-form-group">
                                <label>BANK NAME *</label>
                                <select
                                    className="st-form-input"
                                    value={bankDetails.bankName}
                                    onChange={e => setBankDetails(p => ({ ...p, bankName: e.target.value }))}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <option value="">Select Bank</option>
                                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'IndusInd Bank', 'Yes Bank', 'Federal Bank', 'IDFC First Bank', 'Other'].map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="st-form-group">
                                <label>ACCOUNT NUMBER *</label>
                                <input
                                    type="password"
                                    className="st-form-input"
                                    placeholder="Enter account number"
                                    value={bankDetails.accountNumber}
                                    onChange={e => setBankDetails(p => ({ ...p, accountNumber: e.target.value }))}
                                />
                            </div>
                            <div className="st-form-group">
                                <label>CONFIRM ACCOUNT NUMBER *</label>
                                <input
                                    type="text"
                                    className="st-form-input"
                                    placeholder="Re-enter account number"
                                    value={bankDetails.confirmAccountNumber}
                                    onChange={e => setBankDetails(p => ({ ...p, confirmAccountNumber: e.target.value }))}
                                />
                                {bankDetails.accountNumber && bankDetails.confirmAccountNumber && (
                                    <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', fontWeight: '600', color: bankDetails.accountNumber === bankDetails.confirmAccountNumber ? '#16a34a' : '#dc2626' }}>
                                        {bankDetails.accountNumber === bankDetails.confirmAccountNumber ? '✓ Numbers match' : '✗ Numbers do not match'}
                                    </span>
                                )}
                            </div>
                            <div className="st-form-group">
                                <label>IFSC CODE *</label>
                                <input
                                    type="text"
                                    className="st-form-input"
                                    placeholder="e.g. SBIN0001234"
                                    value={bankDetails.ifscCode}
                                    onChange={e => setBankDetails(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                                    maxLength={11}
                                />
                            </div>
                            <div className="st-form-group">
                                <label>ACCOUNT TYPE *</label>
                                <select
                                    className="st-form-input"
                                    value={bankDetails.accountType}
                                    onChange={e => setBankDetails(p => ({ ...p, accountType: e.target.value }))}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <option value="Savings">Savings Account</option>
                                    <option value="Current">Current Account</option>
                                </select>
                            </div>
                        </div>

                        <div className="st-form-group" style={{ marginTop: '8px' }}>
                            <label>UPI ID (Optional)</label>
                            <input
                                type="text"
                                className="st-form-input"
                                placeholder="yourname@upi"
                                value={bankDetails.upiId}
                                onChange={e => setBankDetails(p => ({ ...p, upiId: e.target.value }))}
                            />
                            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>UPI is an alternative payout method for faster transfers.</span>
                        </div>

                        {/* Info Box */}
                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px', padding: '16px 20px', marginTop: '24px' }}>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: '#0369a1', marginBottom: '8px' }}>📋 How Payouts Work</div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#0c4a6e', lineHeight: '1.8' }}>
                                <li>User pays full amount during booking</li>
                                <li><strong>90%</strong> is automatically transferred to your bank within 2-3 business days</li>
                                <li><strong>10%</strong> is retained by StayZen as platform commission</li>
                                <li>All transfers are processed securely via <strong>Razorpay Route</strong></li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                            {bankSaveSuccess && (
                                <div style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', marginRight: 'auto' }}>
                                    <IoCheckmarkCircle size={20} /> Bank details saved successfully!
                                </div>
                            )}
                            <button className="st-btn-outline" onClick={() => setBankDetails({ accountHolderName: '', accountNumber: '', confirmAccountNumber: '', ifscCode: '', bankName: '', accountType: 'Savings', upiId: '', verified: false })}>
                                Clear
                            </button>
                            <button className="st-btn-save" onClick={handleBankSave} disabled={isSavingBank}>
                                {isSavingBank ? 'Saving...' : '💾 Save Bank Details'}
                            </button>
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
