const router = require("express").Router();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const FeeStructure = require("../models/FeeStructure");
const Profile = require("../models/Profile");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const ensureAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ msg: "Access denied" });
    return false;
  }

  return true;
};

const buildReceiptNumber = () =>
  `RCPT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

const paymentStudentId = (payment) => {
  const student = payment.student;
  if (!student) return "";
  return String(student._id || student);
};

const canAccessPayment = (req, payment) =>
  req.user.role === "admin" || paymentStudentId(payment) === req.user.id;

router.get("/structures", auth, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "student") {
      const profile = await Profile.findOne({ user: req.user.id });
      query.className = profile?.assignedClass || "__none__";
    }

    const structures = await FeeStructure.find(query).sort({ className: 1, dueDate: 1, feeType: 1 });
    res.json(structures);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/structures", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const structure = await FeeStructure.findOneAndUpdate(
      {
        className: req.body.className,
        semester: req.body.semester || "",
        feeType: req.body.feeType
      },
      {
        className: req.body.className,
        semester: req.body.semester || "",
        feeType: req.body.feeType,
        amount: req.body.amount,
        dueDate: req.body.dueDate,
        notes: req.body.notes
      },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    res.json(structure);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/structures/:id/assign", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ msg: "Fee structure not found" });
    }

    const profileQuery = {
      $or: [
        { assignedClass: structure.className },
        { course: structure.className }
      ]
    };

    if (structure.semester) {
      profileQuery.semester = structure.semester;
    }

    const studentProfiles = await Profile.find(profileQuery).select("user");
    if (studentProfiles.length === 0) {
      return res.status(400).json({ msg: "No students found in this class" });
    }

    let created = 0;
    let skipped = 0;
    for (const profile of studentProfiles) {
      const exists = await Payment.findOne({
        student: profile.user,
        feeStructure: structure._id
      });

      if (exists) {
        skipped += 1;
        continue;
      }

      await Payment.create({
        student: profile.user,
        className: structure.className,
        semester: structure.semester,
        feeType: structure.feeType,
        amount: structure.amount,
        dueDate: structure.dueDate,
        notes: structure.notes,
        feeStructure: structure._id,
        status: "due"
      });
      created += 1;
    }

    res.json({ msg: "Fee structure assigned", created, skipped });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const student = await User.findOne({ _id: req.body.student, role: "student", emailVerified: true });
    if (!student) {
      return res.status(404).json({ msg: "Verified student not found" });
    }

    const profile = await Profile.findOne({ user: req.body.student });

    const payment = await Payment.create({
      student: req.body.student,
      className: req.body.className || profile?.assignedClass,
      semester: req.body.semester,
      feeType: req.body.feeType,
      amount: req.body.amount,
      dueDate: req.body.dueDate,
      notes: req.body.notes,
      status: req.body.status || "due"
    });

    res.json(await payment.populate("student", "name email"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "student") {
      query.student = req.user.id;
    } else if (req.query.student) {
      query.student = req.query.student;
    }

    const payments = await Payment.find(query)
      .populate("student", "name email")
      .populate("feeStructure")
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/:id/pay", auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    if (req.user.role === "student" && payment.student.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Access denied" });
    }

    if (!["admin", "student"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    payment.status = "paid";
    payment.transactionId = req.body.transactionId || `MOCK-${Date.now()}`;
    payment.receiptNumber = payment.receiptNumber || buildReceiptNumber();
    payment.paidAt = new Date();
    await payment.save();

    res.json(await payment.populate("student", "name email"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/:id/razorpay/order", auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("student", "name email");
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    if (!canAccessPayment(req, payment)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    if (!["admin", "student"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    if (payment.status === "paid") {
      return res.status(400).json({ msg: "This fee is already paid" });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({ msg: "Razorpay test keys are not configured" });
    }

    const receipt = payment.receiptNumber || buildReceiptNumber();
    const order = await razorpay.orders.create({
      amount: Math.round(Number(payment.amount) * 100),
      currency: "INR",
      receipt,
      notes: {
        paymentId: payment._id.toString(),
        feeType: payment.feeType,
        student: payment.student?.name || ""
      }
    });

    payment.gateway = "razorpay";
    payment.gatewayOrderId = order.id;
    payment.receiptNumber = receipt;
    await payment.save();

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "Smart Campus Management System",
      description: payment.feeType,
      paymentId: payment._id,
      student: payment.student
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/:id/razorpay/verify", auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    if (!canAccessPayment(req, payment)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ msg: "Razorpay key secret is not configured" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: "Razorpay verification payload is incomplete" });
    }

    if (payment.gatewayOrderId !== razorpay_order_id) {
      return res.status(400).json({ msg: "Razorpay order does not match this fee" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ msg: "Payment verification failed" });
    }

    payment.status = "paid";
    payment.gateway = "razorpay";
    payment.gatewayPaymentId = razorpay_payment_id;
    payment.gatewaySignature = razorpay_signature;
    payment.transactionId = razorpay_payment_id;
    payment.receiptNumber = payment.receiptNumber || buildReceiptNumber();
    payment.paidAt = new Date();
    await payment.save();

    res.json(await payment.populate("student", "name email"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/:id/receipt", auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("student", "name email");

    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    if (req.user.role === "student" && payment.student?._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Access denied" });
    }

    res.json({
      receiptNumber: payment.receiptNumber,
      transactionId: payment.transactionId,
      gateway: payment.gateway,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId,
      paidAt: payment.paidAt,
      feeType: payment.feeType,
      amount: payment.amount,
      className: payment.className,
      semester: payment.semester,
      student: payment.student,
      notes: payment.notes
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    res.json({ msg: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
