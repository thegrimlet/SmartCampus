import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyStudent = {
  course: "",
  semester: "",
  department: "",
  rollNumber: "",
  name: "",
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

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export default function StudentsPanel({ onChanged }) {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ course: "", semester: "", enrollment: "" });
  const [message, setMessage] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((course) => course.courseCode === form.course),
    [courses, form.course]
  );

  const filterCourse = useMemo(
    () => courses.find((course) => course.courseCode === filters.course),
    [courses, filters.course]
  );

  const semesterOptions = useMemo(() => {
    if (!selectedCourse?.totalSemYear) return [];
    const label = selectedCourse.semYearType === "Year" ? "Year" : "Semester";
    return Array.from({ length: selectedCourse.totalSemYear }, (_, index) => `${label} ${index + 1}`);
  }, [selectedCourse]);

  const filterSemesterOptions = useMemo(() => {
    if (!filterCourse?.totalSemYear) return [];
    const label = filterCourse.semYearType === "Year" ? "Year" : "Semester";
    return Array.from({ length: filterCourse.totalSemYear }, (_, index) => `${label} ${index + 1}`);
  }, [filterCourse]);

  const filteredStudents = useMemo(() => {
    const enrollment = filters.enrollment.trim().toLowerCase();
    return students.filter((student) => {
      const rollNumber = student.rollNumber || student.user?.institutionalId || "";
      return (
        (!filters.course || student.course === filters.course) &&
        (!filters.semester || student.semester === filters.semester) &&
        (!enrollment || rollNumber.toLowerCase().includes(enrollment))
      );
    });
  }, [students, filters]);

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
      if (editingId) {
        await API.put(`/users/students/${editingId}`, form);
        setMessage("Student details updated");
      } else {
        await API.post("/users/students", form);
        setMessage("Student account created");
      }
      setForm(emptyStudent);
      setShowForm(false);
      setEditingId(null);
      await loadStudents();
      onChanged?.();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save student");
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyStudent);
    setShowForm(true);
  };

  const startEdit = (student) => {
    setEditingId(student._id);
    setForm({
      course: student.course || "",
      semester: student.semester || "",
      department: student.department || "",
      rollNumber: student.rollNumber || student.user?.institutionalId || "",
      name: student.user?.name || student.firstName || "",
      email: student.user?.email || "",
      phone: student.phone || "",
      password: "",
      dateOfBirth: formatDate(student.dateOfBirth),
      gender: student.gender || "",
      state: student.state || "",
      city: student.city || "",
      address: student.address || "",
      fatherName: student.fatherName || "",
      fatherOccupation: student.fatherOccupation || "",
      motherName: student.motherName || "",
      motherOccupation: student.motherOccupation || "",
      photoUrl: student.photoUrl || ""
    });
    setShowForm(true);
  };

  return (
    <section className="stack">
      <div className="catalog-hero">
        <h3>All Students</h3>
        <div className="button-row">
          <button className="button btn-edit" type="button">Photo View</button>
          <button className="button btn-edit" type="button" onClick={() => setShowFilters(!showFilters)}>View Student</button>
          <button className="button btn-save" type="button" onClick={startAdd}>Add Student</button>
        </div>
      </div>

      {showFilters && (
        <div className="catalog-modal form-grid">
          <h4>View Student</h4>
          <div className="course-filter-grid">
            <label className="field-stack">
              <span>Course</span>
              <select
                className="input"
                value={filters.course}
                onChange={(e) => setFilters({ ...filters, course: e.target.value, semester: "" })}
              >
                <option value="">All Courses</option>
                {courses.map((course) => (
                  <option key={course._id} value={course.courseCode}>{course.courseName}</option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Sem/Year</span>
              <select
                className="input"
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                disabled={!filters.course}
              >
                <option value="">All Sem/Year</option>
                {filterSemesterOptions.map((semester) => (
                  <option key={semester} value={semester}>{semester}</option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Enrollment No.</span>
              <input
                className="input"
                placeholder="Roll / enrollment no."
                value={filters.enrollment}
                onChange={(e) => setFilters({ ...filters, enrollment: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}

      {showForm && (
        <form className="catalog-modal form-grid" onSubmit={addStudent}>
          <div className="class-admin-head">
            <h4>{editingId ? "Edit Student" : "Add New Student"}</h4>
            <button
              className="button btn-cancel"
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyStudent);
              }}
            >
              Close
            </button>
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
            <input className="input" type="password" placeholder={editingId ? "New Password (optional)" : "Initial Password"} value={form.password} onChange={(e) => updateForm("password", e.target.value)} />
            <input className="input" placeholder="Student Name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
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

          <button className="button btn-save align-end" type="submit">{editingId ? "Update Student" : "Add Student"}</button>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student._id}>
                <td>{student.course || "-"}</td>
                <td>{student.rollNumber || student.user?.institutionalId}</td>
                <td>{student.user?.name}</td>
                <td>{student.course || "-"}</td>
                <td>{student.semester || "-"}</td>
                <td>
                  <button className="button btn-edit" type="button" onClick={() => startEdit(student)}>Edit</button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr><td colSpan="6">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
