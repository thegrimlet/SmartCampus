import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyFilters = {
  course: "",
  semester: "",
  subject: "",
  status: "",
  student: "",
  faculty: "",
  from: "",
  to: ""
};

const emptyOptions = {
  courses: [],
  semesters: [],
  semestersByCourse: {},
  subjects: [],
  students: [],
  faculties: []
};

export default function AdminAttendanceRecords() {
  const [filters, setFilters] = useState(emptyFilters);
  const [options, setOptions] = useState(emptyOptions);
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState("");

  const stats = useMemo(() => {
    const present = records.filter((record) => record.status === "present").length;
    const absent = records.filter((record) => record.status === "absent").length;
    const total = records.length;
    return {
      total,
      present,
      absent,
      percentage: total ? Math.round((present / total) * 100) : 0
    };
  }, [records]);

  const semesterOptions = useMemo(() => {
    if (!filters.course) return [];
    return options.semestersByCourse?.[filters.course] || [];
  }, [filters.course, options.semestersByCourse]);

  const studentOptions = useMemo(() => {
    if (!filters.course || !filters.semester) return [];
    return options.students.filter((student) =>
      student.scopes?.some((scope) => scope.course === filters.course && scope.semester === filters.semester)
    );
  }, [filters.course, filters.semester, options.students]);

  const fetchRecords = async (nextFilters = filters) => {
    setMessage("");
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    try {
      const res = await API.get(`/attendance/admin/records${params.toString() ? `?${params.toString()}` : ""}`);
      setRecords(res.data);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to load attendance records");
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [optionsRes, recordsRes] = await Promise.all([
          API.get("/attendance/admin/filter-options"),
          API.get("/attendance/admin/records")
        ]);
        setOptions(optionsRes.data);
        setRecords(recordsRes.data);
      } catch (err) {
        setMessage(err.response?.data?.msg || "Failed to load attendance records");
      }
    };

    load();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRecords(filters);
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const updateFilter = (field, value) => {
    setFilters((current) => {
      const next = {
        ...current,
        [field]: value
      };

      if (field === "course") {
        next.semester = "";
        next.student = "";
      }

      if (field === "semester") {
        next.student = "";
      }

      return next;
    });
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  return (
    <div className="stack">
      <div>
        <h3>Attendance Records</h3>
        <p className="muted">Filter submitted attendance by course, subject, date, student, or faculty.</p>
      </div>

      <div className="stats admin-stats">
        <div className="stat-card"><span>Records</span><strong>{stats.total}</strong></div>
        <div className="stat-card"><span>Present</span><strong>{stats.present}</strong></div>
        <div className="stat-card"><span>Absent</span><strong>{stats.absent}</strong></div>
        <div className="stat-card"><span>Average</span><strong>{stats.percentage}%</strong></div>
      </div>

      <div className="attendance-admin-filters">
        <select className="input" value={filters.course} onChange={(e) => updateFilter("course", e.target.value)}>
          <option value="">All courses</option>
          {options.courses.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>

        <select className="input" value={filters.semester} onChange={(e) => updateFilter("semester", e.target.value)} disabled={!filters.course}>
          <option value="">{filters.course ? "All semesters" : "Select course first"}</option>
          {semesterOptions.map((semester) => (
            <option key={semester} value={semester}>{semester}</option>
          ))}
        </select>

        <select className="input" value={filters.subject} onChange={(e) => updateFilter("subject", e.target.value)}>
          <option value="">All subjects</option>
          {options.subjects.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>

        <select className="input" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          <option value="">All status</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>

        <select className="input" value={filters.student} onChange={(e) => updateFilter("student", e.target.value)} disabled={!filters.semester}>
          <option value="">{filters.semester ? "All students" : "Select semester first"}</option>
          {studentOptions.map((student) => (
            <option key={student._id} value={student._id}>{student.name}</option>
          ))}
        </select>

        <select className="input" value={filters.faculty} onChange={(e) => updateFilter("faculty", e.target.value)}>
          <option value="">All faculty</option>
          {options.faculties.map((faculty) => (
            <option key={faculty._id} value={faculty._id}>{faculty.name}</option>
          ))}
        </select>

        <input className="input" type="date" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} />
        <input className="input" type="date" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} />

        <div className="attendance-admin-actions">
          <button className="button btn-cancel" type="button" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {message && <p className="muted">{message}</p>}

      <div className="table-wrap">
        <table className="admin-table attendance-records-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Student</th>
              <th>Class</th>
              <th>Course</th>
              <th>Subject</th>
              <th>Faculty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan="8">No attendance records found.</td>
              </tr>
            ) : records.map((record) => (
              <tr key={record._id}>
                <td>{record.lectureDate ? new Date(record.lectureDate).toLocaleDateString() : "--"}</td>
                <td>{record.startTime && record.endTime ? `${record.startTime}-${record.endTime}` : "--"}</td>
                <td>{record.studentId?.name || "Student"}</td>
                <td>{record.className || "--"}{record.batch ? ` (${record.batch})` : ""}</td>
                <td>{record.timetableEntry?.course || "--"} {record.timetableEntry?.semester || ""}</td>
                <td>{record.subject || "--"}</td>
                <td>{record.faculty?.name || "--"}</td>
                <td><span className={`status-pill ${record.status}`}>{record.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
