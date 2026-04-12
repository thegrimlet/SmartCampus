import { useEffect, useState } from "react";
import API from "../services/api";

const emptyProfile = {
  course: "",
  semester: "",
  department: "",
  rollNumber: "",
  employeeId: "",
  phone: "",
  address: "",
  assignedSubjects: "",
  assignedClasses: ""
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
      setForm({
        course: profile.course || "",
        semester: profile.semester || "",
        department: profile.department || "",
        rollNumber: profile.rollNumber || "",
        employeeId: profile.employeeId || "",
        phone: profile.phone || "",
        address: profile.address || "",
        assignedSubjects: (profile.assignedSubjects || []).join(", "),
        assignedClasses: (profile.assignedClasses || []).join(", ")
      });
    };

    if (selectedUser) loadProfile();
  }, [adminMode, selectedUser]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");

    await API.put(`/profiles/user/${adminMode ? selectedUser : user._id}`, {
      ...form,
      assignedSubjects: form.assignedSubjects.split(",").map((item) => item.trim()).filter(Boolean),
      assignedClasses: form.assignedClasses.split(",").map((item) => item.trim()).filter(Boolean)
    });

    setMessage("Profile saved");
  };

  return (
    <form className="stack" onSubmit={saveProfile}>
      <h3>{adminMode ? "Student & Faculty Profiles" : "My Profile"}</h3>

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
        <input className="input" placeholder="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
        <input className="input" placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
        <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input className="input" placeholder="Roll number" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />
        <input className="input" placeholder="Employee ID" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>

      <input className="input" placeholder="Assigned subjects, comma separated" value={form.assignedSubjects} onChange={(e) => setForm({ ...form, assignedSubjects: e.target.value })} />
      <input className="input" placeholder="Assigned classes, comma separated" value={form.assignedClasses} onChange={(e) => setForm({ ...form, assignedClasses: e.target.value })} />
      <textarea className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

      {message && <p className="muted">{message}</p>}
      <button className="button btn-save" type="submit">Save Profile</button>
    </form>
  );
}
