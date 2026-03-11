import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CreditCard, Percent, Save, RefreshCw } from 'lucide-react';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('payouts');
    const [commissions, setCommissions] = useState({
        adminCommission: 10,
        vendorShare: 90
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'settings', 'payouts'));
                if (docSnap.exists()) {
                    setCommissions(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSavePayouts = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'payouts'), commissions);
            alert("Payout settings updated successfully!");
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save. Check console.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1>Content & CMS</h1>
                <p>Manage application banners, legal docs, and static content.</p>
            </div>

            <div className="settings-container">
                <aside className="settings-sidebar">
                    <button className={activeTab === 'payouts' ? 'active' : ''} onClick={() => setActiveTab('payouts')}>Payouts & Commission</button>
                    <button className={activeTab === 'banners' ? 'active' : ''} onClick={() => setActiveTab('banners')}>Homepage Banners</button>
                    <button className={activeTab === 'faq' ? 'active' : ''} onClick={() => setActiveTab('faq')}>FAQs</button>
                    <button className={activeTab === 'legal' ? 'active' : ''} onClick={() => setActiveTab('legal')}>Terms & Privacy</button>
                    <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>App Notifications</button>
                </aside>

                <div className="settings-content">
                    {activeTab === 'payouts' && (
                        <div className="cms-section">
                            <div className="section-head">
                                <CreditCard color="#1aa79c" />
                                <h3>Payouts & Commissions</h3>
                            </div>
                            <p className="section-desc">Define the global split ratio for every check-in settlement.</p>

                            <div className="commission-grid">
                                <div className="commission-box">
                                    <div className="box-label">ADMIN COMMISSION (%)</div>
                                    <div className="perc-input-wrap">
                                        <Percent size={18} />
                                        <input
                                            type="number"
                                            value={commissions.adminCommission}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setCommissions({ adminCommission: val, vendorShare: 100 - val });
                                            }}
                                        />
                                    </div>
                                    <span className="helper">Percentage that goes to StayZen platform.</span>
                                </div>

                                <div className="commission-box vendor">
                                    <div className="box-label">VENDOR EARNINGS (%)</div>
                                    <div className="perc-input-wrap">
                                        <Percent size={18} />
                                        <input
                                            type="number"
                                            disabled
                                            value={commissions.vendorShare}
                                        />
                                    </div>
                                    <span className="helper">Calculated automatically (100 - Admin %).</span>
                                </div>
                            </div>

                            <div className="split-visualizer">
                                <div className="split-labels">
                                    <span>WE GET: {commissions.adminCommission}%</span>
                                    <span>VENDOR GETS: {commissions.vendorShare}%</span>
                                </div>
                                <div className="split-bar-preview">
                                    <div className="admin-bar" style={{ width: `${commissions.adminCommission}%` }}></div>
                                    <div className="vendor-bar" style={{ width: `${commissions.vendorShare}%` }}></div>
                                </div>
                            </div>

                            <button className="save-settings-btn" onClick={handleSavePayouts} disabled={isSaving}>
                                {isSaving ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                                {isSaving ? 'UPDATING...' : 'SAVE SETTINGS'}
                            </button>
                        </div>
                    )}

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
