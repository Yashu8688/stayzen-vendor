import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardOverview from './DashboardOverview';
import PostsPage from './PostsPage';
import PropertiesPage from './PropertiesPage';
import RentersPage from './RentersPage';
import BookingsPage from './BookingsPage';
import PaymentsPage from './PaymentsPage';
import BankDetailsPage from './BankDetailsPage';
import { checkAndGenerateMonthlyRents } from '../services/dataService';

import './layout.css';

import { IoHomeOutline, IoBusinessOutline, IoPeopleOutline, IoWalletOutline, IoCardOutline } from 'react-icons/io5';

export default function Dashboard({ onLogout, user, initialTab }) {
    const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            checkAndGenerateMonthlyRents(user.uid);
        }
    }, [user]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const getTitle = () => {
        if (!activeTab || typeof activeTab !== 'string') return 'Dashboard';
        if (activeTab === 'bank') return 'Bank Details';
        return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    };

    const renderContent = () => {
        const commonProps = { user, userId: user?.uid };
        switch (activeTab) {
            case 'dashboard':
                return <DashboardOverview {...commonProps} />;
            case 'properties':
                return <PropertiesPage {...commonProps} />;
            case 'posts':
                return <PostsPage {...commonProps} setActiveTab={setActiveTab} />;
            case 'renters':
                return <RentersPage {...commonProps} />;
            case 'bookings':
                return <BookingsPage {...commonProps} setActiveTab={setActiveTab} />;
            case 'payments':
                return <PaymentsPage {...commonProps} />;
            case 'bank':
                return <BankDetailsPage {...commonProps} />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="ly-wrapper">
            <Header
                title={getTitle()}
                onLogout={onLogout}
                user={user}
                setTab={setActiveTab}
                toggleSidebar={toggleSidebar}
            />
            <div className="ly-container">
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                        setActiveTab(tab);
                        closeSidebar();
                    }}
                    isOpen={isSidebarOpen}
                    onClose={closeSidebar}
                    onLogout={onLogout}
                />
                <main className="ly-content-area">
                    {renderContent()}
                </main>
                {isSidebarOpen && <div className="ly-sidebar-overlay" onClick={closeSidebar}></div>}
            </div>

            {/* Bottom Navigation for Mobile */}
            <nav className="mobile-bottom-nav mobile-show">
                <button
                    className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <IoHomeOutline size={22} />
                    <span>Home</span>
                </button>
                <button
                    className={`nav-item ${activeTab === 'properties' ? 'active' : ''}`}
                    onClick={() => setActiveTab('properties')}
                >
                    <IoBusinessOutline size={22} />
                    <span>Properties</span>
                </button>
                <button
                    className={`nav-item ${activeTab === 'renters' ? 'active' : ''}`}
                    onClick={() => setActiveTab('renters')}
                >
                    <IoPeopleOutline size={22} />
                    <span>Renters</span>
                </button>
                <button
                    className={`nav-item ${activeTab === 'bank' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bank')}
                >
                    <IoCardOutline size={22} />
                    <span>Bank</span>
                </button>
                <button
                    className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payments')}
                >
                    <IoWalletOutline size={22} />
                    <span>Payments</span>
                </button>
            </nav>
        </div>
    );
}
