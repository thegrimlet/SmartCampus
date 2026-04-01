import { useState } from "react";
import API from "../services/api";

export default function AttendanceForm() {
  const [form, setForm] = useState({
    studentId: "",
    subject: "",
    status: "present"
  });

  const handleSubmit = async () => {
    try {
      await API.post("/attendance", form);
      alert("Attendance marked");
    } catch (err) {
      alert("Error marking attendance");
    }
  };

  return (
    <div className="card">
      <h3>Mark Attendance</h3>

      <input
        className="input"
        placeholder="Student ID"
        onChange={(e) =>
          setForm({ ...form, studentId: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Subject"
        onChange={(e) =>
          setForm({ ...form, subject: e.target.value })
        }
      />

      <select
        className="input"
        onChange={(e) =>
          setForm({ ...form, status: e.target.value })
        }
      >
        <option value="present">Present</option>
        <option value="absent">Absent</option>
      </select>

      <button className="button btn-save" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
}