import { useEffect, useState } from "react";
import API from "../services/api";

export default function ResultsPanel({ user }) {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    student: "",
    subject: "",
    course: "",
    semester: "",
    marksObtained: "",
    maxMarks: 100,
    grade: "",
    remarks: ""
  });
  const [message, setMessage] = useState("");

  const fetchResults = async () => {
    const res = await API.get("/results");
    setResults(res.data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchResults();
      if (["admin", "faculty"].includes(user.role)) {
        const studentsRes = await API.get("/users/students");
        setStudents(studentsRes.data);
        setForm((current) => ({ ...current, student: studentsRes.data[0]?._id || "" }));
      }
    };

    load();
  }, [user.role]);

  const createResult = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/results", {
        ...form,
        marksObtained: Number(form.marksObtained),
        maxMarks: Number(form.maxMarks)
      });
      setMessage("Result saved");
      await fetchResults();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save result");
    }
  };

  return (
    <div className="stack">
      <h3>Academic Results</h3>

      {["admin", "faculty"].includes(user.role) && (
        <form className="form-grid" onSubmit={createResult}>
          <select className="input" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
            <option value="">Select student</option>
            {students.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}
          </select>
          <div className="two-column">
            <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <input className="input" placeholder="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            <input className="input" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <input className="input" type="number" placeholder="Marks" value={form.marksObtained} onChange={(e) => setForm({ ...form, marksObtained: e.target.value })} />
            <input className="input" type="number" placeholder="Max marks" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
            <input className="input" placeholder="Grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
          <textarea className="input" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          {message && <p className="muted">{message}</p>}
          <button className="button btn-save" type="submit">Save Result</button>
        </form>
      )}

      {results.length === 0 ? <p className="muted">No results yet.</p> : results.map((result) => (
        <div className="record-row" key={result._id}>
          <strong>{result.subject}: {result.marksObtained}/{result.maxMarks}</strong>
          <p className="muted">{result.student?.name} - Grade {result.grade || "Pending"}</p>
          <p className="muted">{result.course} Sem {result.semester} {result.remarks ? `- ${result.remarks}` : ""}</p>
        </div>
      ))}
    </div>
  );
}
