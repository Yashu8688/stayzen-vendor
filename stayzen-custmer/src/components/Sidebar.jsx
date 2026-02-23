import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  CalendarClock,
  CreditCard,
  Settings,
  Home,
  ChevronRight,
  LogOut
} from 'lucide-react';
import './sidebar.css';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
    { id: 'properties', label: 'Properties', icon: <Building2 size={22} /> },
    { id: 'posts', label: 'Posts', icon: <FileText size={22} /> },
    { id: 'renters', label: 'Renters', icon: <Users size={22} /> },
    { id: 'bookings', label: 'Bookings', icon: <CalendarClock size={22} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={22} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={22} /> },
  ];

  return (
    <div className={`sd-container ${isOpen ? 'open' : ''}`}>
      <nav className="sd-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sd-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              if (window.innerWidth <= 900) onClose();
            }}
          >
            <span className="sd-item-icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sd-footer">
        <div className="sd-user-card">
          <div className="sd-user-details">
            <div className="sd-avatar">
              <Users size={20} />
            </div>
            <div className="sd-user-info">
              <p className="sd-user-name">Manager</p>
              <p className="sd-user-role">Administrator</p>
            </div>
          </div>
          <button className="sd-logout-btn" onClick={onLogout} title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
