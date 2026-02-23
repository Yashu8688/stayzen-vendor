import React, { useState, useEffect } from 'react';
import './HelpCenter.css';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

const HelpCenter = () => {
    const [countryCode, setCountryCode] = useState('91');
    const [supportNumber, setSupportNumber] = useState('');
    const [faqs, setFaqs] = useState([]);
    const [newFaq, setNewFaq] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchSupportDetails = async () => {
            try {
                const docRef = doc(db, 'settings', 'support');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCountryCode(data.countryCode || '91');
                    setSupportNumber(data.whatsappNumber || '');
                }
            } catch (error) {
                console.error("Error fetching support details:", error);
            }
        };

        const unsubscribeFaqs = onSnapshot(collection(db, 'faqs'), (snapshot) => {
            const faqList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFaqs(faqList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
            setLoading(false);
        });

        fetchSupportDetails();
        return () => unsubscribeFaqs();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const docRef = doc(db, 'settings', 'support');
            await setDoc(docRef, {
                countryCode: countryCode,
                whatsappNumber: supportNumber,
                fullNumber: `${countryCode}${supportNumber}`,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setMessage({ type: 'success', text: 'Support details updated successfully!' });
        } catch (error) {
            console.error("Error updating support details:", error);
            setMessage({ type: 'error', text: 'Failed to update support details.' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddFaq = async (e) => {
        e.preventDefault();
        if (!newFaq.trim()) return;

        try {
            await addDoc(collection(db, 'faqs'), {
                question: newFaq.trim(),
                createdAt: new Date().toISOString()
            });
            setNewFaq('');
        } catch (error) {
            console.error("Error adding FAQ:", error);
        }
    };

    const handleDeleteFaq = async (id) => {
        try {
            await deleteDoc(doc(db, 'faqs', id));
        } catch (error) {
            console.error("Error deleting FAQ:", error);
        }
    };

    if (loading) return <div className="loading">Loading Help Center settings...</div>;

    return (
        <div className="help-center-admin">
            <div className="page-header">
                <div className="header-info">
                    <h1>Help Center Management</h1>
                    <p>Configure support contact details and customer assistance options.</p>
                </div>
            </div>

            <div className="admin-card">
                <div className="card-header">
                    <h3>Contact Settings</h3>
                    <p>This information will be displayed to users in the mobile app's Help Center.</p>
                </div>

                <form onSubmit={handleSave} className="support-form">
                    <div className="form-group">
                        <label>WhatsApp Support Contact</label>
                        <div className="phone-input-container">
                            <div className="country-code-box">
                                <span className="prefix">+</span>
                                <input
                                    type="text"
                                    placeholder="91"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                                    maxLength="4"
                                />
                            </div>
                            <div className="number-box">
                                <input
                                    type="text"
                                    placeholder="Mobile Number"
                                    value={supportNumber}
                                    onChange={(e) => setSupportNumber(e.target.value.replace(/\D/g, ''))}
                                    required
                                />
                            </div>
                        </div>
                        <small>Enter the country code (e.g., 91) and the mobile number separately.</small>
                    </div>

                    {message.text && (
                        <div className={`status-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <button type="submit" className="save-btn" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </form>
            </div>

            <div className="admin-card">
                <div className="card-header">
                    <h3>Frequently Asked Questions</h3>
                    <p>Manage the list of quick-action questions available to users.</p>
                </div>

                <div className="faq-management">
                    <form onSubmit={handleAddFaq} className="add-faq-form">
                        <input
                            type="text"
                            placeholder="Type a new question..."
                            value={newFaq}
                            onChange={(e) => setNewFaq(e.target.value)}
                        />
                        <button type="submit">Add FAQ</button>
                    </form>

                    <div className="admin-faq-list">
                        {faqs.map(faq => (
                            <div key={faq.id} className="admin-faq-item">
                                <span>{faq.question}</span>
                                <button onClick={() => handleDeleteFaq(faq.id)} className="delete-faq-btn">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        ))}
                        {faqs.length === 0 && <p className="empty-msg">No FAQs added yet.</p>}
                    </div>
                </div>
            </div>

            <div className="preview-info admin-card">
                <h3>App Preview Summary</h3>
                <div className="preview-list">
                    <div className="preview-item">
                        <span className="label">Call Option:</span>
                        <span className="value disabled">Disabled (User Request)</span>
                    </div>
                    <div className="preview-item">
                        <span className="label">Chat Option:</span>
                        <span className="value enabled">Enabled (WhatsApp)</span>
                    </div>
                    <div className="preview-item">
                        <span className="label">Current Target:</span>
                        <span className="value">wa.me/{countryCode}{supportNumber || 'not-set'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
