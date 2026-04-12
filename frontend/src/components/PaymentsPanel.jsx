import { useEffect, useState } from "react";
import API from "../services/api";

export default function PaymentsPanel({ user }) {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    student: "",
    feeType: "Tuition Fee",
    amount: "",
    dueDate: ""
  });
  const [message, setMessage] = useState("");

  const fetchPayments = async () => {
    const res = await API.get("/payments");
    setPayments(res.data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchPayments();
      if (user.role === "admin") {
        const studentsRes = await API.get("/users/students");
        setStudents(studentsRes.data);
        setForm((current) => ({ ...current, student: studentsRes.data[0]?._id || "" }));
      }
    };

    load();
  }, [user.role]);

  const createFee = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/payments", { ...form, amount: Number(form.amount) });
      setMessage("Fee record created");
      await fetchPayments();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to create fee");
    }
  };

  const pay = async (id) => {
    await API.post(`/payments/${id}/pay`, {});
    await fetchPayments();
  };

  return (
    <div className="stack">
      <h3>Fees & Payments</h3>

      {user.role === "admin" && (
        <form className="form-grid" onSubmit={createFee}>
          <select className="input" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
            <option value="">Select student</option>
            {students.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}
          </select>
          <div className="two-column">
            <input className="input" placeholder="Fee type" value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })} />
            <input className="input" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          {message && <p className="muted">{message}</p>}
          <button className="button btn-save" type="submit">Create Fee</button>
        </form>
      )}

      {payments.length === 0 ? <p className="muted">No payment records yet.</p> : payments.map((payment) => (
        <div className="record-row" key={payment._id}>
          <strong>{payment.feeType} - Rs. {payment.amount}</strong>
          <p className="muted">{payment.student?.name} - {payment.status}</p>
          <p className="muted">Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "Not set"}</p>
          {payment.transactionId && <p className="muted">Txn: {payment.transactionId}</p>}
          {payment.status !== "paid" && ["admin", "student"].includes(user.role) && (
            <button className="button btn-save" onClick={() => pay(payment._id)}>Mark Paid</button>
          )}
        </div>
      ))}
    </div>
  );
}
