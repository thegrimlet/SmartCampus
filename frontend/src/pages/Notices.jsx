import { useEffect, useState } from "react";
import API from "../services/api";

export default function Notices() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const fetchNotices = async () => {
      const res = await API.get("/notices");
      setNotices(res.data);
    };

    fetchNotices();
  }, []);

  return (
    <div>
      <h2>Notices</h2>

      {notices.map((n) => (
        <div key={n._id}>
          <h4>{n.title}</h4>
          <p>{n.content}</p>
        </div>
      ))}
    </div>
  );
}