import { Fragment, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const slots = [
  { startTime: "08:30", endTime: "09:15" },
  { startTime: "09:20", endTime: "10:05" },
  { startTime: "10:10", endTime: "10:55" },
  { startTime: "11:00", endTime: "11:45" },
  { startTime: "11:50", endTime: "12:35" }
];

const todayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });
const keyFor = (day, startTime, endTime) => `${day}-${startTime}-${endTime}`;

const subjectStyle = (subject) => {
  if (!subject) return {};
  const hue = Array.from(subject).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return {
    "--subject-accent": `hsl(${hue} 68% 46%)`,
    "--subject-surface": `hsl(${hue} 85% 96%)`
  };
};

export default function FacultySchedulePanel() {
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/timetable");
        setEntries(res.data);
      } catch (err) {
        setMessage(err.response?.data?.msg || "Failed to load schedule");
      }
    };

    load();
  }, []);

  const todayEntries = useMemo(() => (
    entries
      .filter((entry) => entry.day === todayName())
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  ), [entries]);

  const entryMap = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => map.set(keyFor(entry.day, entry.startTime, entry.endTime), entry));
    return map;
  }, [entries]);

  return (
    <div className="stack">
      <div>
        <h3>Schedule</h3>
        <p className="muted">Read-only view of your assigned lectures. Timetable editing is handled by administrators.</p>
      </div>

      {message && <p className="muted">{message}</p>}

      <section className="class-admin-card stack">
        <div>
          <p className="eyebrow">Today</p>
          <h4>{todayName()} Schedule</h4>
        </div>

        {todayEntries.length === 0 ? (
          <div className="student-empty-state">
            <strong>No lectures scheduled today.</strong>
            <span>Your weekly schedule is available below.</span>
          </div>
        ) : (
          <div className="today-classes-table">
            <div className="today-classes-head">
              <span>Class Timing</span>
              <span>Lecture</span>
            </div>
            {todayEntries.map((entry) => (
              <div key={entry._id} className="today-classes-row">
                <strong>{entry.startTime}-{entry.endTime}</strong>
                <div>
                  <strong>{entry.subject}</strong>
                  <span>
                    {entry.className || entry.course} {entry.batch || entry.semester ? `| ${entry.batch || entry.semester}` : ""} {entry.room ? `| ${entry.room}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="class-admin-card stack">
        <div>
          <p className="eyebrow">Weekly</p>
          <h4>Weekly Schedule</h4>
        </div>

        <div className="schedule-board">
          <div className="schedule-board-title">Faculty Weekly Schedule</div>
          <div className="schedule-board-subtitle">Assigned lectures only</div>
          <div className="schedule-grid">
            <div className="schedule-grid-head schedule-day-col">Day/Timing</div>
            {slots.map((slot) => (
              <div key={keyFor("slot", slot.startTime, slot.endTime)} className="schedule-grid-head">
                {slot.startTime}-{slot.endTime}
              </div>
            ))}

            {days.map((day) => (
              <Fragment key={day}>
                <div className="schedule-day-col schedule-day-name">{day}</div>
                {slots.map((slot) => {
                  const entry = entryMap.get(keyFor(day, slot.startTime, slot.endTime));
                  return (
                    <div
                      key={keyFor(day, slot.startTime, slot.endTime)}
                      className={`schedule-cell ${entry ? "filled" : "vacant"}`}
                      style={subjectStyle(entry?.subject)}
                    >
                      {entry ? (
                        <>
                          <strong>{entry.subject}</strong>
                          <span>{entry.className || entry.course}</span>
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
      </section>
    </div>
  );
}
