import { Link } from "react-router-dom";
import ProfilePanel from "../components/ProfilePanel";
import "./dashboard.css";

export default function Profile() {
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  if (!user) return <h2>Not logged in</h2>;

  return (
    <main className="dashboard">
      <div className="shell">
        <section className="header">
          <div>
            <p className="eyebrow">Smart Campus</p>
            <h1>My Profile</h1>
            <p className="muted">{user.name} - {user.email}</p>
          </div>

          <div className="button-row">
            <Link className="button btn-edit link-button" to="/dashboard">
              Dashboard
            </Link>
            <button className="button logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </section>

        <section className="grid">
          <div className="panel">
            <ProfilePanel user={user} />
          </div>
        </section>
      </div>
    </main>
  );
}
