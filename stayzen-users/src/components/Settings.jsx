import React, { useState } from 'react';
import {
    Bell,
    Lock,
    Globe,
    Eye,
    Shield,
    Smartphone,
    ChevronRight,
    Moon,
    Check,
    HelpCircle,
    UserX,
    Trash2,
    Mail,
    Loader2,
    X,
    EyeOff
} from 'lucide-react';
import { auth } from '../firebase';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    deleteUser
} from 'firebase/auth';
import './Settings.css';

const Settings = ({ user }) => {
    // UI States
    const [showPassModal, setShowPassModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        notifications: true,
        darkMode: false,
        sync: true,
        searchVisibility: true
    });

    // Form States
    const [passForm, setPassForm] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPass, setShowPass] = useState(false);

    const toggleSetting = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passForm.new !== passForm.confirm) {
            alert("Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, passForm.current);

            // 1. Re-authenticate
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Update Password
            await updatePassword(auth.currentUser, passForm.new);

            alert("Password updated successfully!");
            setShowPassModal(false);
            setPassForm({ current: '', new: '', confirm: '' });
        } catch (error) {
            console.error(error);
            alert("Update failed. Please check your current password.");
        } finally {
            setLoading(false);
        }
    };

    const sections = [
        {
            title: 'Security & Access',
            items: [
                {
                    icon: <Lock size={20} />,
                    label: 'Change Password',
                    value: 'Secure update',
                    type: 'action',
                    onClick: () => setShowPassModal(true)
                },
                { icon: <Shield size={20} />, label: 'Two-Factor Auth', value: 'Disabled', type: 'link' },
                {
                    icon: <Mail size={20} />,
                    label: 'Email Notifications',
                    active: settings.notifications,
                    type: 'toggle',
                    onToggle: () => toggleSetting('notifications')
                },
            ]
        },
        {
            title: 'Display & Sync',
            items: [
                { icon: <Globe size={20} />, label: 'Language', value: 'English (US)', type: 'link' },
                {
                    icon: <Moon size={20} />,
                    label: 'Dark Mode',
                    active: settings.darkMode,
                    type: 'toggle',
                    onToggle: () => toggleSetting('darkMode')
                },
                {
                    icon: <Eye size={20} />,
                    label: 'Search Visibility',
                    active: settings.searchVisibility,
                    type: 'toggle',
                    onToggle: () => toggleSetting('searchVisibility')
                },
            ]
        },
        {
            title: 'Danger Zone',
            items: [
                { icon: <UserX size={20} />, label: 'Deactivate Account', type: 'danger' },
                { icon: <Trash2 size={20} />, label: 'Permanent Delete', type: 'danger' },
            ]
        }
    ];

    return (
        <div className="st-root">
            <div className="st-header">
                <h1>Settings</h1>
                <p>Manage your account security and application preferences.</p>
            </div>

            <div className="st-content">
                <div className="st-grid">
                    {sections.map((section, idx) => (
                        <div key={idx} className="st-section">
                            <h3 className="st-section-title">{section.title}</h3>
                            <div className="st-card">
                                {section.items.map((item, i) => (
                                    <div key={i} className={`st-row ${item.type}`} onClick={item.onClick}>
                                        <div className="st-row-left">
                                            <div className="st-icon-box">{item.icon}</div>
                                            <span className="st-label">{item.label}</span>
                                        </div>
                                        <div className="st-row-right">
                                            {item.value && <span className="st-value">{item.value}</span>}
                                            {item.type === 'toggle' ? (
                                                <button
                                                    className={`st-toggle ${item.active ? 'active' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); item.onToggle(); }}
                                                >
                                                    <div className="st-toggle-dot"></div>
                                                </button>
                                            ) : (
                                                <ChevronRight size={16} className="st-chevron" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="st-info-footer">
                    <HelpCircle size={16} />
                    <span>Need help? Visit our <a href="/help">Support Center</a></span>
                </div>
            </div>

            {/* Password Update Modal */}
            {showPassModal && (
                <div className="st-modal-overlay">
                    <div className="st-modal-content">
                        <div className="st-modal-header">
                            <h3>Update Password</h3>
                            <button onClick={() => setShowPassModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handlePasswordUpdate}>
                            <div className="st-input-group">
                                <label>Current Password</label>
                                <div className="st-pass-input">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        required
                                        value={passForm.current}
                                        onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
                                    />
                                    <button type="button" onClick={() => setShowPass(p => !p)}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div className="st-input-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passForm.new}
                                    onChange={(e) => setPassForm({ ...passForm, new: e.target.value })}
                                />
                            </div>
                            <div className="st-input-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passForm.confirm}
                                    onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                                />
                            </div>
                            <div className="st-modal-footer">
                                <button type="button" className="st-btn-cancel" onClick={() => setShowPassModal(false)}>Cancel</button>
                                <button type="submit" className="st-btn-save" disabled={loading}>
                                    {loading ? <Loader2 className="st-spin" size={18} /> : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;
