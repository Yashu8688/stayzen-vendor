import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { findUserByPhone } from '../services/dataService';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Star, MapPin, Phone, Hash, Home } from 'lucide-react';
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

    const EyeIcon = ({ show, onToggle }) => (
        <span className="eye-icon" onClick={onToggle} style={{ cursor: 'pointer', padding: '0 8px' }}>
            {show ? "🙈" : "👁️"}
        </span>
    );

    return (
        <div className="auth-page">
            <div className="auth-visual">
                <div className="auth-visual-content">
                    <div className="logo-box card">
                        <img src="/logo.svg" alt="Logo" style={{ height: 36, width: 36 }} />
                        <span className="logo-txt">Stay<span>Zen</span></span>
                    </div>
                    <h1>Find your <br /><span className="gradient-text">Zen</span> in every stay.</h1>
                    <p>The marketplace for premium stays, co-living spaces, and unforgettable experiences.</p>

                    <div className="hero-stats">
                        <div className="stat">
                            <Star size={18} fill="#10b981" color="#10b981" />
                            <span>4.9/5 Rating</span>
                        </div>
                        <div className="stat">
                            <ShieldCheck size={18} color="#10b981" />
                            <span>Verified Stays</span>
                        </div>
                    </div>
                </div>
                <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1600" alt="StayZen Luxury Living" className="hero-img" />
            </div>

            <div className="auth-form-container">
                <div className="form-box">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLogin ? 'login' : 'register'}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="form-wrapper"
                        >
                            <h2>{isForgotPassword ? 'Reset Access' : (isLogin ? 'Welcome Back' : 'Create Account')}</h2>
                            <p className="subtitle">{isForgotPassword ? 'Securely reset your password via email link.' : (isLogin ? 'Log in to manage your premium stays and preferences.' : 'Experience the new standard of modern living.')}</p>

                            <form onSubmit={handleAuth} className="actual-form">
                                {isForgotPassword ? (
                                    <div className="registration-container">
                                        <div className="reset-back-users" onClick={() => setIsForgotPassword(false)}>← Back to Login</div>
                                        <div className="form-input">
                                            <Mail className="icon" size={18} />
                                            <input type="email" placeholder="registered@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        </div>
                                        <p className="hint-text">We'll send a direct reset link to this email address.</p>
                                    </div>
                                ) : !isLogin ? (
                                    <div className="registration-container">
                                        <div className="form-input">
                                            <User className="icon" size={18} />
                                            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                                        </div>

                                        <div className="form-input">
                                            <Mail className="icon" size={18} />
                                            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        </div>

                                        <div className="form-input-group">
                                            <div className="form-input phone-input-box">
                                                <Phone className="icon" size={18} />
                                                <select
                                                    className="inline-country-select"
                                                    value={countryCode}
                                                    onChange={(e) => setCountryCode(e.target.value)}
                                                >
                                                    <option value="+91">+91</option>
                                                    <option value="+1">+1</option>
                                                </select>
                                                <input
                                                    type="tel"
                                                    placeholder="Phone Number"
                                                    value={phoneNumber}
                                                    className="with-select"
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-grid">
                                            <div className="form-input">
                                                <MapPin className="icon" size={18} />
                                                <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                                            </div>
                                            <div className="form-input">
                                                <Home className="icon" size={18} />
                                                <input type="text" placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} required />
                                            </div>
                                        </div>

                                        <div className="form-input">
                                            <Lock className="icon" size={18} />
                                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                            <EyeIcon show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                                        </div>

                                        <div className="form-input">
                                            <ShieldCheck className="icon" size={18} />
                                            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                            <EyeIcon show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-input">
                                            <Mail className="icon" size={18} />
                                            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        </div>
                                        <div className="form-input">
                                            <Lock className="icon" size={18} />
                                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                            <EyeIcon show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                                        </div>
                                    </>
                                )}

                                {isLogin && !isForgotPassword && (
                                    <div className="forgot-password-link">
                                        <span onClick={() => { setIsForgotPassword(true); setError(''); }}>Forgot Password?</span>
                                    </div>
                                )}
                                {isForgotPassword && (
                                    <div className="forgot-password-link">
                                        <span onClick={() => { setIsForgotPassword(false); }}>Back to Login</span>
                                    </div>
                                )}

                                {error && <p className="error-msg">{error}</p>}

                                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                                    {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Create Account'))}
                                    {!loading && <ArrowRight size={18} />}
                                </button>
                            </form>


                            <p className="auth-footer">
                                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                                <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
                                    {isLogin ? 'Sign Up' : 'Log In'}
                                </button>
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Auth;

