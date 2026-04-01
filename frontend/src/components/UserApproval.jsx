import { useEffect, useState } from "react";
import API from "../services/api";

export default function UserApproval() {
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    const res = await API.get("/users/pending");
    setUsers(res.data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const approve = async (id) => {
    await API.put(`/users/approve/${id}`);
    fetchUsers();
  };

  const reject = async (id) => {
    await API.put(`/users/reject/${id}`);
    fetchUsers();
  };

  return (
    <div className="card">
      <h3>Pending Approvals</h3>

      {users.length === 0 ? (
        <p>No pending users</p>
      ) : (
        users.map((u) => (
          <div key={u._id} className="card">
            <p>{u.name} ({u.email}) - {u.role}</p>

            <button className="button btn-save" onClick={() => approve(u._id)}>
              Approve
            </button>

            <button className="button btn-delete" onClick={() => reject(u._id)}>
              Reject
            </button>
          </div>
        ))
      )}
    </div>
  );
}