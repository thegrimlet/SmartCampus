import { useEffect, useState } from "react";
import API from "../services/api";
import NoticeForm from "../components/NoticeForm";
import "./dashboard.css";

export default function Dashboard() {
  const [notices, setNotices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    role: "all"
  });

  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const fetchNotices = async () => {
    const res = await API.get("/notices");
    setNotices(res.data);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleDelete = async (id) => {
    await API.delete(`/notices/${id}`);
    setNotices(notices.filter((n) => n._id !== id));
  };

  const startEdit = (n) => {
    setEditingId(n._id);
    setEditForm({
      title: n.title,
      content: n.content,
      role: n.role
    });
  };

  const handleUpdate = async (id) => {
    const res = await API.put(`/notices/${id}`, editForm);

    setNotices(
      notices.map((n) => (n._id === id ? res.data : n))
    );

    setEditingId(null);
  };

  if (!user) return <h2>Not logged in</h2>;

  return (
    <div className="dashboard">

      {/* HEADER */}
      <div className="header">
        <div>
          <h2>Dashboard</h2>
          <p>{user.email} ({user.role})</p>
        </div>

        <button className="button logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* ADMIN PANEL */}
      {user.role === "admin" && (
        <div className="card">
          <h3>Admin Panel</h3>

          <NoticeForm />

          <h3>Manage Notices</h3>

          {notices.map((n) => (
            <div key={n._id} className="card notice-card">

              {editingId === n._id ? (
                <>
                  <input
                    className="input"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                  />

                  <textarea
                    className="input"
                    value={editForm.content}
                    onChange={(e) =>
                      setEditForm({ ...editForm, content: e.target.value })
                    }
                  />

                  <select
                    className="input"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                  >
                    <option value="all">All</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>

                  <button className="button btn-save" onClick={() => handleUpdate(n._id)}>
                    Save
                  </button>

                  <button className="button btn-cancel" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h4>{n.title}</h4>
                  <p>{n.content}</p>

                  <button className="button btn-edit" onClick={() => startEdit(n)}>
                    Edit
                  </button>

                  <button className="button btn-delete" onClick={() => handleDelete(n._id)}>
                    Delete
                  </button>
                </>
              )}

            </div>
          ))}
        </div>
      )}

      {/* STUDENT / FACULTY */}
      {user.role !== "admin" && (
        <div className="card">
          <h3>Notices</h3>

          {notices.map((n) => (
            <div key={n._id} className="card notice-card">
              <h4>{n.title}</h4>
              <p>{n.content}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}