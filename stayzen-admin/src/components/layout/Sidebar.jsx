import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    CalendarClock,
    Tag,
    MessageSquare,
    LifeBuoy,
    Users,
    Bell,
    Settings,
    LogOut
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const menuItems = [
        { title: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { title: 'Properties', path: '/properties', icon: <Building2 size={20} /> },
        { title: 'Bookings', path: '/bookings', icon: <CalendarClock size={20} /> },
        { title: 'Promotions', path: '/promotions', icon: <Tag size={20} /> },
        { title: 'Feedback', path: '/feedback', icon: <MessageSquare size={20} /> },
        { title: 'Help Center', path: '/help-center', icon: <LifeBuoy size={20} /> },
        { title: 'Roommate Matching', path: '/roommate-matching', icon: <Users size={20} /> },
        { title: 'Users', path: '/users', icon: <Users size={20} /> },
        { title: 'Alerts', path: '/alerts', icon: <Bell size={20} /> },
        { title: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <nav className="sidebar-nav">
                {menuItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                        onClick={() => {
                            if (window.innerWidth < 768) onClose();
                        }}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-title">{item.title}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="admin-profile-pill">
                    <div className="admin-avatar">YA</div>
                    <div className="admin-info">
                        <span className="name">Yashwanth</span>
                        <span className="role">Super Admin</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
