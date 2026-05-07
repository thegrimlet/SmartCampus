import { useState } from "react";
import API from "../services/api";
import heroImage from "../assets/hero.png";
import "./dashboard.css";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [idRecoveryEmail, setIdRecoveryEmail] = useState("");
  const [resetForm, setResetForm] = useState({ identifier: "", otp: "", password: "" });
  const [resetStep, setResetStep] = useState("request");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/login", form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.location.href = "/dashboard";
    } catch (err) {
      setMessage(err.response?.data?.msg || "Could not reach the login server. Check that the backend is running and refresh the page.");
    }
  };

  const recoverId = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/recover-id", { email: idRecoveryEmail });
      setMessage(res.data.devLoginId ? `${res.data.msg} Login ID: ${res.data.devLoginId}` : res.data.msg);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Could not recover login ID");
    }
  };

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/request-password-reset", { identifier: resetForm.identifier });
      setResetStep("confirm");
      setMessage(res.data.devOtp ? `${res.data.msg} OTP: ${res.data.devOtp}` : res.data.msg);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Could not send reset OTP");
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/reset-password", resetForm);
      setResetStep("request");
      setMode("login");
      setResetForm({ identifier: "", otp: "", password: "" });
      setMessage(res.data.msg);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Could not reset password");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-portal">
        <div className="auth-showcase">
          <div className="auth-logo">SCMS</div>
          <img src={heroImage} alt="Campus community" />
          <div>
            <p className="eyebrow">Smart Campus</p>
            <h2>One verified portal for students, faculty, and administration.</h2>
          </div>
        </div>

        <div className="auth-panel">
          {mode === "login" && (
            <form className="auth-card form-grid" onSubmit={handleLogin}>
              <p className="eyebrow">Smart Campus Management System</p>
              <h1><span>Login</span> Portal</h1>
              <p className="muted">Students use roll number. Faculties use faculty number. Admins can use email.</p>

              <input
                placeholder="Roll number / Faculty number / Admin email"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              />

              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              <div className="auth-check">Verified institutional accounts only</div>
              {message && <p className="muted">{message}</p>}

              <button className="button primary auth-submit" type="submit">Login</button>
              <div className="auth-actions">
                <button className="linklike" type="button" onClick={() => setMode("recover-id")}>Forgot ID?</button>
                <button className="linklike" type="button" onClick={() => setMode("reset-password")}>Forgot Password?</button>
              </div>
            </form>
          )}

          {mode === "recover-id" && (
            <form className="auth-card form-grid" onSubmit={recoverId}>
              <p className="eyebrow">Account Recovery</p>
              <h1><span>Find</span> Login ID</h1>
              <p className="muted">Enter the Gmail address registered by the administrator.</p>
              <input
                placeholder="Registered Gmail"
                type="email"
                value={idRecoveryEmail}
                onChange={(e) => setIdRecoveryEmail(e.target.value)}
              />
              {message && <p className="muted">{message}</p>}
              <button className="button primary auth-submit" type="submit">Send Login ID</button>
              <button className="button btn-cancel" type="button" onClick={() => setMode("login")}>Back to Login</button>
            </form>
          )}

          {mode === "reset-password" && (
            <form className="auth-card form-grid" onSubmit={resetStep === "request" ? requestPasswordReset : resetPassword}>
              <p className="eyebrow">Password Recovery</p>
              <h1><span>Reset</span> Password</h1>
              <p className="muted">Use your roll number, faculty number, or registered email.</p>
              <input
                placeholder="Login ID or registered email"
                value={resetForm.identifier}
                onChange={(e) => setResetForm({ ...resetForm, identifier: e.target.value })}
              />
              {resetStep === "confirm" && (
                <>
                  <input
                    placeholder="OTP"
                    value={resetForm.otp}
                    onChange={(e) => setResetForm({ ...resetForm, otp: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={resetForm.password}
                    onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                  />
                </>
              )}
              {message && <p className="muted">{message}</p>}
              <button className="button primary auth-submit" type="submit">
                {resetStep === "request" ? "Send OTP" : "Change Password"}
              </button>
              <button className="button btn-cancel" type="button" onClick={() => setMode("login")}>Back to Login</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
