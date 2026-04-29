const router = require("express").Router();
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
      { new: true, upsert: true, runValidators: true }
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

    const studentProfiles = await Profile.find({ assignedClass: structure.className }).select("user");
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
