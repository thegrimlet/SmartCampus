const router = require("express").Router();
const Attendance = require("../models/Attendance");
const auth = require("../middleware/authMiddleware");

// MARK ATTENDANCE (Faculty only)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "faculty") {
    return res.status(403).json({ msg: "Only faculty can mark attendance" });
  }

  const attendance = await Attendance.create(req.body);
  res.json(attendance);
});

// GET STUDENT ATTENDANCE
router.get("/:studentId", auth, async (req, res) => {
  const records = await Attendance.find({
    studentId: req.params.studentId
  });

  res.json(records);
});

module.exports = router;