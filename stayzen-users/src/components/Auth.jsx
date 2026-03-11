import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { findUserByPhone } from '../services/dataService';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Star, MapPin, Phone, Hash, Home, Chrome } from 'lucide-react';
import './Auth.css';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetMethod, setResetMethod] = useState(""); // 'mobile' or 'email'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isForgotPassword) {
                if (resetMethod === 'mobile') {
                    if (password.length < 6) throw new Error("Password must be at least 6 characters");
                    if (password !== confirmPassword) throw new Error("Passwords do not match");

                    const user = await findUserByPhone(phoneNumber);
                    if (!user || !user.email) throw new Error("Email not found for this account.");

                    try {
                        const response = await fetch('http://localhost:5001/update-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phoneNumber, newPassword: password })
                        });

                        const data = await response.json();

                        if (data.success) {
                            setError(`✅ Password updated successfully! Please log in.`);
                            setTimeout(() => {
                                setIsForgotPassword(false);
                                setIsLogin(true);
                                setResetMethod("");
                                setError('');
                            }, 4000);
                            return;
                        } else {
                            throw new Error(data.error || "Server failed to update.");
                        }
                    } catch (serverErr) {
                        console.error("Auth Server Error:", serverErr);
                        setError("❌ FAILED: The Auth Server is not running. To update password without a Gmail link, you MUST run 'node authServer.js' in a new terminal.");
                    }
                } else {
                    if (!email) throw new Error("Please enter your email");
                    await sendPasswordResetEmail(auth, email);
                    setError(`✅ Reset link sent to your Gmail!`);
                }

                setTimeout(() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                    setResetMethod("");
                    setError('');
                }, 6000);
            } else if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }

                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;

                    // Sync Display Name to Auth
                    await updateProfile(user, { displayName: name });

                    // Save additional developer-recommended info to Firestore
                    await setDoc(doc(db, "users", user.uid), {
                        fullName: name,
                        email,
                        phoneNumber,
                        city,
                        area,
                        createdAt: new Date().toISOString(),
                        role: 'user'
                    });
                } catch (regError) {
                    if (regError.code === 'auth/email-already-in-use') {
                        throw new Error('Email already registered. Please login.');
                    }
                    throw regError;
                }
            }
        } catch (err) {
            setError(err.message.replace('Firebase:', '').trim());
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user exists in Firestore, if not create record
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    fullName: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    role: 'user',
                    photoURL: user.photoURL
                });
            }
        } catch (err) {
            setError(err.message.replace('Firebase:', '').trim());
        } finally {
            setLoading(false);
        }
    };

    const EyeIcon = ({ show, onToggle }) => (
        <span className="eye-icon" onClick={onToggle} style={{ cursor: 'pointer', padding: '0 8px' }}>
            {show ? "🙈" : "👁️"}
        </span>
    );

    return (
        <div className="auth-immersive-container">
            <div className="mesh-background"></div>

            <motion.div
                className="auth-floating-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
            >
                <div className="auth-header-section">
                    <div className="premium-logo">
                        <div className="brand-orb">S</div>
                        <span className="logo-text">Stay<span>Zen</span></span>
                    </div>
                </div>

                <div className="auth-form-body">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLogin ? 'login' : 'register'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="form-inner-box"
                        >
                            <div className="welcome-text">
                                <h2>{isForgotPassword ? 'Secure Reset' : (isLogin ? 'Welcome Back' : 'Join StayZen')}</h2>
                                <p>{isForgotPassword ? 'Enter your email to reclaim your account.' : (isLogin ? 'Continue your premium stay journey.' : 'Design your perfect living experience.')}</p>
                            </div>

                            <form onSubmit={handleAuth} className="premium-form-stack">
                                {isForgotPassword ? (
                                    <div className="input-stack">
                                        <div className="input-group-premium focus-within">
                                            <Mail className="i-group" size={18} />
                                            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        </div>
                                        <p className="helper-txt">A secure reset link will be sent to this inbox.</p>
                                    </div>
                                ) : !isLogin ? (
                                    <div className="input-stack register-grid">
                                        <div className="input-group-premium">
                                            <User className="i-group" size={18} />
                                            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                                        </div>

                                        <div className="input-group-premium">
                                            <Mail className="i-group" size={18} />
                                            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        </div>

                                        <div className="input-group-premium full-width">
                                            <Phone className="i-group" size={18} />
                                            <input type="tel" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                                        </div>

                                        <div className="input-group-premium">
                                            <Lock className="i-group" size={18} />
                                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                        </div>

                                        <div className="input-group-premium">
                                            <ShieldCheck className="i-group" size={18} />
                                            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="input-stack">
                                        <div className="input-group-premium">
                                            <Mail className="i-group" size={18} />
                                            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        </div>
                                        <div className="input-group-premium">
                                            <Lock className="i-group" size={18} />
                                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                        </div>
                                    </div>
                                )}

                                {error && <div className="auth-alert error">{error}</div>}

                                <button type="submit" className="prime-auth-trigger" disabled={loading}>
                                    {loading ? 'Authenticating...' : (isForgotPassword ? 'Reset Password' : (isLogin ? 'Sign In Now' : 'Create My Account'))}
                                </button>
                            </form>

                            {!isForgotPassword && (
                                <div className="auth-footer-social">
                                    <div className="auth-divider"><span>or continue with</span></div>
                                    <button className="google-auth-btn" onClick={handleGoogleSignIn} disabled={loading}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        <span>Continue with Google</span>
                                    </button>
                                </div>
                            )}

                            <div className="auth-lower-links">
                                {isLogin && !isForgotPassword && (
                                    <span className="alt-link" onClick={() => setIsForgotPassword(true)}>Trouble signing in?</span>
                                )}
                                {isForgotPassword && (
                                    <span className="alt-link" onClick={() => setIsForgotPassword(false)}>Back to Login</span>
                                )}

                                <div className="footer-toggle">
                                    {isLogin ? "New to StayZen?" : "Already a member?"}
                                    <button onClick={() => setIsLogin(!isLogin)} className="inline-toggle">{isLogin ? 'Join Now' : 'Sign In'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;

