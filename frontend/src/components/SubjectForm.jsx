import { useEffect, useState } from "react";
import API from "../services/api";

export default function SubjectForm({ onChanged }) {
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState("");

  const fetchSubjects = async () => {
    const res = await API.get("/subjects");
    setSubjects(res.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSubjects();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/subjects", { name });
      setName("");
      setMessage("Subject added");
      await fetchSubjects();
      onChanged?.();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to add subject");
    }
  };

  const handleDelete = async (id) => {
    await API.delete(`/subjects/${id}`);
    await fetchSubjects();
    onChanged?.();
  };

  return (
    <div className="stack">
      <form className="form-grid" onSubmit={handleSubmit}>
        <h3>Subjects</h3>
        <input
          className="input"
          placeholder="Subject name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {message && <p className="muted">{message}</p>}

        <button className="button btn-save" type="submit">
          Add Subject
        </button>
      </form>

      <div className="stack">
        {subjects.map((subject) => (
          <div className="subject-row" key={subject._id}>
            <strong>{subject.name}</strong>
            <div className="button-row">
              <button className="button btn-delete" onClick={() => handleDelete(subject._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
