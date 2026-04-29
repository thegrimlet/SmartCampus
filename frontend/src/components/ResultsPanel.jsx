import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyForm = {
  student: "",
  subject: "",
  course: "",
  semester: "",
  marksObtained: "",
  maxMarks: 100,
  grade: "",
  remarks: ""
};

export default function ResultsPanel({ user }) {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [summary, setSummary] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [message, setMessage] = useState("");

  const visibleResults = useMemo(() => {
    if (user.role === "student") return results;
    if (!selectedStudent) return results;
    return results.filter((result) => result.student?._id === selectedStudent);
  }, [results, selectedStudent, user.role]);

  const fetchResults = useCallback(async () => {
    const res = await API.get("/results");
    setResults(res.data);
  }, []);

  const fetchSummary = useCallback(async (studentId) => {
    if (!studentId && user.role !== "student") {
      setSummary(null);
      return;
    }

    const endpoint = user.role === "student"
      ? "/results/summary"
      : `/results/summary?student=${encodeURIComponent(studentId)}`;
    const res = await API.get(endpoint);
    setSummary(res.data);
  }, [user.role]);

  useEffect(() => {
    const load = async () => {
      await fetchResults();
      if (["admin", "faculty"].includes(user.role)) {
        const studentsRes = await API.get("/users/students");
        setStudents(studentsRes.data);
        const firstStudent = studentsRes.data[0]?._id || "";
        setSelectedStudent(firstStudent);
        setForm((current) => ({ ...current, student: firstStudent }));
        if (firstStudent) {
          await fetchSummary(firstStudent);
        }
      } else {
        await fetchSummary();
      }
    };

    load();
  }, [fetchResults, fetchSummary, user.role]);

  const saveResult = async (event) => {
    event.preventDefault();
    setMessage("");

    const payload = {
      ...form,
      marksObtained: Number(form.marksObtained),
      maxMarks: Number(form.maxMarks)
    };

    try {
      if (editingId) {
        await API.put(`/results/${editingId}`, payload);
        setMessage("Result updated");
      } else {
        await API.post("/results", payload);
        setMessage("Result saved");
      }

      setEditingId("");
      setForm((current) => ({ ...emptyForm, student: current.student }));
      await fetchResults();
      await fetchSummary(user.role === "student" ? undefined : (selectedStudent || payload.student));
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save result");
    }
  };

  const startEdit = (result) => {
    setEditingId(result._id);
    setForm({
      student: result.student?._id || "",
      subject: result.subject || "",
      course: result.course || "",
      semester: result.semester || "",
      marksObtained: result.marksObtained || "",
      maxMarks: result.maxMarks || 100,
      grade: result.grade || "",
      remarks: result.remarks || ""
    });
  };

  return (
    <div className="stack">
      <div>
        <h3>Academic Results</h3>
        <p className="muted">Record subject marks and review semester-wise marksheets with SGPA and CGPA snapshots.</p>
      </div>

      {["admin", "faculty"].includes(user.role) && (
        <form className="class-admin-card stack" onSubmit={saveResult}>
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Result Entry</p>
              <h4>{editingId ? "Edit Result" : "New Result"}</h4>
            </div>
            <button className="button btn-save" type="submit">{editingId ? "Update Result" : "Save Result"}</button>
          </div>

          <select
            className="input"
            value={form.student}
            onChange={async (e) => {
              const studentId = e.target.value;
              setForm({ ...form, student: studentId });
              setSelectedStudent(studentId);
              await fetchSummary(studentId);
            }}
          >
            <option value="">Select student</option>
            {students.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}
          </select>

          <div className="two-column">
            <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <input className="input" placeholder="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            <input className="input" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <input className="input" type="number" placeholder="Marks" value={form.marksObtained} onChange={(e) => setForm({ ...form, marksObtained: e.target.value })} />
            <input className="input" type="number" placeholder="Max marks" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
            <input className="input" placeholder="Grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value.toUpperCase() })} />
          </div>

          <textarea className="input" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        </form>
      )}

      {message && <p className="muted">{message}</p>}

      {summary && (
        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Marksheet</p>
              <h4>{summary.student?.name}</h4>
            </div>
            <p><strong>CGPA:</strong> {summary.cgpa ?? "Pending"}</p>
          </div>

          {summary.semesters.length === 0 ? (
            <p className="muted">No semester records yet.</p>
          ) : summary.semesters.map((semester) => (
            <div key={semester.semester} className="semester-card">
              <div className="class-admin-head">
                <div>
                  <strong>Semester {semester.semester}</strong>
                  <p className="muted">Percentage: {semester.percentage}%</p>
                </div>
                <p><strong>SGPA:</strong> {semester.sgpa ?? "Pending"}</p>
              </div>

              <div className="stack">
                {semester.entries.map((entry) => (
                  <div key={entry._id} className="assignment-row assignment-row-results">
                    <div>
                      <strong>{entry.subject}</strong>
                      <p className="muted">{entry.course || "Course not set"} {entry.remarks ? `| ${entry.remarks}` : ""}</p>
                    </div>
                    <div>
                      <strong>{entry.marksObtained}/{entry.maxMarks}</strong>
                      <p className="muted">Grade {entry.grade || "Pending"}</p>
                    </div>
                    {["admin", "faculty"].includes(user.role) && (
                      <button className="button btn-edit" type="button" onClick={() => startEdit(entry)}>
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="stack">
        <h4>{user.role === "student" ? "All Result Entries" : "Result Log"}</h4>
        {visibleResults.length === 0 ? (
          <p className="muted">No results yet.</p>
        ) : visibleResults.map((result) => (
          <div className="record-row" key={result._id}>
            <strong>{result.subject}: {result.marksObtained}/{result.maxMarks}</strong>
            <p className="muted">{result.student?.name} | Grade {result.grade || "Pending"}</p>
            <p className="muted">{result.course || "Course not set"} | Semester {result.semester || "Not set"}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
