import React, { useState } from 'react';
import './Notifications.css';
import { Bell, CheckCircle, AlertCircle, Info, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const Notifications = () => {
    // Mock Data
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            type: 'success',
            title: 'Booking Confirmed!',
            message: 'Your stay at Lakshmi PG has been confirmed for Jan 29, 2026. Pack your bags!',
            time: '2 hours ago',
            read: false,
            link: '/bookings'
        },
        {
            id: 2,
            type: 'info',
            title: 'New Feature Alert',
            message: 'You can now split payments with your roommates. Check it out in the Payments section.',
            time: 'Yesterday',
            read: true,
            link: '/payments'
        },
        {
            id: 3,
            type: 'alert',
            title: 'Payment Reminder',
            message: 'Your monthly rent for Dec 2025 is due in 3 days. Pay now to avoid late fees.',
            time: 'Yesterday',
            read: true,
            link: '/payments'
        },
        {
            id: 4,
            type: 'success',
            title: 'Welcome to StayZen',
            message: 'We are thrilled to have you here. Complete your profile to get verified.',
            time: '3 days ago',
            read: true,
            link: '/profile'
        }
    ]);

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'alert': return <AlertCircle size={20} />;
            default: return <Info size={20} />;
        }
    };

    return (
        <div className="intel-dashboard">
            <div className="intel-simple-header">
                <div className="simple-header-content">
                    <h1>Notifications</h1>
                    <p>Stay updated on your journey</p>
                </div>
                <button className="intel-header-action" onClick={markAllRead}>
                    Mark all as read
                </button>
            </div>

            <div className="intel-content-wrapper">
                {notifications.length > 0 ? (
                    <div className="notif-list">
                        <div className="notif-group-title">Recent</div>
                        {notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                className={`notif-card ${!notif.read ? 'unread' : ''}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="notif-icon-box">
                                    {getIcon(notif.type)}
                                </div>
                                <div className="notif-content">
                                    <div className="notif-header">
                                        <h3>{notif.title}</h3>
                                        <span className="notif-time">{notif.time}</span>
                                    </div>
                                    <p className="notif-message">{notif.message}</p>
                                    {notif.link && (
                                        <div className="notif-action-link">
                                            View Details <ArrowRight size={14} />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="notif-empty">
                        <div className="empty-icon">
                            <Bell size={32} />
                        </div>
                        <h3>All caught up!</h3>
                        <p>You have no new notifications at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
