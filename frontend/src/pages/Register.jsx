import { Link } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";
import "./dashboard.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student"
  });
  const [message, setMessage] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/register", form);
      setMessage(res.data.msg || "Registered successfully");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Registration failed");
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card form-grid" onSubmit={handleRegister}>
        <p className="eyebrow">Create Access</p>
        <h1>Join Campus</h1>
        <p className="muted">The first admin is approved automatically. Everyone else waits for admin approval.</p>

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
          <option value="admin">Admin</option>
        </select>

        {message && <p className="muted">{message}</p>}

        <button className="button primary" type="submit">Register</button>
        <p className="muted">
          Already approved? <Link to="/">Login</Link>
        </p>
      </form>
    </main>
  );
}
