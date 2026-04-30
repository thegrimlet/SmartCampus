import { useEffect, useState } from "react";
import API from "../services/api";

const emptyCourse = {
  courseCode: "",
  courseName: "",
  semYearType: "Semester",
  totalSemYear: "",
  department: ""
};

export default function CoursesPanel({ onChanged }) {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCourse);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCourses = async () => {
    const res = await API.get("/courses");
    setCourses(res.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
  }, []);

  const saveCourse = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/courses", {
        ...form,
        totalSemYear: Number(form.totalSemYear)
      });
      setForm(emptyCourse);
      setShowForm(false);
      setMessage("Course added");
      await fetchCourses();
      onChanged?.();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save course");
    }
  };

  const deleteCourse = async (id) => {
    await API.delete(`/courses/${id}`);
    await fetchCourses();
    onChanged?.();
  };

  return (
    <section className="stack">
      <div className="catalog-hero">
        <h3>All Courses</h3>
        <div className="button-row">
          <button className="button btn-edit" type="button">Roll Generator</button>
          <button className="button btn-save" type="button" onClick={() => setShowForm(true)}>Add Course</button>
        </div>
      </div>

      {showForm && (
        <form className="catalog-modal form-grid" onSubmit={saveCourse}>
          <div className="class-admin-head">
            <h4>Add New Course</h4>
            <button className="button btn-cancel" type="button" onClick={() => setShowForm(false)}>Close</button>
          </div>
          <div className="two-column">
            <label className="field-stack">
              <span>Course Code</span>
              <input className="input" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} />
            </label>
            <label className="field-stack">
              <span>Course Name</span>
              <input className="input" value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} />
            </label>
            <label className="field-stack">
              <span>Sem/Year</span>
              <select className="input" value={form.semYearType} onChange={(e) => setForm({ ...form, semYearType: e.target.value })}>
                <option value="Semester">Semester</option>
                <option value="Year">Year</option>
              </select>
            </label>
            <label className="field-stack">
              <span>Total Sem/Year</span>
              <input className="input" type="number" min="1" value={form.totalSemYear} onChange={(e) => setForm({ ...form, totalSemYear: e.target.value })} />
            </label>
            <label className="field-stack">
              <span>Department</span>
              <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </label>
          </div>
          <button className="button btn-save" type="submit">Add Course</button>
        </form>
      )}

      {message && <p className="muted">{message}</p>}

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Index no.</th>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Subjects</th>
              <th>Students</th>
              <th>Total Sem/Year</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, index) => (
              <tr key={course._id}>
                <td>{index + 1}</td>
                <td>{course.courseCode}</td>
                <td>{course.courseName}</td>
                <td>{course.subjectCount || 0}</td>
                <td>{course.studentCount || 0}</td>
                <td>{course.totalSemYear} {course.semYearType === "Semester" ? "sem" : "year"}</td>
                <td>
                  <button className="button btn-delete" type="button" onClick={() => deleteCourse(course._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan="7">No courses added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
