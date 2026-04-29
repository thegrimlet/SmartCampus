import { useEffect, useState } from "react";
import API from "../services/api";

export default function AttendanceView() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchAttendance = async () => {
      const [recordsRes, summaryRes] = await Promise.all([
        API.get(`/attendance/${user._id}`),
        API.get(`/attendance/summary/${user._id}`)
      ]);

      setRecords(recordsRes.data);
      setSummary(summaryRes.data);
    };

    fetchAttendance();
  }, [user._id]);

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const percentage = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="stack">
      <div>
        <h3>Attendance</h3>
        <p className="muted">Overall attendance: {percentage}% across {total} classes.</p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span>Total</span>
          <strong>{total}</strong>
        </div>
        <div className="stat-card">
          <span>Present</span>
          <strong>{present}</strong>
        </div>
        <div className="stat-card">
          <span>Score</span>
          <strong>{percentage}%</strong>
        </div>
      </div>

      <div className="stack">
        <h4>Subject Summary</h4>
        {summary.length === 0 ? (
          <p className="muted">No attendance marked yet.</p>
        ) : summary.map((item) => (
          <div className="record-row" key={item.subject}>
            <strong>{item.subject}</strong>
            <p className="muted">{item.present}/{item.total} present - {item.percentage}%</p>
          </div>
        ))}
      </div>

      <div className="stack">
        <h4>Recent Records</h4>
        {records.slice(0, 10).map((r) => (
          <div className="record-row" key={r._id}>
            <strong>{r.subject}</strong>
            <p className="muted">
              {r.className} | {r.status} on {new Date(r.lectureDate || r.date).toLocaleDateString()}
              {r.startTime && r.endTime ? ` | ${r.startTime}-${r.endTime}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
