import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import "./dashboard.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setMessage("Verification link is missing its token.");
        setIsError(true);
        return;
      }

      try {
        const res = await API.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        setMessage(res.data.msg || "Email verified");
      } catch (err) {
        setMessage(err.response?.data?.msg || "Email verification failed");
        setIsError(true);
      }
    };

    verify();
  }, [searchParams]);

  return (
    <main className="auth-page">
      <section className="auth-card form-grid">
        <p className="eyebrow">Email Verification</p>
        <h1>{isError ? "We hit a snag" : "You’re verified"}</h1>
        <p className="muted">{message}</p>
        <p className="muted">
          <Link to="/">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
