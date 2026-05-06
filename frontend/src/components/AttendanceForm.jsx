import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const todayValue = () => new Date().toISOString().slice(0, 10);
const uniqueValues = (items, field) => [...new Set(items.map((item) => item[field]).filter(Boolean))];

export default function AttendanceForm() {
  const [date, setDate] = useState(todayValue());
  const [allLectures, setAllLectures] = useState([]);
  const [filters, setFilters] = useState({ course: "", semester: "", subject: "" });
  const [lectureKey, setLectureKey] = useState("");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [sessionInfo, setSessionInfo] = useState(null);
  const [message, setMessage] = useState("");

  const selectedLecture = useMemo(
    () => allLectures.find((lecture) => lecture._id === lectureKey),
    [allLectures, lectureKey]
  );

  const courseOptions = useMemo(() => uniqueValues(allLectures, "course"), [allLectures]);
  const semesterOptions = useMemo(
    () => uniqueValues(allLectures.filter((lecture) => lecture.course === filters.course), "semester"),
    [allLectures, filters.course]
  );
  const subjectOptions = useMemo(
    () => uniqueValues(allLectures.filter((lecture) =>
      lecture.course === filters.course && lecture.semester === filters.semester
    ), "subject"),
    [allLectures, filters.course, filters.semester]
  );
  const filteredLectures = useMemo(
    () => allLectures.filter((lecture) =>
      lecture.course === filters.course &&
      lecture.semester === filters.semester &&
      lecture.subject === filters.subject
    ),
    [allLectures, filters]
  );

  const loadLectures = async (nextDate, preferredLecture = "") => {
    const res = await API.get(`/attendance/faculty/lectures?date=${encodeURIComponent(nextDate)}`);
    const lectureOptions = res.data.lectures || [];
    const preferred = lectureOptions.find((lecture) => lecture._id === preferredLecture);
    const firstLecture = preferred || lectureOptions[0];

    setAllLectures(lectureOptions);
    setFilters({
      course: firstLecture?.course || "",
      semester: firstLecture?.semester || "",
      subject: firstLecture?.subject || ""
    });
    setLectureKey(firstLecture?._id || "");
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
        `/attendance/faculty/session?timetableEntry=${encodeURIComponent(selectedLecture._id)}&date=${encodeURIComponent(date)}&startTime=${encodeURIComponent(selectedLecture.startTime)}&endTime=${encodeURIComponent(selectedLecture.endTime)}`
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

  const updateFilter = (field, value) => {
    const nextFilters = {
      ...filters,
      [field]: value
    };

    if (field === "course") {
      nextFilters.semester = "";
      nextFilters.subject = "";
    }

    if (field === "semester") {
      nextFilters.subject = "";
    }

    const nextLecture = allLectures.find((lecture) =>
      (!nextFilters.course || lecture.course === nextFilters.course) &&
      (!nextFilters.semester || lecture.semester === nextFilters.semester) &&
      (!nextFilters.subject || lecture.subject === nextFilters.subject)
    );

    setFilters(nextFilters);
    setLectureKey(nextFilters.course && nextFilters.semester && nextFilters.subject ? (nextLecture?._id || "") : "");
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
        timetableEntry: selectedLecture._id,
        className: selectedLecture.className,
        batch: selectedLecture.batch || "Morning",
        course: selectedLecture.course,
        semester: selectedLecture.semester,
        date,
        startTime: selectedLecture.startTime,
        endTime: selectedLecture.endTime,
        records
      });
      setMessage(`${res.data.created} created, ${res.data.updated} updated`);
      await loadLectures(date, lectureKey);
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

      <div className="attendance-filter-bar">
        <label className="field-stack">
          <span>Date</span>
          <input className="input" type="date" value={date} onChange={(e) => {
            setMessage("");
            setDate(e.target.value);
          }} />
        </label>

        <label className="field-stack">
          <span>Course</span>
          <select className="input" value={filters.course} onChange={(e) => updateFilter("course", e.target.value)}>
            <option value="">Select course</option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </label>

        <label className="field-stack">
          <span>Semester</span>
          <select className="input" value={filters.semester} onChange={(e) => updateFilter("semester", e.target.value)} disabled={!filters.course}>
            <option value="">Select semester</option>
            {semesterOptions.map((semester) => (
              <option key={semester} value={semester}>{semester}</option>
            ))}
          </select>
        </label>

        <label className="field-stack">
          <span>Subject</span>
          <select className="input" value={filters.subject} onChange={(e) => updateFilter("subject", e.target.value)} disabled={!filters.semester}>
            <option value="">Select subject</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </label>

        <label className="field-stack attendance-lecture-filter">
          <span>Lecture</span>
          <select className="input" value={lectureKey} onChange={(e) => setLectureKey(e.target.value)} disabled={!filters.subject}>
            <option value="">Select lecture</option>
            {filteredLectures.map((lecture) => {
              const scope = lecture.className
                ? `${lecture.className}${lecture.batch ? ` (${lecture.batch})` : ""}`
                : `${lecture.course || "Course"} ${lecture.semester || ""}`.trim();
              return (
                <option key={lecture._id} value={lecture._id}>
                  {lecture.startTime}-{lecture.endTime} | {lecture.subject} | {scope} {lecture.room ? `| ${lecture.room}` : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      {sessionInfo && (
        <div className="class-admin-card stack">
          <strong>{sessionInfo.subject}</strong>
          <p className="muted">
            {sessionInfo.className} | {sessionInfo.day} | {sessionInfo.startTime}-{sessionInfo.endTime}
            {sessionInfo.batch ? ` | ${sessionInfo.batch}` : ""}
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
