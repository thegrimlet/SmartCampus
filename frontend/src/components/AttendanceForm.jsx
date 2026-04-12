import { useEffect, useState } from "react";
import API from "../services/api";

export default function AttendanceForm() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState("");
  const [attendance, setAttendance] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const studentRes = await API.get("/users/students");
      const subjectRes = await API.get("/subjects");

      setStudents(studentRes.data);
      setSubjects(subjectRes.data);

      const initial = {};
      studentRes.data.forEach((student) => {
        initial[student._id] = "present";
      });

      setAttendance(initial);
    };

    fetchData();
  }, []);

  const handleChange = (studentId, status) => {
    setAttendance({
      ...attendance,
      [studentId]: status
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!subject) {
      setMessage("Select a subject first");
      return;
    }

    const records = Object.keys(attendance).map((id) => ({
      studentId: id,
      subject,
      status: attendance[id]
    }));

    try {
      const res = await API.post("/attendance", { records });
      setMessage(`${res.data.saved.length} saved, ${res.data.skipped} skipped`);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Error marking attendance");
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h3>Mark Attendance</h3>

      <select
        className="input"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      >
        <option value="">Select subject</option>
        {subjects.map((s) => (
          <option key={s._id} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>

      <div className="stack">
        {students.length === 0 ? (
          <p className="muted">No approved students yet.</p>
        ) : (
          students.map((s) => (
            <div key={s._id} className="student-row">
              <strong>{s.name}</strong>
              <p className="muted">{s.email}</p>

              <div className="attendance-status">
                <label>
                  <input
                    type="radio"
                    name={s._id}
                    checked={attendance[s._id] === "present"}
                    onChange={() => handleChange(s._id, "present")}
                  />
                  Present
                </label>

                <label>
                  <input
                    type="radio"
                    name={s._id}
                    checked={attendance[s._id] === "absent"}
                    onChange={() => handleChange(s._id, "absent")}
                  />
                  Absent
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {message && <p className="muted">{message}</p>}

      <button className="button btn-save" type="submit">
        Submit Attendance
      </button>
    </form>
  );
}
