import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import heroImage from "../assets/hero.png";

const menuItems = [
  { id: "home", label: "Home" },
  { id: "timetable", label: "My Classes" },
  { id: "attendance", label: "My Attendance" },
  { id: "payments", label: "Fee Details" },
  { id: "results", label: "Results" },
  { id: "messages", label: "Messages" },
  { id: "profile", label: "Profile" }
];

const panelTitles = {
  home: "Dashboard",
  timetable: "My Classes",
  attendance: "My Attendance",
  payments: "Fee Details",
  results: "Results",
  messages: "Messages",
  profile: "Profile"
};

const scheduleDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const scheduleSlots = [
  { startTime: "08:30", endTime: "09:15" },
  { startTime: "09:20", endTime: "10:05" },
  { startTime: "10:10", endTime: "10:55" },
  { startTime: "11:00", endTime: "11:45" },
  { startTime: "11:50", endTime: "12:35" }
];
const scheduleKey = (day, startTime, endTime) => `${day}-${startTime}-${endTime}`;
const subjectStyle = (subject) => {
  if (!subject) return {};
  const hue = Array.from(subject).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return {
    "--subject-accent": `hsl(${hue} 68% 46%)`,
    "--subject-surface": `hsl(${hue} 85% 96%)`
  };
};

const circleStyle = (percentage) => ({
  background: `conic-gradient(#1f8a5b ${percentage}%, #f39c12 ${percentage}% 85%, #dc2626 0)`
});

