import { useEffect, useState } from "react";
import API from "../services/api";

export default function UserApproval({ onChanged }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const fetchUsers = async () => {
    const res = await API.get("/users/pending");
    setUsers(res.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const approve = async (id) => {
    await API.put(`/users/approve/${id}`);
    await fetchUsers();
    onChanged?.();
    setMessage("User approved");
  };

  const reject = async (id) => {
    await API.put(`/users/reject/${id}`);
    await fetchUsers();
    onChanged?.();
    setMessage("User rejected");
  };

  return (
    <div className="stack">
      <h3>Pending Approvals</h3>
      {message && <p className="muted">{message}</p>}

      {users.length === 0 ? (
        <p className="muted">No pending users</p>
      ) : (
        users.map((u) => (
          <div key={u._id} className="approval-row">
            <p><strong>{u.name}</strong> ({u.role})</p>
            <p className="muted">{u.email}</p>

            <div className="button-row">
              <button className="button btn-save" onClick={() => approve(u._id)}>
                Approve
              </button>

              <button className="button btn-delete" onClick={() => reject(u._id)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
