import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyForm = {
  className: "",
  course: "",
  semester: "",
  department: "",
  classTeacher: "",
  subjects: ""
};

export default function ClassAssignmentPanel() {
  const [assignments, setAssignments] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const classNames = useMemo(
    () => assignments.map((item) => item.className),
    [assignments]
  );

  const fetchAssignments = async () => {
    const res = await API.get("/class-assignments");
    setAssignments(res.data);
  };

  const loadClassIntoForm = (className, source = assignments) => {
    const assignment = source.find((item) => item.className === className);
    if (assignment) {
      setSelectedClass(className);
      setForm({
        className: assignment.className || "",
        course: assignment.course || "",
        semester: assignment.semester || "",
        department: assignment.department || "",
        classTeacher: assignment.classTeacher || "",
        subjects: (assignment.subjects || []).join(", ")
      });
      return;
    }

    setSelectedClass(className);
    setForm({ ...emptyForm, className });
  };

  useEffect(() => {
    const load = async () => {
      const res = await API.get("/class-assignments");
      setAssignments(res.data);
    };

    load();
  }, []);

  const saveAssignment = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.put(`/class-assignments/${encodeURIComponent(form.className.trim())}`, {
        ...form,
        subjects: form.subjects.split(",").map((item) => item.trim()).filter(Boolean)
      });
      setMessage("Class assignment saved");
      const res = await API.get("/class-assignments");
      setAssignments(res.data);
      loadClassIntoForm(form.className.trim(), res.data);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save class assignment");
    }
  };

  const deleteAssignment = async () => {
    if (!form.className.trim()) return;
    await API.delete(`/class-assignments/${encodeURIComponent(form.className.trim())}`);
    setMessage("Class assignment deleted");
    setSelectedClass("");
    setForm(emptyForm);
    await fetchAssignments();
  };

  return (
    <form className="stack" onSubmit={saveAssignment}>
      <h3>Academic Assignments by Class</h3>

      <div className="button-row class-pill-row">
        {classNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`class-pill ${selectedClass === name ? "active" : ""}`}
            onClick={() => loadClassIntoForm(name)}
          >
            {name}
          </button>
        ))}
        <button type="button" className="class-pill new" onClick={() => { setSelectedClass(""); setForm(emptyForm); }}>
          New Class
        </button>
      </div>

      <div className="two-column">
        <input className="input" placeholder="Class" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
        <input className="input" placeholder="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
        <input className="input" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
        <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input className="input" placeholder="Class teacher" value={form.classTeacher} onChange={(e) => setForm({ ...form, classTeacher: e.target.value })} />
      </div>

      <textarea className="input" placeholder="Subjects, comma separated" value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />

      {message && <p className="muted">{message}</p>}

      <div className="button-row">
        <button className="button btn-save" type="submit">Save Class</button>
        <button className="button btn-delete" type="button" onClick={deleteAssignment}>Delete Class</button>
      </div>
    </form>
  );
}
