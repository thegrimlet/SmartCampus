const router = require("express").Router();
const Payment = require("../models/Payment");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const student = await User.findOne({ _id: req.body.student, role: "student", status: "approved" });
    if (!student) {
      return res.status(404).json({ msg: "Approved student not found" });
    }

    const payment = await Payment.create({
      student: req.body.student,
      feeType: req.body.feeType,
      amount: req.body.amount,
      dueDate: req.body.dueDate,
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
    payment.paidAt = new Date();
    await payment.save();

    res.json(await payment.populate("student", "name email"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
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
