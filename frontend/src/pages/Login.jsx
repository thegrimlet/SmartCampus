import { useState } from "react";
import API from "../services/api";

export default function Login() {
    const [form, setForm] = useState({ email: "", password: "" });

    const handleLogin = async () => {
        try {
            const res = await API.post("/auth/login", form);

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            window.location.href = "/dashboard";
        } catch (err) {
            console.log(err.response?.data || err.message);
            alert(err.response?.data?.msg || "Login failed");
        }
    };

    return (
        <div>
            <h2>Login</h2>

            <input placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input type="password" placeholder="Password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <button onClick={handleLogin}>Login</button>
            <p>
                Don't have an account?{" "}
                <a href="/register">Register</a>
            </p>
        </div>
    );
}