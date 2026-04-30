import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptySubject = {
  subjectCode: "",
  name: "",
  subjectType: "Core",
  theoryMarks: "",
  practicalMarks: ""
};

export default function CourseSubjectsPanel({ onChanged }) {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [semester, setSemester] = useState("");
  const [form, setForm] = useState(emptySubject);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === courseId),
    [courseId, courses]
  );

  const semesterOptions = useMemo(() => {
    if (!selectedCourse) return [];
    return Array.from({ length: Number(selectedCourse.totalSemYear || 0) }, (_, index) =>
      `${selectedCourse.semYearType} ${index + 1}`
    );
  }, [selectedCourse]);

  const fetchSubjects = async (nextCourse = courseId, nextSemester = semester) => {
    const params = new URLSearchParams();
    if (nextCourse) params.set("course", nextCourse);
    if (nextSemester) params.set("semester", nextSemester);
    const res = await API.get(`/subjects${params.toString() ? `?${params.toString()}` : ""}`);
    setSubjects(res.data);
  };

  useEffect(() => {
    const load = async () => {
      const coursesRes = await API.get("/courses");
      setCourses(coursesRes.data);
      const firstCourse = coursesRes.data[0];
      if (firstCourse) {
        const firstSemester = `${firstCourse.semYearType} 1`;
        setCourseId(firstCourse._id);
        setSemester(firstSemester);
        await fetchSubjects(firstCourse._id, firstSemester);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCourse = async (value) => {
    const course = courses.find((item) => item._id === value);
    const nextSemester = course ? `${course.semYearType} 1` : "";
    setCourseId(value);
    setSemester(nextSemester);
    await fetchSubjects(value, nextSemester);
  };

  const changeSemester = async (value) => {
    setSemester(value);
    await fetchSubjects(courseId, value);
  };

  const saveSubject = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/subjects", {
        ...form,
        course: courseId,
        semester,
        theoryMarks: Number(form.theoryMarks || 0),
        practicalMarks: Number(form.practicalMarks || 0)
      });
      setForm(emptySubject);
      setShowForm(false);
      setMessage("Subject added");
      await fetchSubjects();
      onChanged?.();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save subject");
    }
  };

  const deleteSubject = async (id) => {
    await API.delete(`/subjects/${id}`);
    await fetchSubjects();
    onChanged?.();
  };

  return (
    <section className="stack">
      <div className="catalog-hero compact">
        <h3>Subject Management</h3>
      </div>

      <div className="course-filter-grid">
        <label className="field-stack">
          <span>Select Course</span>
          <select className="input" value={courseId} onChange={(e) => changeCourse(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>{course.courseCode}</option>
            ))}
          </select>
        </label>

        <label className="field-stack">
          <span>Select Semester/Year</span>
          <select className="input" value={semester} onChange={(e) => changeSemester(e.target.value)}>
            <option value="">Select semester/year</option>
            {semesterOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <div className="button-row align-end">
          <button className="button btn-save" type="button" onClick={() => setShowForm(true)} disabled={!courseId || !semester}>
            Add New Subject
          </button>
        </div>
      </div>

      {showForm && (
        <form className="catalog-modal form-grid" onSubmit={saveSubject}>
          <div className="class-admin-head">
            <h4>Add New Subject</h4>
            <button className="button btn-cancel" type="button" onClick={() => setShowForm(false)}>Close</button>
          </div>
          <div className="two-column">
            <input className="input" placeholder="Subject code" value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} />
            <input className="input" placeholder="Subject name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="input" value={form.subjectType} onChange={(e) => setForm({ ...form, subjectType: e.target.value })}>
              <option value="Core">Core</option>
              <option value="Specialisation Elective">Specialisation Elective</option>
            </select>
            <input className="input" type="number" placeholder="Theory marks" value={form.theoryMarks} onChange={(e) => setForm({ ...form, theoryMarks: e.target.value })} />
            <input className="input" type="number" placeholder="Practical marks" value={form.practicalMarks} onChange={(e) => setForm({ ...form, practicalMarks: e.target.value })} />
          </div>
          <button className="button btn-save" type="submit">Add Subject</button>
        </form>
      )}

      {message && <p className="muted">{message}</p>}

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Name</th>
              <th>Sem/Year</th>
              <th>Subject Type</th>
              <th>Theory Marks</th>
              <th>Practical Marks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject._id}>
                <td>{subject.subjectCode || "--"}</td>
                <td>{subject.name}</td>
                <td>{subject.semester || "--"}</td>
                <td>{subject.subjectType}</td>
                <td>{subject.theoryMarks}</td>
                <td>{subject.practicalMarks}</td>
                <td>
                  <button className="button btn-delete" type="button" onClick={() => deleteSubject(subject._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr>
                <td colSpan="7">No subjects added for this selection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
