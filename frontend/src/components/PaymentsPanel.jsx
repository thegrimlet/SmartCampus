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

const emptyPaymentFilters = {
  course: "",
  semester: "",
  status: "",
  student: "",
  feeType: ""
};

const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
  document.body.appendChild(script);
});

export default function PaymentsPanel({ user }) {
  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [structureForm, setStructureForm] = useState(emptyStructureForm);
  const [paymentFilters, setPaymentFilters] = useState(emptyPaymentFilters);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState(null);

  const profileByUserId = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.user?._id, profile])),
    [profiles]
  );

  const courseOptions = useMemo(() => courses.map((course) => ({
    value: course.courseCode,
    label: `${course.courseCode} - ${course.courseName}`,
    semYearType: course.semYearType,
    totalSemYear: Number(course.totalSemYear || 0)
  })), [courses]);

  const semesterOptions = useMemo(() => {
    const selectedCourse = courseOptions.find((course) => course.value === structureForm.className);
    if (selectedCourse) {
      return Array.from({ length: selectedCourse.totalSemYear }, (_, index) =>
        `${selectedCourse.semYearType} ${index + 1}`
      );
    }

    return [...new Set(profiles.map((profile) => profile.semester).filter(Boolean))].sort();
  }, [courseOptions, profiles, structureForm.className]);

  const feeStats = useMemo(() => {
    const paid = payments.filter((payment) => payment.status === "paid");
    const due = payments.filter((payment) => payment.status !== "paid");
    return {
      structures: structures.length,
      records: payments.length,
      dueAmount: due.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      paidAmount: paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    };
  }, [payments, structures]);

  const paymentFilterOptions = useMemo(() => ({
    courses: [...new Set(payments.map((payment) => payment.className).filter(Boolean))].sort(),
    semesters: [...new Set(payments.map((payment) => payment.semester).filter(Boolean))].sort(),
    statuses: [...new Set(payments.map((payment) => payment.status).filter(Boolean))].sort(),
    feeTypes: [...new Set(payments.map((payment) => payment.feeType).filter(Boolean))].sort()
  }), [payments]);

  const filteredPayments = useMemo(() => payments.filter((payment) => (
    (!paymentFilters.course || payment.className === paymentFilters.course) &&
    (!paymentFilters.semester || payment.semester === paymentFilters.semester) &&
    (!paymentFilters.status || payment.status === paymentFilters.status) &&
    (!paymentFilters.student || String(payment.student?._id || payment.student) === paymentFilters.student) &&
    (!paymentFilters.feeType || payment.feeType === paymentFilters.feeType)
  )), [paymentFilters, payments]);

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
        const [studentsRes, profilesRes, coursesRes] = await Promise.all([
          API.get("/users/students"),
          API.get("/profiles"),
          API.get("/courses")
        ]);

        setStudents(studentsRes.data);
        setProfiles(profilesRes.data);
        setCourses(coursesRes.data);
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
      setStructureForm((current) => ({
        ...emptyStructureForm,
        className: current.className,
        semester: current.semester
      }));
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
      if (user.role === "student") {
        await loadRazorpayCheckout();
        const orderRes = await API.post(`/payments/${id}/razorpay/order`, {});
        const order = orderRes.data;

        const options = {
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: order.name,
          description: order.description,
          order_id: order.orderId,
          prefill: {
            name: order.student?.name || user.name,
            email: order.student?.email || user.email
          },
          theme: {
            color: "#28666e"
          },
          handler: async (response) => {
            await API.post(`/payments/${id}/razorpay/verify`, response);
            await fetchPayments();
            const receiptRes = await API.get(`/payments/${id}/receipt`);
            setReceipt(receiptRes.data);
            setMessage("Payment successful");
          },
          modal: {
            ondismiss: () => setMessage("Payment was not completed")
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        return;
      }

      await API.post(`/payments/${id}/pay`, {});
      await fetchPayments();
      const receiptRes = await API.get(`/payments/${id}/receipt`);
      setReceipt(receiptRes.data);
      setMessage("Payment marked as paid");
    } catch (err) {
      setMessage(err.response?.data?.msg || err.message || "Failed to process payment");
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
        <p className="muted">Manage course fee templates, assign them in bulk, and keep receipt-ready payment records.</p>
      </div>

      {user.role === "admin" && (
        <div className="stack">
          <div className="fee-stats-grid">
            <div className="fee-stat-card">
              <span>Structures</span>
              <strong>{feeStats.structures}</strong>
            </div>
            <div className="fee-stat-card">
              <span>Payment Records</span>
              <strong>{feeStats.records}</strong>
            </div>
            <div className="fee-stat-card">
              <span>Due Amount</span>
              <strong>Rs. {feeStats.dueAmount}</strong>
            </div>
            <div className="fee-stat-card">
              <span>Paid Amount</span>
              <strong>Rs. {feeStats.paidAmount}</strong>
            </div>
          </div>

          <form className="class-admin-card fee-structure-card" onSubmit={saveStructure}>
            <div className="class-admin-head">
              <div>
                <p className="eyebrow">Fee Structure</p>
                <h4>Create Fee Template</h4>
              </div>
            </div>

            <div className="fee-structure-grid">
              <select
                className="input"
                value={structureForm.className}
                onChange={(e) => setStructureForm({ ...structureForm, className: e.target.value, semester: "" })}
                required
              >
                <option value="">Select course</option>
                {courseOptions.map((course) => (
                  <option key={course.value} value={course.value}>{course.label}</option>
                ))}
              </select>
              <select
                className="input"
                value={structureForm.semester}
                onChange={(e) => setStructureForm({ ...structureForm, semester: e.target.value })}
              >
                <option value="">Select semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>{semester}</option>
                ))}
              </select>
              <input className="input" placeholder="Fee type" value={structureForm.feeType} onChange={(e) => setStructureForm({ ...structureForm, feeType: e.target.value })} />
              <input className="input" type="number" min="0" placeholder="Amount" value={structureForm.amount} onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })} required />
              <input className="input" type="date" value={structureForm.dueDate} onChange={(e) => setStructureForm({ ...structureForm, dueDate: e.target.value })} />
            </div>

            <textarea className="input" placeholder="Notes / receipt footer" value={structureForm.notes} onChange={(e) => setStructureForm({ ...structureForm, notes: e.target.value })} />

            <div className="fee-form-actions">
              <button className="button btn-cancel" type="button" onClick={() => setStructureForm(emptyStructureForm)}>Clear</button>
              <button className="button btn-save" type="submit">Save Fee Structure</button>
            </div>
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
        <section className="class-admin-card stack">
          <div className="class-admin-head">
            <div>
              <p className="eyebrow">Saved Templates</p>
              <h4>Fee Structures</h4>
            </div>
          </div>
          {structures.length === 0 ? (
            <p className="muted">No fee structures yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="admin-table fee-structure-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Semester</th>
                    <th>Fee Type</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map((structure) => (
                    <tr key={structure._id}>
                      <td>{structure.className}</td>
                      <td>{structure.semester || "Not set"}</td>
                      <td>{structure.feeType}</td>
                      <td>Rs. {structure.amount}</td>
                      <td>{structure.dueDate ? new Date(structure.dueDate).toLocaleDateString() : "Not set"}</td>
                      <td>{structure.notes || "--"}</td>
                      <td>
                        <button className="button btn-edit" onClick={() => assignStructure(structure._id)}>Assign</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="stack">
        <div className="class-admin-head">
          <div>
            <h4>{user.role === "student" ? "My Payment Records" : "Payment Records"}</h4>
            {user.role === "admin" && <p className="muted">Use filters here to view existing fee records.</p>}
          </div>
          {user.role === "admin" && (
            <button className="button btn-cancel" type="button" onClick={() => setPaymentFilters(emptyPaymentFilters)}>
              Clear Filters
            </button>
          )}
        </div>

        {user.role === "admin" && (
          <div className="payment-record-filters">
            <select className="input" value={paymentFilters.course} onChange={(e) => setPaymentFilters({ ...paymentFilters, course: e.target.value })}>
              <option value="">All courses</option>
              {paymentFilterOptions.courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>

            <select className="input" value={paymentFilters.semester} onChange={(e) => setPaymentFilters({ ...paymentFilters, semester: e.target.value })}>
              <option value="">All semesters</option>
              {paymentFilterOptions.semesters.map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>

            <select className="input" value={paymentFilters.status} onChange={(e) => setPaymentFilters({ ...paymentFilters, status: e.target.value })}>
              <option value="">All status</option>
              {paymentFilterOptions.statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select className="input" value={paymentFilters.student} onChange={(e) => setPaymentFilters({ ...paymentFilters, student: e.target.value })}>
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>{student.name}</option>
              ))}
            </select>

            <select className="input" value={paymentFilters.feeType} onChange={(e) => setPaymentFilters({ ...paymentFilters, feeType: e.target.value })}>
              <option value="">All fee types</option>
              {paymentFilterOptions.feeTypes.map((feeType) => (
                <option key={feeType} value={feeType}>{feeType}</option>
              ))}
            </select>
          </div>
        )}

        {filteredPayments.length === 0 ? (
          <p className="muted">{payments.length === 0 ? "No payment records yet." : "No payment records match these filters."}</p>
        ) : filteredPayments.map((payment) => (
          <div className="record-row" key={payment._id}>
            <strong>{payment.feeType} - Rs. {payment.amount}</strong>
            <p className="muted">
              {payment.student?.name} | {payment.className || "Course not set"} | {payment.status}
            </p>
            <p className="muted">
              Semester: {payment.semester || "Not set"} | Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "Not set"}
            </p>
            {payment.transactionId && <p className="muted">Txn: {payment.transactionId}</p>}
            <div className="button-row">
              {payment.status !== "paid" && ["admin", "student"].includes(user.role) && (
                <button className="button btn-save" onClick={() => pay(payment._id)}>
                  {user.role === "student" ? "Pay with Razorpay" : "Mark Paid"}
                </button>
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
            <p><strong>Course:</strong> {receipt.className || "Not set"}</p>
            <p><strong>Semester:</strong> {receipt.semester || "Not set"}</p>
            <p><strong>Transaction:</strong> {receipt.transactionId || "Not set"}</p>
            <p><strong>Gateway:</strong> {receipt.gateway || "Manual"}</p>
            <p><strong>Paid At:</strong> {receipt.paidAt ? new Date(receipt.paidAt).toLocaleString() : "Pending"}</p>
          </div>
          {receipt.notes && <p className="muted">{receipt.notes}</p>}
        </section>
      )}
    </div>
  );
}
