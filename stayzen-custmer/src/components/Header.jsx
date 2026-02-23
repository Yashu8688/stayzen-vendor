import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Bell,
    User,
    LogOut,
    Settings,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    X,
    Layout,
    Home
} from 'lucide-react';
import './header.css';

import { subscribeToNotifications, markNotificationAsRead, subscribeToUserProfile } from '../services/dataService';

export default function Header({ title, onLogout, user, setTab, toggleSidebar }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);

    const unreadCount = notifications.filter(n => n.status === 'unread').length;

    useEffect(() => {
        if (!user) return;
        const uid = user.uid || user.email;

        const profileUnsub = subscribeToUserProfile(uid, (profile) => {
            if (profile) setUserProfile(profile);
        });

        const notifUnsub = subscribeToNotifications(uid, (data) => {
            setNotifications(data);
        });

        return () => {
            profileUnsub();
            notifUnsub();
        };
    }, [user]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAllAsRead = async () => {
        const unread = notifications.filter(n => n.status === 'unread');
        for (const n of unread) {
            await markNotificationAsRead(n.id);
        }
    };

    return (
        <header className="hd-container">
            <div className="hd-left">
                <button className="hd-menu-btn" onClick={toggleSidebar}>
                    <Layout size={24} />
                </button>
                <div className="hd-brand">
                    <img src="/logo.svg" alt="StayZen" className="hd-logo-img" />
                    <h2 className="hd-logo-text">StayZen</h2>
                </div>
                {title && (
                    <>
                        <div className="hd-divider"></div>
                        <h1 className="hd-title">{title}</h1>
                    </>
                )}
            </div>

            <div className="hd-search">
                <Search className="hd-search-icon" size={18} />
                <input type="text" placeholder="Search properties, bookings..." />
            </div>

            <div className="hd-right">
                <div className="hd-notif-wrapper" ref={notifRef}>
                    <button
                        className={`hd-icon-btn ${isNotifOpen ? 'active' : ''}`}
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                    >
                        <Bell size={22} />
                        {unreadCount > 0 && (
                            <span className="hd-notif-badge">{unreadCount}</span>
                        )}
                    </button>

                    {isNotifOpen && (
                        <div className="hd-notif-dropdown card">
                            <div className="hd-notif-header">
                                <h3>Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllAsRead}>Mark read</button>
                                )}
                            </div>
                            <div className="hd-notif-list">
                                {notifications.length > 0 ? notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`hd-notif-item ${notif.status === 'unread' ? 'unread' : ''}`}
                                        onClick={() => markNotificationAsRead(notif.id)}
                                    >
                                        <div className={`hd-notif-icon ${notif.type?.toLowerCase()}`}>
                                            {notif.type === 'PROPERTY_STATUS' ? (
                                                <CheckCircle2 size={18} />
                                            ) : (
                                                <AlertCircle size={18} />
                                            )}
                                        </div>
                                        <div className="hd-notif-content">
                                            <span className="hd-notif-title">{notif.title}</span>
                                            <p className="hd-notif-msg">{notif.message}</p>
                                            <span className="hd-notif-time">
                                                {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                            </span>
                                        </div>
                                        {notif.status === 'unread' && <div className="hd-notif-dot"></div>}
                                    </div>
                                )) : (
                                    <div className="hd-notif-empty">
                                        <p>No new updates</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="hd-profile-wrapper" ref={dropdownRef}>
                    <button
                        className={`hd-profile-btn ${isDropdownOpen ? 'active' : ''}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div className="hd-profile-info">
                            <span className="hd-name">{userProfile?.fullName || user.email.split('@')[0]}</span>
                            <span className="hd-role">Admin</span>
                        </div>
                        <div className="hd-avatar-wrap">
                            {userProfile?.avatar ? (
                                <img src={userProfile.avatar} alt="Profile" className="hd-avatar-img" />
                            ) : (
                                <div className="hd-avatar-initial">
                                    {user.email.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <ChevronDown size={14} className={`hd-chevron ${isDropdownOpen ? 'rotate' : ''}`} />
                        </div>
                    </button>

                    {isDropdownOpen && (
                        <div className="hd-dropdown card">
                            <button className="hd-dropdown-item" onClick={() => { setTab('settings'); setIsDropdownOpen(false); }}>
                                <User size={18} />
                                Profile Settings
                            </button>
                            <button className="hd-dropdown-item" onClick={() => { setTab('settings'); setIsDropdownOpen(false); }}>
                                <Settings size={18} />
                                System Settings
                            </button>
                            <div className="hd-dropdown-divider"></div>
                            <button className="hd-dropdown-item logout" onClick={onLogout}>
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
