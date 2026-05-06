import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyForm = {
  student: "",
  theoryMarks: "",
  practicalMarks: "",
  resultCode: "",
  remarks: ""
};

const emptyFacultyFilters = {
  course: "",
  semester: ""
};

const resultCodeOptions = [
  { value: "", label: "Regular marks" },
  { value: "AB", label: "AB - Absent" },
  { value: "DE/DC", label: "DE/DC - Debarred" },
  { value: "UFM", label: "UFM - Unfair Means" },
  { value: "RL", label: "RL - Result Later" },
  { value: "I", label: "I - Incomplete" }
];

const specialResultCodes = resultCodeOptions.map((item) => item.value).filter(Boolean);

const scopeLabel = (scope) =>
  `${scope.subject} | ${scope.className || scope.course} ${scope.batch || scope.semester ? `| ${scope.batch || scope.semester}` : ""}`;

const studentResultLabel = (student) =>
  `${student?.rollNumber ? `${student.rollNumber} - ` : ""}${student?.name || "Student"}`;

export default function ResultsPanel({ user }) {
  const [portal, setPortal] = useState(null);
  const [results, setResults] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [facultyFilters, setFacultyFilters] = useState(emptyFacultyFilters);
  const [selectedScopeKey, setSelectedScopeKey] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");

  const selectedScope = useMemo(
    () => scopes.find((scope) => scope.key === selectedScopeKey),
    [scopes, selectedScopeKey]
  );

  const selectedResult = useMemo(() => {
    if (!selectedScope || !selectedStudent) return null;
    return results.find((result) =>
      result.student?._id === selectedStudent &&
      result.subject === selectedScope.subject &&
      result.course === selectedScope.course &&
      result.semester === selectedScope.semester &&
      (result.className || "") === (selectedScope.className || "") &&
      (result.batch || "") === (selectedScope.batch || "")
    );
  }, [results, selectedScope, selectedStudent]);

  const visibleResults = useMemo(() => {
    if (user.role === "student") return results;
    if (user.role === "faculty" && selectedScope) {
      return results.filter((result) =>
        result.subject === selectedScope.subject &&
        result.course === selectedScope.course &&
        result.semester === selectedScope.semester &&
        (result.className || "") === (selectedScope.className || "") &&
        (result.batch || "") === (selectedScope.batch || "")
      );
    }
    return results;
  }, [results, selectedScope, user.role]);

  const facultyCourseOptions = useMemo(() => (
    [...new Set(scopes.map((scope) => scope.course).filter(Boolean))].sort()
  ), [scopes]);

  const facultySemesterOptions = useMemo(() => (
    [...new Set(scopes
      .filter((scope) => scope.course === facultyFilters.course)
      .map((scope) => scope.semester)
      .filter(Boolean)
    )].sort()
  ), [facultyFilters.course, scopes]);

  const filteredFacultyScopes = useMemo(() => scopes.filter((scope) =>
    scope.course === facultyFilters.course && scope.semester === facultyFilters.semester
  ), [facultyFilters, scopes]);

  const selectedStudentDetails = useMemo(() => (
    selectedScope?.students?.find((student) => student._id === selectedStudent)
  ), [selectedScope, selectedStudent]);

  const hasSpecialResultCode = specialResultCodes.includes(form.resultCode);
  const hasTheoryMarks = Number(selectedScope?.theoryMax || 0) > 0;
  const hasPracticalMarks = Number(selectedScope?.practicalMax || 0) > 0;

  const fetchPortal = useCallback(async () => {
    const res = await API.get("/results/portal");
    setPortal(res.data);
  }, []);

  const fetchResults = useCallback(async () => {
    const res = await API.get("/results");
    setResults(res.data);
  }, []);

  const fetchSummary = useCallback(async (studentId) => {
    if (!studentId && user.role !== "student") {
      setSummary(null);
      return;
    }

    const endpoint = user.role === "student"
      ? "/results/summary"
      : `/results/summary?student=${encodeURIComponent(studentId)}`;
    const res = await API.get(endpoint);
    setSummary(res.data);
  }, [user.role]);

  const fetchScopes = useCallback(async () => {
    if (user.role !== "faculty") return;
    const res = await API.get("/results/faculty/scopes");
    setScopes(res.data);
    const firstScope = res.data[0];
    if (firstScope) {
      setFacultyFilters({
        course: firstScope.course || "",
        semester: firstScope.semester || ""
      });
      setSelectedScopeKey(firstScope.key);
      setSelectedStudent("");
      setForm(emptyForm);
      setSummary(null);
    }
  }, [user.role]);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchPortal(), fetchResults()]);
      if (user.role === "faculty") {
        await fetchScopes();
      } else if (user.role === "student") {
        await fetchSummary();
      }
    };

    load();
  }, [fetchPortal, fetchResults, fetchScopes, fetchSummary, user.role]);

  useEffect(() => {
    if (!selectedResult) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((current) => ({ ...current, theoryMarks: "", practicalMarks: "", resultCode: "", remarks: "" }));
      return;
    }

    setForm({
      student: selectedStudent,
      theoryMarks: selectedResult.theoryMarks || "",
      practicalMarks: selectedResult.practicalMarks || "",
      resultCode: specialResultCodes.includes(selectedResult.grade) ? selectedResult.grade : "",
      remarks: selectedResult.remarks || ""
    });
  }, [selectedResult, selectedStudent]);

  const updatePortal = async (action) => {
    setMessage("");
    try {
      const res = await API.post(`/results/portal/${action}`, {});
      setPortal(res.data);
      await fetchResults();
      setMessage(action === "declare" ? "Results declared" : `Result portal ${action}ed`);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to update result portal");
    }
  };

  const chooseScope = async (scopeKey) => {
    setSelectedScopeKey(scopeKey);
    setSelectedStudent("");
    setForm(emptyForm);
    setSummary(null);
  };

  const chooseFacultyCourse = (course) => {
    setFacultyFilters({ course, semester: "" });
    setSelectedScopeKey("");
    setSelectedStudent("");
    setForm(emptyForm);
    setSummary(null);
  };

  const chooseFacultySemester = (semester) => {
    const nextScopes = scopes.filter((scope) =>
      scope.course === facultyFilters.course && scope.semester === semester
    );
    setFacultyFilters((current) => ({ ...current, semester }));
    setSelectedScopeKey(nextScopes[0]?.key || "");
    setSelectedStudent("");
    setForm(emptyForm);
    setSummary(null);
  };

  const chooseStudent = async (studentId) => {
    setSelectedStudent(studentId);
    setForm({ ...emptyForm, student: studentId });
    await fetchSummary(studentId);
  };

  const saveResult = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!selectedScope || !selectedStudent) {
      setMessage("Select an assigned subject and student first");
      return;
    }

    const payload = {
      ...selectedScope,
      student: selectedStudent,
      theoryMarks: !hasSpecialResultCode && hasTheoryMarks ? Number(form.theoryMarks || 0) : 0,
      theoryMax: Number(selectedScope.theoryMax || 0),
      practicalMarks: !hasSpecialResultCode && hasPracticalMarks ? Number(form.practicalMarks || 0) : 0,
      practicalMax: Number(selectedScope.practicalMax || 0),
      grade: hasSpecialResultCode ? form.resultCode : undefined,
      remarks: form.remarks
    };

    try {
      if (selectedResult) {
        await API.put(`/results/${selectedResult._id}`, payload);
        setMessage("Marks updated");
      } else {
        await API.post("/results", payload);
        setMessage("Marks saved");
      }
      await fetchResults();
      await fetchSummary(selectedStudent);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save marks");
    }
  };

  return (
    <div className="stack">
      <div>
        <h3>{user.role === "admin" ? "Result Portal" : "Academic Results"}</h3>
        <p className="muted">
          {user.role === "faculty"
            ? "Submit theory and practical marks only for your assigned subjects while the result portal is open."
            : "Review marksheets and declaration status."}
        </p>
      </div>

      {portal && (
        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Portal Status</p>
              <h4>{portal.isOpen ? "Open for Faculty Mark Entry" : "Closed for Faculty Mark Entry"}</h4>
              <p className="muted">{portal.declared ? "Declared to students" : "Not declared to students"}</p>
            </div>
            {user.role === "admin" && (
              <div className="button-row">
                <button className="button btn-edit" type="button" onClick={() => updatePortal("open")}>Open Portal</button>
                <button className="button btn-cancel" type="button" onClick={() => updatePortal("close")}>Close Portal</button>
                <button className="button btn-save" type="button" onClick={() => updatePortal("declare")}>Declare Results</button>
              </div>
            )}
          </div>
        </section>
      )}

      {user.role === "faculty" && portal?.isOpen && (
        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Marks Entry</p>
              <h4>Select Course, Semester and Student</h4>
            </div>
          </div>

          <div className="result-filter-grid">
            <label className="field-stack">
              <span>Course</span>
              <select className="input" value={facultyFilters.course} onChange={(e) => chooseFacultyCourse(e.target.value)}>
                <option value="">Select course</option>
                {facultyCourseOptions.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </label>

            <label className="field-stack">
              <span>Semester</span>
              <select className="input" value={facultyFilters.semester} onChange={(e) => chooseFacultySemester(e.target.value)} disabled={!facultyFilters.course}>
                <option value="">{facultyFilters.course ? "Select semester" : "Select course first"}</option>
                {facultySemesterOptions.map((semester) => (
                  <option key={semester} value={semester}>{semester}</option>
                ))}
              </select>
            </label>
          </div>

          {filteredFacultyScopes.length > 0 && (
            <div className="field-stack">
              <span>Assigned Subject</span>
              <div className="subject-chip-grid">
                {filteredFacultyScopes.map((scope) => (
                  <button
                    className={`subject-chip result-subject-chip ${selectedScopeKey === scope.key ? "active" : ""}`}
                    key={scope.key}
                    type="button"
                    onClick={() => chooseScope(scope.key)}
                  >
                    {scope.subject}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="result-entry-layout">
            <section className="result-student-list">
              <div>
                <h4>Students</h4>
                <p className="muted">{selectedScope ? scopeLabel(selectedScope) : "Select course and semester first."}</p>
              </div>

              {!selectedScope ? (
                <p className="muted">No assigned subject selected.</p>
              ) : selectedScope.students.length === 0 ? (
                <p className="muted">No students found for this subject.</p>
              ) : selectedScope.students.map((student) => (
                <button
                  className={`result-student-item ${selectedStudent === student._id ? "active" : ""}`}
                  key={student._id}
                  type="button"
                  onClick={() => chooseStudent(student._id)}
                >
                  <strong>{student.name}</strong>
                  <span>{student.rollNumber || "Roll number not set"}</span>
                </button>
              ))}
            </section>

            {selectedStudent ? (
              <form className="result-marks-editor" onSubmit={saveResult}>
                <div className="class-admin-head">
                  <div>
                    <p className="eyebrow">{selectedResult ? "Edit Marks" : "New Marks"}</p>
                    <h4>{selectedStudentDetails?.name || "Selected Student"}</h4>
                    <p className="muted">{selectedScope?.subject}</p>
                  </div>
                  <button className="button btn-save" type="submit">
                    {selectedResult ? "Update Marks" : "Save Marks"}
                  </button>
                </div>

                <label className="field-stack">
                  <span>Result Condition</span>
                  <select className="input" value={form.resultCode} onChange={(e) => setForm({ ...form, resultCode: e.target.value })}>
                    {resultCodeOptions.map((option) => (
                      <option key={option.value || "regular"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                {hasSpecialResultCode ? (
                  <p className="muted">Marks are not required when a special result condition is selected.</p>
                ) : (
                  <div className="two-column">
                    {hasTheoryMarks && (
                      <label className="field-stack">
                        <span>Theory Marks / {selectedScope?.theoryMax || 0}</span>
                        <input className="input" type="number" min="0" max={selectedScope?.theoryMax || 0} value={form.theoryMarks} onChange={(e) => setForm({ ...form, theoryMarks: e.target.value })} />
                      </label>
                    )}
                    {hasPracticalMarks && (
                      <label className="field-stack">
                        <span>Practical Marks / {selectedScope?.practicalMax || 0}</span>
                        <input className="input" type="number" min="0" max={selectedScope?.practicalMax || 0} value={form.practicalMarks} onChange={(e) => setForm({ ...form, practicalMarks: e.target.value })} />
                      </label>
                    )}
                  </div>
                )}

                <textarea className="input" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </form>
            ) : (
              <div className="result-marks-placeholder">
                <strong>Select a student to upload or edit marks.</strong>
              </div>
            )}
          </div>
        </section>
      )}

      {message && <p className="muted">{message}</p>}

      {summary && (
        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Marksheet</p>
              <h4>{summary.student?.name}</h4>
            </div>
            <p><strong>CGPA:</strong> {summary.cgpa ?? "Pending"}</p>
          </div>

          {summary.semesters.length === 0 ? (
            <p className="muted">No declared semester records yet.</p>
          ) : summary.semesters.map((semester) => (
            <div key={semester.semester} className="semester-card">
              <div className="class-admin-head">
                <div>
                  <strong>{semester.semester}</strong>
                  <p className="muted">Percentage: {semester.percentage}%</p>
                </div>
                <p><strong>SGPA:</strong> {semester.sgpa ?? "Pending"}</p>
              </div>

              <div className="stack">
                {semester.entries.map((entry) => (
                  <div key={entry._id} className="assignment-row assignment-row-results">
                    <div>
                      <strong>{entry.subject}</strong>
                      <p className="muted">{entry.course || "Course not set"} {entry.remarks ? `| ${entry.remarks}` : ""}</p>
                    </div>
                    <div>
                      <strong>{entry.marksObtained}/{entry.maxMarks}</strong>
                      <p className="muted">Theory {entry.theoryMarks}/{entry.theoryMax} | Practical {entry.practicalMarks}/{entry.practicalMax}</p>
                      <p className="muted">Grade {entry.grade || "Pending"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="stack">
        <h4>{user.role === "student" ? "Declared Result Entries" : "Result Log"}</h4>
        {visibleResults.length === 0 ? (
          <p className="muted">No results yet.</p>
        ) : visibleResults.map((result) => (
          <div className="record-row" key={result._id}>
            <strong>{result.subject}: {result.marksObtained}/{result.maxMarks}</strong>
            <p className="muted">{studentResultLabel(result.student)} | Grade {result.grade || "Pending"} | {result.declared ? "Declared" : "Not declared"}</p>
            <p className="muted">Theory {result.theoryMarks}/{result.theoryMax} | Practical {result.practicalMarks}/{result.practicalMax}</p>
            <p className="muted">{result.course || "Course not set"} | {result.semester || "Semester not set"}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
