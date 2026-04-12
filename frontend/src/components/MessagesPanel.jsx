import { useEffect, useState } from "react";
import API from "../services/api";

export default function MessagesPanel({ user }) {
  const [messages, setMessages] = useState([]);
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState({
    receiver: "",
    subject: "",
    body: ""
  });
  const [message, setMessage] = useState("");

  const fetchMessages = async () => {
    const res = await API.get("/messages");
    setMessages(res.data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchMessages();
      if (user.role === "student") {
        const facultyRes = await API.get("/users/faculty");
        setPeople(facultyRes.data);
        setForm((current) => ({ ...current, receiver: facultyRes.data[0]?._id || "" }));
      }
      if (user.role === "faculty") {
        const studentRes = await API.get("/users/students");
        setPeople(studentRes.data);
        setForm((current) => ({ ...current, receiver: studentRes.data[0]?._id || "" }));
      }
    };

    load();
  }, [user.role]);

  const sendMessage = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/messages", form);
      setForm({ receiver: form.receiver, subject: "", body: "" });
      setMessage("Message sent");
      await fetchMessages();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to send message");
    }
  };

  if (user.role === "admin") {
    return (
      <div className="stack">
        <h3>Internal Messages</h3>
        {messages.length === 0 ? <p className="muted">No messages yet.</p> : messages.map((item) => (
          <div className="record-row" key={item._id}>
            <strong>{item.subject}</strong>
            <p className="muted">{item.sender?.name} to {item.receiver?.name}</p>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="stack">
      <h3>Internal Messaging</h3>

      <form className="form-grid" onSubmit={sendMessage}>
        <select className="input" value={form.receiver} onChange={(e) => setForm({ ...form, receiver: e.target.value })}>
          <option value="">Select recipient</option>
          {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
        </select>
        <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <textarea className="input" placeholder="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        {message && <p className="muted">{message}</p>}
        <button className="button btn-save" type="submit">Send Message</button>
      </form>

      {messages.length === 0 ? <p className="muted">No messages yet.</p> : messages.map((item) => (
        <div className="record-row" key={item._id}>
          <strong>{item.subject}</strong>
          <p className="muted">{item.sender?._id === user._id ? "To" : "From"} {item.sender?._id === user._id ? item.receiver?.name : item.sender?.name}</p>
          <p>{item.body}</p>
        </div>
      ))}
    </div>
  );
}
