import React, { useState, useEffect } from 'react';
import {
    IoCardOutline,
    IoCheckmarkDoneCircleOutline,
    IoAlertCircleOutline,
    IoCheckmarkCircle,
    IoShieldCheckmarkOutline,
    IoWalletOutline,
    IoTrendingUpOutline,
    IoRefreshOutline
} from 'react-icons/io5';
import { getUserProfile, updateUserProfile } from '../services/dataService';
import './bankDetails.css';

export default function BankDetailsPage({ userId }) {
    const [isLoading, setIsLoading] = useState(true);
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        bankName: '',
        accountType: 'Savings',
        upiId: '',
        verified: false
    });
    const [isSavingBank, setIsSavingBank] = useState(false);
    const [bankSaveSuccess, setBankSaveSuccess] = useState(false);
    const [bankError, setBankError] = useState('');

    useEffect(() => {
        if (!userId) return;

        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const data = await getUserProfile(userId);
                if (data && data.bankDetails) {
                    setBankDetails(prev => ({
                        ...prev,
                        ...data.bankDetails,
                        confirmAccountNumber: data.bankDetails.accountNumber || ''
                    }));
                }
            } catch (error) {
                console.error("Bank details fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    const handleBankSave = async () => {
        setBankError('');
        if (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
            setBankError('⚠️ Please fill in all required fields.');
            return;
        }
        if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
            setBankError('❌ Account numbers do not match.');
            return;
        }
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(bankDetails.ifscCode.toUpperCase())) {
            setBankError('🚫 Invalid IFSC format (Example: SBIN0001234)');
            return;
        }
        try {
            setIsSavingBank(true);
            const dataToSave = {
                accountHolderName: bankDetails.accountHolderName,
                accountNumber: bankDetails.accountNumber,
                ifscCode: bankDetails.ifscCode.toUpperCase(),
                bankName: bankDetails.bankName,
                accountType: bankDetails.accountType,
                upiId: bankDetails.upiId || '',
                verified: false,
                savedAt: new Date().toISOString()
            };
            await updateUserProfile(userId, { bankDetails: dataToSave });
            setBankSaveSuccess(true);
            setTimeout(() => setBankSaveSuccess(false), 4000);
        } catch (error) {
            console.error('Bank save error:', error);
            setBankError('Failed to save. Please try again.');
        } finally {
            setIsSavingBank(false);
        }
    };

    if (isLoading) return (
        <div className="bank-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div style={{ color: '#1aa79c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <IoRefreshOutline className="spin-anim" size={40} />
                <p style={{ fontWeight: 800, fontSize: '16px' }}>Loading Bank Details...</p>
            </div>
        </div>
    );

    return (
        <div className="bank-page-container">
            {/* 💎 PREMIUM HERO SECTION */}
            <div className="bank-hero-section">
                <div className="bank-hero-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <IoWalletOutline size={20} color="rgba(255,255,255,0.8)" />
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Settings</span>
                    </div>
                    <h1 className="bank-hero-title">Bank Account</h1>
                    <p className="bank-hero-subtitle">
                        Add your bank details below. Your 90% share from each booking will be sent here automatically.
                    </p>

                    {/* 🥂 GLASSMORTHISM STATUS BANNER */}
                    <div className="bank-status-glass">
                        <div className={`status-icon-box`} style={{
                            background: bankDetails.accountNumber ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            boxShadow: bankDetails.accountNumber ? '0 0 20px rgba(34, 197, 94, 0.2)' : 'none'
                        }}>
                            {bankDetails.accountNumber
                                ? <IoShieldCheckmarkOutline size={26} color="#22c55e" />
                                : <IoAlertCircleOutline size={26} color="#eab308" />}
                        </div>
                        <div className="status-text-content">
                            <div className="status-text-primary" style={{ color: '#ffffff', fontSize: '16px' }}>
                                {bankDetails.accountNumber ? 'ACCOUNT LINKED' : 'ACCOUNT NOT ADDED'}
                            </div>
                            <div className="status-text-secondary" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {bankDetails.accountNumber
                                    ? `Money will be sent to ${bankDetails.bankName} (****${bankDetails.accountNumber.slice(-4)})`
                                    : 'Please add your bank account to receive payments from users.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bank-main-grid">
                {/* 📝 SETTLEMENT FORM CARD */}
                <div className="bank-card" style={{ border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
                    <div className="bank-card-title" style={{ fontSize: '18px', marginBottom: '20px' }}>
                        <IoCardOutline size={22} color="#1aa79c" />
                        Enter Bank Details
                    </div>

                    {bankError && (
                        <div className="animate-fade" style={{
                            background: '#fff1f2', border: '1px solid #ffe4e6',
                            padding: '12px', borderRadius: '12px', marginBottom: '20px',
                            color: '#e11d48', fontSize: '13px', fontWeight: '800',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <IoAlertCircleOutline size={18} />
                            {bankError}
                        </div>
                    )}

                    <div className="bank-form-row">
                        <div className="bank-input-group">
                            <label className="bank-label">ACCOUNT HOLDER NAME</label>
                            <input
                                type="text"
                                className="bank-input"
                                placeholder="Legal Name in Bank"
                                value={bankDetails.accountHolderName}
                                onChange={e => setBankDetails(p => ({ ...p, accountHolderName: e.target.value }))}
                            />
                        </div>
                        <div className="bank-input-group">
                            <label className="bank-label">BANK NAME</label>
                            <select
                                className="bank-input bank-select"
                                value={bankDetails.bankName}
                                onChange={e => setBankDetails(p => ({ ...p, bankName: e.target.value }))}
                            >
                                <option value="">Select Your Bank</option>
                                {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'IndusInd Bank', 'Yes Bank', 'Federal Bank', 'IDFC First Bank', 'Other'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bank-form-row">
                        <div className="bank-input-group">
                            <label className="bank-label">ACCOUNT NUMBER</label>
                            <input
                                type="password"
                                className="bank-input"
                                placeholder="Enter Account Number"
                                value={bankDetails.accountNumber}
                                onChange={e => setBankDetails(p => ({ ...p, accountNumber: e.target.value }))}
                            />
                        </div>
                        <div className="bank-input-group">
                            <label className="bank-label">RE-ENTER ACCOUNT NUMBER</label>
                            <input
                                type="text"
                                className="bank-input"
                                placeholder="Verify Account Number"
                                value={bankDetails.confirmAccountNumber}
                                onChange={e => setBankDetails(p => ({ ...p, confirmAccountNumber: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="bank-form-row">
                        <div className="bank-input-group">
                            <label className="bank-label">IFSC CODE</label>
                            <input
                                type="text"
                                className="bank-input"
                                placeholder="e.g., SBIN0001234"
                                value={bankDetails.ifscCode}
                                onChange={e => setBankDetails(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                                maxLength={11}
                            />
                        </div>
                        <div className="bank-input-group">
                            <label className="bank-label">ACCOUNT TYPE</label>
                            <select
                                className="bank-input bank-select"
                                value={bankDetails.accountType}
                                onChange={e => setBankDetails(p => ({ ...p, accountType: e.target.value }))}
                            >
                                <option value="Savings">Savings Account</option>
                                <option value="Current">Current Account</option>
                            </select>
                        </div>
                    </div>

                    <div className="bank-input-group" style={{ marginTop: '10px' }}>
                        <label className="bank-label">UPI ID (OPTIONAL)</label>
                        <input
                            type="text"
                            className="bank-input"
                            placeholder="e.g., name@okicici"
                            value={bankDetails.upiId}
                            onChange={e => setBankDetails(p => ({ ...p, upiId: e.target.value }))}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                            <div style={{ padding: '4px 8px', background: '#f0fdf4', borderRadius: '6px', fontSize: '10px', fontWeight: 800, color: '#166534' }}>PAYMENTS</div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                                Adding a UPI ID can help in settling micro-payments faster.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 📊 ANALYTICS & CTA COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="bank-card" style={{ background: '#ffffff', border: '1px solid #f1f5f9' }}>
                        <div className="bank-card-title">
                            <IoTrendingUpOutline size={20} color="#1aa79c" />
                            How You Get Paid
                        </div>

                        <div className="split-viz-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px', fontWeight: 800, color: '#64748b' }}>
                                <span>PAYMENT SPLIT</span>
                                <span>9:1 RATIO</span>
                            </div>
                            <div className="split-bar-outer" style={{ height: '12px' }}>
                                <div className="split-bar-vendor" style={{ background: 'linear-gradient(90deg, #1aa79c, #0d9488)' }}></div>
                                <div className="split-bar-platform" style={{ background: '#e2e8f0' }}></div>
                            </div>

                            <div className="split-legend">
                                <div className="legend-item" style={{ background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
                                    <div className="legend-info">
                                        <div className="legend-dot" style={{ background: '#1aa79c', boxShadow: '0 0 10px rgba(26,167,156,0.4)' }}></div>
                                        <div className="legend-label" style={{ color: '#0f766e' }}>YOU GET (90%)</div>
                                    </div>
                                    <div className="legend-value" style={{ color: '#115e59' }}>₹9,000</div>
                                </div>
                                <div className="legend-item" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <div className="legend-info">
                                        <div className="legend-dot" style={{ background: '#94a3b8' }}></div>
                                        <div className="legend-label">OUR COMMISSION (10%)</div>
                                    </div>
                                    <div className="legend-value">₹1,000</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', gap: '10px' }}>
                                <IoWalletOutline size={18} color="#d97706" />
                                <p style={{ margin: 0, fontSize: '11px', color: '#92400e', lineHeight: '1.4', fontWeight: 600 }}>
                                    Your money will be sent to your bank account within 2 days after the guest checks in.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 🔒 SECURITY & ACTION BOX */}
                    <div className="bank-card" style={{ background: '#0f172a', border: 'none' }}>
                        {bankSaveSuccess && (
                            <div className="animate-fade" style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: 800 }}>
                                <IoCheckmarkDoneCircleOutline size={22} />
                                BANK DETAILS SAVED
                            </div>
                        )}

                        <button
                            className="bank-btn-primary"
                            style={{ background: 'linear-gradient(135deg, #1aa79c, #14b8a6)', height: '56px' }}
                            onClick={handleBankSave}
                            disabled={isSavingBank}
                        >
                            {isSavingBank ? (
                                <IoRefreshOutline size={24} className="spin-anim" />
                            ) : (
                                <>
                                    <IoCheckmarkCircle size={22} />
                                    SAVE BANK DETAILS
                                </>
                            )}
                        </button>

                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '30px' }}>
                                <IoShieldCheckmarkOutline size={16} color="#1aa79c" />
                                <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>256-BIT SSL ENCRYPTION</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .spin-anim {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
