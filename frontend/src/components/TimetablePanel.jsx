import { useEffect, useState } from "react";
import API from "../services/api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetablePanel({ user }) {
  const [entries, setEntries] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [form, setForm] = useState({
    course: "",
    semester: "",
    subject: "",
    faculty: "",
    day: "Monday",
    startTime: "09:00",
    endTime: "10:00",
    room: ""
  });
  const [message, setMessage] = useState("");

  const fetchEntries = async () => {
    const res = await API.get("/timetable");
    setEntries(res.data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchEntries();
      if (user.role === "admin") {
        const facultyRes = await API.get("/users/faculty");
        setFaculty(facultyRes.data);
        setForm((current) => ({ ...current, faculty: facultyRes.data[0]?._id || "" }));
      }
    };

    load();
  }, [user.role]);

  const createEntry = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/timetable", form);
      setMessage("Timetable entry added");
      await fetchEntries();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to add timetable entry");
    }
  };

  const removeEntry = async (id) => {
    await API.delete(`/timetable/${id}`);
    await fetchEntries();
  };

  return (
    <div className="stack">
      <h3>Timetable</h3>

      {user.role === "admin" && (
        <form className="form-grid" onSubmit={createEntry}>
          <div className="two-column">
            <input className="input" placeholder="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            <input className="input" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <select className="input" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
              <option value="">Select faculty</option>
              {faculty.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>
            <select className="input" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {days.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
            <input className="input" placeholder="Room" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            <input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          {message && <p className="muted">{message}</p>}
          <button className="button btn-save" type="submit">Add Timetable Entry</button>
        </form>
      )}

      {entries.length === 0 ? <p className="muted">No timetable entries yet.</p> : entries.map((entry) => (
        <div className="record-row" key={entry._id}>
          <strong>{entry.day}: {entry.subject}</strong>
          <p className="muted">{entry.startTime}-{entry.endTime} - {entry.course} Sem {entry.semester} - {entry.room || "Room TBA"}</p>
          <p className="muted">Faculty: {entry.faculty?.name || "Unassigned"}</p>
          {user.role === "admin" && <button className="button btn-delete" onClick={() => removeEntry(entry._id)}>Delete</button>}
        </div>
      ))}
    </div>
  );
}
