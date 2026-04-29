import { Link } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";
import "./dashboard.css";

const emptyRegistration = {
  name: "",
  email: "",
  password: "",
  role: "student"
};

export default function Register() {
  const [form, setForm] = useState(emptyRegistration);
  const [verification, setVerification] = useState({
    email: "",
    otp: "",
    devVerification: null
  });
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/register", form);
      setRegistered(true);
      setVerification({
        email: res.data.email || form.email,
        otp: "",
        devVerification: res.data.devVerification || null
      });
      setMessage(res.data.msg || "Registered successfully");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Registration failed");
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/verify-email-otp", {
        email: verification.email,
        otp: verification.otp
      });
      setMessage(res.data.msg || "Email verified");
    } catch (err) {
      setMessage(err.response?.data?.msg || "OTP verification failed");
    }
  };

  const resendVerification = async () => {
    setMessage("");

    try {
      const res = await API.post("/auth/resend-verification", {
        email: verification.email
      });
      setVerification((current) => ({
        ...current,
        devVerification: res.data.devVerification || null
      }));
      setMessage(res.data.msg || "Verification email sent");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to resend verification");
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card stack">
        {!registered ? (
          <form className="form-grid" onSubmit={handleRegister}>
            <p className="eyebrow">Create Access</p>
            <h1>Join Campus</h1>
            <p className="muted">Register, verify your email, and then sign in right away.</p>

            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>

            {message && <p className="muted">{message}</p>}

            <button className="button primary" type="submit">Register</button>
            <p className="muted">
              Already registered? <Link to="/">Login</Link>
            </p>
          </form>
        ) : (
          <>
            <div>
              <p className="eyebrow">Verify Email</p>
              <h1>One more step</h1>
              <p className="muted">We sent a verification email to {verification.email}. Enter the OTP here or use the button in that email.</p>
            </div>

            <form className="form-grid" onSubmit={verifyOtp}>
              <input
                placeholder="6-digit OTP"
                value={verification.otp}
                onChange={(e) => setVerification({ ...verification, otp: e.target.value })}
              />
              <div className="button-row">
                <button className="button primary" type="submit">Verify OTP</button>
                <button className="button btn-edit" type="button" onClick={resendVerification}>Resend Email</button>
              </div>
            </form>

            {verification.devVerification && (
              <div className="class-admin-card stack">
                <strong>Local testing helper</strong>
                <p className="muted">SMTP is not configured yet, so here’s the dev verification info.</p>
                <p className="muted">OTP: {verification.devVerification.otp}</p>
                <p className="muted">Link: {verification.devVerification.link}</p>
              </div>
            )}

            {message && <p className="muted">{message}</p>}

            <p className="muted">
              Verified already? <Link to="/">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
