import { Fragment, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = [
  { startTime: "08:30", endTime: "09:15" },
  { startTime: "09:20", endTime: "10:05" },
  { startTime: "10:10", endTime: "10:55" },
  { startTime: "11:00", endTime: "11:45" },
  { startTime: "11:50", endTime: "12:35" }
];

const slotKey = (day, startTime, endTime) => `${day}-${startTime}-${endTime}`;

const subjectStyle = (subject) => {
  if (!subject) return {};
  const hue = Array.from(subject).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return {
    "--subject-accent": `hsl(${hue} 68% 46%)`,
    "--subject-surface": `hsl(${hue} 85% 96%)`
  };
};

function TimetableBoard({ entries, title, subtitle }) {
  const entryMap = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => map.set(slotKey(entry.day, entry.startTime, entry.endTime), entry));
    return map;
  }, [entries]);

  return (
    <div className="schedule-board">
      <div className="schedule-board-title">{title}</div>
      {subtitle && <div className="schedule-board-subtitle">{subtitle}</div>}
      <div className="schedule-grid">
        <div className="schedule-grid-head schedule-day-col">Day/Timing</div>
        {timeSlots.map((slot) => (
          <div key={slotKey("slot", slot.startTime, slot.endTime)} className="schedule-grid-head">
            {slot.startTime}-{slot.endTime}
          </div>
        ))}

        {days.map((day) => (
          <Fragment key={day}>
            <div key={`${day}-label`} className="schedule-day-col schedule-day-name">{day}</div>
            {timeSlots.map((slot) => {
              const entry = entryMap.get(slotKey(day, slot.startTime, slot.endTime));
              return (
                <div
                  key={slotKey(day, slot.startTime, slot.endTime)}
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
}

export default function TimetablePanel({ user }) {
  const [entries, setEntries] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [scope, setScope] = useState({
    course: "",
    semester: "",
    className: "",
    classTeacher: ""
  });
  const [selectedSlot, setSelectedSlot] = useState({
    day: "Monday",
    startTime: "08:30",
    endTime: "09:15"
  });
  const [editor, setEditor] = useState({
    subject: "",
    faculty: "",
    room: ""
  });
  const [message, setMessage] = useState("");

  const classOptions = useMemo(() => {
    return classAssignments.map((item) => ({
      course: item.course,
      semester: item.semester,
      className: item.className,
      classTeacher: item.classTeacher,
      subjects: item.subjects || []
    }));
  }, [classAssignments]);

  const currentEntry = useMemo(
    () => entries.find((entry) =>
      entry.day === selectedSlot.day &&
      entry.startTime === selectedSlot.startTime &&
      entry.endTime === selectedSlot.endTime
    ),
    [entries, selectedSlot]
  );

  const buildEditorState = (entry) => ({
    subject: entry?.subject || subjects[0]?.name || "",
    faculty: entry?.faculty?._id || faculty[0]?._id || "",
    room: entry?.room || ""
  });

  const fetchEntries = async (nextScope = scope) => {
    const params = new URLSearchParams();
    if (nextScope.course) params.set("course", nextScope.course);
    if (nextScope.semester) params.set("semester", nextScope.semester);
    if (nextScope.className) params.set("className", nextScope.className);
    const res = await API.get(`/timetable${params.toString() ? `?${params.toString()}` : ""}`);
    setEntries(res.data);
    const selectedEntry = res.data.find((entry) =>
      entry.day === selectedSlot.day &&
      entry.startTime === selectedSlot.startTime &&
      entry.endTime === selectedSlot.endTime
    );
    setEditor(buildEditorState(selectedEntry));
  };

  useEffect(() => {
    const load = async () => {
      if (user.role === "admin") {
        const [facultyRes, subjectRes, profileRes] = await Promise.all([
          API.get("/users/faculty"),
          API.get("/subjects"),
          API.get("/class-assignments")
        ]);

        setFaculty(facultyRes.data);
        setSubjects(subjectRes.data);
        setClassAssignments(profileRes.data);

        const first = profileRes.data[0];
        if (first) {
          const classSubjects = (first.subjects || []).map((name, index) => ({ _id: `${index}-${name}`, name }));
          if (classSubjects.length) {
            setSubjects(classSubjects);
            setEditor((current) => ({ ...current, subject: classSubjects[0].name }));
          }

          const nextScope = {
            course: first.course,
            semester: first.semester,
            className: first.className,
            classTeacher: first.classTeacher || ""
          };
          setScope(nextScope);
          await fetchEntries(nextScope);
        } else {
          await fetchEntries();
        }
      } else {
        await fetchEntries();
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role]);

  const chooseClass = async (value) => {
    const selected = classOptions.find((item) => `${item.course}|${item.semester}|${item.className}` === value);
    const nextScope = selected
      ? { ...selected, classTeacher: selected.classTeacher || "" }
      : { ...scope, className: value };
    setScope(nextScope);
    if (selected?.subjects?.length) {
      setSubjects(selected.subjects.map((name, index) => ({ _id: `${index}-${name}`, name })));
      setEditor((current) => ({ ...current, subject: selected.subjects[0] || current.subject }));
    }
    await fetchEntries(nextScope);
  };

  const chooseSlot = (day, startTime, endTime) => {
    const nextSlot = { day, startTime, endTime };
    setSelectedSlot(nextSlot);
    const entry = entries.find((item) =>
      item.day === day &&
      item.startTime === startTime &&
      item.endTime === endTime
    );
    setEditor(buildEditorState(entry));
  };

  const saveSlot = async () => {
    setMessage("");
    try {
      await API.put("/timetable/slot", {
        ...scope,
        ...selectedSlot,
        ...editor
      });
      setMessage("Timetable slot saved");
      await fetchEntries(scope);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save timetable slot");
    }
  };

  const clearSlot = async () => {
    if (!currentEntry?._id) return;
    await API.delete(`/timetable/${currentEntry._id}`);
    setMessage("Timetable slot cleared");
    await fetchEntries(scope);
  };

  if (user.role !== "admin") {
    const title = entries[0]
      ? `Class Schedule for ${entries[0].course} - Semester ${entries[0].semester} (${entries[0].className})`
      : "Class Schedule";
    const subtitle = entries[0]
      ? `Room No. ${entries[0].room || "TBA"}, Class Teacher: ${entries[0].classTeacher || entries[0].faculty?.name || "TBA"}`
      : "No timetable entries available";

    return <TimetableBoard entries={entries} title={title} subtitle={subtitle} />;
  }

  return (
    <div className="stack">
      <h3>Timetable Builder</h3>

      <div className="panel-lite timetable-toolbar">
        <label className="field-stack">
          <span>Saved Classes</span>
          <select
            className="input"
            value={`${scope.course}|${scope.semester}|${scope.className}`}
            onChange={(e) => chooseClass(e.target.value)}
          >
            <option value="">Select class schedule</option>
            {classOptions.map((item) => (
              <option key={`${item.course}|${item.semester}|${item.className}`} value={`${item.course}|${item.semester}|${item.className}`}>
                {item.course} - Sem {item.semester} - {item.className}
              </option>
            ))}
          </select>
        </label>

        <label className="field-stack">
          <span>Course</span>
          <input className="input" placeholder="Course" value={scope.course} onChange={(e) => setScope({ ...scope, course: e.target.value })} />
        </label>

        <label className="field-stack">
          <span>Semester</span>
          <input className="input" placeholder="Semester" value={scope.semester} onChange={(e) => setScope({ ...scope, semester: e.target.value })} />
        </label>

        <label className="field-stack">
          <span>Class</span>
          <input className="input" placeholder="Class" value={scope.className} onChange={(e) => setScope({ ...scope, className: e.target.value })} />
        </label>

        <label className="field-stack">
          <span>Class Teacher</span>
          <input className="input" placeholder="Class teacher" value={scope.classTeacher} onChange={(e) => setScope({ ...scope, classTeacher: e.target.value })} />
        </label>
      </div>

      <div className="timetable-admin-layout">
        <div className="schedule-scroll">
          <div className="schedule-board-title schedule-board-title-admin">
            CLASS SCHEDULE for {scope.course || "Course"}-{scope.semester || "Sem"} ({scope.className || "Class"})
          </div>
          <div className="schedule-board-subtitle schedule-board-subtitle-admin">
            Room No. - {currentEntry?.room || "TBA"}, Class Teacher: {scope.classTeacher || "TBA"}
          </div>
          <div className="schedule-grid admin-grid">
            <div className="schedule-grid-head schedule-day-col">Day/Timing</div>
            {timeSlots.map((slot) => (
              <div key={slotKey("slot", slot.startTime, slot.endTime)} className="schedule-grid-head">
                {slot.startTime}-{slot.endTime}
              </div>
            ))}

            {days.map((day) => (
              <Fragment key={day}>
                <div key={`${day}-label`} className="schedule-day-col schedule-day-name">{day}</div>
                {timeSlots.map((slot) => {
                  const entry = entries.find((item) => item.day === day && item.startTime === slot.startTime && item.endTime === slot.endTime);
                  const selected = selectedSlot.day === day && selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime;
                  return (
                    <button
                      key={slotKey(day, slot.startTime, slot.endTime)}
                      type="button"
                      className={`schedule-cell schedule-cell-button ${selected ? "selected" : ""} ${entry ? "filled" : "vacant"}`}
                      style={subjectStyle(entry?.subject)}
                      onClick={() => chooseSlot(day, slot.startTime, slot.endTime)}
                    >
                      <strong>{entry?.subject || "Vacant"}</strong>
                      <span>{entry?.faculty?.name || "Choose faculty"}</span>
                      <span>{entry?.room || "Room TBA"}</span>
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="panel-lite timetable-slot-editor">
          <h4>Edit Slot</h4>
          <p className="muted">{selectedSlot.day} | {selectedSlot.startTime}-{selectedSlot.endTime}</p>

          <label className="field-stack">
            <span>Subject</span>
            <select className="input" value={editor.subject} onChange={(e) => setEditor({ ...editor, subject: e.target.value })}>
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject.name}>{subject.name}</option>
              ))}
            </select>
          </label>

          <label className="field-stack">
            <span>Faculty</span>
            <select className="input" value={editor.faculty} onChange={(e) => setEditor({ ...editor, faculty: e.target.value })}>
              <option value="">Select faculty</option>
              {faculty.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="field-stack">
            <span>Room / Lab</span>
            <input className="input" placeholder="Room / Lab" value={editor.room} onChange={(e) => setEditor({ ...editor, room: e.target.value })} />
          </label>

          {message && <p className="muted">{message}</p>}

          <div className="button-row">
            <button className="button btn-save" type="button" onClick={saveSlot}>Save Slot</button>
            <button className="button btn-delete" type="button" onClick={clearSlot}>Clear Slot</button>
          </div>
        </div>
      </div>
    </div>
  );
}
