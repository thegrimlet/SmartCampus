const router = require("express").Router();
const Result = require("../models/Result");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {
    if (!["admin", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const student = await User.findOne({ _id: req.body.student, role: "student", status: "approved" });
    if (!student) {
      return res.status(404).json({ msg: "Approved student not found" });
    }

    const result = await Result.create({
      student: req.body.student,
      subject: req.body.subject,
      course: req.body.course,
      semester: req.body.semester,
      marksObtained: req.body.marksObtained,
      maxMarks: req.body.maxMarks || 100,
      grade: req.body.grade,
      remarks: req.body.remarks,
      recordedBy: req.user.id
    });

    res.json(await result.populate("student", "name email"));
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

    const results = await Result.find(query)
      .populate("student", "name email")
      .populate("recordedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ msg: "Result not found" });
    }

    res.json({ msg: "Result deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
