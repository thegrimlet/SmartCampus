import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const emptyManualForm = {
  student: "",
  feeType: "Tuition Fee",
  amount: "",
  dueDate: "",
  semester: "",
  notes: ""
};

const emptyStructureForm = {
  className: "",
  semester: "",
  feeType: "Tuition Fee",
  amount: "",
  dueDate: "",
  notes: ""
};

export default function PaymentsPanel({ user }) {
  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [structureForm, setStructureForm] = useState(emptyStructureForm);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState(null);

  const profileByUserId = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.user?._id, profile])),
    [profiles]
  );

  const fetchPayments = async () => {
    const res = await API.get("/payments");
    setPayments(res.data);
  };

  const fetchStructures = async () => {
    const res = await API.get("/payments/structures");
    setStructures(res.data);
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchPayments(), fetchStructures()]);

      if (user.role === "admin") {
        const [studentsRes, profilesRes] = await Promise.all([
          API.get("/users/students"),
          API.get("/profiles")
        ]);

        setStudents(studentsRes.data);
        setProfiles(profilesRes.data);
        const firstStudent = studentsRes.data[0]?._id || "";
        const firstProfile = profilesRes.data.find((profile) => profile.user?._id === firstStudent);

        setManualForm((current) => ({
          ...current,
          student: firstStudent,
          semester: firstProfile?.semester || "",
          notes: current.notes
        }));
      }
    };

    load();
  }, [user.role]);

  const createManualFee = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const selectedProfile = profileByUserId[manualForm.student];
      await API.post("/payments", {
        ...manualForm,
        amount: Number(manualForm.amount),
        className: selectedProfile?.assignedClass || "",
        semester: manualForm.semester || ""
      });
      setMessage("Fee record created");
      setManualForm((current) => ({ ...current, amount: "", dueDate: "", notes: "" }));
      await fetchPayments();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to create fee");
    }
  };

  const saveStructure = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await API.post("/payments/structures", {
        ...structureForm,
        amount: Number(structureForm.amount)
      });
      setMessage("Fee structure saved");
      setStructureForm(emptyStructureForm);
      await fetchStructures();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to save fee structure");
    }
  };

  const assignStructure = async (structureId) => {
    try {
      const res = await API.post(`/payments/structures/${structureId}/assign`, {});
      setMessage(`${res.data.created} fee records created, ${res.data.skipped} skipped`);
      await fetchPayments();
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to assign fee structure");
    }
  };

  const pay = async (id) => {
    try {
      await API.post(`/payments/${id}/pay`, {});
      await fetchPayments();
      const receiptRes = await API.get(`/payments/${id}/receipt`);
      setReceipt(receiptRes.data);
      setMessage("Payment marked as paid");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to mark payment paid");
    }
  };

  const viewReceipt = async (id) => {
    try {
      const res = await API.get(`/payments/${id}/receipt`);
      setReceipt(res.data);
    } catch (err) {
      setMessage(err.response?.data?.msg || "Receipt not available yet");
    }
  };

  return (
    <div className="stack">
      <div>
        <h3>Fees & Payments</h3>
        <p className="muted">Manage class fee templates, assign them in bulk, and keep receipt-ready payment records.</p>
      </div>

      {user.role === "admin" && (
        <div className="stack">
          <form className="class-admin-card stack" onSubmit={saveStructure}>
            <div className="class-admin-head">
              <div>
                <p className="eyebrow">Fee Structure</p>
                <h4>Template by Class</h4>
              </div>
              <button className="button btn-save" type="submit">Save Structure</button>
            </div>

            <div className="two-column">
              <input className="input" placeholder="Class" value={structureForm.className} onChange={(e) => setStructureForm({ ...structureForm, className: e.target.value })} />
              <input className="input" placeholder="Semester" value={structureForm.semester} onChange={(e) => setStructureForm({ ...structureForm, semester: e.target.value })} />
              <input className="input" placeholder="Fee type" value={structureForm.feeType} onChange={(e) => setStructureForm({ ...structureForm, feeType: e.target.value })} />
              <input className="input" type="number" placeholder="Amount" value={structureForm.amount} onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })} />
              <input className="input" type="date" value={structureForm.dueDate} onChange={(e) => setStructureForm({ ...structureForm, dueDate: e.target.value })} />
            </div>

            <textarea className="input" placeholder="Notes / receipt footer" value={structureForm.notes} onChange={(e) => setStructureForm({ ...structureForm, notes: e.target.value })} />
          </form>

          <form className="class-admin-card stack" onSubmit={createManualFee}>
            <div className="class-admin-head">
              <div>
                <p className="eyebrow">Manual Fee Record</p>
                <h4>Single Student Entry</h4>
              </div>
              <button className="button btn-save" type="submit">Create Fee</button>
            </div>

            <select
              className="input"
              value={manualForm.student}
              onChange={(e) => {
                const studentId = e.target.value;
                const selectedProfile = profileByUserId[studentId];
                setManualForm({
                  ...manualForm,
                  student: studentId,
                  semester: selectedProfile?.semester || ""
                });
              }}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name}
                </option>
              ))}
            </select>

            <div className="two-column">
              <input className="input" placeholder="Fee type" value={manualForm.feeType} onChange={(e) => setManualForm({ ...manualForm, feeType: e.target.value })} />
              <input className="input" type="number" placeholder="Amount" value={manualForm.amount} onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} />
              <input className="input" placeholder="Semester" value={manualForm.semester} onChange={(e) => setManualForm({ ...manualForm, semester: e.target.value })} />
              <input className="input" type="date" value={manualForm.dueDate} onChange={(e) => setManualForm({ ...manualForm, dueDate: e.target.value })} />
            </div>

            <textarea className="input" placeholder="Notes" value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} />
          </form>
        </div>
      )}

      {message && <p className="muted">{message}</p>}

      {user.role === "admin" && (
        <section className="stack">
          <h4>Fee Structures</h4>
          {structures.length === 0 ? (
            <p className="muted">No fee structures yet.</p>
          ) : structures.map((structure) => (
            <div className="record-row" key={structure._id}>
              <strong>{structure.className} | {structure.feeType} | Rs. {structure.amount}</strong>
              <p className="muted">Semester: {structure.semester || "Not set"} | Due: {structure.dueDate ? new Date(structure.dueDate).toLocaleDateString() : "Not set"}</p>
              {structure.notes && <p className="muted">{structure.notes}</p>}
              <button className="button btn-edit" onClick={() => assignStructure(structure._id)}>Assign to Class</button>
            </div>
          ))}
        </section>
      )}

      <section className="stack">
        <h4>{user.role === "student" ? "My Payment Records" : "Payment Records"}</h4>
        {payments.length === 0 ? (
          <p className="muted">No payment records yet.</p>
        ) : payments.map((payment) => (
          <div className="record-row" key={payment._id}>
            <strong>{payment.feeType} - Rs. {payment.amount}</strong>
            <p className="muted">
              {payment.student?.name} | {payment.className || "Class not set"} | {payment.status}
            </p>
            <p className="muted">
              Semester: {payment.semester || "Not set"} | Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "Not set"}
            </p>
            {payment.transactionId && <p className="muted">Txn: {payment.transactionId}</p>}
            <div className="button-row">
              {payment.status !== "paid" && ["admin", "student"].includes(user.role) && (
                <button className="button btn-save" onClick={() => pay(payment._id)}>Mark Paid</button>
              )}
              {payment.status === "paid" && (
                <button className="button btn-edit" onClick={() => viewReceipt(payment._id)}>View Receipt</button>
              )}
            </div>
          </div>
        ))}
      </section>

      {receipt && (
        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Receipt</p>
              <h4>{receipt.receiptNumber || "Pending receipt number"}</h4>
            </div>
            <button className="button btn-cancel" type="button" onClick={() => setReceipt(null)}>Close</button>
          </div>
          <div className="two-column">
            <p><strong>Student:</strong> {receipt.student?.name}</p>
            <p><strong>Email:</strong> {receipt.student?.email}</p>
            <p><strong>Fee Type:</strong> {receipt.feeType}</p>
            <p><strong>Amount:</strong> Rs. {receipt.amount}</p>
            <p><strong>Class:</strong> {receipt.className || "Not set"}</p>
            <p><strong>Semester:</strong> {receipt.semester || "Not set"}</p>
            <p><strong>Transaction:</strong> {receipt.transactionId || "Not set"}</p>
            <p><strong>Paid At:</strong> {receipt.paidAt ? new Date(receipt.paidAt).toLocaleString() : "Pending"}</p>
          </div>
          {receipt.notes && <p className="muted">{receipt.notes}</p>}
        </section>
      )}
    </div>
  );
}
