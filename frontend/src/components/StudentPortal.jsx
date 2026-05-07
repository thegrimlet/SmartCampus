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
  { id: "notices", label: "Notices" },
  { id: "messages", label: "Messages" },
  { id: "profile", label: "Profile" }
];

const panelTitles = {
  home: "Dashboard",
  timetable: "My Classes",
  attendance: "My Attendance",
  payments: "Fee Details",
  results: "Results",
  notices: "Notices",
  messages: "Messages",
  profile: "Profile"
};

const scheduleDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const getTodayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });
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

const attendanceBucketStyle = ({ totalSubjects, buckets }) => {
  if (!totalSubjects) {
    return { background: "#e5edf4" };
  }

  const high = (buckets.high / totalSubjects) * 100;
  const medium = ((buckets.high + buckets.medium) / totalSubjects) * 100;

  return {
    background: `conic-gradient(#1f8a5b 0 ${high}%, #f39c12 ${high}% ${medium}%, #dc2626 ${medium}% 100%)`
  };
};

const bucketMeta = {
  high: { label: "Above 85%", color: "#1f8a5b" },
  medium: { label: "75% to 85%", color: "#f39c12" },
  low: { label: "Below 75%", color: "#dc2626" }
};

const gradePoints = { "A+": 10, A: 9, "A-": 8, "B+": 7, B: 6, C: 5, D: 4, F: 0 };
const backPaperGrades = new Set(["F", "AB", "DE/DC", "UFM", "I"]);

const formatResultDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-GB");
};

