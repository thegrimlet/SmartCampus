import { useState } from "react";
import API from "../services/api";
import "../pages/dashboard.css";

export default function NoticeForm() {
  const [form, setForm] = useState({
    title: "",
    content: "",
    role: "all"
  });

  const handleSubmit = async () => {
    try {
      await API.post("/notices", form);
      alert("Notice created");

      setForm({ title: "", content: "", role: "all" });

      window.location.reload(); // yes it's ugly, we’ll fix later
    } catch (err) {
      console.log(err.response?.data || err.message);
      alert("Failed to create notice");
    }
  };

  return (
    <div className="card">
      <h3>Create Notice</h3>

      <input
        className="input"
        placeholder="Title"
        value={form.title}
        onChange={(e) =>
          setForm({ ...form, title: e.target.value })
        }
      />

      <textarea
        className="input"
        placeholder="Content"
        value={form.content}
        onChange={(e) =>
          setForm({ ...form, content: e.target.value })
        }
      />

      <select
        className="input"
        value={form.role}
        onChange={(e) =>
          setForm({ ...form, role: e.target.value })
        }
      >
        <option value="all">All</option>
        <option value="student">Student</option>
        <option value="faculty">Faculty</option>
      </select>

      <button className="button btn-save" onClick={handleSubmit}>
        Post Notice
      </button>
    </div>
  );
}