export default function StudentPortal({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("home");
  const [summary, setSummary] = useState([]);
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [results, setResults] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [
        recordsRes,
        summaryRes,
        paymentsRes,
        resultsRes,
        timetableRes,
        messagesRes,
        profileRes
      ] = await Promise.all([
        API.get(`/attendance/${user._id}`),
        API.get(`/attendance/summary/${user._id}`),
        API.get("/payments"),
        API.get("/results"),
        API.get("/timetable"),
        API.get("/messages"),
        API.get("/profiles/me")
      ]);

      setRecords(recordsRes.data);
      setSummary(summaryRes.data);
      setPayments(paymentsRes.data);
      setResults(resultsRes.data);
      setTimetable(timetableRes.data);
      setMessages(messagesRes.data);
      setProfile(profileRes.data);
    };

    load();
  }, [user._id]);

  const attendanceStats = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 };

    summary.forEach((item) => {
      if (item.percentage > 85) buckets.high += 1;
      else if (item.percentage >= 75) buckets.medium += 1;
      else buckets.low += 1;
    });

    const totalSubjects = summary.length;
    const overall = records.length
      ? Math.round((records.filter((item) => item.status === "present").length / records.length) * 100)
      : 0;

    return { overall, totalSubjects, buckets };
  }, [records, summary]);

  const paymentStats = useMemo(() => {
    const dueItems = payments.filter((item) => item.status !== "paid");
    const dueAmount = dueItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { dueItems, dueAmount };
  }, [payments]);

  const cgpa = useMemo(() => {
    if (!results.length) return "0.00";
    const avg = results.reduce((sum, item) => sum + ((item.marksObtained / item.maxMarks) * 10), 0) / results.length;
    return avg.toFixed(2);
  }, [results]);

  const recentMessages = messages.slice(0, 4);

  const scheduleBoard = () => {
    const entryMap = new Map(
      timetable.map((entry) => [scheduleKey(entry.day, entry.startTime, entry.endTime), entry])
    );
    const title = timetable[0]
      ? `Class Schedule for ${timetable[0].course} - Semester ${timetable[0].semester} (${timetable[0].className}${timetable[0].batch ? ` - ${timetable[0].batch} Batch` : ""})`
      : "Class Schedule";
    const subtitle = timetable[0]
      ? `Room No. ${timetable[0].room || "TBA"}, Class Teacher: ${timetable[0].classTeacher || timetable[0].faculty?.name || "TBA"}`
      : "No timetable entries available";

    return (
      <div className="schedule-board">
        <div className="schedule-board-title">{title}</div>
        <div className="schedule-board-subtitle">{subtitle}</div>
        <div className="schedule-grid">
          <div className="schedule-grid-head schedule-day-col">Day/Timing</div>
          {scheduleSlots.map((slot) => (
            <div key={scheduleKey("slot", slot.startTime, slot.endTime)} className="schedule-grid-head">
              {slot.startTime}-{slot.endTime}
            </div>
          ))}

          {scheduleDays.map((day) => (
            <Fragment key={day}>
              <div key={`${day}-label`} className="schedule-day-col schedule-day-name">{day}</div>
              {scheduleSlots.map((slot) => {
                const entry = entryMap.get(scheduleKey(day, slot.startTime, slot.endTime));
                return (
                  <div
                    key={scheduleKey(day, slot.startTime, slot.endTime)}
                    className={`schedule-cell ${entry ? "filled" : "vacant"}`}
                    style={subjectStyle(entry?.subject)}
                  >
                    {entry ? (
                      <>
                        <strong>{entry.subject}</strong>
                        <span>{entry.faculty?.name || "Faculty"}</span>
                        <span>{entry.room || "Room TBA"}</span>
                      </>
                    ) : (
                      <strong>Vacant</strong>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderHome = () => (
    <>
      <section className="student-hero-grid">
        <article className="student-metric student-metric-attendance">
          <div className="student-donut" style={circleStyle(attendanceStats.overall)}>
            <div className="student-donut-hole">
              <strong>{attendanceStats.overall}%</strong>
              <span>Attendance</span>
            </div>
          </div>
          <div>
            <h3>Attendance</h3>
            <p className="muted">Across {attendanceStats.totalSubjects} subjects</p>
            <ul className="student-legend">
              <li><span className="dot high" /> Above 85% ({attendanceStats.buckets.high})</li>
              <li><span className="dot medium" /> 75% to 85% ({attendanceStats.buckets.medium})</li>
              <li><span className="dot low" /> Below 75% ({attendanceStats.buckets.low})</li>
            </ul>
          </div>
        </article>

        <article className="student-metric student-metric-fee">
          <h3>{paymentStats.dueItems.length ? `Fee due: Rs. ${paymentStats.dueAmount}` : "No Fee Due"}</h3>
          <p>{paymentStats.dueItems.length ? `${paymentStats.dueItems.length} pending payment(s)` : "All current payments are clear."}</p>
        </article>

        <article className="student-banner">
          <img src={heroImage} alt="Student achievement banner" />
          <div className="student-banner-copy">
            <h3>Stay on Track</h3>
            <p>Classes, results, fees, and attendance in one place.</p>
          </div>
        </article>

        <article className="student-metric student-metric-cgpa">
          <h3>CGPA: {cgpa}</h3>
          <div className="student-cgpa-bars">
            {results.slice(0, 5).map((item) => (
              <div key={item._id} className="student-cgpa-bar">
                <span>{item.subject.slice(0, 3).toUpperCase()}</span>
                <div className="line"><i style={{ left: `${(item.marksObtained / item.maxMarks) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="student-content-grid">
        <article className="student-panel">
          <div className="student-panel-head">
            <h2>My Classes</h2>
          </div>
          <div className="student-panel-body">
            {scheduleBoard()}
          </div>
        </article>

        <article className="student-panel">
          <div className="student-panel-head">
            <h2>My Attendance</h2>
          </div>
          <div className="student-panel-body student-attendance-list">
            {summary.length === 0 ? (
              <p className="muted">No attendance records yet.</p>
            ) : summary.map((item) => (
              <div key={item.subject} className="student-attendance-row">
                <div className={`student-attendance-accent ${item.percentage > 85 ? "high" : item.percentage >= 75 ? "medium" : "low"}`} />
                <div className="student-attendance-main">
                  <strong>{item.subject}</strong>
                  <span>{item.present}/{item.total}</span>
                </div>
                <div className="student-attendance-ring-wrap">
                  <div className="student-attendance-ring" style={circleStyle(item.percentage)}>
                    <div className="student-attendance-ring-hole">{item.percentage}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="student-lower-grid">
        <article className="student-panel">
          <div className="student-panel-head">
            <h2>Results</h2>
          </div>
          <div className="student-panel-body">
            {results.length === 0 ? <p className="muted">No results yet.</p> : results.map((item) => (
              <div key={item._id} className="student-class-row">
                <strong>{item.subject}</strong>
                <span>{item.marksObtained}/{item.maxMarks}</span>
                <span>Grade {item.grade || "Pending"}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="student-panel">
          <div className="student-panel-head">
            <h2>Messages</h2>
          </div>
          <div className="student-panel-body">
            {recentMessages.length === 0 ? <p className="muted">No messages yet.</p> : recentMessages.map((item) => (
              <div key={item._id} className="student-message-row">
                <strong>{item.subject}</strong>
                <span>{item.sender?._id === user._id ? `To ${item.receiver?.name}` : `From ${item.sender?.name}`}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="student-panel">
          <div className="student-panel-head">
            <h2>Profile Snapshot</h2>
          </div>
          <div className="student-panel-body">
            <div className="student-message-row"><strong>Class</strong><span>{profile?.assignedClass ? `${profile.assignedClass}${profile?.assignedBatch ? ` (${profile.assignedBatch})` : ""}` : "--"}</span></div>
            <div className="student-message-row"><strong>Department</strong><span>{profile?.department || "--"}</span></div>
            <div className="student-message-row"><strong>Roll Number</strong><span>{profile?.rollNumber || "--"}</span></div>
            <div className="student-message-row"><strong>Phone</strong><span>{profile?.phone || "--"}</span></div>
          </div>
        </article>
      </section>
    </>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "timetable":
        return (
          <section className="student-single-grid">
            <article className="student-panel">
              <div className="student-panel-head"><h2>My Classes</h2></div>
              <div className="student-panel-body">
                {scheduleBoard()}
              </div>
            </article>
          </section>
        );
      case "attendance":
        return (
          <section className="student-single-grid">
            <article className="student-panel">
              <div className="student-panel-head"><h2>My Attendance</h2></div>
              <div className="student-panel-body student-attendance-list">
                {summary.length === 0 ? <p className="muted">No attendance records yet.</p> : summary.map((item) => (
                  <div key={item.subject} className="student-attendance-row">
                    <div className={`student-attendance-accent ${item.percentage > 85 ? "high" : item.percentage >= 75 ? "medium" : "low"}`} />
                    <div className="student-attendance-main">
                      <strong>{item.subject}</strong>
                      <span>{item.present}/{item.total}</span>
                    </div>
                    <div className="student-attendance-ring-wrap">
                      <div className="student-attendance-ring" style={circleStyle(item.percentage)}>
                        <div className="student-attendance-ring-hole">{item.percentage}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        );
      case "payments":
        return (
          <section className="student-single-grid">
            <article className="student-panel">
              <div className="student-panel-head"><h2>Fee Details</h2></div>
              <div className="student-panel-body">
                {payments.length === 0 ? <p className="muted">No payment records yet.</p> : payments.map((payment) => (
                  <div key={payment._id} className="student-class-row">
                    <strong>{payment.feeType}</strong>
                    <span>Rs. {payment.amount}</span>
                    <span>{payment.status}</span>
                    <span>{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "Not set"}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        );
      case "results":
        return (
          <section className="student-single-grid">
            <article className="student-panel">
              <div className="student-panel-head"><h2>Results</h2></div>
              <div className="student-panel-body">
                {results.length === 0 ? <p className="muted">No results yet.</p> : results.map((item) => (
                  <div key={item._id} className="student-class-row">
                    <strong>{item.subject}</strong>
                    <span>{item.marksObtained}/{item.maxMarks}</span>
                    <span>Grade {item.grade || "Pending"}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        );
      case "messages":
        return (
          <section className="student-single-grid">
            <article className="student-panel">
              <div className="student-panel-head"><h2>Messages</h2></div>
              <div className="student-panel-body">
                {messages.length === 0 ? <p className="muted">No messages yet.</p> : messages.map((item) => (
                  <div key={item._id} className="student-message-row">
                    <strong>{item.subject}</strong>
                    <span>{item.sender?._id === user._id ? `To ${item.receiver?.name}` : `From ${item.sender?.name}`}</span>
                    <span>{item.body}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        );
      case "profile":
        return (
          <section className="student-single-grid">
            <article className="student-panel">
              <div className="student-panel-head"><h2>Profile Snapshot</h2></div>
              <div className="student-panel-body">
                <div className="student-message-row"><strong>Course</strong><span>{profile?.course || "--"}</span></div>
                <div className="student-message-row"><strong>Semester</strong><span>{profile?.semester || "--"}</span></div>
                <div className="student-message-row"><strong>Class</strong><span>{profile?.assignedClass ? `${profile.assignedClass}${profile?.assignedBatch ? ` (${profile.assignedBatch})` : ""}` : "--"}</span></div>
                <div className="student-message-row"><strong>Department</strong><span>{profile?.department || "--"}</span></div>
                <div className="student-message-row"><strong>Roll Number</strong><span>{profile?.rollNumber || "--"}</span></div>
                <div className="student-message-row"><strong>Phone</strong><span>{profile?.phone || "--"}</span></div>
                <div className="student-message-row"><strong>Address</strong><span>{profile?.address || "--"}</span></div>
              </div>
            </article>
          </section>
        );
      default:
        return renderHome();
    }
  };

  return (
    <div className="student-shell">
      <aside className="student-sidebar">
        <div className="student-brand">
          <span className="student-brand-mark">SC</span>
          <div>
            <strong>Smart Campus</strong>
            <p>{profile?.department || "Student Portal"}</p>
          </div>
        </div>

        <nav className="student-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`student-nav-link ${activeSection === item.id ? "active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="student-main">
        <header className="student-topbar">
          <div>
            <p className="eyebrow">Student Dashboard</p>
            <h1>{panelTitles[activeSection]}</h1>
            <p className="muted">{user.name} | {user.email}</p>
          </div>

          <div className="button-row">
            <Link className="button btn-edit link-button" to="/profile">Profile</Link>
            <button className="button logout" onClick={onLogout}>Logout</button>
          </div>
        </header>

        {renderSection()}
      </div>
    </div>
  );
}
