import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Compass,
    Heart,
    CalendarCheck,
    Settings,
    User,
    LogOut,
    Zap,
    ChevronRight,
    HelpCircle,
    CreditCard,
    ShieldCheck,
    Info,
    Users,
    MessageSquare
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const menuItems = [
        { name: 'Explore', path: '/', icon: <Compass size={20} /> },
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        ...(auth.currentUser ? [
            { name: 'Wishlist', path: '/favorites', icon: <Heart size={20} /> },
            { name: 'Roommate Matching', path: '/roommates', icon: <Users size={20} /> },
            { name: 'Your Chats', path: '/chats', icon: <MessageSquare size={20} /> },
            { name: 'My Bookings', path: '/bookings', icon: <CalendarCheck size={20} /> },
            { name: 'Payments', path: '/payments', icon: <CreditCard size={20} /> },
        ] : []),
        { name: 'Help Center', path: '/help', icon: <HelpCircle size={20} /> },
        { name: 'About StayZen', path: '/about', icon: <Info size={20} /> },
    ];


    const personalItems = auth.currentUser ? [
        { name: 'My Profile', path: '/profile', icon: <User size={20} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    ] : [];

    const handleLogout = () => {
        signOut(auth);
        handleMobileClick();
    };

    const handleMobileClick = () => {
        if (window.innerWidth <= 900 && toggleSidebar) {
            toggleSidebar();
        }
    };

    return (
        <>
            <div
                className={`mobile-sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={() => toggleSidebar && toggleSidebar()}
            />
            <aside className={`intel-sidebar ${isOpen ? 'open' : 'closed'}`}>
                <Link to="/" className="sidebar-brand-intel" onClick={handleMobileClick} style={{ textDecoration: 'none' }}>
                    <div className="brand-vial">
                        <img src="/logo.svg" className="vial-icon" alt="Logo" style={{ width: 30, height: 30 }} />
                    </div>
                    <div className="brand-text-intel">
                        <span className="brand-main">Stay<span>Zen</span></span>
                        <span className="brand-sub">USER CLOUD</span>
                    </div>
                </Link>

                <nav className="intel-nav-container">
                    <div className="intel-nav-group">
                        <p className="intel-group-label">Core Protocols</p>
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) => `intel-nav-link ${isActive ? 'active' : ''}`}
                                onClick={handleMobileClick}
                            >
                                <span className="intel-nav-icon">{item.icon}</span>
                                <span className="intel-nav-name">{item.name}</span>
                                <ChevronRight className="intel-chevron" size={14} />
                            </NavLink>
                        ))}
                    </div>

                    {personalItems.length > 0 && (
                        <div className="intel-nav-group">
                            <p className="intel-group-label">User Config</p>
                            {personalItems.map((item) => (
                                <NavLink
                                    key={item.name}
                                    to={item.path}
                                    className={({ isActive }) => `intel-nav-link ${isActive ? 'active' : ''}`}
                                    onClick={handleMobileClick}
                                >
                                    <span className="intel-nav-icon">{item.icon}</span>
                                    <span className="intel-nav-name">{item.name}</span>
                                    <ChevronRight className="intel-chevron" size={14} />
                                </NavLink>
                            ))}
                        </div>
                    )}
                </nav>

                <div className="intel-sidebar-footer">
                    {auth.currentUser ? (
                        <button className="intel-logout-btn" onClick={handleLogout}>
                            <div className="logout-icon-vial">
                                <LogOut size={18} />
                            </div>
                            <span className="intel-nav-name">Logout</span>
                        </button>
                    ) : (
                        <NavLink to="/auth" className="intel-logout-btn login-mode" onClick={handleMobileClick}>
                            <div className="logout-icon-vial">
                                <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
                            </div>
                            <span className="intel-nav-name">Sign In</span>
                        </NavLink>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
