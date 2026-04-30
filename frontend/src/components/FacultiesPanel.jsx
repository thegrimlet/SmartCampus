import { useEffect, useState } from "react";
import API from "../services/api";

const emptyFaculty = {
  facultyNumber: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  state: "",
  city: "",
  address: "",
  qualification: "",
  experience: "",
  dateOfBirth: "",
  gender: "",
  photoUrl: ""
};

export default function FacultiesPanel({ onChanged }) {
  const [faculties, setFaculties] = useState([]);
  const [form, setForm] = useState(emptyFaculty);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const loadFaculties = async () => {
    const res = await API.get("/users/faculty/manage");
    setFaculties(res.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFaculties();
  }, []);

  const updateForm = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const addFaculty = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/users/faculty", form);
      setForm(emptyFaculty);
      setShowForm(false);
      setMessage("Faculty account created");
      await loadFaculties();
      onChanged?.();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to create faculty");
    }
  };

  return (
    <section className="stack">
      <div className="catalog-hero">
        <h3>All Faculties</h3>
        <div className="button-row">
          <button className="button btn-edit" type="button">Photo View</button>
          <button className="button btn-save" type="button" onClick={() => setShowForm(true)}>Add Faculty</button>
        </div>
      </div>

      {showForm && (
        <form className="catalog-modal form-grid" onSubmit={addFaculty}>
          <div className="class-admin-head">
            <h4>Add New Faculty</h4>
            <button className="button btn-cancel" type="button" onClick={() => setShowForm(false)}>Close</button>
          </div>

          <div className="two-column">
            <input className="input" placeholder="Faculty ID" value={form.facultyNumber} onChange={(e) => updateForm("facultyNumber", e.target.value)} />
            <input className="input" placeholder="Faculty Name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
            <input className="input" placeholder="State" value={form.state} onChange={(e) => updateForm("state", e.target.value)} />
            <input className="input" placeholder="City" value={form.city} onChange={(e) => updateForm("city", e.target.value)} />
            <input className="input" type="email" placeholder="Email ID" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
            <input className="input" placeholder="Contact Number" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
            <input className="input" placeholder="Qualification" value={form.qualification} onChange={(e) => updateForm("qualification", e.target.value)} />
            <input className="input" placeholder="Experience" value={form.experience} onChange={(e) => updateForm("experience", e.target.value)} />
            <input className="input" type="date" value={form.dateOfBirth} onChange={(e) => updateForm("dateOfBirth", e.target.value)} />
            <select className="input" value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}>
              <option value="">---Select Gender---</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input className="input" type="password" placeholder="Initial Password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} />
            <input className="input" placeholder="Photo URL" value={form.photoUrl} onChange={(e) => updateForm("photoUrl", e.target.value)} />
            <input className="input" placeholder="Address" value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
          </div>

          <button className="button btn-save align-end" type="submit">Add Faculty</button>
        </form>
      )}

      {message && <p className="muted">{message}</p>}

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Faculty ID</th>
              <th>Faculty Name</th>
              <th>Email ID</th>
              <th>Qualification</th>
              <th>Experience</th>
            </tr>
          </thead>
          <tbody>
            {faculties.map((faculty) => (
              <tr key={faculty._id}>
                <td>{faculty.facultyNumber || faculty.user?.institutionalId}</td>
                <td>{faculty.user?.name}</td>
                <td>{faculty.user?.email}</td>
                <td>{faculty.qualification || "-"}</td>
                <td>{faculty.experience || "-"}</td>
              </tr>
            ))}
            {faculties.length === 0 && (
              <tr><td colSpan="5">No faculties added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