const describeArc = (cx, cy, radius, startAngle, endAngle) => {
  const start = {
    x: cx + radius * Math.cos((startAngle - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((startAngle - 90) * Math.PI / 180)
  };
  const end = {
    x: cx + radius * Math.cos((endAngle - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((endAngle - 90) * Math.PI / 180)
  };
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
  document.body.appendChild(script);
});

export default function StudentPortal({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("home");
  const [summary, setSummary] = useState([]);
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [results, setResults] = useState([]);
  const [notices, setNotices] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [attendanceModal, setAttendanceModal] = useState(null);
  const [attendanceDetailsSubject, setAttendanceDetailsSubject] = useState(null);
  const [selectedResultSemester, setSelectedResultSemester] = useState("");

  useEffect(() => {
    const load = async () => {
      const [
        recordsRes,
        summaryRes,
        paymentsRes,
        resultsRes,
        noticesRes,
        timetableRes,
        messagesRes,
        profileRes
      ] = await Promise.all([
        API.get(`/attendance/${user._id}`),
        API.get(`/attendance/summary/${user._id}`),
        API.get("/payments"),
        API.get("/results"),
        API.get("/notices"),
        API.get("/timetable"),
        API.get("/messages"),
        API.get("/profiles/me")
      ]);

      setRecords(recordsRes.data);
      setSummary(summaryRes.data);
      setPayments(paymentsRes.data);
      setResults(resultsRes.data);
      setNotices(noticesRes.data);
      setTimetable(timetableRes.data);
      setMessages(messagesRes.data);
      setProfile(profileRes.data);
    };

    load();
  }, [user._id]);

  const attendanceStats = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 };
    const subjectsByBucket = { high: [], medium: [], low: [] };

    summary.forEach((item) => {
      if (item.percentage > 85) {
        buckets.high += 1;
        subjectsByBucket.high.push(item);
      } else if (item.percentage >= 75) {
        buckets.medium += 1;
        subjectsByBucket.medium.push(item);
      } else {
        buckets.low += 1;
        subjectsByBucket.low.push(item);
      }
    });

    const totalSubjects = summary.length;
    const overall = records.length
      ? Math.round((records.filter((item) => item.status === "present").length / records.length) * 100)
      : 0;

    return { overall, totalSubjects, buckets, subjectsByBucket };
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

  const resultSemesterOptions = useMemo(() => (
    [...new Set(results.map((item) => item.semester).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  ), [results]);

  const defaultResultSemester = useMemo(() => {
    if (!resultSemesterOptions.length) return "";
    return resultSemesterOptions.find((semester) => semester === profile?.semester) || resultSemesterOptions[resultSemesterOptions.length - 1];
  }, [profile?.semester, resultSemesterOptions]);

  const activeResultSemester = selectedResultSemester || defaultResultSemester;

  const selectedSemesterResults = useMemo(() => (
    activeResultSemester
      ? results.filter((item) => item.semester === activeResultSemester)
      : results
  ), [activeResultSemester, results]);

  const resultSemesterSummaries = useMemo(() => {
    const summary = resultSemesterOptions.reduce((acc, semester) => {
      const entries = results.filter((item) => item.semester === semester);
      const totalPoints = entries.reduce((sum, item) => sum + (gradePoints[item.grade] ?? 0), 0);
      const gradedCount = entries.length || 1;
      const sgpa = Number((totalPoints / gradedCount).toFixed(2));
      const nextTotals = {
        cumulativePoints: acc.cumulativePoints + totalPoints,
        cumulativeSubjects: acc.cumulativeSubjects + entries.length
      };

      return {
        cumulativePoints: nextTotals.cumulativePoints,
        cumulativeSubjects: nextTotals.cumulativeSubjects,
        rows: [
          ...acc.rows,
          {
            semester,
            sgpa,
            cgpa: nextTotals.cumulativeSubjects ? Number((nextTotals.cumulativePoints / nextTotals.cumulativeSubjects).toFixed(2)) : 0,
            backPapers: entries.filter((item) => backPaperGrades.has(item.grade)).length
          }
        ]
      };
    }, { cumulativePoints: 0, cumulativeSubjects: 0, rows: [] });

    return summary.rows;
  }, [resultSemesterOptions, results]);

  const attendanceDetails = useMemo(() => {
    if (!attendanceDetailsSubject) return [];
    const subjectRecords = records
      .filter((record) => record.subject === attendanceDetailsSubject)
      .sort((a, b) => new Date(a.lectureDate || a.date) - new Date(b.lectureDate || b.date));
    const grouped = new Map();

    subjectRecords.forEach((record) => {
      const day = new Date(record.lectureDate || record.date);
      const dateKey = day.toISOString().slice(0, 10);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: day,
          timings: [],
          present: 0,
          absent: 0,
          remarks: ""
        });
      }

      const item = grouped.get(dateKey);
      item.timings.push(`${record.startTime}-${record.endTime}`);
      if (record.status === "present") item.present += 1;
      if (record.status === "absent") item.absent += 1;
    });

    return [...grouped.values()];
  }, [attendanceDetailsSubject, records]);

  const attendanceDetailsTotals = useMemo(() => {
    const present = attendanceDetails.reduce((sum, item) => sum + item.present, 0);
    const absent = attendanceDetails.reduce((sum, item) => sum + item.absent, 0);
    const total = present + absent;
    return {
      present,
      absent,
      percentage: total ? ((present / total) * 100).toFixed(2) : "0.00"
    };
  }, [attendanceDetails]);

  const attendanceDonut = () => {
    if (!attendanceStats.totalSubjects) {
      return (
        <div className="student-donut" style={attendanceBucketStyle(attendanceStats)}>
          <div className="student-donut-hole">
            <strong>0%</strong>
            <span>Attendance</span>
          </div>
        </div>
      );
    }

    let cursor = 0;
    const segments = ["high", "medium", "low"].map((bucket) => {
      const value = attendanceStats.buckets[bucket];
      const angle = (value / attendanceStats.totalSubjects) * 360;
      const segment = { bucket, value, start: cursor, end: cursor + angle };
      cursor += angle;
      return segment;
    }).filter((segment) => segment.value > 0);

    return (
      <div className="student-donut student-donut-svg-wrap">
        <svg className="student-donut-svg" viewBox="0 0 140 140" aria-label="Attendance subject ranges">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#e5edf4" strokeWidth="28" />
          {segments.map((segment) => (
            <path
              key={segment.bucket}
              d={describeArc(70, 70, 54, segment.start, segment.end)}
              fill="none"
              stroke={bucketMeta[segment.bucket].color}
              strokeWidth="28"
              className="student-donut-segment"
              onClick={() => setAttendanceModal(segment.bucket)}
            />
          ))}
        </svg>
        <div className="student-donut-hole">
          <strong>{attendanceStats.overall}%</strong>
          <span>Attendance</span>
        </div>
      </div>
    );
  };

  const refreshPayments = async () => {
    const res = await API.get("/payments");
    setPayments(res.data);
  };

  const payFee = async (paymentId) => {
    setPaymentMessage("");

    try {
      await loadRazorpayCheckout();
      const orderRes = await API.post(`/payments/${paymentId}/razorpay/order`, {});
      const order = orderRes.data;

      const razorpay = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: {
          name: order.student?.name || user.name,
          email: order.student?.email || user.email
        },
        theme: {
          color: "#28666e"
        },
        handler: async (response) => {
          await API.post(`/payments/${paymentId}/razorpay/verify`, response);
          await refreshPayments();
          const receiptRes = await API.get(`/payments/${paymentId}/receipt`);
          setReceipt(receiptRes.data);
          setPaymentMessage("Payment successful");
        },
        modal: {
          ondismiss: () => setPaymentMessage("Payment was not completed")
        }
      });

      razorpay.open();
    } catch (err) {
      setPaymentMessage(err.response?.data?.msg || err.message || "Failed to process payment");
    }
  };

  const todayClassesTable = () => {
    const today = getTodayName();
    const todayEntries = timetable
      .filter((entry) => entry.day === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (!scheduleDays.includes(today) || todayEntries.length === 0) {
      return (
        <div className="student-empty-state">
          <strong>No classes scheduled today.</strong>
          <span>Open My Classes from the side panel to view the full timetable.</span>
        </div>
      );
    }

    return (
      <div className="today-classes-table">
        <div className="today-classes-head">
          <span>Class Timing</span>
          <span>Lecture</span>
        </div>
        {todayEntries.map((entry) => (
          <div key={scheduleKey(entry.day, entry.startTime, entry.endTime)} className="today-classes-row">
            <strong>{entry.startTime}-{entry.endTime}</strong>
            <div>
              <strong>{entry.subject}</strong>
              <span>{entry.faculty?.name || "Faculty"} | {entry.room || "Room TBA"}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const attendanceDetailsModal = () => {
    if (!attendanceDetailsSubject) return null;

    return (
      <div className="portal-modal-backdrop" onClick={() => setAttendanceDetailsSubject(null)}>
        <section className="attendance-details-modal" onClick={(event) => event.stopPropagation()}>
          <div className="attendance-details-head">
            <div>
              <h3>Attendance Details :</h3>
              <p>{attendanceDetailsSubject}</p>
            </div>
            <button type="button" onClick={() => setAttendanceDetailsSubject(null)}>x</button>
          </div>

          <div className="table-wrap attendance-details-wrap">
            <table className="attendance-details-table">
              <thead>
                <tr>
                  <th>SNo</th>
                  <th>Date Of Class</th>
                  <th>Timings Of Class</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceDetails.map((item, index) => (
                  <tr key={item.date.toISOString()}>
                    <td>{index + 1}</td>
                    <td>{item.date.toLocaleDateString("en-GB")}</td>
                    <td>{item.timings.map((time) => `[${time}]`).join(" ")}</td>
                    <td>{item.present}</td>
                    <td>{item.absent}</td>
                    <td>{item.remarks}</td>
                  </tr>
                ))}
                <tr className="attendance-details-total">
                  <td />
                  <td />
                  <td>Total Attendance</td>
                  <td>{attendanceDetailsTotals.present}</td>
                  <td>{attendanceDetailsTotals.absent}</td>
                  <td>{attendanceDetailsTotals.percentage}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  const scheduleBoard = ({ days = scheduleDays, mode = "full" } = {}) => {
    const entryMap = new Map(
      timetable.map((entry) => [scheduleKey(entry.day, entry.startTime, entry.endTime), entry])
    );
    const title = timetable[0]
      ? `Class Schedule for ${timetable[0].course} - ${timetable[0].semester}${timetable[0].className ? ` (${timetable[0].className}${timetable[0].batch ? ` - ${timetable[0].batch} Batch` : ""})` : ""}`
      : "Class Schedule";
    const subtitle = timetable[0]
      ? `Room No. ${timetable[0].room || "TBA"}, Class Teacher: ${timetable[0].classTeacher || timetable[0].faculty?.name || "TBA"}`
      : "No timetable entries available";
    const visibleDays = days.filter((day) => scheduleDays.includes(day));
    const hasVisibleClass = visibleDays.some((day) =>
      scheduleSlots.some((slot) => entryMap.has(scheduleKey(day, slot.startTime, slot.endTime)))
    );

    if (mode === "today" && (!visibleDays.length || !hasVisibleClass)) {
      return (
        <div className="student-empty-state">
          <strong>No classes scheduled today.</strong>
          <span>Open My Classes from the side panel to view the full timetable.</span>
        </div>
      );
    }

    return (
      <div className="schedule-board">
        <div className="schedule-board-title">{title}</div>
        <div className="schedule-board-subtitle">
          {mode === "today" ? `Today's Classes - ${visibleDays[0]}` : subtitle}
        </div>
        <div className="schedule-grid">
          <div className="schedule-grid-head schedule-day-col">Day/Timing</div>
          {scheduleSlots.map((slot) => (
            <div key={scheduleKey("slot", slot.startTime, slot.endTime)} className="schedule-grid-head">
              {slot.startTime}-{slot.endTime}
            </div>
          ))}

          {visibleDays.map((day) => (
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
          {attendanceDonut()}
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
            {todayClassesTable()}
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
              <button key={item.subject} type="button" className="student-attendance-row attendance-detail-trigger" onClick={() => setAttendanceDetailsSubject(item.subject)}>
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
              </button>
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
            <div className="student-message-row"><strong>Department</strong><span>{profile?.department || "--"}</span></div>
            <div className="student-message-row"><strong>Roll Number</strong><span>{profile?.rollNumber || "--"}</span></div>
            <div className="student-message-row"><strong>Phone</strong><span>{profile?.phone || "--"}</span></div>
          </div>
        </article>
      </section>

      {attendanceModal && (
        <div className="portal-modal-backdrop" onClick={() => setAttendanceModal(null)}>
          <section className="attendance-range-modal" onClick={(event) => event.stopPropagation()}>
            <div className="attendance-range-head" style={{ background: bucketMeta[attendanceModal].color }}>
              <h3>{bucketMeta[attendanceModal].label}</h3>
              <button type="button" onClick={() => setAttendanceModal(null)}>x</button>
            </div>
            <div className="attendance-range-body">
              {attendanceStats.subjectsByBucket[attendanceModal].length === 0 ? (
                <p className="muted">No subjects in this range.</p>
              ) : attendanceStats.subjectsByBucket[attendanceModal].map((item) => (
                <div key={item.subject} className="attendance-range-row">
                  <strong>{item.subject}</strong>
                  <span>{item.percentage}% ({item.present}/{item.total})</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

    </>
  );

  const renderExaminationResults = () => {
    const latestSummary = resultSemesterSummaries.find((item) => item.semester === activeResultSemester) || resultSemesterSummaries[resultSemesterSummaries.length - 1];

    return (
      <section className="student-single-grid">
        <article className="student-panel examination-result-panel">
          <div className="student-panel-body examination-result-body">
            <div className="examination-title">
              <h2>Examination</h2>
              <p>1. Name <strong>{user.name}</strong></p>
              <p>2. Enrollment No. <strong>{profile?.rollNumber || "--"}</strong></p>
            </div>

            <div className="exam-semester-bar">
              <label>
                Semester/Year(s) Exam Result :
                <select className="input" value={activeResultSemester} onChange={(event) => setSelectedResultSemester(event.target.value)}>
                  {resultSemesterOptions.map((semester) => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </label>
            </div>

            {results.length === 0 ? (
              <p className="muted">No declared results yet.</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="exam-result-table">
                    <thead>
                      <tr>
                        <th>Sno</th>
                        <th>Course Code</th>
                        <th>Course Title</th>
                        <th>Max Total</th>
                        <th>Total</th>
                        <th>Go</th>
                        <th>GP</th>
                        <th>PublishDate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSemesterResults.map((item, index) => (
                        <tr key={item._id}>
                          <td>{index + 1}</td>
                          <td>{item.subjectCode || item.course || "--"}</td>
                          <td>{item.subject}</td>
                          <td>{item.maxMarks}</td>
                          <td>{item.marksObtained}</td>
                          <td>{item.grade || "--"}</td>
                          <td>{gradePoints[item.grade] ?? "--"}</td>
                          <td>{formatResultDate(item.declaredAt || item.updatedAt || item.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="table-wrap">
                  <table className="exam-result-table exam-summary-table">
                    <thead>
                      <tr>
                        <th>Semester</th>
                        <th>SGPA</th>
                        <th>CGPA</th>
                        <th>Back Papers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultSemesterSummaries.map((item) => (
                        <tr key={item.semester}>
                          <td>{item.semester}</td>
                          <td>{item.sgpa.toFixed(2)}</td>
                          <td>{item.cgpa.toFixed(2)}</td>
                          <td>{item.backPapers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="exam-result-footer-grid">
                  <div className="exam-note-box">
                    <p>* Mandatory Course. Passing is Mandatory. Credit is not counted for calculation of SGPA.</p>
                    <p>- For indicative purpose only.</p>
                    <p>No one is responsible for any inadvertent error that may have crept in the results being published online. Original marks sheets are issued by the University.</p>
                    <table className="exam-result-table">
                      <thead>
                        <tr><th colSpan="2">Abbreviation :</th></tr>
                      </thead>
                      <tbody>
                        <tr><td>AB</td><td>Absent</td></tr>
                        <tr><td>DE/DC</td><td>Debarred</td></tr>
                        <tr><td>UFM</td><td>Unfair Means</td></tr>
                        <tr><td>RL</td><td>Result Later</td></tr>
                        <tr><td>I</td><td>Incomplete</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <table className="exam-result-table exam-description-table">
                    <thead>
                      <tr><th>Column</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Sem</td><td>Semester</td></tr>
                      <tr><td>Total</td><td>Total Marks Obtained</td></tr>
                      <tr><td>MaxTotal</td><td>Total Maximum Marks</td></tr>
                      <tr><td>GO</td><td>Grade Obtained</td></tr>
                      <tr><td>GP</td><td>Grade Points</td></tr>
                      <tr><td>SGPA</td><td>Semester Grade Point Average</td></tr>
                      <tr><td>CGPA</td><td>Cumulative Grade Point Average</td></tr>
                    </tbody>
                  </table>
                </div>

                {latestSummary && (
                  <p className="exam-result-signoff">
                    Semester {latestSummary.semester} result published with SGPA {latestSummary.sgpa.toFixed(2)} and CGPA {latestSummary.cgpa.toFixed(2)}.
                  </p>
                )}
              </>
            )}
          </div>
        </article>
      </section>
    );
  };

  const renderNotices = () => (
    <section className="student-single-grid">
      <article className="student-panel">
        <div className="student-panel-head"><h2>Notices</h2></div>
        <div className="student-panel-body">
          {notices.length === 0 ? (
            <p className="muted">No notices for your role yet.</p>
          ) : notices.map((notice) => (
            <div key={notice._id} className="notice-card">
              <p className="eyebrow">{notice.role}</p>
              <h4>{notice.title}</h4>
              <p>{notice.content}</p>
              {notice.createdAt && (
                <p className="muted">{new Date(notice.createdAt).toLocaleDateString()}</p>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
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
                  <button key={item.subject} type="button" className="student-attendance-row attendance-detail-trigger" onClick={() => setAttendanceDetailsSubject(item.subject)}>
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
                  </button>
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
                {paymentMessage && <p className="muted">{paymentMessage}</p>}
                {payments.length === 0 ? <p className="muted">No payment records yet.</p> : payments.map((payment) => (
                  <div key={payment._id} className="student-class-row">
                    <strong>{payment.feeType}</strong>
                    <span>Rs. {payment.amount}</span>
                    <span>{payment.status}</span>
                    <span>{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "Not set"}</span>
                    <div className="button-row">
                      {payment.status !== "paid" && (
                        <button className="button btn-save" type="button" onClick={() => payFee(payment._id)}>
                          Pay with Razorpay
                        </button>
                      )}
                      {payment.status === "paid" && (
                        <button
                          className="button btn-edit"
                          type="button"
                          onClick={async () => {
                            const receiptRes = await API.get(`/payments/${payment._id}/receipt`);
                            setReceipt(receiptRes.data);
                          }}
                        >
                          View Receipt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {receipt && (
                  <section className="class-admin-card stack">
                    <div className="class-admin-head">
                      <div>
                        <p className="eyebrow">Receipt</p>
                        <h4>{receipt.receiptNumber || "Pending receipt number"}</h4>
                      </div>
                      <button className="button btn-cancel" type="button" onClick={() => setReceipt(null)}>Close</button>
                    </div>
                    <div className="two-column">
                      <p><strong>Fee Type:</strong> {receipt.feeType}</p>
                      <p><strong>Amount:</strong> Rs. {receipt.amount}</p>
                      <p><strong>Transaction:</strong> {receipt.transactionId || "Not set"}</p>
                      <p><strong>Gateway:</strong> {receipt.gateway || "Manual"}</p>
                      <p><strong>Paid At:</strong> {receipt.paidAt ? new Date(receipt.paidAt).toLocaleString() : "Pending"}</p>
                      <p><strong>Semester:</strong> {receipt.semester || "Not set"}</p>
                    </div>
                  </section>
                )}
              </div>
            </article>
          </section>
        );
      case "results":
        return renderExaminationResults();
      case "notices":
        return renderNotices();
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
                <div className="student-message-row"><strong>Department</strong><span>{profile?.department || "--"}</span></div>
                <div className="student-message-row"><strong>Roll Number</strong><span>{profile?.rollNumber || "--"}</span></div>
                <div className="student-message-row"><strong>Phone</strong><span>{profile?.phone || "--"}</span></div>
                <div className="student-message-row"><strong>Address</strong><span>{profile?.address || "--"}</span></div>
                <div className="profile-actions">
                  <Link className="button btn-edit link-button" to="/profile">Update Profile</Link>
                </div>
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

          <button className="button logout" onClick={onLogout}>Logout</button>
        </header>

        {renderSection()}
        {attendanceDetailsModal()}
      </div>
    </div>
  );
}
