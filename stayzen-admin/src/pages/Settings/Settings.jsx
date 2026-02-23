import React, { useState } from 'react';
import './Settings.css';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('banners');

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1>Content & CMS</h1>
                <p>Manage application banners, legal docs, and static content.</p>
            </div>

            <div className="settings-container">
                <aside className="settings-sidebar">
                    <button className={activeTab === 'banners' ? 'active' : ''} onClick={() => setActiveTab('banners')}>Homepage Banners</button>
                    <button className={activeTab === 'faq' ? 'active' : ''} onClick={() => setActiveTab('faq')}>FAQs</button>
                    <button className={activeTab === 'legal' ? 'active' : ''} onClick={() => setActiveTab('legal')}>Terms & Privacy</button>
                    <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>App Notifications</button>
                    <button className={activeTab === 'static' ? 'active' : ''} onClick={() => setActiveTab('static')}>Static Pages</button>
                </aside>

                <div className="settings-content">
                    {activeTab === 'banners' && (
                        <div className="cms-section">
                            <h3>Homepage Banners</h3>
                            <div className="banner-grid">
                                <div className="banner-upload">
                                    <div className="upload-placeholder">+ Upload New Banner</div>
                                </div>
                                <div className="banner-item">
                                    <div className="banner-preview">Banner 1</div>
                                    <button className="del-banner">Delete</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'faq' && (
                        <div className="cms-section">
                            <h3>FAQs Management</h3>
                            <button className="add-btn">+ Add New FAQ</button>
                            <div className="faq-list">
                                <div className="faq-item">
                                    <h4>How to register as a host?</h4>
                                    <p>Hosts can register via the Housing Manager app...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'legal' && (
                        <div className="cms-section">
                            <h3>Legal Documents</h3>
                            <div className="editor-placeholder">
                                <label>Terms and Conditions</label>
                                <textarea placeholder="Write terms here..."></textarea>
                                <button className="save-btn">Save Changes</button>
                            </div>
                        </div>
                    )}

                    {/* Other tabs would go here */}
                    {(activeTab !== 'banners' && activeTab !== 'faq' && activeTab !== 'legal') && (
                        <div className="cms-section">
                            <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
                            <p>Section under development...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
