import { useEffect, useState } from "react";
import API from "../services/api";
import { contactValidationMessage } from "../utils/validators";

const emptyProfile = {
  email: "",
  course: "",
  semester: "",
  department: "",
  rollNumber: "",
  phone: "",
  address: "",
  assignedSubjects: "",
  assignedClass: ""
};

export default function ProfilePanel({ user, adminMode = false }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(user._id);
  const [form, setForm] = useState(emptyProfile);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (adminMode) {
        const usersRes = await API.get("/users/approved");
        setUsers(usersRes.data);
        setSelectedUser(usersRes.data[0]?._id || user._id);
      }
    };

    load();
  }, [adminMode, user._id]);

  useEffect(() => {
    const loadProfile = async () => {
      const endpoint = adminMode ? `/profiles/user/${selectedUser}` : "/profiles/me";
      const res = await API.get(endpoint);
      const profile = res.data || {};
      const selectedAccount = adminMode
        ? users.find((item) => item._id === selectedUser)
        : user;

      setForm({
        email: profile.user?.email || selectedAccount?.email || "",
        course: profile.course || "",
        semester: profile.semester || "",
        department: profile.department || "",
        rollNumber: profile.rollNumber || "",
        phone: profile.phone || "",
        address: profile.address || "",
        assignedSubjects: (profile.assignedSubjects || []).join(", "),
        assignedClass: profile.assignedClass || ""
      });
    };

    if (selectedUser) loadProfile();
  }, [adminMode, selectedUser, user, users]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    const validationMessage = contactValidationMessage(form);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    await API.put(`/profiles/user/${adminMode ? selectedUser : user._id}`, {
      ...form,
      assignedSubjects: form.assignedSubjects.split(",").map((item) => item.trim()).filter(Boolean),
      assignedClass: form.assignedClass.trim()
    });

    if (!adminMode) {
      const updatedUser = { ...user, email: form.email.trim().toLowerCase() };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }

    setMessage("Profile saved");
  };

  return (
    <form className="stack" onSubmit={saveProfile}>
      <h3>{adminMode ? "Academic Assignments" : "My Profile"}</h3>

      {adminMode && (
        <select className="input" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          {users.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name} - {item.role}
            </option>
          ))}
        </select>
      )}

      <div className="two-column">
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>

      {adminMode && (
        <>
          <div className="two-column">
            <input className="input" placeholder="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            <input className="input" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <input className="input" placeholder="Roll number" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />
          </div>

          <input className="input" placeholder="Assigned subjects, comma separated" value={form.assignedSubjects} onChange={(e) => setForm({ ...form, assignedSubjects: e.target.value })} />
          <input className="input" placeholder="Assigned class" value={form.assignedClass} onChange={(e) => setForm({ ...form, assignedClass: e.target.value })} />
        </>
      )}

      <textarea className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

      {message && <p className="muted">{message}</p>}
      <button className="button btn-save" type="submit">Save Profile</button>
    </form>
  );
}
