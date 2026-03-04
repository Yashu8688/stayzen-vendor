import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import {
    Bell,
    Search,
    LogOut,
    CalendarClock,
    ChevronDown,
    User,
    Settings,
    LayoutDashboard,
    Menu,
    X
} from 'lucide-react';
import './DashboardLayout.css';
import logoImg from '../../assets/logo.jpg';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

const DashboardLayout = ({ onLogout }) => {
    const location = useLocation();
    const [notifications, setNotifications] = React.useState([]);
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const notifRef = React.useRef(null);
    const userMenuRef = React.useRef(null);

    const unreadCount = notifications.filter(n => n.status === 'unread').length;

    const getPageTitle = () => {
        const path = location.pathname.split('/')[1];
        if (!path || path === 'dashboard') return 'Dashboard Overview';
        return path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');
    };

    React.useEffect(() => {
        const notifQuery = query(
            collection(db, 'notifications'),
            where('targetId', '==', 'admin')
        );

        const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
            setNotifications(notifs);
        });

        return () => unsubscribe();
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => n.status === 'unread');
        for (const n of unread) {
            await updateDoc(doc(db, 'notifications', n.id), { status: 'read' });
        }
    };

    return (
        <div className="dashboard-layout">
            <header className="topbar">
                <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div className="topbar-left">
                    <div className="brand-box">
                        <img src={logoImg} alt="StayZen" className="brand-logo" />
                        <h1 className="brand-text">StayZen</h1>
                    </div>
                    <div className="header-divider"></div>
                    <div className="title-section">
                        <h2 className="title-text">{getPageTitle()}</h2>
                        <div className="date-badge">
                            <CalendarClock size={16} />
                            <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                </div>

                <div className="topbar-center">
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Search for properties, users or transactions..." />
                    </div>
                </div>

                <div className="topbar-right">
                    <div className="action-icons">
                        <div className="notif-wrapper" ref={notifRef}>
                            <button className={`icon-btn ${isNotifOpen ? 'active' : ''}`} onClick={() => setIsNotifOpen(!isNotifOpen)}>
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                            </button>
                            {isNotifOpen && (
                                <div className="notif-dropdown">
                                    <div className="notif-header">
                                        <h3>Notifications</h3>
                                        {unreadCount > 0 && <button onClick={markAllAsRead}>Mark all as read</button>}
                                    </div>
                                    <div className="notif-list">
                                        {notifications.length > 0 ? notifications.map(n => (
                                            <div key={n.id} className={`notif-item ${n.status === 'unread' ? 'unread' : ''}`}>
                                                <div className="notif-icon-circle">
                                                    <Bell size={14} />
                                                </div>
                                                <div className="notif-content">
                                                    <p className="notif-title">{n.title}</p>
                                                    <p className="notif-msg">{n.message}</p>
                                                    <span className="notif-time">
                                                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                    </span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="notif-empty">No new notifications</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="user-profile-nav" ref={userMenuRef}>
                        <div className="profile-pill" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                            <div className="avatar">YA</div>
                            <div className="user-info">
                                <span className="user-name">Yashwanth</span>
                                <span className="user-role">Super Admin</span>
                            </div>
                            <ChevronDown size={14} className={`chevron ${isUserMenuOpen ? 'up' : ''}`} />
                        </div>

                        {isUserMenuOpen && (
                            <div className="user-dropdown">
                                <button className="dropdown-item">
                                    <User size={16} />
                                    <span>My Profile</span>
                                </button>
                                <button className="dropdown-item">
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </button>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item logout" onClick={onLogout}>
                                    <LogOut size={16} />
                                    <span>Log out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="main-container">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="page-content" onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
