import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const todayValue = () => new Date().toISOString().slice(0, 10);

export default function AttendanceForm() {
  const [date, setDate] = useState(todayValue());
  const [classes, setClasses] = useState([]);
  const [allLectures, setAllLectures] = useState([]);
  const [className, setClassName] = useState("");
  const [lectureKey, setLectureKey] = useState("");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [sessionInfo, setSessionInfo] = useState(null);
  const [message, setMessage] = useState("");

  const lectures = useMemo(
    () => allLectures.filter((lecture) => lecture.className === className),
    [allLectures, className]
  );
  const selectedLecture = useMemo(
    () => lectures.find((lecture) => `${lecture.className}|${lecture.startTime}|${lecture.endTime}` === lectureKey),
    [lectureKey, lectures]
  );

  const loadLectures = async (nextDate, preferredClass = "") => {
    const res = await API.get(`/attendance/faculty/lectures?date=${encodeURIComponent(nextDate)}`);
    const classOptions = res.data.classes || [];
    const nextClass = preferredClass || classOptions[0] || "";
    const lectureOptions = (res.data.lectures || []).filter((lecture) => lecture.className === nextClass);

    setClasses(classOptions);
    setAllLectures(res.data.lectures || []);
    setClassName(nextClass);
    setLectureKey(lectureOptions[0] ? `${lectureOptions[0].className}|${lectureOptions[0].startTime}|${lectureOptions[0].endTime}` : "");
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLectures(date);
  }, [date]);

  useEffect(() => {
    const loadSession = async () => {
      if (!selectedLecture) {
        setStudents([]);
        setAttendance({});
        setSessionInfo(null);
        return;
      }

      const res = await API.get(
        `/attendance/faculty/session?className=${encodeURIComponent(selectedLecture.className)}&date=${encodeURIComponent(date)}&startTime=${encodeURIComponent(selectedLecture.startTime)}&endTime=${encodeURIComponent(selectedLecture.endTime)}`
      );

      setSessionInfo({
        ...res.data.lecture,
        existingCount: res.data.existingCount
      });
      setStudents(res.data.students);

      const initial = {};
      res.data.students.forEach((student) => {
        initial[student._id] = student.status || "present";
      });
      setAttendance(initial);
    };

    loadSession();
  }, [date, selectedLecture]);

  const handleChange = (studentId, status) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: status
    }));
  };

  const handleClassChange = (nextClass) => {
    const lectureOptions = allLectures.filter((lecture) => lecture.className === nextClass);
    setClassName(nextClass);
    setLectureKey(lectureOptions[0] ? `${lectureOptions[0].className}|${lectureOptions[0].startTime}|${lectureOptions[0].endTime}` : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!selectedLecture) {
      setMessage("Select a class and lecture first");
      return;
    }

    const records = Object.keys(attendance).map((studentId) => ({
      studentId,
      status: attendance[studentId]
    }));

    try {
      const res = await API.put("/attendance/faculty/session", {
        className: selectedLecture.className,
        date,
        startTime: selectedLecture.startTime,
        endTime: selectedLecture.endTime,
        records
      });
      setMessage(`${res.data.created} created, ${res.data.updated} updated`);
      await loadLectures(date, className);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Error saving attendance");
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div>
        <h3>Lecture Attendance</h3>
        <p className="muted">Select a date, then choose one of your assigned lecture slots to create or revise attendance.</p>
      </div>

      <label className="field-stack">
        <span>Date</span>
        <input className="input" type="date" value={date} onChange={(e) => {
          setMessage("");
          setDate(e.target.value);
        }} />
      </label>

      <label className="field-stack">
        <span>Class</span>
        <select className="input" value={className} onChange={(e) => handleClassChange(e.target.value)}>
          <option value="">Select class</option>
          {classes.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="field-stack">
        <span>Lecture</span>
        <select className="input" value={lectureKey} onChange={(e) => setLectureKey(e.target.value)}>
          <option value="">Select lecture</option>
          {lectures.map((lecture) => {
            const key = `${lecture.className}|${lecture.startTime}|${lecture.endTime}`;
            return (
              <option key={key} value={key}>
                {lecture.startTime}-{lecture.endTime} | {lecture.subject} {lecture.room ? `| ${lecture.room}` : ""}
              </option>
            );
          })}
        </select>
      </label>

      {sessionInfo && (
        <div className="class-admin-card stack">
          <strong>{sessionInfo.subject}</strong>
          <p className="muted">
            {sessionInfo.className} | {sessionInfo.day} | {sessionInfo.startTime}-{sessionInfo.endTime}
            {sessionInfo.room ? ` | ${sessionInfo.room}` : ""}
          </p>
          <p className="muted">
            {sessionInfo.existingCount > 0
              ? `Attendance already exists for ${sessionInfo.existingCount} student(s). Saving now will update that lecture's record.`
              : "No attendance has been saved for this lecture yet."}
          </p>
        </div>
      )}

      <div className="stack">
        {students.length === 0 ? (
          <p className="muted">No students found for this lecture slot.</p>
        ) : (
          students.map((student) => (
            <div key={student._id} className="student-row">
              <div>
                <strong>{student.name}</strong>
                <p className="muted">
                  {student.rollNumber ? `${student.rollNumber} | ` : ""}{student.email}
                </p>
              </div>

              <div className="attendance-status">
                <label>
                  <input
                    type="radio"
                    name={student._id}
                    checked={attendance[student._id] === "present"}
                    onChange={() => handleChange(student._id, "present")}
                  />
                  Present
                </label>

                <label>
                  <input
                    type="radio"
                    name={student._id}
                    checked={attendance[student._id] === "absent"}
                    onChange={() => handleChange(student._id, "absent")}
                  />
                  Absent
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {message && <p className="muted">{message}</p>}

      <button className="button btn-save" type="submit" disabled={!selectedLecture || students.length === 0}>
        Save Attendance
      </button>
    </form>
  );
}
