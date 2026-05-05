import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import NoticeForm from "../components/NoticeForm";
import "./dashboard.css";
import AttendanceForm from "../components/AttendanceForm";
import AttendanceView from "../components/AttendanceView";
import CoursesPanel from "../components/CoursesPanel";
import CourseSubjectsPanel from "../components/CourseSubjectsPanel";
import StudentsPanel from "../components/StudentsPanel";
import FacultiesPanel from "../components/FacultiesPanel";
import TimetablePanel from "../components/TimetablePanel";
import PaymentsPanel from "../components/PaymentsPanel";
import ResultsPanel from "../components/ResultsPanel";
import MessagesPanel from "../components/MessagesPanel";
import StudentPortal from "../components/StudentPortal";

const adminMenuItems = [
  { id: "notices", label: "Notice" },
  { id: "academics", label: "Course and Subject Management" },
  { id: "students", label: "Students" },
  { id: "faculties", label: "Faculties" },
  { id: "timetable", label: "Timetable Builder" },
  { id: "fees", label: "Fees" }
];

const adminSectionTitles = {
  notices: "Notice",
  academics: "Course and Subject Management",
  students: "Students",
  faculties: "Faculties",
  timetable: "Timetable Builder",
  fees: "Fees"
};

export default function Dashboard() {
  const [activeAdminSection, setActiveAdminSection] = useState("notices");
  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalCourses: 0,
    totalSubjects: 0,
    totalNotices: 0,
    totalAttendance: 0,
    totalPayments: 0,
    paidPayments: 0,
    timetableEntries: 0,
    totalResults: 0
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    role: "all"
  });

  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const fetchNotices = async () => {
    const res = await API.get("/notices");
    setNotices(res.data);
  };

  const fetchStats = async () => {
    if (user?.role !== "admin") return;
    const res = await API.get("/admin/stats");
    setStats(res.data);
  };

  useEffect(() => {
    fetchNotices();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    await API.delete(`/notices/${id}`);
    setNotices(notices.filter((n) => n._id !== id));
    fetchStats();
  };

  const startEdit = (notice) => {
    setEditingId(notice._id);
    setEditForm({
      title: notice.title,
      content: notice.content,
      role: notice.role
    });
  };

  const handleUpdate = async (id) => {
    const res = await API.put(`/notices/${id}`, editForm);
    setNotices(notices.map((n) => (n._id === id ? res.data : n)));
    setEditingId(null);
  };

  const handleNoticeCreated = (notice) => {
    setNotices([notice, ...notices]);
    fetchStats();
  };

  if (!user) return <h2>Not logged in</h2>;

  if (user.role === "student") {
    return <StudentPortal user={user} onLogout={handleLogout} />;
  }

  const renderNoticeManager = () => (
    <div className="stack">
      <div className="stats admin-stats">
        <div className="stat-card"><span>Students</span><strong>{stats.totalStudents}</strong></div>
        <div className="stat-card"><span>Faculty</span><strong>{stats.totalFaculty}</strong></div>
        <div className="stat-card"><span>Courses</span><strong>{stats.totalCourses}</strong></div>
        <div className="stat-card"><span>Subjects</span><strong>{stats.totalSubjects}</strong></div>
        <div className="stat-card"><span>Notices</span><strong>{stats.totalNotices}</strong></div>
        <div className="stat-card"><span>Attendance</span><strong>{stats.totalAttendance}</strong></div>
        <div className="stat-card"><span>Timetable</span><strong>{stats.timetableEntries}</strong></div>
        <div className="stat-card"><span>Fees Paid</span><strong>{stats.paidPayments}/{stats.totalPayments}</strong></div>
      </div>

      <div className="panel">
        <NoticeForm onCreated={handleNoticeCreated} />
      </div>

      <div className="panel stack">
        <h3>Manage Notices</h3>
        {notices.length === 0 ? (
          <p className="muted">No notices yet.</p>
        ) : notices.map((n) => (
          <div key={n._id} className="notice-card">
            {editingId === n._id ? (
              <div className="form-grid">
                <input
                  className="input"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />

                <textarea
                  className="input"
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                />

                <select
                  className="input"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="all">All</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>

                <div className="button-row">
                  <button className="button btn-save" onClick={() => handleUpdate(n._id)}>
                    Save
                  </button>
                  <button className="button btn-cancel" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="eyebrow">{n.role}</p>
                <h4>{n.title}</h4>
                <p>{n.content}</p>
                <div className="button-row">
                  <button className="button btn-edit" onClick={() => startEdit(n)}>
                    Edit
                  </button>
                  <button className="button btn-delete" onClick={() => handleDelete(n._id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminSection = () => {
    switch (activeAdminSection) {
      case "academics":
        return (
          <div className="stack">
            <div className="panel">
              <CoursesPanel onChanged={fetchStats} />
            </div>
            <div className="panel">
              <CourseSubjectsPanel onChanged={fetchStats} />
            </div>
          </div>
        );
      case "students":
        return (
          <div className="panel">
            <StudentsPanel onChanged={fetchStats} />
          </div>
        );
      case "faculties":
        return (
          <div className="panel">
            <FacultiesPanel onChanged={fetchStats} />
          </div>
        );
      case "timetable":
        return (
          <div className="panel">
            <TimetablePanel user={user} />
          </div>
        );
      case "fees":
        return (
          <div className="panel">
            <PaymentsPanel user={user} />
          </div>
        );
      default:
        return renderNoticeManager();
    }
  };

  if (user.role === "admin") {
    return (
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="student-brand">
            <span className="student-brand-mark">AD</span>
            <div>
              <strong>Administrator</strong>
              <p>Smart Campus</p>
            </div>
          </div>

          <nav className="student-nav">
            {adminMenuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`student-nav-link ${activeAdminSection === item.id ? "active" : ""}`}
                onClick={() => setActiveAdminSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-main">
          <section className="student-topbar">
            <div>
              <p className="eyebrow">Admin Dashboard</p>
              <h1>{adminSectionTitles[activeAdminSection]}</h1>
              <p className="muted">{user.name} | {user.email}</p>
            </div>

            <div className="button-row">
              <Link className="button btn-edit link-button" to="/profile">
                Profile
              </Link>
              <button className="button logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </section>

          {renderAdminSection()}
        </main>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <div className="shell">
        <section className="header">
          <div>
            <p className="eyebrow">Smart Campus</p>
            <h1>{user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard</h1>
            <p className="muted">{user.name} - {user.email}</p>
          </div>

          <div className="button-row">
            <Link className="button btn-edit link-button" to="/profile">
              Profile
            </Link>
            <button className="button logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </section>

        <section className="grid">
          {user.role === "admin" && (
            <>
              <div className="panel">
                <div className="stats">
                  <div className="stat-card"><span>Students</span><strong>{stats.totalStudents}</strong></div>
                  <div className="stat-card"><span>Faculty</span><strong>{stats.totalFaculty}</strong></div>
                  <div className="stat-card"><span>Courses</span><strong>{stats.totalCourses}</strong></div>
                  <div className="stat-card"><span>Subjects</span><strong>{stats.totalSubjects}</strong></div>
                  <div className="stat-card"><span>Notices</span><strong>{stats.totalNotices}</strong></div>
                  <div className="stat-card"><span>Attendance</span><strong>{stats.totalAttendance}</strong></div>
                  <div className="stat-card"><span>Timetable</span><strong>{stats.timetableEntries}</strong></div>
                  <div className="stat-card"><span>Fees Paid</span><strong>{stats.paidPayments}/{stats.totalPayments}</strong></div>
                  <div className="stat-card"><span>Results</span><strong>{stats.totalResults}</strong></div>
                </div>
              </div>

              <div className="panel panel-half">
                <NoticeForm onCreated={handleNoticeCreated} />
              </div>

              <div className="panel panel-full">
                <CoursesPanel onChanged={fetchStats} />
              </div>

              <div className="panel panel-full">
                <CourseSubjectsPanel onChanged={fetchStats} />
              </div>

              <div className="panel panel-full">
                <StudentsPanel onChanged={fetchStats} />
              </div>

              <div className="panel panel-full">
                <FacultiesPanel onChanged={fetchStats} />
              </div>

              <div className="panel panel-full">
                <TimetablePanel user={user} />
              </div>

              <div className="panel panel-half">
                <PaymentsPanel user={user} />
              </div>

              <div className="panel panel-half">
                <ResultsPanel user={user} />
              </div>

              <div className="panel panel-half">
                <MessagesPanel user={user} />
              </div>

              <div className="panel panel-half stack">
                <h3>Manage Notices</h3>
                {notices.map((n) => (
                  <div key={n._id} className="notice-card">
                    {editingId === n._id ? (
                      <div className="form-grid">
                        <input
                          className="input"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        />

                        <textarea
                          className="input"
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        />

                        <select
                          className="input"
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        >
                          <option value="all">All</option>
                          <option value="student">Student</option>
                          <option value="faculty">Faculty</option>
                        </select>

                        <div className="button-row">
                          <button className="button btn-save" onClick={() => handleUpdate(n._id)}>
                            Save
                          </button>
                          <button className="button btn-cancel" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="eyebrow">{n.role}</p>
                        <h4>{n.title}</h4>
                        <p>{n.content}</p>
                        <div className="button-row">
                          <button className="button btn-edit" onClick={() => startEdit(n)}>
                            Edit
                          </button>
                          <button className="button btn-delete" onClick={() => handleDelete(n._id)}>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {user.role !== "admin" && (
            <div className="panel stack">
              <h3>Notices</h3>
              {notices.length === 0 ? (
                <p className="muted">No notices for your role yet.</p>
              ) : notices.map((n) => (
                <div key={n._id} className="notice-card">
                  <p className="eyebrow">{n.role}</p>
                  <h4>{n.title}</h4>
                  <p>{n.content}</p>
                </div>
              ))}
            </div>
          )}

          {user.role === "faculty" && (
            <>
              <div className="panel panel-half">
                <TimetablePanel user={user} />
              </div>
              <div className="panel panel-half">
                <AttendanceForm />
              </div>
              <div className="panel panel-half">
                <ResultsPanel user={user} />
              </div>
              <div className="panel panel-half">
                <MessagesPanel user={user} />
              </div>
            </>
          )}

        </section>
      </div>
    </main>
  );
}
