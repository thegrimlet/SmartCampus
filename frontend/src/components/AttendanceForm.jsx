import { useEffect, useState } from "react";
import API from "../services/api";

export default function AttendanceForm() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [form, setForm] = useState({
    studentId: "",
    subject: "",
    status: "present"
  });

  // 🔥 Fetch students + subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentRes = await API.get("/users/students");
        const subjectRes = await API.get("/subjects");

        setStudents(studentRes.data);
        setSubjects(subjectRes.data);
      } catch (err) {
        console.log(err.response?.data || err.message);
      }
    };

    fetchData();
  }, []);

  // 🔥 Submit attendance
  const handleSubmit = async () => {
    if (!form.studentId || !form.subject) {
      return alert("Please select student and subject");
    }

    try {
      await API.post("/attendance", form);
      alert("Attendance marked");

      // reset form
      setForm({
        studentId: "",
        subject: "",
        status: "present"
      });
    } catch (err) {
      console.log(err.response?.data || err.message);
      alert("Error marking attendance");
    }
  };

  return (
    <div className="card">
      <h3>Mark Attendance</h3>

      {/* STUDENT DROPDOWN */}
      <select
        className="input"
        value={form.studentId}
        onChange={(e) =>
          setForm({ ...form, studentId: e.target.value })
        }
      >
        <option value="">Select Student</option>

        {students.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name} ({s.email})
          </option>
        ))}
      </select>

      {/* SUBJECT DROPDOWN */}
      <select
        className="input"
        value={form.subject}
        onChange={(e) =>
          setForm({ ...form, subject: e.target.value })
        }
      >
        <option value="">Select Subject</option>

        {subjects.map((s) => (
          <option key={s._id} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>

      {/* STATUS */}
      <select
        className="input"
        value={form.status}
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