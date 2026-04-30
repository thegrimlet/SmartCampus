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

const semesterOptionsFor = (course) => {
  if (!course) return [];
  return Array.from({ length: Number(course.totalSemYear || 0) }, (_, index) =>
    `${course.semYearType} ${index + 1}`
  );
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
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [scope, setScope] = useState({
    courseId: "",
    course: "",
    semester: ""
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

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === scope.courseId),
    [courses, scope.courseId]
  );
  const semesterOptions = useMemo(() => semesterOptionsFor(selectedCourse), [selectedCourse]);

  const currentEntry = useMemo(
    () => entries.find((entry) =>
      entry.day === selectedSlot.day &&
      entry.startTime === selectedSlot.startTime &&
      entry.endTime === selectedSlot.endTime
    ),
    [entries, selectedSlot]
  );

  const buildEditorState = (entry, nextSubjects = subjects, nextFaculty = faculty) => ({
    subject: entry?.subject || nextSubjects[0]?.name || "",
    faculty: entry?.faculty?._id || nextFaculty[0]?._id || "",
    room: entry?.room || ""
  });

  const fetchEntries = async (nextScope = scope, nextSubjects = subjects, nextFaculty = faculty) => {
    const params = new URLSearchParams();
    if (nextScope.course) params.set("course", nextScope.course);
    if (nextScope.semester) params.set("semester", nextScope.semester);
    const res = await API.get(`/timetable${params.toString() ? `?${params.toString()}` : ""}`);
    setEntries(res.data);
    const selectedEntry = res.data.find((entry) =>
      entry.day === selectedSlot.day &&
      entry.startTime === selectedSlot.startTime &&
      entry.endTime === selectedSlot.endTime
    );
    setEditor(buildEditorState(selectedEntry, nextSubjects, nextFaculty));
  };

  const fetchSubjects = async (courseId, semester) => {
    if (!courseId || !semester) {
      setSubjects([]);
      return [];
    }

    const params = new URLSearchParams({ course: courseId, semester });
    const res = await API.get(`/subjects?${params.toString()}`);
    setSubjects(res.data);
    return res.data;
  };

  useEffect(() => {
    const load = async () => {
      if (user.role === "admin") {
        const [facultyRes, coursesRes] = await Promise.all([
          API.get("/users/faculty"),
          API.get("/courses")
        ]);

        setFaculty(facultyRes.data);
        setCourses(coursesRes.data);

        const firstCourse = coursesRes.data[0];
        if (firstCourse) {
          const firstSemester = semesterOptionsFor(firstCourse)[0] || "";
          const nextScope = {
            courseId: firstCourse._id,
            course: firstCourse.courseCode,
            semester: firstSemester
          };
          setScope(nextScope);
          const nextSubjects = await fetchSubjects(firstCourse._id, firstSemester);
          await fetchEntries(nextScope, nextSubjects, facultyRes.data);
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

  const chooseCourse = async (courseId) => {
    const course = courses.find((item) => item._id === courseId);
    const nextSemester = semesterOptionsFor(course)[0] || "";
    const nextScope = {
      courseId,
      course: course?.courseCode || "",
      semester: nextSemester
    };

    setScope(nextScope);
    const nextSubjects = await fetchSubjects(courseId, nextSemester);
    await fetchEntries(nextScope, nextSubjects);
  };

  const chooseSemester = async (semester) => {
    const nextScope = { ...scope, semester };
    setScope(nextScope);
    const nextSubjects = await fetchSubjects(scope.courseId, semester);
    await fetchEntries(nextScope, nextSubjects);
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
    if (!scope.course || !scope.semester) {
      setMessage("Select a course and semester first");
      return;
    }

    try {
      await API.put("/timetable/slot", {
        course: scope.course,
        semester: scope.semester,
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
    const batchLabel = entries[0]?.batch ? ` - ${entries[0].batch} Batch` : "";
    const boardTitle = entries[0]
      ? `Class Schedule for ${entries[0].course} - ${entries[0].semester}${entries[0].className ? ` (${entries[0].className}${batchLabel})` : ""}`
      : "Class Schedule";
    const subtitle = entries[0]
      ? `Room No. ${entries[0].room || "TBA"}, Class Teacher: ${entries[0].classTeacher || entries[0].faculty?.name || "TBA"}`
      : "No timetable entries available";

    return <TimetableBoard entries={entries} title={boardTitle} subtitle={subtitle} />;
  }

  return (
    <div className="stack">
      <h3>Timetable Builder</h3>

      <div className="panel-lite timetable-toolbar compact">
        <label className="field-stack">
          <span>Course</span>
          <select className="input" value={scope.courseId} onChange={(e) => chooseCourse(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.courseCode} - {course.courseName}
              </option>
            ))}
          </select>
        </label>

        <label className="field-stack">
          <span>Semester</span>
          <select className="input" value={scope.semester} onChange={(e) => chooseSemester(e.target.value)}>
            <option value="">Select semester</option>
            {semesterOptions.map((semester) => (
              <option key={semester} value={semester}>{semester}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="timetable-admin-layout">
        <div className="schedule-scroll">
          <div className="schedule-board-title schedule-board-title-admin">
            CLASS SCHEDULE for {scope.course || "Course"} - {scope.semester || "Semester"}
          </div>
          <div className="schedule-board-subtitle schedule-board-subtitle-admin">
            {selectedCourse?.courseName || "Select a course"}
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
                <option key={subject._id} value={subject.name}>{subject.subjectCode ? `${subject.subjectCode} - ${subject.name}` : subject.name}</option>
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
