import { useState } from "react";
import API from "../services/api";

export default function SubjectForm() {
  const [name, setName] = useState("");

  const handleSubmit = async () => {
    await API.post("/subjects", { name });
    alert("Subject added");
    setName("");
  };

  return (
    <div className="card">
      <h3>Add Subject</h3>

      <input
        className="input"
        placeholder="Subject Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button className="button btn-save" onClick={handleSubmit}>
        Add
      </button>
    </div>
  );
}