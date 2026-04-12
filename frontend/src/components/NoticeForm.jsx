import { useState } from "react";
import API from "../services/api";

export default function NoticeForm({ onCreated }) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    role: "all"
  });
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/notices", form);
      setForm({ title: "", content: "", role: "all" });
      setMessage("Notice posted");
      onCreated?.(res.data);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to create notice");
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <h3>Create Notice</h3>

      <input
        className="input"
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <textarea
        className="input"
        placeholder="Content"
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
      />

      <select
        className="input"
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
      >
        <option value="all">All</option>
        <option value="student">Student</option>
        <option value="faculty">Faculty</option>
      </select>

      {message && <p className="muted">{message}</p>}

      <button className="button btn-save" type="submit">
        Post Notice
      </button>
    </form>
  );
}
