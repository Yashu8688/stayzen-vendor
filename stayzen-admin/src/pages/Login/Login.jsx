import React, { useState } from 'react';
import './Login.css';
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import logoImg from '../../assets/logo.jpg';

const Login = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(''); // Clear error when user types
        setMessage(''); // Clear message when user types
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {

            // 1. HARD LIMIT: Only allow the specific admin email
            const ADMIN_EMAIL = 'stayzenconnect@gmail.com';

            if (formData.email.toLowerCase().trim() !== ADMIN_EMAIL) {
                console.warn('⚠️ Unrecognized email attempted admin login:', formData.email);
                throw new Error('Access Denied: This portal is for specialized administrative access only.');
            }

            // 2. Authenticate with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            console.log('✅ Firebase Login successful. Verifying Admin Role...');

            // 3. Verify Admin Role in Firestore 'users' collection
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : null;

            // Extra security: check if record exists and has correct role
            if (userData && (userData.role === 'admin' || userData.isAdmin === true)) {
                console.log('👑 Admin verified via Firestore!');
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminEmail', user.email);
                onLogin();
            } else if (user.email === ADMIN_EMAIL) {
                // If it's the master email but record missing, still allow but log it
                console.log('👑 Admin verified via Master Email!');
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminEmail', user.email);
                onLogin();
            } else {
                await signOut(auth);
                throw new Error('Access Denied: Your account does not have administrator privileges.');
            }

        } catch (err) {
            console.error('❌ Login Error:', err.message);
            setError(err.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!formData.email) {
            setError('Please enter your email address first.');
            return;
        }

        const adminEmail = 'stayzenconnect@gmail.com';
        if (formData.email.toLowerCase().trim() !== adminEmail.toLowerCase()) {
            setError('Only the registered admin email can request a password reset.');
            return;
        }

        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, formData.email.toLowerCase().trim());
            console.log('📧 Password reset email sent successfully to:', formData.email);
            setMessage('Password reset link sent! Please check your Gmail (including Spam folder).');
        } catch (err) {
            console.error('❌ Reset Error:', err.message);
            setError(err.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-box">
                        <img src={logoImg} alt="StayZen" className="login-logo" />
                    </div>
                    <h1 className="brand-name">StayZen</h1>
                    <p className="subtitle">{isForgotPassword ? 'Reset Admin Password' : 'Admin Control Panel'}</p>
                </div>

                <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit}>
                    {error && (
                        <div className="status-message error-message">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="status-message success-message">
                            {message}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="stayzenconnect@gmail.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {!isForgotPassword && (
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    )}

                    <div className="login-options">
                        {isForgotPassword ? (
                            <a href="#" className="forgot-password" onClick={(e) => {
                                e.preventDefault();
                                setIsForgotPassword(false);
                                setError('');
                                setMessage('');
                            }}>Back to Login</a>
                        ) : (
                            <a href="#" className="forgot-password" onClick={(e) => {
                                e.preventDefault();
                                setIsForgotPassword(true);
                                setError('');
                                setMessage('');
                            }}>Forgot password?</a>
                        )}
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : 'Sign In')}
                    </button>
                </form>

                <p className="footer-text">
                    Protected by <span className="highlight">StayZen Security</span>
                </p>
            </div>
        </div>
    );
};

export default Login;
