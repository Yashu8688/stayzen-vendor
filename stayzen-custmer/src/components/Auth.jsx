import { useState } from "react";
import "./auth.css";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { findUserByPhone } from "../services/dataService";
import logo from "../assets/logo.jpg";

export default function Auth({ onLogin }) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState(""); // 'mobile' or 'email'

  const [authError, setAuthError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  // Comprehensive clean reset for switching modes
  const resetAll = (deep = true) => {
    setAuthError("");
    if (deep) {
      setPhoneNumber("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setResetMethod("");
      setFullName("");
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    try {
      if (isForgotPassword) {
        setIsLoading(true);
        if (resetMethod === 'mobile') {
          if (password.length < 6) throw new Error("Password must be at least 6 characters");
          if (password !== confirmPassword) throw new Error("Passwords do not match");

          // Find user by phone to get their email
          const user = await findUserByPhone(phoneNumber);
          if (!user || !user.email) {
            throw new Error("Could not find an account associated with this number.");
          }

          try {
            const response = await fetch('http://localhost:5001/update-password', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ phoneNumber: `${countryCode}${phoneNumber.trim().replace(/\D/g, "")}`, newPassword: password }),
            });
            const data = await response.json();

            if (data.success) {
              setAuthError(`✅ Password updated successfully! You can now log in.`);
              setTimeout(() => {
                setIsForgotPassword(false);
                resetAll(true);
              }, 3000);
              return;
            } else {
              throw new Error(data.error || "Server failed to update password.");
            }
          } catch (serverErr) {
            console.error("Auth Server Error:", serverErr);
            setAuthError("❌ FAILED: The Auth Server is not running. To update password without a Gmail link, you MUST run 'node authServer.js' in a new terminal.");
          }
        } else {
          if (!email) throw new Error("Please enter your Gmail address");
          await sendPasswordResetEmail(auth, email);
          setAuthError(`✅ Reset link sent! Please check your Gmail: ${email}`);
        }

        setTimeout(() => {
          setIsForgotPassword(false);
          resetAll(true);
        }, 6000);

      } else if (isRegisterOpen) {
        if (password !== confirmPassword) throw new Error("Passwords mismatch");

        setIsLoading(true);
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          fullName,
          email,
          phoneNumber: phoneNumber,
          role: 'manager',
          createdAt: new Date().toISOString()
        });

        await signOut(auth);
        setAuthError("✅ Account Created! Log in with your email.");
        setTimeout(() => {
          setIsRegisterOpen(false);
          resetAll(true);
        }, 2500);

      } else {
        if (!email || !password) throw new Error("Enter your email and password");
        setIsLoading(true);
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onLogin && onLogin();
      }
    } catch (err) {
      console.error("[Auth Error]", err);
      let m = "Authentication failed. Please try again.";

      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        m = "Invalid email or password. If you haven't created an account, please Register first. If you forgot your password, use the Reset link.";
      } else if (err.code === "auth/network-request-failed") {
        m = "Network error. Please check your internet connection.";
      } else if (err.code === "auth/too-many-requests") {
        m = "Too many attempts. Account is temporarily disabled. Try again later.";
      } else if (err.message) {
        m = err.message;
      }

      setAuthError(m);
    } finally {
      setIsLoading(false);
    }
  };

  const EyeIcon = ({ show, onToggle }) => (
    <span className="eye-icon" onClick={onToggle}>{show ? "🙈" : "👁️"}</span>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={logo} alt="StayZen Logo" className="brand-logo" />
          <span className="brand-name">StayZen</span>
        </div>
        <h1>{isForgotPassword ? "Reset Password" : "Welcome Back"}</h1>
        <p className="subtitle">
          {isForgotPassword ? "Enter your Gmail to receive a reset link" : "Sign in to manage your properties"}
        </p>

        <form onSubmit={handleAuth}>
          {isForgotPassword ? (
            <>
              <label>Gmail Address</label>
              <div className="input-box">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname@gmail.com" required />
              </div>
              <div className="info-box" style={{ marginTop: '10px' }}>
                <p>We will send a secure password reset link to this email address.</p>
              </div>
              <p className="footer-text" style={{ marginTop: '20px' }}>
                <span onClick={() => { setIsForgotPassword(false); resetAll(); }}>Back to Login</span>
              </p>
            </>
          ) : (
            <>
              <label>Email Address</label>
              <div className="input-box">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </div>

              <label>Password</label>
              <div className="input-box">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="options">
                <span onClick={() => { setIsForgotPassword(true); resetAll(); }}>Forgot Password?</span>
              </div>
            </>
          )}

          {authError && <div className={`error-text ${authError.includes('✅') ? 'success' : ''}`}>
            {authError.includes('✅') ? authError : `❌ ${authError}`}
          </div>}

          <button type="submit" className="primary-btn" disabled={isLoading}>
            {isLoading ? "Please wait..." : (isForgotPassword ? "Send Reset Link" : "Sign In")}
          </button>

          {!isForgotPassword && (
            <p className="footer-text">
              New Here? <span onClick={() => { setIsRegisterOpen(true); resetAll(); }}>Create Account</span>
            </p>
          )}
        </form>
      </div>

      {isRegisterOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal" onClick={() => { setIsRegisterOpen(false); resetAll(); }}>&times;</button>
            <h1>Create Account</h1>
            <p className="subtitle">Join the StayZen property network</p>

            <form onSubmit={handleAuth}>
              <label>Full Name</label>
              <div className="input-box">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your Name" />
              </div>

              <label>Email Address</label>
              <div className="input-box">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </div>

              <label>Phone Number</label>
              <div className="input-box phone-input">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="country-code">
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                </select>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="10 Digits" />
              </div>

              <label>Create Password</label>
              <div className="input-box">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
                <EyeIcon show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>

              <label>Confirm Password</label>
              <div className="input-box">
                <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
                <EyeIcon show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
              </div>

              {authError && <div className={`error-text ${authError.includes('✅') ? 'success' : ''}`}>
                {authError}
              </div>}

              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? "Setting up..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
