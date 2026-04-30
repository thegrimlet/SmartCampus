import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyStudent = {
  course: "",
  semester: "",
  department: "",
  rollNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  dateOfBirth: "",
  gender: "",
  state: "",
  city: "",
  address: "",
  fatherName: "",
  fatherOccupation: "",
  motherName: "",
  motherOccupation: "",
  photoUrl: ""
};

export default function StudentsPanel({ onChanged }) {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((course) => course.courseCode === form.course),
    [courses, form.course]
  );

  const semesterOptions = useMemo(() => {
    if (!selectedCourse?.totalSemYear) return [];
    const label = selectedCourse.semYearType === "Year" ? "Year" : "Semester";
    return Array.from({ length: selectedCourse.totalSemYear }, (_, index) => `${label} ${index + 1}`);
  }, [selectedCourse]);

  const loadStudents = async () => {
    const res = await API.get("/users/students/manage");
    setStudents(res.data);
  };

  const loadCourses = async () => {
    const res = await API.get("/courses");
    setCourses(res.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudents();
    loadCourses();
  }, []);

  const updateForm = (field, value) => {
    const next = { ...form, [field]: value };
    if (field === "course") {
      const course = courses.find((item) => item.courseCode === value);
      next.semester = "";
      next.department = course?.department || "";
    }
    setForm(next);
  };

  const addStudent = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/users/students", form);
      setForm(emptyStudent);
      setShowForm(false);
      setMessage("Student account created");
      await loadStudents();
      onChanged?.();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to create student");
    }
  };

  return (
    <section className="stack">
      <div className="catalog-hero">
        <h3>All Students</h3>
        <div className="button-row">
          <button className="button btn-edit" type="button">Photo View</button>
          <button className="button btn-edit" type="button">View Student</button>
          <button className="button btn-save" type="button" onClick={() => setShowForm(true)}>Add Student</button>
        </div>
      </div>

      {showForm && (
        <form className="catalog-modal form-grid" onSubmit={addStudent}>
          <div className="class-admin-head">
            <h4>Add New Student</h4>
            <button className="button btn-cancel" type="button" onClick={() => setShowForm(false)}>Close</button>
          </div>

          <div className="two-column">
            <select className="input" value={form.course} onChange={(e) => updateForm("course", e.target.value)}>
              <option value="">---Select Course---</option>
              {courses.map((course) => (
                <option key={course._id} value={course.courseCode}>{course.courseName}</option>
              ))}
            </select>
            <select className="input" value={form.semester} onChange={(e) => updateForm("semester", e.target.value)}>
              <option value="">---Select Sem/Year---</option>
              {semesterOptions.map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
            <input className="input" placeholder="Roll Number" value={form.rollNumber} onChange={(e) => updateForm("rollNumber", e.target.value)} />
            <input className="input" type="password" placeholder="Initial Password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} />
            <input className="input" placeholder="First Name" value={form.firstName} onChange={(e) => updateForm("firstName", e.target.value)} />
            <input className="input" placeholder="Last Name" value={form.lastName} onChange={(e) => updateForm("lastName", e.target.value)} />
            <input className="input" type="email" placeholder="Email ID" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
            <input className="input" placeholder="Contact Number" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
            <input className="input" type="date" value={form.dateOfBirth} onChange={(e) => updateForm("dateOfBirth", e.target.value)} />
            <select className="input" value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}>
              <option value="">---Select Gender---</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input className="input" placeholder="State" value={form.state} onChange={(e) => updateForm("state", e.target.value)} />
            <input className="input" placeholder="City" value={form.city} onChange={(e) => updateForm("city", e.target.value)} />
            <input className="input" placeholder="Father Name" value={form.fatherName} onChange={(e) => updateForm("fatherName", e.target.value)} />
            <input className="input" placeholder="Father Occupation" value={form.fatherOccupation} onChange={(e) => updateForm("fatherOccupation", e.target.value)} />
            <input className="input" placeholder="Mother Name" value={form.motherName} onChange={(e) => updateForm("motherName", e.target.value)} />
            <input className="input" placeholder="Mother Occupation" value={form.motherOccupation} onChange={(e) => updateForm("motherOccupation", e.target.value)} />
            <input className="input" placeholder="Address" value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
            <input className="input" placeholder="Photo URL" value={form.photoUrl} onChange={(e) => updateForm("photoUrl", e.target.value)} />
          </div>

          <button className="button btn-save align-end" type="submit">Add Student</button>
        </form>
      )}

      {message && <p className="muted">{message}</p>}

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Roll Number</th>
              <th>Student Name</th>
              <th>Course Name</th>
              <th>Sem/Year</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student._id}>
                <td>{student.course || "-"}</td>
                <td>{student.rollNumber || student.user?.institutionalId}</td>
                <td>{student.user?.name}</td>
                <td>{student.course || "-"}</td>
                <td>{student.semester || "-"}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan="5">No students added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
