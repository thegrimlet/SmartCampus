import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyForm = {
  className: "",
  course: "",
  semester: "",
  department: "",
  classTeacher: "",
  subjects: []
};

const summarizeClass = (profile) => {
  const className = profile.assignedClass?.trim();
  return className || "Unassigned";
};

export default function ClassAssignmentPanel() {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [roster, setRoster] = useState([]);
  const [facultyRoster, setFacultyRoster] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [facultySubjects, setFacultySubjects] = useState([]);
  const [classTeacherFacultyId, setClassTeacherFacultyId] = useState("");
  const [subjectDraft, setSubjectDraft] = useState("");
  const [message, setMessage] = useState("");

  const students = useMemo(
    () => users.filter((user) => user.role === "student"),
    [users]
  );
  const faculty = useMemo(
    () => users.filter((user) => user.role === "faculty"),
    [users]
  );
  const profileByUserId = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.user?._id, profile])),
    [profiles]
  );
  const selectedSubjects = useMemo(() => form.subjects, [form.subjects]);
  const rosterUserIds = useMemo(
    () => new Set(roster.map((student) => student.user?._id || student.user)),
    [roster]
  );
  const availableStudents = useMemo(
    () => students.filter((student) => !rosterUserIds.has(student._id)),
    [students, rosterUserIds]
  );
  const syncClassView = async (className, nextAssignments = assignments) => {
    if (!className) {
      setSelectedClass("");
      setForm(emptyForm);
      setRoster([]);
      setFacultyRoster([]);
      setSelectedStudentId("");
      setSelectedFacultyId("");
      setFacultySubjects([]);
      setClassTeacherFacultyId("");
      setSubjectDraft("");
      return;
    }

    const assignment = nextAssignments.find((item) => item.className === className);
    const rosterRes = await API.get(`/class-assignments/${encodeURIComponent(className)}/roster`);
    const facultyEntries = rosterRes.data.faculty || [];
    const teacherEntry = facultyEntries.find((entry) => entry.user?.name === (assignment?.classTeacher || ""));

    setSelectedClass(className);
    setForm({
      className: assignment?.className || className,
      course: assignment?.course || "",
      semester: assignment?.semester || "",
      department: assignment?.department || "",
      classTeacher: assignment?.classTeacher || "",
      subjects: assignment?.subjects || []
    });
    setRoster(rosterRes.data.students || []);
    setFacultyRoster(facultyEntries);
    setSelectedStudentId("");
    setSelectedFacultyId(teacherEntry?.user?._id || facultyEntries[0]?.user?._id || "");
    setFacultySubjects(teacherEntry?.assignedSubjects || facultyEntries[0]?.assignedSubjects || []);
    setClassTeacherFacultyId(teacherEntry?.user?._id || "");
    setSubjectDraft("");
  };

  const refreshData = async (classToKeep = selectedClass) => {
    const [assignmentsRes, usersRes, profilesRes] = await Promise.all([
      API.get("/class-assignments"),
      API.get("/users/approved"),
      API.get("/profiles")
    ]);

    setAssignments(assignmentsRes.data);
    setUsers(usersRes.data);
    setProfiles(profilesRes.data);

    const nextClass = classToKeep || assignmentsRes.data[0]?.className || "";
    await syncClassView(nextClass, assignmentsRes.data);
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedFacultyId) {
      setFacultySubjects([]);
      return;
    }

    const current = facultyRoster.find((item) => item.user?._id === selectedFacultyId);
    setFacultySubjects(current?.assignedSubjects || []);
  }, [facultyRoster, selectedFacultyId]);

  const saveClassDetails = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const className = form.className.trim();
      await API.put(`/class-assignments/${encodeURIComponent(className)}`, {
        ...form,
        className,
        subjects: selectedSubjects
      });
      setMessage("Class details saved");
      await refreshData(className);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save class details");
    }
  };

  const deleteClass = async () => {
    if (!form.className.trim()) return;

    try {
      await API.delete(`/class-assignments/${encodeURIComponent(form.className.trim())}`);
      setMessage("Class deleted");
      await refreshData("");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to delete class");
    }
  };

  const addStudentToRoster = () => {
    if (!selectedStudentId) return;

    const user = students.find((item) => item._id === selectedStudentId);
    if (!user) return;

    setRoster((current) => [
      ...current,
      {
        user,
        rollNumber: profileByUserId[user._id]?.rollNumber || ""
      }
    ]);
    setSelectedStudentId("");
  };

  const addSubject = () => {
    const nextSubject = subjectDraft.trim();
    if (!nextSubject) return;

    if (selectedSubjects.some((subject) => subject.toLowerCase() === nextSubject.toLowerCase())) {
      setMessage("Subject already added to this class");
      return;
    }

    setForm((current) => ({
      ...current,
      subjects: [...current.subjects, nextSubject]
    }));
    setSubjectDraft("");
    setMessage("");
  };

  const removeSubject = (subjectName) => {
    setForm((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject !== subjectName)
    }));
    setFacultySubjects((current) => current.filter((subject) => subject !== subjectName));
  };

  const updateRosterStudent = (userId, rollNumber) => {
    setRoster((current) =>
      current.map((entry) =>
        (entry.user?._id || entry.user) === userId
          ? { ...entry, rollNumber }
          : entry
      )
    );
  };

  const removeStudentFromRoster = (userId) => {
    setRoster((current) => current.filter((entry) => (entry.user?._id || entry.user) !== userId));
  };

  const saveRoster = async () => {
    if (!selectedClass) {
      setMessage("Save the class first");
      return;
    }

    try {
      await API.put(`/class-assignments/${encodeURIComponent(selectedClass)}/roster`, {
        roster: roster.map((entry) => ({
          userId: entry.user?._id || entry.user,
          rollNumber: entry.rollNumber || ""
        }))
      });
      setMessage("Class roster saved");
      await refreshData(selectedClass);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save roster");
    }
  };

  const toggleFacultySubject = (subject) => {
    setFacultySubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject]
    );
  };

  const saveFacultyAssignment = async () => {
    if (!selectedClass || !selectedFacultyId) {
      setMessage("Choose a class and faculty member first");
      return;
    }

    try {
      await API.put(
        `/class-assignments/${encodeURIComponent(selectedClass)}/faculty/${selectedFacultyId}`,
        {
          subjects: facultySubjects,
          isClassTeacher: classTeacherFacultyId === selectedFacultyId
        }
      );
      setMessage("Faculty assignment saved");
      await refreshData(selectedClass);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save faculty assignment");
    }
  };

  const removeFacultyAssignment = async (facultyId) => {
    try {
      await API.delete(`/class-assignments/${encodeURIComponent(selectedClass)}/faculty/${facultyId}`);
      setMessage("Faculty assignment removed");
      await refreshData(selectedClass);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to remove faculty assignment");
    }
  };

  return (
    <section className="stack">
      <div>
        <h3>Academic Assignments by Class</h3>
        <p className="muted">Set shared class details, manage the student roster, and assign faculty subjects from one place.</p>
      </div>

      <div className="button-row class-pill-row">
        {assignments.map((item) => (
          <button
            key={item.className}
            type="button"
            className={`class-pill ${selectedClass === item.className ? "active" : ""}`}
            onClick={() => syncClassView(item.className)}
          >
            {item.className}
          </button>
        ))}
        <button
          type="button"
          className="class-pill new"
          onClick={() => syncClassView("")}
        >
          New Class
        </button>
      </div>

      <form className="stack class-admin-card" onSubmit={saveClassDetails}>
        <div className="class-admin-head">
          <div>
            <p className="eyebrow">Class Details</p>
            <h4>{form.className || "Create a class"}</h4>
          </div>
          <div className="button-row">
            <button className="button btn-save" type="submit">Save Class</button>
            <button className="button btn-delete" type="button" onClick={deleteClass}>Delete Class</button>
          </div>
        </div>

        <div className="two-column">
          <label className="field-stack">
            <span>Class</span>
            <input className="input" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
          </label>
          <label className="field-stack">
            <span>Course</span>
            <input className="input" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
          </label>
          <label className="field-stack">
            <span>Semester</span>
            <input className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
          </label>
          <label className="field-stack">
            <span>Department</span>
            <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </label>
        </div>

        <div className="field-stack">
          <span>Subjects</span>
          <div className="class-picker-row">
            <input
              className="input"
              placeholder="Add subject to this class"
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubject();
                }
              }}
            />
            <button className="button btn-edit" type="button" onClick={addSubject}>Add Subject</button>
          </div>

          {selectedSubjects.length === 0 ? (
            <p className="muted">No subjects added yet.</p>
          ) : (
            <div className="subject-list-editor">
              {selectedSubjects.map((subject) => (
                <div key={subject} className="subject-row">
                  <strong>{subject}</strong>
                  <button className="button btn-delete" type="button" onClick={() => removeSubject(subject)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      <div className="class-admin-grid">
        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Student Roster</p>
              <h4>{selectedClass || "Choose a class"}</h4>
            </div>
            <button className="button btn-save" type="button" onClick={saveRoster}>Save Roster</button>
          </div>

          <div className="class-picker-row">
            <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              <option value="">Add student to this class</option>
              {availableStudents.map((student) => {
                const profile = profileByUserId[student._id];
                return (
                  <option key={student._id} value={student._id}>
                    {student.name} ({summarizeClass(profile || {})})
                  </option>
                );
              })}
            </select>
            <button className="button btn-edit" type="button" onClick={addStudentToRoster}>Add</button>
          </div>

          <div className="stack">
            {roster.length === 0 ? (
              <p className="muted">No students in this class yet.</p>
            ) : roster.map((entry) => {
              const user = entry.user;
              const userId = user?._id || entry.user;

              return (
                <div key={userId} className="assignment-row">
                  <div>
                    <strong>{user?.name}</strong>
                    <p className="muted">{user?.email}</p>
                  </div>

                  <label className="field-stack">
                    <span>Roll Number</span>
                    <input
                      className="input"
                      value={entry.rollNumber || ""}
                      onChange={(e) => updateRosterStudent(userId, e.target.value)}
                    />
                  </label>

                  <button className="button btn-delete" type="button" onClick={() => removeStudentFromRoster(userId)}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Faculty Assignment</p>
              <h4>{selectedClass || "Choose a class"}</h4>
            </div>
            <button className="button btn-save" type="button" onClick={saveFacultyAssignment}>Save Faculty</button>
          </div>

          <div className="stack">
            <label className="field-stack">
              <span>Faculty Member</span>
              <select className="input" value={selectedFacultyId} onChange={(e) => setSelectedFacultyId(e.target.value)}>
                <option value="">Select faculty</option>
                {faculty.map((item) => {
                  const profile = profileByUserId[item._id];
                  const classLabel = summarizeClass(profile || {});
                  return (
                    <option key={item._id} value={item._id}>
                      {item.name} ({classLabel})
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="field-stack">
              <span>Class Teacher</span>
              <select
                className="input"
                value={classTeacherFacultyId}
                onChange={(e) => setClassTeacherFacultyId(e.target.value)}
              >
                <option value="">Choose class teacher</option>
                {faculty.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-stack">
              <span>Assigned Subjects</span>
              {selectedSubjects.length === 0 ? (
                <p className="muted">Add subjects to the class first.</p>
              ) : (
                <div className="subject-chip-grid">
                  {selectedSubjects.map((subject) => (
                    <label key={subject} className={`subject-chip ${facultySubjects.includes(subject) ? "active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={facultySubjects.includes(subject)}
                        onChange={() => toggleFacultySubject(subject)}
                      />
                      <span>{subject}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="stack">
            {facultyRoster.length === 0 ? (
              <p className="muted">No faculty assigned to this class yet.</p>
            ) : facultyRoster.map((entry) => (
              <div key={entry.user?._id} className="assignment-row">
                <div>
                  <strong>{entry.user?.name}</strong>
                  <p className="muted">{entry.user?.email}</p>
                  <p className="muted">
                    {(entry.assignedSubjects || []).join(", ") || "No subjects assigned"}
                    {form.classTeacher === entry.user?.name ? " | Class Teacher" : ""}
                  </p>
                </div>
                <button className="button btn-delete" type="button" onClick={() => removeFacultyAssignment(entry.user?._id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {message && <p className="muted">{message}</p>}
    </section>
  );
}
