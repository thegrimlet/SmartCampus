import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyCompose = {
  receiver: "",
  subject: "",
  body: ""
};

export default function MessagesPanel({ user }) {
  const [threads, setThreads] = useState([]);
  const [threadMessages, setThreadMessages] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [compose, setCompose] = useState(emptyCompose);
  const [replyBody, setReplyBody] = useState("");
  const [message, setMessage] = useState("");

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.conversationId === selectedConversationId),
    [threads, selectedConversationId]
  );

  const fetchThreads = async (conversationToKeep = selectedConversationId) => {
    const res = await API.get("/messages/threads");
    setThreads(res.data);
    const nextConversation = conversationToKeep || res.data[0]?.conversationId || "";
    setSelectedConversationId(nextConversation);
    if (nextConversation) {
      await loadThread(nextConversation);
    } else {
      setThreadMessages([]);
    }
  };

  const loadThread = async (conversationId) => {
    if (!conversationId) {
      setThreadMessages([]);
      return;
    }

    const res = await API.get(`/messages/threads/${encodeURIComponent(conversationId)}`);
    setThreadMessages(res.data);

    if (user.role !== "admin") {
      await API.put(`/messages/threads/${encodeURIComponent(conversationId)}/read`, {});
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchThreads();

      if (user.role === "student") {
        const facultyRes = await API.get("/users/faculty");
        setPeople(facultyRes.data);
        setCompose((current) => ({ ...current, receiver: facultyRes.data[0]?._id || "" }));
      }

      if (user.role === "faculty") {
        const studentRes = await API.get("/users/students");
        setPeople(studentRes.data);
        setCompose((current) => ({ ...current, receiver: studentRes.data[0]?._id || "" }));
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role]);

  const sendNewConversation = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/messages", compose);
      setCompose((current) => ({ ...current, subject: "", body: "" }));
      setMessage("Conversation started");
      await fetchThreads("");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to send message");
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!selectedThread || !replyBody.trim()) return;

    try {
      await API.post("/messages", {
        receiver: selectedThread.lastMessage.sender?._id === user._id
          ? selectedThread.lastMessage.receiver?._id
          : selectedThread.lastMessage.sender?._id,
        subject: selectedThread.subject,
        body: replyBody,
        conversationId: selectedConversationId,
        replyTo: threadMessages[threadMessages.length - 1]?._id
      });
      setReplyBody("");
      await fetchThreads(selectedConversationId);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to send reply");
    }
  };

  if (user.role === "admin") {
    return (
      <div className="stack">
        <h3>Internal Messages</h3>
        {threads.length === 0 ? (
          <p className="muted">No conversations yet.</p>
        ) : (
          <div className="message-layout">
            <aside className="message-thread-list">
              {threads.map((thread) => (
                <button
                  key={thread.conversationId}
                  type="button"
                  className={`message-thread-item ${selectedConversationId === thread.conversationId ? "active" : ""}`}
                  onClick={async () => {
                    setSelectedConversationId(thread.conversationId);
                    await loadThread(thread.conversationId);
                  }}
                >
                  <strong>{thread.subject}</strong>
                  <p className="muted">{thread.otherParty?.name || "Campus thread"}</p>
                </button>
              ))}
            </aside>

            <section className="class-admin-card stack">
              <h4>{selectedThread?.subject || "Choose a conversation"}</h4>
              {threadMessages.map((item) => (
                <div className="message-bubble" key={item._id}>
                  <strong>{item.sender?.name} to {item.receiver?.name}</strong>
                  <p>{item.body}</p>
                  <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <div>
        <h3>Internal Messaging</h3>
        <p className="muted">Start a conversation or continue an existing thread without losing the context.</p>
      </div>

      <div className="message-layout">
        <aside className="message-thread-list">
          <form className="class-admin-card stack" onSubmit={sendNewConversation}>
            <p className="eyebrow">New Conversation</p>
            <select className="input" value={compose.receiver} onChange={(e) => setCompose({ ...compose, receiver: e.target.value })}>
              <option value="">Select recipient</option>
              {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
            <input className="input" placeholder="Subject" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            <textarea className="input" placeholder="Write the first message" value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
            <button className="button btn-save" type="submit">Start Thread</button>
          </form>

          <div className="stack">
            {threads.map((thread) => (
              <button
                key={thread.conversationId}
                type="button"
                className={`message-thread-item ${selectedConversationId === thread.conversationId ? "active" : ""}`}
                onClick={async () => {
                  setSelectedConversationId(thread.conversationId);
                  await loadThread(thread.conversationId);
                }}
              >
                <div className="message-thread-title">
                  <strong>{thread.subject}</strong>
                  {thread.unreadCount > 0 && <span className="message-badge">{thread.unreadCount}</span>}
                </div>
                <p className="muted">{thread.otherParty?.name}</p>
                <p className="muted">{thread.lastMessage?.body}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Conversation</p>
              <h4>{selectedThread?.subject || "Choose a thread"}</h4>
            </div>
            {selectedThread && <p className="muted">{selectedThread.otherParty?.name}</p>}
          </div>

          {threadMessages.length === 0 ? (
            <p className="muted">No messages yet in this thread.</p>
          ) : (
            <div className="stack">
              {threadMessages.map((item) => (
                <div
                  className={`message-bubble ${item.sender?._id === user._id ? "mine" : ""}`}
                  key={item._id}
                >
                  <strong>{item.sender?._id === user._id ? "You" : item.sender?.name}</strong>
                  <p>{item.body}</p>
                  <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {selectedThread && (
            <form className="stack" onSubmit={sendReply}>
              <textarea className="input" placeholder="Reply in this thread" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} />
              <button className="button btn-save" type="submit">Send Reply</button>
            </form>
          )}
        </section>
      </div>

      {message && <p className="muted">{message}</p>}
    </div>
  );
}
