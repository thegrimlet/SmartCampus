import { useEffect, useState } from "react";
import API from "../services/api";

export default function AttendanceView() {
  const [records, setRecords] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchAttendance = async () => {
      const res = await API.get(`/attendance/${user._id}`);
      setRecords(res.data);
    };

    fetchAttendance();
  }, []);

  const total = records.length;
  const present = records.filter(r => r.status === "present").length;
  const percentage = total ? ((present / total) * 100).toFixed(2) : 0;

  return (
    <div className="card">
      <h3>Attendance</h3>

      <p>Total Classes: {total}</p>
      <p>Present: {present}</p>
      <p>Percentage: {percentage}%</p>

      {records.map((r) => (
        <div key={r._id}>
          {r.subject} - {r.status}
        </div>
      ))}
    </div>
  );
}