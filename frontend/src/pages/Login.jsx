import { Link } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";
import "./dashboard.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
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
      setMessage(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card form-grid" onSubmit={handleLogin}>
        <p className="eyebrow">Smart Campus Management System</p>
        <h1>Welcome Back</h1>
        <p className="muted">Sign in to manage notices, attendance, subjects, and approvals.</p>

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

        {message && <p className="muted">{message}</p>}

        <button className="button primary" type="submit">Login</button>
        <p className="muted">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </main>
  );
}
